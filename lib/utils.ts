import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function estimateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  if (minutes === 1) return "~1 min read";
  return `~${minutes} min read`;
}

export function formatCandidateDisplay(profile: { candidateId: string; name?: string }): string {
  return profile.name ?? `Candidate #${profile.candidateId}`;
}
