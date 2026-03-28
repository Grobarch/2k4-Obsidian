#!/usr/bin/env node
/**
 * migrate-links-to-wikilinks.mjs — migracja linków markdown → wikilinki Obsidian
 *
 * Konwertuje [text](/slug/path) → [[Filename|text]] lub [[Filename]]
 * Gdy nazwa pliku nie jest unikalna w vault, używa minimalnej ścieżki
 * wystarczającej do jednoznacznej identyfikacji.
 *
 * Użycie:
 *   node scripts/migrate-links-to-wikilinks.mjs           # dry-run (domyślnie)
 *   node scripts/migrate-links-to-wikilinks.mjs --apply   # zastosuj zmiany
 *   node scripts/migrate-links-to-wikilinks.mjs --dir vault/systemy  # tylko podkatalog
 *
 * Wyjątki (nie konwertowane):
 *   - /tags/* — dynamiczne strony tagów Quartz
 *   - ![[...]] — obrazy i embedy (wikilink z !)
 *   - templates/ — szablony Obsidian
 *   - *.excalidraw.md — pliki Excalidraw
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findMdFiles, slugify } from "./shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_VAULT = join(REPO_ROOT, "vault");

// ─── Argumenty CLI ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const dirIdx = args.indexOf("--dir");
const VAULT_DIR = dirIdx !== -1 ? join(process.cwd(), args[dirIdx + 1]) : DEFAULT_VAULT;

// ─── Regex ───────────────────────────────────────────────────────────────────

// Dopasowuje [text](/path) ale NIE ![[...]] (wikilinki obrazów)
const LINK_RE = /(?<!!)\[([^\]]*)\]\((\/[^)]*)\)/g;

// ─── Faza 1: Budowanie indeksów ───────────────────────────────────────────────

async function buildIndexes(vaultDir) {
  const allFiles = await findMdFiles(vaultDir);

  // slugIndex: slug (pełna ścieżka) → [{filePath, relPath, filename}]
  const slugIndex = new Map();
  // filenameIndex: lowercase(filename) → [{filePath, relPath, filename}]
  const filenameIndex = new Map();

  for (const filePath of allFiles) {
    const relPath = relative(vaultDir, filePath);

    // Pomiń templates i excalidraw
    if (relPath.startsWith("templates/") || relPath.includes(".excalidraw")) continue;

    const slug = "/" + slugify(relPath);
    const filename = basename(filePath, ".md");
    const filenameLower = filename.toLowerCase();

    const entry = { filePath, relPath, filename };

    if (!slugIndex.has(slug)) slugIndex.set(slug, []);
    slugIndex.get(slug).push(entry);

    if (!filenameIndex.has(filenameLower)) filenameIndex.set(filenameLower, []);
    filenameIndex.get(filenameLower).push(entry);
  }

  return { slugIndex, filenameIndex };
}

// ─── Lookup z heurystyką folder note ─────────────────────────────────────────

function lookupSlug(slugIndex, path) {
  const [pathWithoutAnchor] = path.split("#");

  if (slugIndex.has(pathWithoutAnchor)) {
    return { entries: slugIndex.get(pathWithoutAnchor), usedHeuristic: false };
  }

  // Heurystyka folder note: /a/b → /a/b/b
  const segments = pathWithoutAnchor.replace(/^\//, "").split("/");
  const lastSeg = segments[segments.length - 1];
  const folderNoteSlug = pathWithoutAnchor + "/" + lastSeg;

  if (slugIndex.has(folderNoteSlug)) {
    return { entries: slugIndex.get(folderNoteSlug), usedHeuristic: true };
  }

  return { entries: [], usedHeuristic: false };
}

// ─── Generowanie minimalnej ścieżki wikilinku ─────────────────────────────────

/**
 * Zwraca najkrótszą ścieżkę, która jednoznacznie identyfikuje plik w Obsidian.
 *
 * Obsidian rozwiązuje wikilinki zaczynając od nazwy pliku. Gdy plik nie jest
 * unikalny po nazwie, używamy minimalnej liczby segmentów ścieżki od prawej.
 *
 * Przykład: vault/systemy/Cold City/Cold Tales/Epizod 01.md
 *   - "Epizod 01" → nieunikalny (wiele kampanii ma Epizod 01)
 *   - "Cold Tales/Epizod 01" → sprawdź czy unikalny
 *   - "Cold City/Cold Tales/Epizod 01" → jeśli dalej nieunikalny, dodaj więcej segmentów
 *
 * relPath: ścieżka względem vault, np. "systemy/Cold City/Cold Tales/Epizod 01.md"
 * filenameIndex: Map<lowercase_filename, [entries]>
 */
function minimalWikilinkPath(relPath, filenameIndex) {
  const segments = relPath.replace(/\.md$/i, "").split("/");
  const filename = segments[segments.length - 1];

  // Sprawdź czy sama nazwa pliku jest unikalna
  const filenameKey = filename.toLowerCase();
  const sameNameFiles = filenameIndex.get(filenameKey) || [];

  if (sameNameFiles.length <= 1) {
    // Unikalna nazwa — wystarczy sama nazwa pliku
    return filename;
  }

  // Nie jest unikalna — dodawaj segmenty od prawej aż do unikalności
  for (let depth = 2; depth <= segments.length; depth++) {
    const candidate = segments.slice(segments.length - depth).join("/");
    const candidateLower = candidate.toLowerCase();

    // Sprawdź ile plików ma ścieżkę kończącą się na candidate (case-insensitive)
    const matches = sameNameFiles.filter((e) =>
      e.relPath.replace(/\.md$/i, "").toLowerCase().endsWith(candidateLower)
    );

    if (matches.length === 1) {
      // Używamy oryginalnego przypadku z filesystem
      return segments.slice(segments.length - depth).join("/");
    }
  }

  // Fallback: pełna ścieżka
  return segments.join("/");
}

// ─── Konwersja jednego linku → wikilink ──────────────────────────────────────

function convertLink(text, path, slugIndex, filenameIndex) {
  // Pomiń tagi
  if (path.startsWith("/tags/")) return null;

  const anchor = path.includes("#") ? "#" + path.split("#")[1] : "";
  const { entries } = lookupSlug(slugIndex, path);

  if (entries.length === 0) {
    return { type: "not-found", text, path };
  }

  if (entries.length > 1) {
    return { type: "ambiguous", text, path, matches: entries.map((e) => e.relPath) };
  }

  // Unikalne dopasowanie w slug index
  const { relPath, filename } = entries[0];
  const wikilinkPath = minimalWikilinkPath(relPath, filenameIndex);
  const anchorPart = anchor || "";

  // Jeśli display text jest identyczny z nazwą pliku → pomiń alias
  const wikilink =
    text === filename
      ? `[[${wikilinkPath}${anchorPart}]]`
      : `[[${wikilinkPath}${anchorPart}|${text}]]`;

  return { type: "ok", text, path, wikilink };
}

// ─── Faza 2: Przetwarzanie pliku ─────────────────────────────────────────────

function processFileContent(content, slugIndex, filenameIndex) {
  const issues = { ambiguous: [], notFound: [] };

  const newContent = content.replace(LINK_RE, (match, text, path) => {
    const result = convertLink(text, path, slugIndex, filenameIndex);

    if (result === null) return match; // pominięty

    if (result.type === "not-found") {
      issues.notFound.push({ match, text, path });
      return match;
    }

    if (result.type === "ambiguous") {
      issues.ambiguous.push({ match, text, path, matches: result.matches });
      return match;
    }

    return result.wikilink;
  });

  const changed = newContent !== content;
  return { newContent, changed, issues };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== migrate-links-to-wikilinks ===`);
  console.log(`Vault: ${VAULT_DIR}`);
  console.log(`Tryb:  ${APPLY ? "APPLY (zapisuje zmiany)" : "DRY-RUN (tylko podgląd)"}\n`);

  const { slugIndex, filenameIndex } = await buildIndexes(VAULT_DIR);
  console.log(`Zaindeksowano ${slugIndex.size} slugów, ${filenameIndex.size} unikalnych nazw plików.\n`);

  const allFiles = await findMdFiles(VAULT_DIR);
  const filesToProcess = allFiles.filter((f) => {
    const rel = relative(VAULT_DIR, f);
    return !rel.startsWith("templates/") && !rel.includes(".excalidraw");
  });

  let totalConverted = 0;
  let totalFilesChanged = 0;
  const allAmbiguous = [];
  const allNotFound = [];

  for (const filePath of filesToProcess) {
    const relPath = relative(VAULT_DIR, filePath);
    const content = await readFile(filePath, "utf-8");

    const { newContent, changed, issues } = processFileContent(
      content,
      slugIndex,
      filenameIndex
    );

    if (issues.ambiguous.length > 0) allAmbiguous.push({ relPath, links: issues.ambiguous });
    if (issues.notFound.length > 0) allNotFound.push({ relPath, links: issues.notFound });

    if (!changed) continue;

    // Policz skonwertowane linki
    const converted = [...content.matchAll(LINK_RE)].filter((m) => {
      const r = convertLink(m[1], m[2], slugIndex, filenameIndex);
      return r && r.type === "ok";
    }).length;

    totalConverted += converted;
    totalFilesChanged++;

    if (APPLY) {
      await writeFile(filePath, newContent, "utf-8");
      console.log(`  ✓ ${relPath} (${converted} linków)`);
    } else {
      console.log(`  ~ ${relPath} (${converted} linków do konwersji)`);
      for (const m of [...content.matchAll(LINK_RE)]) {
        const r = convertLink(m[1], m[2], slugIndex, filenameIndex);
        if (r && r.type === "ok") {
          console.log(`      ${m[0]}  →  ${r.wikilink}`);
        }
      }
    }
  }

  // ─── Raport AMBIGUOUS ───────────────────────────────────────────────────────

  if (allAmbiguous.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("## AMBIGUOUS — wymagają ręcznej poprawki\n");
    for (const { relPath, links } of allAmbiguous) {
      for (const { match, path, matches } of links) {
        console.log(`  AMBIGUOUS: ${path} (${matches.length} dopasowania)`);
        for (const m of matches) console.log(`    → ${m}`);
        console.log(`    Użycie: ${relPath}  ›  ${match}`);
      }
    }
  }

  // ─── Raport NOT FOUND ───────────────────────────────────────────────────────

  if (allNotFound.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("## NOT FOUND — linki do nieistniejących notatek\n");
    for (const { relPath, links } of allNotFound) {
      for (const { match, path } of links) {
        console.log(`  NOT FOUND: ${path}`);
        console.log(`    Użycie: ${relPath}  ›  ${match}`);
      }
    }
  }

  // ─── Podsumowanie ───────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log(`Podsumowanie:`);
  console.log(`  Pliki przetworzone:  ${filesToProcess.length}`);
  console.log(`  Pliki do zmiany:     ${totalFilesChanged}`);
  console.log(`  Linki do konwersji:  ${totalConverted}`);
  console.log(`  Ambiguous:           ${allAmbiguous.reduce((s, f) => s + f.links.length, 0)}`);
  console.log(`  Not found:           ${allNotFound.reduce((s, f) => s + f.links.length, 0)}`);

  if (!APPLY && totalFilesChanged > 0) {
    console.log(`\nUruchom z --apply żeby zastosować zmiany.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
