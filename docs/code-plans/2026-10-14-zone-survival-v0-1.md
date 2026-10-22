---
status: approved
approved_at: 2026-10-14T22:21
files:
  - src/config.js
  - src/rng.js
  - src/zone.js
  - src/items.js
  - src/game.js
  - src/runlog.js
  - src/input.js
  - src/render.js
  - src/main.js
  - tools/report.mjs
  - tests/zone.test.mjs
  - tests/items.test.mjs
  - tests/game.test.mjs
  - tests/report.test.mjs
tests_first:
  - impl: src/zone.js
    test: tests/zone.test.mjs
  - impl: src/items.js
    test: tests/items.test.mjs
  - impl: src/game.js
    test: tests/game.test.mjs
  - impl: src/runlog.js
    test: tests/game.test.mjs
  - impl: tools/report.mjs
    test: tests/report.test.mjs
---

# zone-survival v0.1 계획

규칙·수치표 v0.1대로 움직이는 웹 미니게임.
규칙 설계와 로그 기반 밸런스 조정 과정을 보여주는 포트폴리오용 프로젝트다.

## 1. 파일

- 로직: src/config.js, rng.js, zone.js, items.js, game.js, runlog.js
- 화면: src/input.js, render.js, main.js, index.html, style.css
- 집계: tools/report.mjs
- 테스트: tests/zone, items, game, report
- 자동화: .github/workflows/ci.yml, pages.yml

## 2. 함수와 흐름

- createRng, pickInt (rng.js)
- planZones, stageIndexAt, safeRegionAt, damagePerSecondAt, isInRegion, upcomingStageAt (zone.js)
- planItemSpawns, applyItem (items.js)
- createRun, step, activeItems (game.js): step은 이동, 아이템 획득, 자기장 피해, 종료 판정 순서
- buildRunRecord, toLogLine (runlog.js)
- parseLogLines, summarize, formatReport (tools/report.mjs)
- main: 시작, createRun, 0.1초마다 step, drawRun, 종료 시 buildRunRecord, 결과 화면, 기록 복사

## 3. 기존 코드와의 연관

해당 없음(새 프로젝트).

## 4. 빼도 되는 것

라이브러리, 빌드 도구, 서버, 부드러운 이동 애니메이션, Docker, 모니터링.

## 5. 읽히는 코드 점검

시간은 sec, 내부 단위는 tick으로 이름에 구분. 주석은 이유만.

## 6. 루브릭 예측

대부분 해당 없음(웹 게임, 레이어 구조 없음). 설계상 위험: 시작 위치가 중앙이면 1, 2단계 자기장이 영향 없음. 첫 버전은 수치표대로 만들고 봇 시뮬레이션으로 확인한 뒤 시작 위치 변경을 첫 수정으로 기록.

## 7. 테스트 계획 (구현 전에 먼저 작성)

- zone: 같은 시드는 같은 계획, 300개 시드에서 영역 포함 관계, 시각별 단계와 피해량, 예고 10초 전과 깜빡임 5초 전
- items: 같은 시드는 같은 일정, 15초마다 생성되고 안전 영역 안, 겹침 없음과 최대 3개, 회복 상한, 가속 8초와 보호 5초
- game: 중앙을 덮는 시드에서 가만히 있으면 클리어, 덮지 않으면 3단계 사망, 이동 속도, 아이템 한 번만 획득, 보호 중 피해 없음, 영역 밖 피해량, 기록 필드
- report: 비율에 분모 표기, 30판 미만 [추정], 기록 없음 [미확인], 잘못된 줄 건너뜀
- 구현 후: 화면(main, render, input)은 브라우저에서 직접 확인
