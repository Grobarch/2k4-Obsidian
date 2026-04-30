#!/usr/bin/env node
/**
 * migrate-wystapienia.mjs
 *
 * Zapewnia, że każda notatka encyklopedyczna (BG, BN, lokacja, artefakt)
 * oraz scenariusz (Systemy/*\/Scenariusze/) ma sekcję "## Wystąpienia"
 * z blokiem Obsidian Bases i filtrem file.hasLink(this.file).
 *
 * - Jeśli sekcja istnieje z ręcznymi linkami → zamienia treść na blok base.
 * - Jeśli sekcji brak (typowe dla scenariuszy) → dopisuje sekcję na końcu.
 * - Idempotentne: ponowne uruchomienie nic nie zmienia.
 *
 * UWAGA: BASE_BLOCK musi pozostać synchronizowany z literałami w
 * vault/templates/Utwórz {Postać,Lokację,Artefakt,Scenariusz}.md.
 *
 * Użycie:
 *   node scripts/migrate-wystapienia.mjs              # podgląd (dry-run)
 *   node scripts/migrate-wystapienia.mjs --apply      # zastosuj zmiany
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";

const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith("--"));
const vaultDir = resolve(positionalArgs[0] || "vault");
const encDir = resolve(vaultDir, "Encyklopedia");
const systemyDir = resolve(vaultDir, "Systemy");
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

const TARGET_TYPES = new Set([
  "bohater-gracza",
  "bohater-niezalezny",
  "lokacja",
  "artefakt",
  "scenariusz",
]);

async function gatherTargets() {
  // Filtr po type w frontmatterze — odsiewa folder notes (type: index),
  // kampanie, epizody, system notes itd. Whitelista jest bezpieczniejsza
  // niż dopasowanie po ścieżce.
  const allFiles = [
    ...(await findMdFiles(encDir)),
    ...(await findMdFiles(systemyDir)),
  ];

  const targets = [];
  for (const fp of allFiles) {
    const content = await readFile(fp, "utf-8");
    const fm = parseFrontmatter(content);
    if (TARGET_TYPES.has(fm.type)) targets.push(fp);
  }
  return targets;
}

function rewriteFile(content) {
  // Szukaj istniejącej sekcji ## Wystąpienia.
  const match = content.match(/^## Wystąpienia\s*$/m);

  if (match) {
    const sectionStart = match.index;
    const afterHeading = content.slice(sectionStart + match[0].length);
    const sectionContent = afterHeading.split(/\n## /)[0];

    // Już ma blok base — nic do roboty.
    if (/```base/.test(sectionContent)) return { status: "skip-already" };

    // Pusta sekcja bez linków → wypełniamy blokiem.
    // Sekcja z linkami → zastępujemy blokiem.
    const restAfterHeading = content.slice(sectionStart + match[0].length);
    const nextHeading = restAfterHeading.match(/\n## /);
    const sectionEnd = nextHeading
      ? sectionStart + match[0].length + nextHeading.index
      : content.length;

    const before = content.slice(0, sectionStart);
    const after = sectionEnd < content.length ? content.slice(sectionEnd) : "";
    const newContent = before + "## Wystąpienia\n\n" + BASE_BLOCK + after;
    return { status: "rewrite", newContent };
  }

  // Brak sekcji ## Wystąpienia — dopisz na końcu pliku (typowe dla scenariuszy).
  const trimmed = content.replace(/\s+$/, "");
  const newContent = trimmed + "\n\n## Wystąpienia\n\n" + BASE_BLOCK;
  return { status: "append", newContent };
}

async function main() {
  console.log(`[migrate-wystapienia] Vault: ${vaultDir}`);
  console.log(`[migrate-wystapienia] Tryb: ${apply ? "APPLY" : "DRY-RUN"}`);

  const files = await gatherTargets();
  console.log(`[migrate-wystapienia] Plików do przeanalizowania: ${files.length}`);

  let migrated = 0;
  let appended = 0;
  let skipped = 0;

  for (const fp of files) {
    const content = await readFile(fp, "utf-8");
    const rel = relative(vaultDir, fp).replace(/\\/g, "/");
    const result = rewriteFile(content);

    if (result.status === "skip-already") {
      skipped++;
      continue;
    }

    if (result.newContent === content) continue;

    if (result.status === "append") {
      console.log(`  ${apply ? "+" : "→"} (append) ${rel}`);
      appended++;
    } else {
      console.log(`  ${apply ? "✓" : "→"} (rewrite) ${rel}`);
      migrated++;
    }

    if (apply) await writeFile(fp, result.newContent, "utf-8");
  }

  console.log(
    `\n[migrate-wystapienia] ${apply ? "Zmodyfikowano" : "Do zmodyfikowania"}: ` +
    `${migrated} przepisanych + ${appended} dopisanych = ${migrated + appended} (pominięto już-base: ${skipped})`
  );
  if (!apply) console.log("Uruchom z --apply aby zastosować zmiany.");
}

main().catch(err => { console.error(err); process.exit(1); });
