# 🤖 Vibe Coding Manifest: AI Technical Interviewer

Welcome judges! This project was built using an iterative "vibe coding" workflow: brainstorming concepts and architecture through conversational AI, generating comprehensive master prompts, and executing them in AI coding tools.

Below is the structured breakdown of the core prompts that built the application.

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer

Welcome judges! This project was built using an iterative "vibe coding" workflow: brainstorming core mechanics with conversational AI, synthesizing technical requirements into modular implementation phases, and executing them within the Cursor IDE to build an adaptive, production-quality interview platform.

---

## 1. Project Genesis & Architecture
*The foundational prompt used to establish the stack, define the interview engine's behavior, and set the UI/UX constraints.*

> **Prompt:**
> ```text
> Build a production-quality full-stack web application called "AI Technical Interviewer." 
> 
> Goal: Simulate an adaptive, multi-turn technical interview using uploaded Curriculum JSON and Candidate Profile JSON. It must feel like a senior engineer, not a scripted quiz.
> 
> Tech Stack: Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion. 
> Constraints: No Auth, No DB, session-only state (Zustand/Context).
> 
> Architecture: Modularize logic into /lib/interview, /lib/evaluator, and /lib/questionGenerator. Ensure the Interview Engine is decoupled so that replacing the LLM logic later requires minimal changes.
> 
> API Endpoints to implement:
> - POST /api/interview/start (Input: candidateProfile, curriculum | Returns: session, firstQuestion)
> - POST /api/interview/next (Input: session, candidateAnswer | Returns: interviewerMessage, updatedSession)
> - POST /api/interview/end (Returns: report)
> 
> Code Quality: Use TypeScript everywhere, separate business logic from UI, and write reusable components.
> ```

---

## 2. Application Flow & Component Scaffolding
*Instructions provided to set up the 3-screen interface (Setup, Interview, Wrap-up).*

> **Prompt:**
> ```text
> Implement the application flow using three distinct screens:
> 
> 1. Setup Screen: Implement dual drag-and-drop file upload for Curriculum and Candidate JSONs. Include validation (show errors if JSON cannot be parsed) and disable the "Start Interview" button until both files are valid.
> 2. Interview Screen: Create a sticky, desktop-first chat interface. The setup panel must disappear completely. Include alternating chat bubbles, auto-scroll, character counting, and a loading state ("Interviewer is evaluating your answer...") while waiting for responses.
> 3. Wrap-up Screen: Create a dynamic report view displaying overall scores, strengths, weaknesses, topic breakdowns, and recommendations, along with export functionality (jsPDF and Markdown copy).
> 
> Follow the provided UI Theme palette (Dark mode background #0F172A, panels #1E293B, AI bubble #334155, Candidate bubble #2563EB, accent #38BDF8).
> ```

---

## 3. The "Engine" Logic (AI Behavior & Adaptation)
*The core prompt defining how the AI "thinks," adapts difficulty, and evaluates responses.*

> **Prompt:**
> ```text
> Implement the Interview Engine logic:
> - AI Behavior: Follow the "One Question at a Time" rule. Never dump multiple questions, never reveal answers, and never behave like a quiz.
> - Personalization Rules: Use the Candidate Profile JSON. Completed missions get brief verification; high attempts mean probe deeper; skipped topics trigger diagnostic questions; weak signals get more time; strong performance increases difficulty.
> - Evaluation Engine: After every answer, evaluate Concept Accuracy, Completeness, Depth, Reasoning, Communication, and Confidence against the curriculum objectives without simple keyword matching. Update strengths, weaknesses, and progress in the Interview State object.
> - Difficulty Adaptation: Maintain a 1-5 difficulty scale. Adjust dynamically based on candidate performance, which influences abstraction, architecture questions, and edge cases.
> - Follow-up Logic: Probe misconceptions on incorrect answers and ask deeper follow-up questions on correct answers without immediately correcting the candidate.
> ```

---

## 4. UI Polish & Export Functionality
*Final instructions used for refining the user experience and report generation.*

> **Prompt:**
> ```text
> Perform a final polish pass:
> - Ensure all animations (Framer Motion) on chat bubbles feature subtle fade + slide effects.
> - Integrate jsPDF and Markdown generation so users can save or copy their performance reports accurately from the wrap-up screen.
> - Ensure all keyboard shortcuts (Enter to submit, Shift+Enter for newline) are functional, responsive, and fully accessible with proper focus management.
> - Implement graceful error handling for invalid JSON uploads and failed API requests.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Extended Features)

Welcome judges! This file covers the second iteration of our "vibe coding" workflow, where we expanded the platform with stateless utility features, enhanced evaluation metrics, and advanced workflow utilities like voice input and skip tokens.

---

## 5. In-Session Interview Controls & Modifiers
*Prompts used to implement real-time session controls, difficulty scaling, timers, and hints.*

> **Prompt:**
> ```text
> Enhance the application with in-session interactive controls, keeping everything entirely stateless (browser session only):
> 
> 1. Live Interview Timer: Add a configurable countdown timer for each question (default 2 mins) and display total duration. When expired, notify the candidate but allow them to continue (no auto-submit). Reset per question.
> 2. Hint / Clarity Button: Add a single-use "Hint" button beside questions that asks the AI to rephrase or provide a conceptual clue derived exclusively from the Curriculum JSON without revealing the answer.
> 3. Difficulty Selector: Provide a pre-interview selector (Easy / Medium / Hard) that alters the AI's persona and questioning style (ranging from a friendly mentor to a strict Senior Engineering Manager probing edge cases).
> ```

---

## 6. Rich Evaluation & Syntax Highlighting
*Prompts focused on upgrading the wrap-up report with model answer comparisons, granular category scores, and code formatting.*

> **Prompt:**
> ```text
> Enhance the evaluation and reporting engine with the following:
> 
> 1. Model Answer Comparison: On the wrap-up screen, display a comprehensive breakdown for every evaluated question showing the Question, Candidate Answer, Model Answer (with code examples and missed concepts), and Feedback.
> 2. Granular Score Breakdown: Replace the single overall score with independent category metrics (Technical Accuracy, Communication Clarity, Completeness, Problem Solving, Code Quality) using progress bars or radar charts alongside strengths and recommendations.
> 3. Automatic Code Syntax Highlighting: Automatically detect fenced Markdown code blocks in both candidate responses and AI outputs, rendering them with a syntax highlighter supporting Python, JavaScript, TypeScript, JSON, SQL, and Bash.
> ```

---

## 7. Workflow Utilities & Skip Tokens
*Prompts for local browser exports and interview navigation tools.*

> **Prompt:**
> ```text
> Implement stateless workflow utility features:
> 
> 1. Instant Chat Export: Provide local browser-based generation for exporting the full session either as a structured downloadable JSON file or a clean Markdown summary report.
> 2. Skip Question Tokens: Give each interview 2 Skip Tokens displayed in the header. Clicking skip consumes a token, marks the question in the summary, and forces the AI to pivot to a new topic. Disable the button when tokens reach zero.
> ```

---

## 8. Speech-to-Text (Whisper Flow)
*Prompts for integrating voice input safely as an alternative text-entry method.*

> **Prompt:**
> ```text
> Implement an optional voice input feature inside the answer input box:
> - Workflow: Candidate clicks a microphone icon to record audio locally via MediaRecorder API. Audio is sent to a Speech-to-Text API (e.g., Whisper) and the resulting transcript is inserted into the text area.
> - Rules: Do not auto-submit. Allow manual stopping, editing of transcribed text, and graceful fallback to manual typing with clear UI states (Recording, Transcribing, Inserted).
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Conversational Agent Upgrade)

Welcome judges! This file covers the third iteration of our "vibe coding" workflow, where we transformed the AI interviewer from a rigid, checklist-driven chatbot into a natural, adaptive conversationalist that actively listens, acknowledges responses, and steers dialogue like a senior engineer.

---

## 9. Conversational Flow & Active Listening Engine
*Prompts used to upgrade the AI's response generation so it listens, acknowledges, and adapts dynamically instead of reading from a static script.*

> **Prompt:**
> ```text
> Transform the AI interviewer engine from a static question generator into an active, conversational interviewer:
> 
> 1. Strict Response Structure: Every interviewer response must follow a 3-part format:
>    - [Acknowledgement]: Brief validation (5-15 words, e.g., "Thanks for explaining that.", "That makes sense.")
>    - [Short Remark]: One concise conversational remark assessing design choices or trade-offs without revealing scores or correctness.
>    - [Next Question]: Exactly ONE next question (either a contextual follow-up or a smooth topic transition).
> 
> 2. Follow-up Decision Logic: After understanding the candidate's answer, decide whether to drill down (if the answer mentions implementation details, trade-offs, architecture, or security) or transition naturally to a new topic. Enforce a maximum follow-up depth of 2 consecutive follow-ups per root question.
> 
> 3. Tone & Style Constraints: Ensure the AI sounds attentive, curious, and professional like a senior engineering manager. Avoid robotic transitions, repetitive wording, long speeches, and generic praise. Keep total responses under 80 words.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (System Prompt & Persona Engine)

Welcome judges! This file covers the fourth iteration of our "vibe coding" workflow, detailing the comprehensive system prompt and persona-driven execution engine. This engine dictates how the AI transforms from a static question generator into a dynamic, role-aware technical interviewer with distinct difficulty personalities and active listening loops.

---

## 10. System Prompt & Persona Engine
*Prompts used to configure the core AI interviewer system instructions, persona behaviors, active listening constraints, and dynamic adaptation rules.*

> **Prompt:**
> ```text
> Implement the complete System Prompt and Persona Engine for the AI Technical Interviewer to ensure the AI simulates a realistic, human-like engineering interviewer:
> 
> 1. Core Role & Objective: Act as an experienced human technical interviewer rather than a scripted chatbot. Actively listen, acknowledge responses, adapt questioning dynamically, and maintain a natural conversation while objectively assessing technical ability. Never reveal internal scoring, evaluation criteria, or explicitly state whether an answer is correct or incorrect.
> 
> 2. Interviewer Personas & Difficulty Modes:
>    - Easy Mode (Supportive Mentor): Warm, patient, and encouraging. Focuses on fundamental concepts, builds candidate confidence, allows ample time to explain, guides gently when answers are incomplete, and permits occasional hints.
>    - Medium Mode (Professional Software Engineer): Neutral, curious, and attentive. Conducts a standard engineering interview, expecting complete implementation-level explanations, focusing on architectural design choices, and exploring technical trade-offs.
>    - Hard Mode (Principal / Staff Engineer): Calm, analytical, and technically rigorous. Actively challenges candidate assumptions, probes deep architecture decisions, scalability concerns, failure scenarios, and edge cases. Avoids excessive praise and never provides hints.
> 
> 3. Strict 3-Part Response Structure: Every single interviewer response must naturally follow this format:
>    - Acknowledgement: 1 short sentence (5-15 words, e.g., "Thanks for explaining that.", "Makes sense.", "Interesting approach.") that varies dynamically to prevent repetition.
>    - Brief Remark: 1 conversational sentence evaluating design choices or trade-offs without revealing scores or correctness (e.g., "That's a practical solution.", "I like how you considered performance.").
>    - Next Question: Exactly ONE clear, concise next question—either a contextual follow-up or a smooth topic transition.
> 
> 4. Active Listening & Follow-up Logic: Treat every response as new information. Extract mentioned technologies, frameworks, assumptions, and edge cases. Ask contextual follow-ups only when answers involve implementation details, trade-offs, or incomplete explanations, enforcing a strict maximum depth of 2 consecutive follow-ups before smoothly transitioning to new curriculum topics.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Response Analysis & Strategy Engine)

Welcome judges! This file covers the fifth and final iteration of our "vibe coding" workflow. This architectural upgrade transformed the AI interviewer from a rigid question generator into an intelligent agent powered by a multi-layered response analysis and strategy pipeline.

---

## 11. Response Analysis & Strategy Engine
*Prompts used to implement the intelligent response pipeline, classification models, teaching rules, memorized answer detection, and decoupled architectural modules.*

> **Prompt:**
> ```text
> Redesign the AI Interviewer's Response Handling System to transition from a robotic question-and-score loop into an intelligent, human-like engineering interview experience:
> 
> 1. Architectural Decoupling: Separate the processing system into four independent modules with single responsibilities:
>    - Response Analyzer: Classifies responses (CORRECT, INCORRECT, DOES_NOT_KNOW, PARTIALLY_CORRECT, UNCERTAIN, LOW_EFFORT), detects confidence and misconceptions, and extracts strengths and gaps.
>    - Interview Strategy Engine: Determines the appropriate behavioral strategy (GO_DEEPER, SIMPLIFY, CORRECT_AND_REASK, TEACH_BRIEFLY, ASK_CLARIFICATION, MOVE_FORWARD).
>    - Conversation Generator: Produces natural dialogue tailored to the selected persona and strategy.
>    - Evaluation Engine: Scores responses independently (introducing "Learning Agility" alongside technical accuracy) and stores evidence for the final report.
> 
> 2. Intelligent Response Handling & Teaching Rules:
>    - Incorrect / "I Don't Know": Never skip or ignore errors. Politely identify misconceptions, explain the core concept concisely (2-4 sentences), and immediately validate understanding with a simplified question.
>    - Memorized Answer Detection: If responses appear overly formal, textbook-like, or lack reasoning (depthCheckRequired = true), trigger an implementation pivot to verify genuine practical understanding.
>    - Honesty vs. Confidence: Differentiate scoring between honest uncertainty ("I don't know") and confidently incorrect answers, rewarding learning agility and willingness to reason.
> 
> 3. Actionable Wrap-up & Feedback: Generate granular per-question feedback detailing the root cause of lost points, strengths, specific knowledge gaps, and actionable improvement recommendations rather than generic failure messages.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Conversational Intelligence & Bug Fixes)

Welcome judges! This file covers the sixth and final implementation iteration of our "vibe coding" workflow. Here, we engineered the production-ready conversational intelligence pipeline, fixed critical looping bugs, introduced advanced modular analysis files, and verified the build via full end-to-end smoke tests and type-checking passes.

---

## 12. Conversational Intelligence Pipeline & Bug Fixes
*Prompts used to build the modular backend architecture, eliminate repeated-question loops, wire up the strategy and analysis engines, and integrate Learning Agility metrics into the final wrap-up report.*

> **Prompt:**
> ```text
> Fix the repeated-question bug and build a robust conversational intelligence pipeline so the interviewer adapts dynamically to each answer instead of randomly re-asking questions:
> 
> 1. New Modular Architecture (Backend Files):
>    - lib/interview/responseAnalyzer.ts: Classifies candidate answers (CORRECT, PARTIALLY_CORRECT, INCORRECT, DOES_NOT_KNOW, DID_NOT_UNDERSTAND, UNCERTAIN, LOW_EFFORT, MEMORIZED) by analyzing keyword density, misconceptions, hedging language, and low-effort patterns.
>    - lib/interview/strategyEngine.ts: Selects the next tactical move (follow-up, teach-and-verify, correct-then-follow-up, simplify-and-reask, clarify, transition) based on difficulty adjustment and topic-specific teaching content.
>    - lib/interview/conversationGenerator.ts: Generates the interviewer's final message (supporting rule-based and LLM variants) complete with strict question deduplication ensuring a previously-asked question is never re-asked.
> 
> 2. Engine Rewiring & API Updates:
>    - lib/interview/engine.ts: Rewired processAnswer to execute the full lifecycle: analyze -> evaluate -> strategy -> generate response -> transition topics -> deduplicate, while tracking and recording Learning Agility (average per-answer agility) into the session state.
>    - API Routes & Session Cleanups: Cleaned startInterview to prevent leaking internal difficulty instructions to the candidate, ensured async functions across hint/skip utilities are properly awaited, and updated TypeScript interfaces (types/index.ts) to include Learning Agility in the Interview Report.
> 
> 3. UI & Verification:
>    - WrapUpScreen.tsx: Updated the final report view to display the new "Learning Agility" metric alongside technical scores and feedback.
>    - Verification: Validated strict TypeScript compliance (tsc --noEmit) and production builds (npm run build), ensuring zero duplicate questions across multi-turn smoke tests.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Edge Case Stress Testing & Resilience)

Welcome judges! This file covers the seventh iteration of our "vibe coding" workflow, documenting our rigorous edge-case stress testing phase. Here, we pushed the conversational intelligence pipeline to its limits to ensure absolute production stability and fault tolerance under extreme inputs.

---

## 13. Edge Case Stress Testing & System Resilience
*Prompts and validation records verifying system stability against adversarial inputs, malformed data, low-effort responses, and boundary-condition loops.*

> **Prompt:**
> ```text
> Perform comprehensive stress-testing and fault-tolerance verification across all engine modules under extreme edge-case conditions without crashing or leaking state:
> 
> 1. Adversarial & Malformed Input Handling:
>    - Whitespace-Only & Single-Word Inputs: Ensure inputs like " ", "\n\t", "yes", "no", "idk", or "not sure" are gracefully intercepted by the response analyzer and handled without throwing errors or halting the session.
>    - Extreme Length & Special Characters: Test massive responses (~2000 words) and potential injection strings (XSS, SQL injection, prompt injection attempts) to ensure proper sanitization, neutral classification (off-topic/uncertain), and zero leakages.
>    - Multilingual Inputs: Verify that non-English text (Chinese, Spanish, Japanese) is processed correctly within the evaluation and conversation pipeline.
> 
> 2. Behavioral & Loop Protection:
>    - Misconception Stress-Testing: Confirm that answers laden with heavy misconceptions (e.g., claiming JWT equals encryption or advocating caching everything) successfully trigger the CORRECT_AND_FOLLOW_UP strategy.
>    - Infinite Loop Prevention: Test sustained identical answers and repetitive submissions, ensuring the engine terminates or adapts safely after sequential repeats without freezing.
>    - Boundary Navigation: Validate edge behaviors such as skipping questions near the end of the curriculum and handling explicit requests to "rephrase" or "didn't understand" via SIMPLIFY_AND_REASK triggers.
> 
> 3. Invariant Assertions: Maintain strict runtime invariants across every single test turn: non-empty replies, boolean isComplete states, valid question numbering, difficulty restricted within [1, 5], zero NaN scores, and fail-safe report generation.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Bug Fixes & Output Refinement)

Welcome judges! This file covers the eighth iteration of our "vibe coding" workflow, focusing on identifying and resolving critical output bugs. Here, we fixed grammatical splices in question generation, corrected curriculum metadata mapping in the wrap-up report, upgraded model answer generation from generic templates to contextual technical responses, eliminated repetitive feedback loops, and calibrated code quality scoring defaults.

---

## 14. Bug Fixes & Output Quality Refinement
*Prompts used to resolve grammatical output bugs, correct curriculum column mappings, eliminate circular model answer templates, remove repetitive canned feedback, and fix baseline scoring anomalies.*

> **Prompt:**
> ```text
> Fix critical output bugs and refine the generation pipelines to ensure professional, high-quality presentation across all screens:
> 
> 1. Grammatically Correct Question Splicing: Fix generateQuestion (questionGenerator/index.ts) where raw objective descriptions were spliced mid-sentence (e.g., "what is learn the role..."). Introduce robust text normalization and grammar handling so objectives read naturally (e.g., converting action verbs into gerunds or clean interrogatives).
> 2. Curriculum Metadata & Day Column Fix: Fix the Topic Breakdown table in the wrap-up screen where the Day column incorrectly duplicated the topic title. Map the Day column correctly to actual session days (e.g., Day 4, Day 8) using curriculum identifiers instead of redundant string fields.
> 3. Contextual Model Answer Generation: Replace the circular, generic model answer template in generateModelAnswer with true model answers. They must now generate ideal technical responses based on curriculum objectives, include code snippets where appropriate, and list genuinely missed concepts rather than echoing keywords.
> 4. Dynamic Feedback Generation: Eliminate repetitive canned feedback strings (e.g., "Response did not adequately address...") across multiple turns. Rewrite the feedback generator to explicitly reference what the candidate actually said, detailing specific gaps, misconceptions, and actionable advice.
> 5. Code Quality Default Calibration: Fix the Code Quality score defaulting to an unearned baseline (e.g., 60/100) when no code is written. Adjust the evaluator (assessCodeQuality) to properly handle non-code responses by rendering as "N/A" or omitting unwritten code metrics from the final calculation.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Evaluator Synonym & Substring Matching Fix)

Welcome judges! This file covers the ninth and final technical iteration of our "vibe coding" workflow, focusing on resolving strict evaluation matching anomalies and upgrading the scoring engine to understand semantic equivalents and synonyms.

---

## 15. Evaluator Semantic Synonym & Substring Matching Fix
*Prompts and implementation details fixing strict substring matching failures in the evaluation engine to ensure fair, semantic scoring.*

> **Prompt:**
> ```text
> Fix the evaluation engine's keyword matching logic to eliminate false-negative penalties caused by strict substring comparisons:
> 
> 1. Intelligent Keyword Matching (evaluator/index.ts): Replace strict string matching in countKeywordMatches with a robust keywordMatchesAnswer function that intelligently evaluates semantic equivalence.
> 2. Bidirectional Substring & Synonym Support: Implement automated fuzzy checking to handle grammatical variations and technical synonyms seamlessly (e.g., matching "data" with "datasets", "medical" with "healthcare", "vector" with "embedding", "synthetic" with "generated/mock", and tool equivalents like "chroma" with "chromadb").
> 3. Evaluation Accuracy: Ensure the scoring engine accurately rewards candidates using valid technical synonyms, eliminating unearned low scores on otherwise correct conceptual explanations.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Model Answer Refinement & Semantic Scoring Upgrade)

Welcome judges! This file covers the tenth iteration of our "vibe coding" workflow, focusing on eradicating generic boilerplate model answers and replacing them with rigorous, domain-specific technical references. This upgrade ensures the evaluation engine scores candidates against authentic engineering standards rather than keyword-stuffed templates.

---

## 16. Domain-Specific Model Answer Generation & Scoring Alignment
*Prompts and architectural updates to generate deep, realistic technical model answers and eliminate circular scoring distortion.*

> **Prompt:**
> ```text
> Fix the model-answer generation engine to eliminate generic, template-driven boilerplate (e.g., shoehorning random keyword lists into "Using Pandas, SQLite, SQL, I would build a workflow...") and replace it with authentic, domain-specific technical expectations:
> 
> 1. Contextual Model Answer Architecture (lib/interview/evaluator.ts or modelAnswer generator):
>    - Remove circular keyword-injection templates.
>    - Replace them with a synthesis engine that details concrete engineering steps appropriate to the specific topic (e.g., defining entities, generating synthetic schemas with foreign-key preservation, enforcing statistical realism, injecting edge cases, and handling privacy/compliance).
> 
> 2. Evaluation Engine Alignment:
>    - Ensure the evaluation engine compares candidate responses against these authentic technical model answers rather than weak, generic reference strings.
>    - Eliminate scoring distortion by grading candidates on true conceptual depth, trade-off analysis, and implementation mechanics rather than superficial keyword overlap.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Question-Evaluation Binding & Objective Drift Fix)

Welcome judges! This file covers the eleventh iteration of our "vibe coding" workflow, focusing on fixing objective drift during multi-turn follow-ups and question transitions. This critical fix guarantees that every candidate answer is evaluated strictly against the exact learning objective of the specific question asked, rather than a drifted state ID.

---

## 17. Question-Evaluation Binding & Objective Drift Fix
*Prompts and implementation details solving state drift by binding evaluation context directly to chat messages and verifying objective consistency.*

> **Prompt:**
> ```text
> Fix the question-evaluation binding bug caused by session.currentObjectiveId drifting from the actual question objective during multi-turn follow-ups and topic transitions:
> 
> 1. Message-Level Objective Binding:
>    - Add objectiveId to the ChatMessage interface so that every generated question permanently carries its exact evaluation context.
>    - Store the target objective explicitly alongside every question generated in startInterview, processAnswer, and skipQuestion.
> 
> 2. Context Extraction & Lookup (`findQuestionContext`):
>    - Update the evaluation pipeline to look up the exact question being answered using its bound objectiveId rather than relying on drifted session state.
>    - Implement invariant assertions: log warnings and fall back if a question references a non-existent objective, or log a mismatch if evaluation objectives do not align with the question's objectiveId.
> 
> 3. Verification:
>    - Confirm through rigorous multi-turn testing (including skip paths) that evaluation.objectiveId perfectly matches the originating question's objectiveId across consecutive turns.
> ```

---

---

# 🤖 Vibe Coding Manifest: AI Technical Interviewer (Phase 1 — Evaluation Context Binding Implementation)

Welcome judges! This file covers the twelfth iteration of our "vibe coding" workflow, focusing on the strict implementation of Phase 1 Evaluation Context Binding. This ensures uncompromising integrity between question generation, objective mapping, and evaluation scoring.

---

## 18. Phase 1 Evaluation-Context Integrity & Strict Binding Fix
*Prompts, requirements, and validation test suites enforcing strict question-to-objective tracking without drift or independent re-inference.*

> **Prompt:**
> ```text
> Implement Phase 1 Evaluation-Context Integrity fixes to guarantee that every candidate response is evaluated against the exact question and objective that produced it, without drift or independent re-inference:
> 
> 1. Strict Context Integrity Pipeline:
>    - Enforce the immutable evaluation relationship chain: questionId -> topicId -> objectiveId -> rubric/model-answer context -> candidate response -> evaluator.
>    - Ensure candidate responses retain exact question IDs and the evaluator receives exact associated contexts without searching, inferring, or regenerating objectives from the curriculum.
> 
> 2. Validation & Safety Guards:
>    - Add explicit runtime validation before evaluation ensuring response.questionId matches current questionId, question.topicId matches evaluation topicId, and question.objectiveId matches evaluation objectiveId.
>    - Fail safely with structured diagnostic logging on any context mismatch rather than silently scoring against the wrong objective.
> 
> 3. Preservation & Regression Testing:
>    - Preserve all previous evaluator improvements (conceptual coverage, fuzzy/synonym matching, topic-type-aware model answers, etc.) without altering scoring formulas.
>    - Implement Test A, Test B, Test C, and Test D regression test suites to prove strict objective isolation across multi-turn questions, same-topic distinct objectives, and distinct vector store requirements.
> ```

---

---

