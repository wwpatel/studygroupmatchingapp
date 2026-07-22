-- ═══════════════════════════════════════════════════════════════════════════
-- Nova expansion migration — run this ONCE in the Supabase SQL editor.
-- Covers: in-chat quizzes, gamification (XP/streaks/badges), Arcade,
-- Projects + study plans, Planner (calendar/todos), and mini-lessons.
-- Everything is idempotent-ish (create table if not exists / add column if
-- not exists); policies will error if re-run — run once on the existing DB.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0) In-chat quizzes: quizzes generated in chat may have no material ──────
alter table public.generated_content alter column material_id drop not null;

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
