# AI Technical Interviewer

A production-quality full-stack web application that simulates a realistic, adaptive, multi-turn technical interview using uploaded Curriculum JSON and Candidate Profile JSON.

## Features

- **Three-screen flow**: Setup → Interview → Wrap-up
- **Adaptive questioning** based on curriculum, candidate profile, and conversation history
- **Dynamic difficulty** (1–5) that adjusts after each answer
- **Personalization** using completed missions, attempts, skipped topics, and learning signals
- **Structured evaluation** across concept accuracy, completeness, depth, reasoning, and communication
- **Export** interview reports as PDF or Markdown
- **Dark mode UI** with Framer Motion animations and react-markdown support

## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui components
- Framer Motion
- Zustand (state management)
- jsPDF (PDF export)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Sample Data

Sample JSON files are included in `public/samples/` (same format as the root `curriculum.json` and `candidates.json`):

- `curriculum.json` — 31-day AI cohort curriculum with modules, days, objectives, and tools
- `candidates.json` — Multiple candidates with missions, attempts, skips, and learning signals

Upload both files on the setup screen, then **select a candidate** from the dropdown to start an interview.

## Project Structure

```
app/                    # Next.js App Router pages & API routes
  api/interview/        # start, next, end endpoints
components/
  chat/                 # Chat timeline, bubbles, answer input
  upload/               # File upload with drag & drop
  report/               # Wrap-up screen
  ui/                   # shadcn-style primitives
lib/
  interview/            # Engine, topic selection
  evaluator/            # Answer evaluation logic
  questionGenerator/    # Adaptive question generation
  parser/               # JSON validation & parsing
  export/               # PDF & Markdown export
types/                  # Shared TypeScript interfaces
hooks/                  # Zustand store
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start` | Initialize session, return first question |
| POST | `/api/interview/next` | Process answer, return next question |
| POST | `/api/interview/end` | Generate final evaluation report |

## Architecture Notes

The interview engine is modular by design. Question generation and evaluation logic live in separate modules (`lib/questionGenerator`, `lib/evaluator`) and can be swapped for LLM provider integrations (e.g., OpenAI Responses API) with minimal changes to orchestration (`lib/interview/engine.ts`) and API routes.

## License

MIT
