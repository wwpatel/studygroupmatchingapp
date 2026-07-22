import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCreator } from "@/components/projects/ProjectCreator";
import { formatDate } from "@/lib/utils";
import { FolderKanban, Calendar } from "lucide-react";

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

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: projects }, { data: materials }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, subject, color, test_dates, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("materials").select("id, title, subject").eq("student_id", user.id),
  ]);

  // Per-project progress (completed / total nodes).
  const projectIds = (projects ?? []).map((p) => p.id);
  const progressByProject = new Map<string, { done: number; total: number }>();
  if (projectIds.length > 0) {
    const { data: nodes } = await supabase
      .from("study_plan_nodes")
      .select("project_id, status")
      .in("project_id", projectIds);
    for (const n of nodes ?? []) {
      const p = progressByProject.get(n.project_id) ?? { done: 0, total: 0 };
      p.total += 1;
      if (n.status === "completed") p.done += 1;
      progressByProject.set(n.project_id, p);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
      <div className="flex items-center gap-2">
        <FolderKanban className="size-7 text-sage-deep" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Projects</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        A folder per class, each with its own AI study plan leading up to your tests.
      </p>

      <div className="mt-6">
        <ProjectCreator materials={materials ?? []} />
      </div>

      <div className="mt-8">
        {!projects || projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            tone="sage"
            title="No projects yet"
            description="Create a project for a class and Nova will build a personalized study path toward your next test."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects.map((p) => {
              const testDates = (p.test_dates as string[]) ?? [];
              const nextTest = testDates.filter(Boolean).sort().find((d) => d >= todayKey());
              const prog = progressByProject.get(p.id) ?? { done: 0, total: 0 };
              const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="group h-full rounded-2xl border border-line bg-paper-raised p-5 transition-colors hover:border-ink/20">
                    <div className="flex items-center gap-2.5">
                      <span className="size-3 rounded-full" style={{ background: COLOR_BG[p.color] }} />
                      <p className="font-display text-lg font-semibold text-ink">{p.name}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{p.subject}</p>
                    {nextTest && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-faint">
                        <Calendar className="size-3.5" /> Test {formatDate(nextTest)}
                      </p>
                    )}
                    {prog.total > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: COLOR_BG[p.color] }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-ink-faint">
                          {prog.done}/{prog.total} steps done
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
