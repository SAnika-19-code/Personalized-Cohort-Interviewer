import type {
  CandidateProfile,
  Curriculum,
  CurriculumDay,
  DifficultyLevel,
  EvaluationResult,
  ChatMessage,
  InterviewStyle,
} from "@/types";
import { getTopicById } from "@/lib/interview/topicSelector";
import { LLMProvider, createLLMProvider } from "./provider";

const PERSONA_PROMPTS: Record<InterviewStyle, string> = {
  easy: `You are a Supportive Mentor conducting a technical interview.

PERSONALITY:
- Warm, patient, encouraging, friendly, low pressure
- Build candidate confidence
- Ask mostly fundamental questions
- Allow the candidate time to explain
- If the answer is incomplete, guide gently instead of immediately changing topics
- Follow-up questions should help the candidate elaborate rather than trap them
- Acknowledge effort

EXAMPLE ACKNOWLEDGEMENTS:
"That's a nice starting point."
"I appreciate the explanation."
"You're thinking in the right direction."
"I like that you considered that."

CHALLENGE LEVEL: Low
HINTS: Occasionally acceptable
EXPECTED ANSWER DEPTH: Fundamental understanding`,

  medium: `You are a Professional Software Engineer conducting a technical interview.

PERSONALITY:
- Neutral, curious, professional, attentive
- Conduct the interview like a typical software engineering interview
- Ask implementation questions
- Explore trade-offs
- Ask about design choices
- Expect complete explanations
- Keep the interview conversational

EXAMPLE ACKNOWLEDGEMENTS:
"Interesting approach."
"That makes sense."
"Let's explore that a little further."
"Walk me through your reasoning."

CHALLENGE LEVEL: Medium
HINTS: None
EXPECTED ANSWER DEPTH: Implementation-level understanding`,

  hard: `You are a Principal/Staff Engineer conducting a technical interview.

PERSONALITY:
- Calm, analytical, detail-oriented, highly observant, technically rigorous
- Challenge assumptions
- Probe architecture decisions
- Ask about scalability
- Ask about edge cases
- Ask about failure scenarios
- Ask "why" frequently
- Require justification for decisions
- Never become rude or intimidating
- Do NOT praise excessively

INSTEAD OF: "Great answer." "Perfect!" "Correct."
PREFER: "Interesting." "I noticed you mentioned..." "Let's dig into that."

CHALLENGE LEVEL: High
HINTS: Never
EXPECTED ANSWER DEPTH: Senior-level reasoning`,
};

const SYSTEM_PROMPT = `You are an AI Technical Interviewer conducting a realistic, interactive interview. Your primary goal is to simulate an experienced human interviewer—not a chatbot or question generator.

You must actively listen, acknowledge the candidate's responses, adapt your questions, and maintain a natural conversation while objectively assessing technical ability.

CONVERSATION STYLE:
The interview must NEVER feel like:
Question → Answer → Question → Answer → Question

Instead:
Question → Candidate Answer → Understand → Acknowledge → Brief Remark → Decide (Follow-up OR Transition) → Next Question

RESPONSE FORMAT:
Every interviewer response should naturally contain:
1. Acknowledgement (one short sentence, 5-15 words, avoid repetition)
2. Brief Remark (conversational, never reveal correctness/scores)
3. Next Question (exactly ONE question)

ACKNOWLEDGEMENT EXAMPLES:
"Thanks for explaining that." "I see." "Understood." "That's helpful." "Interesting." "Fair point." "Makes sense." "I appreciate the explanation."

REMARK EXAMPLES (Good):
"That's a practical approach." "I noticed you focused on simplicity." "That's an interesting trade-off." "I like how you considered scalability."

REMARK EXAMPLES (Bad - NEVER USE):
"Excellent!" "Perfect!" "Correct." "You scored well."

ACTIVE LISTENING:
Extract from candidate responses: technologies, frameworks, algorithms, design choices, assumptions, trade-offs, mistakes, architecture, optimization, debugging process. Reference these naturally.

FOLLOW-UP RULES:
- Ask follow-up ONLY when there's something worth exploring (implementation details, architecture, trade-offs, security, performance, scalability, testing, debugging, concurrency, optimization, edge cases, incomplete explanation, assumptions, decisions)
- Follow-up must directly relate to the previous answer
- Maximum 2 consecutive follow-ups, then move on

TOPIC TRANSITIONS:
- Transition naturally: "That gives me a good picture." "Let's switch gears." "Thanks for walking me through that." "Let's move into databases."
- Avoid abrupt changes

QUESTION QUALITY:
- Feel conversational, build upon context, avoid repetition, avoid trivia, encourage explanation
- Prefer: "How would you improve this?" "What trade-offs did you consider?" "What happens if...?"
- Over: "Define..." "What is..." (unless interviewing fundamentals)

INTERVIEW COVERAGE:
- Maintain awareness of completed/partially explored/unanswered topics
- Avoid repeatedly asking about the same concept
- Gradually cover the required curriculum

CANDIDATE ADAPTATION:
- If candidate struggles: Easy→Guide gently, Medium→Simplify slightly, Hard→Reduce complexity only if completely stuck
- If candidate performs extremely well: Increase depth, scenario-based questions, architecture questions, edge cases

COMMUNICATION STYLE:
- Keep responses concise (30-80 words typical)
- Avoid long paragraphs, monologues

NEVER:
- Reveal scores, evaluation criteria, internal reasoning
- Say "correct" or "incorrect"
- Ask multiple unrelated questions
- Ignore candidate responses
- Abruptly switch topics
- Repeat acknowledgements
- Dominate the conversation
- Give away answers (except Easy mode when configured)`;

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
  candidateAnswer?: string;
  selectedStyle: InterviewStyle;
  consecutiveFollowUps: number;
  coveredTopicIds: string[];
}

interface QuestionResult {
  question: string;
  objectiveId: string;
  isFollowUp: boolean;
  shouldSwitchTopic: boolean;
}

function buildCurriculumContext(curriculum: Curriculum, topicId: string): string {
  const topicData = getTopicById(curriculum, topicId);
  if (!topicData) return "";

  const { topic, day, dayTitle } = topicData;
  const objectives = topic.learningObjectives.map((o) => `- ${o.id}: ${o.description}${o.keywords ? ` (keywords: ${o.keywords.join(", ")})` : ""}`).join("\n");
  const tools = topic.tools?.length ? `\nTools: ${topic.tools.join(", ")}` : "";

  return `CURRENT TOPIC: Day ${day} — ${dayTitle}
Topic Title: ${topic.title}
Learning Objectives:
${objectives}${tools}`;
}

function buildCandidateContext(profile: CandidateProfile, topicId: string): string {
  const completed = profile.completedMissions.find((m) => m.topicId === topicId);
  const skipped = profile.skippedTopics.find((s) => s.topicId === topicId);
  const attempt = profile.attempts.find((a) => a.topicId === topicId);
  const signal = profile.learningSignals.find((s) => s.topicId === topicId);

  const parts: string[] = [];
  if (completed) parts.push(`Completed: Day ${completed.day} (${completed.title}) - Score: ${completed.score}%`);
  if (skipped) parts.push(`Skipped: Day ${skipped.day} (${skipped.title})`);
  if (attempt) parts.push(`Attempts: ${attempt.attempts}${attempt.passed !== undefined ? `, Passed: ${attempt.passed}` : ""}`);
  if (signal) parts.push(`Learning Signal: ${signal.strength}${signal.notes ? ` - ${signal.notes}` : ""}`);

  if (profile.jobRole) parts.unshift(`Job Role: ${profile.jobRole}`);
  if (profile.yearsExperience !== undefined) parts.unshift(`Years Experience: ${profile.yearsExperience}`);
  if (profile.education) parts.unshift(`Education: ${profile.education}`);

  return parts.length ? `CANDIDATE CONTEXT:\n${parts.join("\n")}` : "";
}

function buildConversationContext(history: ChatMessage[], maxMessages: number = 10): string {
  const recent = history.slice(-maxMessages);
  if (recent.length === 0) return "";

  return `RECENT CONVERSATION:\n${recent.map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`).join("\n\n")}`;
}

function buildFollowUpContext(ctx: QuestionContext): string {
  if (!ctx.candidateAnswer || !ctx.lastEvaluation) return "";

  return `CANDIDATE'S LAST ANSWER:
${ctx.candidateAnswer}

EVALUATION SUMMARY:
- Overall: ${ctx.lastEvaluation.overall}/100
- Concept Accuracy: ${ctx.lastEvaluation.conceptAccuracy}/100
- Completeness: ${ctx.lastEvaluation.completeness}/100
- Depth: ${ctx.lastEvaluation.depth}/100
- Reasoning: ${ctx.lastEvaluation.reasoning}/100
- Communication: ${ctx.lastEvaluation.communication}/100
- Is Correct: ${ctx.lastEvaluation.isCorrect}
- Is Partial: ${ctx.lastEvaluation.isPartial}
${ctx.lastEvaluation.misconception ? `- Misconception Detected: ${ctx.lastEvaluation.misconception}` : ""}
${ctx.lastEvaluation.feedback ? `- Feedback: ${ctx.lastEvaluation.feedback}` : ""}`;
}

export async function generateQuestionLLM(ctx: QuestionContext): Promise<QuestionResult> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const topicData = getTopicById(ctx.curriculum, ctx.topicId);
  if (!topicData) {
    throw new Error(`Topic not found: ${ctx.topicId}`);
  }

  const uncoveredObjectives = topicData.topic.learningObjectives
    .filter((o) => ctx.uncoveredObjectives.includes(o.id))
    .map((o) => o.id);

  const objectiveToAsk = uncoveredObjectives.length > 0
    ? topicData.topic.learningObjectives.find((o) => o.id === uncoveredObjectives[0])
    : topicData.topic.learningObjectives[0];

  if (!objectiveToAsk) {
    throw new Error("No objectives available for topic");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: PERSONA_PROMPTS[ctx.selectedStyle] },
    { role: "user", content: [
      buildCurriculumContext(ctx.curriculum, ctx.topicId),
      buildCandidateContext(ctx.profile, ctx.topicId),
      buildConversationContext(ctx.conversationHistory),
      ctx.isFollowUp ? buildFollowUpContext(ctx) : "",
      "",
      `CONTEXT:`,
      `- Question #${ctx.questionNumber}`,
      `- Difficulty Level: ${ctx.difficulty}/5`,
      `- Consecutive Follow-ups: ${ctx.consecutiveFollowUps}/2`,
      `- Current Objective: ${objectiveToAsk.id} - ${objectiveToAsk.description}`,
      `- Covered Topics: ${ctx.coveredTopicIds.length}`,
      "",
      ctx.isFollowUp
        ? "The candidate just answered the previous question. Based on their response and the evaluation, decide whether to ask a follow-up (max 2) or transition to a new topic. If following up, the question must directly relate to their answer."
        : "This is a new topic. Generate an opening question for this topic that matches the persona and difficulty level.",
      "",
      "Respond with ONLY the interviewer's response containing: Acknowledgement + Brief Remark + Next Question",
    ].filter(Boolean).join("\n\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.8, maxTokens: 500 });
  const content = response.content.trim();

  // Determine if this is a follow-up or topic switch based on content analysis
  const isFollowUp = ctx.isFollowUp && ctx.consecutiveFollowUps < 2 && 
    !content.toLowerCase().includes("let's switch") &&
    !content.toLowerCase().includes("move on") &&
    !content.toLowerCase().includes("next topic") &&
    !content.toLowerCase().includes("different area") &&
    !content.toLowerCase().includes("shift gears");

  const shouldSwitchTopic = !isFollowUp && ctx.isFollowUp;

  return {
    question: content,
    objectiveId: objectiveToAsk.id,
    isFollowUp,
    shouldSwitchTopic,
  };
}

export async function generateOpeningMessageLLM(
  profile: CandidateProfile,
  topicTitle: string,
  dayTitle: string,
  dayNumber: number,
  selectedStyle: InterviewStyle
): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: PERSONA_PROMPTS[selectedStyle] },
    { role: "user", content: [
      `Generate an opening message for the interview.`,
      `Candidate: ${profile.name ?? `Candidate #${profile.candidateId}`}${profile.jobRole ? ` (${profile.jobRole})` : ""}`,
      `Starting Topic: Day ${dayNumber} — ${dayTitle} (${topicTitle})`,
      `Style: ${selectedStyle}`,
      "",
      "Include: Warm welcome, brief context about the interview, mention the first topic, set expectations.",
      "Format: Acknowledgement + Remark + First Question (all in one natural response)",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.7, maxTokens: 400 });
  return response.content.trim();
}

export async function generateTransitionMessageLLM(
  fromTopic: string,
  toTopic: string,
  dayNumber: number,
  selectedStyle: InterviewStyle
): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: PERSONA_PROMPTS[selectedStyle] },
    { role: "user", content: [
      `Generate a transition message.`,
      `From: ${fromTopic}`,
      `To: Day ${dayNumber} — ${toTopic}`,
      `Style: ${selectedStyle}`,
      "",
      "Format: Natural transition phrase + brief remark + first question for new topic",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.7, maxTokens: 300 });
  return response.content.trim();
}

export async function generateClosingMessageLLM(selectedStyle: InterviewStyle): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: PERSONA_PROMPTS[selectedStyle] },
    { role: "user", content: "Generate a closing message for the interview. Thank the candidate, indicate the interview is complete, and mention the report will be generated. Keep it brief and professional." },
  ];

  const response = await provider.complete(messages, { temperature: 0.5, maxTokens: 200 });
  return response.content.trim();
}

export async function generateHintLLM(
  topicTitle: string,
  objectiveDescription: string,
  keywords: string[],
  selectedStyle: InterviewStyle
): Promise<string> {
  const provider = createLLMProvider();
  if (!provider) {
    throw new Error("LLM provider not configured");
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: PERSONA_PROMPTS[selectedStyle] },
    { role: "user", content: [
      `Generate a helpful hint for the current question.`,
      `Topic: ${topicTitle}`,
      `Objective: ${objectiveDescription}`,
      `Keywords: ${keywords.join(", ")}`,
      `Style: ${selectedStyle}`,
      "",
      selectedStyle === "easy"
        ? "Provide a gentle nudge with specific concepts to consider."
        : "Provide a subtle hint without giving away the answer.",
    ].join("\n") },
  ];

  const response = await provider.complete(messages, { temperature: 0.6, maxTokens: 200 });
  return response.content.trim();
}