"use client";

import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, estimateReadingTime } from "@/lib/utils";

const MAX_CHARS = 1500;

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AnswerInput({ onSubmit, disabled, isLoading }: AnswerInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  }, [value, disabled, isLoading, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-700 bg-panel/80 px-4 py-4 backdrop-blur-sm md:px-8">
      <div className="mx-auto max-w-4xl space-y-3">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={
            isLoading
              ? "Interviewer is evaluating your answer..."
              : "Type your answer here... (Shift+Enter for new line, Enter to submit)"
          }
          rows={4}
          className={cn(
            "w-full resize-none rounded-xl border border-slate-600 bg-background px-4 py-3 text-sm text-white placeholder:text-slate-500",
            "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          aria-label="Your answer"
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-xs text-slate-400">
            <span>
              {value.length} / {MAX_CHARS} characters
            </span>
            {value.length > 0 && (
              <span>{estimateReadingTime(value)}</span>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled || isLoading}
            size="default"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Submit Answer
          </Button>
        </div>
      </div>
    </div>
  );
}
