import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MatchReasoningPanel } from "@/components/groups/MatchReasoningPanel";
import { AgendaView } from "@/components/groups/AgendaView";
import { GroupChat } from "@/components/groups/GroupChat";
import { SessionScheduler } from "@/components/groups/SessionScheduler";
import { CheckinForm } from "@/components/groups/CheckinForm";
import { Badge } from "@/components/ui/Badge";
import type { GroupAgenda } from "@/lib/types/content";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: group } = await supabase
    .from("groups")
    .select("id, subject, name, match_reasoning, formed_at")
    .eq("id", params.id)
    .single();

  if (!group) notFound();

  const { data: membersRaw } = await supabase
    .from("group_members")
    .select("student_id, students(name)")
    .eq("group_id", group.id);
  const members = membersRaw as unknown as
    | { student_id: string; students: { name: string } | null }[]
    | null;

  const isMember = members?.some((m) => m.student_id === user.id);
  if (!isMember) notFound();

  const memberNames = Object.fromEntries((members ?? []).map((m) => [m.student_id, m.students?.name ?? "Member"]));

  const { data: session } = await supabase
    .from("sessions")
    .select("id, agenda, proposed_times, scheduled_time, status")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, group_id, student_id, content, created_at")
    .eq("group_id", group.id)
    .order("created_at", { ascending: true })
    .limit(100);

  let myCheckin = null;
  if (session) {
    const { data } = await supabase
      .from("checkins")
      .select("id")
      .eq("session_id", session.id)
      .eq("student_id", user.id)
      .maybeSingle();
    myCheckin = data;
  }

  interface ParsedReasoning {
    headline: string;
    reasoning: string;
    pairings: { topic: string; strongStudentName: string; growthStudentName: string; note: string }[];
  }
  let reasoning: ParsedReasoning | null = null;
  try {
    reasoning = group.match_reasoning ? JSON.parse(group.match_reasoning) : null;
  } catch {
    reasoning = null;
  }

  const agenda = session?.agenda as unknown as GroupAgenda | undefined;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{group.name}</h1>
        <Badge tone="butter">{group.subject}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(members ?? []).map((m) => (
          <Link
            key={m.student_id}
            href={m.student_id === user.id ? "/profile" : `/profile/${m.student_id}`}
          >
            <Badge tone="neutral" className="cursor-pointer transition-colors hover:bg-line">
              {m.students?.name ?? "Member"}
            </Badge>
          </Link>
        ))}
      </div>

      {reasoning && (
        <div className="mt-6">
          <MatchReasoningPanel
            headline={reasoning.headline}
            reasoning={reasoning.reasoning}
            pairings={reasoning.pairings}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <GroupChat
            groupId={group.id}
            currentUserId={user.id}
            initialMessages={initialMessages ?? []}
            memberNames={memberNames}
          />
        </div>

        <div className="space-y-6">
          {session && (
            <SessionScheduler
              sessionId={session.id}
              status={session.status}
              proposedTimes={session.proposed_times ?? []}
              scheduledTime={session.scheduled_time}
            />
          )}
          {agenda && <AgendaView agenda={agenda} />}
          {session && session.status === "completed" && !myCheckin && agenda && (
            <CheckinForm sessionId={session.id} topics={agenda.items.map((i) => i.topic)} />
          )}
        </div>
      </div>
    </div>
  );
}
