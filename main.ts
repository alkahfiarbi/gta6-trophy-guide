// Leonida Platinum Guide v2 — hand-in program for gta6-trophy-guide-01.
// Node 22, standard library only. The guide itself is plain static files in app/
// (index.html, style.css, app.js, app/data/trophies.json): no build step, no
// libraries, nothing fetched over the network. This program copies app/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there with the vendored make.fun library, exactly as the kit asks.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The run is deterministic: same files in, same bytes out, so two runs agree.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps from the kit (reference/gate.json): the text cap shapes
// the dossier bytes, and the rest refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB, app/ over 993 files and directories,
// or app/ over 48 MiB in all. v2's app is 4 files and about 90 KiB, well inside.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
