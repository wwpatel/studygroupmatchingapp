import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import type { PlanNode } from "@/components/projects/StudyPath";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Calendar } from "lucide-react";

const COLOR_BG: Record<string, string> = {
  lavender: "var(--color-lavender)",
  blush: "var(--color-blush)",
  sage: "var(--color-sage)",
  butter: "var(--color-butter)",
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, subject, color, test_dates, student_id")
    .eq("id", params.id)
    .single();

  if (!project || project.student_id !== user.id) notFound();

  const [{ data: nodesRaw }, { data: links }, { data: skillRowsRaw }] = await Promise.all([
    supabase
      .from("study_plan_nodes")
      .select("id, topic, activity_type, description, scheduled_date, status, order_index")
      .eq("project_id", project.id)
      .order("order_index", { ascending: true }),
    supabase.from("project_materials").select("materials(id, title, subject, uploaded_at)").eq("project_id", project.id),
    supabase
      .from("skill_profile")
      .select("mastery_score, attempts_count, topics!inner(name, subject)")
      .eq("student_id", user.id)
      .eq("topics.subject", project.subject),
  ]);

  const nodes = (nodesRaw ?? []) as PlanNode[];

  const materials = (links ?? [])
    .map((l) => (l as unknown as { materials: { id: string; title: string; subject: string; uploaded_at: string } | null }).materials)
    .filter((m): m is { id: string; title: string; subject: string; uploaded_at: string } => !!m);

  const topicScores = (skillRowsRaw as unknown as
    | { mastery_score: number; attempts_count: number; topics: { name: string; subject: string } | null }[]
    | null ?? [])
    .filter((r) => r.topics)
    .map((r) => ({ name: r.topics!.name, mastery: r.mastery_score, attempts: r.attempts_count }));

  const testDates = (project.test_dates as string[]) ?? [];
  const nextTest = testDates.filter(Boolean).sort().find((d) => d >= todayKey());

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Projects
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <span className="size-3.5 rounded-full" style={{ background: COLOR_BG[project.color] }} />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{project.name}</h1>
      </div>
      <div className="mt-1 flex items-center gap-3 text-sm text-ink-soft">
        <span>{project.subject}</span>
        {nextTest && (
          <span className="inline-flex items-center gap-1.5 text-ink-faint">
            <Calendar className="size-3.5" /> Test {formatDate(nextTest)}
          </span>
        )}
      </div>

      <div className="mt-6">
        <ProjectDetail nodes={nodes} materials={materials} topicScores={topicScores} />
      </div>
    </div>
  );
}
