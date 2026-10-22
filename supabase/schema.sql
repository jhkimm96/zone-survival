-- zone-survival 플레이 기록 테이블. Supabase 대시보드 > SQL Editor에 붙여넣고 Run을 한 번 누른다.
-- 익명(공개용) 키로는 insert만 가능하고 조회, 수정, 삭제는 막힌다. 기록은 Table Editor에서 내보내 분석한다.

create table if not exists public.runs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  version     text not null check (char_length(version) <= 20),
  player      text not null check (char_length(player) <= 20),
  run_number  int  not null check (run_number between 1 and 10000),
  seed        int  not null,
  cleared     boolean not null,
  survive_sec numeric not null check (survive_sec between 0 and 600),
  death_stage int,
  death_cause text check (death_cause in ('zone', 'bomb', 'chaser')),
  env         text not null check (env in ('local', 'deployed')),
  device      text not null check (device in ('keyboard', 'touch')),
  record      jsonb not null
);

alter table public.runs enable row level security;

drop policy if exists "runs_insert_only" on public.runs;
create policy "runs_insert_only"
  on public.runs
  for insert
  to anon
  with check (true);

-- select/update/delete 정책을 만들지 않으므로 anon은 조회와 수정이 불가능하다.
grant insert on public.runs to anon;
