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

export function keepInsideWorld(position, radius, config = CONFIG) {
  const clamp = (value) => Math.min(Math.max(value, radius), config.worldSize - radius);
  return { x: clamp(position.x), y: clamp(position.y) };
}
