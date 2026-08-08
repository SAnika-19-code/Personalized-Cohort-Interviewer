export interface CandidateResponseAnalysis {
  responseType:
    | "CORRECT"
    | "PARTIALLY_CORRECT"
    | "INCORRECT"
    | "DOES_NOT_KNOW"
    | "DID_NOT_UNDERSTAND"
    | "UNCERTAIN"
    | "OFF_TOPIC"
    | "LOW_EFFORT"
    | "MEMORIZED"
    | "CLARIFICATION"
    | "TOPIC_SWITCH"
    | "TOPIC_SKIP"
    | "REFUSAL";

  confidence: number;

  reasoning: string;

  misconceptions: string[];

  strengths: string[];

  missingConcepts: string[];

  suggestedStrategy:
    | "GO_DEEPER"
    | "SIMPLIFY"
    | "CORRECT_AND_REASK"
    | "TEACH_BRIEFLY"
    | "ASK_CLARIFICATION"
    | "MOVE_FORWARD"
    | "VERIFY_UNDERSTANDING"
    | "HANDLE_CLARIFICATION"
    | "HANDLE_TOPIC_SWITCH"
    | "HANDLE_TOPIC_SKIP"
    | "HANDLE_REFUSAL";

  depthCheckRequired: boolean;
}

interface AnalysisContext {
  question: string;
  candidateAnswer: string;
  topicTitle: string;
  objectiveDescription: string;
  keywords: string[];
  difficulty: number;
  conversationHistory: Array<{ role: string; content: string }>;
  selectedStyle: "easy" | "medium" | "hard";
}

const LOW_EFFORT_PATTERNS = [
  /^idk$/i,
  /^i don't know$/i,
  /^don't know$/i,
  /^not sure$/i,
  /^no idea$/i,
  /^never learned this$/i,
  /^haven't studied this$/i,
  /^i'm unsure$/i,
  /^i am not sure$/i,
  /^maybe$/i,
  /^yes$/i,
  /^no$/i,
  /^ok$/i,
  /^okay$/i,
  /^sure$/i,
];

const DOES_NOT_KNOW_PATTERNS = [
  /i don't know/i,
  /don't know/i,
  /not sure/i,
  /no idea/i,
  /never learned/i,
  /haven't studied/i,
  /i'm unsure/i,
  /i am not sure/i,
  /unsure/i,
];

const DID_NOT_UNDERSTAND_PATTERNS = [
  /did not understand/i,
  /didn't understand/i,
  /don't understand/i,
  /do not understand/i,
  /not understand the question/i,
  /confused/i,
  /what do you mean/i,
  /can you rephrase/i,
  /repeat the question/i,
  /could you clarify the question/i,
  /don't get the question/i,
];

const UNCERTAIN_PATTERNS = [
  /i think/i,
  /maybe/i,
  /possibly/i,
  /might be/i,
  /could be/i,
  /not certain/i,
  /guess/i,
  /probably/i,
];

const CLARIFICATION_PATTERNS = [
  /can you rephrase/i,
  /can you clarify/i,
  /i don't understand/i,
  /i don't get it/i,
  /what do you mean/i,
  /could you explain/i,
  /what do you mean/i,
  /unclear/i,
  /confused/i,
  /repeat the question/i,
  /rephrase/i,
  /i don't understand/i,
  /don't understand/i,
];

const TOPIC_SWITCH_PATTERNS = [
  /can we switch topics?/i,
  /can we switch topics?/i,
  /switch topics?/i,
  /switch topic/i,
  /move on to another topic/i,
  /change topics?/i,
  /change topic/i,
  /next topic/i,
  /different topic/i,
  /new topic/i,
  /let's switch/i,
  /let's move on/i,
  /move to another/i,
  /switch to another/i,
];

const TOPIC_SKIP_PATTERNS = [
  /can we skip/i,
  /skip this/i,
  /skip this topic/i,
  /skip this question/i,
  /let's skip/i,
  /let's skip this/i,
  /skip it/i,
  /pass this/i,
  /pass this question/i,
  /next question/i,
  /next one/i,
];

const REFUSAL_PATTERNS = [
  /i refuse/i,
  /i won't answer/i,
  /i won't do this/i,
  /not going to answer/i,
  /refuse to answer/i,
  /i decline/i,
  /decline to answer/i,
  /i pass/i,
  /no comment/i,
  /i won't/i,
];

function detectLowEffort(answer: string): boolean {
  return DOES_NOT_KNOW_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectDoesNotKnow(answer: string): boolean {
  return DOES_NOT_KNOW_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectDidNotUnderstand(answer: string): boolean {
  return DID_NOT_UNDERSTAND_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectUncertain(answer: string): boolean {
  return UNCERTAIN_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectClarification(answer: string): boolean {
  return CLARIFICATION_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectTopicSwitch(answer: string): boolean {
  return TOPIC_SWITCH_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectTopicSkip(answer: string): boolean {
  return TOPIC_SKIP_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectRefusal(answer: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(answer.toLowerCase()));
}

function detectMemorized(answer: string, keywords: string[]): boolean {
  const wordCount = answer.trim().split(/\s+/).length;
  if (wordCount < 30) return false;

  const hasPersonalLanguage = /i (would|think|believe|used|built|implemented|tried|experienced|found|noticed|learned)/i.test(answer);
  const hasExamples = /example|for instance|such as|like when|in my experience|in practice/i.test(answer);
  const hasReasoning = /because|since|therefore|thus|so that|trade.?off|pros? and cons?/i.test(answer);
  const hasCode = /```|`[^`]+`|function|class|def |const |let |import /i.test(answer);
  const keywordDensity = keywords.filter((k) => answer.toLowerCase().includes(k.toLowerCase())).length / Math.max(keywords.length, 1);

  const formalLanguageScore = (answer.match(/\b(utilize|implement|facilitate|leverage|optimize|architecture|framework|methodology|paradigm)\b/gi) ?? []).length;

  return (
    !hasPersonalLanguage &&
    !hasExamples &&
    !hasReasoning &&
    !hasCode &&
    keywordDensity > 0.6 &&
    formalLanguageScore >= 2
  );
}

function countKeywordMatches(answer: string, keywords: string[]): number {
  const lowerAnswer = answer.toLowerCase();
  return keywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase())).length;
}

function assessCompleteness(answer: string, keywords: string[]): number {
  const matches = countKeywordMatches(answer, keywords);
  const ratio = keywords.length > 0 ? matches / keywords.length : 0;
  const lengthScore = Math.min(1, answer.trim().split(/\s+/).length / 80);
  return (ratio * 0.7 + lengthScore * 0.3);
}

function assessAccuracy(answer: string, keywords: string[], misconceptions: string[]): number {
  const matches = countKeywordMatches(answer, keywords);
  const ratio = keywords.length > 0 ? matches / keywords.length : 0;
  const hasMisconception = misconceptions.length > 0;
  let score = ratio * 100;
  if (hasMisconception) score -= 30;
  return Math.max(0, Math.min(100, score));
}

function detectMisconceptions(answer: string, topicTitle: string): string[] {
  const lowerAnswer = answer.toLowerCase();
  const misconceptions: string[] = [];

  const knownMisconceptions: Record<string, string[]> = {
    embedding: [
      "vector databases store llm weights",
      "embeddings are model weights",
      "store documents directly in vector db",
      "embeddings are the same as tokens",
    ],
    rag: [
      "rag stores documents in the model",
      "llm retrieves from vector database",
      "embeddings replace the need for retrieval",
    ],
    cache: [
      "cache everything",
      "redis stores all data permanently",
      "cache invalidation is not needed",
    ],
    authentication: [
      "jwt is encryption",
      "jwt cannot be decoded",
      "store passwords in jwt",
    ],
    database: [
      "nosql is always faster",
      "sql doesn't scale",
      "indexes make everything fast",
    ],
    microservice: [
      "microservices solve all scaling problems",
      "distributed monolith is microservices",
    ],
  };

  for (const [domain, patterns] of Object.entries(knownMisconceptions)) {
    if (topicTitle.toLowerCase().includes(domain) || patterns.some((p) => lowerAnswer.includes(p))) {
      for (const pattern of patterns) {
        if (lowerAnswer.includes(pattern)) {
          misconceptions.push(`Misconception detected: ${pattern}`);
        }
      }
    }
  }

  return misconceptions;
}

export function analyzeCandidateResponse(context: AnalysisContext): CandidateResponseAnalysis {
  const { candidateAnswer, keywords, topicTitle, selectedStyle } = context;

  const trimmedAnswer = candidateAnswer.trim();
  const wordCount = trimmedAnswer.split(/\s+/).length;

  if (detectLowEffort(trimmedAnswer)) {
    return {
      responseType: "LOW_EFFORT",
      confidence: 0.95,
      reasoning: "Candidate provided a very brief, low-effort response.",
      misconceptions: [],
      strengths: [],
      missingConcepts: keywords,
      suggestedStrategy: "ASK_CLARIFICATION",
      depthCheckRequired: false,
    };
  }

  if (detectDidNotUnderstand(trimmedAnswer)) {
    return {
      responseType: "DID_NOT_UNDERSTAND",
      confidence: 0.9,
      reasoning: "Candidate indicated they did not understand the question.",
      misconceptions: [],
      strengths: ["Honesty about confusion"],
      missingConcepts: keywords,
      suggestedStrategy: "ASK_CLARIFICATION",
      depthCheckRequired: false,
    };
  }

  if (detectClarification(trimmedAnswer)) {
    return {
      responseType: "CLARIFICATION",
      confidence: 0.9,
      reasoning: "Candidate requested clarification or rephrasing of the question.",
      misconceptions: [],
      strengths: ["Seeking clarification shows engagement"],
      missingConcepts: keywords,
      suggestedStrategy: "HANDLE_CLARIFICATION",
      depthCheckRequired: false,
    };
  }

  if (detectTopicSwitch(trimmedAnswer)) {
    return {
      responseType: "TOPIC_SWITCH",
      confidence: 0.9,
      reasoning: "Candidate requested to switch to a different topic.",
      misconceptions: [],
      strengths: [],
      missingConcepts: keywords,
      suggestedStrategy: "HANDLE_TOPIC_SWITCH",
      depthCheckRequired: false,
    };
  }

  if (detectTopicSkip(trimmedAnswer)) {
    return {
      responseType: "TOPIC_SKIP",
      confidence: 0.9,
      reasoning: "Candidate requested to skip the current topic.",
      misconceptions: [],
      strengths: [],
      missingConcepts: keywords,
      suggestedStrategy: "HANDLE_TOPIC_SKIP",
      depthCheckRequired: false,
    };
  }

  if (detectRefusal(trimmedAnswer)) {
    return {
      responseType: "REFUSAL",
      confidence: 0.9,
      reasoning: "Candidate refused to answer the question.",
      misconceptions: [],
      strengths: [],
      missingConcepts: keywords,
      suggestedStrategy: "HANDLE_REFUSAL",
      depthCheckRequired: false,
    };
  }

  if (detectDoesNotKnow(trimmedAnswer)) {
    return {
      responseType: "DOES_NOT_KNOW",
      confidence: 0.9,
      reasoning: "Candidate honestly acknowledged not knowing the answer.",
      misconceptions: [],
      strengths: ["Honesty", "Self-awareness"],
      missingConcepts: keywords,
      suggestedStrategy: selectedStyle === "easy" ? "TEACH_BRIEFLY" : "SIMPLIFY",
      depthCheckRequired: false,
    };
  }

  const misconceptions = detectMisconceptions(trimmedAnswer, topicTitle);
  const completeness = assessCompleteness(trimmedAnswer, keywords);
  const accuracy = assessAccuracy(trimmedAnswer, keywords, misconceptions);
  const isMemorized = detectMemorized(trimmedAnswer, keywords);

  const matchedKeywords = keywords.filter((k) => trimmedAnswer.toLowerCase().includes(k.toLowerCase()));
  const missingKeywords = keywords.filter((k) => !trimmedAnswer.toLowerCase().includes(k.toLowerCase()));

  let responseType: CandidateResponseAnalysis["responseType"];
  let suggestedStrategy: CandidateResponseAnalysis["suggestedStrategy"];
  let depthCheckRequired = false;

  if (misconceptions.length > 0) {
    responseType = "INCORRECT";
    suggestedStrategy = selectedStyle === "easy" ? "TEACH_BRIEFLY" : "CORRECT_AND_REASK";
  } else if (accuracy >= 75 && completeness >= 0.7) {
    responseType = isMemorized ? "MEMORIZED" : "CORRECT";
    suggestedStrategy = "GO_DEEPER";
    depthCheckRequired = isMemorized;
  } else if (accuracy >= 50 && completeness >= 0.4) {
    responseType = "PARTIALLY_CORRECT";
    suggestedStrategy = "SIMPLIFY";
  } else if (accuracy >= 30) {
    responseType = "PARTIALLY_CORRECT";
    suggestedStrategy = selectedStyle === "easy" ? "TEACH_BRIEFLY" : "SIMPLIFY";
  } else {
    responseType = "INCORRECT";
    suggestedStrategy = selectedStyle === "easy" ? "TEACH_BRIEFLY" : "CORRECT_AND_REASK";
  }

  const strengths: string[] = [];
  if (matchedKeywords.length > 0) strengths.push(`Mentioned key concepts: ${matchedKeywords.slice(0, 3).join(", ")}`);
  if (wordCount > 50) strengths.push("Provided detailed explanation");
  if (/because|since|therefore|trade.?off/i.test(trimmedAnswer)) strengths.push("Showed reasoning");
  if (/example|for instance|such as/i.test(trimmedAnswer)) strengths.push("Used concrete examples");

  return {
    responseType,
    confidence: Math.min(0.95, 0.5 + completeness * 0.3 + (misconceptions.length === 0 ? 0.2 : -0.2)),
    reasoning: `Accuracy: ${Math.round(accuracy)}%, Completeness: ${Math.round(completeness * 100)}%, Keywords matched: ${matchedKeywords.length}/${keywords.length}`,
    misconceptions,
    strengths,
    missingConcepts: missingKeywords,
    suggestedStrategy,
    depthCheckRequired,
  };
}