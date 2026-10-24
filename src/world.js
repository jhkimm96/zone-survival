import { CONFIG } from './config.js';
import { createRng } from './rng.js';

const OBSTACLE_RNG_OFFSET = 2000003; // 자기장·아이템과 난수열이 겹치지 않게 분리
const MAX_PLACEMENT_ATTEMPTS = 5000;
const PUSH_PASSES = 2; // 장애물이 붙어 있을 때 한 번 밀려난 위치가 다른 장애물과 겹치는 경우를 정리한다

const distanceBetween = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

// 시드로 장애물(원)을 배치한다. 시작점 근처와 서로 겹치는 자리는 비운다.
export function planObstacles(seed, startPosition, config = CONFIG) {
  const rule = config.obstacles;
  const rng = createRng(seed + OBSTACLE_RNG_OFFSET);
  const obstacles = [];
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && obstacles.length < rule.count; attempt += 1) {
    const radius = rule.minRadius + rng() * (rule.maxRadius - rule.minRadius);
    const candidate = {
      x: radius + rng() * (config.worldSize - 2 * radius),
      y: radius + rng() * (config.worldSize - 2 * radius),
      radius,
    };
    const tooCloseToStart = distanceBetween(candidate, startPosition) - radius < rule.clearRadiusAroundStart;
    const overlapsOther = obstacles.some((other) => distanceBetween(other, candidate) < other.radius + radius);
    if (!tooCloseToStart && !overlapsOther) obstacles.push(candidate);
  }
  return obstacles;
}

export function pushOutOfObstacles(position, radius, obstacles) {
  let { x, y } = position;
  for (let pass = 0; pass < PUSH_PASSES; pass += 1) {
    for (const obstacle of obstacles) {
      const offsetX = x - obstacle.x;
      const offsetY = y - obstacle.y;
      const gap = Math.hypot(offsetX, offsetY);
      const minimumGap = obstacle.radius + radius;
      if (gap >= minimumGap) continue;
      const directionX = gap === 0 ? 1 : offsetX / gap; // 중심이 정확히 겹치면 한쪽(+x)으로 민다
      const directionY = gap === 0 ? 0 : offsetY / gap;
      x = obstacle.x + directionX * minimumGap;
      y = obstacle.y + directionY * minimumGap;
    }
  }
  return { x, y };
}

// 추적자와 보스의 등장 자리. center에서 distance만큼 angle 방향으로 떨어진, 월드 안이고 장애물과 겹치지 않는 곳.
export function placeAround(center, angle, distance, radius, obstacles, config = CONFIG) {
  const spot = keepInsideWorld(
    { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance },
    radius,
    config,
  );
  return pushOutOfObstacles(spot, radius, obstacles);
}

// 추적자와 보스가 쓰는 이동. 장애물은 통과하지 못하고 월드 밖으로 나가지 않는다.
export function stepToward(position, target, stepMeters, radius, obstacles, config = CONFIG) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const gap = Math.hypot(dx, dy);
  if (gap === 0) return { x: position.x, y: position.y };
  const moved = { x: position.x + (dx / gap) * stepMeters, y: position.y + (dy / gap) * stepMeters };
  const clearOfObstacles = pushOutOfObstacles(moved, radius, obstacles);
  return keepInsideWorld(clearOfObstacles, radius, config);
}

export function keepInsideWorld(position, radius, config = CONFIG) {
  const clamp = (value) => Math.min(Math.max(value, radius), config.worldSize - radius);
  return { x: clamp(position.x), y: clamp(position.y) };
}
