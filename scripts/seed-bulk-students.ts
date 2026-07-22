// Seeds 200 additional fake students (spread across 8 common high-school
// subjects) with real skill profiles, purely so group matching has a large
// enough ungrouped candidate pool to actually form a group when a real
// account runs a diagnostic + clicks "Find a group".
//
// Unlike scripts/seed.ts (which builds one fully fleshed-out demo class with
// pre-formed groups, sessions, chat, etc.), this script deliberately does
// NOT pre-group these students — leaving them all available as match
// candidates for whichever subject a real user tests with.
//
// Usage: npm run seed:bulk
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local).
// Safe to re-run: it checks for existing @novabulk.school accounts first and
// exits if any are found (delete them from Supabase to reseed).

import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BULK_PASSWORD = "NovaBulk123!";
const EMAIL_DOMAIN = "novabulk.school";
const STUDENTS_PER_SUBJECT = 25;
const GRADES = ["9th grade", "10th grade", "11th grade", "12th grade"];

// Matches the exact spelling the app's own placeholder suggests
// (components/skills/DiagnosticStarter.tsx) so a real diagnostic on one of
// these subject names lines up with this seeded cohort.
const SUBJECT_TOPICS: Record<string, string[]> = {
  "Algebra II": [
    "Quadratic Equations",
    "Polynomial Functions",
    "Rational Expressions",
    "Exponential Functions",
    "Logarithms",
    "Systems of Equations",
  ],
  Biology: [
    "Cell Structure",
    "Cellular Respiration",
    "Genetics & Heredity",
    "Photosynthesis",
    "Evolution & Natural Selection",
    "Ecosystems",
  ],
  Chemistry: [
    "Atomic Structure",
    "Chemical Bonding",
    "Stoichiometry",
    "Acids & Bases",
    "Thermodynamics",
    "Chemical Reactions",
  ],
  "US History": [
    "American Revolution",
    "Constitution & Founding",
    "Civil War & Reconstruction",
    "Industrialization",
    "World War I & II",
    "Civil Rights Movement",
  ],
  Geometry: [
    "Triangles & Congruence",
    "Circles",
    "Area & Volume",
    "Coordinate Geometry",
    "Trigonometric Ratios",
    "Geometric Proofs",
  ],
  English: [
    "Literary Analysis",
    "Grammar & Mechanics",
    "Essay Writing",
    "Poetry",
    "Rhetoric & Persuasion",
    "Reading Comprehension",
  ],
  Physics: [
    "Kinematics",
    "Forces & Newton's Laws",
    "Energy & Work",
    "Waves",
    "Electricity & Magnetism",
    "Thermodynamics",
  ],
  Spanish: [
    "Verb Conjugation",
    "Vocabulary",
    "Grammar Structures",
    "Reading Comprehension",
    "Culture & Customs",
    "Conversation",
  ],
};

const FIRST_NAMES = [
  "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan",
  "Mia", "Lucas", "Amelia", "James", "Harper", "Benjamin", "Evelyn", "Elijah", "Abigail", "Aiden",
  "Emily", "Grayson", "Ella", "Jackson", "Scarlett", "Sebastian", "Grace", "Jack", "Chloe", "Owen",
  "Victoria", "Wyatt", "Riley", "Luke", "Aria", "Gabriel", "Lily", "Anthony", "Aubrey", "Isaac",
  "Zoey", "Julian", "Penelope", "Levi", "Layla", "Christopher", "Nora", "Josiah", "Camila", "Hudson",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
];

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}
function daysAgo(n: number, hour = 15) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface FakeStudent {
  email: string;
  name: string;
  grade: string;
  subject: string;
}

function buildRoster(): FakeStudent[] {
  const subjects = Object.keys(SUBJECT_TOPICS);
  const roster: FakeStudent[] = [];
  const usedNames = new Set<string>();
  const usedEmails = new Set<string>();

  for (const subject of subjects) {
    for (let i = 0; i < STUDENTS_PER_SUBJECT; i++) {
      let first: string, last: string, nameKey: string;
      do {
        first = pick(FIRST_NAMES);
        last = pick(LAST_NAMES);
        nameKey = `${first} ${last}`;
      } while (usedNames.has(nameKey));
      usedNames.add(nameKey);

      let email = `${first.toLowerCase()}.${last.toLowerCase()}@${EMAIL_DOMAIN}`;
      let suffix = 2;
      while (usedEmails.has(email)) {
        email = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}@${EMAIL_DOMAIN}`;
        suffix++;
      }
      usedEmails.add(email);

      roster.push({ email, name: nameKey, grade: pick(GRADES), subject });
    }
  }
  return roster;
}

// Bounded-concurrency map — real auth admin calls, so keep this gentle rather
// than firing all 200 at once.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  console.log("Checking for existing bulk seed data...");
  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .ilike("email", `%@${EMAIL_DOMAIN}`)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log(
      `Bulk students already exist (@${EMAIL_DOMAIN}). Delete them from the Supabase dashboard first if you want to reseed.`,
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
      if (error || !topic) throw error ?? new Error(`Failed to create topic ${subject}/${name}`);
      topicIdBySubjectName.set(`${subject}::${name}`, topic.id);
    }
  }

  const roster = buildRoster();
  console.log(`Creating ${roster.length} student accounts (this takes a few minutes)...`);

  let created = 0;
  let failed = 0;
  await mapWithConcurrency(roster, 12, async (s, i) => {
    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email: s.email,
      password: BULK_PASSWORD,
      email_confirm: true,
      user_metadata: { name: s.name, grade: s.grade },
    });
    if (authError || !authResult.user) {
      failed++;
      console.error(`  ✗ ${s.email}: ${authError?.message}`);
      return;
    }
    const studentId = authResult.user.id;

    await supabase.from("students").update({ subjects: [s.subject], grade: s.grade }).eq("id", studentId);

    const topics = SUBJECT_TOPICS[s.subject];
    const n = topics.length;
    const strongIdx = new Set([i % n, (i + 1) % n]);
    const weakIdx = new Set([(i + 3) % n, (i + 4) % n]);

    for (let t = 0; t < n; t++) {
      const topicId = topicIdBySubjectName.get(`${s.subject}::${topics[t]}`)!;
      let score: number;
      if (strongIdx.has(t)) score = randomBetween(72, 94);
      else if (weakIdx.has(t)) score = randomBetween(18, 42);
      else score = randomBetween(48, 66);

      await supabase.from("skill_profile").insert({
        student_id: studentId,
        topic_id: topicId,
        mastery_score: score,
        attempts_count: randomBetween(2, 6),
        last_updated: daysAgo(randomBetween(0, 10)),
      });
    }

    created++;
    if (created % 25 === 0) console.log(`  ...${created}/${roster.length} created`);
  });

  console.log(`\nDone. Created ${created} students (${failed} failed) across ${Object.keys(SUBJECT_TOPICS).length} subjects:`);
  for (const subject of Object.keys(SUBJECT_TOPICS)) {
    console.log(`  - ${subject}`);
  }
  console.log(
    `\nTo test matching: log in as your own account, run a diagnostic quiz on one of the subjects above ` +
      `(spelled exactly as listed), then "Find a group" — there are ${STUDENTS_PER_SUBJECT} ungrouped candidates waiting in each.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
