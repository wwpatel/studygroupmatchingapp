import { createClient } from "@/lib/supabase/server";
import { PlannerClient } from "@/components/planner/PlannerClient";
import type { CalEvent, TodoItem, ProjectRef, EventColor } from "@/components/planner/types";
import { CalendarDays } from "lucide-react";

export default async function PlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: manualEvents }, { data: todos }, { data: projects }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, date, time, color, type, description")
      .eq("student_id", user.id),
    supabase
      .from("todos")
      .select("id, title, due_date, priority, project_id, completed")
      .eq("student_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("projects").select("id, name, color, test_dates").eq("student_id", user.id),
  ]);

  const events: CalEvent[] = (manualEvents ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    time: e.time,
    color: e.color as EventColor,
    type: "manual",
    description: e.description,
  }));

  // Auto events: test dates + study-plan node dates + group sessions.
  for (const p of projects ?? []) {
    for (const d of ((p.test_dates as string[]) ?? []).filter(Boolean)) {
      events.push({
        id: `test-${p.id}-${d}`,
        title: `${p.name} test`,
        date: d,
        time: null,
        color: p.color as EventColor,
        type: "auto",
        source: "test",
      });
    }
  }

  const projectIds = (projects ?? []).map((p) => p.id);
  const projColor = new Map((projects ?? []).map((p) => [p.id, p.color as EventColor]));
  if (projectIds.length > 0) {
    const { data: nodes } = await supabase
      .from("study_plan_nodes")
      .select("id, project_id, topic, activity_type, scheduled_date, status")
      .in("project_id", projectIds)
      .not("scheduled_date", "is", null)
      .neq("status", "completed");
    for (const n of nodes ?? []) {
      if (!n.scheduled_date) continue;
      events.push({
        id: `plan-${n.id}`,
        title: `${n.topic}`,
        date: n.scheduled_date,
        time: null,
        color: projColor.get(n.project_id) ?? "lavender",
        type: "auto",
        source: "plan",
      });
    }
  }

  // Study group sessions the student is a member of.
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("student_id", user.id);
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length > 0) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, group_id, scheduled_time, status, groups(subject)")
      .in("group_id", groupIds)
      .not("scheduled_time", "is", null);
    for (const s of sessions ?? []) {
      if (!s.scheduled_time) continue;
      const dt = new Date(s.scheduled_time);
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      const subject = (s as unknown as { groups: { subject: string } | null }).groups?.subject ?? "Study";
      events.push({
        id: `session-${s.id}`,
        title: `${subject} group session`,
        date,
        time,
        color: "sage",
        type: "auto",
        source: "session",
      });
    }
  }

  const projectRefs: ProjectRef[] = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color as EventColor,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-7 text-blush-deep" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Planner</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        Your tests, study steps, and sessions in one calendar — plus a task list Nova can fill in.
      </p>

      <div className="mt-6">
        <PlannerClient
          initialEvents={events}
          initialTodos={(todos ?? []) as TodoItem[]}
          projects={projectRefs}
        />
      </div>
    </div>
  );
}
