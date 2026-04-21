#!/usr/bin/env node
/**
 * sync-systems.mjs — generuje vault/Templates/systems-data.json
 *
 * Czyta SYSTEM_NAMES ze schema.mjs (source of truth dla systemy IDs i pełnych nazw)
 * oraz odczytuje foldery kampanii z vault/Systemy/ żeby wypełnić listę kampanii.
 *
 * Uruchom po dodaniu nowego systemu lub kampanii do vault:
 *   node scripts/sync-systems.mjs [--apply]
 */

import { readdir, stat, writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SYSTEM_NAMES } from "./schema.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const VAULT_SYSTEMY = join(ROOT, "vault", "Systemy");
const OUTPUT = join(ROOT, "vault", "templates", "systems-data.json");

const APPLY = process.argv.includes("--apply");

// Slugify: lowercase + replace Polish chars + spaces → hyphens
function slugify(str) {
  return str.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Build mapping: system folder name → system id (from SYSTEM_NAMES)
// Match by slug of folder name
const systemFolderToId = {};
for (const [id] of Object.entries(SYSTEM_NAMES)) {
  // find matching folder
  const folders = await readdir(VAULT_SYSTEMY);
  for (const folder of folders) {
    if (slugify(folder) === id) {
      systemFolderToId[folder] = id;
      break;
    }
  }
}

// Build systems list
const systems = [];
for (const [id, pelna] of Object.entries(SYSTEM_NAMES)) {
  // short display name: strip edition suffix if possible
  const name = pelna
    .replace(/:\s*.+/, "")       // remove subtitle after colon
    .replace(/\s+\d+ed$/, "")    // remove trailing "Xed"
    .trim() || pelna;
  systems.push({ id, name: name || pelna, pelna });
}

// Build campaigns per system by scanning vault/Systemy/<System>/<Campaign>/
const campaigns = {};
for (const [folderName, systemId] of Object.entries(systemFolderToId)) {
  const systemPath = join(VAULT_SYSTEMY, folderName);
  let entries;
  try { entries = await readdir(systemPath); } catch { continue; }

  const kampanie = [];
  for (const entry of entries) {
    if (entry.endsWith(".md")) continue; // skip the system folder note
    const entryPath = join(systemPath, entry);
    try {
      const s = await stat(entryPath);
      if (!s.isDirectory()) continue;
    } catch { continue; }

    // Only include folders that have a proper folder note (entry/entry.md)
    const folderNote = join(entryPath, entry + ".md");
    try { await stat(folderNote); } catch { continue; }

    const campaignSlug = slugify(entry);
    const link = `/systemy/${systemId}/${campaignSlug}`;
    kampanie.push({ id: campaignSlug, name: entry, link });
  }
  campaigns[systemId] = kampanie;
}

// Fill empty campaigns for systems without vault folders
for (const id of Object.keys(SYSTEM_NAMES)) {
  if (!campaigns[id]) campaigns[id] = [];
}

const output = { systems, campaigns };
const json = JSON.stringify(output, null, 2) + "\n";

// Compare to existing
let existing = "";
try { existing = await readFile(OUTPUT, "utf-8"); } catch {}

if (existing.trim() === json.trim()) {
  console.log("[sync-systems] Już aktualny — brak zmian.");
  process.exit(0);
}

if (!APPLY) {
  console.log("[sync-systems] Dry-run. Dodaj --apply żeby zapisać.");
  console.log("Systemy:", systems.map(s => s.id).join(", "));
  for (const [id, k] of Object.entries(campaigns)) {
    if (k.length) console.log(`  ${id}: ${k.map(c => c.id).join(", ")}`);
  }
  process.exit(0);
}

await writeFile(OUTPUT, json, "utf-8");
console.log("[sync-systems] Zapisano:", OUTPUT);
