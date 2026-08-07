"use client";

import { motion } from "framer-motion";
import {
  Download,
  Copy,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { generatePDFReport, copyMarkdownToClipboard } from "@/lib/export";
import type { InterviewReport } from "@/types";
import { useState } from "react";

interface WrapUpScreenProps {
  report: InterviewReport;
  onStartNew: () => void;
}

export function WrapUpScreen({ report, onStartNew }: WrapUpScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyMarkdownToClipboard(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor =
    report.overallScore >= 75
      ? "text-success"
      : report.overallScore >= 55
        ? "text-warning"
        : "text-error";

  return (
    <div className="min-h-screen overflow-y-auto bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl space-y-8"
      >
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Interview Complete
          </h1>
          <p className="text-slate-400">
            {report.candidateName ?? `Candidate #${report.candidateId}`} ·{" "}
            {report.date}
          </p>
        </div>

        <div className="rounded-2xl bg-panel p-8 text-center">
          <p className="mb-2 text-sm text-slate-400">Overall Score</p>
          <p className={`text-6xl font-bold ${scoreColor}`}>
            {report.overallScore}
            <span className="text-2xl text-slate-400">/100</span>
          </p>
          <Progress
            value={report.overallScore}
            className="mx-auto mt-4 max-w-md h-2"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-panel p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <h2 className="text-lg font-semibold text-white">Strengths</h2>
            </div>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-panel p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold text-white">
                Areas to Improve
              </h2>
            </div>
            <ul className="space-y-2">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl bg-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Topic Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 text-left text-slate-400">
                  <th className="pb-3 pr-4">Topic</th>
                  <th className="pb-3 pr-4">Day</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3">Objectives</th>
                </tr>
              </thead>
              <tbody>
                {report.topicBreakdown.map((t, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-3 pr-4 text-white">{t.topic}</td>
                    <td className="py-3 pr-4 text-slate-300">{t.day}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          t.score >= 70
                            ? "text-success"
                            : t.score >= 50
                              ? "text-warning"
                              : "text-error"
                        }
                      >
                        {t.score}/100
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{t.objectivesCovered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-panel p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">
            Interview Summary
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            {report.interviewSummary}
          </p>
        </div>

        <div className="rounded-2xl bg-panel p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">
            Recommendations
          </h2>
          <ul className="space-y-2">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {r}
              </li>
            ))}
          </ul>
          {report.nextTopicsToReview.length > 0 && (
            <div className="mt-4 border-t border-slate-600 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-400">
                Next Topics to Review
              </p>
              <div className="flex flex-wrap gap-2">
                {report.nextTopicsToReview.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-background px-3 py-1 text-xs text-accent"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4 pb-8">
          <Button onClick={() => generatePDFReport(report)} className="gap-2">
            <Download className="h-4 w-4" />
            Save PDF
          </Button>
          <Button variant="secondary" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy Markdown"}
          </Button>
          <Button variant="outline" onClick={onStartNew} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start New Interview
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
