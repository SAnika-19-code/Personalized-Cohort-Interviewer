import type { Curriculum, CandidateProfile, ParsedFileResult } from "@/types";
import type { CurriculumUpload, CandidatesUpload, CandidateRecord } from "@/types/upload";
import { normalizeCurriculum, normalizeCandidate } from "@/lib/parser/normalize";

export function parseCurriculumJSON(raw: string): ParsedFileResult<Curriculum> {
  try {
    const parsed = JSON.parse(raw) as CurriculumUpload;

    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "Curriculum must be a JSON object." };
    }

    if (!Array.isArray(parsed.modules) || parsed.modules.length === 0) {
      return {
        success: false,
        error: "Curriculum must contain a non-empty 'modules' array.",
      };
    }

    if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
      return {
        success: false,
        error: "Curriculum must contain a non-empty 'days' array.",
      };
    }

    for (const mod of parsed.modules) {
      if (typeof mod.n !== "number" || !mod.title || !Array.isArray(mod.days)) {
        return {
          success: false,
          error: "Each module must have 'n', 'title', and 'days' (array of day numbers).",
        };
      }
    }

    for (const day of parsed.days) {
      if (typeof day.day !== "number" || !day.title || !Array.isArray(day.objectives)) {
        return {
          success: false,
          error: "Each day must have 'day' (number), 'title', and 'objectives' array.",
        };
      }
      if (day.objectives.length === 0) {
        return {
          success: false,
          error: `Day ${day.day} must have at least one objective.`,
        };
      }
    }

    return { success: true, data: normalizeCurriculum(parsed) };
  } catch {
    return { success: false, error: "Invalid JSON format. Please check your curriculum file." };
  }
}

export function parseCandidatesJSON(raw: string): ParsedFileResult<CandidatesUpload> {
  try {
    const parsed = JSON.parse(raw) as CandidatesUpload;

    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "Candidates file must be a JSON object." };
    }

    if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
      return {
        success: false,
        error: "Candidates file must contain a non-empty 'candidates' array.",
      };
    }

    for (const record of parsed.candidates) {
      if (!record.member?.id || !record.member?.name) {
        return {
          success: false,
          error: "Each candidate must have member.id and member.name.",
        };
      }
      if (!Array.isArray(record.missions)) {
        return {
          success: false,
          error: `Candidate ${record.member.id} must have a 'missions' array.`,
        };
      }
      if (!record.signals || typeof record.signals.missionsCompleted !== "number") {
        return {
          success: false,
          error: `Candidate ${record.member.id} must have a 'signals' object.`,
        };
      }
    }

    return { success: true, data: parsed };
  } catch {
    return {
      success: false,
      error: "Invalid JSON format. Please check your candidates file.",
    };
  }
}

export function candidateRecordToProfile(record: CandidateRecord): CandidateProfile {
  return normalizeCandidate(record);
}

export function countCurriculumDays(curriculum: Curriculum): number {
  return curriculum.days.length;
}

export function getAllTopics(curriculum: Curriculum) {
  return curriculum.days.map((day) => ({
    moduleName: day.moduleTitle ?? "General",
    day: day.day,
    dayTitle: day.title,
    topic: {
      id: `day-${day.day}`,
      title: day.title,
      tools: day.tools,
      learningObjectives: day.learningObjectives,
    },
  }));
}

export { normalizeCurriculum, normalizeCandidate } from "@/lib/parser/normalize";
export { getDayByNumber, getDayByTopicId } from "@/lib/parser/normalize";
