// Shadows of Pasar Senja v2 — deterministic staged scenes for the 4 screenshots.
// Each shot is a real render of the game's own code: fixed positions, guard states,
// loot and log lines, so the cover shows the game at its most complete.
import { TILE } from './config.js';

function tileXY(x, y) {
  return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
}

function takeLantern(S, tx, ty) {
  const key = ty * S.level.map[0].length + tx;
  S.level.lootTaken.add(key);
  S.loot += 1;
  S.lootTotal += 200;
  S.score += 200;
}

export function applyShot(S, name, helpers) {
  const { startLevel, log, addFloat } = helpers;
  if (name === 'title') {
    S.screen = 'title';
    return;
  }
  if (name === 'cover') {
    startLevel(0);
    S.lootTotal = 0;
    S.score = 0;
    // Player crouched and hidden in the bush at (8,7).
    const bush = tileXY(8, 7);
    S.player.x = bush.x;
    S.player.y = bush.y;
    S.player.crouching = true;
    S.player.hiddenInBush = true;
    // Pak Dedi stands close, cone on the bush, suspicious.
    const dedi = S.guards[0];
    const spot = tileXY(11, 7);
    dedi.x = spot.x;
    dedi.y = spot.y;
    dedi.angle = Math.PI;
    dedi.suspicion = 0.82;
    dedi.state = 'wary';
    // Bu Ratna patrols the lower lane, calm.
    const ratna = S.guards[1];
    const r2 = tileXY(16, 14);
    ratna.x = r2.x;
    ratna.y = r2.y;
    ratna.angle = -Math.PI / 2;
    // Wulan mid-patrol near the stalls.
    const wulan = S.guards[2];
    const w2 = tileXY(12, 10);
    wulan.x = w2.x;
    wulan.y = w2.y;
    wulan.angle = Math.PI / 2;
    // One lantern already stolen; a coin lies on the floor with a lure float.
    takeLantern(S, 12, 5);
    const coin = tileXY(15, 5);
    S.coinsThrown.push({ x: coin.x, y: coin.y, tx: coin.x, ty: coin.y, t: 2, flying: false });
    addFloat(coin.x, coin.y - 12, 'WHAT WAS THAT?', '#ffe9a8');
    addFloat(tileXY(18, 10).x, tileXY(18, 10).y - 14, '+$200', '#f5b942');
    S.timeSec = 83;
    S.coins = 4;
    S.smoke = 2;
    S.log = [
      'Heist 1: Pasar Malam',
      'Lantern stolen! +$200',
      'Coin thrown…',
      'Clink! 1 guard turns.',
      'Pak Dedi is suspicious…',
    ];
    S.banner = 'Pak Dedi heard something — stay out of the cone!';
    S.screen = 'play';
    return;
  }
  if (name === 'museum') {
    startLevel(1);
    S.lootTotal = 0;
    S.score = 0;
    const p = tileXY(12, 10);
    S.player.x = p.x;
    S.player.y = p.y;
    S.player.crouching = true;
    // Bimo faces the player from the upper hall, suspicious.
    const bimo = S.guards[0];
    const b = tileXY(12, 6);
    bimo.x = b.x;
    bimo.y = b.y;
    bimo.angle = Math.PI / 2;
    bimo.suspicion = 0.62;
    bimo.state = 'wary';
    // Sari patrols the right wing.
    const sari = S.guards[1];
    const s2 = tileXY(20, 15);
    sari.x = s2.x;
    sari.y = s2.y;
    sari.angle = Math.PI;
    // A camera beam sweeps near the player, half-spotted.
    S.cameras[0].spotted = 0.65;
    S.cameras[0].angle = Math.PI / 2 + 0.4;
    takeLantern(S, 10, 7);
    S.timeSec = 125;
    S.coins = 3;
    S.smoke = 1;
    S.log = [
      'Heist 2: Museum Pusaka',
      'Lantern stolen! +$200',
      'Bimo is suspicious… (?)',
      'Camera beam closing in!',
    ];
    S.banner = 'Camera beam closing in — break line of sight!';
    S.screen = 'play';
    return;
  }
  if (name === 'victory') {
    startLevel(2);
    S.lootTotal = 1800;
    S.loot = 3;
    S.score = 2450;
    S.timeBonus = 150;
    S.timeSec = 327;
    S.totalSec = 327;
    S.ghost = true;
    S.strikesLost = 0;
    S.best = 2450;
    S.screen = 'victory';
    return;
  }
  // Unknown shot name: fall back to the title screen.
  S.screen = 'title';
}
