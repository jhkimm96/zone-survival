import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInsertRequest, buildNoteRequest, sendRunNote, sendRunRecord } from '../src/remote.js';

const REMOTE = { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' };
const CONFIG = { remote: REMOTE };
const CONTEXT = { env: 'deployed', device: 'touch' };

function record(overrides = {}) {
  return {
    version: 'v0.4',
    seed: 3,
    player: 'A',
    runNumber: 2,
    cleared: false,
    surviveSec: 61.5,
    deathStage: 2,
    deathCause: 'chaser',
    deathPos: { x: 10, y: 20 },
    itemsGot: { heal: 1, haste: 0, shield: 0 },
    damageTaken: { zone: 5, bomb: 35, chaser: 60 },
    outsideSec: 4,
    note: '',
    ...overrides,
  };
}

test('요청은 runs 테이블에 POST하고, 공개 키만 apikey 헤더로 보낸다', () => {
  const request = buildInsertRequest(record(), CONTEXT, CONFIG);
  assert.equal(request.url, 'https://example.supabase.co/rest/v1/runs');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.apikey, 'sb_publishable_test');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.equal(request.options.headers.Prefer, 'return=minimal');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
});

test('본문은 분석용 칸, 실행 환경(env, device), 기록 전체(record)를 담는다', () => {
  const body = JSON.parse(buildInsertRequest(record(), { env: 'local', device: 'keyboard' }, CONFIG).options.body);
  assert.equal(body.version, 'v0.4');
  assert.equal(body.player, 'A');
  assert.equal(body.run_number, 2);
  assert.equal(body.seed, 3);
  assert.equal(body.cleared, false);
  assert.equal(body.survive_sec, 61.5);
  assert.equal(body.death_stage, 2);
  assert.equal(body.death_cause, 'chaser');
  assert.equal(body.env, 'local');
  assert.equal(body.device, 'keyboard');
  assert.deepEqual(body.record, record());
});

test('플레이어 라벨은 20자로 자른다', () => {
  const body = JSON.parse(buildInsertRequest(record({ player: 'x'.repeat(50) }), CONTEXT, CONFIG).options.body);
  assert.equal(body.player.length, 20);
});

test('전송에 성공하면 ok다', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 201 };
  };
  const outcome = await sendRunRecord(record(), CONTEXT, fakeFetch, CONFIG);
  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.length, 1);
});

test('HTTP 오류는 예외 없이 이유와 함께 실패로 돌려준다', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401 });
  assert.deepEqual(await sendRunRecord(record(), CONTEXT, fakeFetch, CONFIG), { ok: false, reason: 'HTTP 401' });
});

test('네트워크 오류도 예외 없이 실패로 돌려준다', async () => {
  const fakeFetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  assert.deepEqual(await sendRunRecord(record(), CONTEXT, fakeFetch, CONFIG), { ok: false, reason: '네트워크 오류' });
});

test('설정이 비어 있으면 요청하지 않는다', async () => {
  let called = false;
  const fakeFetch = async () => {
    called = true;
    return { ok: true, status: 201 };
  };
  const outcome = await sendRunRecord(record(), CONTEXT, fakeFetch, { remote: { url: '', publishableKey: '' } });
  assert.deepEqual(outcome, { ok: false, reason: '저장소 설정 없음' });
  assert.equal(called, false);
});

test('의견 요청은 run_notes 테이블에 판 정보와 함께 POST한다', () => {
  const request = buildNoteRequest(record(), '추적자가 너무 빠르다', CONTEXT, CONFIG);
  assert.equal(request.url, 'https://example.supabase.co/rest/v1/run_notes');
  assert.equal(request.options.headers.apikey, 'sb_publishable_test');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(request.options.body), {
    version: 'v0.4',
    player: 'A',
    run_number: 2,
    seed: 3,
    env: 'deployed',
    note: '추적자가 너무 빠르다',
  });
});

test('의견은 100자로 자르고 앞뒤 공백을 지운다', () => {
  const body = JSON.parse(buildNoteRequest(record(), `  ${'가'.repeat(150)}  `, CONTEXT, CONFIG).options.body);
  assert.equal(body.note.length, 100);
});

test('빈 의견은 요청하지 않는다', async () => {
  let called = false;
  const fakeFetch = async () => {
    called = true;
    return { ok: true, status: 201 };
  };
  assert.deepEqual(await sendRunNote(record(), '   ', CONTEXT, fakeFetch, CONFIG), { ok: false, reason: '의견이 비어 있음' });
  assert.equal(called, false);
});

test('의견 전송 성공과 실패를 예외 없이 돌려준다', async () => {
  assert.deepEqual(await sendRunNote(record(), '재밌다', CONTEXT, async () => ({ ok: true, status: 201 }), CONFIG), { ok: true });
  assert.deepEqual(await sendRunNote(record(), '재밌다', CONTEXT, async () => ({ ok: false, status: 400 }), CONFIG), { ok: false, reason: 'HTTP 400' });
  const failing = async () => {
    throw new TypeError('Failed to fetch');
  };
  assert.deepEqual(await sendRunNote(record(), '재밌다', CONTEXT, failing, CONFIG), { ok: false, reason: '네트워크 오류' });
});
