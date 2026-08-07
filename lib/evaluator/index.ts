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
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function countKeywordMatches(text: string, keywords: string[]): number {
  const normalized = normalizeText(text);
  return keywords.filter((kw) => normalized.includes(kw.toLowerCase())).length;
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
  const { answer, topic, objectiveId, difficulty } = params;
  const objective =
    topic.learningObjectives.find((o) => o.id === objectiveId) ??
    topic.learningObjectives[0];

  const keywords = objective?.keywords ?? extractKeywordsFromDescription(objective?.description ?? "");
  const keywordMatches = countKeywordMatches(answer, keywords);
  const keywordRatio = keywords.length > 0 ? keywordMatches / keywords.length : 0.5;

  const lengthScore = assessLength(answer);
  const communication = assessCommunication(answer);

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

  const confidence = Math.min(
    100,
    Math.round(
      (/\bi think\b|\bmaybe\b|\bnot sure\b|\bi guess\b/i.test(answer) ? -15 : 15) +
        (/\bdefinitely\b|\bclearly\b|\babsolutely\b/i.test(answer) ? 10 : 0) +
        lengthScore * 0.5 +
        40
    )
  );

  const overall = Math.round(
    conceptAccuracy * 0.25 +
      completeness * 0.2 +
      depth * 0.2 +
      reasoning * 0.2 +
      communication * 0.1 +
      confidence * 0.05
  );

  const isCorrect = overall >= 65 && conceptAccuracy >= 55;
  const isPartial = !isCorrect && overall >= 40;

  const misconception = !isCorrect ? detectMisconception(answer, topic) : undefined;

  let feedback: string;
  if (overall >= 85) {
    feedback = "Excellent response demonstrating strong understanding and clear communication.";
  } else if (overall >= 70) {
    feedback = "Good answer with solid grasp of core concepts. Some areas could use more depth.";
  } else if (overall >= 50) {
    feedback = "Partial understanding shown. Key concepts mentioned but explanation lacks completeness.";
  } else if (overall >= 30) {
    feedback = "Limited understanding demonstrated. Several core concepts were missed or unclear.";
  } else {
    feedback = "Response did not adequately address the learning objectives for this topic.";
  }

  return {
    conceptAccuracy,
    completeness,
    depth,
    reasoning,
    communication,
    confidence,
    overall,
    feedback,
    isCorrect,
    isPartial,
    misconception,
    objectivesAssessed: [objectiveId],
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
