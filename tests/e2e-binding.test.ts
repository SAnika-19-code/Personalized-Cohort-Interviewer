import { createSession, startInterview, processAnswer, skipQuestion, generateReport } from "../lib/interview/engine";
import { normalizeCurriculum } from "../lib/parser";
import fs from "fs";

async function main() {
  const raw = JSON.parse(fs.readFileSync("curriculum.json", "utf8"));
  const curriculum = normalizeCurriculum(raw);

  const profile = {
    candidateId: "e2e-test",
    name: "E2E Test",
    jobRole: "Junior Developer",
    completedMissions: [],
    attempts: [],
    skippedTopics: [],
    learningSignals: [],
  } as any;

  console.log("=== END-TO-END BINDING VERIFICATION ===\n");

  let { session } = await startInterview(profile, curriculum, "medium");

  const answers = [
    "I would install VS Code and Python, configure the Python extension, create a virtual environment, and run a test program.",
    "A vector database like ChromaDB stores embeddings for semantic search in RAG applications.",
    "Text gets converted to embeddings using models like Sentence Transformers or OpenAI embeddings.",
    "I'd use Ollama to run a local model like Qwen2.5-Coder and connect it to VS Code.",
    "I would use Pandas to load CSV data, clean it with dropna and type casting, then store it in SQLite.",
    "For RAG, I'd chunk documents, generate embeddings, store them in a vector DB, and retrieve relevant chunks for the LLM.",
    "I'd use LoRA to fine-tune an LLM on domain-specific data for better responses.",
    "I'd containerize the app with Docker and deploy to Kubernetes with health checks and auto-scaling.",
  ];

  let mismatchCount = 0;
  let allBindings: { q: string; eval: string; match: boolean }[] = [];

  for (let i = 0; i < answers.length; i++) {
    const qMsgs = session.conversationHistory.filter((m: any) => m.kind === "question");
    const lastQ = qMsgs[qMsgs.length - 1] as any;

    const res = await processAnswer(session, answers[i]);
    session = res.session;

    const evalObj = res.session.evaluations[res.session.evaluations.length - 1]?.objectivesAssessed[0];
    const match = lastQ.objectiveId === evalObj;
    allBindings.push({ q: lastQ.objectiveId, eval: evalObj, match });
    if (!match) mismatchCount++;

    if (res.isComplete) break;
  }

  console.log("Bindings:");
  allBindings.forEach((b, i) => {
    console.log(`  Q${i + 1}: question=${b.q} eval=${b.eval} ${b.match ? "PASS" : "FAIL"}`);
  });

  console.log(`\nTotal: ${allBindings.length} questions, ${mismatchCount} mismatches`);

  const report = generateReport(session);
  console.log(`\nReport: ${report.questionReviews.length} reviews, score=${report.overallScore}`);

  const modelAnswerOk = report.questionReviews.every((r: any) => r.modelAnswer.length > 50);
  console.log(`All model answers substantive: ${modelAnswerOk ? "PASS" : "FAIL"}`);

  if (mismatchCount === 0 && modelAnswerOk) {
    console.log("\nE2E BINDING VERIFICATION: PASS");
  } else {
    console.log("\nE2E BINDING VERIFICATION: FAIL");
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
