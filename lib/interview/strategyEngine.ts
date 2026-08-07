import type { CandidateResponseAnalysis } from "./responseAnalyzer";
import type { InterviewStyle, DifficultyLevel } from "@/types";

export interface InterviewStrategy {
  action: "FOLLOW_UP" | "TEACH_AND_VERIFY" | "CORRECT_AND_FOLLOW_UP" | "SIMPLIFY_AND_REASK" | "CLARIFY" | "TRANSITION" | "END";
  teachingContent?: string;
  followUpFocus?: string;
  difficultyAdjustment: number;
  acknowledgementStyle: "warm" | "professional" | "analytical";
  remarkStyle: "encouraging" | "neutral" | "observational";
  maxFollowUps: number;
  shouldVerifyUnderstanding: boolean;
}

export interface StrategyContext {
  analysis: CandidateResponseAnalysis;
  consecutiveFollowUps: number;
  currentDifficulty: DifficultyLevel;
  selectedStyle: InterviewStyle;
  questionNumber: number;
  totalQuestions: number;
  coveredTopics: number;
  previousAnalyses: CandidateResponseAnalysis[];
  objectiveDescription?: string;
  missingConceptHints?: string[];
}

const STRATEGY_TEMPLATES: Record<InterviewStyle, Partial<InterviewStrategy>> = {
  easy: {
    acknowledgementStyle: "warm",
    remarkStyle: "encouraging",
    maxFollowUps: 3,
  },
  medium: {
    acknowledgementStyle: "professional",
    remarkStyle: "neutral",
    maxFollowUps: 2,
  },
  hard: {
    acknowledgementStyle: "analytical",
    remarkStyle: "observational",
    maxFollowUps: 2,
  },
};

function getDifficultyAdjustment(analysis: CandidateResponseAnalysis, currentDifficulty: DifficultyLevel): number {
  switch (analysis.responseType) {
    case "CORRECT":
      return currentDifficulty < 5 ? 1 : 0;
    case "MEMORIZED":
      return 0;
    case "PARTIALLY_CORRECT":
      return 0;
    case "INCORRECT":
      return currentDifficulty > 1 ? -1 : 0;
    case "DOES_NOT_KNOW":
      return currentDifficulty > 1 ? -1 : 0;
    case "UNCERTAIN":
      return 0;
    case "LOW_EFFORT":
      return 0;
    default:
      return 0;
  }
}

function shouldTransition(analysis: CandidateResponseAnalysis, context: StrategyContext): boolean {
  if (context.consecutiveFollowUps >= (STRATEGY_TEMPLATES[context.selectedStyle].maxFollowUps ?? 2)) {
    return true;
  }
  if (analysis.responseType === "CORRECT" && !analysis.depthCheckRequired && context.consecutiveFollowUps >= 1) {
    return true;
  }
  if (analysis.responseType === "MEMORIZED" && context.consecutiveFollowUps >= 1) {
    return true;
  }
  if (analysis.suggestedStrategy === "MOVE_FORWARD") {
    return true;
  }
  return false;
}

export function determineInterviewStrategy(context: StrategyContext): InterviewStrategy {
  const { analysis, consecutiveFollowUps, currentDifficulty, selectedStyle, questionNumber, totalQuestions, objectiveDescription } = context;
  const styleTemplate = STRATEGY_TEMPLATES[selectedStyle];

  const difficultyAdjustment = getDifficultyAdjustment(analysis, currentDifficulty);
  const nextDifficulty = Math.max(1, Math.min(5, currentDifficulty + difficultyAdjustment));

  const shouldTrans = shouldTransition(analysis, context);
  const isNearEnd = questionNumber >= totalQuestions - 1;

  let action: InterviewStrategy["action"];
  let teachingContent: string | undefined;
  let followUpFocus: string | undefined;
  let shouldVerifyUnderstanding = false;

  const describeConcept = () =>
    objectiveDescription?.toLowerCase() ?? analysis.missingConcepts.slice(0, 2).join(" and ") ?? "the core concept";

  switch (analysis.responseType) {
    case "CORRECT":
      if (shouldTrans || isNearEnd) {
        action = "TRANSITION";
      } else if (analysis.depthCheckRequired) {
        action = "FOLLOW_UP";
        followUpFocus = "implementation_verification";
        shouldVerifyUnderstanding = true;
      } else {
        action = "FOLLOW_UP";
        followUpFocus = "deeper_exploration";
      }
      break;

    case "MEMORIZED":
      action = "FOLLOW_UP";
      followUpFocus = "implementation_verification";
      shouldVerifyUnderstanding = true;
      break;

    case "PARTIALLY_CORRECT":
      if (analysis.misconceptions.length > 0) {
        action = "CORRECT_AND_FOLLOW_UP";
        teachingContent = `That's a common misunderstanding. ${analysis.misconceptions[0]}. The key concept is ${describeConcept()}.`;
      } else {
        action = "SIMPLIFY_AND_REASK";
        followUpFocus = analysis.missingConcepts[0] ?? "the missing concept";
      }
      break;

    case "INCORRECT":
      if (analysis.misconceptions.length > 0) {
        action = "CORRECT_AND_FOLLOW_UP";
        teachingContent = `That's a common misconception. ${analysis.misconceptions[0]}. Let me clarify: the idea here is ${describeConcept()}.`;
      } else {
        action = selectedStyle === "easy" ? "TEACH_AND_VERIFY" : "CORRECT_AND_FOLLOW_UP";
        if (action === "TEACH_AND_VERIFY") {
          teachingContent = `Let me explain the core idea: ${describeConcept()}.`;
          shouldVerifyUnderstanding = true;
        } else {
          teachingContent = `That's not quite right. The key concept is ${describeConcept()}.`;
        }
      }
      break;

    case "DOES_NOT_KNOW":
      action = selectedStyle === "easy" ? "TEACH_AND_VERIFY" : "SIMPLIFY_AND_REASK";
      if (action === "TEACH_AND_VERIFY") {
        teachingContent = `No problem, this is a common learning area. Here's the essential idea: ${describeConcept()}.`;
        shouldVerifyUnderstanding = true;
      } else {
        followUpFocus = "foundational_understanding";
      }
      break;

    case "DID_NOT_UNDERSTAND":
      action = "SIMPLIFY_AND_REASK";
      followUpFocus = "rephrased_question";
      break;

    case "UNCERTAIN":
      action = "CLARIFY";
      followUpFocus = "reasoning_process";
      break;

    case "LOW_EFFORT":
      action = "CLARIFY";
      followUpFocus = "elaboration";
      break;

    default:
      action = "FOLLOW_UP";
  }

  if (isNearEnd) {
    action = "TRANSITION";
  }

  // Force transition when follow-up budget on this topic is exhausted,
  // regardless of response type (prevents endless re-asking on one topic).
  if (shouldTrans && action !== "TRANSITION") {
    action = "TRANSITION";
    teachingContent = undefined;
    followUpFocus = undefined;
  }

  return {
    action,
    teachingContent,
    followUpFocus,
    difficultyAdjustment: nextDifficulty - currentDifficulty,
    acknowledgementStyle: styleTemplate.acknowledgementStyle ?? "professional",
    remarkStyle: styleTemplate.remarkStyle ?? "neutral",
    maxFollowUps: styleTemplate.maxFollowUps ?? 2,
    shouldVerifyUnderstanding,
  };
}

export function getAcknowledgement(style: InterviewStrategy["acknowledgementStyle"], analysis: CandidateResponseAnalysis, usedAcknowledgements: string[]): string {
  const pools: Record<InterviewStrategy["acknowledgementStyle"], string[]> = {
    warm: [
      "Thanks for sharing that.",
      "I appreciate your honesty.",
      "That's a great starting point.",
      "Good effort.",
      "Thanks for explaining.",
      "I like that you gave it a try.",
    ],
    professional: [
      "Thanks for explaining that.",
      "That makes sense.",
      "Interesting approach.",
      "I see.",
      "Understood.",
      "Got it.",
    ],
    analytical: [
      "Interesting.",
      "I noticed that.",
      "Noted.",
      "That's a perspective.",
      "Understood.",
    ],
  };

  const pool = pools[style];
  const available = pool.filter((a) => !usedAcknowledgements.includes(a));
  const selected = available.length > 0 ? available[0] : pool[0];

  if (analysis.responseType === "DOES_NOT_KNOW" && style === "warm") {
    return "No problem at all.";
  }
  if (analysis.responseType === "DOES_NOT_KNOW" && style === "professional") {
    return "Thanks for being direct.";
  }
  if (analysis.responseType === "LOW_EFFORT") {
    return "Thanks for the response.";
  }

  return selected;
}

export function getRemark(style: InterviewStrategy["remarkStyle"], analysis: CandidateResponseAnalysis): string {
  const pools: Record<InterviewStrategy["remarkStyle"], string[]> = {
    encouraging: [
      "You're on the right track.",
      "That's a good foundation.",
      "I like how you're thinking about this.",
      "Nice start.",
      "Good instinct.",
    ],
    neutral: [
      "That's a practical approach.",
      "I see the direction you're going.",
      "That's one way to think about it.",
      "Interesting angle.",
    ],
    observational: [
      "I noticed you focused on X.",
      "That's a specific implementation detail.",
      "You highlighted an important consideration.",
    ],
  };

  const pool = pools[style];

  if (analysis.responseType === "CORRECT" || analysis.responseType === "MEMORIZED") {
    return style === "encouraging"
      ? "You explained the core concept well."
      : style === "neutral"
      ? "That's a solid understanding of the concept."
      : "The key principles are there.";
  }

  if (analysis.responseType === "PARTIALLY_CORRECT") {
    return style === "encouraging"
      ? "You've got part of it right."
      : "You've covered some important aspects.";
  }

  if (analysis.responseType === "INCORRECT" && analysis.misconceptions.length > 0) {
    return "That's a common misunderstanding.";
  }

  if (analysis.responseType === "DOES_NOT_KNOW") {
    return style === "encouraging"
      ? "This is a topic many people find challenging at first."
      : "This is a common learning area.";
  }

  if (analysis.responseType === "LOW_EFFORT") {
    return "I'm more interested in your reasoning than a perfect answer.";
  }

  return pool[0];
}