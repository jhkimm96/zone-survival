const KEY_DIRECTIONS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};
const JOYSTICK_DEAD_ZONE_PX = 12;

const normalizedKey = (event) => (event.key.length === 1 ? event.key.toLowerCase() : event.key);

// 키보드(방향키/WASD, 동시에 누르면 대각선)와 가상 조이스틱(손가락을 처음 댄 곳이 중심)을 "가려는 방향"으로 합친다.
export function createInput(touchTarget) {
  const heldKeys = new Set();
  let joystickAnchor = null;
  let joystickDirection = null;

  window.addEventListener('keydown', (event) => {
    const key = normalizedKey(event);
    if (!(key in KEY_DIRECTIONS)) return;
    event.preventDefault();
    heldKeys.add(key);
  });
  window.addEventListener('keyup', (event) => heldKeys.delete(normalizedKey(event)));
  window.addEventListener('blur', () => heldKeys.clear());

  touchTarget.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    joystickAnchor = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  touchTarget.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if (!joystickAnchor) return;
    const touch = event.touches[0];
    const dx = touch.clientX - joystickAnchor.x;
    const dy = touch.clientY - joystickAnchor.y;
    joystickDirection = Math.hypot(dx, dy) < JOYSTICK_DEAD_ZONE_PX ? null : { dx, dy };
  }, { passive: false });
  const endJoystick = () => {
    joystickAnchor = null;
    joystickDirection = null;
  };
  touchTarget.addEventListener('touchend', endJoystick);
  touchTarget.addEventListener('touchcancel', endJoystick);

  return {
    current() {
      if (joystickDirection) return joystickDirection;
      let dx = 0;
      let dy = 0;
      for (const key of heldKeys) {
        dx += KEY_DIRECTIONS[key].dx;
        dy += KEY_DIRECTIONS[key].dy;
      }
      return dx === 0 && dy === 0 ? null : { dx, dy };
    },
  };
}
