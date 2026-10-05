-- OmniSphere learner profiles, onboarding preferences and private lesson progress.
-- Auth-owned rows are removed automatically when auth.users is deleted.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Learner',
  grade_level text,
  primary_goals text[] not null default '{}',
  selected_topics text[] not null default '{}',
  preferred_learning_format text not null default 'quick-summaries',
  onboarding_responses jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  learning_streak integer not null default 0 check (learning_streak >= 0),
  last_learning_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_user_lesson_unique unique (user_id, lesson_id),
  constraint completed_lessons_have_full_progress check (not completed or progress = 100)
);

alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;

create policy "Learners can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Learners can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Learners can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Learners can read their own lesson progress"
  on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Learners can create their own lesson progress"
  on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Learners can update their own lesson progress"
  on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Learners can remove their own lesson progress"
  on public.lesson_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

-- RLS controls which rows are reachable; explicit grants expose only the required operations.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
