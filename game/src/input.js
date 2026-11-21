// Shadows of Pasar Senja v2 — keyboard and mouse input, edge-triggered actions.
export function makeInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  let anyKey = false;

  const CODE = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    crouch: ['ShiftLeft', 'ShiftRight'],
  };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    anyKey = true;
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onBlur() { keys.clear(); }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  }
  function onMouseDown(e) {
    onMouseMove(e);
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
    anyKey = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  function axis() {
    let x = 0, y = 0;
    if (CODE.left.some((c) => keys.has(c))) x -= 1;
    if (CODE.right.some((c) => keys.has(c))) x += 1;
    if (CODE.up.some((c) => keys.has(c))) y -= 1;
    if (CODE.down.some((c) => keys.has(c))) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  return {
    axis,
    crouch() { return CODE.crouch.some((c) => keys.has(c)); },
    // Edge-triggered: true once per physical press, consumed by the caller each frame.
    take(code) { if (pressed.has(code)) { pressed.delete(code); return true; } return false; },
    takeAny(codes) { for (const c of codes) if (this.take(c)) return c; return null; },
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
    mousePos() { return { x: mouse.x, y: mouse.y }; },
    anyKeyAndClear() { const v = anyKey; anyKey = false; return v; },
    endFrame() { pressed.clear(); },
  };
}
