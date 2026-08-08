import type { CandidateResponseAnalysis } from "@/lib/interview/responseAnalyzer";

export interface LearningObjective {
  id: string;
  description: string;
  keywords?: string[];
}

export interface CurriculumDay {
  day: number;
  title: string;
  type?: string;
  tools?: string[];
  learningObjectives: LearningObjective[];
  moduleTitle?: string;
}

export interface CurriculumModule {
  n: number;
  title: string;
  dayNumbers: number[];
}

export interface Curriculum {
  cohort?: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

export interface CompletedMission {
  topicId: string;
  day: number;
  score: number;
  title?: string;
}

export interface TopicAttempt {
  topicId: string;
  day: number;
  attempts: number;
  passed?: boolean;
}

export interface SkippedTopic {
  topicId: string;
  day: number;
  title?: string;
}

export interface LearningSignal {
  topicId: string;
  day: number;
  strength: "weak" | "moderate" | "strong";
  notes?: string;
}

export interface CandidateProfile {
  candidateId: string;
  name?: string;
  jobRole?: string;
  yearsExperience?: number;
  education?: string;
  completedMissions: CompletedMission[];
  attempts: TopicAttempt[];
  skippedTopics: SkippedTopic[];
  learningSignals: LearningSignal[];
  signals?: {
    commitDays: number;
    missionsCompleted: number;
    missionsFirstTry: number;
  };
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type InterviewStyle = "easy" | "medium" | "hard";

export type MessageRole = "interviewer" | "candidate";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  questionId?: string;
  objectiveId?: string;
  kind?: "question" | "hint" | "system" | "answer";
  submittedLength?: number;
  receivedLength?: number;
  storedLength?: number;
  retrievedLength?: number;
  evaluatedLength?: number;
  reportedLength?: number;
  rawContent?: string;
}

export interface ScoreBreakdown {
  technicalAccuracy: number;
  communicationClarity: number;
  completeness: number;
  problemSolving: number;
  codeQuality: number | "N/A";
  implementationSpecificity: number;
  tradeOffAwareness: number;
  technicalVocabulary: number;
  structuralQuality: number;
}

export interface EvaluationResult {
  conceptAccuracy: number;
  completeness: number;
  depth: number;
  reasoning: number;
  communication: number;
  confidence: number;
  codeQuality: number | "N/A";
  implementationSpecificity: number;
  tradeOffAwareness: number;
  technicalVocabulary: number;
  structuralQuality: number;
  overall: number;
  scoreBreakdown: ScoreBreakdown;
  feedback: string;
  modelAnswer: string;
  isCorrect: boolean;
  isPartial: boolean;
  misconception?: string;
  objectivesAssessed: string[];
  learningAgility?: number;
  responseType?: string;
  honestyCredit?: number;
  codeQualityAssessed: boolean;
}

export interface QuestionReview {
  questionId: string;
  question: string;
  candidateAnswer: string;
  modelAnswer: string;
  feedback: string;
  topic: string;
  day: string;
  skipped?: boolean;
  evaluation?: EvaluationResult;
}

export type TopicMasteryStatus = "ASSESSED" | "SKIPPED" | "INSUFFICIENT_EVIDENCE" | "NOT_STARTED";

export interface TopicCoverage {
  topicId: string;
  day: number;
  topicTitle: string;
  dayTitle: string;
  objectivesCovered: string[];
  score: number | "N/A";
  masteryStatus: TopicMasteryStatus;
  questionsAsked: number;
}

export interface InterviewSession {
  sessionId: string;
  candidateProfile: CandidateProfile;
  curriculum: Curriculum;
  currentTopic: TopicCoverage;
  questionNumber: number;
  totalQuestions: number;
  difficulty: DifficultyLevel;
  strengths: string[];
  weaknesses: string[];
  conversationHistory: ChatMessage[];
  coveredObjectives: string[];
  topicCoverages: TopicCoverage[];
  score: number;
  evaluations: EvaluationResult[];
  questionReviews: QuestionReview[];
  currentQuestionId: string;
  currentQuestion: string;
  currentObjectiveId: string;
  selectedDifficulty: InterviewStyle;
  skipTokensRemaining: number;
  skippedQuestions: QuestionReview[];
  hintsUsed: string[];
  questionStartedAt: number;
  consecutiveFollowUps: number;
  lastAcknowledgement?: string;
  lastRemark?: string;
  isComplete: boolean;
  startedAt: number;
  askedObjectiveIds: string[];
  askedQuestions: string[];
  learningAgility: number;
  analysisLog: CandidateResponseAnalysis[];
}

export interface InterviewReport {
  candidateId: string;
  candidateName?: string;
  date: string;
  interviewTimestamp: string;
  selectedDifficulty: InterviewStyle;
  overallScore: number | "N/A";
  scoreBreakdown: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  topicBreakdown: {
    topic: string;
    day: string;
    score: number | "N/A";
    masteryStatus: "ASSESSED" | "SKIPPED" | "INSUFFICIENT_EVIDENCE" | "NOT_STARTED";
    objectivesCovered: number;
  }[];
  interviewSummary: string;
  recommendations: string[];
  nextTopicsToReview: string[];
  communicationFeedback: string;
  questionReviews: QuestionReview[];
  skippedQuestions: QuestionReview[];
  conversationHistory: ChatMessage[];
  learningAgility?: number;
}

export interface StartInterviewRequest {
  candidateProfile: CandidateProfile;
  curriculum: Curriculum;
  selectedDifficulty?: InterviewStyle;
}

export interface StartInterviewResponse {
  session: InterviewSession;
  firstQuestion: string;
}

export interface NextInterviewRequest {
  session: InterviewSession;
  candidateAnswer?: string;
  skipCurrent?: boolean;
}

export interface NextInterviewResponse {
  interviewerMessage: string;
  updatedSession: InterviewSession;
  isComplete?: boolean;
}

export interface EndInterviewRequest {
  session: InterviewSession;
}

export interface EndInterviewResponse {
  report: InterviewReport;
}

export interface HintRequest {
  session: InterviewSession;
}

export interface HintResponse {
  hint: string;
  updatedSession: InterviewSession;
}

export type AppScreen = "setup" | "interview" | "wrapup";

export interface ParsedFileResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function dayTopicId(day: number): string {
  return `day-${day}`;
}
