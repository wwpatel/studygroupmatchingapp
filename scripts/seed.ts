// Seeds a realistic demo class so Nova doesn't look cold-started.
//
// Usage: npm run seed
// Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from
// .env.local) and, for the highest-quality group match reasoning,
// ANTHROPIC_API_KEY. Falls back to canned reasoning if the AI call fails.

import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/types/database";
import { formComplementaryGroups, topicSummary, type StudentVector } from "../lib/matching";
import { generateMatchReasoning, generateSessionAgenda } from "../lib/anthropic/generate";
import type {
  MatchedStudentSummary,
  QuizContent,
  FlashcardContent,
  MatchReasoning,
  GroupAgenda,
} from "../lib/types/content";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "NovaDemo123!";

const ALGEBRA_TOPICS = [
  "Quadratic Equations",
  "Polynomial Functions",
  "Rational Expressions",
  "Exponential Functions",
  "Logarithms",
  "Systems of Equations",
];

const BIOLOGY_TOPICS = [
  "Cell Structure",
  "Cellular Respiration",
  "Genetics & Heredity",
  "Photosynthesis",
  "Evolution & Natural Selection",
  "Ecosystems",
];

const SUBJECT_TOPICS: Record<string, string[]> = {
  "Algebra II": ALGEBRA_TOPICS,
  Biology: BIOLOGY_TOPICS,
};

interface SeedStudent {
  email: string;
  name: string;
  grade: string;
  subjects: string[];
}

const DEMO_EMAIL = "demo@nova.school";

const STUDENTS: SeedStudent[] = [
  { email: DEMO_EMAIL, name: "Jordan Lee", grade: "11th grade", subjects: ["Algebra II", "Biology"] },
  { email: "ava.chen@nova.school", name: "Ava Chen", grade: "11th grade", subjects: ["Algebra II", "Biology"] },
  { email: "marcus.reed@nova.school", name: "Marcus Reed", grade: "11th grade", subjects: ["Algebra II"] },
  { email: "priya.nair@nova.school", name: "Priya Nair", grade: "10th grade", subjects: ["Algebra II", "Biology"] },
  { email: "diego.santos@nova.school", name: "Diego Santos", grade: "11th grade", subjects: ["Algebra II"] },
  { email: "emma.wilson@nova.school", name: "Emma Wilson", grade: "11th grade", subjects: ["Biology"] },
  { email: "liam.oconnor@nova.school", name: "Liam O'Connor", grade: "10th grade", subjects: ["Algebra II", "Biology"] },
  { email: "sofia.martinez@nova.school", name: "Sofia Martinez", grade: "11th grade", subjects: ["Biology"] },
  { email: "noah.kim@nova.school", name: "Noah Kim", grade: "11th grade", subjects: ["Algebra II"] },
  { email: "zoe.patel@nova.school", name: "Zoe Patel", grade: "10th grade", subjects: ["Algebra II", "Biology"] },
];

function daysAgo(n: number, hour = 15) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

async function main() {
  console.log("Checking for existing seed data...");
  const { data: existing } = await supabase.from("students").select("id").eq("email", DEMO_EMAIL).maybeSingle();
  if (existing) {
    console.log(
      "Demo account already exists (demo@nova.school). Delete it (and cascading rows) from the Supabase dashboard first if you want to reseed.",
    );
    process.exit(0);
  }

  console.log("Creating topics...");
  const topicIdBySubjectName = new Map<string, string>();
  for (const [subject, topics] of Object.entries(SUBJECT_TOPICS)) {
    for (const name of topics) {
      const { data: topic, error } = await supabase
        .from("topics")
        .upsert({ subject, name }, { onConflict: "subject,name" })
        .select("id")
        .single();
      if (error || !topic) throw error ?? new Error("Failed to create topic");
      topicIdBySubjectName.set(`${subject}::${name}`, topic.id);
    }
  }

  console.log("Creating students...");
  const studentIdByEmail = new Map<string, string>();
  for (const s of STUDENTS) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: s.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: s.name, grade: s.grade },
    });
    if (error || !created.user) {
      console.error(`Failed to create ${s.email}:`, error?.message);
      continue;
    }
    studentIdByEmail.set(s.email, created.user.id);
    await supabase
      .from("students")
      .update({ subjects: s.subjects, grade: s.grade })
      .eq("id", created.user.id);
  }
  console.log(`Created ${studentIdByEmail.size} students.`);

  console.log("Seeding skill profiles...");
  const vectorsBySubject = new Map<string, StudentVector[]>();

  for (const subject of Object.keys(SUBJECT_TOPICS)) {
    const topics = SUBJECT_TOPICS[subject];
    const cohort = STUDENTS.filter((s) => s.subjects.includes(subject));
    const vectors: StudentVector[] = [];

    for (let i = 0; i < cohort.length; i++) {
      const student = cohort[i];
      const studentId = studentIdByEmail.get(student.email);
      if (!studentId) continue;

      const n = topics.length;
      const strongIdx = new Set([i % n, (i + 1) % n]);
      const weakIdx = new Set([(i + 3) % n, (i + 4) % n]);

      const vector: Record<string, number> = {};
      for (let t = 0; t < n; t++) {
        const topicId = topicIdBySubjectName.get(`${subject}::${topics[t]}`)!;
        let score: number;
        if (strongIdx.has(t)) score = randomBetween(72, 94);
        else if (weakIdx.has(t)) score = randomBetween(18, 42);
        else score = randomBetween(48, 66);
        vector[topicId] = score;

        await supabase.from("skill_profile").insert({
          student_id: studentId,
          topic_id: topicId,
          mastery_score: score,
          attempts_count: randomBetween(2, 6),
          last_updated: daysAgo(randomBetween(0, 10)),
        });
      }

      vectors.push({ studentId, name: student.name, vector });
    }

    vectorsBySubject.set(subject, vectors);
  }

  console.log("Seeding materials, quiz, and attempt history for the demo account...");
  const demoId = studentIdByEmail.get(DEMO_EMAIL)!;

  const demoQuiz: QuizContent = {
    kind: "quiz",
    subject: "Algebra II",
    title: "Quadratics & Polynomials Quiz",
    topics: ["Quadratic Equations", "Polynomial Functions"],
    questions: [
      {
        id: crypto.randomUUID(),
        kind: "mcq",
        topic: "Quadratic Equations",
        difficulty: "medium",
        prompt: "What are the roots of x^2 - 5x + 6 = 0?",
        options: ["x = 2, 3", "x = -2, -3", "x = 1, 6", "x = -1, -6"],
        correctIndex: 0,
        explanation: "Factor as (x-2)(x-3)=0, so x=2 or x=3.",
      },
      {
        id: crypto.randomUUID(),
        kind: "mcq",
        topic: "Quadratic Equations",
        difficulty: "easy",
        prompt: "The vertex form of a quadratic is y = a(x-h)^2 + k. What does (h,k) represent?",
        options: ["The y-intercept", "The vertex", "The roots", "The axis slope"],
        correctIndex: 1,
        explanation: "(h,k) is the vertex of the parabola in vertex form.",
      },
      {
        id: crypto.randomUUID(),
        kind: "short_answer",
        topic: "Polynomial Functions",
        difficulty: "medium",
        prompt: "What is the degree of the polynomial 3x^4 - 2x^2 + 7?",
        acceptableAnswers: ["4", "four", "degree 4"],
        explanation: "The highest exponent on x is 4.",
      },
    ],
  };

  const demoFlashcards: FlashcardContent = {
    kind: "flashcards",
    subject: "Algebra II",
    title: "Quadratics & Polynomials Flashcards",
    topics: ["Quadratic Equations", "Polynomial Functions"],
    cards: [
      { id: crypto.randomUUID(), topic: "Quadratic Equations", front: "Quadratic formula", back: "x = (-b ± √(b²-4ac)) / 2a" },
      { id: crypto.randomUUID(), topic: "Quadratic Equations", front: "Discriminant", back: "b² - 4ac — tells you the number/type of roots." },
      { id: crypto.randomUUID(), topic: "Polynomial Functions", front: "Degree of a polynomial", back: "The highest exponent of the variable." },
      { id: crypto.randomUUID(), topic: "Polynomial Functions", front: "Leading coefficient", back: "The coefficient of the term with the highest degree." },
    ],
  };

  const { data: demoMaterial } = await supabase
    .from("materials")
    .insert({
      student_id: demoId,
      title: "Unit 4: Quadratics & Polynomials",
      subject: "Algebra II",
      source_type: "pasted",
      content:
        "A quadratic equation has the form ax^2 + bx + c = 0. It can be solved by factoring, completing the square, or the quadratic formula: x = (-b ± sqrt(b^2 - 4ac)) / 2a. A polynomial function's degree is its highest exponent...",
      uploaded_at: daysAgo(9),
    })
    .select("id")
    .single();

  if (demoMaterial) {
    const { data: quizContent } = await supabase
      .from("generated_content")
      .insert({
        material_id: demoMaterial.id,
        student_id: demoId,
        type: "quiz",
        title: demoQuiz.title,
        content: demoQuiz as unknown as Database["public"]["Tables"]["generated_content"]["Row"]["content"],
        created_at: daysAgo(9),
      })
      .select("id")
      .single();

    await supabase.from("generated_content").insert({
      material_id: demoMaterial.id,
      student_id: demoId,
      type: "flashcards",
      title: demoFlashcards.title,
      content: demoFlashcards as unknown as Database["public"]["Tables"]["generated_content"]["Row"]["content"],
      created_at: daysAgo(9),
    });

    if (quizContent) {
      const answers = demoQuiz.questions.map((q, i) => ({
        questionId: q.id,
        topic: q.topic,
        studentAnswer: i === 2 ? "4" : q.kind === "mcq" ? q.options[q.correctIndex] : "",
        correctAnswer: q.kind === "mcq" ? q.options[q.correctIndex] : q.acceptableAnswers[0],
        isCorrect: i !== 1,
        pointsAwarded: i !== 1 ? 1 : 0,
        pointsPossible: 1,
      }));
      await supabase.from("attempts").insert({
        student_id: demoId,
        generated_content_id: quizContent.id,
        subject: "Algebra II",
        score: 2,
        max_score: 3,
        topic_breakdown: [
          { topic: "Quadratic Equations", correct: 1, total: 2 },
          { topic: "Polynomial Functions", correct: 1, total: 1 },
        ] as unknown as Database["public"]["Tables"]["attempts"]["Row"]["topic_breakdown"],
        answers: answers as unknown as Database["public"]["Tables"]["attempts"]["Row"]["answers"],
        created_at: daysAgo(8),
      });
    }
  }

  await supabase.from("chat_history").insert([
    { student_id: demoId, role: "user", content: "I don't get why we flip the inequality sign sometimes", created_at: daysAgo(3, 16) },
    {
      student_id: demoId,
      role: "assistant",
      content:
        "Good question — before I explain, when you flipped it, were you multiplying or dividing both sides by a negative number, or was it something else (like swapping the sides)?",
      created_at: daysAgo(3, 16),
    },
    { student_id: demoId, role: "user", content: "I think it was dividing by a negative", created_at: daysAgo(3, 16) },
    {
      student_id: demoId,
      role: "assistant",
      content:
        "That's exactly when it happens. Whenever you **multiply or divide both sides of an inequality by a negative number**, the inequality flips direction.\n\nFor example: $-2x < 6$ → divide both sides by $-2$ → $x > -3$ (flipped from < to >).\n\nIt does **not** flip when you add/subtract, or multiply/divide by a positive number.",
      created_at: daysAgo(3, 16),
    },
  ]);

  console.log("Forming complementary groups...");
  for (const subject of Object.keys(SUBJECT_TOPICS)) {
    const vectors = vectorsBySubject.get(subject) ?? [];
    const topicNames = Object.fromEntries(
      SUBJECT_TOPICS[subject].map((name) => [topicIdBySubjectName.get(`${subject}::${name}`)!, name]),
    );
    const topicIds = Object.keys(topicNames);
    const groups = formComplementaryGroups(vectors, topicIds, 4);

    for (const memberIds of groups) {
      if (memberIds.length < 2) continue;
      const members = memberIds.map((id) => vectors.find((v) => v.studentId === id)!);
      const summaries: MatchedStudentSummary[] = members.map((m) => ({
        studentId: m.studentId,
        name: m.name,
        ...topicSummary(m.vector, topicNames),
      }));

      let reasoning: MatchReasoning = {
        headline: `A complementary ${subject} group`,
        reasoning: `This group pairs students whose strengths in ${subject} cover each other's growth areas.`,
        pairings: [],
      };
      let agenda: GroupAgenda = {
        summary: `A focused ${subject} review session.`,
        totalMinutes: 50,
        items: SUBJECT_TOPICS[subject].slice(0, 3).map((topic) => ({
          topic,
          focus: `Work through practice problems on ${topic} together.`,
          leadStudentId: null,
          leadStudentName: members[0]?.name ?? null,
          durationMinutes: 15,
        })),
      };

      try {
        const [aiReasoning, aiAgenda] = await Promise.all([
          generateMatchReasoning(summaries, subject),
          generateSessionAgenda(summaries, subject),
        ]);
        reasoning = aiReasoning;
        agenda = aiAgenda;
      } catch (err) {
        console.warn(`  AI reasoning failed for a ${subject} group, using fallback copy:`, (err as Error).message);
      }

      const { data: group } = await supabase
        .from("groups")
        .insert({
          subject,
          name: `${subject} · ${reasoning.headline}`.slice(0, 80),
          match_reasoning: JSON.stringify(reasoning),
          formed_at: daysAgo(6),
        })
        .select("id")
        .single();

      if (!group) continue;

      await supabase
        .from("group_members")
        .insert(members.map((m) => ({ group_id: group.id, student_id: m.studentId, joined_at: daysAgo(6) })));

      const includesDemo = memberIds.includes(demoId);
      const status = includesDemo ? "confirmed" : Math.random() > 0.5 ? "proposed" : "confirmed";
      const scheduledTime = status === "confirmed" ? daysAgo(-2, 17) : null;

      const { data: session } = await supabase
        .from("sessions")
        .insert({
          group_id: group.id,
          agenda: agenda as unknown as Database["public"]["Tables"]["sessions"]["Row"]["agenda"],
          proposed_times: scheduledTime ? [scheduledTime] : [daysAgo(-3, 16), daysAgo(-2, 17)],
          scheduled_time: scheduledTime,
          status,
          created_at: daysAgo(6),
        })
        .select("id")
        .single();

      if (includesDemo && session) {
        const otherMembers = members.filter((m) => m.studentId !== demoId);
        const chatLines = [
          { name: otherMembers[0]?.name, text: `Hey! Excited to study ${subject} together 🙌` },
          { name: "Jordan Lee", text: "Same! I could really use help on the stuff I'm weak on." },
          { name: otherMembers[1]?.name ?? otherMembers[0]?.name, text: `I'm pretty solid on that — happy to walk through it before our session.` },
        ];
        for (let i = 0; i < chatLines.length; i++) {
          const line = chatLines[i];
          const senderId =
            line.name === "Jordan Lee" ? demoId : members.find((m) => m.name === line.name)?.studentId ?? demoId;
          await supabase.from("messages").insert({
            group_id: group.id,
            student_id: senderId,
            content: line.text ?? "Looking forward to it!",
            created_at: daysAgo(5, 12 + i),
          });
        }
      }
    }
  }

  console.log("\nDone. Demo login:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
