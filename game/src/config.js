// Shadows of Pasar Senja v2 — level data, palette and tuning.
// Every level is a 26 x 22 tile map. Tile legend:
//   # wall   . floor   , floor alt   S stall/case (blocks sight)   B bush (cover)
//   C crate (blocks sight)   ~ water (blocks movement)   = red carpet
//   L golden lantern (loot)   E exit gate   P player start
//   K camera   D guard dog   T tripwire   * hanging lamp (light pool)

export const TILE = 32;
export const COLS = 26;
export const ROWS = 22;

// Playfield rect inside the 1280x800 canvas (HUD panels sit on both sides).
export const FIELD = { x: 204, y: 44, w: 832, h: 704 };
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

export const PALETTE = {
  duskSky: '#2b1d3a',
  panel: '#1c1426',
  panelEdge: '#5b3a6e',
  gold: '#f5b942',
  goldDim: '#a97b2f',
  jade: '#3fae7a',
  danger: '#e5484d',
  warn: '#f5a524',
  calm: '#7fd4a8',
  ink: '#efe6d8',
  inkDim: '#b9a98f',
  bush: '#2e7d4f',
  bushDark: '#1f5c38',
  water: '#274b6d',
  carpet: '#7e2430',
  carpetGold: '#c9a227',
};

export const LOOT_VALUE = 200;
export const GHOST_BONUS = 500;
export const MAX_STRIKES = 3;
export const START_COINS = 5;
export const START_SMOKE = 2;

// Guard tuning (speed in tiles per second).
export const TUNE = {
  playerWalk: 4.6,
  playerCrouch: 2.4,
  guardPatrol: 1.7,
  guardChase: 3.4,
  dogPatrol: 2.2,
  dogChase: 4.4,
  coneRange: 5.2,
  coneHalfAngle: 0.62,
  dogSmell: 2.6,
  suspicionPerSec: 1.15,
  suspicionDecay: 0.55,
  chaseGiveUpSec: 4.0,
  cameraSweepSec: 5.0,
  coinLureRadius: 6.5,
};

export const LEVELS = [
  {
    id: 1,
    name: 'Pasar Malam',
    sub: 'Night Market — steal the three golden lanterns',
    hint: 'Bushes hide you. Coins lure guards away. Reach the green gate unseen.',
    map: [
      '##########################',
      '#P....B.....SS....B......#',
      '#..SS....C.....B....SS...#',
      '#.....................SS.#',
      '#..B....SS....C....B.*...#',
      '#....C......L......SSSS..#',
      '#..SS...........B....C...#',
      '#.......B....SS..........#',
      '#..C......B......C....BC.#',
      '#....SS.......B....SS....#',
      '#...........C.....L..S.C.#',
      '#..B....SS........B..CS..#',
      '#.....*C....B....SS......#',
      '#..SS........C......B....#',
      '#....B....SS.....C....L..#',
      '#.........B....SS........#',
      '#..C....B.......C*...B.C.#',
      '#....SS....C......SS.....#',
      '#..B..........B.......C..#',
      '#.....C....SS....B....E..#',
      '#..SS......B....C........#',
      '##########################',
    ],
    guards: [
      { name: 'Pak Dedi', color: '#e8b04b', start: [6, 3], way: [[6, 3], [19, 3], [19, 8], [6, 8]], speed: 1.7, range: 5.2 },
      { name: 'Bu Ratna', color: '#e87a90', start: [20, 12], way: [[20, 12], [20, 18], [8, 18], [8, 12]], speed: 1.6, range: 5.0 },
      { name: 'Wulan', color: '#7fb3e8', start: [12, 15], way: [[12, 15], [12, 6], [4, 6], [4, 15]], speed: 1.8, range: 5.2 },
    ],
    dogs: [],
    cameras: [],
    tripwires: [],
    lamps: [[3, 2], [13, 5], [22, 9], [8, 14], [17, 18], [21, 4], [6, 12], [17, 16]],
  },
  {
    id: 2,
    name: 'Museum Pusaka',
    sub: 'Heritage Museum — the relic lanterns glow on red carpet',
    hint: 'Cameras sweep the hall. Tripwires guard the relics. Stay out of the red light.',
    map: [
      '##########################',
      '#P....=====.....K........#',
      '#..===.....===.....===...#',
      '#..===..S..===..S..===...#',
      '#..===.....===.....===...#',
      '#....===...===..T..===...#',
      '#..S..===.....===.....S..#',
      '#....===..L..===..===....#',
      '#..===.....===.....===...#',
      '#..===..S..===..S..===...#',
      '#....===.....===.....=...#',
      '#..===..T..===...===.....#',
      '#..===.....===..S..===...#',
      '#....===..===.....===....#',
      '#..S..===.....L..===..S..#',
      '#....===..===.....===....#',
      '#..===.....===..S..===...#',
      '#..===..S..===.....===...#',
      '#....===.....===..L..=...#',
      '#..===.....===.....===...#',
      '#....K.....===.....=...E.#',
      '##########################',
    ],
    guards: [
      { name: 'Bimo', color: '#e8b04b', start: [5, 4], way: [[5, 4], [20, 4], [20, 9], [5, 9]], speed: 1.7, range: 5.4 },
      { name: 'Sari', color: '#e87a90', start: [21, 13], way: [[21, 13], [21, 19], [9, 19], [9, 13]], speed: 1.6, range: 5.2 },
      { name: 'Joko', color: '#7fb3e8', start: [12, 16], way: [[12, 16], [12, 7], [4, 7], [4, 16]], speed: 1.8, range: 5.4 },
      { name: 'Dewi', color: '#9be07a', start: [16, 11], way: [[16, 11], [22, 11], [22, 17], [16, 17]], speed: 1.7, range: 5.0 },
    ],
    dogs: [],
    cameras: [
      { x: 21, y: 1, base: Math.PI / 2, sweep: 1.1 },
      { x: 4, y: 20, base: -Math.PI / 2, sweep: 1.1 },
    ],
    tripwires: [
      { x1: 14, y1: 5, x2: 19, y2: 5 },
      { x1: 7, y1: 11, x2: 12, y2: 11 },
    ],
    lamps: [[6, 2], [18, 8], [10, 14], [20, 18]],
  },
  {
    id: 3,
    name: 'Pelabuhan Senja',
    sub: 'Dusk Harbour — crates, dogs and the last lanterns',
    hint: 'Dogs smell you up close. Crates block sight — and theirs. Mind the water.',
    map: [
      '##########################',
      '#P....B.....CC....B...~~~#',
      '#..CC....C.....B....CC..~#',
      '#......................~~#',
      '#..B....CC....C....B....~#',
      '#....C......L......CC...~#',
      '#..CC...........B....C..~#',
      '#.......B....CC........~~#',
      '#..C......B......C....B.~#',
      '#....CC.......B....CC...~#',
      '#...........C.....L.....~#',
      '#..B....CC........B..C..~#',
      '#......C....B....CC.....~#',
      '#..CC........C......B...~#',
      '#....B....CC.....C....L.~#',
      '#.........B....CC.......~#',
      '#..C....B.......C....B..~#',
      '#....CC....C......CC....~#',
      '#..B..........B.......C.~#',
      '#.....C....CC....B....E.~#',
      '#..CC......B....C.......~#',
      '##########################',
    ],
    guards: [
      { name: 'Agus', color: '#e8b04b', start: [6, 3], way: [[6, 3], [19, 3], [19, 8], [6, 8]], speed: 1.8, range: 5.4 },
      { name: 'Rini', color: '#e87a90', start: [20, 12], way: [[20, 12], [20, 18], [8, 18], [8, 12]], speed: 1.7, range: 5.2 },
      { name: 'Fajar', color: '#7fb3e8', start: [12, 15], way: [[12, 15], [12, 6], [4, 6], [4, 15]], speed: 1.9, range: 5.4 },
      { name: 'Lestari', color: '#9be07a', start: [16, 10], way: [[16, 10], [22, 10], [22, 16], [16, 16]], speed: 1.7, range: 5.0 },
    ],
    dogs: [
      { name: 'Kiko', start: [10, 9], way: [[10, 9], [17, 9], [17, 14], [10, 14]] },
      { name: 'Milo', start: [15, 18], way: [[15, 18], [8, 18], [8, 13], [15, 13]] },
    ],
    cameras: [],
    tripwires: [],
    lamps: [[3, 2], [13, 5], [21, 9], [8, 14], [17, 18]],
  },
];

// How-to-play lines shown on the title screen and in the HUD legend.
export const HOW_TO = [
  ['WASD / Arrows', 'Move'],
  ['SHIFT', 'Crouch — slow, hard to see'],
  ['E or Click', 'Throw a coin to lure a guard'],
  ['F', 'Smoke bomb — break line of sight'],
  ['Bushes', 'Hide — guards cannot see you'],
  ['Lanterns', 'Steal all 3, then reach the gate'],
];

export const LEGEND = [
  ['#f5b942', '●', 'You — Raka, the thief'],
  ['#e8b04b', '▲', 'Guard + vision cone'],
  ['#e5484d', '!', 'Spotted — break line of sight'],
  ['#f5a524', '?', 'Suspicious — guard is wary'],
  ['#3fae7a', '▣', 'Exit gate — opens with 3 lanterns'],
  ['#2e7d4f', '✿', 'Bush — hide here'],
  ['#f5b942', '✦', 'Golden lantern — loot $200'],
  ['#c9a227', '—', 'Camera / tripwire — avoid the beam'],
];
