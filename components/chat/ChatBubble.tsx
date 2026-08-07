"use client";

import { motion } from "framer-motion";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: ChatMessage;
}

function highlightCode(code: string, language: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (["json"].includes(language)) {
    return escaped.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g,
      (match, stringValue, colon) => {
        if (stringValue) {
          return `<span class="${colon ? "text-sky-300" : "text-emerald-300"}">${stringValue}</span>${colon ?? ""}`;
        }
        return `<span class="text-amber-300">${match}</span>`;
      }
    );
  }

  return escaped
    .replace(
      /\b(const|let|var|function|return|class|import|from|export|async|await|def|if|else|elif|try|except|catch|for|while|select|from|where|insert|update|delete|create|table|and|or|not|null|true|false)\b/gi,
      '<span class="text-sky-300">$1</span>'
    )
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="text-emerald-300">$1</span>')
    .replace(/(#.*$|\/\/.*$|--.*$)/gm, '<span class="text-slate-500">$1</span>');
}

const markdownComponents = {
  code({
    inline,
    className,
    children,
    ...props
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) {
    const language = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";
    const code = String(children ?? "").replace(/\n$/, "");

    if (inline) {
      return (
        <code className="rounded bg-slate-950/60 px-1 py-0.5 text-accent" {...props}>
          {children}
        </code>
      );
    }

    return (
      <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed">
        <code
          className={className}
          dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
        />
      </pre>
    );
  },
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isInterviewer = message.role === "interviewer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: isInterviewer ? -8 : 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex w-full",
        isInterviewer ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
          isInterviewer
            ? "rounded-bl-md bg-ai-bubble text-slate-100"
            : "rounded-br-md bg-candidate-bubble text-white"
        )}
      >
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-accent">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
