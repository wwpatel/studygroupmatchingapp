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
  created_at timestamptz not null default now()
);

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
-- AI-generated quiz / test / flashcards tied to a material.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  type text not null check (type in ('quiz', 'test', 'flashcards')),
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

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

-- groups: visible to members.
create policy "groups select member" on public.groups
  for select using (
    id in (select group_id from public.group_members where student_id = auth.uid())
  );

-- group_members: visible to fellow members.
create policy "group_members select member" on public.group_members
  for select using (
    group_id in (select group_id from public.group_members where student_id = auth.uid())
  );

-- sessions: visible/writable by group members.
create policy "sessions select member" on public.sessions
  for select using (
    group_id in (select group_id from public.group_members where student_id = auth.uid())
  );
create policy "sessions insert member" on public.sessions
  for insert with check (
    group_id in (select group_id from public.group_members where student_id = auth.uid())
  );
create policy "sessions update member" on public.sessions
  for update using (
    group_id in (select group_id from public.group_members where student_id = auth.uid())
  );

-- checkins: owner writes own; group members can view all check-ins for their sessions.
create policy "checkins select member" on public.checkins
  for select using (
    session_id in (
      select s.id from public.sessions s
      join public.group_members gm on gm.group_id = s.group_id
      where gm.student_id = auth.uid()
    )
  );
create policy "checkins insert own" on public.checkins
  for insert with check (student_id = auth.uid());

-- messages: group members only.
create policy "messages select member" on public.messages
  for select using (
    group_id in (select group_id from public.group_members where student_id = auth.uid())
  );
create policy "messages insert member" on public.messages
  for insert with check (
    student_id = auth.uid()
    and group_id in (select group_id from public.group_members where student_id = auth.uid())
  );

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
