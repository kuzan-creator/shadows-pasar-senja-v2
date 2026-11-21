# Shadows of Pasar Senja — Stealth Heist

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kuzan-creator/shadows-pasar-senja-v2/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kuzan-creator/shadows-pasar-senja-v2/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An original top-down stealth game set in an Indonesian night market, built for the
[make.fun](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty
"Make the best stealth game". You are Raka, a thief slipping through the dusk:
steal the three golden lanterns of each heist, stay out of the guards' vision
cones, hide in the bushes, and reach the green gate unseen.

## How to play

- **WASD / Arrows** — move
- **SHIFT** — crouch (slow, hard to see; hidden in bushes)
- **E or click** — throw a coin to lure a guard away
- **F** — smoke bomb to break line of sight
- **M** — mute, **P** — pause, **R** — restart the heist

## The three heists

1. **Pasar Malam** (Night Market) — 3 guards, bushes, coin lures
2. **Museum Pusaka** (Heritage Museum) — 4 guards, sweeping cameras, tripwire lasers
3. **Pelabuhan Senja** (Dusk Harbour) — 4 guards, 2 guard dogs, crates and water

Guards patrol routes you can learn, grow suspicious (`?`) when they glimpse you,
and give chase (`!`) when they are sure — but you can break line of sight and
recover. Finish a heist without ever being spotted for the **+500 Ghost bonus**.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

or open `game/index.html` from any static server. No network requests, no build
step — plain files, WebAudio sounds synthesized in code.

## Layout

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with `buildDossier`
- `game/index.html` — the page
- `game/src/config.js` — levels, palette, tuning
- `game/src/guards.js` — guard, dog and camera AI
- `game/src/render.js` — canvas world and HUD
- `game/src/game.js` — loop, state machine, stealth mechanics, self-test
- `game/src/shots.js` — staged scenes for the screenshots
- `game/src/audio.js` — synthesized sounds
- `game/src/input.js` — keyboard and mouse
- `screenshots/` — real renders of the game's own code
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
