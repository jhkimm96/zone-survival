---
status: approved
approved_at: 2026-10-21T13:03
files:
  - src/config.js
  - src/world.js
  - src/zone.js
  - src/items.js
  - src/game.js
  - src/runlog.js
  - src/input.js
  - src/render.js
  - src/main.js
  - tests/world.test.mjs
  - tests/zone.test.mjs
  - tests/items.test.mjs
  - tests/game.test.mjs
tests_first:
  - impl: src/world.js
    test: tests/world.test.mjs
  - impl: src/zone.js
    test: tests/zone.test.mjs
  - impl: src/items.js
    test: tests/items.test.mjs
  - impl: src/game.js
    test: tests/game.test.mjs
---

# zone-survival v0.3 계획: 2D 큰 지도

9x9 칸 이동을 200x200m 연속 지도로 바꾼다. 캐릭터가 부드럽게 걷고, 화면은 캐릭터를 따라가며,
미니맵이 있고, 자기장은 원으로 줄어들고, 장애물(바위)이 있다. 밸런스 수정이 아니라 엔진 교체이므로
봇 기준선을 새로 측정해 docs/balance-log.md에 v0.3 기준선으로 기록한다.

승인된 계획안(2026-10-21 사용자 승인)의 요약이다. 상세는 대화 기록과 docs/balance-log.md 참고.

## 파일 변경

- 새 파일: src/world.js (장애물 생성, 충돌 밀어내기, 월드 경계), tests/world.test.mjs
- 교체: src/config.js(미터 단위 수치), src/zone.js(원), src/items.js(연속 좌표), src/game.js(벡터 이동), src/runlog.js(deathCell -> deathPos), src/input.js(이동 벡터, 가상 조이스틱), src/render.js(카메라, 미니맵)
- 테스트 교체: zone, items, game
- 변경 없음: tools/report.mjs, src/rng.js, src/main.js(필요 시 최소 수정)

## 함수

- world.js: planObstacles(seed, startPosition, config), pushOutOfObstacles(position, radius, obstacles), keepInsideWorld(position, radius, config)
- zone.js: planZones(seed), zoneAt(plan, sec), stageIndexAt, isInsideZone(circle, x, y), damagePerSecondAt, upcomingZoneAt, startPositionFor(plan)
- items.js: planItemSpawns(seed, plan, obstacles), applyItem
- game.js: createRun(seed), step(run, direction), activeItems(run)
- render.js: drawRun(ctx, run, pixelSize): 카메라 화면 + 미니맵

## 초기값 (모두 가설, 로그로 검증 전까지 [미확인])

월드 200x200m, 시작 = 최종 원에서 가장 먼 모서리 안쪽 5m, 이동 6m/s, 반경 0.6m, 틱 30/초,
자기장 반지름 142 -> 90 -> 50 -> 20m (30/70/110초에 20초 동안 줄어듦, 피해 5/8/12 HP/초),
아이템 6초마다 1개 동시 8개 수명 45초 획득 반경 2m, 장애물 40개 반경 1.5~3m.

## 빼는 것

3D, 건물, 지형 높이, 총과 적, 서버, 물리 엔진, 효과음, 카메라 보간.

## 테스트 (구현 전에 먼저 작성)

world, zone, items, game 테스트를 연속 좌표 기준으로 다시 쓴다. 화면(render, input)은 브라우저에서 직접 확인한다.
