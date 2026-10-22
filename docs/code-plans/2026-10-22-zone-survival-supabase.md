---
status: approved
approved_at: 2026-10-22T13:05
files:
  - src/config.js
  - src/remote.js
  - src/main.js
  - supabase/schema.sql
  - tests/remote.test.mjs
tests_first:
  - impl: src/remote.js
    test: tests/remote.test.mjs
---

# zone-survival Supabase 기록 저장 계획

판이 끝나면 기록 한 줄을 Supabase에 자동 저장한다. "기록 복사"는 예비로 유지한다.
승인된 계획안(2026-10-22 사용자 승인)의 요약이다.

## 구성

- supabase/schema.sql: runs 테이블과 RLS 정책(익명 키로 insert만 허용, 조회/수정/삭제 불가). 사용자가 Supabase SQL Editor에서 한 번 실행한다.
- src/remote.js: buildInsertRequest(record, env, config), sendRunRecord(record, env, fetchFunction, config)
  - 실패해도 예외를 던지지 않고 {ok, reason}을 돌려준다. 설정이 비어 있으면 요청하지 않는다.
  - 공개용(publishable) 키만 쓰고 Authorization 헤더는 보내지 않는다. service_role 키는 쓰지 않는다.
- src/config.js: remote.url, remote.publishableKey
- src/main.js: 판이 끝나면 전송하고 결과 화면에 성공/실패 한 줄을 보인다. 한 줄 의견은 기록 복사 경로에만 포함된다.

## 테스트 (구현 전에 먼저 작성)

요청 주소·헤더·본문 매핑, 성공/HTTP 오류/네트워크 오류 처리(예외 없음), 설정 없음, 플레이어 라벨 길이 제한.
