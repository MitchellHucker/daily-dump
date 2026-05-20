-- Phase 3.3: shared global general headlines (one row per UTC day)
create table if not exists general_news (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  articles jsonb not null,
  created_at timestamptz default now()
);
