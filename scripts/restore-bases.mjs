#!/usr/bin/env node
/**
 * restore-bases.mjs
 *
 * Zastępuje statyczne tabele/listy markdown w folder notes blokami Obsidian Bases.
 * Bloki `base` są renderowane interaktywnie w Obsidian i konwertowane na statyczne
 * tabele/listy/karty przez build-bases.mjs w pipeline CI/lokalnym.
 *
 * Użycie:
 *   node scripts/restore-bases.mjs [katalog] [--apply]
 *
 * Domyślnie: dry-run (pokazuje zmiany bez zapisu).
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename, relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, slugify } from "./shared.mjs";

const targetDir = resolve(process.argv[2] || "vault");
const apply = process.argv.includes("--apply");

// Cache: system slug z system note → lista scenario system slugów
let scenarioSlugMap = null;

// ---------------------------------------------------------------------------
// Generatory bloków base
// ---------------------------------------------------------------------------

function baseBlock(yaml) {
  return "```base\n" + yaml + "```";
}

/** Kampanie w systemie (table) */
function baseCampaigns(systemFolderRel) {
  return baseBlock(
`filters:
  and:
    - type == "kampania"
views:
  - type: table
    name: Kampanie
    filters:
      and:
        - file.inFolder("${systemFolderRel}")
    order:
      - file.name
      - mg
    sort:
      - property: title
        direction: ASC
`);
}

/** Scenariusze samodzielne w systemie (table, filtrowane po system slug(s)) */
function baseScenarios(systemSlugs) {
  const slugs = Array.isArray(systemSlugs) ? systemSlugs : [systemSlugs];
  if (slugs.length === 1) {
    return baseBlock(
`filters:
  and:
    - type == "scenariusz"
views:
  - type: table
    name: Scenariusze
    filters:
      and:
        - system == "${slugs[0]}"
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
`);
  }
  // Wiele slugów — użyj tablicy wartości: system == ["slug1","slug2"]
  const arrayVal = `[${slugs.map(s => `"${s}"`).join(", ")}]`;
  return baseBlock(
`filters:
  and:
    - type == "scenariusz"
views:
  - type: table
    name: Scenariusze
    filters:
      and:
        - system == ${arrayVal}
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
`);
}

/** Spis epizodów kampanii (table) */
function baseEpisodes(campaignFolderRel) {
  return baseBlock(
`filters:
  and:
    - type == "epizod"
views:
  - type: table
    name: Epizody
    filters:
      and:
        - file.inFolder("${campaignFolderRel}")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
`);
}

/** Bohaterowie Graczy kampanii (table) */
function basePlayers(kampaniaSlug) {
  return baseBlock(
`filters:
  and:
    - type == "bohater-gracza"
views:
  - type: table
    name: Bohaterowie Graczy
    filters:
      and:
        - kampania == "${kampaniaSlug}"
    order:
      - file.name
      - gracz
      - archetyp
    sort:
      - property: title
        direction: ASC
`);
}

/** Bohaterowie Niezależni kampanii (table) */
function baseNpcs(kampaniaSlug) {
  return baseBlock(
`filters:
  and:
    - type == "bohater-niezalezny"
views:
  - type: table
    name: Bohaterowie Niezależni
    filters:
      and:
        - kampania == "${kampaniaSlug}"
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
`);
}

/** Lokacje kampanii (table) */
function baseLocations(kampaniaSlug) {
  return baseBlock(
`filters:
  and:
    - type == "lokacja"
views:
  - type: table
    name: Lokacje
    filters:
      and:
        - kampania == "${kampaniaSlug}"
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
`);
}

/** Artefakty kampanii (table) */
function baseArtifacts(kampaniaSlug) {
  return baseBlock(
`filters:
  and:
    - type == "artefakt"
views:
  - type: table
    name: Artefakty
    filters:
      and:
        - kampania == "${kampaniaSlug}"
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
`);
}

/** Spis systemów (table) */
function baseSystems() {
  return baseBlock(
`filters:
  and:
    - type == "system"
views:
  - type: table
    name: Systemy
    order:
      - file.name
      - gatunek
    sort:
      - property: title
        direction: ASC
`);
}

/** Scenariusze w folderze scenariuszy (list) */
function baseScenarioList(scenarioFolderRel) {
  return baseBlock(
`filters:
  and:
    - type == "scenariusz"
views:
  - type: list
    name: Scenariusze
    filters:
      and:
        - file.inFolder("${scenarioFolderRel}")
    order:
      - file.name
    sort:
      - property: data
        direction: ASC
`);
}

/** Encyklopedia — karty bohaterów graczy */
function baseEncyclopediaBG() {
  return baseBlock(
`filters:
  and:
    - type == "bohater-gracza"
views:
  - type: cards
    name: Bohaterowie Graczy
    order:
      - file.name
      - system_pelna
      - gracz
      - archetyp
    sort:
      - property: title
        direction: ASC
`);
}

/** Encyklopedia — karty bohaterów niezależnych */
function baseEncyclopediaBN() {
  return baseBlock(
`filters:
  and:
    - type == "bohater-niezalezny"
views:
  - type: cards
    name: Bohaterowie Niezależni
    order:
      - file.name
      - system_pelna
    sort:
      - property: title
        direction: ASC
`);
}

/** Encyklopedia — karty lokacji */
function baseEncyclopediaLocations() {
  return baseBlock(
`filters:
  and:
    - type == "lokacja"
views:
  - type: cards
    name: Lokacje
    order:
      - file.name
      - system_pelna
    sort:
      - property: title
        direction: ASC
`);
}

/** Encyklopedia — karty artefaktów */
function baseEncyclopediaArtifacts() {
  return baseBlock(
`filters:
  and:
    - type == "artefakt"
views:
  - type: cards
    name: Artefakty
    order:
      - file.name
      - system_pelna
    sort:
      - property: title
        direction: ASC
`);
}

// ---------------------------------------------------------------------------
// Parsowanie sekcji pliku
// ---------------------------------------------------------------------------

/**
 * Dzieli treść pliku (po frontmatter) na sekcje wg nagłówków ##.
 * Zwraca: [{ heading: string|null, content: string, headingLine: string }]
 * Pierwsza sekcja (przed pierwszym ##) ma heading = null.
 */
function splitSections(body) {
  const lines = body.split(/\r?\n/);
  const sections = [];
  let current = { heading: null, headingLine: "", lines: [] };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) {
      sections.push(current);
      current = { heading: m[1].trim(), headingLine: line, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  return sections.map(s => ({
    heading: s.heading,
    headingLine: s.headingLine,
    content: s.lines.join("\n"),
  }));
}

/**
 * Łączy sekcje z powrotem w treść.
 */
function joinSections(sections) {
  return sections.map(s => {
    if (s.heading === null) return s.content;
    return s.headingLine + "\n" + s.content;
  }).join("\n");
}

/**
 * Sprawdza czy sekcja zawiera tabelę markdown (| ... |) lub listę (- [...]).
 */
function hasTableOrList(content) {
  return /^\|.*\|/m.test(content) || /^- \[/m.test(content);
}

/**
 * Zamienia tabelę/listę w treści sekcji na blok base, zachowując resztę.
 */
function replaceTableWithBase(content, baseContent) {
  // Usuń tabelę markdown (linie zaczynające się od |)
  const lines = content.split(/\r?\n/);
  const nonTableLines = [];
  let inTable = false;

  for (const line of lines) {
    if (/^\|/.test(line.trim())) {
      inTable = true;
      continue;
    }
    if (inTable && line.trim() === "") {
      inTable = false;
      continue;
    }
    // Usuń listy markdown (- [...])
    if (/^- \[/.test(line.trim())) continue;
    // Usuń stare markery HTML
    if (/^<!--\s*\w+_START\s*-->/.test(line.trim())) continue;
    if (/^<!--\s*\w+_END\s*-->/.test(line.trim())) continue;
    nonTableLines.push(line);
  }

  // Wstaw blok base po oczyszczeniu
  const cleaned = nonTableLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
  return cleaned + "\n\n" + baseContent + "\n";
}

// ---------------------------------------------------------------------------
// Normalizacja nagłówków sekcji do kluczy
// ---------------------------------------------------------------------------

function normalizeHeading(heading) {
  if (!heading) return null;
  const h = heading.toLowerCase()
    .replace(/[ąćęłńóśźż]/g, ch => {
      const map = { ą:"a", ć:"c", ę:"e", ł:"l", ń:"n", ó:"o", ś:"s", ź:"z", ż:"z" };
      return map[ch] || ch;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return h;
}

// Mapowanie znormalizowanych nagłówków do typów sekcji
const SECTION_MAP = {
  "kampanie":              "campaigns",
  "scenariusze-samodzielne": "standalone-scenarios",
  "scenariusze":           "scenarios",
  "spis-epizodow":         "episodes",
  "Bohaterowie Graczy":    "players",
  "Bohaterowie Niezalezni":"npcs",
  "Lokacje":               "locations",
  "Artefakty":             "artifacts",
  "spis-systemow":         "systems",
};

// ---------------------------------------------------------------------------
// Przetwarzanie plików
// ---------------------------------------------------------------------------

/**
 * Buduje mapę: system slug (z system note) → [scenario system slugi].
 * Skanuje scenariusze/ i odczytuje pole `system` z plików scenariuszy.
 */
async function buildScenarioSlugMap() {
  if (scenarioSlugMap) return scenarioSlugMap;
  scenarioSlugMap = {};

  // Skanuj Systemy/*/Scenariusze/ (nowa lokalizacja po migracji)
  const sysBaseDir = join(targetDir, "Systemy");
  let sysDirEntries = [];
  try { sysDirEntries = await (await import("node:fs/promises")).readdir(sysBaseDir, { withFileTypes: true }); } catch {}
  const scenFiles = [];
  for (const entry of sysDirEntries) {
    if (entry.isDirectory()) {
      scenFiles.push(...(await findMdFiles(join(sysBaseDir, entry.name, "Scenariusze"))));
    }
  }

  // Zbierz unikalne system slugi z plików scenariuszy
  const slugsInScenarios = new Set();
  for (const f of scenFiles) {
    const txt = await readFile(f, "utf-8");
    const sfm = parseFrontmatter(txt);
    if (sfm.type === "scenariusz" && sfm.system) {
      slugsInScenarios.add(sfm.system);
    }
  }

  // Zbierz system slugi z system notes
  const sysDir = join(targetDir, "Systemy");
  const sysFiles = await findMdFiles(sysDir);
  for (const f of sysFiles) {
    const txt = await readFile(f, "utf-8");
    const sfm = parseFrontmatter(txt);
    if (sfm.type === "system" && sfm.system) {
      // Szukaj scenario slugów: dokładne, prefiksowe, sufiksowe lub z "1ed"
      const matching = [...slugsInScenarios].filter(s =>
        s === sfm.system ||
        s.startsWith(sfm.system + "-") ||
        s.endsWith("-" + sfm.system) ||
        s === sfm.system + "1ed"
      );
      if (matching.length > 0) {
        scenarioSlugMap[sfm.system] = matching;
      }
    }
  }

  return scenarioSlugMap;
}

async function processSystemNote(filePath, content, fm) {
  const relPath = relative(targetDir, dirname(filePath)).replace(/\\/g, "/");
  const systemSlug = fm.system || slugify(basename(dirname(filePath)));

  const fmEnd = content.indexOf("---", 4) + 3;
  const body = content.slice(fmEnd);
  const sections = splitSections(body);
  let changed = false;

  const slugMap = await buildScenarioSlugMap();

  for (const section of sections) {
    const key = normalizeHeading(section.heading);
    const sectionType = SECTION_MAP[key];

    if (sectionType === "campaigns" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseCampaigns(relPath));
      changed = true;
    }
    if (sectionType === "standalone-scenarios" && hasTableOrList(section.content)) {
      // Użyj zmapowanych slugów scenariuszy (mogą się różnić od slug systemu)
      const scenSlugs = slugMap[systemSlug] || [systemSlug];
      section.content = replaceTableWithBase(section.content, baseScenarios(scenSlugs));
      changed = true;
    }
  }

  if (changed) {
    return content.slice(0, fmEnd) + joinSections(sections);
  }
  return null;
}

async function processCampaignNote(filePath, content, fm) {
  const relPath = relative(targetDir, dirname(filePath)).replace(/\\/g, "/");
  const kampaniaSlug = slugify(basename(dirname(filePath)));

  const fmEnd = content.indexOf("---", 4) + 3;
  const body = content.slice(fmEnd);
  const sections = splitSections(body);
  let changed = false;

  for (const section of sections) {
    const key = normalizeHeading(section.heading);
    const sectionType = SECTION_MAP[key];

    if (sectionType === "episodes" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseEpisodes(relPath));
      changed = true;
    }
    if (sectionType === "players" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, basePlayers(kampaniaSlug));
      changed = true;
    }
    if (sectionType === "npcs" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseNpcs(kampaniaSlug));
      changed = true;
    }
    if (sectionType === "locations" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseLocations(kampaniaSlug));
      changed = true;
    }
    if (sectionType === "artifacts" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseArtifacts(kampaniaSlug));
      changed = true;
    }
  }

  // Wyczyść stare markery HTML (np. <!-- NPCS_START -->)
  let result = content.slice(0, fmEnd) + joinSections(sections);
  const oldResult = result;
  result = result.replace(/<!--\s*\w+_START\s*-->\s*/g, "").replace(/<!--\s*\w+_END\s*-->\s*/g, "");
  if (result !== oldResult) changed = true;

  return changed ? result : null;
}

async function processSystemsIndex(filePath, content, fm) {
  const fmEnd = content.indexOf("---", 4) + 3;
  const body = content.slice(fmEnd);
  const sections = splitSections(body);
  let changed = false;

  for (const section of sections) {
    const key = normalizeHeading(section.heading);
    const sectionType = SECTION_MAP[key];

    if (sectionType === "systems" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseSystems());
      changed = true;
    }
  }

  if (changed) {
    return content.slice(0, fmEnd) + joinSections(sections);
  }
  return null;
}

async function processScenarioFolderNote(filePath, content, fm) {
  const relPath = relative(targetDir, dirname(filePath)).replace(/\\/g, "/");

  const fmEnd = content.indexOf("---", 4) + 3;
  const body = content.slice(fmEnd);
  const sections = splitSections(body);
  let changed = false;

  for (const section of sections) {
    const key = normalizeHeading(section.heading);
    const sectionType = SECTION_MAP[key];

    if (sectionType === "scenarios" && hasTableOrList(section.content)) {
      section.content = replaceTableWithBase(section.content, baseScenarioList(relPath));
      changed = true;
    }
  }

  if (changed) {
    return content.slice(0, fmEnd) + joinSections(sections);
  }
  return null;
}

function processEncyclopediaNote(filePath, content, fm) {
  const folderName = basename(dirname(filePath));

  // Dobierz blok base na podstawie nazwy folderu
  let baseContent;
  switch (folderName) {
    case "Bohaterowie Graczy":    baseContent = baseEncyclopediaBG(); break;
    case "Bohaterowie Niezalezni": baseContent = baseEncyclopediaBN(); break;
    case "Lokacje":              baseContent = baseEncyclopediaLocations(); break;
    case "Artefakty":            baseContent = baseEncyclopediaArtifacts(); break;
    default: return null;
  }

  // Sprawdź czy już ma blok base
  if (content.includes("```base")) return null;

  // Dodaj blok base po zamknięciu </div> (meta-bind buttons)
  const divClose = content.lastIndexOf("</div>");
  if (divClose !== -1) {
    const insertPos = content.indexOf("\n", divClose) + 1;
    const newContent = content.slice(0, insertPos) + "\n" + baseContent + "\n" + content.slice(insertPos);
    return newContent;
  }

  // Fallback: dodaj na końcu pliku
  return content.trimEnd() + "\n\n" + baseContent + "\n";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[restore-bases] Katalog: ${targetDir}`);
  console.log(`[restore-bases] Tryb: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log();

  const allFiles = await findMdFiles(targetDir);
  let modified = 0;

  for (const filePath of allFiles) {
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    const rel = relative(targetDir, filePath).replace(/\\/g, "/");

    let newContent = null;

    // Systemy.md (index systemów)
    if (fm.type === "index" && rel.match(/^systemy\/Systemy\.md$/i)) {
      newContent = await processSystemsIndex(filePath, content, fm);
    }
    // System folder notes
    else if (fm.type === "system") {
      newContent = await processSystemNote(filePath, content, fm);
    }
    // Campaign folder notes
    else if (fm.type === "kampania") {
      newContent = await processCampaignNote(filePath, content, fm);
    }
    // Scenario folder notes (Systemy/[System]/Scenariusze/Scenariusze.md)
    else if (rel.match(/^Systemy\/[^/]+\/Scenariusze\/[^/]+\.md$/) && !fm.type?.includes("scenariusz")) {
      // Folder note podfoldera Scenariusze w systemie
      newContent = await processScenarioFolderNote(filePath, content, fm);
    }
    // Encyclopedia subfolder notes
    else if (fm.type === "index" && rel.startsWith("Encyklopedia/") && rel.split("/").length === 3) {
      newContent = processEncyclopediaNote(filePath, content, fm);
    }

    if (newContent !== null) {
      // Wyczyść nadmiarowe puste linie
      newContent = newContent.replace(/\n{4,}/g, "\n\n\n").replace(/\n+$/, "\n");

      const relDisplay = relative(targetDir, filePath).replace(/\\/g, "/");
      if (apply) {
        await writeFile(filePath, newContent, "utf-8");
        console.log(`  ✓ ${relDisplay}`);
      } else {
        console.log(`  [DRY-RUN] ${relDisplay}`);
      }
      modified++;
    }
  }

  console.log();
  console.log(`[restore-bases] Gotowe. Plików do modyfikacji: ${modified}`);
  if (!apply && modified > 0) {
    console.log(`[restore-bases] Uruchom z --apply aby zapisać zmiany.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
