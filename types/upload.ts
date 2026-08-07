/** Raw upload format — matches curriculum.json */

export interface CurriculumModuleUpload {
  n: number;
  title: string;
  days: number[];
}

export interface CurriculumDayUpload {
  day: number;
  title: string;
  type?: string;
  tools?: string[];
  objectives: string[];
}

export interface CurriculumUpload {
  cohort?: string;
  modules: CurriculumModuleUpload[];
  days: CurriculumDayUpload[];
}

/** Raw upload format — matches candidates.json */

export interface CandidateMember {
  id: string;
  name: string;
  jobRole?: string;
  yearsExperience?: number;
  education?: string;
  status?: string;
}

export interface CandidateMission {
  day: number;
  title: string;
  passed?: boolean;
  attempts?: number;
  skipped?: boolean;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateRecord {
  member: CandidateMember;
  missions: CandidateMission[];
  signals: CandidateSignals;
}

export interface CandidatesUpload {
  candidates: CandidateRecord[];
}
