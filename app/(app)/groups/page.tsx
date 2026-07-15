import { createClient } from "@/lib/supabase/server";
import { FindGroupPanel } from "@/components/groups/FindGroupPanel";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users2 } from "lucide-react";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membershipsRaw } = await supabase
    .from("group_members")
    .select("group_id, groups(id, subject, name, formed_at)")
    .eq("student_id", user.id);
  const memberships = membershipsRaw as unknown as
    | { group_id: string; groups: { id: string; subject: string; name: string; formed_at: string } | null }[]
    | null;

  const { data: skillRows } = await supabase
    .from("skill_profile")
    .select("topics(subject)")
    .eq("student_id", user.id);
  const skillRowsTyped = skillRows as unknown as { topics: { subject: string } | null }[] | null;
  const subjectsWithSkill = Array.from(
    new Set((skillRowsTyped ?? []).map((r) => r.topics?.subject).filter((s): s is string => !!s)),
  );

  const groupedSubjects = new Set((memberships ?? []).map((m) => m.groups?.subject));
  const availableSubjects = subjectsWithSkill.filter((s) => !groupedSubjects.has(s));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Study groups</h1>
      <p className="mt-1 text-ink-soft">
        Complementary groups, matched on strengths and growth areas — not similarity.
      </p>

      <div className="mt-6">
        <FindGroupPanel subjects={availableSubjects} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your groups</h2>
        {!memberships || memberships.length === 0 ? (
          <EmptyState icon={Users2} title="No groups yet" description="Once matched, your groups will show up here." />
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => {
              const group = m.groups;
              if (!group) return null;
              return (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <Card className="transition-colors hover:border-ember/40">
                    <CardBody className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium text-ink">{group.name}</p>
                        <p className="text-xs text-ink-faint">
                          {group.subject} · formed {formatDate(group.formed_at)}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
