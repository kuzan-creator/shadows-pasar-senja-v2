// Shadows of Pasar Senja v2 — game loop, state machine, stealth mechanics, self-test.
import { TILE, FIELD, CANVAS_W, CANVAS_H, LEVELS, LOOT_VALUE, GHOST_BONUS, MAX_STRIKES, START_COINS, START_SMOKE, TUNE } from './config.js';
import { makeAudio } from './audio.js';
import { makeInput } from './input.js';
import { makeGuard, makeDog, makeCamera, tickWatcher, tickCamera, lureWatcher, crossedTripwire, blocksMove, blocksSight } from './guards.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = makeAudio();
const input = makeInput(canvas);

const BEST_KEY = 'senja_best_score';
const UNLOCK_KEY = 'senja_unlocked';

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; }
}
function loadUnlocked() {
  try { return Math.min(3, Math.max(1, Number(localStorage.getItem(UNLOCK_KEY) || 1) || 1)); } catch (e) { return 1; }
}

function tileAt(level, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= level.map[0].length || cy >= level.map.length) return '#';
  return level.map[cy][cx];
}

function findTiles(level, ch) {
  const out = [];
  for (let y = 0; y < level.map.length; y++) {
    for (let x = 0; x < level.map[0].length; x++) {
      if (level.map[y][x] === ch) out.push({ x, y });
    }
  }
  return out;
}

const S = {
  screen: 'title', // title | play | paused | leveldone | victory | caught
  levelIndex: 0,
  level: null,
  guards: [],
  dogs: [],
  cameras: [],
  player: null,
  coinsThrown: [],
  smokes: [],
  floats: [],
  log: [],
  loot: 0,
  lootTotal: 0,
  score: 0,
  strikes: 0,
  strikesLost: 0,
  ghost: true,
  timeSec: 0,
  totalSec: 0,
  timeBonus: 0,
  best: loadBest(),
  unlocked: loadUnlocked(),
  coins: START_COINS,
  smoke: START_SMOKE,
  tripped: false,
  tripCooldown: 0,
  noiseT: 0,
  alarmT: 0,
  banner: 'Stay in the shadows. Steal the lanterns. Vanish unseen.',
  caughtBy: '',
  levelDoneT: 0,
  t: 0,
};

function log(line) {
  S.log.push(line);
  if (S.log.length > 40) S.log.shift();
}

function startLevel(idx) {
  const def = LEVELS[idx];
  const level = { ...def, exitOpen: false, lootTaken: new Set() };
  S.levelIndex = idx;
  S.level = level;
  S.guards = def.guards.map((g) => makeGuard(g, level));
  S.dogs = def.dogs.map((d) => makeDog(d));
  S.cameras = def.cameras.map((c) => makeCamera(c));
  const start = findTiles(level, 'P')[0];
  S.player = {
    x: start.x * TILE + TILE / 2,
    y: start.y * TILE + TILE / 2,
    crouching: false,
    hiddenInBush: false,
    inSmoke: false,
    noiseRing: 0,
    angle: 0,
  };
  S.coinsThrown = [];
  S.smokes = [];
  S.floats = [];
  S.loot = 0;
  S.coins = START_COINS;
  S.smoke = START_SMOKE;
  S.timeSec = 0;
  S.tripped = false;
  S.tripCooldown = 0;
  S.screen = 'play';
  log(`Heist ${idx + 1}: ${def.name} — ${def.hint}`);
  S.banner = def.hint;
}

function startGame(levelIdx = 0) {
  S.strikes = 0;
  S.strikesLost = 0;
  S.ghost = true;
  S.score = 0;
  S.totalSec = 0;
  S.lootTotal = 0;
  startLevel(levelIdx);
  audio.unlock();
}

function addFloat(x, y, text, color = '#f5b942') {
  S.floats.push({ x, y, text, color, life: 1 });
}

function nearestLampDist(px, py) {
  let best = Infinity;
  for (const [lx, ly] of S.level.lamps) {
    const d = Math.hypot(px - (lx * TILE + TILE / 2), py - (ly * TILE + TILE / 2));
    if (d < best) best = d;
  }
  return best;
}

function playerTile() {
  return { cx: Math.floor(S.player.x / TILE), cy: Math.floor(S.player.y / TILE) };
}

function updatePlayer(dt) {
  const p = S.player;
  const ax = input.axis();
  p.crouching = input.crouch();
  const speed = p.crouching ? TUNE.playerCrouch : TUNE.playerWalk;
  const step = speed * TILE * dt;
  const nx = p.x + ax.x * step;
  const ny = p.y + ax.y * step;
  const r = TILE * 0.3;
  if (!blocksMove(tileAt(S.level, Math.floor((nx + Math.sign(ax.x) * r) / TILE), Math.floor(p.y / TILE)))) p.x = nx;
  if (!blocksMove(tileAt(S.level, Math.floor(p.x / TILE), Math.floor((ny + Math.sign(ax.y) * r) / TILE)))) p.y = ny;
  if (ax.x !== 0 || ax.y !== 0) {
    p.angle = Math.atan2(ax.y, ax.x);
    if (Math.random() < dt * 2.2) audio.step();
    if (!p.crouching) p.noiseRing = Math.max(p.noiseRing, 0.25);
  }
  p.noiseRing = Math.max(0, p.noiseRing - dt * 1.4);
  const { cx, cy } = playerTile();
  const tile = tileAt(S.level, cx, cy);
  p.hiddenInBush = tile === 'B' && p.crouching;
  p.inSmoke = S.smokes.some((s) => Math.hypot(p.x - s.x, p.y - s.y) < 44);
  // Lantern pickup.
  for (const lt of findTiles(S.level, 'L')) {
    const key = lt.y * S.level.map[0].length + lt.x;
    if (S.level.lootTaken.has(key)) continue;
    const lx = lt.x * TILE + TILE / 2, ly = lt.y * TILE + TILE / 2;
    if (Math.hypot(p.x - lx, p.y - ly) < TILE * 0.62) {
      S.level.lootTaken.add(key);
      S.loot++;
      S.lootTotal += LOOT_VALUE;
      S.score += LOOT_VALUE;
      addFloat(lx, ly - 14, `+$${LOOT_VALUE}`);
      audio.pickup();
      log(`Lantern stolen! +$${LOOT_VALUE}  (${S.loot}/3)`);
      if (S.loot >= 3) {
        S.level.exitOpen = true;
        log('All lanterns stolen — the gate is open!');
        S.banner = 'All lanterns stolen — reach the green gate!';
        audio.win();
      }
    }
  }
  // Exit.
  const exit = findTiles(S.level, 'E')[0];
  if (exit && S.level.exitOpen) {
    const ex = exit.x * TILE + TILE / 2, ey = exit.y * TILE + TILE / 2;
    if (Math.hypot(p.x - ex, p.y - ey) < TILE * 0.7) completeLevel();
  }
  // Tripwires.
  if (S.tripCooldown > 0) S.tripCooldown -= dt;
  for (const w of S.level.tripwires) {
    if (S.tripCooldown <= 0 && crossedTripwire(w, p.x, p.y, p.ox ?? p.x, p.oy ?? p.y)) {
      S.tripped = true;
      S.tripCooldown = 2;
      S.ghost = false;
      raiseAlarm('Tripwire tripped! The museum is awake!');
    }
  }
  p.ox = p.x;
  p.oy = p.y;
}

function raiseAlarm(msg) {
  log(msg);
  S.alarmT = 3;
  S.banner = msg;
  audio.alarm();
  for (const w of [...S.guards, ...S.dogs]) {
    if (w.state !== 'chase') {
      w.state = 'investigate';
      w.investigate = { x: S.player.x, y: S.player.y, t: 0 };
      w.suspicion = Math.max(w.suspicion, 0.6);
    }
  }
}

function throwCoin(tx, ty) {
  if (S.coins <= 0) { log('No coins left!'); return; }
  S.coins--;
  const p = S.player;
  const coin = { x: p.x, y: p.y, tx, ty, t: 0, flying: true };
  S.coinsThrown.push(coin);
  audio.coin();
  log('Coin thrown — listen for the clink…');
}

function throwSmoke() {
  if (S.smoke <= 0) { log('No smoke bombs left!'); return; }
  S.smoke--;
  S.smokes.push({ x: S.player.x, y: S.player.y, t: 0, life: 1 });
  audio.smoke();
  log('Smoke! Line of sight broken.');
}

function updateCoins(dt) {
  for (const c of S.coinsThrown) {
    c.t += dt * 2.6;
    if (c.flying && c.t >= 1) {
      c.flying = false;
      c.x = c.tx;
      c.y = c.ty;
      audio.clink();
      S.noiseT = 1.2;
      let lured = 0;
      for (const w of [...S.guards, ...S.dogs]) {
        if (Math.hypot(w.x - c.x, w.y - c.y) < TUNE.coinLureRadius * TILE) {
          lureWatcher(w, c.x, c.y);
          lured++;
        }
      }
      addFloat(c.x, c.y - 12, 'WHAT WAS THAT?', '#ffe9a8');
      log(lured > 0 ? `Clink! ${lured} guard${lured > 1 ? 's turn' : ' turns'} to look.` : 'Clink! Nobody heard it.');
    }
  }
  S.coinsThrown = S.coinsThrown.filter((c) => c.t < 14);
}

function updateSmokes(dt) {
  for (const s of S.smokes) {
    s.t += dt;
    s.life = Math.max(0, 1 - s.t / 3.5);
  }
  S.smokes = S.smokes.filter((s) => s.life > 0);
}

function completeLevel() {
  const bonus = Math.max(0, 300 - Math.floor(S.timeSec)) * 2;
  S.totalSec += S.timeSec;
  if (S.levelIndex >= LEVELS.length - 1) {
    S.timeBonus = Math.max(0, 900 - Math.floor(S.totalSec) * 2);
    S.score += S.timeBonus + (S.ghost ? GHOST_BONUS : 0);
    S.screen = 'victory';
    S.unlocked = 3;
    try {
      localStorage.setItem(UNLOCK_KEY, '3');
      if (S.score > S.best) {
        S.best = S.score;
        localStorage.setItem(BEST_KEY, String(S.best));
      }
    } catch (e) { /* storage unavailable */ }
    audio.win();
    log(`HEIST COMPLETE! Final score ${S.score}.`);
    return;
  }
  S.screen = 'leveldone';
  S.levelDoneT = 0;
  S.unlocked = Math.max(S.unlocked, S.levelIndex + 2);
  try { localStorage.setItem(UNLOCK_KEY, String(S.unlocked)); } catch (e) { /* ignore */ }
  audio.win();
  log(`Heist ${S.levelIndex + 1} complete! +$${bonus} time bonus.`);
  S.score += bonus;
}

function onCaught(by) {
  S.strikes++;
  S.strikesLost++;
  S.ghost = false;
  S.caughtBy = by.name;
  S.score = Math.max(0, S.score - 150);
  audio.caught();
  log(`${by.name} caught Raka! Strike ${S.strikes}/3.`);
  S.screen = 'caught';
}

function respawn() {
  if (S.strikes >= MAX_STRIKES) {
    startGame(0);
    return;
  }
  startLevel(S.levelIndex);
}

function updatePlay(dt) {
  S.timeSec += dt;
  if (S.alarmT > 0) S.alarmT -= dt;
  if (S.noiseT > 0) S.noiseT -= dt;
  updatePlayer(dt);
  if (S.screen !== 'play') return;
  const events = {};
  for (const w of [...S.guards, ...S.dogs]) tickWatcher(S.level, w, S.player, dt, events);
  if (events.saw) {
    audio.suspicious();
    log(`${events.saw.name} is suspicious… (?)`);
    S.banner = `${events.saw.name} heard something — stay out of the cone!`;
  }
  if (events.alarm) {
    S.ghost = false;
    raiseAlarm(`SPOTTED! ${events.alarm.name} raised the alarm — break line of sight and hide!`);
  }
  if (events.bark) {
    audio.bark();
    log(`${events.bark.name} the dog is barking!`);
  }
  if (events.caught) { onCaught(events.caught); return; }
  for (const cam of S.cameras) {
    if (tickCamera(S.level, cam, S.player, dt)) {
      S.ghost = false;
      raiseAlarm('Camera spotted you! Break line of sight!');
    }
  }
  // Actions.
  if (input.take('KeyE')) {
    const p = S.player;
    throwCoin(p.x + Math.cos(p.angle || 0) * TILE * 3, p.y + Math.sin(p.angle || 0) * TILE * 3);
  }
  const click = input.takeClick();
  if (click) {
    const fx = click.x - FIELD.x, fy = click.y - FIELD.y;
    if (fx >= 0 && fy >= 0 && fx < FIELD.w && fy < FIELD.h) throwCoin(fx, fy);
  }
  if (input.take('KeyF')) throwSmoke();
  updateCoins(dt);
  updateSmokes(dt);
  for (const f of S.floats) { f.y -= dt * 22; f.life -= dt * 0.7; }
  S.floats = S.floats.filter((f) => f.life > 0);
}

function hudState() {
  const maxSuspicion = Math.max(0, ...S.guards.map((g) => g.suspicion), ...S.dogs.map((d) => d.suspicion));
  const chasing = [...S.guards, ...S.dogs].some((w) => w.state === 'chase');
  const det = chasing
    ? { label: 'ALARM!', sub: 'A guard is chasing you — hide!', frac: 1, color: '#e5484d' }
    : maxSuspicion >= 0.45
      ? { label: 'SUSPICIOUS', sub: 'A guard is wary — stay out of sight', frac: maxSuspicion, color: '#f5a524' }
      : { label: 'UNSEEN', sub: 'No guard suspects you', frac: maxSuspicion, color: '#3fae7a' };
  const p = S.player;
  const inLight = nearestLampDist(p.x, p.y) < TILE * 2.6;
  const visibility = p.hiddenInBush ? 'HIDDEN IN BUSH' : p.inSmoke ? 'IN SMOKE' : p.crouching ? 'CROUCHED' : inLight ? 'IN LIGHT — VISIBLE' : 'IN SHADOW';
  const mm = String(Math.floor(S.timeSec / 60)).padStart(2, '0');
  const ss = String(Math.floor(S.timeSec % 60)).padStart(2, '0');
  const statusOf = (w) => w.state === 'chase' ? { s: '! CHASE', c: '#e5484d' } : w.state === 'wary' ? { s: '? WARY', c: '#f5a524' } : w.state === 'investigate' ? { s: '… CHECK', c: '#f5a524' } : { s: '· PATROL', c: '#7fd4a8' };
  return {
    screen: S.screen,
    level: S.level,
    levelId: S.levelIndex + 1,
    levelName: S.level.name,
    player: p,
    guards: S.guards,
    dogs: S.dogs,
    cameras: S.cameras,
    coinsThrown: S.coinsThrown,
    smokes: S.smokes,
    floats: S.floats,
    tripped: S.tripped,
    loot: S.lootTotal,
    lootTotal: LEVELS.length * 3 * LOOT_VALUE,
    lootCount: S.loot,
    lootFrac: S.loot / 3,
    timeStr: `${mm}:${ss}`,
    heat: chasing ? 'HIGH' : maxSuspicion >= 0.45 ? 'RISING' : 'LOW',
    heatColor: chasing ? '#e5484d' : maxSuspicion >= 0.45 ? '#f5a524' : '#3fae7a',
    score: S.score,
    best: S.best,
    strikes: S.strikes,
    ghost: S.ghost,
    coins: S.coins,
    smoke: S.smoke,
    objectives: [
      { done: S.loot >= 1, text: `Steal lantern 1 (${Math.min(S.loot, 1)}/1)` },
      { done: S.loot >= 2, text: `Steal lantern 2 (${Math.min(Math.max(S.loot - 1, 0), 1)}/1)` },
      { done: S.loot >= 3, text: `Steal lantern 3 (${Math.min(Math.max(S.loot - 2, 0), 1)}/1)` },
      { done: S.level.exitOpen, text: 'Reach the gate unseen' },
    ],
    log: S.log,
    detection: det,
    visibility,
    noise: S.noiseT > 0 ? 'CLINK!' : S.player.crouching ? 'SILENT' : 'SOFT STEPS',
    guardRows: [...S.guards, ...S.dogs].map((w) => ({ name: w.name, color: w.color, status: statusOf(w).s, statusColor: statusOf(w).c })),
    cameraRows: S.cameras.map((c, i) => `CAM ${i + 1} — ${c.spotted > 0.5 ? 'SPOTTING!' : 'sweeping'}`),
    map: S.level.map,
    mapRows: S.level.map.length,
    mapCols: S.level.map[0].length,
    lootTaken: S.level.map.flatMap((row, y) => [...row].map((ch, x) => (ch === 'L' ? S.level.lootTaken.has(y * S.level.map[0].length + x) : false))),
    guardDots: [...S.guards, ...S.dogs].map((w) => ({ x: w.x, y: w.y, state: w.state })),
    playerDot: { x: p.x, y: p.y },
    banner: S.banner,
    timeBonus: S.timeBonus,
    strikesLost: S.strikesLost,
    caughtBy: S.caughtBy,
  };
}

function drawLevelDone(ctx) {
  ctx.fillStyle = 'rgba(20,14,28,0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5b942';
  ctx.font = '700 48px Georgia, serif';
  ctx.fillText(`HEIST ${S.levelIndex + 1} COMPLETE!`, CANVAS_W / 2, 330);
  ctx.fillStyle = '#efe6d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText(`All three lanterns of ${S.level.name} are yours.`, CANVAS_W / 2, 380);
  ctx.fillStyle = '#b9a98f';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press ENTER for the next heist', CANVAS_W / 2, 420);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  S.t += dt;
  if (input.take('KeyM')) audio.toggleMute();
  if (S.screen === 'title') {
    if (input.take('Enter') || input.take('NumpadEnter')) { audio.click(); startGame(0); }
    else if (input.take('Digit1')) startGame(0);
    else if (input.take('Digit2') && S.unlocked >= 2) startGame(1);
    else if (input.take('Digit3') && S.unlocked >= 3) startGame(2);
    render(ctx, hudState(), S.t);
  } else if (S.screen === 'play') {
    if (shot) { /* staged screenshot scene: render only, gameplay frozen */ }
    else if (input.take('KeyP')) { S.screen = 'paused'; }
    else if (input.take('KeyR')) { startLevel(S.levelIndex); }
    else updatePlay(dt);
    render(ctx, hudState(), S.t);
  } else if (S.screen === 'paused') {
    if (input.take('KeyP') || input.take('Enter')) S.screen = 'play';
    render(ctx, hudState(), S.t);
  } else if (S.screen === 'leveldone') {
    S.levelDoneT += dt;
    if (input.take('Enter') || S.levelDoneT > 6) startLevel(S.levelIndex + 1);
    render(ctx, hudState(), S.t);
    drawLevelDone(ctx);
  } else if (S.screen === 'victory' || S.screen === 'caught') {
    if (input.take('Enter')) {
      if (S.screen === 'victory') { S.screen = 'title'; }
      else respawn();
    }
    render(ctx, hudState(), S.t);
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

// --------------------------------------------------------------- self-test
function selftest() {
  // Snapshot the live totals: the checks below collect lanterns on purpose,
  // and must not pollute the real game's loot and score.
  const snap = { loot: S.loot, lootTotal: S.lootTotal, score: S.score, strikes: S.strikes, strikesLost: S.strikesLost, ghost: S.ghost, timeSec: S.timeSec, totalSec: S.totalSec };
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (e) { results.push({ name, pass: false, error: String(e) }); }
  };
  check('boot: canvas and state exist', () => !!canvas && !!S.level);
  check('maps: 3 levels, each 22 rows x 26 cols', () => LEVELS.every((l) => l.map.length === 22 && l.map.every((r) => r.length === 26)));
  check('movement collision: walls block, floor passes', () => {
    startLevel(0);
    const wall = tileAt(S.level, 0, 0) === '#';
    const floor = !blocksMove(tileAt(S.level, 2, 3));
    const bush = tileAt(S.level, 8, 7) === 'B';
    startLevel(0);
    return wall && floor && bush;
  });
  check('guard patrols between waypoints', () => {
    startLevel(0);
    const g = S.guards[0];
    const x0 = g.x, y0 = g.y;
    for (let i = 0; i < 60; i++) tickWatcher(S.level, g, S.player, 1 / 60, {});
    startLevel(0);
    return Math.hypot(g.x - x0, g.y - y0) > 4;
  });
  check('vision cone raises suspicion', () => {
    startLevel(0);
    const g = S.guards[0];
    S.player.x = g.x + Math.cos(g.angle) * TILE * 2;
    S.player.y = g.y + Math.sin(g.angle) * TILE * 2;
    S.player.hiddenInBush = false;
    S.player.inSmoke = false;
    const before = g.suspicion;
    for (let i = 0; i < 30; i++) tickWatcher(S.level, g, S.player, 1 / 60, {});
    const ok = g.suspicion > before;
    startLevel(0);
    return ok;
  });
  check('coin lures a guard to investigate', () => {
    startLevel(0);
    const g = S.guards[0];
    lureWatcher(g, g.x + TILE * 3, g.y);
    const ok = g.state === 'investigate' && g.investigate !== null;
    startLevel(0);
    return ok;
  });
  check('lantern pickup adds loot', () => {
    startLevel(0);
    const lt = findTiles(S.level, 'L')[0];
    S.player.x = lt.x * TILE + TILE / 2;
    S.player.y = lt.y * TILE + TILE / 2;
    const before = S.loot;
    updatePlayer(1 / 60);
    const ok = S.loot === before + 1;
    startLevel(0);
    return ok;
  });
  check('exit opens after 3 lanterns', () => {
    startLevel(0);
    for (const lt of findTiles(S.level, 'L')) {
      S.player.x = lt.x * TILE + TILE / 2;
      S.player.y = lt.y * TILE + TILE / 2;
      updatePlayer(1 / 60);
    }
    const ok = S.level.exitOpen === true && S.loot === 3;
    startLevel(0);
    return ok;
  });
  check('museum camera sweeps its beam', () => {
    startLevel(1);
    const cam = S.cameras[0];
    const a0 = cam.angle;
    tickCamera(S.level, cam, S.player, 0.5);
    const ok = S.cameras.length > 0 && cam.angle !== a0;
    startLevel(0);
    return ok;
  });
  check('harbour dog patrols and smells', () => {
    startLevel(2);
    const d = S.dogs[0];
    const x0 = d.x;
    S.player.x = d.x + TILE * 1.5;
    S.player.y = d.y;
    S.player.hiddenInBush = false;
    S.player.inSmoke = false;
    for (let i = 0; i < 60; i++) tickWatcher(S.level, d, S.player, 1 / 60, {});
    const ok = S.dogs.length === 2 && (Math.abs(d.x - x0) > 2 || d.suspicion > 0);
    startLevel(0);
    return ok;
  });
  startLevel(0);
  Object.assign(S, snap);
  S.screen = 'title';
  return results;
}

window.__senja = { state: S, selftest, startGame, startLevel, restage: () => { if (shot) applyShot(S, shot, { startLevel, startGame, log, addFloat }); } };

// Boot: title screen, or a staged screenshot scene (?shot=cover|title|museum|victory).
startLevel(0);
S.screen = 'title';
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) applyShot(S, shot, { startLevel, startGame, log, addFloat });
requestAnimationFrame(frame);
