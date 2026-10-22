import { spawnBombSalvoIfDue, detonateDueBombs } from './bombs.js';
import { damageFromChasers, moveChasers, spawnChaserIfDue } from './chasers.js';
import { CONFIG } from './config.js';
import { takeDamage } from './damage.js';
import { applyItem, planItemSpawns } from './items.js';
import { createRng } from './rng.js';
import { keepInsideWorld, planObstacles, pushOutOfObstacles } from './world.js';
import { damagePerSecondAt, isInsideZone, planZones, stageIndexAt, startPositionFor, zoneAt } from './zone.js';

const THREAT_RNG_OFFSET = 3000003; // 폭격과 추적자 위치용 난수열. 다른 난수열과 겹치지 않게 분리

export function createRun(seed, config = CONFIG) {
  const plan = planZones(seed, config);
  const start = startPositionFor(plan, config);
  const obstacles = planObstacles(seed, start, config);
  return {
    seed,
    plan,
    obstacles,
    spawns: planItemSpawns(seed, plan, obstacles, config),
    collected: new Set(),
    bombs: [],
    chasers: [],
    nextBombSec: config.bombs.firstSec,
    nextChaserSec: config.chasers.firstSec,
    nextChaserId: 0,
    chasersKilled: 0,
    threatRng: createRng(seed + THREAT_RNG_OFFSET),
    tick: 0,
    status: 'playing', // 'playing' | 'cleared' | 'dead'
    x: start.x,
    y: start.y,
    hp: config.startHp,
    hasteUntilTick: 0,
    shieldUntilTick: 0,
    outsideTicks: 0,
    itemsGot: { heal: 0, haste: 0, shield: 0 },
    damageTaken: { zone: 0, bomb: 0, chaser: 0 },
    lastDamageSource: null,
    deathStage: null,
    deathCause: null,
    deathPos: null,
  };
}

export function activeItems(run, config = CONFIG) {
  const sec = run.tick / config.ticksPerSecond;
  return run.spawns.filter(
    (spawn) => !run.collected.has(spawn.id) && spawn.spawnSec <= sec && sec < spawn.expireSec,
  );
}

// 한 틱(1/30초). direction은 {dx, dy} (길이는 무관, 내부에서 정규화) 또는 null.
export function step(run, direction, config = CONFIG) {
  if (run.status !== 'playing') return run;
  const sec = run.tick / config.ticksPerSecond;
  movePlayer(run, direction, config);
  collectItems(run, config);
  spawnBombSalvoIfDue(run, config);
  detonateDueBombs(run, config);
  spawnChaserIfDue(run, config);
  moveChasers(run, config);
  damageFromChasers(run, config);
  takeZoneDamage(run, sec, config);
  run.tick += 1;
  finishIfOver(run, sec, config);
  return run;
}

function movePlayer(run, direction, config) {
  if (!direction) return;
  const length = Math.hypot(direction.dx, direction.dy);
  if (length === 0) return;
  const hasteActive = run.tick < run.hasteUntilTick;
  const speed = config.moveMetersPerSec * (hasteActive ? config.items.haste.speedMultiplier : 1);
  const stepMeters = speed / config.ticksPerSecond;
  const moved = {
    x: run.x + (direction.dx / length) * stepMeters,
    y: run.y + (direction.dy / length) * stepMeters,
  };
  const clearOfObstacles = pushOutOfObstacles(moved, config.playerRadius, run.obstacles);
  const inWorld = keepInsideWorld(clearOfObstacles, config.playerRadius, config);
  run.x = inWorld.x;
  run.y = inWorld.y;
}

function collectItems(run, config) {
  for (const item of activeItems(run, config)) {
    if (Math.hypot(item.x - run.x, item.y - run.y) > config.items.pickupRadius) continue;
    run.collected.add(item.id);
    run.itemsGot[item.kind] += 1;
    applyItem(run, item.kind, config);
  }
}

function takeZoneDamage(run, sec, config) {
  if (isInsideZone(zoneAt(run.plan, sec), run.x, run.y)) return;
  run.outsideTicks += 1;
  takeDamage(run, 'zone', damagePerSecondAt(run.plan, sec) / config.ticksPerSecond);
}

function finishIfOver(run, sec, config) {
  if (run.hp <= 1e-9) {
    run.status = 'dead';
    run.deathStage = stageIndexAt(run.plan, sec);
    run.deathCause = run.lastDamageSource;
    run.deathPos = { x: run.x, y: run.y };
  } else if (run.tick >= config.runSeconds * config.ticksPerSecond) {
    run.status = 'cleared';
  }
}
