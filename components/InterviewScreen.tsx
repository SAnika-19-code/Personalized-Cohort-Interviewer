"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpCircle, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChatTimeline } from "@/components/chat/ChatTimeline";
import { AnswerInput } from "@/components/chat/AnswerInput";
import { getDifficultyLabel } from "@/lib/interview/topicSelector";
import type { InterviewSession } from "@/types";

interface InterviewScreenProps {
  session: InterviewSession;
  isLoading: boolean;
  onSubmitAnswer: (answer: string) => void;
  onEndInterview: () => void;
  onHint: () => void;
  onSkipQuestion: () => void;
}

const QUESTION_SECONDS = 240;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function InterviewScreen({
  session,
  isLoading,
  onSubmitAnswer,
  onEndInterview,
  onHint,
  onSkipQuestion,
}: InterviewScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const hintUsed = session.hintsUsed.includes(session.currentQuestionId);
  const progressPercent = Math.round(
    (session.questionNumber / session.totalQuestions) * 100
  );
  const timerPercent = (secondsLeft / QUESTION_SECONDS) * 100;

  useEffect(() => {
    setSecondsLeft(QUESTION_SECONDS);
    setTimeExpired(false);
  }, [session.currentQuestionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)));
      setSecondsLeft((current) => {
        if (current <= 1) {
          setTimeExpired(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session.startedAt, session.currentQuestionId]);

  const timerClass = useMemo(() => {
    if (secondsLeft <= 15) return "text-error";
    if (secondsLeft <= 45) return "text-warning";
    return "text-accent";
  }, [secondsLeft]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b border-slate-700 bg-panel px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-slate-400">Topic: </span>
                <span className="font-medium text-white">
                  Day {session.currentTopic.day} — {session.currentTopic.topicTitle}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Question: </span>
                <span className="font-medium text-white">
                  {session.questionNumber} / {session.totalQuestions}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Difficulty: </span>
                <span className="font-medium text-accent">
                  {session.selectedDifficulty.toUpperCase()} ·{" "}
                  {getDifficultyLabel(session.difficulty)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Question Timer: </span>
                <span className={`font-semibold tabular-nums ${timerClass}`}>
                  {formatTime(secondsLeft)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Total: </span>
                <span className="font-medium text-white">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Skip Tokens: </span>
                <span className="font-medium text-white">
                  {session.skipTokensRemaining}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onHint}
                disabled={isLoading || hintUsed}
                className="shrink-0"
              >
                <HelpCircle className="h-4 w-4" />
                Hint
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipQuestion}
                disabled={isLoading || session.skipTokensRemaining <= 0}
                className="shrink-0"
              >
                <SkipForward className="h-4 w-4" />
                Skip Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onEndInterview}
                disabled={isLoading}
                className="shrink-0"
              >
                <Square className="h-3 w-3 fill-current" />
                End & Evaluate
              </Button>
            </div>
          </div>

          <Progress value={progressPercent} className="h-1.5" />
          <Progress value={timerPercent} className="h-1" />
          {timeExpired && (
            <p className="text-xs text-warning">
              Time is up for this question. You can continue answering when
              ready.
            </p>
          )}
        </div>
      </header>

      <ChatTimeline
        messages={session.conversationHistory}
        isLoading={isLoading}
      />

      <AnswerInput
        onSubmit={onSubmitAnswer}
        disabled={session.isComplete}
        isLoading={isLoading}
      />
    </div>
  );
}
