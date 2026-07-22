import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { DailyGoalCard } from "@/components/gamification/DailyGoalCard";
import { getTodayXp } from "@/lib/gamification/engine";
import { DEFAULT_DAILY_XP_GOAL } from "@/lib/gamification/constants";
import { cn, formatDate, masteryLabel } from "@/lib/utils";
import {
  FileText,
  Radar,
  Users2,
  MessageCircle,
  Upload,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: student } = await supabase
    .from("students")
    .select("name, total_xp")
    .eq("id", user.id)
    .single();

  // Gamification strip data — zeros gracefully pre-migration.
  let todayXp = 0;
  let dailyGoal = DEFAULT_DAILY_XP_GOAL;
  let currentStreak = 0;
  let longestStreak = 0;
  try {
    const [xp, { data: streakRow }, { data: settings }] = await Promise.all([
      getTodayXp(supabase, user.id),
      supabase
        .from("streaks")
        .select("current_streak, longest_streak")
        .eq("student_id", user.id)
        .maybeSingle(),
      supabase
        .from("student_xp_settings")
        .select("daily_goal")
        .eq("student_id", user.id)
        .maybeSingle(),
    ]);
    todayXp = xp;
    currentStreak = streakRow?.current_streak ?? 0;
    longestStreak = streakRow?.longest_streak ?? 0;
    dailyGoal = settings?.daily_goal ?? DEFAULT_DAILY_XP_GOAL;
  } catch {
    // Expansion tables not migrated yet.
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, score, max_score, subject, created_at, generated_content_id")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: groupsRaw } = await supabase
    .from("group_members")
    .select("group_id, groups(id, subject, name, formed_at)")
    .eq("student_id", user.id);
  const groups = groupsRaw as unknown as
    | { group_id: string; groups: { id: string; subject: string; name: string; formed_at: string } | null }[]
    | null;

  const { data: skillRowsRaw } = await supabase
    .from("skill_profile")
    .select("mastery_score, topics(name, subject)")
    .eq("student_id", user.id);
  const skillRows = skillRowsRaw as unknown as
    | { mastery_score: number; topics: { name: string; subject: string } | null }[]
    | null;

  const firstName = (student?.name ?? "there").split(" ")[0];

  const sorted = [...(skillRows ?? [])].sort((a, b) => a.mastery_score - b.mastery_score);
  const growthAreas = sorted.slice(0, 3);
  const strengths = sorted.slice(-3).reverse();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Hey {firstName}.
        </h1>
        <p className="mt-1 text-ink-soft">Here&apos;s where your studying stands today.</p>
      </div>

      <div className="mt-6">
        <DailyGoalCard
          todayXp={todayXp}
          dailyGoal={dailyGoal}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          totalXp={student?.total_xp ?? 0}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/chat", icon: MessageCircle, label: "Ask Nova a question", tone: "lavender" },
          { href: "/materials", icon: Upload, label: "Upload new material", tone: "blush" },
          { href: "/skills", icon: Radar, label: "View skill profile", tone: "sage" },
          { href: "/groups", icon: Users2, label: "Study groups", tone: "butter" },
        ].map(({ href, icon: Icon, label, tone }) => (
          <Link key={href} href={href}>
            <Card
              className={cn(
                "group h-full transition-colors",
                tone === "lavender" && "hover:border-lavender/40",
                tone === "blush" && "hover:border-blush/60",
                tone === "sage" && "hover:border-sage/60",
                tone === "butter" && "hover:border-butter/60",
              )}
            >
              <CardBody className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    tone === "lavender" && "bg-lavender-soft",
                    tone === "blush" && "bg-blush-soft",
                    tone === "sage" && "bg-sage-soft",
                    tone === "butter" && "bg-butter-soft",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4.5",
                      tone === "lavender" && "text-lavender-deep",
                      tone === "blush" && "text-blush-deep",
                      tone === "sage" && "text-sage-deep",
                      tone === "butter" && "text-butter-deep",
                    )}
                    strokeWidth={1.75}
                  />
                </div>
                <span className="text-sm font-medium text-ink">{label}</span>
                <ArrowRight className="ml-auto size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" />
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Recent attempts</h2>
              <Link href="/materials" className="text-sm font-medium text-ink-soft hover:text-ink">
                View all
              </Link>
            </div>
            {!attempts || attempts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No attempts yet"
                description="Upload your notes to generate a quiz and start building your skill profile."
                action={
                  <Link href="/materials">
                    <Button size="sm">Upload material</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {attempts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{a.subject}</p>
                      <p className="text-xs text-ink-faint">{formatDate(a.created_at)}</p>
                    </div>
                    <Badge tone={a.score / a.max_score >= 0.7 ? "sage" : "blush"}>
                      {Math.round((a.score / a.max_score) * 100)}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-display text-lg font-semibold text-ink">Skill snapshot</h2>
            {!skillRows || skillRows.length === 0 ? (
              <EmptyState
                icon={Radar}
                tone="butter"
                title="No skill data yet"
                description="Take a diagnostic quiz or generated quiz to start your skill profile."
                action={
                  <Link href="/skills">
                    <Button size="sm">Go to skill profile</Button>
                  </Link>
                }
              />
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-sage-deep">
                    <TrendingUp className="size-3.5" /> Strengths
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {strengths.map((s, i) => (
                      <Badge key={i} tone="sage">
                        {s.topics?.name} · {masteryLabel(s.mastery_score)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-blush-deep">
                    <TrendingDown className="size-3.5" /> Growth areas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {growthAreas.map((s, i) => (
                      <Badge key={i} tone="blush">
                        {s.topics?.name} · {masteryLabel(s.mastery_score)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Your study groups</h2>
              <Link href="/groups" className="text-sm font-medium text-ink-soft hover:text-ink">
                View all
              </Link>
            </div>
            {!groups || groups.length === 0 ? (
              <EmptyState
                icon={Users2}
                tone="sage"
                title="Not in a group yet"
                description="Once you've got a skill profile, Nova can match you with complementary classmates."
                action={
                  <Link href="/groups">
                    <Button size="sm">Find a group</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {groups.map((g) => {
                  const group = Array.isArray(g.groups) ? g.groups[0] : g.groups;
                  if (!group) return null;
                  return (
                    <li key={group.id}>
                      <Link
                        href={`/groups/${group.id}`}
                        className="block rounded-xl border border-line p-4 transition-colors hover:border-lavender/40"
                      >
                        <p className="font-medium text-ink">{group.name}</p>
                        <p className="text-xs text-ink-faint">{group.subject}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
