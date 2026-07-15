# Nova

An AI-powered study platform for high school students — built for the AIRES @ UC Berkeley hackathon.

Nova pinpoints exactly where a student is stuck (a diagnostic-first AI tutor), turns uploaded notes into an interactive quiz, practice test, and flashcards, tracks a live per-topic skill profile, and matches students into study groups whose strengths and weaknesses complement each other — not classmates who already know the same things.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + Realtime) · Claude API (`claude-sonnet-4-6`) · Lucide icons

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then open the SQL Editor and run [`supabase/schema.sql`](./supabase/schema.sql). It creates every table, RLS policy, the `handle_new_user` trigger, and enables Realtime on `messages`/`sessions`.

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=          # Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=         # Project Settings → API (server-only, used for group matching + seeding)
ANTHROPIC_API_KEY=                 # console.anthropic.com
```

For a smooth demo, also disable **Confirm email** under Supabase → Authentication → Providers → Email (otherwise new signups need to click an email link before they can log in).

### 4. Run it

```bash
npm run dev
```

### 5. Seed realistic demo data (optional but recommended)

```bash
npm run seed
```

Creates a class of 10 students across Algebra II and Biology with varied skill profiles, forms complementary study groups (via the real matching algorithm + real AI-generated match reasoning), and gives one account full history — materials, a quiz attempt, chat history, group chat. Log in as:

```
email:    demo@nova.school
password: NovaDemo123!
```

Re-running `npm run seed` is a no-op if that account already exists — delete it from the Supabase dashboard (Authentication → Users) to reseed from scratch.

## Project structure

```
app/(auth)/          Login / signup (Supabase email+password)
app/(app)/            Authenticated shell — dashboard, chat, materials, skills, groups
app/api/              Route handlers: uploads, AI generation, grading, matching, chat streaming
lib/anthropic/        Claude client + forced tool-use structured generation
lib/supabase/         Browser / server / admin Supabase clients
lib/matching.ts        Complementary group-matching algorithm
lib/skill.ts            Mastery score (EMA) + check-in adjustment logic
supabase/schema.sql     Full DB schema + RLS policies
scripts/seed.ts          Demo data generator
```

## Design notes

- **Structured AI output.** Every Claude call whose result the UI renders (quizzes, flashcards, match reasoning, session agendas) uses forced tool-use with a strict JSON schema — never freeform text parsing.
- **Skill profile.** Mastery per topic is an exponential moving average over quiz/test performance, nudged further by post-session confidence check-ins.
- **Matching.** A greedy max-coverage heuristic assigns each student to whichever forming group most benefits from their specific profile, rather than clustering similar students — see `lib/matching.ts`.
