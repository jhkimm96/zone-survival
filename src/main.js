import { CONFIG } from './config.js';
import { createRun, step } from './game.js';
import { createInput } from './input.js';
import { drawRun } from './render.js';
import { sendRunRecord } from './remote.js';
import { buildRunRecord, toLogLine } from './runlog.js';
import { stageIndexAt } from './zone.js';

const CANVAS_CSS_PIXELS = 360;
const MAX_CATCH_UP_MS = 500; // 탭이 숨겨졌다 돌아와도 한꺼번에 시간이 흐르지 않게 한다
const NOTE_MAX_LENGTH = 100;

const params = new URLSearchParams(location.search);
const player = params.get('p') || 'self';
const baseSeed = Number(params.get('seed')) || 1;

const screens = {
  start: document.getElementById('screen-start'),
  play: document.getElementById('screen-play'),
  result: document.getElementById('screen-result'),
};
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const hud = {
  time: document.getElementById('hud-time'),
  hpFill: document.getElementById('hud-hp-fill'),
  items: document.getElementById('hud-items'),
  stage: document.getElementById('hud-stage'),
  effects: document.getElementById('hud-effects'),
};
const CAUSE_LABELS = { zone: '자기장', bomb: '폭격', chaser: '추적자' };
const HURT_FLASH_MS = 150;
const result = {
  title: document.getElementById('result-title'),
  time: document.getElementById('result-time'),
  items: document.getElementById('result-items'),
  where: document.getElementById('result-where'),
  runNumber: document.getElementById('result-run'),
  note: document.getElementById('result-note'),
  copyStatus: document.getElementById('copy-status'),
  sendStatus: document.getElementById('send-status'),
};

const input = createInput(canvas);
let run = null;
let runNumber = 0;
let lastRecord = null;
let lastHp = CONFIG.startHp;

setupCanvas();
document.getElementById('version').textContent = `버전 ${CONFIG.version}`; // 옛 파일이 캐시에 남았는지 알아보는 표시
document.getElementById('btn-start').addEventListener('click', startRun);
document.getElementById('btn-again').addEventListener('click', startRun);
document.getElementById('btn-copy').addEventListener('click', copyRecord);

function setupCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = CANVAS_CSS_PIXELS * ratio;
  canvas.height = CANVAS_CSS_PIXELS * ratio;
  ctx.scale(ratio, ratio);
}

function showScreen(name) {
  for (const [screenName, element] of Object.entries(screens)) element.hidden = screenName !== name;
}

function startRun() {
  runNumber += 1;
  const thisRun = createRun(baseSeed + runNumber - 1);
  run = thisRun;
  lastHp = thisRun.hp;
  showScreen('play');
  let lastFrameMs = performance.now();
  let pendingMs = 0;
  const tickMs = 1000 / CONFIG.ticksPerSecond;

  function frame(nowMs) {
    if (run !== thisRun) return;
    pendingMs = Math.min(pendingMs + nowMs - lastFrameMs, MAX_CATCH_UP_MS);
    lastFrameMs = nowMs;
    while (pendingMs >= tickMs && thisRun.status === 'playing') {
      step(thisRun, input.current());
      pendingMs -= tickMs;
    }
    drawRun(ctx, thisRun, CANVAS_CSS_PIXELS);
    updateHud(thisRun);
    if (thisRun.status === 'playing') requestAnimationFrame(frame);
    else showResult(thisRun);
  }
  requestAnimationFrame(frame);
}

function updateHud(currentRun) {
  const secLeft = Math.ceil(CONFIG.runSeconds - currentRun.tick / CONFIG.ticksPerSecond);
  hud.time.textContent = formatClock(secLeft);
  hud.hpFill.style.width = `${Math.max(0, currentRun.hp)}%`;
  const itemTotal = Object.values(currentRun.itemsGot).reduce((sum, count) => sum + count, 0);
  hud.items.textContent = `아이템 ${itemTotal}`;
  const stage = stageIndexAt(currentRun.plan, currentRun.tick / CONFIG.ticksPerSecond);
  hud.stage.textContent = stage === 0 ? '자기장 대기' : `자기장 ${stage}단계`;
  hud.effects.textContent = describeActiveEffects(currentRun);
  flashWhenHurt(currentRun);
}

// 가속·보호가 켜져 있는 동안 남은 시간을 보여준다
function describeActiveEffects(currentRun) {
  const secondsLeft = (untilTick) => Math.ceil((untilTick - currentRun.tick) / CONFIG.ticksPerSecond);
  const effects = [];
  if (currentRun.tick < currentRun.hasteUntilTick) effects.push(`가속 ${secondsLeft(currentRun.hasteUntilTick)}초`);
  if (currentRun.tick < currentRun.shieldUntilTick) effects.push(`보호 ${secondsLeft(currentRun.shieldUntilTick)}초`);
  return effects.join(' · ');
}

function flashWhenHurt(currentRun) {
  if (currentRun.hp < lastHp - 0.01) {
    canvas.classList.add('hurt');
    setTimeout(() => canvas.classList.remove('hurt'), HURT_FLASH_MS);
  }
  lastHp = currentRun.hp;
}

function showResult(finishedRun) {
  lastRecord = buildRunRecord(finishedRun, { player, runNumber });
  const itemTotal = Object.values(finishedRun.itemsGot).reduce((sum, count) => sum + count, 0);
  result.title.textContent = lastRecord.cleared ? '클리어' : '게임 종료';
  result.time.textContent = formatClock(Math.floor(lastRecord.surviveSec));
  result.items.textContent = `${itemTotal}개`;
  result.where.textContent = lastRecord.cleared
    ? '끝까지 버팀'
    : `${CAUSE_LABELS[lastRecord.deathCause] ?? '알 수 없음'} (자기장 ${lastRecord.deathStage}단계)`;
  result.runNumber.textContent = `${runNumber}번째 판`;
  result.note.value = '';
  result.copyStatus.textContent = '';
  showScreen('result');
  saveRecordRemotely(lastRecord);
}

// 판 기록을 자동 저장한다. 실패해도 게임은 계속되고, "기록 복사"로 예비 전달할 수 있다.
async function saveRecordRemotely(record) {
  result.sendStatus.textContent = '기록 저장 중…';
  const context = {
    env: ['localhost', '127.0.0.1'].includes(location.hostname) ? 'local' : 'deployed',
    device: window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard',
  };
  const outcome = await sendRunRecord(record, context);
  result.sendStatus.textContent = outcome.ok
    ? '기록이 저장됐어요.'
    : `자동 저장에 실패했어요 (${outcome.reason}). 아래 "기록 복사"로 보내주세요.`;
}

async function copyRecord() {
  const line = toLogLine({ ...lastRecord, note: result.note.value.trim().slice(0, NOTE_MAX_LENGTH) });
  try {
    await navigator.clipboard.writeText(line);
    result.copyStatus.textContent = '복사했어요. 카톡에 붙여넣어 보내주세요.';
  } catch {
    result.note.value = line; // 클립보드를 못 쓰는 환경에서는 직접 복사할 수 있게 보여준다
    result.note.select();
    result.copyStatus.textContent = '자동 복사가 안 돼서 아래 칸에 넣어뒀어요. 직접 복사해 주세요.';
  }
}

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
