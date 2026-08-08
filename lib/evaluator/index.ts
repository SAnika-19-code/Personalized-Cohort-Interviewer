import type {
  CurriculumDay,
  EvaluationResult,
  DifficultyLevel,
} from "@/types";

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

function keywordMatchesAnswer(keyword: string, answerWords: string[]): boolean {
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

  const keywords = objective?.keywords ?? extractKeywordsFromDescription(objective?.description ?? "");
  const keywordMatches = countKeywordMatches(answer, keywords);
  const keywordRatio = keywords.length > 0 ? keywordMatches / keywords.length : 0.5;

  const lengthScore = assessLength(answer);
  const communication = assessCommunication(answer);
  const codeQuality = assessCodeQuality(answer);

  const responseType = responseAnalysis?.responseType;
  const isHonestUnknown = responseType === "DOES_NOT_KNOW" || responseType === "DID_NOT_UNDERSTAND";

  const conceptAccuracy = Math.min(
    100,
    Math.round(keywordRatio * 60 + lengthScore * 0.2 + (answer.length > 50 ? 20 : 0))
  );

  const completeness = Math.min(
    100,
    Math.round(keywordRatio * 50 + lengthScore * 0.3 + (keywordMatches >= 2 ? 20 : 0))
  );

  const depth = Math.min(
    100,
    Math.round(
      (difficulty / 5) * 30 +
        (answer.length > 200 ? 30 : answer.length > 100 ? 20 : 10) +
        keywordRatio * 40
    )
  );

  const reasoning = Math.min(
    100,
    Math.round(
      (/\bbecause\b|\bsince\b|\btherefore\b|\bthus\b|\bso that\b/i.test(answer)
        ? 40
        : 15) +
        (/\btrade.?off|\bpros?\b|\bcons?\b|\badvantage|\bdisadvantage/i.test(
          answer
        )
          ? 25
          : 0) +
        (/\bif\b|\bwhen\b|\bunless\b|\bconsider/i.test(answer) ? 20 : 0) +
        keywordRatio * 15
    )
  );
  const problemSolving = reasoning;

  const confidence = Math.min(
    100,
    Math.round(
      (/\bi think\b|\bmaybe\b|\bnot sure\b|\bi guess\b/i.test(answer) ? -15 : 15) +
        (/\bdefinitely\b|\bclearly\b|\babsolutely\b/i.test(answer) ? 10 : 0) +
        lengthScore * 0.5 +
        40
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

  const overall = Math.round(
    conceptAccuracy * 0.25 +
      completeness * 0.2 +
      depth * 0.2 +
      problemSolving * 0.2 +
      communication * 0.1 +
      confidence * 0.05
  );

  const isCorrect = overall >= 65 && conceptAccuracy >= 55;
  const isPartial = !isCorrect && overall >= 40;

  const misconception = !isCorrect ? detectMisconception(answer, topic) : undefined;

  const objectiveDesc = objective?.description.toLowerCase() ?? "the core concept";
  const missingText = responseAnalysis?.missingConcepts.slice(0, 3).join(", ") ?? "the fundamentals";

  let feedback: string;
  if (isHonestUnknown) {
    feedback = `Candidate honestly acknowledged not knowing the concept. Strength: did not attempt to fabricate an answer. Gap: needs stronger understanding of ${objectiveDesc}. Recommendation: review the core concepts — ${keywords.slice(0, 4).join(", ")} — through a small hands-on exercise, then retry.`;
  } else if (responseType === "INCORRECT" && responseAnalysis?.misconceptions.length) {
    feedback = `Candidate gave an incorrect explanation with a misconception: ${responseAnalysis.misconceptions[0]}. Gap: needs correction on ${keywords.slice(0, 3).join(", ") || "the core concept"}. Recommendation: review the concept with a worked example before moving on.`;
  } else if (overall >= 85) {
    feedback = `Excellent response on ${objectiveDesc} — demonstrated strong understanding and clear communication.`;
  } else if (overall >= 70) {
    feedback = `Good answer on ${objectiveDesc}. Solid grasp of the main ideas; could go deeper on trade-offs and concrete examples.`;
  } else if (overall >= 50) {
    feedback = `Partial understanding of ${objectiveDesc}. Strengths: ${responseAnalysis?.strengths.join(", ") || "some key concepts mentioned"}. Gap: explanation lacks completeness around ${missingText}. Recommendation: structure answers as concept → example → trade-offs.`;
  } else if (overall >= 30) {
    feedback = `Limited understanding of ${objectiveDesc}. Several core concepts were missed or unclear. Recommendation: revisit ${missingText} before moving on.`;
  } else {
    feedback = `Response did not adequately address ${objectiveDesc}. The core concepts — ${keywords.slice(0, 3).join(", ") || "the fundamentals"} — were missing. Recommendation: study the basics and try again.`;
  }

  return {
    conceptAccuracy,
    completeness,
    depth,
    reasoning,
    communication,
    confidence,
    codeQuality,
    overall,
    scoreBreakdown: {
      technicalAccuracy: conceptAccuracy,
      communicationClarity: communication,
      completeness,
      problemSolving,
      codeQuality,
    },
    feedback,
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
