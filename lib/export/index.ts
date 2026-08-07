import type { InterviewReport } from "@/types";

export function generateMarkdownReport(report: InterviewReport): string {
  const name = report.candidateName ?? `Candidate #${report.candidateId}`;

  let md = `# Interview Report\n\n`;
  md += `**Candidate:** ${name}\n`;
  md += `**Date:** ${report.date}\n\n`;
  md += `## Overall Score\n\n`;
  md += `**${report.overallScore}/100**\n\n`;

  md += `## Strengths\n\n`;
  for (const s of report.strengths) {
    md += `- ${s}\n`;
  }
  md += `\n`;

  md += `## Areas to Improve\n\n`;
  for (const w of report.weaknesses) {
    md += `- ${w}\n`;
  }
  md += `\n`;

  md += `## Topic Breakdown\n\n`;
  md += `| Topic | Day | Score | Objectives Covered |\n`;
  md += `|-------|-----|-------|--------------------|\n`;
  for (const t of report.topicBreakdown) {
    md += `| ${t.topic} | ${t.day} | ${t.score}/100 | ${t.objectivesCovered} |\n`;
  }
  md += `\n`;

  md += `## Interview Summary\n\n`;
  md += `${report.interviewSummary}\n\n`;

  md += `## Recommendations\n\n`;
  for (const r of report.recommendations) {
    md += `- ${r}\n`;
  }
  md += `\n`;

  if (report.nextTopicsToReview.length > 0) {
    md += `## Next Topics to Review\n\n`;
    for (const t of report.nextTopicsToReview) {
      md += `- ${t}\n`;
    }
    md += `\n`;
  }

  md += `## Communication Feedback\n\n`;
  md += `${report.communicationFeedback}\n`;

  return md;
}

export async function generatePDFReport(report: InterviewReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const name = report.candidateName ?? `Candidate #${report.candidateId}`;
  let y = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  const addText = (text: string, fontSize = 11, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  addText("AI Technical Interviewer — Report", 18, true);
  y += 5;
  addText(`Candidate: ${name}`);
  addText(`Date: ${report.date}`);
  y += 5;

  addText(`Overall Score: ${report.overallScore}/100`, 14, true);
  y += 5;

  addText("Strengths", 13, true);
  for (const s of report.strengths) {
    addText(`• ${s}`);
  }
  y += 3;

  addText("Areas to Improve", 13, true);
  for (const w of report.weaknesses) {
    addText(`• ${w}`);
  }
  y += 3;

  addText("Topic Breakdown", 13, true);
  for (const t of report.topicBreakdown) {
    addText(`${t.topic} (${t.day}): ${t.score}/100 — ${t.objectivesCovered} objectives`);
  }
  y += 3;

  addText("Interview Summary", 13, true);
  addText(report.interviewSummary);
  y += 3;

  addText("Recommendations", 13, true);
  for (const r of report.recommendations) {
    addText(`• ${r}`);
  }

  doc.save(`interview-report-${report.candidateId}-${report.date}.pdf`);
}

export async function copyMarkdownToClipboard(report: InterviewReport): Promise<void> {
  const md = generateMarkdownReport(report);
  await navigator.clipboard.writeText(md);
}
