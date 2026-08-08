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
  TopicCoverage,
} from "@/types";
import {
  selectNextTopic,
  calculateTotalQuestions,
  shouldEndInterview,
  getInitialDifficulty,
  getTopicById,
} from "@/lib/interview/topicSelector";
import {
  generateQuestion,
  generateOpeningMessage,
  generateClosingMessage,
} from "@/lib/questionGenerator";
import { evaluateAnswer, deriveStrengthsAndWeaknesses, keywordMatchesAnswer } from "@/lib/evaluator";
import { formatModelAnswer, generateDomainModelAnswer } from "@/lib/evaluator/modelAnswer";
import { analyzeCandidateResponse } from "@/lib/interview/responseAnalyzer";
import { determineInterviewStrategy } from "@/lib/interview/strategyEngine";
import type { InterviewStrategy } from "@/lib/interview/strategyEngine";
import {
  generateInterviewerResponse,
  generateInterviewerResponseLLM,
} from "@/lib/interview/conversationGenerator";
import { generateHintLLM, generateClosingMessageLLM } from "@/lib/llm/questionGenerator";
import { isLLMEnabled } from "@/lib/llm/config";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function withFallback<T>(fn: () => Promise<T>, fallback: T | (() => T)): Promise<T> {
  if (!isLLMEnabled()) {
    return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  }
  try {
    return await fn();
  } catch {
    return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  }
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  options: Pick<ChatMessage, "questionId" | "kind" | "objectiveId"> = {}
): ChatMessage {
  return { id: generateId(), role, content, timestamp: Date.now(), ...options };
}

interface QuestionContext {
  questionId: string;
  objectiveId: string;
  objectiveDescription: string;
  topicId: string;
  difficulty: DifficultyLevel;
}

function findQuestionContext(
  history: ChatMessage[],
  currentQuestionId: string
): QuestionContext | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.kind === "question" && msg.questionId === currentQuestionId) {
      return {
        questionId: msg.questionId ?? currentQuestionId,
        objectiveId: msg.objectiveId ?? "",
        objectiveDescription: "",
        topicId: "",
        difficulty: 2 as DifficultyLevel,
      };
    }
  }
  return null;
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
  const zero: ScoreBreakdown = {
    technicalAccuracy: 0,
    communicationClarity: 0,
    completeness: 0,
    problemSolving: 0,
    codeQuality: 0,
    implementationSpecificity: 0,
    tradeOffAwareness: 0,
    technicalVocabulary: 0,
    structuralQuality: 0,
  };
  const totals = evaluations.reduce<ScoreBreakdown>(
    (acc, evaluation) => ({
      technicalAccuracy:
        acc.technicalAccuracy + evaluation.scoreBreakdown.technicalAccuracy,
      communicationClarity:
        acc.communicationClarity + evaluation.scoreBreakdown.communicationClarity,
      completeness: acc.completeness + evaluation.scoreBreakdown.completeness,
      problemSolving: acc.problemSolving + evaluation.scoreBreakdown.problemSolving,
      codeQuality: acc.codeQuality + evaluation.scoreBreakdown.codeQuality,
      implementationSpecificity:
        acc.implementationSpecificity + (evaluation.scoreBreakdown.implementationSpecificity ?? 0),
      tradeOffAwareness:
        acc.tradeOffAwareness + (evaluation.scoreBreakdown.tradeOffAwareness ?? 0),
      technicalVocabulary:
        acc.technicalVocabulary + (evaluation.scoreBreakdown.technicalVocabulary ?? 0),
      structuralQuality:
        acc.structuralQuality + (evaluation.scoreBreakdown.structuralQuality ?? 0),
    }),
    zero
  );

  return {
    technicalAccuracy: Math.round(totals.technicalAccuracy / count),
    communicationClarity: Math.round(totals.communicationClarity / count),
    completeness: Math.round(totals.completeness / count),
    problemSolving: Math.round(totals.problemSolving / count),
    codeQuality: Math.round(totals.codeQuality / count),
    implementationSpecificity: Math.round(totals.implementationSpecificity / count),
    tradeOffAwareness: Math.round(totals.tradeOffAwareness / count),
    technicalVocabulary: Math.round(totals.technicalVocabulary / count),
    structuralQuality: Math.round(totals.structuralQuality / count),
  };
}

const EMPTY_SCORE_BREAKDOWN: ScoreBreakdown = {
  technicalAccuracy: 0,
  communicationClarity: 0,
  completeness: 0,
  problemSolving: 0,
  codeQuality: 0,
  implementationSpecificity: 0,
  tradeOffAwareness: 0,
  technicalVocabulary: 0,
  structuralQuality: 0,
};

export function generateModelAnswer(
  curriculum: Curriculum,
  topicId: string,
  objectiveId: string,
  candidateAnswer: string
): string {
  const topicData = getTopicById(curriculum, topicId);
  if (!topicData) {
    return "**General** — Tell me about your experience with the topics covered in this curriculum.";
  }
  const objective =
    topicData.topic.learningObjectives.find((o) => o.id === objectiveId) ??
    topicData.topic.learningObjectives[0];

  const model = generateDomainModelAnswer(
    topicData.topic,
    {
      id: objectiveId,
      description: objective?.description ?? "",
      keywords: objective?.keywords,
    },
    candidateAnswer
  );

  return formatModelAnswer(model);
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
    askedObjectiveIds: [],
    askedQuestions: [],
    learningAgility: 0,
    analysisLog: [],
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
    createMessage("interviewer", opening, {
      kind: "system",
    }),
    createMessage("interviewer", question, { questionId, kind: "question", objectiveId }),
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

export async function processAnswer(
  session: InterviewSession,
  candidateAnswer: string
): Promise<{
  session: InterviewSession;
  interviewerMessage: string;
  isComplete: boolean;
}> {
  const updated: InterviewSession = { ...session };
  updated.conversationHistory = [
    ...session.conversationHistory,
    createMessage("candidate", candidateAnswer, {
      kind: "answer",
      questionId: session.currentQuestionId,
    }),
  ];

  const topicData = getTopicById(session.curriculum, session.currentTopic.topicId);
  const topic = topicData?.topic;

  const questionCtx = findQuestionContext(session.conversationHistory, session.currentQuestionId);
  const fallbackObjectiveId = topic?.learningObjectives[0]?.id ?? "";
  let objectiveId = questionCtx?.objectiveId || session.currentObjectiveId || fallbackObjectiveId;

  if (questionCtx && questionCtx.objectiveId && topic) {
    const objectiveExists = topic.learningObjectives.some((o) => o.id === questionCtx.objectiveId);
    if (!objectiveExists) {
      console.warn(
        `[Question-Objective Mismatch] questionId=${session.currentQuestionId} references objectiveId=${questionCtx.objectiveId} which does not exist in topic=${topic.title}. Falling back to session objective.`
      );
      objectiveId = session.currentObjectiveId || fallbackObjectiveId;
    }
  }

  const objective =
    topic?.learningObjectives.find((o) => o.id === objectiveId) ??
    topic?.learningObjectives[0];

  const analysis = topic
    ? analyzeCandidateResponse({
        question: session.currentQuestion,
        candidateAnswer,
        topicTitle: topic.title,
        objectiveDescription: objective?.description ?? "",
        keywords: objective?.keywords ?? [],
        difficulty: session.difficulty,
        conversationHistory: session.conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        selectedStyle: session.selectedDifficulty,
      })
    : null;

  let evaluation: EvaluationResult;
  if (topic) {
    evaluation = evaluateAnswer({
      answer: candidateAnswer,
      topic,
      objectiveId,
      difficulty: session.difficulty,
      responseAnalysis: analysis ?? undefined,
    });
    if (questionCtx && evaluation.objectivesAssessed[0] !== objectiveId) {
      console.warn(
        `[Evaluation-Objective Mismatch] questionId=${session.currentQuestionId} expected objectiveId=${objectiveId} but evaluation assessed=${evaluation.objectivesAssessed[0]}`
      );
    }
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
      implementationSpecificity: 50,
      tradeOffAwareness: 50,
      technicalVocabulary: 50,
      structuralQuality: 50,
      scoreBreakdown: { ...EMPTY_SCORE_BREAKDOWN },
      feedback: "General response evaluated.",
      modelAnswer: "",
      isCorrect: true,
      isPartial: false,
      objectivesAssessed: ["general"],
    };
  }

  updated.evaluations = [...session.evaluations, evaluation];
  if (analysis) {
    updated.analysisLog = [...(session.analysisLog ?? []), analysis];
  }
  updated.questionReviews = [
    ...session.questionReviews,
    {
      questionId: session.currentQuestionId,
      question: session.currentQuestion,
      candidateAnswer,
      modelAnswer: generateModelAnswer(
        session.curriculum,
        session.currentTopic.topicId,
        evaluation.objectivesAssessed[0] ?? objectiveId,
        candidateAnswer
      ),
      feedback: evaluation.feedback,
      topic: session.currentTopic.topicTitle,
      day: session.currentTopic.dayTitle,
      evaluation,
    },
  ];

  // Only mark objectives covered when the answer is (at least partially) correct
  if (evaluation.isCorrect || evaluation.isPartial) {
    updated.coveredObjectives = [
      ...new Set([...session.coveredObjectives, ...evaluation.objectivesAssessed]),
    ];
  }
  updated.askedObjectiveIds = [
    ...new Set([...session.askedObjectiveIds, objectiveId]),
  ];

  // 3. Determine the interview strategy from the analysis
  const strategy = determineInterviewStrategy({
    analysis:
      analysis ?? {
        responseType: "CORRECT",
        confidence: 0.5,
        reasoning: "No topic context available.",
        misconceptions: [],
        strengths: [],
        missingConcepts: [],
        suggestedStrategy: "MOVE_FORWARD",
        depthCheckRequired: false,
      },
    consecutiveFollowUps: session.consecutiveFollowUps ?? 0,
    currentDifficulty: session.difficulty,
    selectedStyle: session.selectedDifficulty,
    questionNumber: session.questionNumber,
    totalQuestions: session.totalQuestions,
    coveredTopics: session.topicCoverages.length,
    previousAnalyses: session.analysisLog ?? [],
    objectiveDescription: objective?.description,
    missingConceptHints: objective?.keywords,
  });

  updated.difficulty = Math.max(
    1,
    Math.min(5, session.difficulty + strategy.difficultyAdjustment)
  ) as DifficultyLevel;

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

  const allScores = updated.evaluations.map((e) => e.overall);
  updated.score = Math.round(
    allScores.reduce((a, b) => a + b, 0) / allScores.length
  );

  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(
    updated.evaluations,
    new Map([[session.currentTopic.topicId, session.currentTopic.topicTitle]])
  );
  updated.strengths = strengths;
  updated.weaknesses = weaknesses;

  const agilityValues = updated.evaluations
    .map((e) => e.learningAgility)
    .filter((v): v is number => typeof v === "number" && v > 0);
  updated.learningAgility = agilityValues.length
    ? Math.round(
        agilityValues.reduce((a, b) => a + b, 0) / agilityValues.length
      )
    : 0;

  // 4. End-of-interview check
  if (shouldEndInterview(updated)) {
    updated.isComplete = true;
    const closing = await withFallback(
      () => generateClosingMessageLLM(session.selectedDifficulty),
      () => generateClosingMessage()
    );
    updated.conversationHistory = [
      ...updated.conversationHistory,
      createMessage("interviewer", closing, { kind: "system" }),
    ];
    return { session: updated, interviewerMessage: closing, isComplete: true };
  }

  // 5. Decide whether to stay on this topic or transition
  const isFollowUp = [
    "FOLLOW_UP",
    "TEACH_AND_VERIFY",
    "CORRECT_AND_FOLLOW_UP",
    "SIMPLIFY_AND_REASK",
    "CLARIFY",
  ].includes(strategy.action);

  let nextTopic = session.currentTopic;
  let nextTopicData = topicData;
  let transitioned = false;

  if (!isFollowUp) {
    updated.topicCoverages = [...session.topicCoverages, updated.currentTopic];
    const coveredIds = [...updated.topicCoverages.map((t) => t.topicId)];
    const picked = selectNextTopic(
      session.curriculum,
      session.candidateProfile,
      coveredIds
    );
    if (picked) {
      nextTopic = picked;
      nextTopicData = getTopicById(session.curriculum, picked.topicId);
      transitioned = true;
    }
    updated.consecutiveFollowUps = 0;
  } else {
    updated.consecutiveFollowUps = (session.consecutiveFollowUps ?? 0) + 1;
  }

  // If no next topic exists, end the interview
  if (!isFollowUp && !transitioned) {
    updated.isComplete = true;
    const closing = await withFallback(
      () => generateClosingMessageLLM(session.selectedDifficulty),
      () => generateClosingMessage()
    );
    updated.conversationHistory = [
      ...updated.conversationHistory,
      createMessage("interviewer", closing, { kind: "system" }),
    ];
    return { session: updated, interviewerMessage: closing, isComplete: true };
  }

  // 6. Pick the next objective (dedupe against asked objectives)
  const nextObjectives = nextTopicData?.topic.learningObjectives ?? [];
  const unasked = nextObjectives.filter(
    (o) => !updated.askedObjectiveIds.includes(o.id)
  );
  const nextObjective = unasked[0] ?? nextObjectives[0];
  const nextObjectiveId = nextObjective?.id ?? objectiveId;

  // 7. Generate the interviewer's next message (LLM with rule-based fallback)
  const context = {
    strategy,
    analysis:
      analysis ?? {
        responseType: "CORRECT",
        confidence: 0.5,
        reasoning: "",
        misconceptions: [],
        strengths: [],
        missingConcepts: [],
        suggestedStrategy: "MOVE_FORWARD",
        depthCheckRequired: false,
      },
    candidateAnswer,
    currentTopic:
      nextTopicData?.topic ?? {
        id: nextTopic.topicId,
        day: nextTopic.day,
        title: nextTopic.topicTitle,
        learningObjectives: [],
      },
    nextTopicTitle: transitioned ? nextTopic.topicTitle : undefined,
    nextTopicDay: transitioned ? nextTopic.day : undefined,
    profile: session.candidateProfile,
    curriculum: session.curriculum,
    selectedStyle: session.selectedDifficulty,
    difficulty: updated.difficulty,
    questionNumber: session.questionNumber + 1,
    totalQuestions: session.totalQuestions,
    conversationHistory: updated.conversationHistory,
    consecutiveFollowUps: updated.consecutiveFollowUps,
    lastAcknowledgement: session.lastAcknowledgement,
    lastRemark: session.lastRemark,
    askedQuestions: session.askedQuestions ?? [],
  };

  const interviewerMessage = await withFallback(
    () => generateInterviewerResponseLLM(context),
    () => generateInterviewerResponse(context)
  );

  // 8. Update session state for the next question
  const nextQuestionId = generateId();
  updated.currentQuestionId = nextQuestionId;
  updated.currentQuestion = interviewerMessage;
  updated.currentObjectiveId = nextObjectiveId;
  updated.askedQuestions = [
    ...(session.askedQuestions ?? []),
    interviewerMessage,
  ];
  updated.lastAcknowledgement = strategy.acknowledgementStyle;
  updated.lastRemark = strategy.remarkStyle;
  updated.questionStartedAt = Date.now();
  updated.questionNumber = session.questionNumber + 1;

  if (transitioned) {
    updated.currentTopic = { ...nextTopic, questionsAsked: 1 };
  }

  updated.conversationHistory = [
    ...updated.conversationHistory,
    createMessage("interviewer", interviewerMessage, {
      questionId: nextQuestionId,
      kind: "question",
      objectiveId: nextObjectiveId,
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

export async function skipQuestion(session: InterviewSession): Promise<{
  session: InterviewSession;
  interviewerMessage: string;
  isComplete: boolean;
}> {
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
    conversationHistory: [
      ...session.conversationHistory,
      createMessage("candidate", "[Skipped question]", {
        questionId: session.currentQuestionId,
        kind: "answer",
      }),
    ],
  };

  const coveredIds = [...updated.topicCoverages.map((t) => t.topicId)];
  const nextTopic = selectNextTopic(
    session.curriculum,
    session.candidateProfile,
    coveredIds
  );

  if (!nextTopic) {
    updated.isComplete = true;
    const closing = await withFallback(
      () => generateClosingMessageLLM(session.selectedDifficulty),
      () => generateClosingMessage()
    );
    updated.conversationHistory = [
      ...updated.conversationHistory,
      createMessage("interviewer", closing, { kind: "system" }),
    ];
    return { session: updated, interviewerMessage: closing, isComplete: true };
  }

  const nextTopicData = getTopicById(session.curriculum, nextTopic.topicId);
  const nextObjective = nextTopicData?.topic.learningObjectives[0];
  const nextObjectiveId = nextObjective?.id ?? "";

  const strategy: InterviewStrategy = {
    action: "TRANSITION",
    difficultyAdjustment: 0,
    acknowledgementStyle:
      session.selectedDifficulty === "easy" ? "warm" : session.selectedDifficulty === "hard" ? "analytical" : "professional",
    remarkStyle:
      session.selectedDifficulty === "easy" ? "encouraging" : "neutral",
    maxFollowUps: 2,
    shouldVerifyUnderstanding: false,
  };

  const context = {
    strategy,
    analysis: {
      responseType: "CORRECT" as const,
      confidence: 0.5,
      reasoning: "Question skipped by the candidate.",
      misconceptions: [],
      strengths: [],
      missingConcepts: [],
      suggestedStrategy: "MOVE_FORWARD" as const,
      depthCheckRequired: false,
    },
    candidateAnswer: "[Skipped question]",
    currentTopic:
      nextTopicData?.topic ?? {
        id: nextTopic.topicId,
        day: nextTopic.day,
        title: nextTopic.topicTitle,
        learningObjectives: [],
      },
    nextTopicTitle: nextTopic.topicTitle,
    nextTopicDay: nextTopic.day,
    profile: session.candidateProfile,
    curriculum: session.curriculum,
    selectedStyle: session.selectedDifficulty,
    difficulty: updated.difficulty,
    questionNumber: session.questionNumber + 1,
    totalQuestions: session.totalQuestions,
    conversationHistory: updated.conversationHistory,
    consecutiveFollowUps: 0,
    lastAcknowledgement: session.lastAcknowledgement,
    lastRemark: session.lastRemark,
    askedQuestions: session.askedQuestions ?? [],
  };

  const interviewerMessage = await withFallback(
    () => generateInterviewerResponseLLM(context),
    () => generateInterviewerResponse(context)
  );

  const questionId = generateId();
  updated.currentTopic = { ...nextTopic, questionsAsked: 1 };
  updated.questionNumber = session.questionNumber + 1;
  updated.currentQuestionId = questionId;
  updated.currentQuestion = interviewerMessage;
  updated.currentObjectiveId = nextObjectiveId;
  updated.askedObjectiveIds = [
    ...new Set([...session.askedObjectiveIds, nextObjectiveId]),
  ];
  updated.askedQuestions = [...(session.askedQuestions ?? []), interviewerMessage];
  updated.questionStartedAt = Date.now();
  updated.consecutiveFollowUps = 0;
  updated.lastAcknowledgement = undefined;
  updated.lastRemark = undefined;
  updated.conversationHistory = [
    ...updated.conversationHistory,
    createMessage("interviewer", interviewerMessage, {
      questionId,
      kind: "question",
      objectiveId: nextObjectiveId,
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
    day: tc.dayTitle && tc.dayTitle !== tc.topicTitle ? tc.dayTitle : `Day ${tc.day}`,
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
    learningAgility: session.learningAgility,
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
