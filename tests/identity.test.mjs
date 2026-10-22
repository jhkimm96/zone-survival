import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadIdentity, rememberNickname, playerLabel } from '../src/identity.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data,
  };
}

const brokenStorage = {
  getItem() {
    throw new Error('storage blocked');
  },
  setItem() {
    throw new Error('storage blocked');
  },
};

const noParams = new URLSearchParams('');

test('처음 열면 익명 ID를 만들어 저장하고, 다시 열면 같은 ID를 쓴다', () => {
  const storage = memoryStorage();
  let created = 0;
  const makeId = () => `id-${(created += 1)}`;
  const first = loadIdentity(storage, noParams, makeId);
  const second = loadIdentity(storage, noParams, makeId);
  assert.equal(first.playerId, 'id-1');
  assert.equal(second.playerId, 'id-1');
  assert.equal(created, 1);
});

test('기억해 둔 닉네임을 불러온다', () => {
  const storage = memoryStorage({ 'zs.nickname': '지희' });
  assert.equal(loadIdentity(storage, noParams, () => 'x').nickname, '지희');
});

test('?p= 링크 값은 저장된 닉네임보다 우선한다 (기존 A/B/C 링크 호환)', () => {
  const storage = memoryStorage({ 'zs.nickname': '지희' });
  assert.equal(loadIdentity(storage, new URLSearchParams('p=A'), () => 'x').nickname, 'A');
});

test('닉네임은 앞뒤 공백을 지우고 12자로 자르며 저장한다', () => {
  const storage = memoryStorage();
  assert.equal(rememberNickname(storage, '   가나다   '), '가나다');
  assert.equal(storage.data['zs.nickname'], '가나다');
  assert.equal(rememberNickname(storage, '가'.repeat(30)).length, 12);
});

test('여러 칸의 공백은 하나로 줄이고, 제어 문자는 지운다', () => {
  const storage = memoryStorage();
  assert.equal(rememberNickname(storage, 'a   b\n\tc'), 'a b c');
});

test('닉네임이 비어 있으면 라벨은 guest다', () => {
  assert.equal(playerLabel(''), 'guest');
  assert.equal(playerLabel('민수'), '민수');
});

test('브라우저 저장소를 쓸 수 없어도 예외 없이 동작한다', () => {
  const identity = loadIdentity(brokenStorage, noParams, () => 'fallback-id');
  assert.equal(identity.playerId, 'fallback-id');
  assert.equal(identity.nickname, '');
  assert.equal(rememberNickname(brokenStorage, '민수'), '민수');
});
