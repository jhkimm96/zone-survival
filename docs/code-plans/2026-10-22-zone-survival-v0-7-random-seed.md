---
status: approved
approved_at: 2026-10-22T13:49
files:
  - src/seed.js
  - src/main.js
  - src/config.js
  - tests/seed.test.mjs
  - tests/game.test.mjs
tests_first:
  - impl: src/seed.js
    test: tests/seed.test.mjs
---

# zone-survival v0.7 계획: 판마다 무작위 시드

이유: 새로고침하면 항상 같은 1번 시드의 첫 판이 나와 같은 지도를 외울 수 있고, 클리어율이 실제보다 높게 나올 수 있다.
사용자 승인(2026-10-22): 판마다 무작위로 바꾼다.

## 규칙

- 기본: 판마다 1 ~ 2,000,000,000 범위의 무작위 시드를 쓴다. 시드는 기록에 그대로 남는다.
- ?seed=N 주소: N이 1 이상의 정수이면 기존처럼 N, N+1, N+2 순서(같은 조건 재현용).
- ?seed 값이 숫자가 아니거나 0 이하면 무시하고 무작위로 한다.
- 버전 v0.7로 올려 이전 기록(고정 시드)과 구분한다.

## 파일

새 파일 src/seed.js(pickRunSeed). 수정은 main.js(시드 고르는 한 줄), config.js(version), 테스트, README, docs/balance-log.md.

## 테스트 (구현 전에 먼저 작성)

?seed 지정 시 판 번호대로 증가, 지정 없음/잘못된 값이면 무작위(1 이상 상한 이하의 정수), 판마다 다른 값, 상한 경계.
