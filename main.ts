// Shadows of Pasar Senja v2 — entrypoint: copies the game and its screenshots
// into the output directory and writes the dossier buildDossier produces.
// Runs on Node 22 with the standard library only; no install, no network.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function handIn(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const name of ['game', 'screenshots']) {
    cpSync(join(REPO_ROOT, name), join(OUT_DIR, name), { recursive: true });
  }
  const dossier = buildDossier(OUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  console.log(`wrote ${OUT_DIR}/dossier.json (${dossier.length} bytes)`);
}

handIn();
