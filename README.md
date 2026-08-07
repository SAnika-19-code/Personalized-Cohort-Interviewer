# AI Technical Interviewer

A production-quality full-stack web application that simulates a realistic, adaptive, multi-turn technical interview using uploaded Curriculum JSON and Candidate Profile JSON. Built for the AI Cohort interview challenge.

---

## 🎯 Overview

**AI Technical Interviewer** is an intelligent interview simulation platform that conducts personalized, adaptive technical interviews. It ingests a structured curriculum (31-day AI cohort) and candidate learning history (completed missions, attempts, skipped topics, learning signals) to generate context-aware questions, evaluate responses across five dimensions, and produce comprehensive hiring reports.

### Why This Stands Out

| Dimension | Implementation |
|-----------|----------------|
| **Adaptive Intelligence** | Dynamic difficulty (1–5) adjusts after every answer; topic selection prioritizes skipped/weak areas |
| **Conversational Realism** | Natural acknowledgements, contextual follow-ups, smooth topic transitions |
| **Structured Evaluation** | 5-dimension scoring: Technical Accuracy, Completeness, Depth, Reasoning, Communication + Code Quality |
| **Personalization Engine** | Uses completed missions, attempt counts, skipped topics, weak/strong signals, job role, experience |
| **Production Polish** | Dark mode UI, Framer Motion animations, 120s question timer, skip tokens, hints, PDF/MD/JSON export |

---

## ✨ Features

### 🔧 Setup & Configuration
- **Dual JSON Upload** — Drag-and-drop curriculum + candidates files with real-time validation
- **Candidate Selection** — Dropdown with name, ID, job role; auto-loads first candidate
- **Interview Style Presets** — Easy / Medium / Hard (maps to initial difficulty 2/3/4 with adaptive range)
- **Visual Status Panel** — Live preview of loaded curriculum days, candidate count, readiness state

### 🎤 Interview Experience
- **Three-Screen Flow** — Setup → Interview → Wrap-up with animated transitions
- **Real-Time Header** — Topic, question number, dynamic difficulty label, countdown timer (120s), total elapsed, skip tokens
- **Smart Timer** — Color-coded (green → yellow → red), continues past zero with "time's up" notice
- **Chat Timeline** — Interviewer/candidate bubbles with markdown rendering, system messages, hints
- **Answer Input** — Auto-resizing textarea, Enter to submit, Shift+Enter for newline

### 🧠 Adaptive Question Generation
- **Scenario-Based Templates** — 5 difficulty levels (1–5) with role-aware framing (mentor → architect → senior director)
- **Curriculum-Driven** — Questions map to specific learning objectives with keywords
- **Personalization Hooks**:
  - High-score completions → verification questions
  - Skipped topics → diagnostic assessment
  - Multiple attempts → deeper probing
  - Weak learning signals → extended coverage
  - Strong signals → difficulty escalation
- **Contextual Follow-Ups** — 25+ keyword-triggered probes (Redis, JWT, microservices, Docker, APIs, testing, CI/CD, monitoring, scaling, security, trade-offs, debugging)

### 💬 Conversational Intelligence
- **Natural Acknowledgements** — 15 varied phrases ("That makes sense.", "Interesting approach.")
- **Contextual Remarks** — 16 reinforcers ("Good observation.", "That's a solid foundation.")
- **Smooth Transitions** — 8 topic-switch phrases ("Let's move to another topic.")
- **Follow-Up Logic** — Max 2 consecutive follow-ups; switches topic on strong correct answers
- **Misconception Detection** — Pattern-based probes for common misunderstandings (RAG, scaling, security)

### 📊 Structured Evaluation (5 Dimensions + Code Quality)
| Dimension | Weight | Signals |
|-----------|--------|---------|
| **Technical Accuracy** | 25% | Keyword coverage, answer length, concept correctness |
| **Completeness** | 20% | Keyword density, breadth of coverage |
| **Depth** | 20% | Difficulty scaling, length tiers, keyword richness |
| **Problem Solving** | 20% | Reasoning keywords, trade-off language, conditional thinking |
| **Communication** | 10% | Structure markers, examples, code blocks, length |
| **Code Quality** | 5% | Language tags, error handling, syntax patterns, length |

- **Confidence Scoring** — Hedging vs. certainty language
- **Misconception Flags** — Targeted follow-up questions
- **Partial Credit** — Three-tier: Correct / Partial / Incorrect

### 🎮 Interview Controls
- **Hint System** — One hint per question; reveals objective keywords + description
- **Skip Tokens** — 2 tokens per interview; advances to next topic with transition
- **Early End** — "End & Evaluate" button generates final report immediately
- **Auto-End Conditions** — Question cap (8–15 based on curriculum) OR 65% objective coverage + 6+ questions

### 📄 Comprehensive Reporting
- **Overall Score** (0–100) with color-coded progress bar
- **Score Breakdown** — 5-dimension bars with individual scores
- **Strengths & Weaknesses** — Auto-derived from evaluation patterns
- **Topic Breakdown Table** — Per-topic scores, days, objectives covered
- **Interview Summary** — Narrative with readiness assessment
- **Recommendations** — Actionable, context-aware (foundations, depth, communication, skipped topics, projects)
- **Next Topics to Review** — Prioritized from weak signals, skips, low scores (max 5)
- **Communication Feedback** — Tiered narrative (Excellent / Good / Needs Improvement)
- **Question Review** — Side-by-side: Question | Candidate Answer | Model Answer | Feedback
- **Model Answer Generation** — Dynamic, references curriculum objectives, tools, keywords, code examples

### 📤 Export Options
- **PDF** — Multi-page, formatted report via jsPDF
- **Markdown** — Full report with tables, ready for Notion/GitHub
- **JSON** — Raw report object for programmatic use
- **Clipboard** — One-click Markdown copy

### 🎨 UI/UX Polish
- **Dark Mode** — Slate/neutral palette with accent colors
- **Framer Motion** — Screen transitions, staggered reveals, hover/tap feedback
- **Responsive** — Mobile-friendly layout, collapsible header
- **Accessibility** — Semantic HTML, focus states, ARIA labels, color contrast
- **Loading States** — Spinners, disabled buttons, skeleton screens
- **Error Handling** — Toast notifications with dismiss

---

## 🏗 Architecture

```
app/
├── api/interview/
│   ├── start/route.ts    # Initialize session, return first question
│   ├── next/route.ts     # Process answer/skip, return next question
│   ├── hint/route.ts     # Generate contextual hint
│   └── end/route.ts      # Generate final evaluation report
├── layout.tsx            # Root layout, fonts, globals
└── page.tsx              # Entry point → AppShell

components/
├── AppShell.tsx          # Screen orchestration, API integration
├── SetupScreen.tsx       # File upload, candidate select, style picker
├── InterviewScreen.tsx   # Header, timer, chat, input, controls
├── report/WrapUpScreen.tsx  # Full report viewer + exports
├── chat/
│   ├── ChatTimeline.tsx  # Message list with animations
│   ├── ChatBubble.tsx    # Role-styled bubbles, markdown
│   └── AnswerInput.tsx   # Auto-resize textarea
├── upload/FileUpload.tsx # Drag-drop, validation, preview
└── ui/                   # Button, Progress (shadcn-style primitives)

lib/
├── interview/
│   ├── engine.ts         # Session lifecycle, orchestration
│   ├── topicSelector.ts  # Priority-based topic selection, difficulty
│   └── conversational.ts # Acknowledgements, remarks, transitions
├── questionGenerator/    # Scenario templates, follow-ups, personalization
├── evaluator/            # 5-dimension scoring, misconceptions
├── export/               # PDF, Markdown, JSON generation
└── parser/               # JSON validation, normalization, utilities

types/
├── index.ts              # Core interfaces (Session, Report, Evaluation, etc.)
└── upload.ts             # Raw upload schemas

hooks/
└── useInterviewStore.ts  # Zustand store (screen, session, report, loading, error)
```

### Data Flow
```
Upload JSON → Parse/Validate → Normalize → Create Session
    ↓
Start Interview → Generate Opening + First Question
    ↓
[Answer → Evaluate → Adjust Difficulty → Conversational Response → Next Question] × N
    ↓
End Interview → Aggregate Evaluations → Generate Report → Export
```

### Modularity
- **Question Generation** (`lib/questionGenerator`) — Swappable for LLM providers
- **Evaluation** (`lib/evaluator`) — Replaceable with LLM-as-judge
- **Engine** (`lib/interview/engine.ts`) — Pure orchestration, no LLM calls
- **API Routes** — Thin adapters over engine functions

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | React 19 + TypeScript 5.7 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui primitives |
| **Animation** | Framer Motion 11 |
| **State** | Zustand 5 |
| **Markdown** | react-markdown 9 + remark-gfm |
| **Export** | jsPDF 2.5 |
| **Icons** | Lucide React |
| **Utilities** | clsx, tailwind-merge, class-variance-authority |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sample Data
Pre-built samples in `public/samples/`:
- `curriculum.json` — 31-day AI cohort, 8 modules, 31 days, tools + objectives per day
- `candidates.json` — Multiple candidates with missions, attempts, skips, signals, job roles

**Workflow:**
1. Upload `curriculum.json`
2. Upload `candidates.json`
3. Select candidate from dropdown
4. Choose interview style (Easy/Medium/Hard)
5. Click **Start Interview**

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/interview/start` | Initialize session, return first question |
| `POST` | `/api/interview/next` | Process answer or skip, return next question |
| `POST` | `/api/interview/hint` | Generate contextual hint for current question |
| `POST` | `/api/interview/end` | Generate final evaluation report |

### Request/Response Examples

**Start Interview**
```json
POST /api/interview/start
{
  "candidateProfile": { "candidateId": "c1", "name": "Alex", "jobRole": "ML Engineer", ... },
  "curriculum": { "cohort": "...", "modules": [...], "days": [...] },
  "selectedDifficulty": "medium"
}
```
```json
{
  "session": { "sessionId": "...", "candidateProfile": {...}, "curriculum": {...}, ... },
  "firstQuestion": "Welcome, Alex. ... Let's begin with Day 7 — Embeddings & Vector Search."
}
```

**Next Question**
```json
POST /api/interview/next
{
  "session": { ... },
  "candidateAnswer": "I would use FAISS for vector search..."
}
```
```json
{
  "interviewerMessage": "That makes sense. Good observation.\n\nHow did you decide what to cache versus fetch directly from the database?",
  "updatedSession": { ... },
  "isComplete": false
}
```

---

## 🧪 Sample Curriculum Format

```json
{
  "cohort": "AI Cohort · 31 days · 8 modules",
  "modules": [
    { "n": 1, "title": "Environment & Tooling", "days": [1, 3] },
    { "n": 2, "title": "Data Foundations", "days": [4, 6] }
  ],
  "days": [
    {
      "day": 7,
      "title": "Embeddings & Vector Search",
      "type": "CORE",
      "tools": ["sentence-transformers", "FAISS", "Chroma"],
      "objectives": [
        { "id": "obj-1", "description": "Generate embeddings for semantic search", "keywords": ["embedding", "vector", "semantic", "similarity"] },
        { "id": "obj-2", "description": "Index and query with FAISS", "keywords": ["FAISS", "index", "query", "ANN"] }
      ]
    }
  ]
}
```

---

## 👤 Sample Candidate Format

```json
{
  "candidates": [
    {
      "member": {
        "id": "cand-001",
        "name": "Alex Chen",
        "jobRole": "ML Engineer",
        "yearsExperience": 3,
        "education": "MS Computer Science"
      },
      "missions": [
        { "day": 7, "title": "Embeddings & Vector Search", "passed": true, "attempts": 1, "skipped": false }
      ],
      "signals": {
        "commitDays": 28,
        "missionsCompleted": 25,
        "missionsFirstTry": 22
      }
    }
  ]
}
```

---

## 🔬 Technical Highlights

### Priority-Based Topic Selection
```typescript
// lib/interview/topicSelector.ts
function getTopicPriority(topic, profile) {
  let priority = 50;
  // Completed with high score → low priority (brief verification)
  // Skipped → highest priority (diagnostic)
  // 3+ attempts → high priority (probe deeper)
  // Weak signal → high priority (remediation)
  // Strong signal → low priority (escalate difficulty)
  return { topicInfo: topic, priority, reason };
}
```

### Dynamic Difficulty Adjustment
```typescript
// 1-5 scale, adjusts ±2 per answer
if (overall >= 85 && isCorrect)      next = min(5, current + 2);
else if (overall >= 70 && isCorrect) next = min(5, current + 1);
else if (overall >= 50 || isPartial) next = current;
else if (overall >= 30)              next = max(1, current - 1);
else                                 next = max(1, current - 2);
```

### Conversational Response Generation
- Acknowledges answer naturally
- Adds reinforcing remark
- Decides: follow-up (max 2) vs. topic switch
- Uses keyword extraction for contextual probes

### Model Answer Synthesis
- References curriculum objective + tools
- Identifies missed keywords from candidate answer
- Includes code example for implementation topics
- Structured: concept → workflow → trade-offs → verification

---

## 📦 Project Structure (Full)

```
├── app/
│   ├── api/interview/start|next|hint|end/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AppShell.tsx
│   ├── SetupScreen.tsx
│   ├── InterviewScreen.tsx
│   ├── report/WrapUpScreen.tsx
│   ├── chat/ChatTimeline.tsx
│   ├── chat/ChatBubble.tsx
│   ├── chat/AnswerInput.tsx
│   ├── upload/FileUpload.tsx
│   └── ui/{button.tsx,progress.tsx}
├── hooks/useInterviewStore.ts
├── lib/
│   ├── utils.ts
│   ├── interview/engine.ts
│   ├── interview/topicSelector.ts
│   ├── interview/conversational.ts
│   ├── questionGenerator/index.ts
│   ├── evaluator/index.ts
│   ├── export/index.ts
│   ├── parser/index.ts
│   └── parser/normalize.ts
├── types/index.ts
├── types/upload.ts
├── public/samples/{curriculum.json,candidates.json}
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── technical-spec.md
```

---

## 🏆 Competition-Ready Checklist

- ✅ **Full specification compliance** — All required endpoints, session management, feedback format
- ✅ **Adaptive multi-turn interviews** — Dynamic difficulty, personalized topics, conversational flow
- ✅ **Structured evaluation** — 5 dimensions + code quality, misconception detection, partial credit
- ✅ **Comprehensive reporting** — Scores, breakdowns, strengths/weaknesses, recommendations, Q&A review
- ✅ **Multiple export formats** — PDF, Markdown, JSON, clipboard
- ✅ **Production UI** — Dark mode, animations, responsive, accessible
- ✅ **Sample data included** — Ready-to-run curriculum + candidates
- ✅ **Clean architecture** — Modular, swappable LLM integration points
- ✅ **TypeScript throughout** — Strict types, shared interfaces
- ✅ **Error handling** — Validation, loading states, toast notifications

---

## 🔮 Extensibility Points

| Component | Swap For |
|-----------|----------|
| `questionGenerator` | OpenAI Responses API, Anthropic, local LLM |
| `evaluator` | LLM-as-judge (GPT-4, Claude), fine-tuned classifier |
| `conversational` | Full dialogue model with memory |
| `topicSelector` | Bandit algorithm, RL-based curriculum planning |
| `export` | HTML, DOCX, Google Docs API, webhook delivery |

---

## 📄 License

MIT — Free to use, modify, and distribute.

---

## 🙏 Acknowledgments

Built for the AI Cohort Interview Challenge. Inspired by real technical interview practices, adaptive learning systems, and conversational AI research.