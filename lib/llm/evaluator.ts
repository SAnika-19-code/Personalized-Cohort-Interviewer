import type {
  CurriculumDay,
  EvaluationResult,
  DifficultyLevel,
  ScoreBreakdown,
} from "@/types";
import { LLMProvider, createLLMProvider } from "./provider";

const EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    conceptAccuracy: { type: "integer", minimum: 0, maximum: 100 },
    completeness: { type: "integer", minimum: 0, maximum: 100 },
    depth: { type: "integer", minimum: 0, maximum: 100 },
    reasoning: { type: "integer", minimum: 0, maximum: 100 },
    communication: { type: "integer", minimum: 0, maximum: 100 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    codeQuality: { type: "integer", minimum: 0, maximum: 100 },
    implementationSpecificity: { type: "integer", minimum: 0, maximum: 100 },
    tradeOffAwareness: { type: "integer", minimum: 0, maximum: 100 },
    technicalVocabulary: { type: "integer", minimum: 0, maximum: 100 },
    structuralQuality: { type: "integer", minimum: 0, maximum: 100 },
    overall: { type: "integer", minimum: 0, maximum: 100 },
    isCorrect: { type: "boolean" },
    isPartial: { type: "boolean" },
    misconception: { type: ["string", "null"] },
    feedback: { type: "string" },
  },
  required: [
    "conceptAccuracy",
    "completeness",
    "depth",
    "reasoning",
    "communication",
    "confidence",
    "codeQuality",
    "implementationSpecificity",
    "tradeOffAwareness",
    "technicalVocabulary",
    "structuralQuality",
    "overall",
    "isCorrect",
    "isPartial",
    "misconception",
    "feedback",
  ],
  additionalProperties: false,
} as const;

const EVALUATOR_SYSTEM_PROMPT = `You are an expert technical interviewer evaluating a candidate's response. Assess the answer across multiple dimensions objectively.

EVALUATION DIMENSIONS (0-100 each):

1. CONCEPT ACCURACY: How technically correct is the answer? Does it demonstrate understanding of core concepts?
2. COMPLETENESS: How thoroughly does the answer address the learning objective? Are key aspects covered?
3. DEPTH: How deep is the technical understanding? Surface-level vs. deep architectural/implementation knowledge.
4. REASONING: Does the candidate explain WHY, not just WHAT? Trade-offs, alternatives, cause-effect?
5. COMMUNICATION: Structure, clarity, examples, analogies, code snippets, logical flow.
6. CONFIDENCE: Certainty vs. hedging. "I think" vs. "This is because..." (but overconfidence without substance is penalized).
7. CODE QUALITY: If code is present - correctness, best practices, error handling, readability. If no code expected, score based on pseudo-code/algorithm clarity.
8. IMPLEMENTATION SPECIFICITY: Does the answer describe concrete steps, commands, configurations, or code patterns — not just vague concepts?
9. TRADE-OFF AWARENESS: Does the candidate discuss trade-offs, pros/cons, alternatives, or when to choose one approach over another?
10. TECHNICAL VOCABULARY: Does the answer use domain-specific terminology appropriate to the topic?
11. STRUCTURAL QUALITY: Is the answer well-organized with clear sections, logical flow, and coherent structure?

OVERALL: Weighted composite (Concept Accuracy 15%, Completeness 10%, Depth 15%, Reasoning 10%, Communication 10%, Confidence 5%, Implementation Specificity 15%, Trade-off Awareness 10%, Technical Vocabulary 5%, Structural Quality 5%).

ISCORRECT: Overall >= 65 AND Concept Accuracy >= 45
ISPARTIAL: NOT IsCorrect AND Overall >= 40

MISCONCEPTION: If the answer reveals a fundamental misunderstanding, describe it specifically for a follow-up probe. Null if none.

FEEDBACK: One paragraph summarizing strengths and gaps. Never reveal scores.`;

interface EvaluateParams {
  answer: string;
  topic: CurriculumDay & { id?: string };
  objectiveId: string;
  difficulty: DifficultyLevel;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export async function evaluateAnswerLLM(params: EvaluateParams): Promise<EvaluationResult> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const objective = params.topic.learningObjectives.find((o) => o.id === params.objectiveId) ?? params.topic.learningObjectives[0];

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: EVALUATOR_SYSTEM_PROMPT },
    { role: "user", content: [
      `TOPIC: ${params.topic.title} (Day ${params.topic.day})`,
      `OBJECTIVE: ${objective?.description ?? "General"}${objective?.keywords ? ` (Keywords: ${objective.keywords.join(", ")})` : ""}`,
      `DIFFICULTY: ${params.difficulty}/5`,
      `TOOLS: ${params.topic.tools?.join(", ") ?? "N/A"}`,
      "",
      `CANDIDATE ANSWER:`,
      params.answer,
      "",
      `Evaluate and return structured JSON.`,
    ].join("\n") },
  ];

  const result = await provider.completeStructured<{
    conceptAccuracy: number;
    completeness: number;
    depth: number;
    reasoning: number;
    communication: number;
    confidence: number;
    codeQuality: number;
    implementationSpecificity: number;
    tradeOffAwareness: number;
    technicalVocabulary: number;
    structuralQuality: number;
    overall: number;
    isCorrect: boolean;
    isPartial: boolean;
    misconception: string | null;
    feedback: string;
  }>(messages, EVALUATION_SCHEMA, { temperature: 0.2, maxTokens: 1000 });

  const scoreBreakdown: ScoreBreakdown = {
    technicalAccuracy: result.conceptAccuracy,
    communicationClarity: result.communication,
    completeness: result.completeness,
    problemSolving: result.reasoning,
    codeQuality: result.codeQuality,
    implementationSpecificity: result.implementationSpecificity ?? 50,
    tradeOffAwareness: result.tradeOffAwareness ?? 50,
    technicalVocabulary: result.technicalVocabulary ?? 50,
    structuralQuality: result.structuralQuality ?? 50,
  };

  return {
    conceptAccuracy: result.conceptAccuracy,
    completeness: result.completeness,
    depth: result.depth,
    reasoning: result.reasoning,
    communication: result.communication,
    confidence: result.confidence,
    codeQuality: result.codeQuality,
    implementationSpecificity: result.implementationSpecificity ?? 50,
    tradeOffAwareness: result.tradeOffAwareness ?? 50,
    technicalVocabulary: result.technicalVocabulary ?? 50,
    structuralQuality: result.structuralQuality ?? 50,
    overall: result.overall,
    scoreBreakdown,
    feedback: result.feedback,
    modelAnswer: "",
    isCorrect: result.isCorrect,
    isPartial: result.isPartial,
    misconception: result.misconception ?? undefined,
    objectivesAssessed: [params.objectiveId],
  };
}

export async function deriveStrengthsAndWeaknessesLLM(
  evaluations: EvaluationResult[],
  topicTitles: Map<string, string>
): Promise<{ strengths: string[]; weaknesses: string[] }> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const evalSummary = evaluations.map((e, i) => {
    const topic = topicTitles.get(e.objectivesAssessed[0] ?? "") ?? `Topic ${i + 1}`;
    return `${i + 1}. ${topic}: Overall ${e.overall} (Accuracy ${e.conceptAccuracy}, Completeness ${e.completeness}, Depth ${e.depth}, Reasoning ${e.reasoning}, Communication ${e.communication}, Code ${e.codeQuality}) - ${e.feedback}`;
  }).join("\n");

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: `You are an interview evaluator summarizing a candidate's performance across multiple questions. Analyze the evaluations and produce a concise list of strengths and weaknesses.

Return JSON with:
{
  "strengths": string[],
  "weaknesses": string[]
}

Rules:
- 3-5 items each
- Specific, actionable, tied to observed patterns
- No generic fluff
- Reference specific technical areas when possible` },
    { role: "user", content: `EVALUATIONS:\n${evalSummary}\n\nAnalyze and return strengths/weaknesses.` },
  ];

  const result = await provider.completeStructured<{
    strengths: string[];
    weaknesses: string[];
  }>(messages, {
    type: "object",
    properties: {
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
    },
    required: ["strengths", "weaknesses"],
    additionalProperties: false,
  }, { temperature: 0.3, maxTokens: 800 });

  return {
    strengths: [...new Set(result.strengths)].slice(0, 5),
    weaknesses: [...new Set(result.weaknesses)].slice(0, 5),
  };
}

export async function generateModelAnswerLLM(
  topicTitle: string,
  objectiveDescription: string,
  keywords: string[],
  candidateAnswer: string,
  tools: string[] = []
): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const missedKeywords = keywords.filter(
    (kw) => !candidateAnswer.toLowerCase().includes(kw.toLowerCase())
  );

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: `You are generating a model answer for a technical interview question. Create a comprehensive, well-structured response that demonstrates senior-level understanding.` },
    { role: "user", content: [
      `TOPIC: ${topicTitle}`,
      `OBJECTIVE: ${objectiveDescription}`,
      `KEY CONCEPTS: ${keywords.join(", ")}`,
      `TOOLS: ${tools.join(", ") || "N/A"}`,
      `MISSED KEYWORDS: ${missedKeywords.join(", ") || "None"}`,
      `CANDIDATE'S ANSWER: ${candidateAnswer || "(skipped)"}`,
      "",
      "Generate a model answer that:",
      "1. Explains the core concept clearly",
      "2. Connects to practical workflow/tools",
      "3. Names trade-offs and design decisions",
      "4. Describes verification/validation approach",
      "5. Includes a code example if implementation-related",
      "6. Highlights the missed keywords naturally",
      "",
      "Format: Natural explanation with optional code block. No markdown headers.",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.5, maxTokens: 800 });
  return response.content.trim();
}

export async function generateInterviewSummaryLLM(
  candidateName: string,
  selectedDifficulty: string,
  overallScore: number,
  topicBreakdown: Array<{ topic: string; day: string; score: number; objectivesCovered: number }>,
  strengths: string[],
  weaknesses: string[],
  questionCount: number,
  finalDifficulty: number
): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: `Generate a concise interview summary paragraph. Professional, balanced tone. 3-5 sentences.` },
    { role: "user", content: [
      `Candidate: ${candidateName}`,
      `Difficulty: ${selectedDifficulty} (final: ${finalDifficulty}/5)`,
      `Overall Score: ${overallScore}/100`,
      `Questions: ${questionCount}`,
      `Topics Covered: ${topicBreakdown.length}`,
      `Topic Scores: ${topicBreakdown.map(t => `${t.topic}: ${t.score}`).join(", ")}`,
      `Strengths: ${strengths.join("; ")}`,
      `Weaknesses: ${weaknesses.join("; ")}`,
      "",
      "Write a narrative summary covering: coverage, performance level, readiness assessment, and key themes.",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.4, maxTokens: 400 });
  return response.content.trim();
}

export async function generateRecommendationsLLM(
  overallScore: number,
  weaknesses: string[],
  skippedTopics: string[],
  weakSignals: string[],
  lowScoreTopics: string[]
): Promise<string[]> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: `Generate 4-6 specific, actionable recommendations for a candidate post-interview. Return JSON array of strings.` },
    { role: "user", content: [
      `Overall Score: ${overallScore}/100`,
      `Weaknesses: ${weaknesses.join("; ")}`,
      `Skipped Topics: ${skippedTopics.join(", ") || "None"}`,
      `Weak Learning Signals: ${weakSignals.join(", ") || "None"}`,
      `Low-Score Topics: ${lowScoreTopics.join(", ") || "None"}`,
      "",
      "Recommendations should be: specific, actionable, prioritized, varied (study, practice, projects, depth).",
    ].join("\n") },
  ];

  const result = await provider.completeStructured<string[]>(messages, {
    type: "array",
    items: { type: "string" },
    minItems: 4,
    maxItems: 6,
  }, { temperature: 0.4, maxTokens: 500 });

  return result;
}

export async function generateCommunicationFeedbackLLM(
  avgCommunication: number,
  evaluations: EvaluationResult[]
): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const commDetails = evaluations.map((e, i) => 
    `Q${i+1}: Comm ${e.communication}, Structure: ${e.communication >= 70 ? "good" : e.communication >= 50 ? "ok" : "weak"}, Code: ${e.codeQuality >= 70 ? "yes" : "no"}`
  ).join("\n");

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: `Generate communication feedback paragraph. 2-3 sentences. Professional, constructive.` },
    { role: "user", content: [
      `Average Communication Score: ${Math.round(avgCommunication)}/100`,
      `Details:\n${commDetails}`,
      "",
      "Provide tiered feedback: Excellent (>=80), Good (>=60), Needs Improvement (<60).",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.4, maxTokens: 300 });
  return response.content.trim();
}