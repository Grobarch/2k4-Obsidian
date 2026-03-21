#!/usr/bin/env node
/**
 * update-episode-tables.mjs
 *
 * Skanuje foldery kampanii w systemy/, czyta frontmatter epizodów,
 * i aktualizuje tabelki między markerami <!-- EPISODES_START/END -->
 * w folder notes kampanii.
 *
 * Użycie:
 *   node scripts/update-episode-tables.mjs [ścieżka-do-systemy]
 *
 * Domyślnie: vault/systemy
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, basename, relative } from "node:path";

const MARKER_START = "<!-- EPISODES_START -->";
const MARKER_END = "<!-- EPISODES_END -->";

const systemyDir = process.argv[2] || "vault/systemy";

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
      // Usuń cudzysłowy
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      fm[m[1]] = val;
    }
  }
  return fm;
}

/**
 * Generuje slug z nazwy pliku (jak Quartz: lowercase, spacje → myślniki).
 */
function fileToSlug(filename) {
  return filename
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/**
 * Rekurencyjnie znajduje wszystkie pliki .md w folderze.
 */
async function findMdFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
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
 * Znajduje folder note kampanii (plik z markerami EPISODES_START/END).
 */
async function findCampaignFolderNotes(systemyPath) {
  const allMd = await findMdFiles(systemyPath);
  const folderNotes = [];
  for (const filePath of allMd) {
    const content = await readFile(filePath, "utf-8");
    if (content.includes(MARKER_START) && content.includes(MARKER_END)) {
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
 * Buduje ścieżkę linku do epizodu na podstawie pozycji pliku
 * względem katalogu systemy/.
 */
function buildEpisodeLink(episodePath, systemyPath) {
  const rel = relative(systemyPath, episodePath).replace(/\\/g, "/");
  // rel: cold-city/cold-tales/Epizod 01.md → /systemy/cold-city/cold-tales/epizod-01
  const slug = rel
    .replace(/\.md$/i, "")
    .split("/")
    .map((part) => part.toLowerCase().replace(/\s+/g, "-"))
    .join("/");
  return `/systemy/${slug}`;
}

/**
 * Generuje tabelkę markdown z epizodami.
 */
function generateTable(episodes, systemyPath) {
  const rows = [`| # | Tytuł | Data |`, `|---|-------|------|`];
  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const title = ep.fm.title || basename(ep.name, ".md");
    // Escape pipe w title
    const safeTitle = title.replace(/\|/g, "\\|");
    const link = buildEpisodeLink(ep.filePath, systemyPath);
    const data = ep.fm.data || "";
    rows.push(`| ${i + 1} | [${safeTitle}](${link}) | ${data} |`);
  }
  return rows.join("\n");
}

async function main() {
  const folderNotes = await findCampaignFolderNotes(systemyDir);

  if (folderNotes.length === 0) {
    console.log(`Nie znaleziono folder notes z markerami w ${systemyDir}`);
    process.exit(0);
  }

  let updated = 0;

  for (const notePath of folderNotes) {
    const dir = join(notePath, "..");
    const noteBasename = basename(notePath);
    const episodes = await findEpisodesInDir(dir, noteBasename);
    const sorted = sortEpisodes(episodes);

    if (sorted.length === 0) {
      console.log(`  [skip] ${notePath} — brak epizodów`);
      continue;
    }

    const table = generateTable(sorted, systemyDir);
    const content = await readFile(notePath, "utf-8");

    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx === -1 || endIdx === -1) continue;

    const before = content.substring(0, startIdx + MARKER_START.length);
    const after = content.substring(endIdx);

    const newContent = `${before}\n${table}\n${after}`;

    if (newContent !== content) {
      await writeFile(notePath, newContent, "utf-8");
      console.log(`  [updated] ${notePath} — ${sorted.length} epizodów`);
      updated++;
    } else {
      console.log(`  [ok] ${notePath} — bez zmian`);
    }
  }

  console.log(`\nZaktualizowano ${updated} z ${folderNotes.length} folder notes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
