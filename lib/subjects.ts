// Subject names are free-typed by students ("english", "English", "ENGLISH"),
// but need to resolve to the same topics/groups regardless of casing. Use
// this when building an `.ilike()` filter on a `subject` column so lookups
// are case-insensitive while still matching the string exactly (no user
// input is treated as a wildcard pattern).
export function subjectFilter(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

// The subject buckets seeded with real skill-profile/matching candidates
// (scripts/seed-bulk-students.ts). Free-text subject input gets canonicalized
// against this list (see canonicalizeSubject in lib/gemini/generate.ts) so
// course-name variants like "AP Calc BC" or "Algebra 2" resolve to the same
// bucket as "Calculus" / "Algebra II" instead of fragmenting into their own
// isolated, candidate-less subject.
export const CANONICAL_SUBJECTS = [
  "Algebra I",
  "Algebra II",
  "Geometry",
  "Pre-Calculus",
  "Calculus",
  "Statistics",
  "Biology",
  "Chemistry",
  "Physics",
  "Environmental Science",
  "Earth Science",
  "Anatomy & Physiology",
  "US History",
  "World History",
  "Government & Civics",
  "Economics",
  "Psychology",
  "Philosophy",
  "English",
  "Spanish",
  "French",
  "German",
  "Computer Science",
  "Art History",
  "Music Theory",
];

// Best-effort local fallback when the Gemini canonicalization call fails —
// just cleans up casing/whitespace without changing the subject's meaning.
export function simpleTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}
