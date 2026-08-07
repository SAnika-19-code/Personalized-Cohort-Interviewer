import type {
  EvaluationResult,
  CandidateProfile,
  Curriculum,
  ChatMessage,
} from "@/types";

const ACKNOWLEDGEMENTS = [
  "Thanks for explaining that.",
  "That makes sense.",
  "Interesting approach.",
  "I see.",
  "Thanks for sharing.",
  "Got it.",
  "Fair point.",
  "That's helpful.",
  "Understood.",
  "Good to know.",
  "Appreciate the detail.",
  "That's clear.",
  "Noted.",
  "Thanks for walking me through that.",
  "Makes sense.",
];

const REMARKS = [
  "That's a practical solution.",
  "I like that you considered the trade-offs.",
  "That's a common approach.",
  "Interesting implementation.",
  "That's a reasonable design choice.",
  "Good observation.",
  "That's an important consideration.",
  "You've highlighted an important point.",
  "That's a solid foundation.",
  "Good to see you thought about that.",
  "That's a relevant point.",
  "I appreciate the concrete example.",
  "That shows good understanding.",
  "That's a useful perspective.",
  "Good context.",
];

const TRANSITIONS = [
  "Great, I'd like to switch gears a little.",
  "Let's move to another topic.",
  "That gives me a good picture of your approach.",
  "Thanks for walking me through that.",
  "Let's explore a different area.",
  "I'd like to shift to something else.",
  "Moving on to the next topic.",
  "That covers it well. Let's continue.",
];

function pickRandom<T>(arr: T[], exclude?: T): T {
  const filtered = exclude ? arr.filter((a) => a !== exclude) : arr;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function extractKeywords(text: string): string[] {
  const technicalTerms = [
    "redis",
    "cache",
    "database",
    "api",
    "jwt",
    "authentication",
    "authorization",
    "microservice",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "react",
    "node",
    "python",
    "typescript",
    "sql",
    "nosql",
    "mongodb",
    "postgresql",
    "graphql",
    "rest",
    "websocket",
    "message queue",
    "kafka",
    "rabbitmq",
    "load balancer",
    "cdn",
    "ci/cd",
    "pipeline",
    "testing",
    "unit test",
    "integration test",
    "deployment",
    "monitoring",
    "logging",
    "observability",
    "scalability",
    "performance",
    "latency",
    "throughput",
    "concurrency",
    "race condition",
    "deadlock",
    "memory leak",
    "garbage collection",
    "async",
    "await",
    "promise",
    "event loop",
    "thread",
    "process",
    "container",
    "orchestration",
    "service mesh",
    "api gateway",
    "rate limiting",
    "circuit breaker",
    "retry",
    "timeout",
    "idempotency",
    "consistency",
    "availability",
    "partition tolerance",
    "cap theorem",
    "distributed system",
    "event sourcing",
    "cqrs",
    "domain driven design",
    "clean architecture",
    "hexagonal architecture",
    "design pattern",
    "singleton",
    "factory",
    "observer",
    "strategy",
    "decorator",
    "adapter",
    "facade",
    "proxy",
    "dependency injection",
    "inversion of control",
    "solid principles",
    "dry",
    "kiss",
    "yagni",
  ];

  const lowerText = text.toLowerCase();
  return technicalTerms.filter((term) => lowerText.includes(term.toLowerCase()));
}

function shouldAskFollowUp(
  evaluation: EvaluationResult,
  candidateAnswer: string,
  consecutiveFollowUps: number
): boolean {
  if (consecutiveFollowUps >= 2) return false;

  const keywords = extractKeywords(candidateAnswer);
  const hasTechnicalDetail = keywords.length > 0;
  const hasImplementationDetail = /implement|design|architect|build|create|develop|write|code|config|setup|deploy|debug|optimize|refactor/i.test(
    candidateAnswer
  );
  const hasTradeoff = /trade.?off|pros and cons|advantage|disadvantage|benefit|drawback|limit|cost|performance|scalab|security|maintain/i.test(
    candidateAnswer
  );
  const hasAssumption = /assum|expect|believe|think|guess|suppose|estimate|approximate/i.test(
    candidateAnswer
  );
  const isIncomplete = evaluation.isPartial || candidateAnswer.split(/\s+/).length < 30;

  return (
    !!evaluation.misconception ||
    (!evaluation.isCorrect && !evaluation.isPartial) ||
    hasTechnicalDetail ||
    hasImplementationDetail ||
    hasTradeoff ||
    hasAssumption ||
    isIncomplete
  );
}

export interface ConversationalResponse {
  acknowledgement: string;
  remark: string;
  question: string;
  isFollowUp: boolean;
  shouldSwitchTopic: boolean;
}

export function generateConversationalResponse(
  candidateAnswer: string,
  evaluation: EvaluationResult,
  currentTopicTitle: string,
  nextTopicTitle?: string,
  consecutiveFollowUps: number = 0,
  lastAcknowledgement?: string,
  lastRemark?: string
): ConversationalResponse {
  const acknowledgement = pickRandom(ACKNOWLEDGEMENTS, lastAcknowledgement);
  const remark = pickRandom(REMARKS, lastRemark);

  const askFollowUp = shouldAskFollowUp(
    evaluation,
    candidateAnswer,
    consecutiveFollowUps
  );

  let question: string;
  let isFollowUp: boolean;
  let shouldSwitchTopic: boolean;

  if (nextTopicTitle && (evaluation.isCorrect && !evaluation.isPartial)) {
    shouldSwitchTopic = true;
    isFollowUp = false;
    const transition = pickRandom(TRANSITIONS);
    question = `${transition} Let's talk about ${nextTopicTitle}.`;
  } else if (askFollowUp) {
    shouldSwitchTopic = false;
    isFollowUp = true;
    question = generateContextualFollowUp(
      candidateAnswer,
      evaluation,
      currentTopicTitle
    );
  } else {
    shouldSwitchTopic = true;
    isFollowUp = false;
    const transition = pickRandom(TRANSITIONS);
    question = `${transition} Let's talk about ${nextTopicTitle || "the next topic"}.`;
  }

  return {
    acknowledgement,
    remark,
    question,
    isFollowUp,
    shouldSwitchTopic,
  };
}

function generateContextualFollowUp(
  candidateAnswer: string,
  evaluation: EvaluationResult,
  topicTitle: string
): string {
  const keywords = extractKeywords(candidateAnswer);
  const lowerAnswer = candidateAnswer.toLowerCase();

  if (evaluation.misconception) {
    return `Let me probe that — ${evaluation.misconception}`;
  }

  if (keywords.includes("redis") || keywords.includes("cache")) {
    return "How did you decide what to cache versus fetch directly from the database?";
  }
  if (keywords.includes("jwt") || keywords.includes("authentication")) {
    return "How did you handle token expiration and refresh?";
  }
  if (keywords.includes("database") || keywords.includes("sql")) {
    return "What trade-offs did you consider for query performance vs. consistency?";
  }
  if (keywords.includes("microservice")) {
    return "How did you handle communication between services — sync or async?";
  }
  if (keywords.includes("docker") || keywords.includes("kubernetes")) {
    return "What challenges did you face with container orchestration in production?";
  }
  if (keywords.includes("api") && (keywords.includes("rest") || keywords.includes("graphql"))) {
    return "How did you version your API and handle backward compatibility?";
  }
  if (keywords.includes("testing") || keywords.includes("test")) {
    return "What was your strategy for integration vs. unit testing?";
  }
  if (keywords.includes("deploy") || keywords.includes("ci/cd") || keywords.includes("pipeline")) {
    return "How did you handle rollbacks if a deployment failed?";
  }
  if (keywords.includes("monitoring") || keywords.includes("logging") || keywords.includes("observability")) {
    return "What metrics or alerts did you find most valuable for detecting issues?";
  }
  if (keywords.includes("scalab") || keywords.includes("performance")) {
    return "What bottlenecks did you encounter, and how did you address them?";
  }
  if (keywords.includes("security") || keywords.includes("auth") || keywords.includes("authorization")) {
    return "How did you protect against common vulnerabilities like injection or XSS?";
  }
  if (lowerAnswer.includes("implement") || lowerAnswer.includes("design") || lowerAnswer.includes("architect")) {
    return "What alternatives did you consider, and why did you choose this approach?";
  }
  if (lowerAnswer.includes("debug") || lowerAnswer.includes("issue") || lowerAnswer.includes("bug") || lowerAnswer.includes("problem")) {
    return "Walk me through how you diagnosed and resolved that.";
  }
  if (lowerAnswer.includes("trade") || lowerAnswer.includes("pros") || lowerAnswer.includes("cons")) {
    return "If you had to do it again with different constraints, what would change?";
  }

  const followUpTemplates = [
    `You mentioned ${topicTitle.toLowerCase()} — can you elaborate on the implementation details?`,
    `Building on that, how would you handle edge cases or scaling concerns for ${topicTitle.toLowerCase()}?`,
    `That's a good start. What would you do differently if the requirements changed significantly?`,
    `Interesting. How did you validate that your approach worked correctly?`,
    `Good context. What was the most challenging part of that implementation?`,
  ];

  return pickRandom(followUpTemplates);
}

export function formatConversationalResponse(response: ConversationalResponse): string {
  return `${response.acknowledgement}\n\n${response.remark}\n\n${response.question}`;
}