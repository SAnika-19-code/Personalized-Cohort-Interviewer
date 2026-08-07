import type {
  CandidateProfile,
  Curriculum,
  CurriculumDay,
  DifficultyLevel,
  TopicCoverage,
} from "@/types";
import { dayTopicId } from "@/types";
import { getAllTopics, getDayByTopicId } from "@/lib/parser";

interface TopicPriority {
  topicInfo: ReturnType<typeof getAllTopics>[0];
  priority: number;
  reason: string;
}

function getTopicPriority(
  topicInfo: ReturnType<typeof getAllTopics>[0],
  profile: CandidateProfile
): TopicPriority {
  const { topic, day } = topicInfo;
  let priority = 50;
  let reason = "Standard coverage";

  const completed = profile.completedMissions.find((m) => m.topicId === topic.id);
  if (completed && completed.score >= 85) {
    priority = 25;
    reason = "Completed with high score — brief verification";
  } else if (completed) {
    priority = 40;
    reason = "Completed — moderate verification";
  }

  const skipped = profile.skippedTopics.find((s) => s.topicId === topic.id);
  if (skipped) {
    priority = 92;
    reason = "Skipped topic — diagnostic assessment needed";
  }

  const attempt = profile.attempts.find((a) => a.topicId === topic.id);
  if (attempt && attempt.attempts >= 3) {
    priority = Math.max(priority, 78);
    reason = "Multiple attempts — probe deeper";
  }
  if (attempt && attempt.passed === false) {
    priority = Math.max(priority, 88);
    reason = "Mission not passed — needs assessment";
  }

  const signal = profile.learningSignals.find((s) => s.topicId === topic.id);
  if (signal?.strength === "weak") {
    priority = Math.max(priority, 85);
    reason = "Weak learning signal — spend more time";
  } else if (signal?.strength === "strong") {
    priority = Math.min(priority, 30);
    reason = "Strong performance — increase difficulty";
  }

  return { topicInfo, priority, reason };
}

export function selectNextTopic(
  curriculum: Curriculum,
  profile: CandidateProfile,
  coveredTopicIds: string[]
): TopicCoverage | null {
  const allTopics = getAllTopics(curriculum);
  const uncovered = allTopics.filter((t) => !coveredTopicIds.includes(t.topic.id));

  if (uncovered.length === 0) return null;

  const prioritized = uncovered
    .map((t) => getTopicPriority(t, profile))
    .sort((a, b) => b.priority - a.priority);

  const selected = prioritized[0]?.topicInfo;
  if (!selected) return null;

  return {
    topicId: selected.topic.id,
    day: selected.day,
    topicTitle: selected.topic.title,
    dayTitle: selected.dayTitle,
    objectivesCovered: [],
    score: 0,
    questionsAsked: 0,
  };
}

export function getTopicById(
  curriculum: Curriculum,
  topicId: string
): { topic: CurriculumDay & { id: string }; day: number; dayTitle: string } | null {
  const dayEntry = getDayByTopicId(curriculum, topicId);
  if (!dayEntry) return null;

  return {
    topic: {
      ...dayEntry,
      id: topicId,
    },
    day: dayEntry.day,
    dayTitle: dayEntry.title,
  };
}

export function calculateTotalQuestions(curriculum: Curriculum): number {
  const dayCount = curriculum.days.length;
  return Math.min(Math.max(Math.round(dayCount * 0.35), 8), 15);
}

export function shouldEndInterview(session: {
  questionNumber: number;
  totalQuestions: number;
  coveredObjectives: string[];
  curriculum: Curriculum;
}): boolean {
  if (session.questionNumber >= session.totalQuestions) return true;

  const allObjectives = getAllTopics(session.curriculum).flatMap((t) =>
    t.topic.learningObjectives.map((o) => o.id)
  );

  const coverageRatio =
    session.coveredObjectives.length / Math.max(allObjectives.length, 1);

  return coverageRatio >= 0.65 && session.questionNumber >= 6;
}

export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    1: "Easy",
    2: "Easy-Medium",
    3: "Medium",
    4: "Medium-Hard",
    5: "Hard",
  };
  return labels[difficulty];
}

export function adjustDifficulty(
  current: DifficultyLevel,
  evaluation: { overall: number; isCorrect: boolean; isPartial: boolean }
): DifficultyLevel {
  let next = current;

  if (evaluation.overall >= 85 && evaluation.isCorrect) {
    next = Math.min(5, current + 2) as DifficultyLevel;
  } else if (evaluation.overall >= 70 && evaluation.isCorrect) {
    next = Math.min(5, current + 1) as DifficultyLevel;
  } else if (evaluation.overall >= 50 || evaluation.isPartial) {
    next = current;
  } else if (evaluation.overall >= 30) {
    next = Math.max(1, current - 1) as DifficultyLevel;
  } else {
    next = Math.max(1, current - 2) as DifficultyLevel;
  }

  return next;
}

export function getInitialDifficulty(profile: CandidateProfile): DifficultyLevel {
  const signals = profile.signals;
  if (signals) {
    const firstTryRate = signals.missionsFirstTry / Math.max(signals.missionsCompleted, 1);
    if (firstTryRate >= 0.85) return 4;
    if (firstTryRate <= 0.35) return 2;
  }

  const strongSignals = profile.learningSignals.filter(
    (s) => s.strength === "strong"
  ).length;
  const weakSignals = profile.learningSignals.filter(
    (s) => s.strength === "weak"
  ).length;

  if (strongSignals > weakSignals + 3) return 4;
  if (weakSignals > strongSignals + 3) return 2;

  if (profile.yearsExperience !== undefined) {
    if (profile.yearsExperience >= 8) return 4;
    if (profile.yearsExperience <= 1) return 2;
  }

  return 3;
}

export { dayTopicId };
