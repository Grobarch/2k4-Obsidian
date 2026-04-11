#!/usr/bin/env node

/**
 * verify-links.mjs
 *
 * Weryfikuje linki wewnętrzne w plikach vault markdown.
 * Sprawdza:
 *   - absolutne linki [text](/ścieżka) w treści
 *   - pole kampania_link w frontmatter
 *
 * Usage:
 *   node scripts/verify-links.mjs [--dir vault] [--fix] [--apply] [--warn-only]
 *
 * Opcje:
 *   --dir <katalog>   katalog vault (domyślnie: vault)
 *   --fix             spróbuj naprawić linki z błędem wielkości liter
 *   --apply           zapisz poprawki (wymaga --fix)
 *   --warn-only       exit code 0 nawet przy błędach (do CI)
 *
 * Exit code: 0 = brak błędów (lub --warn-only), 1 = znaleziono broken linki
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, slugify } from "./shared.mjs";

// ─── Argumenty CLI ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const targetDir = resolve(dirIdx !== -1 ? args[dirIdx + 1] : "vault");
const doFix = args.includes("--fix");
const doApply = args.includes("--apply");
const warnOnly = args.includes("--warn-only");

// ─── Wzorce ignorowanych plików (z quartz.config.ts ignorePatterns) ──────────

const IGNORE_PREFIXES = ["templates/", ".obsidian/", "private/", "z-nie-publikuj/"];
const IGNORE_PATTERNS = [/\.excalidraw\.md$/i, /^untitled/i, /\.base$/i];

function shouldIgnore(relPath) {
  const lower = relPath.toLowerCase().replace(/\\/g, "/");
  if (IGNORE_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (IGNORE_PATTERNS.some((r) => r.test(lower))) return true;
  return false;
}

// ─── Faza 1: Buduj mapę ważnych slugów ──────────────────────────────────────

const allPaths = await findMdFiles(targetDir);
const validSlugs = new Set();
const slugToPath = new Map(); // slug → ścieżka pliku (do --fix)

for (const filePath of allPaths) {
  const relPath = relative(targetDir, filePath).replace(/\\/g, "/");
  if (shouldIgnore(relPath)) continue;

  const slug = slugify(relPath); // np. encyklopedia/bohaterowie-graczy/kakita-kubota
  validSlugs.add(slug);
  slugToPath.set(slug, filePath);

  // index.md na rocie → też dodaj pusty slug (root)
  if (slug === "index") {
    validSlugs.add("");
  }

  // Quartz generuje automatyczne strony dla każdego folderu w hierarchii.
  // Np. plik systemy/cold-city/cold-tales/cold-tales.md powoduje że Quartz
  // renderuje też /systemy/cold-city/cold-tales (FolderContent).
  // Dodajemy wszystkie foldery nadrzędne jako ważne slugi.
  const parts = slug.split("/");
  for (let i = 1; i < parts.length; i++) {
    validSlugs.add(parts.slice(0, i).join("/"));
  }
}

// Tagi generowane przez Quartz — nie sprawdzamy ich
function isTagLink(slug) {
  return slug.startsWith("tags/");
}

// ─── Faza 2: Wyciągnij linki z każdego pliku ─────────────────────────────────

// Wynik: tablica { sourcePath, lineNo, rawHref, slug, inFrontmatter, fieldName }
const brokenLinks = [];
const fixableLinks = []; // { sourcePath, rawHref, correctedHref }

// Regex do wyciągania absolutnych linków markdown: [text](/path) lub [text](/path#anchor)
const LINK_RE = /\[([^\]]*)\]\((\/[^)\s]*)\)/g;

// Regex na bloki kodu (``` ... ```) — pomijamy ich zawartość
const CODE_BLOCK_RE = /^```[\s\S]*?^```/gm;

for (const filePath of allPaths) {
  const relPath = relative(targetDir, filePath).replace(/\\/g, "/");
  if (shouldIgnore(relPath)) continue;

  const content = await readFile(filePath, "utf-8");
  const frontmatter = parseFrontmatter(content);
  const displayPath = relative(process.cwd(), filePath);

  // ── Frontmatter: kampania_link ──
  const kl = frontmatter.kampania_link;
  if (kl) {
    const links = Array.isArray(kl) ? kl : [kl];
    for (let i = 0; i < links.length; i++) {
      const href = links[i];
      if (!href || href.startsWith("http")) continue;
      const slug = href.replace(/^\//, "").split("#")[0].replace(/\/$/, "");
      if (isTagLink(slug)) continue;
      if (!validSlugs.has(slug)) {
        const fix = findCaseInsensitiveMatch(slug);
        brokenLinks.push({
          sourcePath: displayPath,
          lineNo: "frontmatter",
          rawHref: href,
          slug,
          inFrontmatter: true,
          fieldName: `kampania_link[${i}]`,
          fix,
        });
        if (fix) fixableLinks.push({ sourcePath: filePath, rawHref: href, correctedHref: `/${fix}` });
      }
    }
  }

  // ── Body: absolutne linki markdown ──
  // Wyciągnij body (bez frontmatter)
  const body = content.replace(/^---[\s\S]*?---\n?/, "");
  // Usuń bloki kodu żeby nie sprawdzać linków w przykładach
  const bodyWithoutCode = body.replace(CODE_BLOCK_RE, (m) => "\n".repeat(m.split("\n").length - 1));

  // Oblicz offset linii (frontmatter zajmuje N linii)
  const fmLineCount = content.length - body.length > 0
    ? content.slice(0, content.length - body.length).split("\n").length
    : 0;

  const lines = bodyWithoutCode.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    LINK_RE.lastIndex = 0;
    while ((match = LINK_RE.exec(line)) !== null) {
      const rawHref = match[2];
      if (rawHref.startsWith("http://") || rawHref.startsWith("https://")) continue;
      const slug = rawHref.replace(/^\//, "").split("#")[0].replace(/\/$/, "");
      if (slug === "" || isTagLink(slug)) continue;
      if (!validSlugs.has(slug)) {
        const fix = findCaseInsensitiveMatch(slug);
        const lineNo = fmLineCount + i + 1;
        brokenLinks.push({
          sourcePath: displayPath,
          lineNo,
          rawHref,
          slug,
          inFrontmatter: false,
          fix,
        });
        if (fix) fixableLinks.push({ sourcePath: filePath, rawHref, correctedHref: `/${fix}` });
      }
    }
  }
}

// ─── Helper: szukaj case-insensitive match ───────────────────────────────────

function findCaseInsensitiveMatch(slug) {
  const lower = slug.toLowerCase();
  for (const valid of validSlugs) {
    if (valid.toLowerCase() === lower) return valid;
  }
  return null;
}

// ─── Faza 3: Raport ─────────────────────────────────────────────────────────

if (brokenLinks.length === 0) {
  console.log(`✓ Weryfikacja linków OK. Sprawdzono ${validSlugs.size} slugów.`);
  process.exit(0);
}

// Grupuj per plik
const byFile = new Map();
for (const b of brokenLinks) {
  if (!byFile.has(b.sourcePath)) byFile.set(b.sourcePath, []);
  byFile.get(b.sourcePath).push(b);
}

const fixableCount = brokenLinks.filter((b) => b.fix).length;
console.error(`\nBROKEN LINKS — ${brokenLinks.length} znaleziono (${fixableCount} naprawialnych)\n`);

for (const [file, links] of byFile) {
  console.error(`${file}:`);
  for (const b of links) {
    const where = b.inFrontmatter ? `  frontmatter ${b.fieldName}` : `  linia ${b.lineNo}`;
    const fix = b.fix ? `  → można naprawić: /${b.fix}` : "";
    console.error(`${where}  ${b.rawHref}${fix}`);
  }
  console.error("");
}

// ─── Faza 4: Fix (opcjonalnie) ───────────────────────────────────────────────

if (doFix && fixableLinks.length > 0) {
  if (!doApply) {
    console.error(`Tryb --fix bez --apply: poniżej ${fixableLinks.length} poprawki (dry-run):`);
    for (const f of fixableLinks) {
      const rel = relative(process.cwd(), f.sourcePath);
      console.error(`  ${rel}: ${f.rawHref} → ${f.correctedHref}`);
    }
    console.error("\nDodaj --apply żeby zapisać.");
  } else {
    // Grupuj poprawki per plik
    const fixesByFile = new Map();
    for (const f of fixableLinks) {
      if (!fixesByFile.has(f.sourcePath)) fixesByFile.set(f.sourcePath, []);
      fixesByFile.get(f.sourcePath).push(f);
    }

    let fixed = 0;
    for (const [filePath, fixes] of fixesByFile) {
      let content = await readFile(filePath, "utf-8");
      for (const f of fixes) {
        // Zastąp wszystkie wystąpienia rawHref → correctedHref (w nawiastach)
        const escaped = f.rawHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        content = content.replace(new RegExp(`\\(${escaped}(#[^)]*)?\\)`, "g"), (m, anchor) =>
          `(${f.correctedHref}${anchor ?? ""})`
        );
        fixed++;
      }
      await writeFile(filePath, content, "utf-8");
      const rel = relative(process.cwd(), filePath);
      console.log(`Naprawiono: ${rel}`);
    }
    console.log(`\nZapisano poprawki w ${fixesByFile.size} plikach (${fixed} linków).`);
  }
}

// ─── Exit code ───────────────────────────────────────────────────────────────

if (warnOnly) {
  process.exit(0);
} else {
  process.exit(1);
}
