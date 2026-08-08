import type { CurriculumDay } from "@/types";

export interface DepthScores {
  implementationSpecificity: number;
  tradeOffAwareness: number;
  technicalVocabulary: number;
  structuralQuality: number;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractTechnicalTerms(answer: string): string[] {
  const terms: string[] = [];

  const acronyms = answer.match(/\b[A-Z][A-Z0-9]{1,5}(?:[-/][A-Z0-9]+)*\b/g) ?? [];
  terms.push(...acronyms.map((a) => a.toLowerCase()));

  const versioned = answer.match(/\b[A-Z][a-z]+(?:\.js|\.py|\.ts)?\s*\d+(?:\.\d+)*\b/g) ?? [];
  terms.push(...versioned.map((v) => v.toLowerCase().replace(/\s+/g, "")));

  const compoundTech =
    answer.match(/\b(?:[A-Z][a-z]+){2,}\b/g) ?? [];
  terms.push(...compoundTech.map((c) => c.toLowerCase()));

  const hyphenated = answer.match(/\b[a-z]+[-][a-z]+(?:[-][a-z]+)*\b/g) ?? [];
  terms.push(...hyphenated.map((h) => h.toLowerCase()));

  const codeIdentifiers =
    answer.match(/\b[a-z]+(?:_[a-z]+){1,}\b/g) ?? [];
  terms.push(...codeIdentifiers.map((c) => c.toLowerCase()));

  return [...new Set(terms)];
}

export function assessImplementationSpecificity(answer: string, topic: CurriculumDay): number {
  let score = 15;

  const tools = topic.tools ?? [];
  const answerLower = answer.toLowerCase();
  const mentionedTools = tools.filter((t) => answerLower.includes(t.toLowerCase()));
  if (tools.length > 0) {
    score += Math.min(15, (mentionedTools.length / tools.length) * 15);
  }

  const namedProducts =
    answer.match(/\b(?:Synthea|SDV|FastAPI|Streamlit|LangChain|ChromaDB|Pinecone|Ollama|Copilot|Pylance|Pandas|PyPDF|pdfplumber|Docker|Kubernetes|Prometheus|Grafana|PEFT|Transformers|BitsAndBytes|Sentence Transformers|Scikit-learn|OpenAI|Groq|CrewAI|LangGraph|MCP|pgvector|Milvus|Qdrant)\b/gi) ?? [];
  score += Math.min(20, namedProducts.length * 5);

  const commandPatterns =
    /```[\s\S]*?```|`[^`]+`|pip install|npm install|docker (run|compose|build)|git \w+|curl |wget |ollama \w+|python -m|pytest /i;
  if (commandPatterns.test(answer)) score += 12;

  const stepPatterns =
    /step \d|first|second|third|then|next|finally|after that|once you|afterwards|start by|begin by|approach|steps?:/i;
  if (stepPatterns.test(answer)) score += 8;

  const numberedList = /^[\s]*[\d]+[.)]\s+/gm;
  const numberedMatches = answer.match(numberedList);
  if (numberedMatches && numberedMatches.length >= 3) score += 8;

  const configPatterns =
    /config|configure|parameter|setting|flag|option|--\w+|env|environment variable|\.env|api[_-]?key/i;
  if (configPatterns.test(answer)) score += 5;

  const concretePatterns =
    /for example|such as|e\.g\.|like this|specifically|in practice|you would|you can|consists of|includes|contains|comprises|involves|requires/i;
  if (concretePatterns.test(answer)) score += 8;

  const entityPatterns =
    /\b(schema|entity|table|column|field|record|object|component|module|class|interface|api|endpoint|route|service|layer)\b/gi;
  const entityMatches = answer.match(entityPatterns) ?? [];
  score += Math.min(12, entityMatches.length * 3);

  const specificRef =
    /\b(ICD-10|CPT|HIPAA|JSON|CSV|SQL|REST|OAuth|JWT|RAG|PCA|HNSW|ANN|LoRA|QLoRA|NPI|HCPCS|UUID|SSE|CI\/CD)\b/gi;
  const refMatches = answer.match(specificRef) ?? [];
  score += Math.min(10, refMatches.length * 5);

  return Math.min(100, score);
}

export function assessTradeOffAwareness(answer: string): number {
  let score = 10;

  const tradeOffPatterns =
    /trade.?off|pros? and cons|advantage|disadvantage|benefit|drawback|limitation|downside/i;
  if (tradeOffPatterns.test(answer)) score += 18;

  const comparisonPatterns =
    /\bvs\b|versus|compared to|rather than|instead of|alternatively|whereas|on the other hand|however|although|while /i;
  if (comparisonPatterns.test(answer)) score += 15;

  const conditionalPatterns =
    /if you|when you|depending on|consider|you (might|may|could) need to|it depends|based on your/i;
  if (conditionalPatterns.test(answer)) score += 12;

  const decisionPatterns =
    /best (for|practice)|recommend|suggest|prefer|choose|opt for|better to|ideal for|suited for|appropriate for/i;
  if (decisionPatterns.test(answer)) score += 10;

  const reasonPatterns =
    /because|since|therefore|thus|so that|this (allows|ensures|prevents|means)|which (lets|allows)|due to|as a result/i;
  if (reasonPatterns.test(answer)) score += 10;

  const edgeCasePatterns =
    /edge case|failure|error|exception|timeout|retry|fallback|graceful|degrad|handle|mitigat|risk/i;
  if (edgeCasePatterns.test(answer)) score += 10;

  return Math.min(100, score);
}

export function assessTechnicalVocabulary(answer: string, topic: CurriculumDay): number {
  let score = 10;

  const technicalTerms = extractTechnicalTerms(answer);
  const distinctTerms = [...new Set(technicalTerms)];
  score += Math.min(40, distinctTerms.length * 4);

  const normalized = normalizeText(answer);
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  const uniqueWords = new Set(words);

  const longWords = [...uniqueWords].filter((w) => w.length > 6);
  const longWordRatio = longWords.length / Math.max(uniqueWords.size, 1);
  if (longWordRatio > 0.15) score += 10;
  if (longWordRatio > 0.25) score += 5;

  const sentenceCount = answer.split(/[.!?]+/).filter((s) => s.trim().length > 5).length;
  if (sentenceCount >= 3) score += 8;
  if (sentenceCount >= 5) score += 7;

  const repetitive = words.length > 20 && uniqueWords.size / words.length < 0.35;
  if (repetitive) score -= 15;

  const hasJargon = /\b(?:implementation|architecture|optimization|integration|configuration|deployment|abstraction|encapsulation|polymorphism|serialization|normalization|indexing|partitioning|sharding|replication|caching|orchestration)\b/i.test(answer);
  if (hasJargon) score += 8;

  return Math.max(0, Math.min(100, score));
}

export function assessStructuralQuality(answer: string): number {
  let score = 15;

  const hasHeaders = /^#{1,6}\s+/m.test(answer);
  const hasBulletPoints = /^[\s]*[-*•]\s+/m.test(answer);
  const hasNumberedList = /^[\s]*[\d]+[.)]\s+/m.test(answer);
  const hasParagraphs = answer.split(/\n\s*\n/).length >= 2;

  if (hasHeaders) score += 15;
  if (hasBulletPoints) score += 12;
  if (hasNumberedList) score += 12;
  if (hasParagraphs) score += 10;

  const transitionWords =
    /first|second|third|next|then|finally|additionally|moreover|furthermore|however|in addition|on the other hand|meanwhile|subsequently|also|another|moreover/gi;
  const transitions = answer.match(transitionWords);
  if (transitions && transitions.length >= 2) score += 10;
  if (transitions && transitions.length >= 4) score += 5;

  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 30).length;
  if (longSentences > sentences.length * 0.5) score -= 10;

  const hasConclusion =
    /in summary|to summarize|in conclusion|overall|the key takeaway|this ensures|this allows|therefore|thus|in short/i.test(
      answer
    );
  if (hasConclusion) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function assessDepth(
  answer: string,
  topic: CurriculumDay
): DepthScores {
  return {
    implementationSpecificity: assessImplementationSpecificity(answer, topic),
    tradeOffAwareness: assessTradeOffAwareness(answer),
    technicalVocabulary: assessTechnicalVocabulary(answer, topic),
    structuralQuality: assessStructuralQuality(answer),
  };
}
