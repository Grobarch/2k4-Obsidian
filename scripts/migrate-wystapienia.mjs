#!/usr/bin/env node
/**
 * migrate-wystapienia.mjs
 *
 * Zamienia ręczne linki w sekcji "## Wystąpienia" notatek Encyklopedii
 * na blok Obsidian Bases z filtrem file.hasLink(this.file).
 *
 * Użycie:
 *   node scripts/migrate-wystapienia.mjs              # podgląd (dry-run)
 *   node scripts/migrate-wystapienia.mjs --apply      # zastosuj zmiany
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { findMdFiles } from "./shared.mjs";

const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith("--"));
const vaultDir = resolve(positionalArgs[0] || "vault");
const encDir = resolve(vaultDir, "Encyklopedia");
const apply = process.argv.includes("--apply");

const BASE_BLOCK = `\`\`\`base
views:
  - type: table
    name: Wystąpienia
    filters:
      and:
        - file.hasLink(this.file)
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
\`\`\`
`;

async function main() {
  console.log(`[migrate-wystapienia] Katalog: ${encDir}`);
  console.log(`[migrate-wystapienia] Tryb: ${apply ? "APPLY" : "DRY-RUN"}`);

  const files = await findMdFiles(encDir);
  let migrated = 0;
  let skipped = 0;

  for (const fp of files) {
    const content = await readFile(fp, "utf-8");
    const rel = relative(vaultDir, fp).replace(/\\/g, "/");

    // Szukaj sekcji ## Wystąpienia
    const match = content.match(/^## Wystąpienia\s*$/m);
    if (!match) continue;

    const sectionStart = match.index;

    // Sprawdź czy sekcja już zawiera blok base (już zmigrowana)
    const afterHeading = content.slice(sectionStart + match[0].length);
    if (/```base/.test(afterHeading.split(/^## /m)[0])) {
      console.log(`  SKIP (już base): ${rel}`);
      skipped++;
      continue;
    }

    // Sprawdź czy sekcja zawiera linki do zamiany
    const sectionContent = afterHeading.split(/\n## /)[0];
    const hasLinks = /\[.*\]\(.*\)/.test(sectionContent);
    if (!hasLinks && sectionContent.trim() === "") {
      console.log(`  SKIP (pusta sekcja): ${rel}`);
      skipped++;
      continue;
    }

    // Znajdź koniec sekcji (następny ## heading lub koniec pliku)
    const restAfterHeading = content.slice(sectionStart + match[0].length);
    const nextHeading = restAfterHeading.match(/\n## /);
    const sectionEnd = nextHeading
      ? sectionStart + match[0].length + nextHeading.index
      : content.length;

    // Zbuduj nową treść
    const before = content.slice(0, sectionStart);
    const after = sectionEnd < content.length ? content.slice(sectionEnd) : "";
    const newContent = before + "## Wystąpienia\n\n" + BASE_BLOCK + after;

    if (newContent === content) continue;

    console.log(`  ${apply ? "✓" : "→"} ${rel}`);
    if (apply) {
      await writeFile(fp, newContent, "utf-8");
    }
    migrated++;
  }

  console.log(`\n[migrate-wystapienia] ${apply ? "Zmodyfikowano" : "Do zmodyfikowania"}: ${migrated} plików (pominięto: ${skipped})`);
  if (!apply) console.log("Uruchom z --apply aby zastosować zmiany.");
}

main().catch(err => { console.error(err); process.exit(1); });
