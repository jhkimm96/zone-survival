import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ITEM_KINDS = ['heal', 'haste', 'shield'];
const ITEM_LABELS = { heal: '회복', haste: '가속', shield: '보호' };
const MIN_RUNS_FOR_MEASURED_CLAIMS = 30;

function isRunRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.version === 'string' &&
    typeof value.player === 'string' &&
    typeof value.cleared === 'boolean' &&
    typeof value.surviveSec === 'number' &&
    typeof value.outsideSec === 'number' &&
    value.itemsGot !== null &&
    typeof value.itemsGot === 'object'
  );
}

// 복사해 온 기록 줄을 읽는다. 사람이 붙여넣다 깨진 줄은 버리지 말고 개수로 보고한다.
export function parseLogLines(text) {
  const records = [];
  let skipped = 0;
  for (const line of text.split('\n').map((raw) => raw.trim()).filter(Boolean)) {
    try {
      const parsed = JSON.parse(line);
      if (isRunRecord(parsed)) records.push(parsed);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { records, skipped };
}

export function summarize(records) {
  const deathsByStage = { 1: 0, 2: 0, 3: 0 };
  const deathsByCause = { zone: 0, bomb: 0, chaser: 0, boss: 0, ruby: 0, shockwave: 0, unknown: 0 };
  const itemsGot = { heal: 0, haste: 0, shield: 0 };
  let clearedCount = 0;
  let surviveSecTotal = 0;
  let outsideSecTotal = 0;
  for (const record of records) {
    if (record.cleared) clearedCount += 1;
    else {
      if (record.deathStage in deathsByStage) deathsByStage[record.deathStage] += 1;
      deathsByCause[record.deathCause in deathsByCause ? record.deathCause : 'unknown'] += 1;
    }
    for (const kind of ITEM_KINDS) itemsGot[kind] += record.itemsGot[kind] ?? 0;
    surviveSecTotal += record.surviveSec;
    outsideSecTotal += record.outsideSec;
  }
  const runCount = records.length;
  return {
    runCount,
    playerCount: new Set(records.map((record) => record.playerId ?? record.player)).size, // 같은 닉네임이어도 익명 ID가 다르면 다른 사람
    clearedCount,
    deathsByStage,
    deathsByCause,
    itemsGot,
    itemsGotTotal: ITEM_KINDS.reduce((sum, kind) => sum + itemsGot[kind], 0),
    meanSurviveSec: runCount === 0 ? 0 : surviveSecTotal / runCount,
    meanOutsideSec: runCount === 0 ? 0 : outsideSecTotal / runCount,
  };
}

export function formatReport(records) {
  if (records.length === 0) return '# 플레이 리포트\n\n[미확인] 기록이 없다.\n';
  const byVersion = Map.groupBy(records, (record) => record.version);
  const sections = [...byVersion].map(([version, group]) => formatVersionSection(version, group));
  return `# 플레이 리포트\n\n${sections.join('\n')}`;
}

function formatVersionSection(version, records) {
  const summary = summarize(records);
  const { runCount } = summary;
  const players = new Set(records.map((record) => record.player));
  const selfOnly = players.size === 1 && players.has('self');
  const deathsTotal = runCount - summary.clearedCount;
  const itemShares = ITEM_KINDS.map(
    (kind) => `${ITEM_LABELS[kind]} ${summary.itemsGot[kind]}/${summary.itemsGotTotal}`,
  ).join(', ');
  const trust =
    runCount < MIN_RUNS_FOR_MEASURED_CLAIMS
      ? `판 수 ${runCount} (30판 미만이라 아래 숫자의 해석은 [추정])`
      : `판 수 ${runCount} (30판 이상)`;
  return [
    `## ${version}`,
    '',
    `- 플레이어: ${summary.playerCount}명${selfOnly ? ' (자체 플레이)' : ''}`,
    `- 신뢰: ${trust}`,
    `- 클리어율 [측정]: ${summary.clearedCount}/${runCount}`,
    `- 사망 단계 [측정]: 1단계 ${summary.deathsByStage[1]}/${deathsTotal}, 2단계 ${summary.deathsByStage[2]}/${deathsTotal}, 3단계 ${summary.deathsByStage[3]}/${deathsTotal}`,
    `- 사망 원인 [측정]: 자기장 ${summary.deathsByCause.zone}/${deathsTotal}, 폭격 ${summary.deathsByCause.bomb}/${deathsTotal}, 적 ${summary.deathsByCause.chaser}/${deathsTotal}, 보스 몸 ${summary.deathsByCause.boss}/${deathsTotal}, 루비 ${summary.deathsByCause.ruby}/${deathsTotal}, 충격파 ${summary.deathsByCause.shockwave}/${deathsTotal}${summary.deathsByCause.unknown > 0 ? `, 원인 기록 없음 ${summary.deathsByCause.unknown}/${deathsTotal}` : ''}`,
    `- 아이템 획득 [측정]: ${itemShares}`,
    `- 평균 생존 [측정]: ${summary.meanSurviveSec.toFixed(1)}초 (${runCount}판)`,
    `- 평균 영역 밖 시간 [측정]: ${summary.meanOutsideSec.toFixed(1)}초 (${runCount}판)`,
    '',
  ].join('\n');
}

function readRecordsFromFiles(filePaths) {
  const records = [];
  let skipped = 0;
  for (const filePath of filePaths) {
    const parsed = parseLogLines(fs.readFileSync(filePath, 'utf8'));
    records.push(...parsed.records);
    skipped += parsed.skipped;
  }
  return { records, skipped };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    console.error('사용법: node tools/report.mjs <기록 파일>...');
    process.exit(1);
  }
  const { records, skipped } = readRecordsFromFiles(filePaths);
  console.log(formatReport(records));
  if (skipped > 0) console.error(`읽지 못한 줄 ${skipped}개를 건너뜀`);
}
