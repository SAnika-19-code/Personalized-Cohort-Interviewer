import type { CurriculumDay } from "@/types";
import { keywordMatchesAnswer } from "./index";

export interface ModelAnswer {
  summary: string;
  sections: ModelSection[];
  expectedConcepts: string[];
  evaluationCriteria: string[];
}

export interface ModelSection {
  heading: string;
  points: string[];
}

const SETUP_SECTIONS = (tools: string[], objective: string): ModelSection[] => [
  {
    heading: "Installation & Setup",
    points: [
      "Install and configure the required tools (" + tools.join(", ") + ") for your platform",
      "Follow platform-specific installation steps (package manager, binary download, or script)",
      "Verify the installation succeeds and the tool is accessible from the terminal",
    ],
  },
  {
    heading: "Configuration",
    points: [
      "Set up the initial configuration (environment variables, config files, or settings)",
      "Configure any required integrations or extensions",
      "Validate that the environment is correctly configured",
    ],
  },
  {
    heading: "Verification",
    points: [
      "Run a smoke test or hello-world example to confirm everything works",
      "Check for common version conflicts or missing dependencies",
      "Document the working configuration for reproducibility",
    ],
  },
];

const BUILD_SECTIONS = (tools: string[], objective: string): ModelSection[] => [
  {
    heading: "Architecture & Planning",
    points: [
      "Define the data model, schema, or component structure before writing code",
      "Choose appropriate tools and libraries based on the requirements (" + tools.join(", ") + ")",
      "Plan the main processing steps or component interactions",
    ],
  },
  {
    heading: "Implementation",
    points: [
      "Implement the core logic with clear, modular code",
      "Handle edge cases (missing data, boundary conditions, error states)",
      "Use appropriate data structures and algorithms for the scale of the problem",
    ],
  },
  {
    heading: "Validation & Testing",
    points: [
      "Test with realistic data volumes and edge cases",
      "Verify outputs against known expectations or benchmarks",
      "Check for data integrity, consistency, and correctness",
    ],
  },
];

const AI_CORE_SECTIONS = (tools: string[], objective: string): ModelSection[] => [
  {
    heading: "Core Concept",
    points: [
      "Explain what this technology does and why it matters in the system",
      "Describe the underlying mechanism or algorithm in concrete terms",
      "Connect it to the broader AI/ML pipeline context",
    ],
  },
  {
    heading: "Practical Application",
    points: [
      "Demonstrate how to apply this using " + tools.slice(0, 2).join(" or "),
      "Show the input/output transformation with a concrete example",
      "Discuss parameter choices and their effects on results",
    ],
  },
  {
    heading: "Trade-offs & Limitations",
    points: [
      "Name the key trade-offs (accuracy vs. cost, speed vs. quality, etc.)",
      "Discuss when this approach is appropriate vs. when to use an alternative",
      "Identify common failure modes and how to mitigate them",
    ],
  },
];

const LEARN_SECTIONS = (tools: string[], objective: string): ModelSection[] => [
  {
    heading: "Conceptual Foundation",
    points: [
      "Define the concept clearly in your own words",
      "Explain the underlying principles or theory",
      "Distinguish it from related but distinct concepts",
    ],
  },
  {
    heading: "When & Why",
    points: [
      "Describe the problem this solves and why it matters",
      "Give concrete scenarios where this is the right approach",
      "Explain the consequences of not understanding this concept",
    ],
  },
  {
    heading: "Comparison",
    points: [
      "Compare with alternative approaches or techniques",
      "Discuss the trade-offs of each option",
      "Justify when you would choose one over another",
    ],
  },
];

const SHIP_IT_SECTIONS = (tools: string[], objective: string): ModelSection[] => [
  {
    heading: "Deployment & Integration",
    points: [
      "Package the application for deployment (containerization, bundling)",
      "Configure environment-specific settings (secrets, endpoints, scaling)",
      "Integrate with existing infrastructure and services",
    ],
  },
  {
    heading: "Production Readiness",
    points: [
      "Set up monitoring, logging, and alerting for key metrics",
      "Implement health checks and graceful error handling",
      "Plan for rollback, disaster recovery, and data backup",
    ],
  },
  {
    heading: "Validation",
    points: [
      "Run end-to-end tests against production-like data",
      "Verify performance under expected load",
      "Confirm security, compliance, and access control requirements",
    ],
  },
];

const OPTIMIZE_SECTIONS = (tools: string[], objective: string): ModelSection[] => [
  {
    heading: "Measurement",
    points: [
      "Identify and measure the key performance metrics (latency, throughput, cost)",
      "Establish a baseline before making changes",
      "Profile to find the actual bottleneck rather than guessing",
    ],
  },
  {
    heading: "Optimization Strategy",
    points: [
      "Apply targeted optimizations based on profiling data",
      "Consider caching, batching, parallelism, or algorithmic improvements",
      "Evaluate trade-offs between complexity and performance gain",
    ],
  },
  {
    heading: "Verification",
    points: [
      "Measure the improvement against the baseline",
      "Ensure correctness is preserved after optimization",
      "Document the changes and their measured impact",
    ],
  },
];

function sectionsForType(
  type: string | undefined,
  tools: string[],
  objective: string
): ModelSection[] {
  const t = (type ?? "").toUpperCase();
  if (t === "SETUP") return SETUP_SECTIONS(tools, objective);
  if (t === "BUILD") return BUILD_SECTIONS(tools, objective);
  if (t === "AI_CORE") return AI_CORE_SECTIONS(tools, objective);
  if (t === "LEARN") return LEARN_SECTIONS(tools, objective);
  if (t === "SHIP_IT") return SHIP_IT_SECTIONS(tools, objective);
  if (t === "OPTIMIZE" || t === "CAPSTONE") return OPTIMIZE_SECTIONS(tools, objective);
  return BUILD_SECTIONS(tools, objective);
}

export function generateDomainModelAnswer(
  topic: CurriculumDay,
  objective: { id: string; description: string; keywords?: string[] },
  candidateAnswer: string
): ModelAnswer {
  const tools = topic.tools ?? [];
  const keywords = objective.keywords ?? [];
  const sections = sectionsForType(topic.type, tools, objective.description);

  const expectedConcepts = keywords.length > 0 ? keywords : tools;

  const evaluationCriteria = [
    "References key concepts: " + expectedConcepts.slice(0, 5).join(", "),
    "Explains the how and why, not just the what",
    "Mentions relevant tools and their appropriate use",
    "Discusses trade-offs, edge cases, or limitations where applicable",
  ];

  if ((topic.type ?? "").toUpperCase() === "AI_CORE") {
    evaluationCriteria.push("Connects the concept to the broader AI/ML pipeline");
  }
  if ((topic.type ?? "").toUpperCase() === "BUILD") {
    evaluationCriteria.push("Describes concrete implementation steps");
  }

  const summary = topic.title + " — " + objective.description + ".";

  return {
    summary,
    sections,
    expectedConcepts,
    evaluationCriteria,
  };
}

export function formatModelAnswer(model: ModelAnswer): string {
  const parts: string[] = [];
  parts.push("**" + model.summary + "**");

  for (const section of model.sections) {
    parts.push("");
    parts.push("**" + section.heading + "**");
    for (const point of section.points) {
      parts.push("- " + point);
    }
  }

  parts.push("");
  parts.push("**What a strong answer includes:**");
  for (const criterion of model.evaluationCriteria) {
    parts.push("- " + criterion);
  }

  return parts.join("\n");
}

export function findMissingConcepts(
  candidateAnswer: string,
  expectedConcepts: string[]
): string[] {
  const normalized = candidateAnswer.toLowerCase();
  const answerWords = normalized.split(/\W+/).filter((w) => w.length >= 3);
  return expectedConcepts.filter((kw) => !keywordMatchesAnswer(kw, answerWords));
}
