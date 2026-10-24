import { CONFIG } from './config.js';
import { activeItems } from './game.js';
import { upcomingZoneAt, zoneAt } from './zone.js';

const COLORS = {
  outsideWorld: '#0d1620',
  dangerGround: '#7a2d2d',
  safeGround: '#223a50',
  warningGround: 'rgba(196, 71, 63, 0.75)',
  grid: 'rgba(255, 255, 255, 0.05)',
  zoneEdge: 'rgba(232, 238, 245, 0.6)',
  nextOutline: '#e8eef5',
  obstacle: '#4b5d70',
  obstacleEdge: '#6f8399',
  player: '#3fb68b',
  playerEdge: '#bff0dc',
  heal: '#4ade5a',
  haste: '#5aa9f0',
  shield: '#f2b63d',
  bomb: '#ff8a3d',
  chaser: '#a259ff',
  boss: '#6a2fd1',
  crown: '#f5c518',
  crownEdge: '#8a6400',
  ruby: '#e0115f',
  minimapBackground: 'rgba(13, 22, 32, 0.85)',
  minimapBorder: '#4a5d72',
};
const GRID_SPACING_METERS = 10;
const ITEM_RADIUS_METERS = 1.3;
const PLAYER_DRAW_RADIUS_METERS = 0.9; // 충돌 반경(0.6m)보다 크게 그려 화면에서 잘 보이게 한다
const BLINK_TICKS = 5;
const MINIMAP_MARGIN_PIXELS = 6;

export function drawRun(ctx, run, pixelSize, config = CONFIG) {
  const sec = run.tick / config.ticksPerSecond;
  const zone = zoneAt(run.plan, sec);
  const upcoming = upcomingZoneAt(run.plan, sec, config);
  const blinkOn = Math.floor(run.tick / BLINK_TICKS) % 2 === 0;
  const pixelsPerMeter = pixelSize / config.view.sizeMeters;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, pixelSize, pixelSize);
  ctx.clip();
  ctx.fillStyle = COLORS.outsideWorld;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  ctx.save();
  ctx.translate(pixelSize / 2 - run.x * pixelsPerMeter, pixelSize / 2 - run.y * pixelsPerMeter);
  ctx.scale(pixelsPerMeter, pixelsPerMeter);
  drawGround(ctx, zone, upcoming, blinkOn, pixelsPerMeter, config);
  drawWorldBorder(ctx, pixelsPerMeter, config);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, config.worldSize, config.worldSize);
  ctx.clip(); // 자기장 선은 월드 안쪽만 그린다
  drawZoneOutlines(ctx, zone, upcoming, pixelsPerMeter);
  ctx.restore();
  for (const obstacle of run.obstacles) drawObstacle(ctx, obstacle, pixelsPerMeter);
  for (const item of activeItems(run, config)) drawItem(ctx, item, pixelsPerMeter);
  for (const bomb of run.bombs) drawBomb(ctx, bomb, run, pixelsPerMeter, config);
  for (const chaser of run.chasers) drawChaser(ctx, chaser, pixelsPerMeter);
  if (run.boss) drawBoss(ctx, run.boss, pixelsPerMeter, config);
  drawPlayer(ctx, run, pixelsPerMeter);
  ctx.restore();

  drawMinimap(ctx, run, zone, upcoming, pixelSize, config);
  ctx.restore();
}

function circlePath(ctx, circle) {
  ctx.moveTo(circle.center.x + circle.radius, circle.center.y);
  ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
}

function drawGround(ctx, zone, upcoming, blinkOn, pixelsPerMeter, config) {
  const world = config.worldSize;
  ctx.fillStyle = COLORS.dangerGround;
  ctx.fillRect(0, 0, world, world);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, world, world);
  ctx.clip();
  ctx.fillStyle = COLORS.safeGround;
  ctx.beginPath();
  circlePath(ctx, zone);
  ctx.fill();

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1 / pixelsPerMeter;
  ctx.beginPath();
  for (let line = 0; line <= world; line += GRID_SPACING_METERS) {
    ctx.moveTo(line, 0);
    ctx.lineTo(line, world);
    ctx.moveTo(0, line);
    ctx.lineTo(world, line);
  }
  ctx.stroke();

  if (upcoming?.blinking && blinkOn) {
    ctx.fillStyle = COLORS.warningGround;
    ctx.beginPath();
    circlePath(ctx, zone);
    circlePath(ctx, upcoming.circle);
    ctx.fill('evenodd'); // 현재 원에서 다음 원을 뺀, 곧 사라질 고리 모양
  }
  ctx.restore();
}

function drawWorldBorder(ctx, pixelsPerMeter, config) {
  ctx.strokeStyle = COLORS.obstacleEdge;
  ctx.lineWidth = 3 / pixelsPerMeter;
  ctx.strokeRect(0, 0, config.worldSize, config.worldSize);
}

function drawZoneOutlines(ctx, zone, upcoming, pixelsPerMeter) {
  ctx.lineWidth = 2 / pixelsPerMeter;
  ctx.strokeStyle = COLORS.zoneEdge;
  ctx.beginPath();
  circlePath(ctx, zone);
  ctx.stroke();

  const nextCircle = zone.target ?? upcoming?.circle;
  if (!nextCircle) return;
  ctx.save();
  ctx.strokeStyle = COLORS.nextOutline;
  ctx.setLineDash([6 / pixelsPerMeter, 4 / pixelsPerMeter]);
  ctx.beginPath();
  circlePath(ctx, nextCircle);
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(ctx, obstacle, pixelsPerMeter) {
  ctx.fillStyle = COLORS.obstacle;
  ctx.strokeStyle = COLORS.obstacleEdge;
  ctx.lineWidth = 1.5 / pixelsPerMeter;
  ctx.beginPath();
  ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// 폭발이 가까워질수록 원이 진해진다
function drawBomb(ctx, bomb, run, pixelsPerMeter, config) {
  const warningTicks = Math.round(config.bombs.warningSec * config.ticksPerSecond);
  const progress = Math.min(1, Math.max(0, 1 - (bomb.detonateTick - run.tick) / warningTicks));
  ctx.fillStyle = `rgba(255, 138, 61, ${0.12 + 0.38 * progress})`;
  ctx.strokeStyle = COLORS.bomb;
  ctx.lineWidth = 2 / pixelsPerMeter;
  ctx.beginPath();
  ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawChaser(ctx, chaser, pixelsPerMeter) {
  ctx.fillStyle = COLORS.chaser;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 / pixelsPerMeter;
  ctx.beginPath();
  ctx.arc(chaser.x, chaser.y, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawBoss(ctx, boss, pixelsPerMeter, config) {
  const radius = config.boss.radius;
  ctx.fillStyle = COLORS.boss;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 / pixelsPerMeter;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawCrown(ctx, boss.x, boss.y - radius * 0.82, radius * 1.15, radius * 0.95, pixelsPerMeter);
}

// 왕관 밑변 가운데가 (centerX, baseY). 루비는 왕관 가운데에 박혀 있다.
function drawCrown(ctx, centerX, baseY, width, height, pixelsPerMeter) {
  const corners = [
    [-0.5, 0], [-0.5, -0.55], [-0.25, -0.2], [0, -1], [0.25, -0.2], [0.5, -0.55], [0.5, 0],
  ];
  ctx.fillStyle = COLORS.crown;
  ctx.strokeStyle = COLORS.crownEdge;
  ctx.lineWidth = 1.5 / pixelsPerMeter;
  ctx.beginPath();
  for (const [across, up] of corners) ctx.lineTo(centerX + across * width, baseY + up * height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawRuby(ctx, centerX, baseY - height * 0.32, height * 0.26, pixelsPerMeter);
}

function drawRuby(ctx, centerX, centerY, size, pixelsPerMeter) {
  ctx.fillStyle = COLORS.ruby;
  ctx.strokeStyle = '#ffd1e0';
  ctx.lineWidth = 1 / pixelsPerMeter;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX + size * 0.8, centerY);
  ctx.lineTo(centerX, centerY + size);
  ctx.lineTo(centerX - size * 0.8, centerY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawItem(ctx, item, pixelsPerMeter) {
  ctx.fillStyle = COLORS[item.kind];
  if (item.kind === 'heal') {
    drawCross(ctx, item.x, item.y, ITEM_RADIUS_METERS, pixelsPerMeter);
  } else if (item.kind === 'shield') {
    drawStar(ctx, item.x, item.y, ITEM_RADIUS_METERS * 1.2);
  } else {
    drawBolt(ctx, item.x, item.y, ITEM_RADIUS_METERS * 1.2);
  }
}

// 플레이어도 초록이라 흰 테두리로 구분한다
function drawCross(ctx, centerX, centerY, radius, pixelsPerMeter) {
  const half = radius * 0.375;
  const corners = [
    [-half, -radius], [half, -radius], [half, -half], [radius, -half], [radius, half], [half, half],
    [half, radius], [-half, radius], [-half, half], [-radius, half], [-radius, -half], [-half, -half],
  ];
  ctx.beginPath();
  for (const [offsetX, offsetY] of corners) ctx.lineTo(centerX + offsetX, centerY + offsetY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 / pixelsPerMeter;
  ctx.stroke();
}

function drawStar(ctx, centerX, centerY, radius) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const pointRadius = point % 2 === 0 ? radius : radius * 0.45;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    ctx.lineTo(centerX + Math.cos(angle) * pointRadius, centerY + Math.sin(angle) * pointRadius);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBolt(ctx, centerX, centerY, radius) {
  ctx.beginPath();
  ctx.moveTo(centerX + radius * 0.2, centerY - radius);
  ctx.lineTo(centerX - radius * 0.7, centerY + radius * 0.1);
  ctx.lineTo(centerX - radius * 0.05, centerY + radius * 0.1);
  ctx.lineTo(centerX - radius * 0.2, centerY + radius);
  ctx.lineTo(centerX + radius * 0.7, centerY - radius * 0.15);
  ctx.lineTo(centerX + radius * 0.05, centerY - radius * 0.15);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(ctx, run, pixelsPerMeter) {
  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = COLORS.playerEdge;
  ctx.lineWidth = 1.5 / pixelsPerMeter;
  ctx.beginPath();
  ctx.arc(run.x, run.y, PLAYER_DRAW_RADIUS_METERS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const shielded = run.tick < run.shieldUntilTick;
  const hasted = run.tick < run.hasteUntilTick;
  if (shielded) drawRing(ctx, run, PLAYER_DRAW_RADIUS_METERS * 1.5, COLORS.shield, pixelsPerMeter);
  if (hasted) drawRing(ctx, run, PLAYER_DRAW_RADIUS_METERS * (shielded ? 1.9 : 1.5), COLORS.haste, pixelsPerMeter);
}

function drawRing(ctx, run, radius, color, pixelsPerMeter) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 / pixelsPerMeter;
  ctx.beginPath();
  ctx.arc(run.x, run.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

// 월드 전체, 자기장 원, 아이템, 내 위치를 한눈에 보여준다. 아이템을 먹으러 갈지 안전 원으로 갈지 판단하는 데 쓴다.
function drawMinimap(ctx, run, zone, upcoming, pixelSize, config) {
  const size = config.view.minimapPixels;
  const pixelsPerMeter = size / config.worldSize;
  ctx.save();
  ctx.translate(pixelSize - size - MINIMAP_MARGIN_PIXELS, MINIMAP_MARGIN_PIXELS);
  ctx.fillStyle = COLORS.minimapBackground;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.scale(pixelsPerMeter, pixelsPerMeter);
  ctx.fillStyle = COLORS.dangerGround;
  ctx.fillRect(0, 0, config.worldSize, config.worldSize);
  ctx.beginPath();
  ctx.rect(0, 0, config.worldSize, config.worldSize);
  ctx.clip();
  ctx.fillStyle = COLORS.safeGround;
  ctx.beginPath();
  circlePath(ctx, zone);
  ctx.fill();
  const nextCircle = zone.target ?? upcoming?.circle;
  if (nextCircle) {
    ctx.strokeStyle = COLORS.nextOutline;
    ctx.lineWidth = 1 / pixelsPerMeter;
    ctx.beginPath();
    circlePath(ctx, nextCircle);
    ctx.stroke();
  }
  for (const item of activeItems(run, config)) {
    ctx.fillStyle = COLORS[item.kind];
    ctx.beginPath();
    ctx.arc(item.x, item.y, 2.5 / pixelsPerMeter, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const bomb of run.bombs) {
    ctx.strokeStyle = COLORS.bomb;
    ctx.lineWidth = 1 / pixelsPerMeter;
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const chaser of run.chasers) {
    ctx.fillStyle = COLORS.chaser;
    ctx.beginPath();
    ctx.arc(chaser.x, chaser.y, 3 / pixelsPerMeter, 0, Math.PI * 2);
    ctx.fill();
  }
  if (run.boss) {
    ctx.fillStyle = COLORS.crown;
    ctx.beginPath();
    ctx.arc(run.boss.x, run.boss.y, 4 / pixelsPerMeter, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(run.x, run.y, 3.5 / pixelsPerMeter, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = COLORS.minimapBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  ctx.restore();
}
