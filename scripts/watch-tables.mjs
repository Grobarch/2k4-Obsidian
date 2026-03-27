#!/usr/bin/env node
/**
 * watch-tables.mjs
 *
 * Obserwuje vault/ i automatycznie uruchamia update-tables.mjs
 * gdy wykryje zmiany w plikach .md.
 *
 * Użycie:
 *   node scripts/watch-tables.mjs [vault-dir]
 *
 * Domyślnie: vault
 */

import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const vaultDir = resolve(process.argv[2] || "vault");
const updateScript = join(__dirname, "update-tables.mjs");

let debounceTimer = null;
let cooldownUntil = 0;

function scheduleUpdate() {
  if (Date.now() < cooldownUntil) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runUpdate, 600);
}

function runScript(dir) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [updateScript, dir], { stdio: "inherit" });
    proc.on("close", resolve);
  });
}

async function runUpdate() {
  // Ustaw cooldown przed uruchomieniem — blokuje triggery z zapisu folder notes
  cooldownUntil = Date.now() + 3000;

  const time = new Date().toLocaleTimeString("pl-PL");
  console.log(`\n[${time}] Aktualizuję tabelki...`);

  await runScript(join(vaultDir, "systemy"));
  await runScript(join(vaultDir, "scenariusze"));

  // Dodatkowy cooldown po zapisie
  cooldownUntil = Date.now() + 2000;
  console.log(`[watch] Gotowe. Czekam na zmiany w ${vaultDir}...`);
}

watch(vaultDir, { recursive: true }, (event, filename) => {
  if (!filename || !filename.endsWith(".md")) return;
  scheduleUpdate();
});

console.log(`[watch] Obserwuję ${vaultDir}`);
console.log(`[watch] Naciśnij Ctrl+C aby zatrzymać\n`);

// Pierwsze uruchomienie przy starcie
runUpdate();
