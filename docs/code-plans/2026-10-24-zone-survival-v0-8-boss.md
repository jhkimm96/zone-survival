---
status: approved
approved_at: 2026-10-24T23:09
files:
  - src/boss.js
  - src/config.js
  - src/game.js
  - src/world.js
  - src/chasers.js
  - src/render.js
  - src/main.js
  - index.html
  - style.css
  - supabase/schema.sql
  - tools/report.mjs
  - docs/balance/bot-sim.mjs
  - tests/boss.test.mjs
  - tests/boss-skills.test.mjs
  - tests/game.test.mjs
  - tests/report.test.mjs
tests_first:
  - impl: src/boss.js
    test: tests/boss.test.mjs
  - impl: src/boss.js
    test: tests/boss-skills.test.mjs
---

# zone-survival v0.8 계획: 초록 십자가 체력 아이템과 불사 보스

사용자 결정(2026-10-24): 조카용. v0.8 한 버전으로 내보내되 되돌리기 쉽게 커밋을 셋으로 나눈다.

| 커밋 | 내용 |
|---|---|
| ① 체력 십자가 | 연두(#4ade5a) 십자가 + 흰 테두리, 범례 문구, 버전 v0.8 |
| ② 보스 | 130초 등장, 따라오기, 몸 닿기 피해, 사망 원인 boss/ruby/shockwave 허용(DB 포함) |
| ③ 보스 기술 | 루비 발사와 땅 찍기 충격파를 번갈아 사용 |

보스 기술 테스트는 커밋 ③과 함께 되돌릴 수 있도록 `tests/boss-skills.test.mjs`로 나눈다.

## 규칙 (config.boss)

- 130초에 플레이어에서 25m 떨어진 곳에 한 마리. 죽지 않는다(폭격 무시).
- 반지름 1.6m(그림), 닿는 거리 2.0m, 3.5 m/s, 장애물 통과 불가, 닿으면 초당 20 피해.
- 기술: 등장 4초 뒤 루비부터 8초마다 루비 → 충격파 번갈아.
- 루비: 왕관 루비 1초 충전(반짝임) → 발사 순간의 플레이어 방향으로 8 m/s 직선 비행. 맞으면 20 피해. 장애물에 닿거나 4초 뒤 사라진다.
- 충격파: 보스 위치에 반지름 7m 경고 원, 1.5초 뒤 안에 있으면 25 피해.
- 보호막은 세 피해를 모두 막는다(takeDamage 공통 경로).

## 함수

- `boss.js`: `spawnBossIfDue`, `moveBoss`, `damageFromBoss`, `useBossSkillIfDue`, `fireChargedRuby`, `moveRubyShots`, `detonateDueShockwaves`.
- `world.js`: `stepToward` — 추적자와 보스가 같이 쓰는 "목표 쪽으로 한 걸음" 이동.
- `render.js`: `drawCross`, `drawBoss`, `drawRubyShot`, `drawWarningCircle`(폭격·충격파 공용, 기존 drawBomb 대체), 미니맵 보스 점.
- 사망 원인 목록 갱신: main.js 결과 문구, tools/report.mjs, bot-sim.mjs, schema.sql.

## 뺀 것

보스 체력바, 등장 연출, 기술 전략 객체, 새 DB 컬럼(damageTaken은 jsonb record 안).

## 배포 순서

SQL Editor에서 death_cause 제한 이름 확인 → schema.sql 새 SQL 실행 → v0.8 push.

## 테스트 (구현 전에 먼저 작성)

boss.test.mjs: 등장 시각·위치·한 마리, 이동 속도와 장애물, 폭격 무시, 몸 닿기 피해.
boss-skills.test.mjs: 기술 순서와 간격, 루비 충전·조준·명중·소멸, 충격파 경고와 피해, 보호막.
구현 후: game.test.mjs(사망 원인 목록, damageTaken 키, 보스 사망 원인), report.test.mjs(새 원인 집계).
