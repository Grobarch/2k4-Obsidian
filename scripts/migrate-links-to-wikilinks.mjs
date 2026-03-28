#!/usr/bin/env node
/**
 * migrate-links-to-wikilinks.mjs — migracja linków markdown → wikilinki Obsidian
 *
 * Konwertuje [nazwa](ścieżka) → [[Filename|nazwa]] lub [[Filename]]
 *
 * Algorytm dopasowania (hybrydowy):
 * 1. Próba po nazwie: normalize([nazwa]) === normalize(filename)
 *    Np. "Za garść ryo" → "zagarscryo" dopasuje "Za Garsc Ryo.md"
 * 2. Fallback po slug z URL: slugify(relPath) === ścieżka z linku
 *    Używany gdy nazwa to opis epizodu np. [Epizod 1: "Kryptonim przybysz"]
 *    a plik to Epizod 01.md
 *
 * Gdy nazwa pliku nie jest unikalna, używa minimalnej ścieżki
 * wystarczającej do jednoznacznej identyfikacji w Obsidian.
 *
 * Użycie:
 *   node scripts/migrate-links-to-wikilinks.mjs           # dry-run (domyślnie)
 *   node scripts/migrate-links-to-wikilinks.mjs --apply   # zastosuj zmiany
 *   node scripts/migrate-links-to-wikilinks.mjs --dir vault/systemy  # podkatalog
 *
 * Wyjątki (nie konwertowane):
 *   - /tags/* — dynamiczne strony tagów Quartz
 *   - ![[...]] — obrazy i embedy
 *   - templates/ — szablony Obsidian
 *   - *.excalidraw.md — pliki Excalidraw
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findMdFiles, POLISH_MAP, slugify } from "./shared.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_VAULT = join(REPO_ROOT, "vault");

// ─── Argumenty CLI ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const dirIdx = args.indexOf("--dir");
const VAULT_DIR = dirIdx !== -1 ? join(process.cwd(), args[dirIdx + 1]) : DEFAULT_VAULT;

// ─── Normalizacja do porównań ─────────────────────────────────────────────────

/**
 * Normalizuje ciąg do celów porównania:
 * polskie znaki → ASCII, lowercase, usuwa wszystko poza [a-z0-9]
 * "Za garść ryo" → "zagarscryo"
 * "Za Garsc Ryo" → "zagarscryo"
 */
function normalize(str) {
  return str
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_MAP[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// ─── Regex ───────────────────────────────────────────────────────────────────

// Dopasowuje [nazwa](ścieżka) ale NIE ![[...]]
const LINK_RE = /(?<!!)\[([^\]]*)\]\((\/[^)]*)\)/g;

// ─── Faza 1: Budowanie indeksów ───────────────────────────────────────────────

async function buildIndexes(vaultDir) {
  const allFiles = await findMdFiles(vaultDir);

  // nameIndex: normalize(filename) → [{filePath, relPath, filename}]
  const nameIndex = new Map();
  // slugIndex: '/slug/path' → [{filePath, relPath, filename}]
  const slugIndex = new Map();

  for (const filePath of allFiles) {
    const relPath = relative(vaultDir, filePath);
    if (relPath.startsWith("templates/") || relPath.includes(".excalidraw")) continue;

    const filename = basename(filePath, ".md");
    const nameKey = normalize(filename);
    const slugKey = "/" + slugify(relPath);

    const entry = { filePath, relPath, filename };

    if (!nameIndex.has(nameKey)) nameIndex.set(nameKey, []);
    nameIndex.get(nameKey).push(entry);

    if (!slugIndex.has(slugKey)) slugIndex.set(slugKey, []);
    slugIndex.get(slugKey).push(entry);
  }

  return { nameIndex, slugIndex };
}

// ─── Generowanie minimalnej ścieżki wikilinku ─────────────────────────────────

/**
 * Zwraca najkrótszą ścieżkę wystarczającą do jednoznacznej identyfikacji
 * pliku przez Obsidian (Obsidian rozwiązuje wikilinki po nazwie pliku).
 *
 * relPath: np. "systemy/Cold City/Cold Tales/Epizod 01.md"
 * nameIndex: globalny indeks nazw — potrzebny do sprawdzenia czy nazwa jest unikalna w całym vault
 */
function minimalWikilinkPath(relPath, nameIndex) {
  const segments = relPath.replace(/\.md$/i, "").split("/");
  const filename = segments[segments.length - 1];
  const filenameKey = normalize(filename);

  // Pobierz wszystkie pliki z taką samą (znormalizowaną) nazwą
  const sameNameFiles = nameIndex.get(filenameKey) || [];

  if (sameNameFiles.length <= 1) {
    // Unikalna nazwa w vault — wystarczy sama nazwa pliku
    return filename;
  }

  // Dodawaj segmenty od prawej aż ścieżka stanie się unikalna
  for (let depth = 2; depth <= segments.length; depth++) {
    const candidate = segments.slice(segments.length - depth).join("/");
    const candidateLower = candidate.toLowerCase();

    const matches = sameNameFiles.filter((e) =>
      e.relPath.replace(/\.md$/i, "").toLowerCase().endsWith(candidateLower)
    );

    if (matches.length === 1) {
      return segments.slice(segments.length - depth).join("/");
    }
  }

  return segments.join("/");
}

// ─── Konwersja jednego linku → wikilink ──────────────────────────────────────

/**
 * Fallback: szukaj po slug z URL.
 * Próbuje też wariant folder note: /a/b → /a/b/b (ostatni segment powtórzony).
 */
function lookupBySlug(path, slugIndex) {
  const [pathNoAnchor] = path.split("#");

  if (slugIndex.has(pathNoAnchor)) return slugIndex.get(pathNoAnchor);

  const segments = pathNoAnchor.replace(/^\//, "").split("/");
  const last = segments[segments.length - 1];
  const folderNoteSlug = pathNoAnchor + "/" + last;

  return slugIndex.get(folderNoteSlug) || [];
}

function convertLink(nazwa, path, nameIndex, slugIndex) {
  // Pomiń tagi
  if (path.startsWith("/tags/")) return null;

  const anchor = path.includes("#") ? "#" + path.split("#")[1] : "";

  // ── 1. Dopasowanie po nazwie ─────────────────────────────────────────────
  const nameKey = normalize(nazwa);
  if (nameKey) {
    const byName = nameIndex.get(nameKey) || [];

    if (byName.length === 1) {
      const { relPath, filename } = byName[0];
      const wikilinkPath = minimalWikilinkPath(relPath, nameIndex);
      const wikilink =
        nazwa === filename
          ? `[[${wikilinkPath}${anchor}]]`
          : `[[${wikilinkPath}${anchor}|${nazwa}]]`;
      return { type: "ok", source: "name", nazwa, path, wikilink };
    }

    if (byName.length > 1) {
      return { type: "ambiguous", source: "name", nazwa, path, matches: byName.map((c) => c.relPath) };
    }
  }

  // ── 2. Fallback: dopasowanie po slug z URL ───────────────────────────────
  const bySlug = lookupBySlug(path, slugIndex);

  if (bySlug.length === 0) {
    return { type: "not-found", nazwa, path };
  }

  if (bySlug.length > 1) {
    return { type: "ambiguous", source: "slug", nazwa, path, matches: bySlug.map((c) => c.relPath) };
  }

  const { relPath, filename } = bySlug[0];
  const wikilinkPath = minimalWikilinkPath(relPath, nameIndex);
  const wikilink =
    nazwa === filename
      ? `[[${wikilinkPath}${anchor}]]`
      : `[[${wikilinkPath}${anchor}|${nazwa}]]`;
  return { type: "ok", source: "slug", nazwa, path, wikilink };
}

// ─── Faza 2: Przetwarzanie pliku ─────────────────────────────────────────────

function processFileContent(content, nameIndex, slugIndex) {
  const issues = { ambiguous: [], notFound: [] };

  const newContent = content.replace(LINK_RE, (match, nazwa, path) => {
    const result = convertLink(nazwa, path, nameIndex, slugIndex);

    if (result === null) return match;

    if (result.type === "not-found") {
      issues.notFound.push({ match, nazwa, path });
      return match;
    }

    if (result.type === "ambiguous") {
      issues.ambiguous.push({ match, nazwa, path, matches: result.matches });
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

  const { nameIndex, slugIndex } = await buildIndexes(VAULT_DIR);
  console.log(`Zaindeksowano ${nameIndex.size} unikalnych nazw, ${slugIndex.size} slugów.\n`);

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

    const { newContent, changed, issues } = processFileContent(content, nameIndex, slugIndex);

    if (issues.ambiguous.length > 0) allAmbiguous.push({ relPath, links: issues.ambiguous });
    if (issues.notFound.length > 0) allNotFound.push({ relPath, links: issues.notFound });

    if (!changed) continue;

    const converted = [...content.matchAll(LINK_RE)].filter((m) => {
      const r = convertLink(m[1], m[2], nameIndex, slugIndex);
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
        const r = convertLink(m[1], m[2], nameIndex, slugIndex);
        if (r && r.type === "ok") {
          console.log(`      ${m[0]}`);
          console.log(`    → ${r.wikilink}`);
        }
      }
    }
  }

  // ─── Raport AMBIGUOUS ───────────────────────────────────────────────────────

  if (allAmbiguous.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("## AMBIGUOUS — niejednoznaczne, wymagają ręcznej poprawki\n");
    for (const { relPath, links } of allAmbiguous) {
      for (const { match, nazwa, path, matches } of links) {
        console.log(`  [${nazwa}]  →  ${matches.length} pliki o podobnej nazwie:`);
        for (const m of matches) console.log(`    • ${m}`);
        console.log(`  w: ${relPath}`);
        console.log();
      }
    }
  }

  // ─── Raport NOT FOUND ───────────────────────────────────────────────────────

  if (allNotFound.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("## NOT FOUND — brak notatki o takiej nazwie\n");
    for (const { relPath, links } of allNotFound) {
      for (const { match, nazwa, path } of links) {
        console.log(`  [${nazwa}]  (${path})`);
        console.log(`  w: ${relPath}`);
        console.log();
      }
    }
  }

  // ─── Podsumowanie ───────────────────────────────────────────────────────────

  console.log("=".repeat(60));
  console.log(`Podsumowanie:`);
  console.log(`  Pliki przetworzone:  ${filesToProcess.length}`);
  console.log(`  Pliki do zmiany:     ${totalFilesChanged}`);
  console.log(`  Linki do konwersji:  ${totalConverted}`);
  console.log(`  Ambiguous:           ${allAmbiguous.reduce((s, f) => s + f.links.length, 0)}`);
  console.log(`  Not found:           ${allNotFound.reduce((s, f) => s + f.links.length, 0)}`);

  if (!APPLY && (totalFilesChanged > 0 || allAmbiguous.length > 0 || allNotFound.length > 0)) {
    console.log(`\nUruchom z --apply żeby zastosować zmiany.`);
    console.log(`Linki AMBIGUOUS i NOT FOUND pozostaną bez zmian.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
