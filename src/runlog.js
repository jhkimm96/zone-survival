import { CONFIG } from './config.js';

const roundToTenth = (value) => Math.round(value * 10) / 10;

// 끝난 한 판을 JSON 한 줄로 요약한다. 플레이어 이름 대신 라벨(A/B/C/self)만 쓴다.
export function buildRunRecord(run, meta, config = CONFIG) {
  return {
    version: config.version,
    seed: run.seed,
    player: meta.player,
    playerId: meta.playerId,
    runNumber: meta.runNumber,
    cleared: run.status === 'cleared',
    surviveSec: run.tick / config.ticksPerSecond,
    deathStage: run.deathStage,
    deathCause: run.deathCause,
    deathPos: run.deathPos && { x: roundToTenth(run.deathPos.x), y: roundToTenth(run.deathPos.y) },
    itemsGot: { ...run.itemsGot },
    damageTaken: Object.fromEntries(Object.entries(run.damageTaken).map(([source, amount]) => [source, roundToTenth(amount)])),
    chasersKilled: run.chasersKilled,
    outsideSec: run.outsideTicks / config.ticksPerSecond,
    note: meta.note ?? '',
  };
}

export function toLogLine(record) {
  return JSON.stringify(record);
}
