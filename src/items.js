import { CONFIG } from './config.js';
import { createRng } from './rng.js';
import { zoneAt } from './zone.js';

const ITEM_KINDS = ['heal', 'haste', 'shield'];
const ITEM_RNG_OFFSET = 1000003; // 자기장 계획과 난수열이 겹치지 않게 분리
const MAX_SPOT_ATTEMPTS = 500;

const distanceBetween = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

// 시드와 자기장 계획, 장애물만으로 아이템 생성 일정을 전부 확정한다 (플레이어 위치와 무관).
export function planItemSpawns(seed, plan, obstacles, config = CONFIG) {
  const rule = config.items;
  const rng = createRng(seed + ITEM_RNG_OFFSET);
  const spawns = [];
  for (let sec = rule.spawnEverySec; sec < config.runSeconds; sec += rule.spawnEverySec) {
    const alive = spawns.filter((spawn) => spawn.expireSec > sec);
    if (alive.length >= rule.maxOnMap) continue;
    const spot = findFreeSpot(rng, zoneAt(plan, sec), obstacles, alive, config);
    if (!spot) continue;
    spawns.push({
      id: spawns.length,
      kind: ITEM_KINDS[Math.floor(rng() * ITEM_KINDS.length)],
      x: spot.x,
      y: spot.y,
      spawnSec: sec,
      expireSec: sec + rule.lifetimeSec,
    });
  }
  return spawns;
}

// 안전 원 안의 무작위 지점 중 월드 안이고, 장애물과 다른 아이템에서 충분히 떨어진 곳을 고른다.
function findFreeSpot(rng, zone, obstacles, aliveItems, config) {
  const rule = config.items;
  for (let attempt = 0; attempt < MAX_SPOT_ATTEMPTS; attempt += 1) {
    const angle = rng() * 2 * Math.PI;
    const distance = Math.sqrt(rng()) * zone.radius;
    const spot = { x: zone.center.x + Math.cos(angle) * distance, y: zone.center.y + Math.sin(angle) * distance };
    const insideWorld = spot.x >= 0 && spot.x <= config.worldSize && spot.y >= 0 && spot.y <= config.worldSize;
    const onObstacle = obstacles.some((obstacle) => distanceBetween(obstacle, spot) < obstacle.radius + rule.obstacleClearance);
    const crowded = aliveItems.some((item) => distanceBetween(item, spot) < rule.minGapBetweenItems);
    if (insideWorld && !onObstacle && !crowded) return spot;
  }
  return null;
}

export function applyItem(run, kind, config = CONFIG) {
  const rule = config.items[kind];
  if (kind === 'heal') run.hp = Math.min(config.maxHp, run.hp + rule.amount);
  if (kind === 'haste') run.hasteUntilTick = run.tick + rule.durationSec * config.ticksPerSecond;
  if (kind === 'shield') run.shieldUntilTick = run.tick + rule.durationSec * config.ticksPerSecond;
}
