#!/usr/bin/env node
/**
 * migrate-to-bases.mjs
 *
 * Zamienia wszystkie markery <!-- TYPE_START/END --> w vault na
 * inline Obsidian Base code blocks (```base ... ```).
 *
 * Skrypt generycznie skanuje pliki, wykrywa pary markerów i podmienia
 * je odpowiednimi blokami base na podstawie typu markera i kontekstu pliku
 * (ścieżka folderu, slug kampanii z frontmatter/folderu).
 *
 * Użycie:
 *   node scripts/migrate-to-bases.mjs [dir]            # dry-run (domyślne)
 *   node scripts/migrate-to-bases.mjs [dir] --apply     # zapisz zmiany
 *
 * Domyślnie: vault
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";
import { findMdFiles, parseFrontmatter, slugify } from "./shared.mjs";
import { resolve } from "node:path";

const targetDir = resolve(process.argv[2] || "vault");
const apply = process.argv.includes("--apply");

// ---------------------------------------------------------------------------
// Definicje markerów
// ---------------------------------------------------------------------------

const MARKER_PAIRS = [
  { type: "episodes",   start: "<!-- EPISODES_START -->",   end: "<!-- EPISODES_END -->" },
  { type: "campaigns",  start: "<!-- CAMPAIGNS_START -->",  end: "<!-- CAMPAIGNS_END -->" },
  { type: "players",    start: "<!-- PLAYERS_START -->",    end: "<!-- PLAYERS_END -->" },
  { type: "npcs",       start: "<!-- NPCS_START -->",       end: "<!-- NPCS_END -->" },
  { type: "locations",  start: "<!-- LOCATIONS_START -->",  end: "<!-- LOCATIONS_END -->" },
  { type: "artifacts",  start: "<!-- ARTIFACTS_START -->",  end: "<!-- ARTIFACTS_END -->" },
  { type: "scenarios",  start: "<!-- SCENARIOS_START -->",  end: "<!-- SCENARIOS_END -->" },
  { type: "systems",    start: "<!-- SYSTEMS_START -->",    end: "<!-- SYSTEMS_END -->" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ścieżka folderu pliku względem vault root (z forward slashes). */
function relFolder(filePath, vaultRoot) {
  return relative(vaultRoot, dirname(filePath)).replace(/\\/g, "/");
}

/**
 * Próbuje wyciągnąć slug kampanii — najpierw z frontmatter `kampania`,
 * potem z nazwy folderu pliku.
 */
function campaignSlug(filePath, fm) {
  if (fm.kampania) {
    const k = Array.isArray(fm.kampania) ? fm.kampania[0] : fm.kampania;
    return k;
  }
  // Folder name → slug  (np. "Cold Tales" → "cold-tales")
  const folder = dirname(filePath).replace(/\\/g, "/").split("/").pop();
  return slugify(folder);
}

// ---------------------------------------------------------------------------
// Generatory bloków base per typ markera
// ---------------------------------------------------------------------------

const GENERATORS = {
  episodes(folder) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "epizod"',
      "views:",
      "  - type: table",
      "    name: Epizody",
      "    filters:",
      "      and:",
      `        - file.inFolder("${folder}")`,
      "    order:",
      "      - title",
      "      - data",
      "    sort:",
      "      - property: data",
      "        direction: ASC",
    );
  },

  campaigns(folder) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "kampania"',
      "views:",
      "  - type: table",
      "    name: Kampanie",
      "    filters:",
      "      and:",
      `        - file.inFolder("${folder}")`,
      "    order:",
      "      - title",
      "      - mg",
      "    sort:",
      "      - property: title",
      "        direction: ASC",
    );
  },

  players(_folder, slug) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "bohater-gracza"',
      `    - kampania == ["${slug}"]`,
      "views:",
      "  - type: table",
      "    name: Bohaterowie Graczy",
      "    order:",
      "      - title",
      "      - gracz",
      "      - archetyp",
      "    sort:",
      "      - property: title",
      "        direction: ASC",
    );
  },

  npcs(_folder, slug) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "bohater-niezalezny"',
      `    - kampania == ["${slug}"]`,
      "views:",
      "  - type: table",
      "    name: Bohaterowie Niezależni",
      "    order:",
      "      - title",
      "    sort:",
      "      - property: title",
      "        direction: ASC",
    );
  },

  locations(_folder, slug) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "lokacja"',
      `    - kampania == ["${slug}"]`,
      "views:",
      "  - type: table",
      "    name: Lokacje",
      "    order:",
      "      - title",
      "    sort:",
      "      - property: title",
      "        direction: ASC",
    );
  },

  artifacts(_folder, slug) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "artefakt"',
      `    - kampania == ["${slug}"]`,
      "views:",
      "  - type: table",
      "    name: Artefakty",
      "    order:",
      "      - title",
      "    sort:",
      "      - property: title",
      "        direction: ASC",
    );
  },

  scenarios(folder) {
    return lines(
      "filters:",
      "  and:",
      '    - type == "scenariusz"',
      "views:",
      "  - type: list",
      "    name: Scenariusze",
      "    filters:",
      "      and:",
      `        - file.inFolder("${folder}")`,
      "    order:",
      "      - title",
      "    sort:",
      "      - property: data",
      "        direction: ASC",
    );
  },

  systems() {
    return lines(
      "filters:",
      "  and:",
      '    - type == "system"',
      "views:",
      "  - type: table",
      "    name: Systemy",
      "    order:",
      "      - title",
      "      - gatunek",
      "    sort:",
      "      - property: title",
      "        direction: ASC",
    );
  },
};

/** Owija linie YAML w blok ```base ... ``` */
function lines(...rows) {
  return "```base\n" + rows.join("\n") + "\n```";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[migrate-to-bases] Katalog: ${targetDir}`);
  console.log(`[migrate-to-bases] Tryb: ${apply ? "APPLY" : "DRY-RUN (dodaj --apply)"}\n`);

  const allFiles = await findMdFiles(targetDir);
  let totalReplacements = 0;
  let modifiedFiles = 0;

  for (const filePath of allFiles) {
    const rel = relative(targetDir, filePath).replace(/\\/g, "/");

    // Pomiń szablony — mają markery w kodzie Templater
    if (/^templates\//i.test(rel)) continue;

    let content = await readFile(filePath, "utf-8");
    let changed = false;
    const fm = parseFrontmatter(content);
    const folder = relFolder(filePath, targetDir);
    const slug = campaignSlug(filePath, fm);

    for (const { type, start, end } of MARKER_PAIRS) {
      const startIdx = content.indexOf(start);
      const endIdx = content.indexOf(end);
      if (startIdx === -1 || endIdx === -1) continue;

      const gen = GENERATORS[type];
      if (!gen) continue;

      const baseBlock = gen(folder, slug);

      // Zamień: od START markera do END markera (włącznie)
      const before = content.substring(0, startIdx);
      const after = content.substring(endIdx + end.length);
      content = before + baseBlock + after;
      changed = true;
      totalReplacements++;

      console.log(`  ${rel}: ${start} → \`\`\`base (${type})`);
    }

    if (changed) {
      modifiedFiles++;
      if (apply) {
        await writeFile(filePath, content, "utf-8");
      }
    }
  }

  console.log(`\n[migrate-to-bases] Gotowe: ${totalReplacements} zamian w ${modifiedFiles} plikach`);
  if (!apply && totalReplacements > 0) {
    console.log(`[migrate-to-bases] Uruchom z --apply aby zapisać zmiany.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
