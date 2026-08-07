import type {
  InterviewSession,
  InterviewReport,
  ChatMessage,
  CandidateProfile,
  Curriculum,
  EvaluationResult,
  InterviewStyle,
  QuestionReview,
  ScoreBreakdown,
  DifficultyLevel,
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
import {
  generateConversationalResponse,
  formatConversationalResponse,
} from "@/lib/interview/conversational";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  options: Pick<ChatMessage, "questionId" | "kind"> = {}
): ChatMessage {
  return { id: generateId(), role, content, timestamp: Date.now(), ...options };
}

function styleToDifficulty(
  style: InterviewStyle,
  profile: CandidateProfile
): DifficultyLevel {
  if (style === "easy") return 2;
  if (style === "hard") return 4;
  return getInitialDifficulty(profile);
}

function averageBreakdown(evaluations: EvaluationResult[]): ScoreBreakdown {
  const count = Math.max(evaluations.length, 1);
  const totals = evaluations.reduce<ScoreBreakdown>(
    (acc, evaluation) => ({
      technicalAccuracy:
        acc.technicalAccuracy + evaluation.scoreBreakdown.technicalAccuracy,
      communicationClarity:
        acc.communicationClarity + evaluation.scoreBreakdown.communicationClarity,
      completeness: acc.completeness + evaluation.scoreBreakdown.completeness,
      problemSolving: acc.problemSolving + evaluation.scoreBreakdown.problemSolving,
      codeQuality: acc.codeQuality + evaluation.scoreBreakdown.codeQuality,
    }),
    {
      technicalAccuracy: 0,
      communicationClarity: 0,
      completeness: 0,
      problemSolving: 0,
      codeQuality: 0,
    }
  );

  return {
    technicalAccuracy: Math.round(totals.technicalAccuracy / count),
    communicationClarity: Math.round(totals.communicationClarity / count),
    completeness: Math.round(totals.completeness / count),
    problemSolving: Math.round(totals.problemSolving / count),
    codeQuality: Math.round(totals.codeQuality / count),
  };
}

function difficultyInstruction(style: InterviewStyle): string {
  if (style === "easy") {
    return "Use a friendly mentor tone, focus on concepts, and keep follow-ups approachable.";
  }
  if (style === "hard") {
    return "Use a senior technical director lens, probe architecture, edge cases, trade-offs, and production risk.";
  }
  return "Use a balanced technical interviewer style with practical and conceptual coverage.";
}

function generateModelAnswer(
  curriculum: Curriculum,
  topicId: string,
  objectiveId: string,
  candidateAnswer: string
): string {
  const topicData = getTopicById(curriculum, topicId);
  const objective =
    topicData?.topic.learningObjectives.find((o) => o.id === objectiveId) ??
    topicData?.topic.learningObjectives[0];
  const title = topicData?.topic.title ?? "the topic";
  const tools = topicData?.topic.tools?.slice(0, 3).join(", ");
  const keywords = objective?.keywords?.slice(0, 5) ?? [];
  const missed = keywords.filter(
    (keyword) => !candidateAnswer.toLowerCase().includes(keyword.toLowerCase())
  );
  const codeExample =
    /api|python|javascript|typescript|sql|json|fastapi|react|database|script/i.test(
      `${title} ${objective?.description ?? ""}`
    )
      ? "\n\n```ts\nfunction validateInput(value: unknown) {\n  if (value == null) throw new Error(\"Input is required\");\n  return value;\n}\n```\n"
      : "";

  return `An ideal response would explain **${title}** through the objective: ${
    objective?.description ?? "the relevant curriculum objective"
  }. It should connect the concept to a practical workflow${
    tools ? ` using ${tools}` : ""
  }, name the main trade-offs, and describe how you would verify the approach.${codeExample}${
    missed.length
      ? `Important concepts to include: ${missed.join(", ")}.`
      : "The answer should be specific, structured, and backed by an example."
  }`;
}

export function createSession(
  candidateProfile: CandidateProfile,
  curriculum: Curriculum,
  selectedDifficulty: InterviewStyle = "medium"
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
    difficulty: styleToDifficulty(selectedDifficulty, candidateProfile),
    strengths: [],
    weaknesses: [],
    conversationHistory: [],
    coveredObjectives: [],
    topicCoverages: [],
    score: 0,
    evaluations: [],
    questionReviews: [],
    currentQuestionId: "",
    currentQuestion: "",
    currentObjectiveId: "",
    selectedDifficulty,
    skipTokensRemaining: 2,
    skippedQuestions: [],
    hintsUsed: [],
    questionStartedAt: Date.now(),
    consecutiveFollowUps: 0,
    lastAcknowledgement: undefined,
    lastRemark: undefined,
    isComplete: false,
    startedAt: Date.now(),
  };
}

export function startInterview(
  candidateProfile: CandidateProfile,
  curriculum: Curriculum,
  selectedDifficulty: InterviewStyle = "medium"
): { session: InterviewSession; messages: ChatMessage[]; firstQuestion: string } {
  const session = createSession(candidateProfile, curriculum, selectedDifficulty);

  const opening = generateOpeningMessage(
    candidateProfile,
    session.currentTopic.topicTitle,
    session.currentTopic.dayTitle,
    session.currentTopic.day
  );

  const topicData = getTopicById(curriculum, session.currentTopic.topicId);
  const uncoveredObjectives =
    topicData?.topic.learningObjectives.map((o) => o.id) ?? [];

  const { question, objectiveId } = generateQuestion({
    topicId: session.currentTopic.topicId,
    curriculum,
    profile: candidateProfile,
    difficulty: session.difficulty,
    conversationHistory: [],
    questionNumber: 1,
    uncoveredObjectives,
    isFollowUp: false,
  });
  const questionId = generateId();

  const messages = [
    createMessage("interviewer", `${opening}\n\n${difficultyInstruction(selectedDifficulty)}`, {
      kind: "system",
    }),
    createMessage("interviewer", question, { questionId, kind: "question" }),
  ];

  session.conversationHistory = messages;
  session.questionNumber = 1;
  session.currentTopic.questionsAsked = 1;
  session.currentQuestionId = questionId;
  session.currentQuestion = question;
  session.currentObjectiveId = objectiveId;
  session.questionStartedAt = Date.now();

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
      codeQuality: 60,
      scoreBreakdown: {
        technicalAccuracy: 50,
        communicationClarity: 50,
        completeness: 50,
        problemSolving: 50,
        codeQuality: 60,
      },
      feedback: "General response evaluated.",
      isCorrect: true,
      isPartial: false,
      objectivesAssessed: ["general"],
    };
  }

  updated.evaluations = [...session.evaluations, evaluation];
  updated.questionReviews = [
    ...session.questionReviews,
    {
      questionId: session.currentQuestionId,
      question: session.currentQuestion,
      candidateAnswer,
      modelAnswer: generateModelAnswer(
        session.curriculum,
        session.currentTopic.topicId,
        evaluation.objectivesAssessed[0] ?? session.currentObjectiveId,
        candidateAnswer
      ),
      feedback: evaluation.feedback,
      topic: session.currentTopic.topicTitle,
      day: session.currentTopic.dayTitle,
      evaluation,
    },
  ];
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
      createMessage("interviewer", closing, { kind: "system" }),
    ];
    return { session: updated, interviewerMessage: closing, isComplete: true };
  }

  const coveredIds = [
    ...session.topicCoverages.map((t) => t.topicId),
    session.currentTopic.topicId,
  ];

  const nextTopic = selectNextTopic(
    session.curriculum,
    session.candidateProfile,
    coveredIds
  );
  const nextTopicTitle = nextTopic?.topicTitle;

  const consecutiveFollowUps = session.consecutiveFollowUps ?? 0;
  const lastAcknowledgement = session.lastAcknowledgement;
  const lastRemark = session.lastRemark;

  const convResponse = generateConversationalResponse(
    candidateAnswer,
    evaluation,
    session.currentTopic.topicTitle,
    nextTopicTitle,
    consecutiveFollowUps,
    lastAcknowledgement,
    lastRemark
  );

  let interviewerMessage: string;
  let nextObjectiveId = session.currentObjectiveId;

  if (convResponse.shouldSwitchTopic) {
    updated.consecutiveFollowUps = 0;
    if (nextTopic && !convResponse.isFollowUp) {
      updated.topicCoverages = [...session.topicCoverages, updated.currentTopic];

      if (!nextTopic || shouldEndInterview({ ...updated, questionNumber: updated.questionNumber + 1 })) {
        updated.isComplete = true;
        interviewerMessage = generateClosingMessage();
        updated.conversationHistory = [
          ...updated.conversationHistory,
          createMessage("interviewer", interviewerMessage),
        ];
        return { session: updated, interviewerMessage, isComplete: true };
      }

      const topicInfo = getTopicById(session.curriculum, nextTopic.topicId);
      const uncovered = topicInfo?.topic.learningObjectives.map((o) => o.id) ?? [];

      const { question, objectiveId } = generateQuestion({
        topicId: nextTopic.topicId,
        curriculum: session.curriculum,
        profile: session.candidateProfile,
        difficulty: updated.difficulty,
        conversationHistory: updated.conversationHistory,
        questionNumber: session.questionNumber + 1,
        uncoveredObjectives: uncovered,
        isFollowUp: false,
      });

      interviewerMessage = formatConversationalResponse({
        ...convResponse,
        question,
      });
      nextObjectiveId = objectiveId;
      updated.currentTopic = { ...nextTopic, questionsAsked: 1 };
      updated.questionNumber = session.questionNumber + 1;
    } else {
      interviewerMessage = formatConversationalResponse(convResponse);
      updated.questionNumber = session.questionNumber + 1;
    }
  } else {
    updated.consecutiveFollowUps = consecutiveFollowUps + 1;
    const uncovered = (topic?.learningObjectives ?? [])
      .map((o) => o.id)
      .filter((id) => !updated.coveredObjectives.includes(id));

    const { question, objectiveId } = generateQuestion({
      topicId: session.currentTopic.topicId,
      curriculum: session.curriculum,
      profile: session.candidateProfile,
      difficulty: updated.difficulty,
      conversationHistory: updated.conversationHistory,
      lastEvaluation: evaluation,
      questionNumber: session.questionNumber + 1,
      uncoveredObjectives: uncovered,
      isFollowUp: true,
      candidateAnswer,
    });

    interviewerMessage = formatConversationalResponse({
      ...convResponse,
      question,
    });
    nextObjectiveId = objectiveId;
    updated.questionNumber = session.questionNumber + 1;
    updated.currentTopic.questionsAsked += 1;
  }

  updated.lastAcknowledgement = convResponse.acknowledgement;
  updated.lastRemark = convResponse.remark;

  const nextQuestionId = generateId();
  updated.currentQuestionId = nextQuestionId;
  updated.currentQuestion = interviewerMessage;
  updated.currentObjectiveId = nextObjectiveId;
  updated.questionStartedAt = Date.now();
  updated.conversationHistory = [
    ...updated.conversationHistory,
    createMessage("interviewer", interviewerMessage, {
      questionId: nextQuestionId,
      kind: "question",
    }),
  ];

  return { session: updated, interviewerMessage, isComplete: false };
}

export function generateHint(session: InterviewSession): {
  session: InterviewSession;
  hint: string;
} {
  if (session.hintsUsed.includes(session.currentQuestionId)) {
    return {
      session,
      hint: "A hint has already been used for this question.",
    };
  }

  const topicData = getTopicById(session.curriculum, session.currentTopic.topicId);
  const objective =
    topicData?.topic.learningObjectives.find(
      (o) => o.id === session.currentObjectiveId
    ) ?? topicData?.topic.learningObjectives[0];
  const clue = objective?.keywords?.slice(0, session.selectedDifficulty === "hard" ? 2 : 4);
  const hint = `Think about **${topicData?.topic.title ?? session.currentTopic.topicTitle}** in terms of ${
    objective?.description.toLowerCase() ?? "the relevant learning objective"
  }.${clue?.length ? ` Useful concepts to consider: ${clue.join(", ")}.` : ""}`;

  const updated = {
    ...session,
    hintsUsed: [...session.hintsUsed, session.currentQuestionId],
    conversationHistory: [
      ...session.conversationHistory,
      createMessage("interviewer", hint, {
        questionId: session.currentQuestionId,
        kind: "hint",
      }),
    ],
  };

  return { session: updated, hint };
}

export function skipQuestion(session: InterviewSession): {
  session: InterviewSession;
  interviewerMessage: string;
  isComplete: boolean;
} {
  if (session.skipTokensRemaining <= 0) {
    return {
      session,
      interviewerMessage: "No skip tokens remain.",
      isComplete: session.isComplete,
    };
  }

  const skipped: QuestionReview = {
    questionId: session.currentQuestionId,
    question: session.currentQuestion,
    candidateAnswer: "",
    modelAnswer: generateModelAnswer(
      session.curriculum,
      session.currentTopic.topicId,
      session.currentObjectiveId,
      ""
    ),
    feedback: "Question skipped by candidate.",
    topic: session.currentTopic.topicTitle,
    day: session.currentTopic.dayTitle,
    skipped: true,
  };

  const updated: InterviewSession = {
    ...session,
    skipTokensRemaining: session.skipTokensRemaining - 1,
    skippedQuestions: [...session.skippedQuestions, skipped],
    questionReviews: [...session.questionReviews, skipped],
    topicCoverages: [...session.topicCoverages, session.currentTopic],
  };

  const coveredIds = [
    ...updated.topicCoverages.map((t) => t.topicId),
    session.currentTopic.topicId,
  ];
  const nextTopic = selectNextTopic(
    session.curriculum,
    session.candidateProfile,
    coveredIds
  );

  if (!nextTopic) {
    updated.isComplete = true;
    const closing = generateClosingMessage();
    updated.conversationHistory = [
      ...session.conversationHistory,
      createMessage("candidate", "[Skipped question]", {
        questionId: session.currentQuestionId,
        kind: "answer",
      }),
      createMessage("interviewer", closing, { kind: "system" }),
    ];
    return { session: updated, interviewerMessage: closing, isComplete: true };
  }

  const topicInfo = getTopicById(session.curriculum, nextTopic.topicId);
  const uncovered = topicInfo?.topic.learningObjectives.map((o) => o.id) ?? [];
  const { question, objectiveId } = generateQuestion({
    topicId: nextTopic.topicId,
    curriculum: session.curriculum,
    profile: session.candidateProfile,
    difficulty: updated.difficulty,
    conversationHistory: updated.conversationHistory,
    questionNumber: session.questionNumber + 1,
    uncoveredObjectives: uncovered,
    isFollowUp: false,
  });
  const transition = generateTransitionMessage(
    session.currentTopic.topicTitle,
    nextTopic.topicTitle,
    nextTopic.day
  );

  const convResponse = generateConversationalResponse(
    "[Skipped question]",
    {
      conceptAccuracy: 50,
      completeness: 50,
      depth: 50,
      reasoning: 50,
      communication: 50,
      confidence: 50,
      overall: 50,
      codeQuality: 60,
      scoreBreakdown: {
        technicalAccuracy: 50,
        communicationClarity: 50,
        completeness: 50,
        problemSolving: 50,
        codeQuality: 60,
      },
      feedback: "Question skipped.",
      isCorrect: true,
      isPartial: false,
      objectivesAssessed: ["general"],
    },
    session.currentTopic.topicTitle,
    nextTopic.topicTitle,
    0,
    undefined,
    undefined
  );

  const questionId = generateId();
  const interviewerMessage = formatConversationalResponse({
    ...convResponse,
    question: `${transition}\n\n${question}`,
  });

  updated.currentTopic = { ...nextTopic, questionsAsked: 1 };
  updated.questionNumber = session.questionNumber + 1;
  updated.currentQuestionId = questionId;
  updated.currentQuestion = interviewerMessage;
  updated.currentObjectiveId = objectiveId;
  updated.questionStartedAt = Date.now();
  updated.lastAcknowledgement = convResponse.acknowledgement;
  updated.lastRemark = convResponse.remark;
  updated.consecutiveFollowUps = 0;
  updated.conversationHistory = [
    ...session.conversationHistory,
    createMessage("candidate", "[Skipped question]", {
      questionId: session.currentQuestionId,
      kind: "answer",
    }),
    createMessage("interviewer", interviewerMessage, {
      questionId,
      kind: "question",
    }),
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
  const scoreBreakdown = averageBreakdown(session.evaluations);
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
    interviewTimestamp: new Date().toISOString(),
    selectedDifficulty: session.selectedDifficulty,
    overallScore: avgScore,
    scoreBreakdown,
    strengths: session.strengths,
    weaknesses: session.weaknesses,
    topicBreakdown,
    interviewSummary,
    recommendations: [...new Set(recommendations)],
    nextTopicsToReview,
    communicationFeedback,
    questionReviews: session.questionReviews,
    skippedQuestions: session.skippedQuestions,
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
