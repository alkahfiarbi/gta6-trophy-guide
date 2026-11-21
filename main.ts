// Leonida Platinum Guide v3 — hand-in builder.
// Copies app/ and screenshots/ from beside this file into the output dir,
// then writes dossier.json with the kit's buildDossier. Node 22 stdlib only.
// The output dir is the grader's mount: never delete it, never empty it —
// only create it if missing and copy files into it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

mkdirSync(outDir, { recursive: true });

cpSync(join(here, "app"), join(outDir, "app"), { recursive: true });

const shotsDir = join(here, "screenshots");
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, "screenshots"), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outDir, "dossier.json"), dossier);
console.log("wrote " + join(outDir, "dossier.json"));
