import { createSession, startInterview, processAnswer, skipQuestion } from "../lib/interview/engine";
import { normalizeCurriculum } from "../lib/parser";
import fs from "fs";

const raw = JSON.parse(fs.readFileSync("curriculum.json", "utf8"));
const curriculum = normalizeCurriculum(raw);

function makeProfile(overrides: any = {}) {
  return {
    candidateId: "test",
    name: "Test",
    jobRole: "Developer",
    completedMissions: [],
    attempts: [],
    skippedTopics: [],
    learningSignals: [],
    ...overrides,
  } as any;
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log("  PASS:", msg);
  } else {
    console.error("  FAIL:", msg);
    failures++;
  }
}

async function main() {
  console.log("=== REGRESSION TESTS: Question-Objective Binding ===\n");

  await testA();
  await testB();
  await testC();
  await testD();

  console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

async function testA() {
  console.log("--- Test A: Question A -> Objective A ---");
  const { session } = await startInterview(makeProfile(), curriculum, "medium");

  const qMsgs = session.conversationHistory.filter((m: any) => m.kind === "question");
  const q = qMsgs[0] as any;
  const objectiveId = q.objectiveId;

  const res = await processAnswer(session, "This is a test answer about the topic.");
  const evalObjId = res.session.evaluations[0]?.objectivesAssessed[0];

  assert(!!objectiveId, "Question has objectiveId");
  assert(evalObjId === objectiveId, `Eval objective (${evalObjId}) matches question objective (${objectiveId})`);
  assert(res.session.questionReviews[0]?.evaluation?.objectivesAssessed[0] === objectiveId, "QuestionReview eval matches question objective");
}

async function testB() {
  console.log("\n--- Test B: Q(A) -> Obj(A), Q(B) -> Obj(B), no cross-contamination ---");
  let { session } = await startInterview(makeProfile(), curriculum, "medium");

  const qMsgs1 = session.conversationHistory.filter((m: any) => m.kind === "question");
  const objA = (qMsgs1[0] as any).objectiveId;

  let res = await processAnswer(session, "First answer about the first topic.");
  session = res.session;

  const evalObjA = res.session.evaluations[0]?.objectivesAssessed[0];
  assert(evalObjA === objA, `Q1 evaluated against obj A (${objA}), got ${evalObjA}`);

  const qMsgs2 = session.conversationHistory.filter((m: any) => m.kind === "question");
  const lastQ = qMsgs2[qMsgs2.length - 1] as any;
  const objB = lastQ.objectiveId;
  assert(objB !== objA, `Q2 has different objective (${objB}) than Q1 (${objA})`);

  res = await processAnswer(session, "Second answer about the second topic.");
  const evalObjB = res.session.evaluations[res.session.evaluations.length - 1]?.objectivesAssessed[0];
  assert(evalObjB === objB, `Q2 evaluated against obj B (${objB}), got ${evalObjB}`);
  assert(evalObjB !== objA, `Q2 NOT evaluated against obj A (${objA})`);
}

async function testC() {
  console.log("\n--- Test C: Same topic, different objectives, each preserved ---");
  const day8 = curriculum.days.find((d) => d.day === 8)!;
  const objectives = day8.learningObjectives;
  console.log(`  Day 8 has ${objectives.length} objectives`);

  let { session } = await startInterview(makeProfile({ skippedTopics: [{ topicId: "day-1", day: 1 }, { topicId: "day-2", day: 2 }, { topicId: "day-3", day: 3 }, { topicId: "day-4", day: 4 }, { topicId: "day-5", day: 5 }, { topicId: "day-6", day: 6 }] }), curriculum, "medium");

  const answeredObjectives: { q: string; evalObj: string }[] = [];

  for (let i = 0; i < Math.min(4, objectives.length); i++) {
    const qMsgs = session.conversationHistory.filter((m: any) => m.kind === "question");
    const lastQ = qMsgs[qMsgs.length - 1] as any;

    const res = await processAnswer(session, `Answer ${i + 1} about the topic with some technical details.`);
    session = res.session;

    const evalObj = res.session.evaluations[res.session.evaluations.length - 1]?.objectivesAssessed[0];
    answeredObjectives.push({ q: lastQ.objectiveId, evalObj });
  }

  const allMatch = answeredObjectives.every((a) => a.q === a.evalObj);
  assert(allMatch, `All ${answeredObjectives.length} questions evaluated against their own objective`);

  const uniqueEvalObjs = new Set(answeredObjectives.map((a) => a.evalObj));
  assert(uniqueEvalObjs.size > 1, `Multiple objectives assessed (${uniqueEvalObjs.size} unique), not all the same`);
}

async function testD() {
  console.log("\n--- Test D: Answer evaluated against question's objective, not a different one ---");
  let { session } = await startInterview(makeProfile({ skippedTopics: [{ topicId: "day-1", day: 1 }, { topicId: "day-2", day: 2 }, { topicId: "day-3", day: 3 }, { topicId: "day-4", day: 4 }, { topicId: "day-5", day: 5 }, { topicId: "day-6", day: 6 }] }), curriculum, "medium");

  for (let i = 0; i < 3; i++) {
    const res = await processAnswer(session, `Answer ${i + 1}`);
    session = res.session;
  }

  const day8 = curriculum.days.find((d) => d.day === 8)!;
  const roleObjective = day8.learningObjectives.find((o) => o.description.toLowerCase().includes("role"))!;
  const chromaObjective = day8.learningObjectives.find((o) => o.description.toLowerCase().includes("chroma") || o.description.toLowerCase().includes("local"))!;
  const pineconeObjective = day8.learningObjectives.find((o) => o.description.toLowerCase().includes("pinecone") || o.description.toLowerCase().includes("cloud"))!;

  const chromaAnswer = `I would use ChromaDB as a local vector database. It's easy to set up with Python and works well for development.`;

  const qMsgsBefore = session.conversationHistory.filter((m: any) => m.kind === "question");
  const lastQBefore = qMsgsBefore[qMsgsBefore.length - 1] as any;

  const res = await processAnswer(session, chromaAnswer);
  session = res.session;

  const evalObj = res.session.evaluations[res.session.evaluations.length - 1]?.objectivesAssessed[0];
  const modelAnswer = res.session.questionReviews[res.session.questionReviews.length - 1]?.modelAnswer ?? "";

  assert(evalObj === lastQBefore.objectiveId, `Eval objective (${evalObj}) matches question (${lastQBefore.objectiveId})`);
  assert(modelAnswer.length > 50, `Model answer is substantive (${modelAnswer.length} chars)`);

  if (lastQBefore.objectiveId === roleObjective.id) {
    assert(modelAnswer.toLowerCase().includes("role") || modelAnswer.toLowerCase().includes("rag") || modelAnswer.toLowerCase().includes("vector"), `Model answer is relevant to "role of vector databases" objective`);
  }

  assert(evalObj !== pineconeObjective.id || modelAnswer.toLowerCase().includes("comparison") || modelAnswer.toLowerCase().includes("compare"), `If eval is for Pinecone, model answer reflects comparison objective`);
  assert(modelAnswer.toLowerCase().includes("vector") || modelAnswer.toLowerCase().includes("database") || modelAnswer.toLowerCase().includes("embedding") || modelAnswer.toLowerCase().includes("rag") || modelAnswer.toLowerCase().includes("ollama") || modelAnswer.toLowerCase().includes("install"), `Model answer contains domain-relevant content`);
}

main().catch((e) => { console.error("CRASHED:", e); process.exit(1); });
