---
status: approved
approved_at: 2026-10-22T13:35
files:
  - src/config.js
  - src/bombs.js
  - src/game.js
  - src/runlog.js
  - src/remote.js
  - src/main.js
  - supabase/schema.sql
  - tests/bombs.test.mjs
  - tests/game.test.mjs
  - tests/remote.test.mjs
tests_first:
  - impl: src/bombs.js
    test: tests/bombs.test.mjs
  - impl: src/remote.js
    test: tests/remote.test.mjs
---

# zone-survival v0.5 계획: 추적자 처치와 한 줄 의견 저장

사용자 결정(2026-10-22): 추적자를 죽이는 방법으로 A안(폭격이 추적자도 맞춘다)을 쓴다.
한 줄 의견도 DB에 저장한다.

## 규칙

- 폭격이 터질 때 원 안(중심 거리가 반지름 이하)에 있는 추적자는 사라진다.
- 처치한 수를 기록(chasersKilled)해 로그와 Supabase record에 남긴다.
- 버전 v0.5.

## 한 줄 의견

- 판 기록은 결과 화면이 뜨는 즉시 runs 테이블에 저장한다(의견 없이). 그래서 창을 닫아도 기록은 남는다.
- 의견은 별도 run_notes 테이블(익명 키로 insert만 허용)에 "의견 보내기" 버튼으로 저장한다. 버전, 라벨, 판 번호, 시드로 판과 연결한다.
- 100자 제한, 빈 의견은 전송하지 않는다. "기록 복사"는 예비로 유지한다.

## 테스트 (구현 전에 먼저 작성)

폭격 원 안의 추적자 처치와 원 밖 추적자 유지, 처치 수 기록, 의견 요청 본문과 100자 제한, 빈 의견 미전송, 의견 전송 실패 처리.
