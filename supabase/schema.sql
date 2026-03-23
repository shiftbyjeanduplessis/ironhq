-- IronHQ clean foundation schema
-- Purpose: establish a safe starting point for multi-club strength coaching.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text not null,
  primary_role text not null check (primary_role in ('admin', 'coach', 'athlete')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'coach', 'assistant_coach', 'athlete')),
  status text not null default 'active' check (status in ('active', 'paused', 'invited')),
  created_at timestamptz not null default now(),
  unique (club_id, profile_id)
);

create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  coach_profile_id uuid references profiles(id) on delete set null,
  sport text not null check (sport in ('Powerlifting', 'Bodybuilding', 'Olympic Weightlifting')),
  status text not null default 'active' check (status in ('active', 'paused', 'trial')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists program_templates (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  created_by_profile_id uuid references profiles(id) on delete set null,
  name text not null,
  phase text,
  total_weeks int not null check (total_weeks between 1 and 52),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists program_slots (
  id uuid primary key default gen_random_uuid(),
  program_template_id uuid not null references program_templates(id) on delete cascade,
  day_index int not null check (day_index between 1 and 7),
  title text not null,
  focus text,
  sort_order int not null default 0
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  program_template_id uuid references program_templates(id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'missed')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
