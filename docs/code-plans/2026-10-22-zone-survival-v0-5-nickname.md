---
status: approved
approved_at: 2026-10-22T13:17
files:
  - src/identity.js
  - src/runlog.js
  - src/remote.js
  - src/main.js
  - tools/report.mjs
  - supabase/schema.sql
  - tests/identity.test.mjs
  - tests/game.test.mjs
  - tests/remote.test.mjs
  - tests/report.test.mjs
tests_first:
  - impl: src/identity.js
    test: tests/identity.test.mjs
---

# zone-survival 닉네임과 익명 ID 계획

링크 하나로 누구나 들어와 플레이하게 한다. A/B/C 링크 대신 시작 화면에서 닉네임을 입력하고(선택),
처음 열 때 무작위 익명 ID를 만들어 브라우저에 저장한다. 사용자 승인(2026-10-22).

## 규칙

- 닉네임: 선택, 최대 12자, 앞뒤 공백 제거, 브라우저에 기억. 실명·전화번호·이메일은 받지 않는다(안내 문구로 안내).
- 익명 ID: 처음 열 때 crypto.randomUUID()로 만들어 브라우저에 저장. 플레이어 수는 이 ID로 센다.
- 기존 ?p=A 링크는 그대로 동작한다(?p= 값이 닉네임보다 우선).
- 닉네임이 비어 있으면 라벨은 guest.
- 브라우저 저장소를 못 써도(시크릿 모드 등) 게임은 동작한다(ID는 그 세션에서만 유지).
- 기록과 의견에 player_id를 추가해 저장한다. DB에는 player_id 칸을 추가한다(SQL 다시 실행).
- 리포트의 플레이어 수는 player_id 기준(없으면 라벨 기준).

## 파일

새 파일 src/identity.js (loadIdentity, rememberNickname, playerLabel). 수정은 runlog, remote, main, report, schema.sql, index.html, style.css와 테스트.

## 테스트 (구현 전에 먼저 작성)

ID 생성과 유지, 저장소 오류 시 동작, ?p= 우선, 닉네임 정리(공백, 12자), 빈 닉네임의 guest, 기록과 요청 본문의 player_id, 리포트의 ID 기준 플레이어 수.
