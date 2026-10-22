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

-- 한 줄 의견. 판 기록(runs)과 version, player, run_number, seed로 연결한다. 이 파일은 여러 번 실행해도 안전하다.
create table if not exists public.run_notes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  version     text not null check (char_length(version) <= 20),
  player      text not null check (char_length(player) <= 20),
  run_number  int  not null check (run_number between 1 and 10000),
  seed        int  not null,
  env         text not null check (env in ('local', 'deployed')),
  note        text not null check (char_length(note) between 1 and 100)
);

alter table public.run_notes enable row level security;

drop policy if exists "run_notes_insert_only" on public.run_notes;
create policy "run_notes_insert_only"
  on public.run_notes
  for insert
  to anon
  with check (true);

grant insert on public.run_notes to anon;

-- 익명 ID(브라우저가 처음 열 때 만든 무작위 값). 같은 사람의 여러 판을 묶는 데만 쓴다.
alter table public.runs
  add column if not exists player_id text check (player_id is null or char_length(player_id) <= 40);
alter table public.run_notes
  add column if not exists player_id text check (player_id is null or char_length(player_id) <= 40);
