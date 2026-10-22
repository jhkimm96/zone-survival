import { CONFIG } from './config.js';

const PLAYER_LABEL_MAX_LENGTH = 20;
const NOTE_MAX_LENGTH = 100;

// 기록 한 줄을 Supabase(PostgREST) runs 테이블에 넣는 요청으로 바꾼다.
// 공개용(publishable) 키는 apikey 헤더로만 보내고, 테이블 권한(RLS)이 insert만 허용한다.
export function buildInsertRequest(record, context, config = CONFIG) {
  const { url, publishableKey } = config.remote;
  const body = {
    version: record.version,
    player: String(record.player).slice(0, PLAYER_LABEL_MAX_LENGTH),
    run_number: record.runNumber,
    seed: record.seed,
    cleared: record.cleared,
    survive_sec: record.surviveSec,
    death_stage: record.deathStage,
    death_cause: record.deathCause,
    env: context.env,
    device: context.device,
    record,
  };
  return {
    url: `${url}/rest/v1/runs`,
    options: {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    },
  };
}

// 한 줄 의견은 판 기록과 별도 테이블(run_notes)에 저장한다. 판 기록은 이미 저장돼 있으므로 버전, 라벨, 판 번호, 시드로 연결한다.
export function buildNoteRequest(record, note, context, config = CONFIG) {
  const { url, publishableKey } = config.remote;
  const body = {
    version: record.version,
    player: String(record.player).slice(0, PLAYER_LABEL_MAX_LENGTH),
    run_number: record.runNumber,
    seed: record.seed,
    env: context.env,
    note: note.trim().slice(0, NOTE_MAX_LENGTH),
  };
  return {
    url: `${url}/rest/v1/run_notes`,
    options: {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    },
  };
}

// 저장에 실패해도 게임을 멈추지 않도록 예외를 던지지 않고 결과만 돌려준다.
export async function sendRunRecord(record, context, fetchFunction = fetch, config = CONFIG) {
  if (!isConfigured(config)) return { ok: false, reason: '저장소 설정 없음' };
  return postRequest(buildInsertRequest(record, context, config), fetchFunction);
}

export async function sendRunNote(record, note, context, fetchFunction = fetch, config = CONFIG) {
  if (!isConfigured(config)) return { ok: false, reason: '저장소 설정 없음' };
  if (note.trim() === '') return { ok: false, reason: '의견이 비어 있음' };
  return postRequest(buildNoteRequest(record, note, context, config), fetchFunction);
}

function isConfigured(config) {
  return Boolean(config.remote.url && config.remote.publishableKey);
}

async function postRequest(request, fetchFunction) {
  try {
    const response = await fetchFunction(request.url, request.options);
    return response.ok ? { ok: true } : { ok: false, reason: `HTTP ${response.status}` };
  } catch {
    return { ok: false, reason: '네트워크 오류' };
  }
}
