import type {
  CurriculumDay,
  EvaluationResult,
  DifficultyLevel,
} from "@/types";
import { assessDepth } from "./depth";
import { generateDomainModelAnswer, formatModelAnswer, findMissingConcepts } from "./modelAnswer";

interface EvaluateParams {
  answer: string;
  topic: CurriculumDay & { id?: string };
  objectiveId: string;
  difficulty: DifficultyLevel;
  responseAnalysis?: import("@/lib/interview/responseAnalyzer").CandidateResponseAnalysis;
}

const normalizeText = (text: string): string =>
  text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  healthcare: ["medical", "clinical", "patient", "hospital", "health"],
  datasets: ["data", "dataset", "records", "tables", "tabular"],
  dataset: ["data", "datasets", "records", "tables"],
  data: ["datasets", "dataset", "records", "tabular", "database"],
  embeddings: ["embedding", "embed", "vector", "vectors"],
  embedding: ["embeddings", "embed", "vector", "vectors"],
  vector: ["vectors", "embedding", "embeddings"],
  vectors: ["vector", "embedding", "embeddings"],
  database: ["databases", "db", "storage", "store"],
  databases: ["database", "db", "storage"],
  applications: ["application", "app", "apps", "use case"],
  application: ["applications", "app", "use case"],
  comparison: ["compare", "comparing", "versus", "vs"],
  local: ["locally", "on-premise", "offline"],
  managed: ["cloud", "hosted", "saas", "service"],
  chroma: ["chromadb"],
  pinecone: ["pinecone"],
  synthetic: ["synthetically", "fake", "mock", "generated", "artificial"],
  privacy: ["confidential", "hipaa", "pii", "anonymized", "de-identified"],
  schema: ["schemas", "structure", "model", "modeling"],
  ingestion: ["ingest", "load", "import", "pipeline"],
  retrieval: ["retrieve", "fetch", "search", "query"],
  chunking: ["chunk", "chunks", "split", "splitting", "segment"],
};

export function keywordMatchesAnswer(keyword: string, answerWords: string[]): boolean {
  const kw = keyword.toLowerCase();

  for (const word of answerWords) {
    if (word.length < 3) continue;

    if (word === kw) return true;

    if (word.includes(kw) || kw.includes(word)) return true;

    const synonyms = DOMAIN_SYNONYMS[kw];
    if (synonyms && synonyms.includes(word)) return true;

    const wordSynonyms = DOMAIN_SYNONYMS[word];
    if (wordSynonyms && wordSynonyms.includes(kw)) return true;
  }

  return false;
}

function countKeywordMatches(text: string, keywords: string[]): number {
  const normalized = normalizeText(text);
  const answerWords = normalized.split(/\s+/).filter((w) => w.length >= 3);
  return keywords.filter((kw) => keywordMatchesAnswer(kw, answerWords)).length;
}

function assessLength(answer: string): number {
  const words = answer.trim().split(/\s+/).length;
  if (words < 10) return 20;
  if (words < 30) return 45;
  if (words < 80) return 70;
  if (words < 150) return 85;
  return 95;
}

function assessCommunication(answer: string): number {
  let score = 50;
  const hasStructure =
    /first|second|finally|additionally|however|because|therefore|for example/i.test(
      answer
    );
  const hasExamples = /example|instance|such as|like when|imagine/i.test(answer);
  const hasCode = /```|`[^`]+`|function|class|def |const |import /i.test(answer);

  if (hasStructure) score += 15;
  if (hasExamples) score += 15;
  if (hasCode) score += 10;
  if (answer.length > 100) score += 10;

  return Math.min(100, score);
}

function assessCodeQuality(answer: string): number {
  const hasCode = /```[\s\S]*?```|`[^`]+`|function|class|def |const |let |import |select /i.test(answer);
  if (!hasCode) return 0;

  let score = 45;
  if (/```(python|py|javascript|js|typescript|ts|json|sql|bash|sh)?/i.test(answer)) score += 15;
  if (/\b(error|try|catch|except|validate|edge|test)\b/i.test(answer)) score += 15;
  if (/\bconst\b|\blet\b|\bdef\b|\bclass\b|\breturn\b|\bselect\b/i.test(answer)) score += 15;
  if (answer.length > 180) score += 10;
  return Math.min(100, score);
}

function detectMisconception(
  answer: string,
  topic: CurriculumDay & { id?: string }
): string | undefined {
  const normalized = normalizeText(answer);
  const misconceptions: Record<string, string> = {
    embedding:
      "Where are documents actually stored in a RAG pipeline, and what role do embeddings play versus the vector store?",
    "just increase":
      "What specific limitations does simply increasing model size fail to address that RAG solves?",
    "always use":
      "Can you think of scenarios where this approach would be the wrong choice?",
    "no need":
      "What risks or edge cases might you be overlooking with that assumption?",
    "simply":
      "Production systems rarely have simple solutions — what complexities would you need to handle?",
  };

  for (const [pattern, followUp] of Object.entries(misconceptions)) {
    if (normalized.includes(pattern)) {
      return followUp;
    }
  }

  if (topic.title.toLowerCase().includes("rag") && normalized.includes("store document")) {
    return "Where are documents actually stored in a RAG pipeline, and what role do embeddings play versus the vector store?";
  }

  return undefined;
}

export function evaluateAnswer(params: EvaluateParams): EvaluationResult {
  const { answer, topic, objectiveId, difficulty, responseAnalysis } = params;
  const objective =
    topic.learningObjectives.find((o) => o.id === objectiveId) ??
    topic.learningObjectives[0];

  const keywords: string[] = (objective?.keywords ?? extractKeywordsFromDescription(objective?.description ?? "")) ?? [];
  const keywordMatches = countKeywordMatches(answer, keywords);
  const keywordRatio = keywords.length > 0 ? keywordMatches / keywords.length : 0.5;

  const lengthScore = assessLength(answer);
  const communication = assessCommunication(answer);
  const codeQuality = assessCodeQuality(answer);

  const responseType = responseAnalysis?.responseType ?? "UNKNOWN";
  const isHonestUnknown = responseType === "DOES_NOT_KNOW" || responseType === "DID_NOT_UNDERSTAND";

  // Control intents that should NOT receive technical evaluation
  const controlIntents = new Set([
    "DOES_NOT_KNOW",
    "DID_NOT_UNDERSTAND",
    "CLARIFICATION",
    "TOPIC_SWITCH",
    "TOPIC_SKIP",
    "REFUSAL",
    "OFF_TOPIC",
    "LOW_EFFORT",
    "UNCERTAIN",
  ]);
  const isControlIntent = controlIntents.has(responseType);

  if (isControlIntent) {
    const effectiveResponseType = responseType ?? "UNKNOWN";
    return handleControlIntent(answer, effectiveResponseType, keywords, responseType, topic);
  }

  const depth = assessDepth(answer, topic);

  const conceptualCoverage = Math.min(
    100,
    Math.round(keywordRatio * 50 + lengthScore * 0.2 + (answer.length > 50 ? 15 : 0))
  );

  const completeness = Math.min(
    100,
    Math.round(keywordRatio * 35 + lengthScore * 0.2 + depth.structuralQuality * 0.25 + (keywordMatches >= 2 ? 15 : 0))
  );

  const depthScore = Math.min(
    100,
    Math.round(
      depth.implementationSpecificity * 0.35 +
        depth.tradeOffAwareness * 0.30 +
        depth.technicalVocabulary * 0.20 +
        keywordRatio * 15
    )
  );

  const factualDepth = Math.min(30, (() => {
    const sentences = answer.split(/[.!?]+/).filter(x => x.trim().length > 8).length;
    const distinctTerms = new Set(answer.toLowerCase().split(/\W+/).filter(w => w.length > 3)).size;
    let d = 0;
    if (sentences >= 3) d += 8;
    if (sentences >= 5) d += 7;
    if (distinctTerms > 30) d += 8;
    if (distinctTerms > 50) d += 7;
    return d;
  })());

  const reasoning = Math.min(
    100,
    Math.round(
      15 +
        (/\bbecause\b|\bsince\b|\btherefore\b|\bthus\b|\bso that\b/i.test(answer) ? 18 : 0) +
        (/\btrade.?off|\bpros?\b|\bcons?\b|\badvantage|\bdisadvantage/i.test(answer) ? 15 : 0) +
        (/\bif\b|\bwhen\b|\bunless\b|\bconsider/i.test(answer) ? 10 : 0) +
        factualDepth +
        depth.tradeOffAwareness * 0.25 +
        depth.implementationSpecificity * 0.15
    )
  );
  const problemSolving = reasoning;

  const confidence = Math.min(
    100,
    Math.round(
      (/\bi think\b|\bmaybe\b|\bnot sure\b|\bi guess\b/i.test(answer) ? -15 : 15) +
        (/\bdefinitely\b|\bclearly\b|\babsolutely\b/i.test(answer) ? 10 : 0) +
        lengthScore * 0.4 +
        35
    )
  );

  const honestyCredit = isHonestUnknown ? 90 : 0;
  const confidenceIncorrect = responseType === "INCORRECT" ? 0.85 : 0.5;
  const learningAgility = Math.min(
    100,
    Math.round(
      (isHonestUnknown ? 65 : responseType === "PARTIALLY_CORRECT" ? 60 : 40) +
        (answer.length > 30 ? 10 : 0) +
        (/\bwould|should|could|let me think|good question|interesting/i.test(answer) ? 10 : 0) +
        (responseType === "INCORRECT" ? Math.round(confidenceIncorrect * 10) : 10)
    )
  );

  const modelAnswer = generateDomainModelAnswer(topic, { id: objectiveId, description: objective?.description ?? "", keywords }, answer);

  const overall = Math.round(
    conceptualCoverage * 0.30 +
      depth.technicalVocabulary * 0.15 +
      problemSolving * 0.15 +
      completeness * 0.15 +
      communication * 0.10 +
      depth.structuralQuality * 0.10 +
      depthScore * 0.05
  );

  const isCorrect = overall >= 55 && conceptualCoverage >= 45;
  const isPartial = !isCorrect && overall >= 35;

  const misconception = !isCorrect ? detectMisconception(answer, topic) : undefined;

  const objectiveDesc = objective?.description.toLowerCase() ?? "the core concept";
  const missingText = responseAnalysis?.missingConcepts.slice(0, 3).join(", ") ?? "the fundamentals";
  const missingConcepts = findMissingConcepts(answer, keywords);
  const missingConceptsText = missingConcepts.length > 0 ? missingConcepts.join(", ") : missingText;

  let feedback: string;
  if (isHonestUnknown) {
    feedback = `Candidate honestly acknowledged not knowing the concept. Strength: did not attempt to fabricate an answer. Gap: needs stronger understanding of ${objectiveDesc}. Recommendation: review the core concepts — ${keywords.slice(0, 4).join(", ")} — through a small hands-on exercise, then retry.`;
  } else if (responseType === "INCORRECT" && responseAnalysis?.misconceptions.length) {
    feedback = `Candidate gave an incorrect explanation with a misconception: ${responseAnalysis.misconceptions[0]}. Gap: needs correction on ${keywords.slice(0, 3).join(", ") || "the core concept"}. Recommendation: review the concept with a worked example before moving on.`;
  } else if (overall >= 70) {
    feedback = `Excellent response on ${objectiveDesc} — demonstrated strong understanding, clear communication, and technical depth.`;
  } else if (overall >= 55) {
    feedback = `Good answer on ${objectiveDesc}. Solid grasp of main ideas${
      depth.tradeOffAwareness >= 50 ? " with good trade-off awareness" : ""
    }. ${depth.implementationSpecificity < 40 ? "Could strengthen with more concrete implementation details." : ""}`;
  } else if (overall >= 35) {
    feedback = `Partial understanding of ${objectiveDesc}. Strengths: ${responseAnalysis?.strengths.join(", ") || "some key concepts mentioned"}. Areas to deepen: ${missingConceptsText}. ${
      depth.structuralQuality < 40 ? "Try structuring your answer with clear sections." : ""
    }`;
  } else if (overall >= 20) {
    feedback = `Limited understanding of ${objectiveDesc}. Key concepts were missed or unclear: ${missingConceptsText}. Recommendation: revisit these fundamentals before moving on.`;
  } else {
    feedback = `Response did not adequately address ${objectiveDesc}. The expected concepts — ${keywords.slice(0, 3).join(", ") || "the fundamentals"} — were missing. Recommendation: study the basics and try again.`;
  }

  return {
    conceptAccuracy: conceptualCoverage,
    completeness,
    depth: depthScore,
    reasoning,
    communication,
    confidence,
    codeQuality,
    implementationSpecificity: depth.implementationSpecificity,
    tradeOffAwareness: depth.tradeOffAwareness,
    technicalVocabulary: depth.technicalVocabulary,
    structuralQuality: depth.structuralQuality,
    overall,
    scoreBreakdown: {
      technicalAccuracy: conceptualCoverage,
      communicationClarity: communication,
      completeness,
      problemSolving,
      codeQuality,
      implementationSpecificity: depth.implementationSpecificity,
      tradeOffAwareness: depth.tradeOffAwareness,
      technicalVocabulary: depth.technicalVocabulary,
      structuralQuality: depth.structuralQuality,
    },
    feedback,
    modelAnswer: formatModelAnswer(modelAnswer),
    isCorrect,
    isPartial,
    misconception,
    objectivesAssessed: [objectiveId],
    learningAgility,
    honestyCredit,
    responseType,
  };
}

function extractKeywordsFromDescription(description: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "how", "what", "why", "when", "where",
    "explain", "describe", "understand", "demonstrate", "ability", "knowledge",
  ]);

  return description
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 8);
}

export function deriveStrengthsAndWeaknesses(
  evaluations: EvaluationResult[],
  topicTitles: Map<string, string>
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const avgOverall =
    evaluations.reduce((s, e) => s + e.overall, 0) / Math.max(evaluations.length, 1);

  if (avgOverall >= 70) {
    strengths.push("Demonstrates solid overall technical understanding");
  }

  const avgComm =
    evaluations.reduce((s, e) => s + e.communication, 0) /
    Math.max(evaluations.length, 1);
  if (avgComm >= 75) {
    strengths.push("Clear and structured communication style");
  } else if (avgComm < 50) {
    weaknesses.push("Communication could be more structured with examples");
  }

  const avgDepth =
    evaluations.reduce((s, e) => s + e.depth, 0) / Math.max(evaluations.length, 1);
  if (avgDepth >= 75) {
    strengths.push("Shows depth in technical reasoning");
  } else if (avgDepth < 50) {
    weaknesses.push("Answers tend to lack technical depth");
  }

  const avgReasoning =
    evaluations.reduce((s, e) => s + e.reasoning, 0) /
    Math.max(evaluations.length, 1);
  if (avgReasoning >= 70) {
    strengths.push("Good analytical and reasoning skills");
  } else if (avgReasoning < 45) {
    weaknesses.push("Reasoning and trade-off analysis need improvement");
  }

  const lowEvals = evaluations.filter((e) => e.overall < 50);
  for (const eval_ of lowEvals.slice(0, 3)) {
    const topic = topicTitles.get(eval_.objectivesAssessed[0] ?? "") ?? "a topic area";
    weaknesses.push(`Needs improvement in concepts related to ${topic}`);
  }

  if (strengths.length === 0) {
    strengths.push("Shows willingness to engage with technical questions");
  }
  if (weaknesses.length === 0 && avgOverall < 85) {
    weaknesses.push("Could provide more concrete examples in responses");
  }

  return { strengths: [...new Set(strengths)], weaknesses: [...new Set(weaknesses)] };
}

function handleControlIntent(
  answer: string,
  responseType: string,
  keywords: string[],
  responseTypeForFeedback: string,
  topic: any
): EvaluationResult {
  const communication = assessCommunication("");

  const objectiveDesc = "the core concept";
  const missingText = "the fundamentals";

  let feedback: string;
  if (responseType === "DOES_NOT_KNOW") {
    feedback = "Candidate honestly acknowledged not knowing the concept. Strength: did not attempt to fabricate an answer. Gap: needs stronger understanding of the core concept. Recommendation: review the core concepts — " + keywords.slice(0, 4).join(", ") + " — through a small hands-on exercise, then retry.";
  } else if (responseType === "DID_NOT_UNDERSTAND") {
    feedback = "Candidate indicated they did not understand the question. Strength: honesty about confusion. Gap: needs clarification on the question. Recommendation: rephrase the question and try again.";
  } else if (responseType === "CLARIFICATION") {
    feedback = "Candidate requested clarification or rephrasing of the question. Strength: engagement with the question. Recommendation: rephrase the question and provide additional context.";
  } else if (responseType === "TOPIC_SWITCH") {
    feedback = "Candidate requested to switch topics. This is a valid interview control action. No technical assessment performed.";
  } else if (responseType === "TOPIC_SKIP") {
    feedback = "Candidate requested to skip this topic. No technical assessment performed. Topic marked for potential revisit.";
  } else if (responseType === "REFUSAL") {
    feedback = "Candidate declined to answer. No technical assessment performed. Interviewer should explore reasons or move on.";
  } else if (responseType === "DOES_NOT_KNOW") {
    feedback = "Candidate honestly acknowledged not knowing the concept. Strength: did not attempt to fabricate an answer. Gap: needs stronger understanding of the core concept. Recommendation: review the core concepts — " + keywords.slice(0, 4).join(", ") + " — through a small hands-on exercise, then retry.";
  } else if (responseType === "DID_NOT_UNDERSTAND") {
    feedback = "Candidate indicated they did not understand the question. Strength: honesty about confusion. Gap: needs clarification on the question. Recommendation: rephrase the question and try again.";
  } else if (responseType === "CLARIFICATION") {
    feedback = "Candidate requested clarification or rephrasing of the question. Strength: engagement with the question. Recommendation: rephrase the question and provide additional context.";
  } else if (responseType === "TOPIC_SWITCH") {
    feedback = "Candidate requested to switch topics. This is a valid interview control action. No technical assessment performed.";
  } else if (responseType === "TOPIC_SKIP") {
    feedback = "Candidate requested to skip this topic. No technical assessment performed. Topic marked for potential revisit.";
  } else if (responseType === "REFUSAL") {
    feedback = "Candidate declined to answer. No technical assessment performed. Interviewer should explore reasons or move on.";
  } else if (responseType === "OFF_TOPIC") {
    feedback = "Response was off-topic. Recommendation: gently redirect to the current topic.";
  } else if (responseType === "LOW_EFFORT") {
    feedback = "Response was minimal. Encourage the candidate to elaborate or ask for clarification.";
  } else if (responseType === "UNCERTAIN") {
    feedback = "Candidate expressed uncertainty. Recommendation: provide guidance or rephrase the question.";
  } else {
    feedback = "Control action — no technical assessment performed.";
  }

  return {
    conceptAccuracy: 0,
    completeness: 0,
    depth: 0,
    reasoning: 0,
    communication: assessCommunication(""),
    confidence: 50,
    codeQuality: 0,
    implementationSpecificity: 0,
    tradeOffAwareness: 0,
    technicalVocabulary: 0,
    structuralQuality: 0,
    overall: 0,
    scoreBreakdown: {
      technicalAccuracy: 0,
      communicationClarity: 0,
      completeness: 0,
      problemSolving: 0,
      codeQuality: 0,
      implementationSpecificity: 0,
      tradeOffAwareness: 0,
      technicalVocabulary: 0,
      structuralQuality: 0,
    },
    feedback,
    isCorrect: false,
    isPartial: false,
    misconception: undefined,
    objectivesAssessed: [],
    learningAgility: 0,
    honestyCredit: 0,
    responseType,
    modelAnswer: "",
  };
}
