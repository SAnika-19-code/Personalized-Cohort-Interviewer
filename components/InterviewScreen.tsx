"use client";

import { Square } from "lucide-react";
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
}

export function InterviewScreen({
  session,
  isLoading,
  onSubmitAnswer,
  onEndInterview,
}: InterviewScreenProps) {
  const progressPercent = Math.round(
    (session.questionNumber / session.totalQuestions) * 100
  );

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
                  {getDifficultyLabel(session.difficulty)}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onEndInterview}
              disabled={isLoading}
              className="gap-2 shrink-0"
            >
              <Square className="h-3 w-3 fill-current" />
              End & Evaluate
            </Button>
          </div>

          <Progress value={progressPercent} className="h-1.5" />
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
