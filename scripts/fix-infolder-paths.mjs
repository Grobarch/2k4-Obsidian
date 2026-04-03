#!/usr/bin/env node
/**
 * fix-infolder-paths.mjs
 *
 * Naprawia ścieżki file.inFolder() w blokach base w vault.
 * Obsidian vault root = repo root (nie vault/), więc ścieżki
 * muszą zawierać prefix "vault/".
 *
 * Użycie:
 *   node scripts/fix-infolder-paths.mjs [--apply]
 *
 * Domyślnie: dry-run (pokazuje zmiany bez zapisywania)
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { findMdFiles } from "./shared.mjs";

const VAULT_DIR = join(import.meta.dirname, "..", "vault");
const apply = process.argv.includes("--apply");

async function main() {
  const files = await findMdFiles(VAULT_DIR);
  let totalFixed = 0;
  let filesModified = 0;

  for (const filePath of files) {
    let content = await readFile(filePath, "utf-8");
    const rel = relative(VAULT_DIR, filePath).replace(/\\/g, "/");
    let changed = false;

    // Match file.inFolder("...") patterns
    const re = /file\.inFolder\(["'](.+?)["']\)/g;
    const newContent = content.replace(re, (match, path) => {
      // Skip if already has vault/ prefix
      if (path.startsWith("vault/")) return match;

      // Skip template interpolations like ${systemFolder}
      if (path.includes("${")) return match;

      const newPath = `vault/${path}`;
      console.log(`  ${rel}: "${path}" → "${newPath}"`);
      totalFixed++;
      changed = true;
      return `file.inFolder("${newPath}")`;
    });

    if (changed) {
      filesModified++;
      if (apply) {
        await writeFile(filePath, newContent, "utf-8");
      }
    }
  }

  console.log(`\n${apply ? "APPLIED" : "DRY-RUN"}: ${totalFixed} paths fixed in ${filesModified} files`);
  if (!apply && totalFixed > 0) {
    console.log("Uruchom z --apply aby zapisać zmiany.");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
