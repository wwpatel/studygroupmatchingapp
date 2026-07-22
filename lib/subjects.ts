// Subject names are free-typed by students ("english", "English", "ENGLISH"),
// but need to resolve to the same topics/groups regardless of casing. Use
// this when building an `.ilike()` filter on a `subject` column so lookups
// are case-insensitive while still matching the string exactly (no user
// input is treated as a wildcard pattern).
export function subjectFilter(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}
