import type {
  Curriculum,
  CurriculumDay,
  CandidateProfile,
  LearningObjective,
  LearningSignal,
} from "@/types";
import { dayTopicId } from "@/types";
import type {
  CurriculumUpload,
  CandidateRecord,
  CandidatesUpload,
} from "@/types/upload";

function objectiveId(day: number, index: number): string {
  return `obj-day-${day}-${index + 1}`;
}

function extractKeywords(description: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "how", "what", "why", "when", "where",
    "using", "build", "create", "implement", "understand", "learn",
  ]);

  return description
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 10);
}

function moduleForDay(
  modules: CurriculumUpload["modules"],
  day: number
): string | undefined {
  return modules.find((m) => m.days.includes(day))?.title;
}

export function normalizeCurriculum(upload: CurriculumUpload): Curriculum {
  const days: CurriculumDay[] = upload.days.map((d) => ({
    day: d.day,
    title: d.title,
    type: d.type,
    tools: d.tools,
    moduleTitle: moduleForDay(upload.modules, d.day),
    learningObjectives: d.objectives.map((description, i) => ({
      id: objectiveId(d.day, i),
      description,
      keywords: extractKeywords(description),
    })),
  }));

  return {
    cohort: upload.cohort,
    modules: upload.modules.map((m) => ({
      n: m.n,
      title: m.title,
      dayNumbers: m.days,
    })),
    days,
  };
}

function scoreFromAttempts(attempts: number, passed: boolean): number {
  if (!passed) return 40;
  if (attempts <= 1) return 95;
  if (attempts === 2) return 85;
  if (attempts === 3) return 75;
  if (attempts === 4) return 65;
  return 55;
}

function deriveSignalForMission(
  mission: CandidateRecord["missions"][0]
): LearningSignal {
  const topicId = dayTopicId(mission.day);

  if (mission.skipped) {
    return { topicId, day: mission.day, strength: "weak", notes: "Skipped mission" };
  }
  if (mission.passed === false) {
    return { topicId, day: mission.day, strength: "weak", notes: "Mission not passed" };
  }
  const attempts = mission.attempts ?? 1;
  if (attempts >= 4) {
    return {
      topicId,
      day: mission.day,
      strength: "weak",
      notes: `Required ${attempts} attempts`,
    };
  }
  if (attempts === 1) {
    return { topicId, day: mission.day, strength: "strong", notes: "Passed on first try" };
  }
  return {
    topicId,
    day: mission.day,
    strength: "moderate",
    notes: `Passed in ${attempts} attempts`,
  };
}

export function normalizeCandidate(record: CandidateRecord): CandidateProfile {
  const { member, missions, signals } = record;

  const completedMissions = missions
    .filter((m) => m.passed && !m.skipped)
    .map((m) => ({
      topicId: dayTopicId(m.day),
      day: m.day,
      title: m.title,
      score: scoreFromAttempts(m.attempts ?? 1, true),
    }));

  const attempts = missions
    .filter((m) => !m.skipped)
    .map((m) => ({
      topicId: dayTopicId(m.day),
      day: m.day,
      attempts: m.attempts ?? 1,
      passed: m.passed,
    }));

  const skippedTopics = missions
    .filter((m) => m.skipped)
    .map((m) => ({
      topicId: dayTopicId(m.day),
      day: m.day,
      title: m.title,
    }));

  const learningSignals = missions.map(deriveSignalForMission);

  return {
    candidateId: member.id,
    name: member.name,
    jobRole: member.jobRole,
    yearsExperience: member.yearsExperience,
    education: member.education,
    completedMissions,
    attempts,
    skippedTopics,
    learningSignals,
    signals,
  };
}

export function getDayByNumber(
  curriculum: Curriculum,
  day: number
): CurriculumDay | undefined {
  return curriculum.days.find((d) => d.day === day);
}

export function getDayByTopicId(
  curriculum: Curriculum,
  topicId: string
): CurriculumDay | undefined {
  const match = topicId.match(/^day-(\d+)$/);
  if (!match) return undefined;
  return getDayByNumber(curriculum, parseInt(match[1], 10));
}
