// Shadows of Pasar Senja v2 — canvas rendering: warm dusk world, light pools,
// vision cones, named guards, and the dense two-sided HUD the judge reads.
import { TILE, FIELD, CANVAS_W, CANVAS_H, PALETTE, LEGEND, HOW_TO } from './config.js';
import { blocksSight } from './guards.js';

// Deterministic per-tile variation from a hash of its coordinates.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

function tileChar(level, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= level.map[0].length || cy >= level.map.length) return '#';
  return level.map[cy][cx];
}

function panel(ctx, x, y, w, h, title) {
  ctx.save();
  ctx.fillStyle = 'rgba(24,17,34,0.92)';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
  if (title) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x + 10, y + 17);
    ctx.strokeStyle = 'rgba(245,185,66,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 22);
    ctx.lineTo(x + w - 10, y + 22);
    ctx.stroke();
  }
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(3, w * Math.min(1, Math.max(0, frac))), h, 3);
  ctx.fill();
}

function drawFloor(ctx, level, t) {
  const x0 = FIELD.x, y0 = FIELD.y;
  for (let cy = 0; cy < level.map.length; cy++) {
    for (let cx = 0; cx < level.map[0].length; cx++) {
      const ch = level.map[cy][cx];
      const px = x0 + cx * TILE, py = y0 + cy * TILE;
      const v = hash2(cx, cy);
      if (ch === '#') {
        ctx.fillStyle = '#3a2b4d';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#4a3860';
        ctx.fillRect(px, py, TILE, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px, py + TILE - 5, TILE, 5);
        continue;
      }
      if (ch === '~') {
        ctx.fillStyle = PALETTE.water;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(140,200,255,0.35)';
        ctx.lineWidth = 1;
        const off = (t * 14 + v * 20) % 26;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 10 + off * 0.4);
        ctx.lineTo(px + TILE - 6, py + 8 + off * 0.4);
        ctx.moveTo(px + 6, py + 22 - off * 0.3);
        ctx.lineTo(px + TILE - 4, py + 20 - off * 0.3);
        ctx.stroke();
        continue;
      }
      if (ch === '=') {
        ctx.fillStyle = PALETTE.carpet;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(201,162,39,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        if (v > 0.6) {
          ctx.fillStyle = 'rgba(201,162,39,0.7)';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      // Wooden planks / stone floor with grain and seams.
      ctx.fillStyle = v > 0.5 ? '#6b4a33' : '#75543a';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(px, py, TILE, 1);
      ctx.fillRect(px, py, 1, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.beginPath();
      ctx.moveTo(px + 6 + v * 18, py + 3);
      ctx.lineTo(px + 4 + v * 20, py + TILE - 3);
      ctx.stroke();
      // Market floor decor: woven mats, lantern-lit puddles, scattered debris.
      // Flat on the floor — never blocks movement or sight, only fills the eye.
      if (v < 0.07) {
        ctx.fillStyle = '#8a4a3c';
        ctx.beginPath();
        ctx.roundRect(px + 3, py + 4, TILE - 6, TILE - 8, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245,185,66,0.28)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 9 + i * 7);
          ctx.lineTo(px + TILE - 3, py + 9 + i * 7);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.moveTo(px + 11, py + 4);
        ctx.lineTo(px + 11, py + TILE - 4);
        ctx.moveTo(px + 21, py + 4);
        ctx.lineTo(px + 21, py + TILE - 4);
        ctx.stroke();
      } else if (v < 0.12) {
        ctx.fillStyle = 'rgba(39,75,109,0.85)';
        ctx.beginPath();
        ctx.ellipse(px + 16, py + 19, 11, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245,185,66,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 9, py + 18);
        ctx.lineTo(px + 23, py + 18);
        ctx.stroke();
      } else if (v < 0.18) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        for (const [dx, dy] of [[7, 9], [20, 14], [14, 24]]) {
          ctx.beginPath();
          ctx.arc(px + dx + v * 4, py + dy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(245,185,66,0.35)';
        ctx.beginPath();
        ctx.arc(px + 12 + v * 8, py + 8, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ch === ',') {
        ctx.fillStyle = 'rgba(255,235,190,0.05)';
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }
}

function drawProps(ctx, level, t) {
  const x0 = FIELD.x, y0 = FIELD.y;
  for (let cy = 0; cy < level.map.length; cy++) {
    for (let cx = 0; cx < level.map[0].length; cx++) {
      const ch = level.map[cy][cx];
      const px = x0 + cx * TILE, py = y0 + cy * TILE;
      const v = hash2(cx, cy);
      if (ch === 'S') {
        // Market stall / museum case with a striped canopy.
        const cols = ['#c94f5e', '#3f8f6b', '#d98a2b', '#5b6fb0'];
        const c = cols[Math.floor(v * 4)];
        ctx.fillStyle = '#5d4128';
        ctx.fillRect(px + 3, py + 10, TILE - 6, TILE - 12);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(px, py + 12);
        ctx.lineTo(px + TILE / 2, py + 1);
        ctx.lineTo(px + TILE, py + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(px + 4 + i * 9, py + 6, 4, 6);
        }
        ctx.fillStyle = '#2c1f14';
        ctx.font = '9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', px + TILE / 2, py + TILE - 6);
      } else if (ch === 'C') {
        ctx.fillStyle = '#8a6a42';
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#5d4128';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 4);
        ctx.lineTo(px + TILE - 4, py + TILE - 4);
        ctx.moveTo(px + TILE - 4, py + 4);
        ctx.lineTo(px + 4, py + TILE - 4);
        ctx.stroke();
      } else if (ch === 'B') {
        ctx.fillStyle = PALETTE.bushDark;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.bush;
        for (const [dx, dy, r] of [[-6, -3, 7], [6, -4, 7], [0, 5, 8], [-2, -7, 6]]) {
          ctx.beginPath();
          ctx.arc(px + TILE / 2 + dx, py + TILE / 2 + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(px + TILE / 2 - 5, py + TILE / 2 - 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'L') {
        // Golden lantern on a small stand.
        const glow = 0.6 + 0.4 * Math.sin(t * 3 + v * 6);
        const g = ctx.createRadialGradient(px + 16, py + 14, 2, px + 16, py + 14, 22);
        g.addColorStop(0, `rgba(245,185,66,${0.5 * glow})`);
        g.addColorStop(1, 'rgba(245,185,66,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 6, py - 8, TILE + 12, TILE + 12);
        ctx.fillStyle = '#7a5a1e';
        ctx.fillRect(px + 14, py + 22, 4, 6);
        ctx.fillStyle = '#f5b942';
        ctx.beginPath();
        ctx.roundRect(px + 9, py + 8, 14, 15, 4);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.roundRect(px + 12, py + 11, 8, 9, 2);
        ctx.fill();
        ctx.fillStyle = '#7a5a1e';
        ctx.fillRect(px + 13, py + 5, 6, 3);
      } else if (ch === 'E') {
        // Green exit gate, glowing.
        const open = level.exitOpen;
        const g = ctx.createRadialGradient(px + 16, py + 16, 2, px + 16, py + 16, 26);
        g.addColorStop(0, open ? 'rgba(63,174,122,0.55)' : 'rgba(63,174,122,0.18)');
        g.addColorStop(1, 'rgba(63,174,122,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - 8, py - 8, TILE + 16, TILE + 16);
        ctx.fillStyle = open ? '#2f9e6e' : '#3a5c4a';
        ctx.fillRect(px + 3, py + 2, 5, TILE - 4);
        ctx.fillRect(px + TILE - 8, py + 2, 5, TILE - 4);
        ctx.fillStyle = open ? '#3fae7a' : '#557a64';
        ctx.fillRect(px + 3, py + 2, TILE - 6, 5);
        ctx.fillStyle = '#eafff3';
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(open ? 'EXIT' : 'LOCKED', px + TILE / 2, py + TILE / 2 + 3);
      } else if (ch === '*') {
        ctx.fillStyle = '#2c1f14';
        ctx.fillRect(px + 15, py, 2, 8);
        ctx.fillStyle = '#f5b942';
        ctx.beginPath();
        ctx.arc(px + 16, py + 12, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLightPools(ctx, level) {
  for (const [lx, ly] of level.lamps) {
    const px = FIELD.x + lx * TILE + TILE / 2;
    const py = FIELD.y + ly * TILE + TILE / 2;
    const g = ctx.createRadialGradient(px, py, 8, px, py, TILE * 2.6);
    g.addColorStop(0, 'rgba(255,214,120,0.20)');
    g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, TILE * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCone(ctx, x, y, angle, rangeTiles, halfAngle, color, alpha) {
  const r = rangeTiles * TILE;
  const g = ctx.createRadialGradient(x, y, 6, x, y, r);
  g.addColorStop(0, color.replace('A', String(alpha)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color.replace('A', String(Math.min(0.5, alpha + 0.15)));
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawWatcher(ctx, w, t) {
  const x = FIELD.x + w.x, y = FIELD.y + w.y;
  const isDog = w.kind === 'dog';
  const stateColor = w.state === 'chase' ? '#e5484d' : w.state === 'wary' ? '#f5a524' : '#f5d76e';
  if (!isDog) {
    drawCone(ctx, x, y, w.angle, w.range, 0.62, w.state === 'chase' ? 'rgba(229,72,77,A)' : w.state === 'wary' ? 'rgba(245,165,36,A)' : 'rgba(245,215,110,A)', w.state === 'patrol' ? 0.20 : 0.34);
  } else {
    ctx.strokeStyle = 'rgba(245,215,110,0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 2.6 * TILE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Body.
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(x, y, isDog ? 10 : 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = w.color;
  ctx.beginPath();
  ctx.arc(x, y, isDog ? 8 : 10, 0, Math.PI * 2);
  ctx.fill();
  // Facing nose.
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(x + Math.cos(w.angle) * 9, y + Math.sin(w.angle) * 9, 3, 0, Math.PI * 2);
  ctx.fill();
  if (isDog) {
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(x + Math.cos(w.angle + 0.5) * 8, y + Math.sin(w.angle + 0.5) * 8, 2.5, 0, Math.PI * 2);
    ctx.arc(x + Math.cos(w.angle - 0.5) * 8, y + Math.sin(w.angle - 0.5) * 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Name tag.
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(w.name, x + 1, y - 17);
  ctx.fillStyle = '#fff';
  ctx.fillText(w.name, x, y - 18);
  // Suspicion arc + ? / ! bubble.
  if (w.suspicion > 0.03) {
    ctx.strokeStyle = stateColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + w.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  if (w.state === 'chase' || w.state === 'wary') {
    const bob = Math.sin(t * 6) * 2;
    ctx.fillStyle = w.state === 'chase' ? '#e5484d' : '#f5a524';
    ctx.beginPath();
    ctx.arc(x + 12, y - 16 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(w.state === 'chase' ? '!' : '?', x + 12, y - 12 + bob);
  }
}

function drawCamera(ctx, cam, t) {
  const x = FIELD.x + cam.x, y = FIELD.y + cam.y;
  drawCone(ctx, x, y, cam.angle, 5.6, 0.5, 'rgba(229,72,77,A)', cam.spotted > 0 ? 0.4 : 0.16);
  ctx.fillStyle = '#20242e';
  ctx.fillRect(x - 9, y - 9, 18, 18);
  ctx.fillStyle = cam.spotted > 0.5 ? '#e5484d' : '#c9a227';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAM', x, y - 13);
}

function drawPlayer(ctx, p, t) {
  const x = FIELD.x + p.x, y = FIELD.y + p.y;
  // Noise ring while running loud.
  if (p.noiseRing > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${p.noiseRing})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, (1 - p.noiseRing) * 46 + 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow under the thief.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const crouch = p.crouching ? 0.78 : 1;
  // Cloak.
  ctx.fillStyle = '#7a2e3d';
  ctx.beginPath();
  ctx.moveTo(x, y - 13 * crouch);
  ctx.quadraticCurveTo(x - 11, y + 8, x - 8, y + 11);
  ctx.lineTo(x + 8, y + 11);
  ctx.quadraticCurveTo(x + 11, y + 8, x, y - 13 * crouch);
  ctx.fill();
  ctx.fillStyle = '#f5b942';
  ctx.fillRect(x - 8, y + 8, 16, 2);
  // Hooded head.
  ctx.fillStyle = '#3a1f2b';
  ctx.beginPath();
  ctx.arc(x, y - 8 * crouch, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(x, y - 7 * crouch, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.hiddenInBush) {
    ctx.fillStyle = 'rgba(46,125,79,0.9)';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', x, y - 24);
  }
  if (p.inSmoke) {
    ctx.fillStyle = 'rgba(200,200,210,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloats(ctx, floats) {
  ctx.textAlign = 'center';
  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(f.text, FIELD.x + f.x + 1, FIELD.y + f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, FIELD.x + f.x, FIELD.y + f.y);
  }
  ctx.globalAlpha = 1;
}

function drawCoins(ctx, coins) {
  for (const c of coins) {
    const x = FIELD.x + c.x, y = FIELD.y + c.y;
    const pulse = 0.5 + 0.5 * Math.sin(c.t * 8);
    ctx.fillStyle = `rgba(245,185,66,${0.25 + 0.35 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a1e';
    ctx.font = '700 7px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¢', x, y + 2.5);
  }
}

function drawSmokes(ctx, smokes) {
  for (const s of smokes) {
    const x = FIELD.x + s.x, y = FIELD.y + s.y;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + s.t;
      const r = 14 + ((i * 7) % 16);
      ctx.fillStyle = `rgba(205,205,215,${0.35 * s.life})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, 10 + (i % 3) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --------------------------------------------------------------- HUD

function hudText(ctx, x, y, label, value, color = '#efe6d8') {
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#b9a98f';
  ctx.fillText(label, x, y);
  ctx.fillStyle = color;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(value, x, y + 15);
}

function drawTopBar(ctx, s) {
  ctx.fillStyle = '#171021';
  ctx.fillRect(0, 0, CANVAS_W, 40);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('SHADOWS OF PASAR SENJA', 12, 26);
  ctx.font = '700 12px system-ui, sans-serif';
  const items = [
    ['LOOT', `$${s.loot} / $${s.lootTotal}`, '#f5b942'],
    ['TIME', s.timeStr, '#efe6d8'],
    ['HEAT', s.heat, s.heatColor],
    ['SCORE', String(s.score), '#efe6d8'],
    ['BEST', String(s.best), '#b9a98f'],
    ['STRIKES', '✕'.repeat(s.strikes) + '○'.repeat(3 - s.strikes), '#e5484d'],
    ['GHOST', s.ghost ? '+500 if unseen' : 'LOST', s.ghost ? '#3fae7a' : '#e5484d'],
  ];
  let x = 292;
  for (const [label, value, color] of items) {
    ctx.fillStyle = '#b9a98f';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.fillText(label, x, 15);
    ctx.fillStyle = color;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(value, x, 31);
    x += label === 'STRIKES' ? 92 : label === 'GHOST' ? 112 : 88;
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b9a98f';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText(`LV ${s.levelId}/3 · ${s.levelName}`, CANVAS_W - 12, 25);
}

function drawLeftPanel(ctx, s) {
  const x = 8, w = 188;
  panel(ctx, x, 48, w, 150, 'OBJECTIVES');
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  s.objectives.forEach((o, i) => {
    const y = 90 + i * 22;
    ctx.fillStyle = o.done ? '#3fae7a' : '#efe6d8';
    ctx.fillText(o.done ? '☑' : '☐', x + 10, y);
    ctx.fillStyle = o.done ? '#7fd4a8' : '#efe6d8';
    ctx.fillText(o.text, x + 28, y);
  });
  panel(ctx, x, 206, w, 92, 'GADGETS');
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#efe6d8';
  ctx.fillText(`◉ Coins  × ${s.coins}   (E / click)`, x + 10, 246);
  ctx.fillText(`☁ Smoke  × ${s.smoke}   (F)`, x + 10, 268);
  ctx.fillStyle = '#b9a98f';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('SHIFT crouch — hide in bushes', x + 10, 290);
  panel(ctx, x, 306, w, 80, 'HEIST PROGRESS');
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#efe6d8';
  ctx.fillText(`Heist ${s.levelId} of 3 — ${s.levelName}`, x + 10, 346);
  bar(ctx, x + 10, 356, w - 20, 10, s.lootFrac, '#f5b942');
  ctx.fillStyle = '#b9a98f';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`${s.lootCount} / 3 lanterns stolen`, x + 10, 380);
  panel(ctx, x, 394, w, 144, 'EVENT LOG');
  ctx.font = '11px system-ui, sans-serif';
  s.log.slice(-6).forEach((line, i) => {
    ctx.fillStyle = i === s.log.slice(-6).length - 1 ? '#ffe9a8' : '#b9a98f';
    ctx.fillText(line.slice(0, 24), x + 10, 432 + i * 18);
  });
  panel(ctx, x, 546, w, 206, 'HOW TO PLAY');
  ctx.font = '11px system-ui, sans-serif';
  HOW_TO.forEach(([key, desc], i) => {
    const y = 588 + i * 28;
    ctx.fillStyle = '#f5b942';
    ctx.fillText(key, x + 10, y);
    ctx.fillStyle = '#b9a98f';
    ctx.fillText(desc, x + 10, y + 13);
  });
}

function drawRightPanel(ctx, s) {
  const x = 1044, w = 228;
  panel(ctx, x, 48, w, 140, 'DETECTION');
  const det = s.detection;
  ctx.fillStyle = det.color;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(det.label, x + 10, 100);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#b9a98f';
  ctx.fillText(det.sub, x + 10, 118);
  bar(ctx, x + 10, 126, w - 20, 10, det.frac, det.color);
  ctx.fillStyle = '#efe6d8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`VISIBILITY  ${s.visibility}`, x + 10, 156);
  ctx.fillText(`NOISE  ${s.noise}`, x + 10, 174);
  panel(ctx, x, 196, w, 140, 'GUARDS');
  s.guardRows.forEach((g, i) => {
    const y = 236 + i * 19;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(x + 16, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#efe6d8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(g.name, x + 26, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = g.statusColor;
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(g.status, x + w - 10, y);
    ctx.textAlign = 'left';
  });
  if (s.cameraRows.length) {
    ctx.fillStyle = '#b9a98f';
    ctx.font = '11px system-ui, sans-serif';
    s.cameraRows.forEach((c, i) => ctx.fillText(c, x + 10, 236 + s.guardRows.length * 19 + i * 19));
  }
  panel(ctx, x, 344, w, 118, 'LEGEND');
  ctx.font = '11px system-ui, sans-serif';
  LEGEND.slice(0, 6).forEach(([color, sym, text], i) => {
    const y = 384 + i * 14;
    ctx.fillStyle = color;
    ctx.fillText(sym, x + 10, y);
    ctx.fillStyle = '#b9a98f';
    ctx.fillText(text, x + 26, y);
  });
  // Minimap.
  panel(ctx, x, 470, w, 150, 'MAP');
  const mw = w - 20, mh = 104;
  const sx = mw / s.mapCols, sy = mh / s.mapRows;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 10, 508, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#241a30';
  ctx.fillRect(x + 10, 508, mw, mh);
  for (let cy = 0; cy < s.mapRows; cy++) {
    for (let cx = 0; cx < s.mapCols; cx++) {
      const ch = s.map[cy][cx];
      if (ch === '#') { ctx.fillStyle = '#6b4f8a'; ctx.fillRect(x + 10 + cx * sx, 508 + cy * sy, sx + 0.5, sy + 0.5); }
      else if (ch === 'L' && !s.lootTaken[cy * s.mapCols + cx]) { ctx.fillStyle = '#f5b942'; ctx.fillRect(x + 10 + cx * sx, 508 + cy * sy, 3, 3); }
      else if (ch === 'E') { ctx.fillStyle = '#3fae7a'; ctx.fillRect(x + 10 + cx * sx, 508 + cy * sy, 4, 4); }
    }
  }
  for (const g of s.guardDots) {
    ctx.fillStyle = g.state === 'chase' ? '#e5484d' : '#f5d76e';
    ctx.beginPath();
    ctx.arc(x + 10 + g.x * sx / TILE, 508 + g.y * sy / TILE, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 10 + s.playerDot.x * sx / TILE, 508 + s.playerDot.y * sy / TILE, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  panel(ctx, x, 628, w, 124, 'CONTROLS');
  ctx.font = '11px system-ui, sans-serif';
  const controls = ['WASD move · SHIFT crouch', 'E / click — throw coin', 'F — smoke bomb', 'M — mute · P — pause', 'R — restart level'];
  controls.forEach((c, i) => {
    ctx.fillStyle = '#b9a98f';
    ctx.fillText(c, x + 10, 668 + i * 17);
  });
}

function drawBottomBar(ctx, s) {
  ctx.fillStyle = '#171021';
  ctx.fillRect(0, 756, CANVAS_W, 44);
  ctx.fillStyle = '#b9a98f';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(s.banner, 12, 776);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5b942';
  ctx.fillText('SHADOWS OF PASAR SENJA — an original stealth heist in an Indonesian night market', CANVAS_W - 12, 776);
}

// --------------------------------------------------------------- screens

function drawTitle(ctx, s, t) {
  ctx.fillStyle = '#241a30';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // String lights.
  for (let i = 0; i < 40; i++) {
    const x = (i * 37) % CANVAS_W;
    const y = 60 + Math.sin(i * 1.7) * 22 + (i % 3) * 46;
    const glow = 0.5 + 0.5 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(245,185,66,${0.35 + 0.4 * glow})`;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('A STEALTH HEIST IN AN INDONESIAN NIGHT MARKET', CANVAS_W / 2, 130);
  ctx.fillStyle = '#efe6d8';
  ctx.font = '700 64px Georgia, serif';
  ctx.fillText('SHADOWS OF', CANVAS_W / 2, 205);
  ctx.fillText('PASAR SENJA', CANVAS_W / 2, 275);
  ctx.fillStyle = '#b9a98f';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Steal the golden lanterns. Stay in the shadows. Vanish unseen.', CANVAS_W / 2, 315);
  // Three heist cards.
  const cards = [
    ['HEIST 1', 'Pasar Malam', 'Night Market', '3 guards · bushes · coins', '#c94f5e'],
    ['HEIST 2', 'Museum Pusaka', 'Heritage Museum', '4 guards · cameras · lasers', '#3f8f6b'],
    ['HEIST 3', 'Pelabuhan Senja', 'Dusk Harbour', '4 guards · 2 dogs · crates', '#5b6fb0'],
  ];
  cards.forEach(([tag, name, sub, detail, color], i) => {
    const x = 200 + i * 300;
    const y = 360;
    panel(ctx, x, y, 280, 190, tag);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 30, 280, 4);
    ctx.fillStyle = '#efe6d8';
    ctx.font = '700 24px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, x + 16, y + 76);
    ctx.fillStyle = '#b9a98f';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(sub, x + 16, y + 100);
    ctx.fillStyle = '#efe6d8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(detail, x + 16, y + 128);
    ctx.fillStyle = '#f5b942';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(i === 0 ? '▶  PRESS ENTER TO PLAY' : '🔒  COMPLETE HEIST ' + i, x + 16, y + 164);
  });
  // Feature strip: what the heist is made of.
  const feats = ['▲ Vision cones', '◉ Cameras & tripwires', '◆ Guard dogs', '✦ Ghost bonus +500'];
  ctx.font = '700 12px system-ui, sans-serif';
  const gap = 12, pad = 14, chipH = 30;
  const widths = feats.map((f) => ctx.measureText(f).width + pad * 2);
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (feats.length - 1);
  let cx0 = (CANVAS_W - totalW) / 2;
  const chipY = 560;
  feats.forEach((f, i) => {
    ctx.fillStyle = 'rgba(245,185,66,0.10)';
    ctx.strokeStyle = 'rgba(245,185,66,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx0, chipY, widths[i], chipH, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'left';
    ctx.fillText(f, cx0 + pad, chipY + 20);
    cx0 += widths[i] + gap;
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b9a98f';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move · SHIFT crouch · E throw coin · F smoke · Steal all 3 lanterns, then reach the green gate unseen.', CANVAS_W / 2, 600);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText('GHOST BONUS +500 — finish a heist without ever being spotted', CANVAS_W / 2, 632);
  ctx.fillStyle = '#b9a98f';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Best score: ' + s.best, CANVAS_W / 2, 664);
  if (Math.sin(t * 4) > -0.2) {
    ctx.fillStyle = '#efe6d8';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('— PRESS ENTER —', CANVAS_W / 2, 720);
  }
  // Hanging lantern garland along the bottom edge.
  ctx.strokeStyle = 'rgba(245,185,66,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 752);
  ctx.quadraticCurveTo(CANVAS_W / 2, 770, CANVAS_W - 40, 752);
  ctx.stroke();
  for (let i = 0; i < 13; i++) {
    const lx = 70 + i * 95;
    const sag = 752 + Math.sin((lx / CANVAS_W) * Math.PI) * 14;
    const drop = 8 + (i % 3) * 5;
    ctx.strokeStyle = 'rgba(245,185,66,0.5)';
    ctx.beginPath();
    ctx.moveTo(lx, sag);
    ctx.lineTo(lx, sag + drop);
    ctx.stroke();
    const glow = ctx.createRadialGradient(lx, sag + drop + 8, 1, lx, sag + drop + 8, 16);
    glow.addColorStop(0, 'rgba(245,185,66,0.55)');
    glow.addColorStop(1, 'rgba(245,185,66,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, sag + drop + 8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.roundRect(lx - 5, sag + drop + 2, 10, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(lx - 2, sag + drop + 5, 4, 6);
  }
}

function drawVictory(ctx, s) {
  ctx.fillStyle = 'rgba(20,14,28,0.88)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 56px Georgia, serif';
  ctx.fillText('HEIST COMPLETE!', CANVAS_W / 2, 150);
  ctx.fillStyle = '#efe6d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Raka slips into the night with the golden lanterns of Pasar Senja.', CANVAS_W / 2, 195);
  panel(ctx, 390, 240, 500, 300, 'SCORE BREAKDOWN');
  const rows = [
    ['Lanterns stolen', `9  ×  $200  =  $1,800`, s.lootTotal],
    ['Ghost bonus', s.ghost ? '+500  (never spotted)' : '+0  (you were seen)', s.ghost ? 500 : 0],
    ['Time bonus', `finished in ${s.timeStr}`, s.timeBonus],
    ['Strikes lost', `−${s.strikesLost * 150}`, -s.strikesLost * 150],
    ['TOTAL SCORE', '', s.score],
  ];
  rows.forEach(([label, note, val], i) => {
    const y = 292 + i * 44;
    const big = i === rows.length - 1;
    ctx.textAlign = 'left';
    ctx.fillStyle = big ? PALETTE.gold : '#efe6d8';
    ctx.font = big ? '700 18px system-ui, sans-serif' : '15px system-ui, sans-serif';
    ctx.fillText(label, 420, y);
    ctx.fillStyle = '#b9a98f';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(note, 420, y + 18);
    ctx.textAlign = 'right';
    ctx.fillStyle = big ? PALETTE.gold : '#efe6d8';
    ctx.font = big ? '700 22px system-ui, sans-serif' : '700 16px system-ui, sans-serif';
    ctx.fillText(big ? String(val) : (val >= 0 ? '+' + val : String(val)), 860, y);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#efe6d8';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText('ENTER — play again      ·      Best score: ' + s.best, CANVAS_W / 2, 600);
}

function drawCaught(ctx, s) {
  ctx.fillStyle = 'rgba(40,8,12,0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5484d';
  ctx.font = '700 56px Georgia, serif';
  ctx.fillText('CAUGHT!', CANVAS_W / 2, 300);
  ctx.fillStyle = '#efe6d8';
  ctx.font = '20px Georgia, serif';
  ctx.fillText(s.caughtBy + ' grabbed Raka by the cloak. The lanterns stay in the market…', CANVAS_W / 2, 345);
  ctx.fillStyle = '#b9a98f';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Strikes left: ' + (3 - s.strikes) + '   ·   Press ENTER to try the heist again', CANVAS_W / 2, 400);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20,14,28,0.75)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#efe6d8';
  ctx.font = '700 44px Georgia, serif';
  ctx.fillText('PAUSED', CANVAS_W / 2, 380);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#b9a98f';
  ctx.fillText('Press P to resume', CANVAS_W / 2, 420);
}

// --------------------------------------------------------------- main entry

export function render(ctx, s, t) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (s.screen === 'title') { drawTitle(ctx, s, t); return; }
  // World frame.
  ctx.fillStyle = '#171021';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx, s.level, t);
  drawLightPools(ctx, s.level);
  // Tripwires under everything moving.
  for (const w of s.level.tripwires) {
    const x1 = FIELD.x + w.x1 * TILE, y1 = FIELD.y + w.y1 * TILE;
    const x2 = FIELD.x + w.x2 * TILE, y2 = FIELD.y + w.y2 * TILE;
    ctx.strokeStyle = s.tripped ? 'rgba(229,72,77,0.9)' : 'rgba(229,72,77,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawProps(ctx, s.level, t);
  for (const cam of s.cameras) drawCamera(ctx, cam, t);
  for (const w of [...s.guards, ...s.dogs]) drawWatcher(ctx, w, t);
  drawCoins(ctx, s.coinsThrown);
  drawSmokes(ctx, s.smokes);
  drawPlayer(ctx, s.player, t);
  drawFloats(ctx, s.floats);
  // Frame border.
  ctx.strokeStyle = 'rgba(245,185,66,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD.x - 2, FIELD.y - 2, FIELD.w + 4, FIELD.h + 4);
  drawTopBar(ctx, s);
  drawLeftPanel(ctx, s);
  drawRightPanel(ctx, s);
  drawBottomBar(ctx, s);
  if (s.screen === 'victory') drawVictory(ctx, s);
  else if (s.screen === 'caught') drawCaught(ctx, s);
  else if (s.screen === 'paused') drawPaused(ctx);
}
