import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formComplementaryGroups, topicSummary, type StudentVector } from "@/lib/matching";
import { generateMatchReasoning, generateSessionAgenda, AIGenerationError } from "@/lib/gemini/generate";
import type { MatchedStudentSummary } from "@/lib/types/content";
import { subjectFilter } from "@/lib/subjects";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subject = String(body?.subject ?? "").trim();
  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingGroupsRaw } = await admin
    .from("groups")
    .select("id, group_members(student_id)")
    .ilike("subject", subjectFilter(subject));
  const existingGroups = existingGroupsRaw as unknown as
    | { id: string; group_members: { student_id: string }[] }[]
    | null;

  const alreadyGrouped = new Set<string>();
  for (const g of existingGroups ?? []) {
    for (const m of g.group_members ?? []) alreadyGrouped.add(m.student_id);
  }

  if (alreadyGrouped.has(user.id)) {
    const existing = existingGroups?.find((g) =>
      g.group_members.some((m) => m.student_id === user.id),
    );
    if (existing) return NextResponse.json({ groupId: existing.id });
  }

  const { data: topics } = await admin
    .from("topics")
    .select("id, name")
    .ilike("subject", subjectFilter(subject));
  const topicIds = (topics ?? []).map((t) => t.id);
  const topicNames = Object.fromEntries((topics ?? []).map((t) => [t.id, t.name]));

  if (topicIds.length === 0) {
    return NextResponse.json(
      { error: "No skill data for this subject yet. Take a diagnostic quiz first." },
      { status: 422 },
    );
  }

  const { data: skillRowsRaw } = await admin
    .from("skill_profile")
    .select("student_id, topic_id, mastery_score, students(name)")
    .in("topic_id", topicIds);
  const skillRows = skillRowsRaw as unknown as
    | { student_id: string; topic_id: string; mastery_score: number; students: { name: string } | null }[]
    | null;

  const vectorMap = new Map<string, StudentVector>();
  for (const row of skillRows ?? []) {
    if (alreadyGrouped.has(row.student_id)) continue;
    if (!vectorMap.has(row.student_id)) {
      vectorMap.set(row.student_id, {
        studentId: row.student_id,
        name: row.students?.name ?? "Student",
        vector: {},
      });
    }
    vectorMap.get(row.student_id)!.vector[row.topic_id] = row.mastery_score;
  }

  if (!vectorMap.has(user.id)) {
    return NextResponse.json(
      { error: "Take a diagnostic quiz in this subject first so Nova can match you." },
      { status: 422 },
    );
  }

  const candidates = Array.from(vectorMap.values());
  if (candidates.length < 2) {
    return NextResponse.json(
      { error: "Not enough classmates in this subject yet. Check back soon!" },
      { status: 422 },
    );
  }

  const formedGroups = formComplementaryGroups(candidates, topicIds, 4).filter(
    (g) => g.length >= 2,
  );

  if (formedGroups.length === 0) {
    return NextResponse.json(
      { error: "Not enough classmates in this subject yet. Check back soon!" },
      { status: 422 },
    );
  }

  let myGroupId: string | null = null;

  for (const memberIds of formedGroups) {
    const members = memberIds.map((id) => vectorMap.get(id)!);
    const summaries: MatchedStudentSummary[] = members.map((m) => ({
      studentId: m.studentId,
      name: m.name,
      ...topicSummary(m.vector, topicNames),
    }));

    let reasoning;
    let agenda;
    try {
      [reasoning, agenda] = await Promise.all([
        generateMatchReasoning(summaries, subject),
        generateSessionAgenda(summaries, subject),
      ]);
    } catch (err) {
      if (err instanceof AIGenerationError) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      throw err;
    }

    const { data: group, error: groupError } = await admin
      .from("groups")
      .insert({
        subject,
        name: `${subject} Study Group`,
        match_reasoning: JSON.stringify(reasoning),
      })
      .select("id")
      .single();

    if (groupError || !group) continue;

    await admin.from("group_members").insert(
      members.map((m) => ({ group_id: group.id, student_id: m.studentId })),
    );

    await admin.from("sessions").insert({
      group_id: group.id,
      agenda: agenda as unknown as import("@/lib/types/database").Json,
      status: "proposed",
    });

    if (memberIds.includes(user.id)) {
      myGroupId = group.id;
    }
  }

  if (!myGroupId) {
    return NextResponse.json({ error: "Matching ran but couldn't place you — try again." }, { status: 500 });
  }

  return NextResponse.json({ groupId: myGroupId });
}
