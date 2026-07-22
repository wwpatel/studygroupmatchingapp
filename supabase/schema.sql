-- Nova schema
-- Run this against a fresh Supabase project (SQL Editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- students
-- One row per authenticated user, keyed to auth.users.id
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  grade text,
  subjects text[] not null default '{}',
  created_at timestamptz not null default now(),
  -- Rolling long-term memory for the AI help chatbot: a condensed summary of
  -- older chat sessions, plus a watermark (created_at of the last chat_history
  -- message already folded into that summary).
  context_summary text,
  context_summary_upto timestamptz
);

-- For databases created before the chatbot-memory columns existed.
alter table public.students add column if not exists context_summary text;
alter table public.students add column if not exists context_summary_upto timestamptz;

-- Auto-create a student row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.students (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- topics
-- Hierarchical topic catalog, scoped by subject.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  name text not null,
  parent_topic_id uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (subject, name)
);

-- ─────────────────────────────────────────────────────────────────────────
-- skill_profile
-- One row per (student, topic) tracking a running mastery score.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.skill_profile (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  mastery_score numeric(5,2) not null default 50 check (mastery_score >= 0 and mastery_score <= 100),
  attempts_count integer not null default 0,
  last_updated timestamptz not null default now(),
  unique (student_id, topic_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- materials
-- Uploaded source content (pdf text, pasted notes, etc).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  subject text not null,
  source_type text not null check (source_type in ('pdf', 'text', 'pasted')),
  content text not null,
  uploaded_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- generated_content
-- AI-generated quiz / test / flashcards, optionally tied to a material.
-- material_id is nullable: quizzes the chatbot generates in-chat on a topic
-- with no matching upload aren't tied to any material.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.materials(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  type text not null check (type in ('quiz', 'test', 'flashcards')),
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- For databases created before material_id was made nullable.
alter table public.generated_content alter column material_id drop not null;

-- ─────────────────────────────────────────────────────────────────────────
-- attempts
-- A completed quiz/test/diagnostic attempt with score + per-question detail.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  generated_content_id uuid references public.generated_content(id) on delete cascade,
  subject text not null,
  score numeric(5,2) not null,
  max_score numeric(5,2) not null,
  topic_breakdown jsonb not null default '[]',
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- groups / group_members
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  name text not null,
  match_reasoning text not null default '',
  formed_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- sessions
-- A study session tied to a group, with an AI-generated agenda.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  agenda jsonb not null default '{}',
  proposed_times timestamptz[] not null default '{}',
  scheduled_time timestamptz,
  proposed_by uuid references public.students(id) on delete set null,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- checkins
-- Post-session confidence check-ins that feed back into skill_profile.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  confidence_before smallint not null check (confidence_before between 1 and 5),
  confidence_after smallint not null check (confidence_after between 1 and 5),
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- messages
-- Group chat.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- chat_history
-- AI help chatbot transcript, per student.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────
create index if not exists idx_skill_profile_student on public.skill_profile(student_id);
create index if not exists idx_materials_student on public.materials(student_id);
create index if not exists idx_generated_content_material on public.generated_content(material_id);
create index if not exists idx_attempts_student on public.attempts(student_id);
create index if not exists idx_group_members_student on public.group_members(student_id);
create index if not exists idx_messages_group on public.messages(group_id, created_at);
create index if not exists idx_chat_history_student on public.chat_history(student_id, created_at);
create index if not exists idx_sessions_group on public.sessions(group_id);
create index if not exists idx_checkins_session on public.checkins(session_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.students enable row level security;
alter table public.topics enable row level security;
alter table public.skill_profile enable row level security;
alter table public.materials enable row level security;
alter table public.generated_content enable row level security;
alter table public.attempts enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.checkins enable row level security;
alter table public.messages enable row level security;
alter table public.chat_history enable row level security;

-- students: read own row; anyone in a shared group can see basic teammate info.
create policy "students select own or groupmate" on public.students
  for select using (
    id = auth.uid()
    or id in (
      select gm2.student_id from public.group_members gm1
      join public.group_members gm2 on gm2.group_id = gm1.group_id
      where gm1.student_id = auth.uid()
    )
  );

create policy "students update own" on public.students
  for update using (id = auth.uid());

create policy "students insert own" on public.students
  for insert with check (id = auth.uid());

-- topics: readable by any authenticated user; writes happen via service role only.
create policy "topics select all" on public.topics
  for select using (auth.role() = 'authenticated');

create policy "topics insert authenticated" on public.topics
  for insert with check (auth.role() = 'authenticated');

-- skill_profile: owner only.
create policy "skill_profile owner select" on public.skill_profile
  for select using (student_id = auth.uid());
create policy "skill_profile owner insert" on public.skill_profile
  for insert with check (student_id = auth.uid());
create policy "skill_profile owner update" on public.skill_profile
  for update using (student_id = auth.uid());

-- materials: owner only.
create policy "materials owner select" on public.materials
  for select using (student_id = auth.uid());
create policy "materials owner insert" on public.materials
  for insert with check (student_id = auth.uid());
create policy "materials owner delete" on public.materials
  for delete using (student_id = auth.uid());

-- generated_content: owner only.
create policy "generated_content owner select" on public.generated_content
  for select using (student_id = auth.uid());
create policy "generated_content owner insert" on public.generated_content
  for insert with check (student_id = auth.uid());

-- attempts: owner only.
create policy "attempts owner select" on public.attempts
  for select using (student_id = auth.uid());
create policy "attempts owner insert" on public.attempts
  for insert with check (student_id = auth.uid());

-- Security-definer helper so the group_members policy doesn't subquery its
-- own table (which causes "infinite recursion detected in policy" — Postgres
-- error 42P17). Runs as the function owner (bypasses RLS on group_members),
-- so the recursive check terminates instead of re-triggering itself.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and student_id = auth.uid()
  );
$$;

-- groups: visible to members.
create policy "groups select member" on public.groups
  for select using (public.is_group_member(id));

-- group_members: visible to fellow members.
create policy "group_members select member" on public.group_members
  for select using (public.is_group_member(group_id));

-- sessions: visible/writable by group members.
create policy "sessions select member" on public.sessions
  for select using (public.is_group_member(group_id));
create policy "sessions insert member" on public.sessions
  for insert with check (public.is_group_member(group_id));
create policy "sessions update member" on public.sessions
  for update using (public.is_group_member(group_id));

-- checkins: owner writes own; group members can view all check-ins for their sessions.
create policy "checkins select member" on public.checkins
  for select using (
    session_id in (
      select s.id from public.sessions s
      where public.is_group_member(s.group_id)
    )
  );
create policy "checkins insert own" on public.checkins
  for insert with check (student_id = auth.uid());

-- messages: group members only.
create policy "messages select member" on public.messages
  for select using (public.is_group_member(group_id));
create policy "messages insert member" on public.messages
  for insert with check (student_id = auth.uid() and public.is_group_member(group_id));

-- chat_history: owner only.
create policy "chat_history owner select" on public.chat_history
  for select using (student_id = auth.uid());
create policy "chat_history owner insert" on public.chat_history
  for insert with check (student_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime: enable for group chat + skill profile live updates
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.sessions;

-- ═══════════════════════════════════════════════════════════════════════════
-- Expansion: gamification, arcade, projects, planner, mini-lessons.
-- Kept in sync with supabase/migration-expansion.sql (the one-shot migration
-- for databases created before this expansion). Section 0 of that file
-- (generated_content.material_id nullable) is already reflected above.
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 1) Students: lifetime XP + avatar (public-profile fields; groupmates can
--       already read the students row via the existing select policy) ────────
alter table public.students add column if not exists total_xp integer not null default 0;
alter table public.students add column if not exists avatar text;

-- Track the lowest mastery a topic has ever had (for the "Level Up" badge:
-- below 40 → above 70).
alter table public.skill_profile add column if not exists lowest_mastery numeric(5,2);

-- ── 2) XP log ───────────────────────────────────────────────────────────────
create table if not exists public.xp_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount integer not null,
  source_type text not null,
  source_id uuid,
  earned_at timestamptz not null default now()
);
create index if not exists idx_xp_log_student_time on public.xp_log(student_id, earned_at);
alter table public.xp_log enable row level security;
create policy "xp_log owner select" on public.xp_log
  for select using (student_id = auth.uid());
create policy "xp_log owner insert" on public.xp_log
  for insert with check (student_id = auth.uid());

-- ── 3) Streaks ──────────────────────────────────────────────────────────────
create table if not exists public.streaks (
  student_id uuid primary key references public.students(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  -- Streak freeze: one per calendar week; availability = last_freeze_date is
  -- null or falls in an earlier ISO week than today.
  last_freeze_date date
);
alter table public.streaks enable row level security;
create policy "streaks select own or groupmate" on public.streaks
  for select using (
    student_id = auth.uid()
    or student_id in (
      select gm2.student_id from public.group_members gm1
      join public.group_members gm2 on gm2.group_id = gm1.group_id
      where gm1.student_id = auth.uid()
    )
  );
create policy "streaks owner insert" on public.streaks
  for insert with check (student_id = auth.uid());
create policy "streaks owner update" on public.streaks
  for update using (student_id = auth.uid());

-- ── 4) Badge catalog (seeded below; read-only for students) ─────────────────
create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('streak', 'activity', 'mastery')),
  tier integer not null default 1,
  icon text not null,
  xp_bonus integer not null default 0,
  unlock_condition jsonb not null
);
alter table public.badges enable row level security;
create policy "badges select all" on public.badges
  for select using (auth.role() = 'authenticated');

-- ── 5) Unlocked badges ──────────────────────────────────────────────────────
create table if not exists public.student_badges (
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (student_id, badge_id)
);
alter table public.student_badges enable row level security;
create policy "student_badges select own or groupmate" on public.student_badges
  for select using (
    student_id = auth.uid()
    or student_id in (
      select gm2.student_id from public.group_members gm1
      join public.group_members gm2 on gm2.group_id = gm1.group_id
      where gm1.student_id = auth.uid()
    )
  );
create policy "student_badges owner insert" on public.student_badges
  for insert with check (student_id = auth.uid());

-- ── 6) Per-student XP settings ──────────────────────────────────────────────
create table if not exists public.student_xp_settings (
  student_id uuid primary key references public.students(id) on delete cascade,
  daily_goal integer not null default 50
);
alter table public.student_xp_settings enable row level security;
create policy "student_xp_settings owner select" on public.student_xp_settings
  for select using (student_id = auth.uid());
create policy "student_xp_settings owner insert" on public.student_xp_settings
  for insert with check (student_id = auth.uid());
create policy "student_xp_settings owner update" on public.student_xp_settings
  for update using (student_id = auth.uid());

-- ── 7) Arcade ───────────────────────────────────────────────────────────────
create table if not exists public.arcade_games (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_type text not null check (game_type in ('match_up', 'term_blaster', 'sort_it', 'fill_gap')),
  theme text not null default 'minimal',
  topic text not null,
  subject text not null,
  material_id uuid references public.materials(id) on delete set null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_arcade_games_student on public.arcade_games(student_id, created_at);
alter table public.arcade_games enable row level security;
create policy "arcade_games owner select" on public.arcade_games
  for select using (student_id = auth.uid());
create policy "arcade_games owner insert" on public.arcade_games
  for insert with check (student_id = auth.uid());
create policy "arcade_games owner delete" on public.arcade_games
  for delete using (student_id = auth.uid());

create table if not exists public.arcade_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_id uuid not null references public.arcade_games(id) on delete cascade,
  score integer not null,
  accuracy numeric(5,2) not null,
  duration_seconds integer not null,
  details jsonb not null default '{}',
  played_at timestamptz not null default now()
);
create index if not exists idx_arcade_attempts_student on public.arcade_attempts(student_id, played_at);
alter table public.arcade_attempts enable row level security;
create policy "arcade_attempts owner select" on public.arcade_attempts
  for select using (student_id = auth.uid());
create policy "arcade_attempts owner insert" on public.arcade_attempts
  for insert with check (student_id = auth.uid());

-- ── 8) Projects + study plans ───────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  subject text not null,
  color text not null default 'lavender' check (color in ('lavender', 'blush', 'sage', 'butter')),
  test_dates jsonb not null default '[]',
  topics jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "projects owner select" on public.projects
  for select using (student_id = auth.uid());
create policy "projects owner insert" on public.projects
  for insert with check (student_id = auth.uid());
create policy "projects owner update" on public.projects
  for update using (student_id = auth.uid());
create policy "projects owner delete" on public.projects
  for delete using (student_id = auth.uid());

create table if not exists public.project_materials (
  project_id uuid not null references public.projects(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  primary key (project_id, material_id)
);
alter table public.project_materials enable row level security;
create policy "project_materials owner all" on public.project_materials
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.student_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.student_id = auth.uid())
  );

create table if not exists public.study_plan_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  topic text not null,
  activity_type text not null check (activity_type in ('quiz', 'flashcards', 'game', 'chat', 'review')),
  description text not null default '',
  scheduled_date date,
  status text not null default 'locked' check (status in ('locked', 'current', 'completed')),
  order_index integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_study_plan_nodes_project on public.study_plan_nodes(project_id, order_index);
alter table public.study_plan_nodes enable row level security;
create policy "study_plan_nodes owner all" on public.study_plan_nodes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.student_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.student_id = auth.uid())
  );

-- ── 9) Planner: calendar events + todos ─────────────────────────────────────
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  description text,
  project_id uuid references public.projects(id) on delete set null,
  color text not null default 'lavender' check (color in ('lavender', 'blush', 'sage', 'butter')),
  type text not null default 'manual' check (type in ('manual', 'auto')),
  created_at timestamptz not null default now()
);
create index if not exists idx_calendar_events_student_date on public.calendar_events(student_id, date);
alter table public.calendar_events enable row level security;
create policy "calendar_events owner all" on public.calendar_events
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  project_id uuid references public.projects(id) on delete set null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_todos_student on public.todos(student_id, completed, due_date);
alter table public.todos enable row level security;
create policy "todos owner all" on public.todos
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ── 10) Mini-lessons ────────────────────────────────────────────────────────
create table if not exists public.mini_lessons (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  segments jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_mini_lessons_material on public.mini_lessons(material_id);
alter table public.mini_lessons enable row level security;
create policy "mini_lessons owner select" on public.mini_lessons
  for select using (student_id = auth.uid());
create policy "mini_lessons owner insert" on public.mini_lessons
  for insert with check (student_id = auth.uid());
create policy "mini_lessons owner delete" on public.mini_lessons
  for delete using (student_id = auth.uid());

-- ── 11) Badge seeds ─────────────────────────────────────────────────────────
-- Tier colors: 1 = butter, 2 = sage, 3 = lavender (icon column stores a
-- lucide icon name; the UI maps tier → accent color).
insert into public.badges (id, name, description, category, tier, icon, xp_bonus, unlock_condition) values
  ('spark-1',        'Spark I',            'Reach a 3-day study streak',                    'streak',   1, 'flame',      10, '{"type":"streak","days":3}'),
  ('spark-2',        'Spark II',           'Reach a 7-day study streak',                    'streak',   2, 'flame',      20, '{"type":"streak","days":7}'),
  ('spark-3',        'Spark III',          'Reach a 14-day study streak',                   'streak',   3, 'flame',      40, '{"type":"streak","days":14}'),
  ('onfire-1',       'On Fire I',          'Reach a 30-day study streak',                   'streak',   1, 'flame-kindling', 60, '{"type":"streak","days":30}'),
  ('onfire-2',       'On Fire II',         'Reach a 60-day study streak',                   'streak',   2, 'flame-kindling', 100, '{"type":"streak","days":60}'),
  ('onfire-3',       'On Fire III',        'Reach a 100-day study streak',                  'streak',   3, 'flame-kindling', 200, '{"type":"streak","days":100}'),
  ('quiz-machine-1', 'Quiz Machine I',     'Complete 10 quizzes or tests',                  'activity', 1, 'file-question', 20, '{"type":"count","metric":"quizzes","n":10}'),
  ('quiz-machine-2', 'Quiz Machine II',    'Complete 50 quizzes or tests',                  'activity', 2, 'file-question', 50, '{"type":"count","metric":"quizzes","n":50}'),
  ('quiz-machine-3', 'Quiz Machine III',   'Complete 100 quizzes or tests',                 'activity', 3, 'file-question', 100, '{"type":"count","metric":"quizzes","n":100}'),
  ('game-master-1',  'Game Master I',      'Play 10 arcade games',                          'activity', 1, 'gamepad-2',  20, '{"type":"count","metric":"games","n":10}'),
  ('game-master-2',  'Game Master II',     'Play 50 arcade games',                          'activity', 2, 'gamepad-2',  50, '{"type":"count","metric":"games","n":50}'),
  ('game-master-3',  'Game Master III',    'Play 100 arcade games',                         'activity', 3, 'gamepad-2',  100, '{"type":"count","metric":"games","n":100}'),
  ('bookworm-1',     'Bookworm I',         'Upload 5 course materials',                     'activity', 1, 'book-open',  15, '{"type":"count","metric":"materials","n":5}'),
  ('bookworm-2',     'Bookworm II',        'Upload 15 course materials',                    'activity', 2, 'book-open',  35, '{"type":"count","metric":"materials","n":15}'),
  ('bookworm-3',     'Bookworm III',       'Upload 30 course materials',                    'activity', 3, 'book-open',  75, '{"type":"count","metric":"materials","n":30}'),
  ('team-player-1',  'Team Player I',      'Check in after 5 study group sessions',         'activity', 1, 'users-2',    20, '{"type":"count","metric":"checkins","n":5}'),
  ('team-player-2',  'Team Player II',     'Check in after 15 study group sessions',        'activity', 2, 'users-2',    50, '{"type":"count","metric":"checkins","n":15}'),
  ('team-player-3',  'Team Player III',    'Check in after 30 study group sessions',        'activity', 3, 'users-2',    100, '{"type":"count","metric":"checkins","n":30}'),
  ('planner-1',      'Planner I',          'Complete 20 to-do tasks',                       'activity', 1, 'list-checks', 15, '{"type":"count","metric":"todos","n":20}'),
  ('planner-2',      'Planner II',         'Complete 50 to-do tasks',                       'activity', 2, 'list-checks', 35, '{"type":"count","metric":"todos","n":50}'),
  ('planner-3',      'Planner III',        'Complete 100 to-do tasks',                      'activity', 3, 'list-checks', 75, '{"type":"count","metric":"todos","n":100}'),
  ('rising-star',    'Rising Star',        'Reach 70% mastery in any topic',                'mastery',  1, 'star',       25, '{"type":"mastery_any","score":70}'),
  ('subject-expert', 'Subject Expert',     'Reach 90% mastery in every topic of a subject', 'mastery',  3, 'graduation-cap', 150, '{"type":"mastery_subject","score":90}'),
  ('level-up',       'Level Up',           'Take a topic from below 40% to above 70%',      'mastery',  2, 'trending-up', 75, '{"type":"mastery_comeback","from":40,"to":70}')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  tier = excluded.tier,
  icon = excluded.icon,
  xp_bonus = excluded.xp_bonus,
  unlock_condition = excluded.unlock_condition;
