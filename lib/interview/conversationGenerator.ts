import type { InterviewStrategy } from "./strategyEngine";
import type { CandidateResponseAnalysis } from "./responseAnalyzer";
import type { CandidateProfile, Curriculum, CurriculumDay, DifficultyLevel, InterviewStyle, ChatMessage, EvaluationResult } from "@/types";
import { getTopicById } from "@/lib/interview/topicSelector";
import { LLMProvider, createLLMProvider } from "@/lib/llm/provider";

interface ConversationContext {
  strategy: InterviewStrategy;
  analysis: CandidateResponseAnalysis;
  candidateAnswer: string;
  currentTopic: CurriculumDay & { id: string };
  nextTopicTitle?: string;
  nextTopicDay?: number;
  profile: CandidateProfile;
  curriculum: Curriculum;
  selectedStyle: InterviewStyle;
  difficulty: DifficultyLevel;
  questionNumber: number;
  totalQuestions: number;
  conversationHistory: ChatMessage[];
  consecutiveFollowUps: number;
  lastAcknowledgement?: string;
  lastRemark?: string;
  askedQuestions?: string[];
}

const FOLLOW_UP_TEMPLATES: Record<string, string[]> = {
  deeper_exploration: [
    "Let's go deeper. {question}",
    "Building on that, {question}",
    "Good. Now, {question}",
    "That's a solid foundation. {question}",
  ],
  implementation_verification: [
    "Let's move from theory to practice. {question}",
    "How would you actually implement this? {question}",
    "Walk me through the implementation. {question}",
    "Suppose you're building this in production. {question}",
  ],
  foundational_understanding: [
    "Let me ask a simpler question to check understanding. {question}",
    "To make sure the concept is clear: {question}",
    "Let's verify the basics. {question}",
  ],
  reasoning_process: [
    "Could you walk me through your reasoning? {question}",
    "I'd like to understand your thought process. {question}",
    "Help me follow your logic. {question}",
  ],
  elaboration: [
    "Could you elaborate on that? {question}",
    "I'd like to hear more about your thinking. {question}",
    "Tell me more about how you'd approach this. {question}",
  ],
  missing_concept: [
    "Let's focus on {concept}. {question}",
    "You mentioned {concept} briefly. {question}",
    "The {concept} is key here. {question}",
  ],
  rephrased_question: [
    "Let me rephrase that more simply. {question}",
    "No worries, let me put it differently. {question}",
    "Let me ask that in a clearer way. {question}",
  ],
};

const TRANSITION_TEMPLATES = [
  "That gives me a good picture of your understanding. Let's move to {nextTopic}.",
  "Thanks for walking me through that. Let's switch gears to {nextTopic}.",
  "Good coverage on that topic. Now, {nextTopic}.",
  "Let's explore a different area. {nextTopic}.",
  "Moving on. {nextTopic}.",
];

const CORRECTION_TEMPLATES: Record<string, string[]> = {
  easy: [
    "That's a common misunderstanding. {correction} Now, {question}",
    "Not quite, but close. {correction} Let me ask: {question}",
    "I see where you're coming from. {correction} Here's a follow-up: {question}",
  ],
  medium: [
    "That's a common misconception. {correction} {question}",
    "Not exactly. {correction} Let's follow up: {question}",
    "That's a misunderstanding. {correction} {question}",
  ],
  hard: [
    "That's incorrect. {correction} {question}",
    "Misconception. {correction} {question}",
    "Not right. {correction} {question}",
  ],
};

function pickRandom<T>(arr: T[], exclude?: T): T {
  const filtered = exclude ? arr.filter((a) => a !== exclude) : arr;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

const ALL_TEMPLATE_PREFIXES: string[] = Array.from(
  new Set([
    ...Object.values(FOLLOW_UP_TEMPLATES).flat(),
    ...TRANSITION_TEMPLATES,
    ...Object.values(CORRECTION_TEMPLATES).flat(),
  ])
)
  .map((t) => t.replace(/\{[^}]*\}/g, "").trim())
  .filter((p) => p.length > 0)
  .sort((a, b) => b.length - a.length);

function stripTemplatePrefix(text: string): string {
  for (const prefix of ALL_TEMPLATE_PREFIXES) {
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length).trim();
    }
  }
  return text;
}

function normalizeQuestion(text: string): string {
  const stripped = stripTemplatePrefix(text);
  return stripped.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildFollowUpQuestion(context: ConversationContext, focus: string): string {
  const { currentTopic, candidateAnswer, analysis, difficulty, profile } = context;
  const topicTitle = currentTopic.title;
  const keywords = analysis.missingConcepts.length > 0 ? analysis.missingConcepts : currentTopic.learningObjectives[0]?.keywords ?? [];

  const templates = FOLLOW_UP_TEMPLATES[focus] ?? FOLLOW_UP_TEMPLATES.deeper_exploration;
  const template = pickRandom(templates);

  let question: string;

  if (focus === "implementation_verification") {
    question = `Suppose you're building a production system using ${topicTitle}. Walk me through the complete pipeline from data ingestion to serving, including how you'd handle failures and scale.`;
  } else if (focus === "deeper_exploration") {
    const keyword = pickRandom(keywords) ?? "the core concept";
    question = `You mentioned ${keyword}. How would you handle edge cases or scaling concerns for this in a production environment?`;
  } else if (focus === "foundational_understanding") {
    const obj = currentTopic.learningObjectives[0];
    question = `In simple terms, how would you explain ${obj?.description.toLowerCase() ?? "this concept"} to a junior developer?`;
  } else if (focus === "reasoning_process" || focus === "elaboration") {
    question = `Walk me through your reasoning step by step. What led you to that conclusion?`;
  } else if (focus === "missing_concept") {
    const concept = analysis.missingConcepts[0] ?? "the key concept";
    question = `Let's focus on ${concept}. How does this fit into the overall picture?`;
  } else if (focus === "rephrased_question") {
    const obj = currentTopic.learningObjectives[0];
    const simpleKeyword = obj?.keywords?.[0] ?? analysis.missingConcepts[0] ?? "this concept";
    const gerund = toGerund(obj?.description ?? "this concept");
    question = `Let me break it down. When we talk about ${gerund}, I want to know: how would you work with ${simpleKeyword} in practice, and what does it do?`;
  } else {
    question = `Can you elaborate on the implementation details for ${topicTitle}?`;
  }

  return template.replace("{question}", question).replace("{concept}", analysis.missingConcepts[0] ?? "the concept");
}

const IMPERATIVE_VERBS = new Set([
  "learn", "understand", "create", "install", "set", "write", "store",
  "compare", "generate", "build", "design", "implement", "explain",
  "describe", "identify", "define", "use", "make", "develop", "deploy",
  "configure", "analyze", "evaluate", "manage", "plan", "test", "debug",
  "refactor", "optimize", "integrate", "migrate", "monitor", "document",
  "review", "update", "handle", "process", "convert", "transform",
  "extract", "load", "fetch", "retrieve", "query", "filter", "sort",
  "join", "aggregate", "index", "search", "match", "rank", "score",
  "embed", "encode", "decode", "tokenize", "chunk", "split", "merge",
  "combine", "map", "reduce", "iterate", "cache", "persist", "serialize",
  "compress", "encrypt", "decrypt", "hash", "verify", "validate",
  "ensure", "check", "run", "start", "stop", "get", "add", "remove",
  "delete", "insert", "select", "find", "show", "display", "render",
  "read", "open", "close", "send", "receive", "clean", "clear", "reset",
  "restart", "walk", "give", "help", "keep", "try", "take", "look",
  "think", "consider", "follow", "apply", "perform", "execute", "call",
  "trigger", "listen", "emit", "publish", "subscribe", "push", "pull",
  "schedule", "queue", "dispatch", "route", "replicate", "shard",
  "backup", "restore", "snapshot", "rollback", "commit", "transact",
  "lock", "unlock", "wait", "cancel", "abort", "resume", "pause", "setup",
  "setup", "set up", "seeding", "troubleshoot", "illustrate", "demonstrate",
]);

function verbToGerund(verb: string): string {
  const lower = verb.toLowerCase();
  if (lower === "setup" || lower === "set up") return "setting up";
  if (/setup$/.test(lower)) return lower.replace(/setup$/, "setting up");
  if (/e$/.test(lower)) return lower.slice(0, -1) + "ing";
  if (lower.length <= 6 && /[^aeiou][aeiou][^aeiouwxy]$/.test(lower)) {
    return lower + lower[lower.length - 1] + "ing";
  }
  return lower + "ing";
}

function toGerund(phrase: string): string {
  const words = phrase.split(" ");
  if (words.length === 0) return phrase;
  if (IMPERATIVE_VERBS.has(words[0].toLowerCase())) {
    words[0] = verbToGerund(words[0]);
  }
  for (let i = 2; i < words.length; i++) {
    if (
      words[i - 1].toLowerCase() === "and" &&
      IMPERATIVE_VERBS.has(words[i].toLowerCase())
    ) {
      words[i] = verbToGerund(words[i]);
    }
  }
  return words.join(" ");
}

function buildTransitionQuestion(context: ConversationContext): string {
  const { nextTopicTitle, nextTopicDay, currentTopic } = context;
  if (!nextTopicTitle || !nextTopicDay) {
    return "Let's wrap up the interview here.";
  }

  const template = pickRandom(TRANSITION_TEMPLATES);
  const transition = template.replace("{nextTopic}", `Day ${nextTopicDay} — ${nextTopicTitle}`);

  const firstObjective = currentTopic.learningObjectives[0];
  const openingQuestion = firstObjective
    ? `To start, can you walk me through ${toGerund(firstObjective.description)}?`
    : `To start, could you give me an overview of ${nextTopicTitle}?`;

  return `${transition}\n\n${openingQuestion}`;
}

function buildCorrectionQuestion(context: ConversationContext): string {
  const { analysis, selectedStyle, currentTopic } = context;
  const teachingContent = context.strategy.teachingContent ?? "";
  const templates = CORRECTION_TEMPLATES[selectedStyle] ?? CORRECTION_TEMPLATES.medium;
  const template = pickRandom(templates);

  let question: string;
  if (analysis.missingConcepts.length > 0) {
    question = `Given that ${analysis.missingConcepts[0]} is the key concept, how would you approach this differently?`;
  } else {
    question = `How does this change your understanding of ${currentTopic.title}?`;
  }

  return template.replace("{correction}", teachingContent).replace("{question}", question);
}

function buildTeachingQuestion(context: ConversationContext): string {
  const { analysis, currentTopic, selectedStyle } = context;
  const obj = currentTopic.learningObjectives[0];
  const gerund = toGerund(obj?.description ?? "this concept");

  if (selectedStyle === "easy") {
    return `Now that I've explained the basics, let me ask something simpler: In your own words, can you walk me through ${gerund}?`;
  }

  return `Let me verify your understanding. Can you walk me through ${gerund}?`;
}

function buildClarificationQuestion(context: ConversationContext): string {
  const { analysis } = context;

  if (analysis.responseType === "LOW_EFFORT") {
    return "Could you explain your reasoning? I'm more interested in how you think than in getting a perfect answer.";
  }

  if (analysis.responseType === "UNCERTAIN") {
    return "I'm not sure I fully follow. Could you walk me through your thought process step by step?";
  }

  return "Could you clarify your thinking on this?";
}

export function generateInterviewerResponse(context: ConversationContext): string {
  const { strategy, analysis, selectedStyle, lastAcknowledgement, lastRemark, askedQuestions = [] } = context;

  const acknowledgement = getAcknowledgement(strategy.acknowledgementStyle, analysis, lastAcknowledgement ? [lastAcknowledgement] : []);
  const remark = getRemark(strategy.remarkStyle, analysis);

  let question: string;

  switch (strategy.action) {
    case "FOLLOW_UP":
      question = buildFollowUpQuestion(context, strategy.followUpFocus ?? "deeper_exploration");
      break;
    case "TRANSITION":
      question = buildTransitionQuestion(context);
      break;
    case "CORRECT_AND_FOLLOW_UP":
      question = buildCorrectionQuestion(context);
      break;
    case "TEACH_AND_VERIFY":
      question = buildTeachingQuestion(context);
      break;
    case "SIMPLIFY_AND_REASK":
      question = buildFollowUpQuestion(context, strategy.followUpFocus ?? "rephrased_question");
      break;
    case "CLARIFY":
      question = buildClarificationQuestion(context);
      break;
    case "END":
      question = "That concludes our interview. Thank you for your time.";
      break;
    default:
      question = "Let's continue.";
  }

  // Deduplicate: never re-ask a question already asked in this interview.
  // Compare the inner question only (strip template prefixes + normalize),
  // so "Let me rephrase X" and "Let me ask X in a clearer way" are detected
  // as the same question.
  const innerQuestion = (text: string) => text.split("\n\n").pop() ?? text;
  const hasBeenAsked = (q: string) => {
    const normQ = normalizeQuestion(innerQuestion(q));
    return askedQuestions.some(
      (prev) => normalizeQuestion(innerQuestion(prev)) === normQ
    );
  };

  if (hasBeenAsked(question)) {
    const retryContext: ConversationContext = {
      ...context,
      strategy: {
        ...strategy,
        action: "FOLLOW_UP",
        followUpFocus: "deeper_exploration",
      },
    };
    question = buildFollowUpQuestion(retryContext, "deeper_exploration");
  }
  if (hasBeenAsked(question)) {
    question = `Let's dig a bit deeper here: can you describe ${context.currentTopic.title} in your own words and give one practical example?`;
  }

  return `${acknowledgement}\n\n${remark}\n\n${question}`;
}

function getAcknowledgement(style: InterviewStrategy["acknowledgementStyle"], analysis: CandidateResponseAnalysis, used: string[]): string {
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
  const available = pool.filter((a) => !used.includes(a));
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

function getRemark(style: InterviewStrategy["remarkStyle"], analysis: CandidateResponseAnalysis): string {
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
      "I noticed you focused on the implementation.",
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

export async function generateInterviewerResponseLLM(context: ConversationContext): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const { strategy, analysis, candidateAnswer, currentTopic, profile, selectedStyle, conversationHistory } = context;

  const personaPrompts: Record<InterviewStyle, string> = {
    easy: `You are a Supportive Mentor. Warm, patient, encouraging. Build confidence. Guide gently.`,
    medium: `You are a Professional Software Engineer. Neutral, curious. Ask "why". Explore trade-offs.`,
    hard: `You are a Principal/Staff Engineer. Calm, analytical, rigorous. Challenge assumptions. Probe architecture. Minimal praise.`,
  };

  const recentHistory = conversationHistory.slice(-6).map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`).join("\n\n");

  const messages = [
    { role: "system" as const, content: `You are an AI Technical Interviewer. ${personaPrompts[selectedStyle]}

RESPONSE FORMAT: Every response MUST contain exactly three parts:
1. Acknowledgement (one short sentence, 5-15 words)
2. Brief Remark (one conversational sentence, never "Good job" or "Correct")
3. Next Question (exactly one question)

CONSTRAINTS:
- 30-80 words total
- Natural, conversational tone
- Never reveal scores or evaluation
- Reference candidate's specific answer
- Maintain persona consistently` },
    { role: "user" as const, content: [
      `CANDIDATE ANSWER: "${candidateAnswer}"`,
      `RESPONSE ANALYSIS: ${analysis.responseType} (confidence: ${analysis.confidence})`,
      `STRATEGY: ${strategy.action}${strategy.followUpFocus ? ` - ${strategy.followUpFocus}` : ""}${strategy.teachingContent ? ` - Teaching: ${strategy.teachingContent}` : ""}`,
      `CURRENT TOPIC: ${currentTopic.title} (Day ${currentTopic.day})`,
      `DIFFICULTY: ${context.difficulty}/5`,
      `QUESTION #: ${context.questionNumber}/${context.totalQuestions}`,
      `RECENT CONVERSATION:\n${recentHistory}`,
      "",
      "Generate the interviewer's response following the three-part format.",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.8, maxTokens: 400 });
  return response.content.trim();
}