"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SetupScreen } from "@/components/SetupScreen";
import { InterviewScreen } from "@/components/InterviewScreen";
import { WrapUpScreen } from "@/components/report/WrapUpScreen";
import { useInterviewStore } from "@/hooks/useInterviewStore";
import type { Curriculum, CandidateProfile, InterviewStyle } from "@/types";

export function AppShell() {
  const {
    screen,
    session,
    report,
    isLoading,
    error,
    setScreen,
    setSession,
    setReport,
    setLoading,
    setError,
    reset,
  } = useInterviewStore();

  const handleStart = useCallback(
    async (
      curriculum: Curriculum,
      profile: CandidateProfile,
      selectedDifficulty: InterviewStyle
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/interview/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateProfile: profile,
            curriculum,
            selectedDifficulty,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to start interview");
        }

        const data = await res.json();
        setSession(data.session);
        setScreen("interview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [setSession, setScreen, setLoading, setError]
  );

  const handleEndInterview = useCallback(
    async (currentSession = session) => {
      if (!currentSession) return;
      setLoading(true);
      try {
        const res = await fetch("/api/interview/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: currentSession }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to generate report");
        }

        const data = await res.json();
        setReport(data.report);
        setScreen("wrapup");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [session, setReport, setScreen, setLoading, setError]
  );

  const handleHint = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate hint");
      }
      const data = await res.json();
      setSession(data.updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [session, setSession, setLoading, setError]);

  const handleSkipQuestion = useCallback(async () => {
    if (!session || session.skipTokensRemaining <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, skipCurrent: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to skip question");
      }
      const data = await res.json();
      setSession(data.updatedSession);
      if (data.isComplete) {
        await handleEndInterview(data.updatedSession);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [session, setSession, setLoading, setError, handleEndInterview]);

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/interview/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, candidateAnswer: answer }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to submit answer");
        }

        const data = await res.json();
        setSession(data.updatedSession);

        if (data.isComplete) {
          await handleEndInterview(data.updatedSession);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [session, setSession, setLoading, setError, handleEndInterview]
  );

  const handleStartNew = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <>
      {error && (
        <div
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-error/90 px-4 py-2 text-sm text-white shadow-lg"
          role="alert"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SetupScreen onStart={handleStart} isLoading={isLoading} />
          </motion.div>
        )}

        {screen === "interview" && session && (
          <motion.div
            key="interview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            <InterviewScreen
              session={session}
              isLoading={isLoading}
              onSubmitAnswer={handleSubmitAnswer}
              onEndInterview={() => handleEndInterview()}
              onHint={handleHint}
              onSkipQuestion={handleSkipQuestion}
            />
          </motion.div>
        )}

        {screen === "wrapup" && report && (
          <motion.div
            key="wrapup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WrapUpScreen report={report} onStartNew={handleStartNew} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
