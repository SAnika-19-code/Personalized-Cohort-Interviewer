"use client";

import { useRef, useState, useCallback } from "react";
import { Mic, Send, Square } from "lucide-react";
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
  const [voiceState, setVoiceState] = useState<
    "idle" | "recording" | "transcribing" | "inserted" | "error"
  >("idle");
  const [voiceMessage, setVoiceMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    abort?: () => void;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
    continuous: boolean;
    interimResults: boolean;
  } | null>(null);

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

  const stopRecording = useCallback(() => {
    setVoiceState("transcribing");
    recorderRef.current?.stop();
    recognitionRef.current?.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || isLoading || voiceState === "recording") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => NonNullable<typeof recognitionRef.current> })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => NonNullable<typeof recognitionRef.current> })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceState("error");
      setVoiceMessage("Voice input is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (transcript) {
          setValue((current) =>
            `${current}${current ? "\n" : ""}${transcript}`.slice(0, MAX_CHARS)
          );
          setVoiceState("inserted");
          setVoiceMessage("Transcript inserted into the text box.");
        }
      };
      recognition.onerror = (event) => {
        setVoiceState("error");
        setVoiceMessage(event.error ?? "Unable to transcribe audio.");
      };
      recognition.onend = () => {
        setVoiceState((current) =>
          current === "recording" ? "transcribing" : current
        );
      };
      recognitionRef.current = recognition;

      recorder.start();
      recognition.start();
      setVoiceState("recording");
      setVoiceMessage("Recording...");
    } catch {
      setVoiceState("error");
      setVoiceMessage("Microphone access was blocked. You can still type manually.");
    }
  }, [disabled, isLoading, voiceState]);

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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-4 text-xs text-slate-400">
            <span>
              {value.length} / {MAX_CHARS} characters
            </span>
            {value.length > 0 && (
              <span>{estimateReadingTime(value)}</span>
            )}
            {voiceMessage && (
              <span
                className={
                  voiceState === "error" ? "text-error" : "text-slate-400"
                }
              >
                {voiceMessage}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={voiceState === "recording" ? stopRecording : startRecording}
              disabled={disabled || isLoading}
              size="default"
              className="gap-2"
            >
              {voiceState === "recording" ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {voiceState === "recording" ? "Stop Recording" : "Start Recording"}
            </Button>
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
    </div>
  );
}
