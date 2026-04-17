#!/usr/bin/env node
/**
 * backlinks.mjs — wstawianie absolutnych linków markdown do body notatek vault
 *
 * Skanuje vault szukając celów (bohaterowie, artefakty, lokacje, systemy, kampanie)
 * i wstawia linki do pierwszego wystąpienia ich tytułu lub aliasu w body innych notatek.
 *
 * BEZPIECZEŃSTWO:
 *   - Nigdy nie modyfikuje frontmatteru — prefiks YAML jest kopiowany bit-for-bit.
 *   - Pomija segmenty chronione: code blocks (```), inline code (`...`),
 *     istniejące markdown linki [...](...), image embeds ![[...]], wikilinki [[...]].
 *   - Linkuje tylko pierwsze wystąpienie per cel per notatka.
 *   - Nie dubluje linków jeśli URL celu już występuje w body.
 *   - Nie linkuje notatki do siebie samej.
 *
 * Użycie:
 *   node scripts/backlinks.mjs --file "vault/Encyklopedia/.../Postać.md"
 *   node scripts/backlinks.mjs --all
 *   Dodaj --apply żeby zapisać; inaczej dry-run.
 *   --ci             — matching case-insensitive
 *   --root <dir>     — root vault (domyślnie "vault")
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, basename, dirname, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, slugify } from "./shared.mjs";

// ─── Konfiguracja ───────────────────────────────────────────────────────────

const TARGET_TYPES = [
  "bohater-gracza",
  "bohater-niezalezny",
  "artefakt",
  "lokacja",
  "system",
  "kampania",
];

// Polskie znaki + ASCII alfanumeryczne — używane do rozszerzonych granic słowa.
const POLISH_WORD_CHARS = "A-Za-z0-9_ĄĆĘŁŃÓŚŹŻąćęłńóśźż";

// ─── Args ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    file: null,
    all: false,
    apply: false,
    caseInsensitive: false,
    root: "vault",
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--file" && i + 1 < args.length) opts.file = args[++i];
    else if (a === "--all") opts.all = true;
    else if (a === "--apply") opts.apply = true;
    else if (a === "--ci") opts.caseInsensitive = true;
    else if (a === "--root" && i + 1 < args.length) opts.root = args[++i];
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else {
      console.error(`Nieznany argument: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  if (!opts.file && !opts.all) {
    console.error("Wymagane: --file <path> LUB --all");
    printHelp();
    process.exit(1);
  }
  return opts;
}

function printHelp() {
  console.log(`
backlinks.mjs — wstawianie backlinków do body notatek vault

Użycie:
  node scripts/backlinks.mjs --file "<ścieżka>" [--apply] [--ci]
  node scripts/backlinks.mjs --all [--apply] [--ci]

Opcje:
  --file <path>    Pojedyncza notatka do przetworzenia (ścieżka względna lub absolutna)
  --all            Przetwarzaj wszystkie notatki w vault/ (z wykluczeniami)
  --apply          Zapisz zmiany (domyślnie dry-run)
  --ci             Matching case-insensitive
  --root <dir>     Root vaultu (domyślnie: vault)

Domyślnie wykluczone w trybie --all:
  - folder notes (pliki o nazwie == nazwa parent folderu)
  - vault/templates/**
  - vault/index.md
`);
}

// ─── Split FM / body (prefix zachowany bit-for-bit) ────────────────────────

function splitFrontmatterBody(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!m) return { prefix: "", body: content };
  return { prefix: content.slice(0, m[0].length), body: content.slice(m[0].length) };
}

// ─── Utility ────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeTargetUrl(filePath, rootDir) {
  const rel = relative(rootDir, filePath).replace(/\\/g, "/");
  return "/" + slugify(rel);
}

function isFolderNote(filePath) {
  const name = basename(filePath, ".md");
  const parent = basename(dirname(filePath));
  return name === parent;
}

function isExcludedSource(filePath, rootDir) {
  const rel = relative(rootDir, filePath).replace(/\\/g, "/").toLowerCase();
  if (rel === "index.md") return true;
  if (rel.startsWith("templates/")) return true;
  if (rel.endsWith(".excalidraw.md")) return true;
  if (isFolderNote(filePath)) return true;
  return false;
}

// ─── Index celów ────────────────────────────────────────────────────────────

async function buildTargetIndex(rootDir) {
  const paths = await findMdFiles(rootDir);
  const targets = [];
  for (const p of paths) {
    const rel = relative(rootDir, p).replace(/\\/g, "/").toLowerCase();
    if (rel.startsWith("templates/")) continue;
    if (rel.endsWith(".excalidraw.md")) continue;
    const content = await readFile(p, "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm.type || !TARGET_TYPES.includes(fm.type)) continue;
    if (!fm.title) continue;
    const aliases = Array.isArray(fm.aliases)
      ? fm.aliases.filter((a) => a && String(a).trim())
      : (fm.aliases && String(fm.aliases).trim() ? [String(fm.aliases).trim()] : []);
    targets.push({
      url: computeTargetUrl(p, rootDir),
      wikiTarget: basename(p, ".md"),
      title: String(fm.title).trim(),
      aliases: aliases.map((a) => String(a).trim()),
      filePath: resolve(p),
    });
  }
  return targets;
}

function buildMatchableList(targets) {
  const entries = [];
  for (const t of targets) {
    entries.push({ phrase: t.title, url: t.url, wikiTarget: t.wikiTarget, filePath: t.filePath });
    for (const alias of t.aliases) {
      entries.push({ phrase: alias, url: t.url, wikiTarget: t.wikiTarget, filePath: t.filePath });
    }
  }
  // Najdłuższe frazy najpierw — żeby "Baron Kamden" trafił przed "Kamden".
  entries.sort((a, b) => b.phrase.length - a.phrase.length);
  // Deduplikuj identyczne pary (phrase + url) — na wypadek duplikatów aliasów.
  const seen = new Set();
  return entries.filter((e) => {
    const k = `${e.phrase}||${e.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Regex z polskimi granicami słowa ──────────────────────────────────────

function makePhraseRegex(phrase, caseInsensitive) {
  const escaped = escapeRegex(phrase);
  const left = `(?<![${POLISH_WORD_CHARS}])`;
  const right = `(?![${POLISH_WORD_CHARS}])`;
  return new RegExp(`${left}${escaped}${right}`, caseInsensitive ? "i" : "");
}

// ─── Przetwarzanie pojedynczej notatki ─────────────────────────────────────

function processNote(content, matchables, sourceFilePath, opts) {
  const { prefix, body } = splitFrontmatterBody(content);

  // Mask state
  const masks = [];
  let maskId = 0;
  const createMask = (original) => {
    const token = `\u0000BL${maskId++}\u0000`;
    masks.push({ token, original });
    return token;
  };

  // Kolejność maskowania: od najbardziej "opakowujących" do najmniejszych.
  let masked = body;
  // Fenced code blocks ``` ... ```
  masked = masked.replace(/```[\s\S]*?```/g, (m) => createMask(m));
  // Image wikilink embeds ![[...]]
  masked = masked.replace(/!\[\[[^\]]+\]\]/g, (m) => createMask(m));
  // Wikilinks [[...]]
  masked = masked.replace(/\[\[[^\]]+\]\]/g, (m) => createMask(m));
  // Markdown images ![alt](url)
  masked = masked.replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => createMask(m));
  // Markdown links [text](url)
  masked = masked.replace(/\[[^\]]*\]\([^)]*\)/g, (m) => createMask(m));
  // Inline code `...`
  masked = masked.replace(/`[^`\n]+`/g, (m) => createMask(m));

  // Już polinkowane cele — śledzimy po URL (markdown links) i wikiTarget (wikilinks)
  const existingUrls = new Set();
  const existingWikiTargets = new Set();
  const linkRe = /\]\(([^)]+)\)/g;
  const wikiRe = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  let lm;
  while ((lm = linkRe.exec(body)) !== null) existingUrls.add(lm[1]);
  while ((lm = wikiRe.exec(body)) !== null) existingWikiTargets.add(lm[1].trim());

  const linksInserted = [];
  const usedUrls = new Set(existingUrls);
  const usedWikiTargets = new Set(existingWikiTargets);
  const resolvedSource = resolve(sourceFilePath);

  for (const entry of matchables) {
    if (entry.filePath === resolvedSource) continue; // self-reference
    if (usedUrls.has(entry.url)) continue;
    if (usedWikiTargets.has(entry.wikiTarget)) continue;

    const re = makePhraseRegex(entry.phrase, opts.caseInsensitive);
    const match = masked.match(re);
    if (!match) continue;

    const matchedText = match[0];
    const wikilink = matchedText === entry.wikiTarget
      ? `[[${entry.wikiTarget}]]`
      : `[[${entry.wikiTarget}|${matchedText}]]`;
    const token = createMask(wikilink);
    masked = masked.slice(0, match.index) + token + masked.slice(match.index + matchedText.length);

    usedUrls.add(entry.url);
    usedWikiTargets.add(entry.wikiTarget);
    linksInserted.push({ phrase: matchedText, url: entry.wikiTarget });
  }

  // Unmask — każdy token pojawia się dokładnie raz.
  let finalBody = masked;
  for (const m of masks) {
    finalBody = finalBody.replace(m.token, m.original);
  }

  const newContent = prefix + finalBody;
  return { content: newContent, changed: newContent !== content, linksInserted };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);
  const rootDir = opts.root;

  console.log(`Budowanie indeksu celów z ${rootDir}/ ...`);
  const targets = await buildTargetIndex(rootDir);
  const matchables = buildMatchableList(targets);
  console.log(`  ${targets.length} celów, ${matchables.length} wzorców matchowania.\n`);

  // Lista źródeł do przetworzenia
  let sources;
  if (opts.file) {
    sources = [resolve(opts.file)];
  } else {
    const allPaths = await findMdFiles(rootDir);
    sources = allPaths
      .filter((p) => !isExcludedSource(p, rootDir))
      .map((p) => resolve(p));
  }

  let filesChanged = 0;
  let totalLinks = 0;

  for (const src of sources) {
    const content = await readFile(src, "utf-8");
    const { content: newContent, changed, linksInserted } = processNote(
      content,
      matchables,
      src,
      opts
    );
    if (!changed) continue;

    filesChanged++;
    totalLinks += linksInserted.length;

    const rel = relative(rootDir, src).replace(/\\/g, "/");
    console.log(`${rel}`);
    for (const link of linksInserted) {
      console.log(`  + "${link.phrase}" → ${link.url}`);
    }

    if (opts.apply) {
      await writeFile(src, newContent, "utf-8");
    }
  }

  const mode = opts.apply ? "ZAPISANO" : "DRY-RUN";
  console.log(`\n[${mode}] ${filesChanged} plik(ów), ${totalLinks} link(ów) wstawionych.`);
  if (!opts.apply && filesChanged > 0) {
    console.log("Dodaj --apply żeby zapisać zmiany.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
