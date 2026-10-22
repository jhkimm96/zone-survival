const PLAYER_ID_KEY = 'zs.playerId';
const NICKNAME_KEY = 'zs.nickname';
const NICKNAME_MAX_LENGTH = 12;
const GUEST_LABEL = 'guest';

// 시크릿 모드 등에서 저장소 접근이 막혀도 게임이 멈추지 않게, 읽기와 쓰기의 오류는 삼킨다.
function readStored(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // 저장하지 못해도 이번 접속에서는 그대로 쓴다
  }
}

// 익명 ID는 처음 한 번만 만들어 브라우저에 저장한다. ?p= 링크 값(예: A)이 있으면 닉네임보다 우선한다.
export function loadIdentity(storage, params, makeId = () => crypto.randomUUID()) {
  let playerId = readStored(storage, PLAYER_ID_KEY);
  if (!playerId) {
    playerId = makeId();
    writeStored(storage, PLAYER_ID_KEY, playerId);
  }
  const nickname = params.get('p') ?? readStored(storage, NICKNAME_KEY) ?? '';
  return { playerId, nickname };
}

export function rememberNickname(storage, rawNickname) {
  const nickname = rawNickname
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICKNAME_MAX_LENGTH);
  writeStored(storage, NICKNAME_KEY, nickname);
  return nickname;
}

export function playerLabel(nickname) {
  return nickname || GUEST_LABEL;
}
