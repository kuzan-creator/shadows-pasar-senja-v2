// Shadows of Pasar Senja v2 — guard, dog and camera AI: patrol, vision, suspicion, chase.
import { TILE, TUNE } from './config.js';

// Tiles that block a guard's line of sight.
export function blocksSight(tile) {
  return tile === '#' || tile === 'S' || tile === 'C';
}
export function blocksMove(tile) {
  return tile === '#' || tile === 'S' || tile === 'C' || tile === '~';
}

function tileAt(level, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= level.map[0].length || cy >= level.map.length) return '#';
  return level.map[cy][cx];
}

// Sampled line of sight between two world points (true when nothing blocks it).
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE * 0.25)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = Math.floor((x0 + dx * t) / TILE);
    const cy = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(tileAt(level, cx, cy))) return false;
  }
  return true;
}

// Is the target inside the watcher's vision cone (range, angle, line of sight)?
export function inVisionCone(level, watcher, tx, ty, rangeTiles, halfAngle) {
  const dx = tx - watcher.x, dy = ty - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > rangeTiles * TILE) return false;
  if (dist < TILE * 0.45) return true;
  let ang = Math.atan2(dy, dx) - watcher.angle;
  while (ang > Math.PI) ang -= Math.PI * 2;
  while (ang < -Math.PI) ang += Math.PI * 2;
  if (Math.abs(ang) > halfAngle) return false;
  return hasLineOfSight(level, watcher.x, watcher.y, tx, ty);
}

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function makeGuard(def, level) {
  const start = tileCenter(def.start[0], def.start[1]);
  const way = def.way.map(([x, y]) => tileCenter(x, y));
  return {
    kind: 'guard',
    name: def.name,
    color: def.color,
    x: start.x, y: start.y,
    angle: 0,
    way, wp: 0,
    speed: def.speed ?? TUNE.guardPatrol,
    range: def.range ?? TUNE.coneRange,
    state: 'patrol', // patrol | wary | chase | investigate
    suspicion: 0,
    chaseT: 0,
    investigate: null,
    stuckT: 0,
    lastSeen: null,
  };
}

export function makeDog(def) {
  const start = tileCenter(def.start[0], def.start[1]);
  const way = def.way.map(([x, y]) => tileCenter(x, y));
  return {
    kind: 'dog',
    name: def.name,
    color: '#c98a4b',
    x: start.x, y: start.y,
    angle: 0,
    way, wp: 0,
    speed: TUNE.dogPatrol,
    range: 3.4,
    state: 'patrol',
    suspicion: 0,
    chaseT: 0,
    investigate: null,
    barkT: 0,
  };
}

export function makeCamera(def) {
  const c = tileCenter(def.x, def.y);
  return {
    kind: 'camera',
    x: c.x, y: c.y,
    base: def.base,
    sweep: def.sweep,
    angle: def.base,
    t: Math.random() * 10,
    spotted: 0,
  };
}

// Move toward a point without crossing a blocking tile; returns distance left.
function stepToward(level, ent, tx, ty, speed, dt) {
  const dx = tx - ent.x, dy = ty - ent.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return 0;
  const step = speed * TILE * dt;
  const nx = ent.x + (dx / dist) * Math.min(step, dist);
  const ny = ent.y + (dy / dist) * Math.min(step, dist);
  const r = TILE * 0.32;
  const canX = !blocksMove(tileAt(level, Math.floor((nx + Math.sign(dx) * r) / TILE), Math.floor(ent.y / TILE)));
  const canY = !blocksMove(tileAt(level, Math.floor(ent.x / TILE), Math.floor((ny + Math.sign(dy) * r) / TILE)));
  if (canX) ent.x = nx;
  if (canY) ent.y = ny;
  ent.angle = Math.atan2(dy, dx);
  return Math.hypot(tx - ent.x, ty - ent.y);
}

function nextWaypoint(ent) {
  ent.wp = (ent.wp + 1) % ent.way.length;
}

// One AI tick for a guard or dog. Returns events: { saw, lost, caught, bark }.
export function tickWatcher(level, ent, player, dt, events) {
  const isDog = ent.kind === 'dog';
  const canSee = player.hiddenInBush || player.inSmoke
    ? false
    : inVisionCone(level, ent, player.x, player.y, ent.range, TUNE.coneHalfAngle);
  const smelled = isDog && !player.inSmoke &&
    Math.hypot(player.x - ent.x, player.y - ent.y) < TUNE.dogSmell * TILE &&
    hasLineOfSight(level, ent.x, ent.y, player.x, player.y);

  if (canSee || smelled) {
    const rate = canSee ? TUNE.suspicionPerSec : TUNE.suspicionPerSec * 0.8;
    const before = ent.suspicion;
    ent.suspicion = Math.min(1, ent.suspicion + rate * dt * (player.crouching ? 0.55 : 1));
    ent.lastSeen = { x: player.x, y: player.y };
    if (before < 0.45 && ent.suspicion >= 0.45) events.saw = ent;
    if (ent.suspicion >= 1 && ent.state !== 'chase') {
      ent.state = 'chase';
      ent.chaseT = 0;
      events.alarm = ent;
    }
  } else {
    ent.suspicion = Math.max(0, ent.suspicion - TUNE.suspicionDecay * dt);
    if (ent.state === 'wary' && ent.suspicion <= 0.02) ent.state = 'patrol';
  }

  if (ent.state === 'chase') {
    ent.chaseT += dt;
    const target = ent.lastSeen ?? { x: player.x, y: player.y };
    const left = stepToward(level, ent, target.x, target.y, isDog ? TUNE.dogChase : TUNE.guardChase, dt);
    if (left < TILE * 0.4 && !canSee && !smelled) {
      ent.state = 'investigate';
      ent.investigate = { x: target.x, y: target.y, t: 0 };
    }
    if (ent.chaseT > TUNE.chaseGiveUpSec && !canSee) {
      ent.state = 'investigate';
      ent.investigate = { x: target.x, y: target.y, t: 0 };
    }
    if (Math.hypot(player.x - ent.x, player.y - ent.y) < TILE * 0.55) events.caught = ent;
  } else if (ent.state === 'investigate' && ent.investigate) {
    const inv = ent.investigate;
    const left = stepToward(level, ent, inv.x, inv.y, ent.speed * 1.15, dt);
    inv.t += dt;
    if (left < TILE * 0.5 || inv.t > 3.5) {
      ent.investigate = null;
      ent.state = ent.suspicion > 0.45 ? 'wary' : 'patrol';
    }
  } else {
    // Patrol (or wary: patrol slowly while looking around).
    const target = ent.way[ent.wp];
    const speed = ent.state === 'wary' ? ent.speed * 0.6 : ent.speed;
    const left = stepToward(level, ent, target.x, target.y, speed, dt);
    if (left < 4) nextWaypoint(ent);
    if (ent.suspicion >= 0.45 && ent.state === 'patrol') ent.state = 'wary';
  }

  if (isDog && ent.state === 'chase') {
    ent.barkT -= dt;
    if (ent.barkT <= 0) { ent.barkT = 1.6; events.bark = ent; }
  }
  return events;
}

// Lure a watcher toward a thrown coin.
export function lureWatcher(ent, x, y) {
  if (ent.state === 'chase') return;
  ent.state = 'investigate';
  ent.investigate = { x, y, t: 0 };
  ent.suspicion = Math.max(ent.suspicion, 0.3);
}

// One camera tick: sweep its beam; returns true when it spots the player.
export function tickCamera(level, cam, player, dt) {
  cam.t += dt;
  const phase = (cam.t % TUNE.cameraSweepSec) / TUNE.cameraSweepSec;
  const swing = Math.sin(phase * Math.PI * 2) * cam.sweep;
  cam.angle = cam.base + swing;
  if (player.hiddenInBush || player.inSmoke) return false;
  const seen = inVisionCone(level, cam, player.x, player.y, 5.6, 0.5);
  if (seen) cam.spotted = Math.min(1, cam.spotted + dt * 1.4);
  else cam.spotted = Math.max(0, cam.spotted - dt * 0.8);
  if (cam.spotted >= 1 && !cam.tripped) { cam.tripped = true; return true; }
  if (cam.spotted < 0.4) cam.tripped = false;
  return false;
}

// Has the player crossed a tripwire line while visible?
export function crossedTripwire(wire, px, py, ox, oy) {
  const d = (x, y) => Math.abs((wire.y2 - wire.y1) * x - (wire.x2 - wire.x1) * y + wire.x2 * wire.y1 - wire.y2 * wire.x1) /
    Math.hypot(wire.y2 - wire.y1, wire.x2 - wire.x1);
  const seg = (x, y) => {
    const minx = Math.min(wire.x1, wire.x2) - 0.5, maxx = Math.max(wire.x1, wire.x2) + 0.5;
    const miny = Math.min(wire.y1, wire.y2) - 0.5, maxy = Math.max(wire.y1, wire.y2) + 0.5;
    return x >= minx && x <= maxx && y >= miny && y <= maxy;
  };
  const pxT = px / TILE, pyT = py / TILE, oxT = ox / TILE, oyT = oy / TILE;
  return d(pxT, pyT) < 0.35 && seg(pxT, pyT) && !(d(oxT, oyT) < 0.35 && seg(oxT, oyT));
}
