#!/usr/bin/env node
/**
 * add-timeline-base.mjs — Idempotentnie wstawia blok "Oś czasu" w folder notes systemów
 *
 * Iteruje pliki `vault/Systemy/*\/[NazwaSystemu].md` o `type: system` i wstawia
 * sekcję `## Oś czasu` z blokiem ```base``` typu `list` z `groupBy` po miesiącu.
 *
 * Bloki pokazują wszystkie epizody danego systemu (z kampanii) chronologicznie,
 * pogrupowane po miesiącu. Filtr używa pola `system` z folder note.
 *
 * Idempotentne: jeśli plik już zawiera nagłówek `## Oś czasu` — pomija.
 *
 * Pozycja wstawienia: przed sekcją `## Wszystkie strony` (jeśli istnieje), inaczej
 * na końcu pliku.
 *
 * Użycie:
 *   node scripts/add-timeline-base.mjs                    # dry-run
 *   node scripts/add-timeline-base.mjs --apply            # zapis
 *   node scripts/add-timeline-base.mjs --file <path>      # pojedynczy plik
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";

function buildBlock(systemId) {
  return `## Oś czasu

\`\`\`base
filters:
  and:
    - type == "epizod"
    - system == "${systemId}"
views:
  - type: list
    name: Oś czasu
    groupBy:
      property: data
      format: month
    order:
      - file.name
      - data
      - kampania
    sort:
      - property: data
        direction: ASC
\`\`\`
`;
}

function insertBlock(content, block) {
  const marker = "## Wszystkie strony";
  const idx = content.indexOf(marker);
  if (idx >= 0) {
    return content.slice(0, idx) + block + "\n" + content.slice(idx);
  }
  return content.trimEnd() + "\n\n" + block;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { dir: "vault", file: null, apply: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dir" && i + 1 < args.length) opts.dir = args[++i];
    else if (a === "--file" && i + 1 < args.length) opts.file = args[++i];
    else if (a === "--apply") opts.apply = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`Nieznany argument: ${a}`); process.exit(1); }
  }
  return opts;
}

function printHelp() {
  console.error(`Użycie: node scripts/add-timeline-base.mjs [opcje]

Opcje:
  --dir <path>    Root vault (domyślnie: vault)
  --file <path>   Pojedynczy folder note systemu
  --apply         Zapisz zmiany (bez tego: dry-run)
  --help, -h      Pokaż pomoc`);
}

async function processFile(filePath, relPath) {
  const content = await readFile(filePath, "utf-8");
  const fm = parseFrontmatter(content);
  if (fm.type !== "system") return { path: relPath, status: "skipped-not-system" };
  if (!fm.system) return { path: relPath, status: "skipped-no-system-id" };

  if (/^##\s+Oś czasu\b/m.test(content)) {
    return { path: relPath, status: "already-has-block" };
  }

  const block = buildBlock(fm.system);
  const newContent = insertBlock(content, block);
  return { path: relPath, status: "would-insert", filePath, newContent, systemId: fm.system };
}

export async function main() {
  const opts = parseArgs(process.argv);
  const targetDir = resolve(opts.dir);

  let paths;
  if (opts.file) {
    paths = [resolve(opts.file)];
  } else {
    paths = await findMdFiles(targetDir);
  }

  const entries = [];
  for (const p of paths) {
    const rel = relative(targetDir, p).replace(/\\/g, "/");
    if (rel.toLowerCase().startsWith("templates/")) continue;
    const e = await processFile(p, rel);
    entries.push(e);
  }

  const toInsert = entries.filter(e => e.status === "would-insert");
  const already = entries.filter(e => e.status === "already-has-block");

  for (const e of toInsert) {
    console.log(`[+] ${e.path}  (system: ${e.systemId})`);
    if (opts.apply) {
      await writeFile(e.filePath, e.newContent, "utf-8");
      console.log(`    [zapisano]`);
    }
  }
  for (const e of already) {
    console.log(`[=] ${e.path}  — już ma "## Oś czasu"`);
  }

  console.log(`\nPodsumowanie:`);
  console.log(`  Folder notes systemów:      ${toInsert.length + already.length}`);
  console.log(`  Do wstawienia:              ${toInsert.length}${opts.apply ? ` (zapisano)` : ""}`);
  console.log(`  Już mają blok:              ${already.length}`);
  if (!opts.apply && toInsert.length > 0) {
    console.log(`\nTo był dry-run. Dodaj --apply aby zapisać.`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/add-timeline-base.mjs")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
