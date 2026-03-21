#!/usr/bin/env node
/**
 * update-episode-tables.mjs
 *
 * Skanuje foldery kampanii w systemy/, czyta frontmatter epizodów
 * i wpisów encyklopedii, i aktualizuje tabelki między markerami
 * w folder notes kampanii.
 *
 * Obsługiwane markery:
 *   <!-- EPISODES_START/END -->   — epizody z folderu kampanii
 *   <!-- PLAYERS_START/END -->    — bohaterowie graczy z encyklopedii
 *   <!-- NPCS_START/END -->       — bohaterowie niezależni z encyklopedii
 *   <!-- LOCATIONS_START/END -->  — lokacje z encyklopedii
 *   <!-- ARTIFACTS_START/END -->  — artefakty z encyklopedii
 *
 * Użycie:
 *   node scripts/update-episode-tables.mjs [ścieżka-do-systemy]
 *
 * Domyślnie: vault/systemy
 * Encyklopedia szukana jako sibling: vault/encyklopedia
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, basename, relative, dirname } from "node:path";

const MARKERS = {
  episodes:  { start: "<!-- EPISODES_START -->",  end: "<!-- EPISODES_END -->" },
  players:   { start: "<!-- PLAYERS_START -->",    end: "<!-- PLAYERS_END -->" },
  npcs:      { start: "<!-- NPCS_START -->",       end: "<!-- NPCS_END -->" },
  locations: { start: "<!-- LOCATIONS_START -->",   end: "<!-- LOCATIONS_END -->" },
  artifacts: { start: "<!-- ARTIFACTS_START -->",   end: "<!-- ARTIFACTS_END -->" },
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
 * Parsuje YAML frontmatter z pliku markdown (prosty parser, bez zależności).
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      fm[m[1]] = val;
    }
  }
  return fm;
}

/**
 * Rekurencyjnie znajduje wszystkie pliki .md w folderze.
 */
async function findMdFiles(dir) {
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
      results.push(...(await findMdFiles(fullPath)));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Buduje slug kampanii z ścieżki folder note względem systemy/.
 * np. L5K/Miecze Cnot I Grzechow/Miecze Cnot I Grzechow.md → miecze-cnot-i-grzechow
 */
function getCampaignSlug(notePath, systemyPath) {
  const rel = relative(systemyPath, notePath).replace(/\\/g, "/");
  const parts = rel.split("/");
  // Folder kampanii to przedostatni segment (folder note ma nazwę = folder)
  if (parts.length >= 2) {
    return parts[parts.length - 2].toLowerCase().replace(/\s+/g, "-");
  }
  return parts[0].toLowerCase().replace(/\s+/g, "-").replace(/\.md$/i, "");
}

/**
 * Buduje link do wpisu encyklopedii na podstawie ścieżki pliku.
 */
function buildEncyklopediaLink(filePath, vaultRoot) {
  const rel = relative(vaultRoot, filePath).replace(/\\/g, "/");
  const slug = rel
    .replace(/\.md$/i, "")
    .split("/")
    .map((part) => part.toLowerCase().replace(/\s+/g, "-"))
    .join("/");
  return `/${slug}`;
}

/**
 * Buduje ścieżkę linku do epizodu.
 */
function buildEpisodeLink(episodePath, systemyPath) {
  const rel = relative(systemyPath, episodePath).replace(/\\/g, "/");
  const slug = rel
    .replace(/\.md$/i, "")
    .split("/")
    .map((part) => part.toLowerCase().replace(/\s+/g, "-"))
    .join("/");
  return `/systemy/${slug}`;
}

/**
 * Znajduje folder notes kampanii — pliki z markerem EPISODES_START.
 */
async function findCampaignFolderNotes(systemyPath) {
  const allMd = await findMdFiles(systemyPath);
  const folderNotes = [];
  for (const filePath of allMd) {
    const content = await readFile(filePath, "utf-8");
    if (content.includes(MARKERS.episodes.start) && content.includes(MARKERS.episodes.end)) {
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
 */
async function loadEncyklopedia(encDir, vaultRoot) {
  const index = {};
  const allMd = await findMdFiles(encDir);
  for (const filePath of allMd) {
    const content = await readFile(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    const category = TYPE_MAP[fm.type];
    if (!category || !fm.kampania) continue;
    const key = `${fm.kampania}:${category}`;
    if (!index[key]) index[key] = [];
    index[key].push({ filePath, fm });
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

  console.log(`\nZaktualizowano ${updated} z ${folderNotes.length} folder notes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
