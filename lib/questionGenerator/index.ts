import type {
  CandidateProfile,
  CurriculumDay,
  DifficultyLevel,
  EvaluationResult,
  ChatMessage,
  Curriculum,
} from "@/types";
import { getTopicById } from "@/lib/interview/topicSelector";

interface QuestionContext {
  topicId: string;
  curriculum: Curriculum;
  profile: CandidateProfile;
  difficulty: DifficultyLevel;
  conversationHistory: ChatMessage[];
  lastEvaluation?: EvaluationResult;
  questionNumber: number;
  uncoveredObjectives: string[];
  isFollowUp: boolean;
}

const SCENARIO_TEMPLATES: Record<
  DifficultyLevel,
  (topic: string, objective: string, tools?: string[], role?: string) => string
> = {
  1: (topic, objective) =>
    `Let's start with something foundational. In the context of **${topic}**, can you explain how you would ${objective.toLowerCase()}? Keep it practical — imagine you're explaining to a teammate.`,
  2: (topic, objective, tools) =>
    `You're working on a project involving **${topic}**${tools?.length ? ` using ${tools.slice(0, 3).join(", ")}` : ""}. Walk me through how you would ${objective.toLowerCase()} and why it matters.`,
  3: (topic, objective, tools, role) =>
    `Imagine you're ${role ? `a ${role} building` : "building"} a production feature around **${topic}**${tools?.length ? ` with ${tools.slice(0, 2).join(" and ")}` : ""}. ${objective.charAt(0).toUpperCase() + objective.slice(1)} — how would you approach this?`,
  4: (topic, objective) =>
    `You're architecting a system where **${topic}** is a critical component. ${objective.charAt(0).toUpperCase() + objective.slice(1)} — consider trade-offs, failure modes, and how you'd justify your design decisions.`,
  5: (topic, objective, tools) =>
    `Senior design review: your team proposes **${topic}**${tools?.length ? ` (${tools.slice(0, 3).join(", ")})` : ""} for a high-scale production healthcare chatbot. ${objective.charAt(0).toUpperCase() + objective.slice(1)} — challenge assumptions and explain when you'd choose a different approach.`,
};

const FOLLOW_UP_TEMPLATES = {
  correct: [
    "Good answer. Let's go deeper — ",
    "That's solid. Building on that, ",
    "Nice reasoning. Now consider this: ",
  ],
  partial: [
    "You're on the right track, but I'd like you to clarify — ",
    "Partially there. Can you expand on how you would ",
    "Interesting perspective. What about ",
  ],
  incorrect: [
    "Let me probe that a bit — ",
    "I'd like to understand your thinking better. ",
    "Consider this scenario: ",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getObjectiveToAsk(
  topic: CurriculumDay & { id: string },
  uncoveredObjectives: string[]
): { id: string; description: string } {
  const uncovered = topic.learningObjectives.filter((o) =>
    uncoveredObjectives.includes(o.id)
  );
  if (uncovered.length > 0) {
    return uncovered[0];
  }
  return topic.learningObjectives[
    Math.floor(Math.random() * topic.learningObjectives.length)
  ];
}

function generateFollowUpQuestion(
  ctx: QuestionContext,
  topicData: NonNullable<ReturnType<typeof getTopicById>>
): string {
  const { topic } = topicData;
  const eval_ = ctx.lastEvaluation!;

  if (eval_.misconception) {
    const prefix = pickRandom(FOLLOW_UP_TEMPLATES.incorrect);
    return `${prefix}${eval_.misconception}`;
  }

  if (eval_.isCorrect && !eval_.isPartial) {
    const prefix = pickRandom(FOLLOW_UP_TEMPLATES.correct);
    const deeperObjective =
      topic.learningObjectives.find(
        (o) =>
          !ctx.uncoveredObjectives.includes(o.id) &&
          o.id !== eval_.objectivesAssessed[0]
      ) ?? topic.learningObjectives[topic.learningObjectives.length - 1];

    return `${prefix}how would you handle edge cases or scaling concerns for **${topic.title}**? Specifically: ${deeperObjective.description.toLowerCase()}`;
  }

  if (eval_.isPartial) {
    const prefix = pickRandom(FOLLOW_UP_TEMPLATES.partial);
    const objective = getObjectiveToAsk(topic, ctx.uncoveredObjectives);
    return `${prefix}${objective.description.toLowerCase()} in the context of **${topic.title}**?`;
  }

  const prefix = pickRandom(FOLLOW_UP_TEMPLATES.incorrect);
  const objective = getObjectiveToAsk(topic, ctx.uncoveredObjectives);
  return `${prefix}when working with **${topic.title}**, what role does this play: ${objective.description.toLowerCase()}?`;
}

export function generateQuestion(ctx: QuestionContext): {
  question: string;
  objectiveId: string;
} {
  const topicData = getTopicById(ctx.curriculum, ctx.topicId);
  if (!topicData) {
    return {
      question: "Tell me about your experience with the topics covered in this curriculum.",
      objectiveId: "general",
    };
  }

  const { topic } = topicData;
  const role = ctx.profile.jobRole;

  if (ctx.isFollowUp && ctx.lastEvaluation) {
    return {
      question: generateFollowUpQuestion(ctx, topicData),
      objectiveId:
        ctx.lastEvaluation.objectivesAssessed[0] ??
        topic.learningObjectives[0]?.id ??
        "general",
    };
  }

  const completed = ctx.profile.completedMissions.find(
    (m) => m.topicId === ctx.topicId
  );
  if (completed && completed.score >= 85 && ctx.questionNumber <= 2) {
    return {
      question: `I see you've completed **Day ${topic.day}: ${topic.title}** with a strong result. Can you briefly walk me through the key concepts and demonstrate your understanding with a concrete example?`,
      objectiveId: topic.learningObjectives[0]?.id ?? "general",
    };
  }

  const skipped = ctx.profile.skippedTopics.find(
    (s) => s.topicId === ctx.topicId
  );
  if (skipped) {
    const objective = getObjectiveToAsk(topic, ctx.uncoveredObjectives);
    return {
      question: `I notice **Day ${topic.day}: ${topic.title}** wasn't completed in your learning path. Let's explore this: ${objective.description.toLowerCase()} — what's your current understanding, and where would you start?`,
      objectiveId: objective.id,
    };
  }

  const highAttempts = ctx.profile.attempts.find(
    (a) => a.topicId === ctx.topicId && a.attempts >= 3
  );
  if (highAttempts) {
    const objective = getObjectiveToAsk(topic, ctx.uncoveredObjectives);
    return {
      question: `You worked through **${topic.title}** over several attempts. I want to make sure the concepts are solid: ${objective.description.toLowerCase()} — explain your approach and any challenges you faced.`,
      objectiveId: objective.id,
    };
  }

  const objective = getObjectiveToAsk(topic, ctx.uncoveredObjectives);
  const template = SCENARIO_TEMPLATES[ctx.difficulty];
  const question = template(
    topic.title,
    objective.description,
    topic.tools,
    role
  );

  return { question, objectiveId: objective.id };
}

export function generateOpeningMessage(
  profile: CandidateProfile,
  topicTitle: string,
  dayTitle: string,
  dayNumber: number
): string {
  const name = profile.name ?? `Candidate #${profile.candidateId}`;
  const roleLine = profile.jobRole
    ? ` Given your background as a **${profile.jobRole}**, I'll tailor questions accordingly.`
    : "";

  return `Welcome, ${name}. I'll be conducting your technical interview today.${roleLine}

We'll cover topics from your **31-day AI cohort curriculum**, starting with **Day ${dayNumber} — ${dayTitle}**.

Take your time with your answers. I'm interested in how you think, not just what you know. Let's begin.`;
}

export function generateTransitionMessage(
  fromTopic: string,
  toTopic: string,
  dayNumber: number
): string {
  return `Thanks for working through **${fromTopic}**. Let's move on to **Day ${dayNumber} — ${toTopic}**.`;
}

export function generateClosingMessage(): string {
  return "That wraps up our interview. Thank you for your thoughtful responses. I'll now compile your evaluation report.";
}
