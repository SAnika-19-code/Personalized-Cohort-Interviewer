"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, User, BookOpen, CheckCircle2, ChevronDown } from "lucide-react";
import { FileUpload } from "@/components/upload/FileUpload";
import { Button } from "@/components/ui/button";
import {
  parseCurriculumJSON,
  parseCandidatesJSON,
  candidateRecordToProfile,
  countCurriculumDays,
} from "@/lib/parser";
import { formatCandidateDisplay } from "@/lib/utils";
import type { Curriculum, CandidateProfile } from "@/types";
import type { InterviewStyle } from "@/types";
import type { CandidateRecord } from "@/types/upload";

interface SetupScreenProps {
  onStart: (
    curriculum: Curriculum,
    profile: CandidateProfile,
    selectedDifficulty: InterviewStyle
  ) => void;
  isLoading?: boolean;
}

export function SetupScreen({ onStart, isLoading }: SetupScreenProps) {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [curriculumError, setCurriculumError] = useState<string>();
  const [candidatesError, setCandidatesError] = useState<string>();
  const [curriculumFileName, setCurriculumFileName] = useState<string>();
  const [candidatesFileName, setCandidatesFileName] = useState<string>();
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<InterviewStyle>("medium");

  const selectedRecord = candidates.find(
    (c) => c.member.id === selectedCandidateId
  );
  const profile = selectedRecord
    ? candidateRecordToProfile(selectedRecord)
    : null;

  const handleCurriculumLoad = useCallback((content: string, fileName: string) => {
    const result = parseCurriculumJSON(content);
    if (result.success && result.data) {
      setCurriculum(result.data);
      setCurriculumError(undefined);
      setCurriculumFileName(fileName);
    } else {
      setCurriculum(null);
      setCurriculumError(result.error);
      setCurriculumFileName(undefined);
    }
  }, []);

  const handleCandidatesLoad = useCallback((content: string, fileName: string) => {
    const result = parseCandidatesJSON(content);
    if (result.success && result.data) {
      setCandidates(result.data.candidates);
      setCandidatesError(undefined);
      setCandidatesFileName(fileName);
      setSelectedCandidateId(result.data.candidates[0]?.member.id ?? "");
    } else {
      setCandidates([]);
      setSelectedCandidateId("");
      setCandidatesError(result.error);
      setCandidatesFileName(undefined);
    }
  }, []);

  const isReady =
    curriculum && profile && !curriculumError && !candidatesError;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">
            AI Technical Interviewer
          </h1>
          <p className="text-slate-400">
            Upload your curriculum and candidates JSON to begin a personalized
            technical interview
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6 rounded-2xl bg-panel p-6">
            <FileUpload
              label="Upload Curriculum JSON"
              onFileLoaded={handleCurriculumLoad}
              onClear={() => {
                setCurriculum(null);
                setCurriculumFileName(undefined);
                setCurriculumError(undefined);
              }}
              error={curriculumError}
              loadedFileName={curriculumFileName}
            />
            <FileUpload
              label="Upload Candidates JSON"
              onFileLoaded={handleCandidatesLoad}
              onClear={() => {
                setCandidates([]);
                setSelectedCandidateId("");
                setCandidatesFileName(undefined);
                setCandidatesError(undefined);
              }}
              error={candidatesError}
              loadedFileName={candidatesFileName}
            />
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-panel p-6">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Status</h2>

              <div className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4">
                  <p className="mb-3 text-xs text-slate-400">Interview Style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedDifficulty(option)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                          selectedDifficulty === option
                            ? "border-accent bg-accent text-background"
                            : "border-slate-600 bg-background text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {candidates.length > 0 && (
                  <div className="rounded-lg bg-background/50 p-4">
                    <label
                      htmlFor="candidate-select"
                      className="mb-2 block text-xs text-slate-400"
                    >
                      Select Candidate
                    </label>
                    <div className="relative">
                      <select
                        id="candidate-select"
                        value={selectedCandidateId}
                        onChange={(e) => setSelectedCandidateId(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-600 bg-background px-4 py-2.5 pr-10 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {candidates.map((c) => (
                          <option key={c.member.id} value={c.member.id}>
                            {c.member.name} ({c.member.id})
                            {c.member.jobRole ? ` — ${c.member.jobRole}` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-lg bg-background/50 p-4">
                  <User className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-slate-400">Loaded Candidate</p>
                    <p className="font-medium text-white">
                      {profile
                        ? formatCandidateDisplay(profile)
                        : "No candidate selected"}
                    </p>
                    {profile?.jobRole && (
                      <p className="text-xs text-slate-500">{profile.jobRole}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-background/50 p-4">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-slate-400">Curriculum</p>
                    <p className="font-medium text-white">
                      {curriculum
                        ? `${countCurriculumDays(curriculum)} Days Loaded`
                        : "No curriculum loaded"}
                    </p>
                    {curriculum?.cohort && (
                      <p className="text-xs text-slate-500">{curriculum.cohort}</p>
                    )}
                  </div>
                </div>

                {candidates.length > 0 && (
                  <div className="flex items-center gap-3 rounded-lg bg-background/50 p-4">
                    <User className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">Candidates in file</p>
                      <p className="font-medium text-white">
                        {candidates.length} candidates
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-lg bg-background/50 p-4">
                  <CheckCircle2
                    className={`h-5 w-5 ${isReady ? "text-success" : "text-slate-500"}`}
                  />
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <p
                      className={`font-medium ${isReady ? "text-success" : "text-slate-400"}`}
                    >
                      {isReady ? "Ready" : "Waiting for files"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-8 w-full gap-2 text-base"
              disabled={!isReady || isLoading}
              onClick={() => {
                if (curriculum && profile) {
                  onStart(curriculum, profile, selectedDifficulty);
                }
              }}
            >
              <Play className="h-5 w-5" />
              {isLoading ? "Starting Interview..." : "Start Interview"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
