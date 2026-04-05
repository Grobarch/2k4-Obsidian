#!/usr/bin/env node
/**
 * strip-h1.mjs — usuwa pierwszy nagłówek H1 z notatek vault
 *
 * Quartz renderuje tytuł z frontmatter (ArticleTitle), więc H1 w treści
 * powoduje duplikat. Skrypt usuwa H1 i — jeśli różni się od title —
 * aktualizuje frontmatter title na wartość z H1.
 *
 * Użycie:
 *   node scripts/strip-h1.mjs [dir]           # dry-run (domyślnie vault)
 *   node scripts/strip-h1.mjs [dir] --apply   # zapisz zmiany
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dir = resolve(args.find(a => !a.startsWith("--")) || "vault");

const SKIP_DIRS = ["templates", ".obsidian"];

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

async function main() {
  const files = (await findMdFiles(dir))
    .filter(f => !SKIP_DIRS.some(d => f.includes(`/${d}/`) || f.includes(`\\${d}\\`)));

  let matchCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);

    if (!fm.title) {
      skipCount++;
      continue;
    }

    // Find end of frontmatter
    const fmMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---/);
    if (!fmMatch) {
      skipCount++;
      continue;
    }

    const afterFm = content.slice(fmMatch[0].length);

    // Find first H1 in content after frontmatter
    // Match: optional blank lines, then # Title, then optional blank line
    const h1Match = afterFm.match(/(\n\s*)*\n# (.+)\n(\n)?/);
    if (!h1Match) {
      skipCount++;
      continue;
    }

    // Verify this H1 appears before any H2+ heading
    const beforeH1 = afterFm.slice(0, h1Match.index);
    if (/^#{2,}\s/m.test(beforeH1)) {
      skipCount++;
      continue;
    }

    const h1Text = h1Match[2].trim();
    const fmTitleRaw = String(Array.isArray(fm.title) ? fm.title.join(", ") : fm.title);
    const fmTitle = stripQuotes(fmTitleRaw).trim();

    let newContent;

    if (h1Text === fmTitle) {
      // H1 matches title — just remove H1
      newContent = fmMatch[0] + afterFm.replace(h1Match[0], "\n\n");
      matchCount++;
      console.log(`[MATCH]  ${filePath}`);
    } else if (fmTitle.startsWith(h1Text)) {
      // H1 is a prefix of title (multi-line H1 case) — keep title, just remove H1
      newContent = fmMatch[0] + afterFm.replace(h1Match[0], "\n\n");
      matchCount++;
      console.log(`[MATCH]  ${filePath} (H1 prefix of title)`);
    } else {
      // H1 differs — update title in frontmatter, then remove H1
      const fmRaw = fmMatch[0];
      const escapedTitle = h1Text.includes('"') ? `'${h1Text}'` : `"${h1Text}"`;
      const updatedFm = fmRaw.replace(
        /^(title:\s*).*$/m,
        `$1${escapedTitle}`
      );
      newContent = updatedFm + afterFm.replace(h1Match[0], "\n\n");
      updateCount++;
      console.log(`[UPDATE] ${filePath}`);
      console.log(`         title: ${fmTitle} → ${h1Text}`);
    }

    if (apply) {
      await writeFile(filePath, newContent, "utf-8");
    }
  }

  console.log(`\n--- Podsumowanie ---`);
  console.log(`Plików:   ${files.length}`);
  console.log(`MATCH:    ${matchCount}`);
  console.log(`UPDATE:   ${updateCount}`);
  console.log(`SKIP:     ${skipCount}`);
  if (!apply) {
    console.log(`\nDry-run — użyj --apply aby zapisać zmiany.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
