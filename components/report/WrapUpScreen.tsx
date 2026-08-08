"use client";

import { motion } from "framer-motion";
import {
  Download,
  Copy,
  FileJson,
  FileText,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  generatePDFReport,
  copyMarkdownToClipboard,
  downloadJSONReport,
  downloadMarkdownReport,
} from "@/lib/export";
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
  const scoreRows = [
    ["Technical Accuracy", report.scoreBreakdown.technicalAccuracy],
    ["Communication Clarity", report.scoreBreakdown.communicationClarity],
    ["Completeness", report.scoreBreakdown.completeness],
    ["Problem Solving", report.scoreBreakdown.problemSolving],
    ["Code Quality", report.scoreBreakdown.codeQuality],
    ["Implementation Specificity", report.scoreBreakdown.implementationSpecificity],
    ["Trade-off Awareness", report.scoreBreakdown.tradeOffAwareness],
    ["Technical Vocabulary", report.scoreBreakdown.technicalVocabulary],
    ["Structural Quality", report.scoreBreakdown.structuralQuality],
  ] as const;

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
            {report.date} · {report.selectedDifficulty.toUpperCase()}
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
          {typeof report.learningAgility === "number" && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="rounded-xl bg-background/50 px-5 py-3">
                <p className="text-xs text-slate-400">Learning Agility</p>
                <p className="text-xl font-bold text-accent">
                  {report.learningAgility}
                  <span className="text-xs text-slate-400">/100</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Score Breakdown
          </h2>
          <div className="space-y-4">
            {scoreRows.map(([label, score]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-medium text-white">{typeof score === "number" ? `${score}/100` : score}</span>
                </div>
                {typeof score === "number" && <Progress value={score} className="h-2" />}
              </div>
            ))}
          </div>
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

        <div className="rounded-2xl bg-panel p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Model Answer Comparison
          </h2>
          <div className="space-y-5">
            {report.questionReviews.map((review) => (
              <div
                key={review.questionId}
                className="rounded-lg border border-slate-700 bg-background/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {review.skipped ? "Skipped: " : ""}
                    {review.topic}
                  </p>
                  {review.evaluation && (
                    <span className="text-xs text-accent">
                      {review.evaluation.overall}/100
                    </span>
                  )}
                </div>
                <div className="space-y-3 text-sm leading-relaxed">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                      Question
                    </p>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {review.question}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                      Candidate Answer
                    </p>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {review.candidateAnswer || "Skipped"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                      Model Answer
                    </p>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {review.modelAnswer}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                      Feedback
                    </p>
                    <p className="text-slate-300">{review.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 pb-8">
          <Button onClick={() => generatePDFReport(report)} className="gap-2">
            <Download className="h-4 w-4" />
            Save PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadJSONReport(report)}
            className="gap-2"
          >
            <FileJson className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadMarkdownReport(report)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Export Markdown
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
