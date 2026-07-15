import { createClient } from "@/lib/supabase/server";
import { SkillProfileView, type SubjectSkillData } from "@/components/skills/SkillProfileView";

export default async function SkillsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: skillRowsRaw } = await supabase
    .from("skill_profile")
    .select("mastery_score, attempts_count, topics(name, subject)")
    .eq("student_id", user.id);

  const skillRows = skillRowsRaw as unknown as
    | { mastery_score: number; attempts_count: number; topics: { name: string; subject: string } | null }[]
    | null;

  const { data: materials } = await supabase
    .from("materials")
    .select("subject")
    .eq("student_id", user.id);

  const bySubject = new Map<string, SubjectSkillData["topics"]>();
  for (const row of skillRows ?? []) {
    if (!row.topics) continue;
    const list = bySubject.get(row.topics.subject) ?? [];
    list.push({ name: row.topics.name, mastery: row.mastery_score, attempts: row.attempts_count });
    bySubject.set(row.topics.subject, list);
  }

  const data: SubjectSkillData[] = Array.from(bySubject.entries()).map(([subject, topics]) => ({
    subject,
    topics,
  }));

  const allSubjects = Array.from(
    new Set((materials ?? []).map((m) => m.subject).filter(Boolean)),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Skill profile
      </h1>
      <p className="mt-1 text-ink-soft">
        Your mastery per topic, updated after every quiz, test, and check-in.
      </p>

      <div className="mt-8">
        <SkillProfileView data={data} allSubjects={allSubjects} />
      </div>
    </div>
  );
}
