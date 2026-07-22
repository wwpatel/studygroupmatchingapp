import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function masteryLabel(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Solid";
  if (score >= 40) return "Developing";
  return "Needs work";
}

export function masteryColor(score: number) {
  if (score >= 80) return "var(--color-sage-deep)";
  if (score >= 60) return "var(--color-butter-deep)";
  if (score >= 40) return "var(--color-blush-deep)";
  return "var(--color-danger)";
}
