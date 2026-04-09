#!/usr/bin/env node
/**
 * migrate-scenarios.mjs
 *
 * Przenosi scenariusze z vault/Scenariusze/[System]/ do vault/Systemy/[System]/Scenariusze/
 * Tworzy folder note Scenariusze.md w każdym nowym podfolderze.
 * Usuwa vault/Scenariusze/ po migracji.
 *
 * Użycie:
 *   node scripts/migrate-scenarios.mjs [katalog] [--apply]
 *
 * Domyślnie: dry-run (pokazuje zmiany bez zapisu).
 */

import { readFile, writeFile, mkdir, rename, rm, readdir } from "node:fs/promises";
import { join, relative, dirname, basename, resolve } from "node:path";
import { parseFrontmatter, findMdFiles } from "./shared.mjs";

const targetDir = resolve(process.argv[2] || "vault");
const apply = process.argv.includes("--apply");

const scenarDir = join(targetDir, "Scenariusze");
const systemsDir = join(targetDir, "Systemy");

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Rekurencyjnie zwraca WSZYSTKIE pliki (nie tylko .md) */
async function findAllFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findAllFiles(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Dopasowanie systemu
// ---------------------------------------------------------------------------

/** Czy scenario slug pasuje do system slug (logika zgodna z restore-bases.mjs) */
function matchesSystem(scenarioSlug, systemSlug) {
  return (
    scenarioSlug === systemSlug ||
    scenarioSlug.startsWith(systemSlug + "-") ||
    scenarioSlug.endsWith("-" + systemSlug) ||
    scenarioSlug === systemSlug + "1ed"
  );
}

/** Buduje mapę: systemSlug → absolutna ścieżka folderu systemu */
async function buildSystemMap() {
  const map = {}; // systemSlug → folderPath
  const sysFiles = await findMdFiles(systemsDir);
  for (const f of sysFiles) {
    const txt = await readFile(f, "utf-8");
    const fm = parseFrontmatter(txt);
    if (fm.type === "system" && fm.system) {
      map[fm.system] = dirname(f);
    }
  }
  return map;
}

/** Dla danego scenario slug, znajdź pasujący system w Systemy/ */
function findSystemFolder(scenarioSlug, systemMap) {
  for (const [systemSlug, folderPath] of Object.entries(systemMap)) {
    if (matchesSystem(scenarioSlug, systemSlug)) {
      return { systemSlug, folderPath };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generator folder note
// ---------------------------------------------------------------------------

function makeScenarioFolderNote(systemFolderRel) {
  const inFolder = `${systemFolderRel}/Scenariusze`;
  return `---
title: Scenariusze
draft: "true"
---

## Scenariusze


\`\`\`base
filters:
  and:
    - type == "scenariusz"
views:
  - type: list
    name: Scenariusze
    filters:
      and:
        - file.inFolder("${inFolder}")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
\`\`\`
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[migrate-scenarios] Katalog: ${targetDir}`);
  console.log(`[migrate-scenarios] Tryb: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log();

  // 1. Buduj mapę systemów
  const systemMap = await buildSystemMap();
  console.log(`[migrate-scenarios] Znaleziono ${Object.keys(systemMap).length} systemów w Systemy/:`);
  for (const [slug, path] of Object.entries(systemMap)) {
    console.log(`  ${slug} → ${relative(targetDir, path).replace(/\\/g, "/")}`);
  }
  console.log();

  // 2. Skanuj podfoldery Scenariusze/
  let entries;
  try {
    entries = await readdir(scenarDir, { withFileTypes: true });
  } catch {
    console.error(`[migrate-scenarios] BŁĄD: Nie można otworzyć ${scenarDir}`);
    process.exit(1);
  }

  const systemFolders = entries.filter(e => e.isDirectory());
  console.log(`[migrate-scenarios] Znaleziono ${systemFolders.length} folderów systemów w Scenariusze/`);
  console.log();

  // Zaplanowane operacje: { kind, src?, dst?, path?, content?, dir? }
  const ops = [];
  // Śledzenie folderów docelowych żeby nie duplikować folder note
  const createdFolderNotes = new Set();

  for (const entry of systemFolders) {
    const srcSystemDir = join(scenarDir, entry.name);

    // Odczytaj scenario slugi z plików scenariuszy w tym folderze
    const mdFiles = await findMdFiles(srcSystemDir);
    const scenarioSlugs = new Set();
    for (const f of mdFiles) {
      const txt = await readFile(f, "utf-8");
      const fm = parseFrontmatter(txt);
      if (fm.type === "scenariusz" && fm.system) {
        scenarioSlugs.add(fm.system);
      }
    }

    if (scenarioSlugs.size === 0) {
      console.log(`  [SKIP] ${entry.name} — brak plików z type:scenariusz`);
      continue;
    }

    // Znajdź folder docelowy systemu (po slugach ze scenariuszy)
    const targetMatches = new Map(); // folderPath → rel
    for (const slug of scenarioSlugs) {
      const match = findSystemFolder(slug, systemMap);
      if (match) {
        const rel = relative(targetDir, match.folderPath).replace(/\\/g, "/");
        targetMatches.set(match.folderPath, rel);
      } else {
        console.log(`  [WARN] ${entry.name}: nie znaleziono systemu dla slug "${slug}"`);
      }
    }

    if (targetMatches.size === 0) {
      console.log(`  [SKIP] ${entry.name} — brak dopasowania systemu`);
      continue;
    }

    if (targetMatches.size > 1) {
      console.log(`  [WARN] ${entry.name} — wiele dopasowań: ${[...targetMatches.values()].join(", ")} — wybieram pierwsze`);
    }

    const [targetSysPath, targetSysRel] = [...targetMatches.entries()][0];
    const targetScenDir = join(targetSysPath, "Scenariusze");
    const targetScenDirRel = `${targetSysRel}/Scenariusze`;

    console.log(`  ${entry.name} → ${targetScenDirRel}`);

    // Zaplanuj przeniesienie wszystkich plików (md + obrazy), pomijając folder note systemu
    const allFiles = await findAllFiles(srcSystemDir);
    for (const srcFile of allFiles) {
      const fileName = basename(srcFile);
      // Pomiń stary folder note systemu (np. Deadlands.md w Deadlands/)
      if (basename(srcFile) === `${entry.name}.md`) {
        console.log(`    [SKIP folder note] ${entry.name}/${fileName}`);
        continue;
      }
      const dstFile = join(targetScenDir, fileName);
      ops.push({ kind: "move", src: srcFile, dst: dstFile });
      console.log(`    [MOVE] ${entry.name}/${fileName} → ${relative(targetDir, dstFile).replace(/\\/g, "/")}`);
    }

    // Zaplanuj utworzenie nowego folder note Scenariusze.md (raz na folder docelowy)
    const folderNotePath = join(targetScenDir, "Scenariusze.md");
    if (!createdFolderNotes.has(targetScenDir)) {
      createdFolderNotes.add(targetScenDir);
      const folderNoteContent = makeScenarioFolderNote(targetSysRel);
      ops.push({ kind: "folder-note", path: folderNotePath, content: folderNoteContent, dir: targetScenDir });
      console.log(`    [CREATE] ${relative(targetDir, folderNotePath).replace(/\\/g, "/")}`);
    } else {
      console.log(`    [SKIP folder note dup] ${relative(targetDir, folderNotePath).replace(/\\/g, "/")} — już zaplanowany`);
    }
  }

  console.log();
  console.log(`[migrate-scenarios] Planowane operacje: ${ops.length}`);

  if (!apply) {
    console.log(`[migrate-scenarios] DRY-RUN — użyj --apply aby wykonać migrację.`);
    return;
  }

  // Wykonaj operacje
  console.log();
  for (const op of ops) {
    if (op.kind === "move") {
      await mkdir(dirname(op.dst), { recursive: true });
      await rename(op.src, op.dst);
      console.log(`  ✓ MOVE ${relative(targetDir, op.src).replace(/\\/g, "/")} → ${relative(targetDir, op.dst).replace(/\\/g, "/")}`);
    } else if (op.kind === "folder-note") {
      await mkdir(op.dir, { recursive: true });
      await writeFile(op.path, op.content, "utf-8");
      console.log(`  ✓ CREATE ${relative(targetDir, op.path).replace(/\\/g, "/")}`);
    }
  }

  // Usuń stary folder Scenariusze/
  console.log();
  await rm(scenarDir, { recursive: true, force: true });
  console.log(`  ✓ DELETE ${relative(targetDir, scenarDir).replace(/\\/g, "/")} (cały folder)`);
  console.log();
  console.log(`[migrate-scenarios] Migracja zakończona. Wykonano ${ops.length} operacji.`);
}

main().catch(err => { console.error(err); process.exit(1); });
