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