import type {
  InterviewSession,
  InterviewReport,
  ChatMessage,
  CandidateProfile,
  Curriculum,
  EvaluationResult,
} from "@/types";
import {
  selectNextTopic,
  calculateTotalQuestions,
  shouldEndInterview,
  adjustDifficulty,
  getInitialDifficulty,
  getTopicById,
} from "@/lib/interview/topicSelector";
import {
  generateQuestion,
  generateOpeningMessage,
  generateTransitionMessage,
  generateClosingMessage,
} from "@/lib/questionGenerator";
import { evaluateAnswer, deriveStrengthsAndWeaknesses } from "@/lib/evaluator";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: generateId(), role, content, timestamp: Date.now() };
}

export function createSession(
  candidateProfile: CandidateProfile,
  curriculum: Curriculum
): InterviewSession {
  const firstTopic = selectNextTopic(curriculum, candidateProfile, []);
  if (!firstTopic) {
    throw new Error("No topics available in curriculum");
  }

  return {
    sessionId: generateId(),
    candidateProfile,
    curriculum,
    currentTopic: firstTopic,
    questionNumber: 0,
    totalQuestions: calculateTotalQuestions(curriculum),
    difficulty: getInitialDifficulty(candidateProfile),
    strengths: [],
    weaknesses: [],
    conversationHistory: [],
    coveredObjectives: [],
    topicCoverages: [],
    score: 0,
    evaluations: [],
    isComplete: false,
    startedAt: Date.now(),
  };
}

export function startInterview(
  candidateProfile: CandidateProfile,
  curriculum: Curriculum
): { session: InterviewSession; messages: ChatMessage[]; firstQuestion: string } {
  const session = createSession(candidateProfile, curriculum);

  const opening = generateOpeningMessage(
    candidateProfile,
    session.currentTopic.topicTitle,
    session.currentTopic.dayTitle,
    session.currentTopic.day
  );

  const topicData = getTopicById(curriculum, session.currentTopic.topicId);
  const uncoveredObjectives =
    topicData?.topic.learningObjectives.map((o) => o.id) ?? [];

  const { question } = generateQuestion({
    topicId: session.currentTopic.topicId,
    curriculum,
    profile: candidateProfile,
    difficulty: session.difficulty,
    conversationHistory: [],
    questionNumber: 1,
    uncoveredObjectives,
    isFollowUp: false,
  });

  const messages = [
    createMessage("interviewer", opening),
    createMessage("interviewer", question),
  ];

  session.conversationHistory = messages;
  session.questionNumber = 1;
  session.currentTopic.questionsAsked = 1;

  return { session, messages, firstQuestion: question };
}

export function processAnswer(
  session: InterviewSession,
  candidateAnswer: string
): {
  session: InterviewSession;
  interviewerMessage: string;
  isComplete: boolean;
} {
  const updated = { ...session };
  updated.conversationHistory = [
    ...session.conversationHistory,
    createMessage("candidate", candidateAnswer),
  ];

  const topicData = getTopicById(session.curriculum, session.currentTopic.topicId);
  const topic = topicData?.topic;

  let evaluation: EvaluationResult;
  if (topic) {
    const lastInterviewerMsg = [...session.conversationHistory]
      .reverse()
      .find((m) => m.role === "interviewer");

    const objectiveId =
      topic.learningObjectives[
        Math.min(
          session.currentTopic.questionsAsked - 1,
          topic.learningObjectives.length - 1
        )
      ]?.id ?? topic.learningObjectives[0].id;

    evaluation = evaluateAnswer({
      answer: candidateAnswer,
      topic,
      objectiveId,
      difficulty: session.difficulty,
    });
  } else {
    evaluation = {
      conceptAccuracy: 50,
      completeness: 50,
      depth: 50,
      reasoning: 50,
      communication: 50,
      confidence: 50,
      overall: 50,
      feedback: "General response evaluated.",
      isCorrect: true,
      isPartial: false,
      objectivesAssessed: ["general"],
    };
  }

  updated.evaluations = [...session.evaluations, evaluation];
  updated.coveredObjectives = [
    ...new Set([...session.coveredObjectives, ...evaluation.objectivesAssessed]),
  ];

  updated.difficulty = adjustDifficulty(session.difficulty, evaluation);

  const topicScore =
    (session.currentTopic.score * session.currentTopic.questionsAsked +
      evaluation.overall) /
    (session.currentTopic.questionsAsked + 1);

  updated.currentTopic = {
    ...session.currentTopic,
    score: topicScore,
    questionsAsked: session.currentTopic.questionsAsked + 1,
    objectivesCovered: [
      ...new Set([
        ...session.currentTopic.objectivesCovered,
        ...evaluation.objectivesAssessed,
      ]),
    ],
  };

  const allScores = [...updated.evaluations.map((e) => e.overall)];
  updated.score = Math.round(
    allScores.reduce((a, b) => a + b, 0) / allScores.length
  );

  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(
    updated.evaluations,
    new Map([[session.currentTopic.topicId, session.currentTopic.topicTitle]])
  );
  updated.strengths = strengths;
  updated.weaknesses = weaknesses;

  if (shouldEndInterview(updated)) {
    updated.isComplete = true;
    const closing = generateClosingMessage();
    updated.conversationHistory = [
      ...updated.conversationHistory,
      createMessage("interviewer", closing),
    ];
    return { session: updated, interviewerMessage: closing, isComplete: true };
  }

  const shouldFollowUp =
    evaluation.isPartial ||
    evaluation.misconception ||
    (!evaluation.isCorrect && session.currentTopic.questionsAsked < 3);

  const shouldSwitchTopic =
    evaluation.isCorrect &&
    !evaluation.isPartial &&
    session.currentTopic.questionsAsked >= 2;

  let interviewerMessage: string;

  if (shouldFollowUp && session.currentTopic.questionsAsked < 4) {
    const uncovered = (topic?.learningObjectives ?? [])
      .map((o) => o.id)
      .filter((id) => !updated.coveredObjectives.includes(id));

    const { question } = generateQuestion({
      topicId: session.currentTopic.topicId,
      curriculum: session.curriculum,
      profile: session.candidateProfile,
      difficulty: updated.difficulty,
      conversationHistory: updated.conversationHistory,
      lastEvaluation: evaluation,
      questionNumber: session.questionNumber + 1,
      uncoveredObjectives: uncovered,
      isFollowUp: true,
    });

    interviewerMessage = question;
    updated.questionNumber = session.questionNumber + 1;
    updated.currentTopic.questionsAsked += 1;
  } else if (shouldSwitchTopic || session.currentTopic.questionsAsked >= 3) {
    updated.topicCoverages = [
      ...session.topicCoverages,
      updated.currentTopic,
    ];

    const coveredIds = [
      ...session.topicCoverages.map((t) => t.topicId),
      updated.currentTopic.topicId,
    ];

    const nextTopic = selectNextTopic(
      session.curriculum,
      session.candidateProfile,
      coveredIds
    );

    if (!nextTopic || shouldEndInterview({ ...updated, questionNumber: updated.questionNumber + 1 })) {
      updated.isComplete = true;
      interviewerMessage = generateClosingMessage();
      updated.conversationHistory = [
        ...updated.conversationHistory,
        createMessage("interviewer", interviewerMessage),
      ];
      return { session: updated, interviewerMessage, isComplete: true };
    }

    const transition = generateTransitionMessage(
      session.currentTopic.topicTitle,
      nextTopic.topicTitle,
      nextTopic.day
    );

    const topicInfo = getTopicById(session.curriculum, nextTopic.topicId);
    const uncovered =
      topicInfo?.topic.learningObjectives.map((o) => o.id) ?? [];

    const { question } = generateQuestion({
      topicId: nextTopic.topicId,
      curriculum: session.curriculum,
      profile: session.candidateProfile,
      difficulty: updated.difficulty,
      conversationHistory: updated.conversationHistory,
      questionNumber: session.questionNumber + 1,
      uncoveredObjectives: uncovered,
      isFollowUp: false,
    });

    interviewerMessage = `${transition}\n\n${question}`;
    updated.currentTopic = { ...nextTopic, questionsAsked: 1 };
    updated.questionNumber = session.questionNumber + 1;
  } else {
    const uncovered = (topic?.learningObjectives ?? [])
      .map((o) => o.id)
      .filter((id) => !updated.coveredObjectives.includes(id));

    const { question } = generateQuestion({
      topicId: session.currentTopic.topicId,
      curriculum: session.curriculum,
      profile: session.candidateProfile,
      difficulty: updated.difficulty,
      conversationHistory: updated.conversationHistory,
      lastEvaluation: evaluation,
      questionNumber: session.questionNumber + 1,
      uncoveredObjectives: uncovered,
      isFollowUp: false,
    });

    interviewerMessage = question;
    updated.questionNumber = session.questionNumber + 1;
    updated.currentTopic.questionsAsked += 1;
  }

  updated.conversationHistory = [
    ...updated.conversationHistory,
    createMessage("interviewer", interviewerMessage),
  ];

  return { session: updated, interviewerMessage, isComplete: false };
}

export function generateReport(session: InterviewSession): InterviewReport {
  const allTopicCoverages = [
    ...session.topicCoverages,
    ...(session.isComplete ? [] : [session.currentTopic]),
  ];

  const topicBreakdown = allTopicCoverages.map((tc) => ({
    topic: tc.topicTitle,
    day: tc.dayTitle,
    score: Math.round(tc.score),
    objectivesCovered: tc.objectivesCovered.length,
  }));

  const avgScore = session.score;
  const skippedTopics = session.candidateProfile.skippedTopics
    .map((s) => {
      const info = getTopicById(session.curriculum, s.topicId);
      return info?.topic.title;
    })
    .filter(Boolean) as string[];

  const weakSignals = session.candidateProfile.learningSignals
    .filter((s) => s.strength === "weak")
    .map((s) => {
      const info = getTopicById(session.curriculum, s.topicId);
      return info?.topic.title;
    })
    .filter(Boolean) as string[];

  const recommendations: string[] = [];
  if (avgScore < 60) {
    recommendations.push("Review foundational concepts before advancing to complex topics");
  }
  if (session.weaknesses.some((w) => w.includes("depth"))) {
    recommendations.push("Practice explaining technical concepts with real-world examples");
  }
  if (session.weaknesses.some((w) => w.includes("Communication"))) {
    recommendations.push("Structure answers using problem → approach → trade-offs → conclusion");
  }
  if (skippedTopics.length > 0) {
    recommendations.push(`Complete skipped topics: ${skippedTopics.join(", ")}`);
  }
  recommendations.push("Continue building projects that apply curriculum concepts in production-like scenarios");

  const nextTopicsToReview = [
    ...weakSignals,
    ...skippedTopics,
    ...topicBreakdown.filter((t) => t.score < 60).map((t) => t.topic),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

  const communicationAvg =
    session.evaluations.reduce((s, e) => s + e.communication, 0) /
    Math.max(session.evaluations.length, 1);

  let communicationFeedback: string;
  if (communicationAvg >= 80) {
    communicationFeedback =
      "Excellent communication throughout the interview. Responses were well-structured and easy to follow.";
  } else if (communicationAvg >= 60) {
    communicationFeedback =
      "Good communication overall. Consider using more concrete examples and clearer structure in longer answers.";
  } else {
    communicationFeedback =
      "Communication needs improvement. Practice organizing thoughts before responding and use specific examples.";
  }

  const interviewSummary = `Interview covered ${topicBreakdown.length} topic areas across ${session.questionNumber} questions. Overall performance scored ${avgScore}/100 with difficulty adapted from ${getInitialDifficulty(session.candidateProfile)} to ${session.difficulty}. ${
    avgScore >= 75
      ? "The candidate demonstrated strong readiness for advanced topics."
      : avgScore >= 55
        ? "The candidate shows promise with areas identified for focused improvement."
        : "The candidate would benefit from additional study before advancing."
  }`;

  return {
    candidateId: session.candidateProfile.candidateId,
    candidateName: session.candidateProfile.name,
    date: new Date().toISOString().split("T")[0],
    overallScore: avgScore,
    strengths: session.strengths,
    weaknesses: session.weaknesses,
    topicBreakdown,
    interviewSummary,
    recommendations: [...new Set(recommendations)],
    nextTopicsToReview,
    communicationFeedback,
    conversationHistory: session.conversationHistory,
  };
}

export function endInterview(session: InterviewSession): InterviewReport {
  const finalSession = { ...session, isComplete: true };
  if (finalSession.topicCoverages.length === 0 || 
      !finalSession.topicCoverages.find(t => t.topicId === session.currentTopic.topicId)) {
    finalSession.topicCoverages = [
      ...session.topicCoverages,
      session.currentTopic,
    ];
  }
  return generateReport(finalSession);
}
