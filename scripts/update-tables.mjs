#!/usr/bin/env node
/**
 * update-tables.mjs
 *
 * Skanuje folder vault (systemy/ lub scenariusze/), czyta frontmatter plików
 * i regeneruje tabelki między markerami HTML w folder notes.
 *
 * Obsługiwane markery:
 *   <!-- EPISODES_START/END -->   — epizody z folderu kampanii
 *   <!-- PLAYERS_START/END -->    — bohaterowie graczy z encyklopedii
 *   <!-- NPCS_START/END -->       — bohaterowie niezależni z encyklopedii
 *   <!-- LOCATIONS_START/END -->  — lokacje z encyklopedii
 *   <!-- ARTIFACTS_START/END -->  — artefakty z encyklopedii
 *   <!-- SCENARIOS_START/END -->  — scenariusze z folderu systemu
 *   <!-- SYSTEMS_START/END -->    — systemy (tylko Systemy.md)
 *
 * Użycie:
 *   node scripts/update-tables.mjs [ścieżka-do-folderu]
 *
 * Domyślnie: vault/systemy
 * Encyklopedia szukana jako sibling: vault/encyklopedia
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, basename, relative, dirname } from "node:path";
import { parseFrontmatter, findMdFiles, slugify } from "./shared.mjs";

const MARKERS = {
  episodes:  { start: "<!-- EPISODES_START -->",   end: "<!-- EPISODES_END -->" },
  players:   { start: "<!-- PLAYERS_START -->",     end: "<!-- PLAYERS_END -->" },
  npcs:      { start: "<!-- NPCS_START -->",        end: "<!-- NPCS_END -->" },
  locations: { start: "<!-- LOCATIONS_START -->",   end: "<!-- LOCATIONS_END -->" },
  artifacts: { start: "<!-- ARTIFACTS_START -->",   end: "<!-- ARTIFACTS_END -->" },
  scenarios: { start: "<!-- SCENARIOS_START -->",   end: "<!-- SCENARIOS_END -->" },
  systems:   { start: "<!-- SYSTEMS_START -->",     end: "<!-- SYSTEMS_END -->" },
};

const TYPE_MAP = {
  "bohater-gracza":     "players",
  "bohater-niezalezny": "npcs",
  "lokacja":            "locations",
  "artefakt":           "artifacts",
};

const systemyDir = process.argv[2] || "vault/systemy";
const encyklopediaDir = join(dirname(systemyDir), "encyklopedia");

/**
 * Buduje slug kampanii z ścieżki folder note względem systemy/.
 * np. L5K/Miecze Cnot I Grzechow/Miecze Cnot I Grzechow.md → miecze-cnot-i-grzechow
 */
function getCampaignSlug(notePath, systemyPath) {
  const rel = relative(systemyPath, notePath).replace(/\\/g, "/");
  const parts = rel.split("/");
  // Folder kampanii to przedostatni segment (folder note ma nazwę = folder)
  if (parts.length >= 2) {
    return slugify(parts[parts.length - 2]);
  }
  return slugify(parts[0]);
}

/**
 * Buduje link do wpisu encyklopedii na podstawie ścieżki pliku.
 */
function buildEncyklopediaLink(filePath, vaultRoot) {
  const rel = relative(vaultRoot, filePath).replace(/\\/g, "/");
  return `/${slugify(rel)}`;
}

/**
 * Buduje ścieżkę linku do epizodu.
 */
function buildEpisodeLink(episodePath, systemyPath) {
  const rel = relative(systemyPath, episodePath).replace(/\\/g, "/");
  return `/systemy/${slugify(rel)}`;
}

/**
 * Znajduje folder notes kampanii — pliki z dowolnym markerem sekcji.
 */
async function findCampaignFolderNotes(systemyPath) {
  const allMd = await findMdFiles(systemyPath);
  const folderNotes = [];
  for (const filePath of allMd) {
    const content = await readFile(filePath, "utf-8");
    const hasAnyMarker = Object.values(MARKERS).some(
      (m) => content.includes(m.start) && content.includes(m.end)
    );
    if (hasAnyMarker) {
      folderNotes.push(filePath);
    }
  }
  return folderNotes;
}

/**
 * Znajduje epizody w tym samym folderze co folder note.
 */
async function findEpisodesInDir(dir, folderNoteBasename) {
  const entries = await readdir(dir);
  const episodes = [];
  for (const name of entries) {
    if (!name.endsWith(".md") || name === folderNoteBasename) continue;
    const filePath = join(dir, name);
    const s = await stat(filePath);
    if (!s.isFile()) continue;
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    if (fm.type === "epizod") {
      episodes.push({ filePath, name, fm });
    }
  }
  return episodes;
}

/**
 * Ładuje wszystkie wpisy encyklopedii pogrupowane wg kampanii i typu.
 * Klucz: `${campaignSlug}:${category}` → array of entries
 * Obsługuje kampania jako string, tablicę lub string z przecinkami.
 */
async function loadEncyklopedia(encDir, vaultRoot) {
  const index = {};
  const allMd = await findMdFiles(encDir);
  for (const filePath of allMd) {
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    const category = TYPE_MAP[fm.type];
    if (!category || !fm.kampania) continue;
    const kampanie = Array.isArray(fm.kampania)
      ? fm.kampania
      : fm.kampania.split(",").map((s) => s.trim()).filter(Boolean);
    for (const kamp of kampanie) {
      const key = `${kamp}:${category}`;
      if (!index[key]) index[key] = [];
      if (!index[key].find((e) => e.filePath === filePath)) {
        index[key].push({ filePath, fm });
      }
    }
  }
  return index;
}

/**
 * Sortuje epizody po dacie, potem po nazwie pliku.
 */
function sortEpisodes(episodes) {
  return episodes.sort((a, b) => {
    const dateA = a.fm.data || "9999-99-99";
    const dateB = b.fm.data || "9999-99-99";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.name.localeCompare(b.name);
  });
}

/**
 * Znajduje scenariusze w tym samym folderze co folder note.
 */
async function findScenariosInDir(dir, folderNoteBasename) {
  const entries = await readdir(dir);
  const scenarios = [];
  for (const name of entries) {
    if (!name.endsWith(".md") || name === folderNoteBasename) continue;
    const filePath = join(dir, name);
    const s = await stat(filePath);
    if (!s.isFile()) continue;
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    if (fm.type === "scenariusz") {
      scenarios.push({ filePath, name, fm });
    }
  }
  return scenarios;
}

/**
 * Sortuje scenariusze po dacie, potem po nazwie pliku.
 */
function sortScenarios(scenarios) {
  return scenarios.sort((a, b) => {
    const dateA = a.fm.data || "9999-99-99";
    const dateB = b.fm.data || "9999-99-99";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.name.localeCompare(b.name);
  });
}

/**
 * Generuje listę bullet scenariuszy.
 */
function generateScenariosList(scenarios, vaultRoot) {
  return scenarios
    .map((sc) => {
      const title = (sc.fm.title || basename(sc.name, ".md")).replace(/\|/g, "\\|");
      const link = buildEncyklopediaLink(sc.filePath, vaultRoot);
      return `- [${title}](${link})`;
    })
    .join("\n");
}

/**
 * Sortuje wpisy encyklopedii po tytule.
 */
function sortByTitle(entries) {
  return entries.sort((a, b) => {
    const titleA = a.fm.title || "";
    const titleB = b.fm.title || "";
    return titleA.localeCompare(titleB, "pl");
  });
}

/**
 * Generuje tabelkę epizodów.
 */
function generateEpisodesTable(episodes, systemyPath) {
  const rows = [`| # | Tytuł | Data |`, `|---|-------|------|`];
  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const title = ep.fm.title || basename(ep.name, ".md");
    const safeTitle = title.replace(/\|/g, "\\|");
    const link = buildEpisodeLink(ep.filePath, systemyPath);
    const data = ep.fm.data || "";
    rows.push(`| ${i + 1} | [${safeTitle}](${link}) | ${data} |`);
  }
  return rows.join("\n");
}

/**
 * Generuje tabelkę bohaterów graczy (Postać | Gracz | Archetyp).
 */
function generatePlayersTable(entries, vaultRoot) {
  const rows = [`| Postać | Gracz | Archetyp |`, `|--------|-------|----------|`];
  for (const entry of entries) {
    const title = (entry.fm.title || "").replace(/\|/g, "\\|");
    const gracz = (entry.fm.gracz || "").replace(/\|/g, "\\|");
    const archetyp = (entry.fm.archetyp || "").replace(/\|/g, "\\|");
    const link = buildEncyklopediaLink(entry.filePath, vaultRoot);
    rows.push(`| [${title}](${link}) | ${gracz} | ${archetyp} |`);
  }
  return rows.join("\n");
}

/**
 * Generuje tabelkę encyklopedii (# | Nazwa) — dla BN, lokacji, artefaktów.
 */
function generateSimpleTable(entries, vaultRoot, header) {
  const rows = [`| # | ${header} |`, `|---|${"-".repeat(header.length + 2)}|`];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = (entry.fm.title || "").replace(/\|/g, "\\|");
    const link = buildEncyklopediaLink(entry.filePath, vaultRoot);
    rows.push(`| ${i + 1} | [${title}](${link}) |`);
  }
  return rows.join("\n");
}

/**
 * Zamienia zawartość między markerami w treści pliku.
 * Zwraca null jeśli markerów brak.
 */
function replaceMarkerContent(content, markerStart, markerEnd, tableContent) {
  const startIdx = content.indexOf(markerStart);
  const endIdx = content.indexOf(markerEnd);
  if (startIdx === -1 || endIdx === -1) return null;
  const before = content.substring(0, startIdx + markerStart.length);
  const after = content.substring(endIdx);
  return `${before}\n${tableContent}\n${after}`;
}

/**
 * Szuka wpisów encyklopedii pasujących do kampanii.
 * Dopasowanie: campaignSlug startsWith slug z frontmatter lub odwrotnie.
 */
function findMatchingEntries(encIndex, campaignSlug, category) {
  const results = [];
  for (const [key, entries] of Object.entries(encIndex)) {
    const [entryKampania, entryCat] = key.split(":");
    if (entryCat !== category) continue;
    // Dopasowanie: kampania zaczyna się od slug folderu lub odwrotnie
    if (entryKampania.startsWith(campaignSlug) || campaignSlug.startsWith(entryKampania)) {
      results.push(...entries);
    }
  }
  return results;
}

/**
 * Skanuje systemy/ i buduje tabelkę systemów dla Systemy.md.
 * Każdy wiersz: System (link) | Gatunek | Liczba kampanii
 */
async function generateSystemsTable(systemyPath) {
  const rows = [`| System | Gatunek | Kampanie |`, `|--------|---------|----------|`];
  let entries;
  try {
    entries = await readdir(systemyPath, { withFileTypes: true });
  } catch {
    return null;
  }

  const systems = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const systemFolderName = entry.name;
    const folderNotePath = join(systemyPath, systemFolderName, `${systemFolderName}.md`);
    let content;
    try {
      content = await readFile(folderNotePath, "utf-8");
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content);
    if (fm.type !== "system") continue;

    const title = fm.title || systemFolderName;
    const gatunek = fm.gatunek || "";
    const systemId = fm.system || slugify(systemFolderName);

    // Policz kampanie — podfoldery z własnym folder note zawierającym type: kampania
    let campaignCount = 0;
    let subEntries;
    try {
      subEntries = await readdir(join(systemyPath, systemFolderName), { withFileTypes: true });
    } catch {
      subEntries = [];
    }
    for (const sub of subEntries) {
      if (!sub.isDirectory()) continue;
      const subNotePath = join(systemyPath, systemFolderName, sub.name, `${sub.name}.md`);
      try {
        const subContent = await readFile(subNotePath, "utf-8");
        const subFm = parseFrontmatter(subContent);
        if (subFm.type === "kampania") campaignCount++;
      } catch {
        // brak folder note — nie liczymy
      }
    }

    const systemSlug = slugify(systemFolderName);
    const link = `/systemy/${systemSlug}/${systemSlug}`;
    systems.push({ title, gatunek, campaignCount, link });
  }

  // Sortuj po tytule
  systems.sort((a, b) => a.title.localeCompare(b.title, "pl"));

  for (const sys of systems) {
    const safeTitle = sys.title.replace(/\|/g, "\\|");
    rows.push(`| [${safeTitle}](${sys.link}) | ${sys.gatunek} | ${sys.campaignCount} |`);
  }
  return rows.join("\n");
}

async function main() {
  const vaultRoot = dirname(systemyDir);
  const folderNotes = await findCampaignFolderNotes(systemyDir);

  if (folderNotes.length === 0) {
    console.log(`Nie znaleziono folder notes z markerami w ${systemyDir}`);
    process.exit(0);
  }

  console.log(`Ładowanie encyklopedii z ${encyklopediaDir}...`);
  const encIndex = await loadEncyklopedia(encyklopediaDir, vaultRoot);
  console.log(`  Załadowano wpisy dla ${Object.keys(encIndex).length} grup kampania:typ`);

  let updated = 0;

  for (const notePath of folderNotes) {
    const dir = join(notePath, "..");
    const noteBasename = basename(notePath);
    const campaignSlug = getCampaignSlug(notePath, systemyDir);
    let content = await readFile(notePath, "utf-8");
    let changed = false;

    console.log(`\n  Kampania: ${campaignSlug} (${notePath})`);

    // --- Scenariusze ---
    if (content.includes(MARKERS.scenarios.start)) {
      const scenarios = await findScenariosInDir(dir, noteBasename);
      const sorted = sortScenarios(scenarios);
      if (sorted.length > 0) {
        const list = generateScenariosList(sorted, vaultRoot);
        const result = replaceMarkerContent(content, MARKERS.scenarios.start, MARKERS.scenarios.end, list);
        if (result && result !== content) {
          content = result;
          changed = true;
          console.log(`    [scenarios] ${sorted.length} scenariuszy`);
        }
      }
    }

    // --- Epizody ---
    if (content.includes(MARKERS.episodes.start)) {
      const episodes = await findEpisodesInDir(dir, noteBasename);
      const sorted = sortEpisodes(episodes);
      if (sorted.length > 0) {
        const table = generateEpisodesTable(sorted, systemyDir);
        const result = replaceMarkerContent(content, MARKERS.episodes.start, MARKERS.episodes.end, table);
        if (result && result !== content) {
          content = result;
          changed = true;
          console.log(`    [episodes] ${sorted.length} epizodów`);
        }
      }
    }

    // --- Bohaterowie Graczy ---
    if (content.includes(MARKERS.players.start)) {
      const entries = findMatchingEntries(encIndex, campaignSlug, "players");
      const sorted = sortByTitle(entries);
      if (sorted.length > 0) {
        const table = generatePlayersTable(sorted, vaultRoot);
        const result = replaceMarkerContent(content, MARKERS.players.start, MARKERS.players.end, table);
        if (result && result !== content) {
          content = result;
          changed = true;
          console.log(`    [players] ${sorted.length} bohaterów graczy`);
        }
      } else {
        console.log(`    [players] brak wpisów w encyklopedii`);
      }
    }

    // --- Bohaterowie Niezależni ---
    if (content.includes(MARKERS.npcs.start)) {
      const entries = findMatchingEntries(encIndex, campaignSlug, "npcs");
      const sorted = sortByTitle(entries);
      if (sorted.length > 0) {
        const table = generateSimpleTable(sorted, vaultRoot, "Bohater niezależny");
        const result = replaceMarkerContent(content, MARKERS.npcs.start, MARKERS.npcs.end, table);
        if (result && result !== content) {
          content = result;
          changed = true;
          console.log(`    [npcs] ${sorted.length} bohaterów niezależnych`);
        }
      } else {
        console.log(`    [npcs] brak wpisów w encyklopedii`);
      }
    }

    // --- Lokacje ---
    if (content.includes(MARKERS.locations.start)) {
      const entries = findMatchingEntries(encIndex, campaignSlug, "locations");
      const sorted = sortByTitle(entries);
      if (sorted.length > 0) {
        const table = generateSimpleTable(sorted, vaultRoot, "Lokacja");
        const result = replaceMarkerContent(content, MARKERS.locations.start, MARKERS.locations.end, table);
        if (result && result !== content) {
          content = result;
          changed = true;
          console.log(`    [locations] ${sorted.length} lokacji`);
        }
      } else {
        console.log(`    [locations] brak wpisów w encyklopedii`);
      }
    }

    // --- Artefakty ---
    if (content.includes(MARKERS.artifacts.start)) {
      const entries = findMatchingEntries(encIndex, campaignSlug, "artifacts");
      const sorted = sortByTitle(entries);
      if (sorted.length > 0) {
        const table = generateSimpleTable(sorted, vaultRoot, "Artefakt");
        const result = replaceMarkerContent(content, MARKERS.artifacts.start, MARKERS.artifacts.end, table);
        if (result && result !== content) {
          content = result;
          changed = true;
          console.log(`    [artifacts] ${sorted.length} artefaktów`);
        }
      } else {
        console.log(`    [artifacts] brak wpisów w encyklopedii`);
      }
    }

    if (changed) {
      await writeFile(notePath, content, "utf-8");
      console.log(`    → zapisano`);
      updated++;
    } else {
      console.log(`    → bez zmian`);
    }
  }

  // --- Aktualizuj tabelkę systemów w Systemy.md ---
  const systemyNotePath = join(systemyDir, "..", "Systemy", "Systemy.md");
  // Próbuj też wariant z małej litery (w CI content jest kopiowany)
  const systemyNotePathAlt = join(systemyDir, "..", "systemy", "Systemy.md");
  // Szukaj też folder note Systemy.md bezpośrednio w systemyDir (dla CI: quartz/content/systemy/Systemy.md)
  const systemyNotePathInDir = join(systemyDir, "Systemy.md");

  let systemyNoteFinalPath = null;
  for (const candidate of [systemyNotePath, systemyNotePathAlt, systemyNotePathInDir]) {
    try {
      await stat(candidate);
      systemyNoteFinalPath = candidate;
      break;
    } catch {
      // próbuj następny
    }
  }

  if (systemyNoteFinalPath) {
    console.log(`\n  Systemy.md: ${systemyNoteFinalPath}`);
    const systemsTable = await generateSystemsTable(systemyDir);
    if (systemsTable) {
      let systemyContent = await readFile(systemyNoteFinalPath, "utf-8");
      const result = replaceMarkerContent(
        systemyContent,
        MARKERS.systems.start,
        MARKERS.systems.end,
        systemsTable
      );
      if (result && result !== systemyContent) {
        await writeFile(systemyNoteFinalPath, result, "utf-8");
        console.log(`    [systems] → zapisano`);
        updated++;
      } else {
        console.log(`    [systems] → bez zmian`);
      }
    }
  } else {
    console.log(`\n  Nie znaleziono Systemy.md — pomijam tabelkę systemów`);
  }

  console.log(`\nZaktualizowano ${updated} z ${folderNotes.length + 1} przetworzonych plików.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
