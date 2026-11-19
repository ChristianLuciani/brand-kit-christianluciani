#!/usr/bin/env node
/**
 * Gate del slug del repo — fuente única de verdad: package.json.
 *
 * Un renombrado del repo costaba find-replace en ~10 archivos. Acá lleva UNA
 * línea (`name` + `repository`) y los derivados la leen (REPO_URL del worker,
 * User-Agent del gate de assets, location esperado del test de redirect).
 * Este chequeo —offline, sin red— falla si el slug diverge del SSOT o si
 * alguien vuelve a hardcodear el host literal fuera de los hogares declarados.
 *
 *   node tools/repo/check.mjs    # offline, CI
 *
 * Cubre: coherencia name ≡ basename(repository.url) y host literal
 * (github.com/ChristianLuciani/<slug>) en el árbol de código fuera de
 * package.json.
 * No cubre: docs narrativos (README.md, SECURITY.md, docs/ y la traza
 * declarada con razón en tools/logo/composition.json —documentan URLs
 * canónicas por tag—) ni el lock (deriva vía npm).
 * Referencia: la PR del renombrado declaró la migración del slug.
 */
import { readFile, readdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/[\/]$/, '');
const OWNER = 'https://github.com/ChristianLuciani/';

const DERIVAN_DEL_SSOT = new Set([
  'package.json',
  'package-lock.json',
  'tools/logo/composition.json',
  'tools/repo/check.mjs',
  'cdn/src/worker.mjs',
  'cdn/test/worker.test.mjs',
  'tools/logo/verify-assets.mjs',
]);

const NARRATIVOS = new Set(['docs', 'assets', 'proposals', 'coverage', 'node_modules', '.git']);
const NARRATIVOS_ARCHIVO = new Set(['README.md', 'SECURITY.md']);

const failures = [];

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const repoUrl = String(pkg.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');

if (repoUrl === '') {
  failures.push('SSOT ausente: package.json no declara repository.url');
} else if (pkg.name !== basename(repoUrl)) {
  failures.push(
    `SSOT divergente: package.json name="${pkg.name}" ≠ basename(repository.url)="${basename(repoUrl)}" — renombrar es editar package.json, nada más.`,
  );
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (NARRATIVOS.has(entry.name)) continue;
      yield* walk(path);
    } else if (/\.(mjs|js|json|toml|yml|yaml|md)$/.test(extname(entry.name)) && !NARRATIVOS_ARCHIVO.has(entry.name)) {
      yield path;
    }
  }
}

for await (const path of walk(ROOT)) {
  const relative = path.slice(ROOT.length + 1);
  if (DERIVAN_DEL_SSOT.has(relative)) continue;
  const lines = (await readFile(path, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    if (line.includes(OWNER) && line.includes(basename(repoUrl))) {
      failures.push(`${relative}:${i + 1} hardcodea el host del brand kit fuera del SSOT (package.json)`);
    }
  });
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}

console.log(`✓ repo:check — SSOT coherente (${pkg.name} ≡ ${repoUrl}); árbol de código sin hardcodeo.`);
