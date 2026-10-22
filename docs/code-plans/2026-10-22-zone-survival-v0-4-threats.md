---
status: approved
approved_at: 2026-10-22T12:44
files:
  - src/config.js
  - src/damage.js
  - src/bombs.js
  - src/chasers.js
  - src/game.js
  - src/runlog.js
  - src/render.js
  - src/main.js
  - tools/report.mjs
  - tests/bombs.test.mjs
  - tests/chasers.test.mjs
  - tests/game.test.mjs
  - tests/report.test.mjs
tests_first:
  - impl: src/bombs.js
    test: tests/bombs.test.mjs
  - impl: src/chasers.js
    test: tests/chasers.test.mjs
  - impl: src/game.js
    test: tests/game.test.mjs
  - impl: tools/report.mjs
    test: tests/report.test.mjs
---

# zone-survival v0.4 계획: 폭격과 추적자, 안내 표시

사용자 플레이 소감("자기장은 누구라도 피한다, 방해 요소가 필요하다, 아이템 설명과 남은 시간이 필요하다")과
봇 결과(예고를 보고 이동하는 봇이 500/500 클리어)에 따라 자기장 외의 위협 두 가지를 넣고 안내 표시를 추가한다.
목표 클리어율은 40%에서 약 15~20%로 낮춘다(가설, 사람 기록 전까지 [미확인]).

승인된 계획안(2026-10-22 사용자 승인)의 요약이다.

## 새 규칙 (초기값은 모두 가설)

- 폭격: 20초부터 8초마다, 플레이어 주변 14m 안에 붉은(주황) 원(반경 6m) 2~5개(자기장 단계 0~3에 따라 2, 3, 4, 5개).
  2.5초 뒤 폭발해 안에 있으면 피해 35.
- 추적자: 40초부터 20초마다 1마리, 동시에 최대 4마리, 수명 45초, 속도 4.5m/s, 플레이어에서 35m 떨어진 곳에 생성,
  1.5m 안에 닿으면 초당 20 피해. 장애물은 통과하지 못한다.
- 보호 아이템은 자기장뿐 아니라 폭격과 추적자 피해도 막는다.
- 로그에 사망 원인(zone, bomb, chaser)과 원인별 받은 피해를 추가한다.

## 파일

- 새 파일: src/damage.js(피해 적용과 보호 판정), src/bombs.js, src/chasers.js, tests/bombs.test.mjs, tests/chasers.test.mjs
- 수정: config.js, game.js, runlog.js, render.js, main.js, index.html, style.css, tools/report.mjs, tests/game.test.mjs, tests/report.test.mjs, docs/balance/bot-sim.mjs

## step 흐름

이동 -> 아이템 -> 폭격 생성 -> 폭격 폭발 -> 추적자 생성 -> 추적자 이동 -> 추적자 접촉 피해 -> 자기장 피해 -> 종료 판정

## 하지 않는 것

적의 길찾기와 공격, 총, 효과음, 새 아이템.

## 테스트 (구현 전에 먼저 작성)

폭격 시작 시각과 단계별 개수, 예고 시간 뒤 폭발과 피해, 밖이면 피해 없음, 보호 중 피해 없음, 같은 시드와 입력의 재현성,
추적자 최대 수, 수명, 속도, 장애물 막힘, 접촉 피해, 사망 원인과 원인별 피해 기록, 리포트 사망 원인 집계.
