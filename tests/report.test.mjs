import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLogLines, summarize, formatReport } from '../tools/report.mjs';

function record(overrides = {}) {
  return {
    version: 'v0.1',
    seed: 1,
    player: 'A',
    runNumber: 1,
    cleared: false,
    surviveSec: 100,
    deathStage: 2,
    deathPos: { x: 0, y: 0 },
    deathCause: 'zone',
    itemsGot: { heal: 1, haste: 0, shield: 1 },
    outsideSec: 10,
    note: '',
    ...overrides,
  };
}

test('잘못된 줄은 건너뛰고 개수를 센다', () => {
  const text = [JSON.stringify(record()), '이건 JSON이 아님', '{"version":"v0.1"}', ''].join('\n');
  const { records, skipped } = parseLogLines(text);
  assert.equal(records.length, 1);
  assert.equal(skipped, 2);
});

test('클리어율은 분자와 분모를 함께 계산한다', () => {
  const summary = summarize([record({ cleared: true, deathStage: null }), record(), record(), record()]);
  assert.equal(summary.runCount, 4);
  assert.equal(summary.clearedCount, 1);
  assert.equal(summary.playerCount, 1);
});

test('죽은 판만 사망 단계별로 센다', () => {
  const summary = summarize([
    record({ deathStage: 1 }),
    record({ deathStage: 3 }),
    record({ deathStage: 3 }),
    record({ cleared: true, deathStage: null }),
  ]);
  assert.deepEqual(summary.deathsByStage, { 1: 1, 2: 0, 3: 2 });
});

test('아이템 종류별 획득 수와 전체 합을 센다', () => {
  const summary = summarize([record(), record({ itemsGot: { heal: 2, haste: 1, shield: 0 } })]);
  assert.deepEqual(summary.itemsGot, { heal: 3, haste: 1, shield: 1 });
  assert.equal(summary.itemsGotTotal, 5);
});

test('리포트는 모든 비율에 분모를 쓰고 30판 미만이면 해석을 [추정]으로 표시한다', () => {
  const report = formatReport([record({ cleared: true, deathStage: null }), record()]);
  assert.match(report, /1\/2/);
  assert.match(report, /\[측정\]/);
  assert.match(report, /30판 미만.*\[추정\]/);
});

test('플레이어가 self뿐이면 자체 플레이라고 표시한다', () => {
  const report = formatReport([record({ player: 'self' })]);
  assert.match(report, /자체 플레이/);
});

test('기록이 없으면 [미확인]으로 쓴다', () => {
  assert.match(formatReport([]), /\[미확인\]/);
});

test('플레이어 수는 익명 ID 기준으로 센다 (닉네임이 같아도 ID가 다르면 다른 사람, ID가 없으면 라벨 기준)', () => {
  const summary = summarize([
    record({ player: '민수', playerId: 'id-1' }),
    record({ player: '민수', playerId: 'id-1' }),
    record({ player: '민수', playerId: 'id-2' }),
    record({ player: 'A', playerId: undefined }),
  ]);
  assert.equal(summary.playerCount, 3);
});

test('죽은 판의 사망 원인을 원인별로 센다 (원인 기록이 없는 옛 기록은 unknown)', () => {
  const summary = summarize([
    record({ deathCause: 'zone' }),
    record({ deathCause: 'bomb' }),
    record({ deathCause: 'bomb' }),
    record({ deathCause: 'chaser' }),
    record({ deathCause: undefined }),
    record({ cleared: true, deathStage: null, deathCause: null }),
  ]);
  assert.deepEqual(summary.deathsByCause, { zone: 1, bomb: 2, chaser: 1, unknown: 1 });
});

test('리포트에 사망 원인을 분모와 함께 쓴다', () => {
  const report = formatReport([record({ deathCause: 'bomb' }), record({ deathCause: 'zone' })]);
  assert.match(report, /사망 원인 \[측정\].*폭격 1\/2/);
});

test('버전별로 나눠서 보여준다', () => {
  const report = formatReport([record(), record({ version: 'v0.2' })]);
  assert.match(report, /v0\.1/);
  assert.match(report, /v0\.2/);
});
