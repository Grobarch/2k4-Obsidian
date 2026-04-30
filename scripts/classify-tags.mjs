#!/usr/bin/env node
/**
 * classify-tags.mjs — Promocja gatunków z `tags` do osobnego pola `gatunek`
 *
 * Skanuje pliki `type: kampania` i `type: scenariusz`. Z listy `tags`:
 *   1) wyciąga gatunki (matchujące słownik GENRES) → przenosi do pola `gatunek`
 *   2) sprząta śmieci: ${systemId}, templates, slug-systemu, system, systemy
 *   3) mapuje duplikaty case do kanonicznych: Wied­min → wiedzmin, 7th-Sea → 7th-sea, l5k1ed → l5k
 *   4) zachowuje tagi rolowe i systemowe (z SYSTEM_NAMES)
 *   5) tagi niejasne (np. wampir, dzikie-pola) zostają i są raportowane do manual review
 *
 * Istniejące pole `gatunek` w kampanii (string z przecinkami, np. "szpiegowski, horror")
 * jest splittowane i mergowane z gatunkami z tagów.
 *
 * Użycie:
 *   node scripts/classify-tags.mjs                       # dry-run cały vault
 *   node scripts/classify-tags.mjs --apply               # zapis
 *   node scripts/classify-tags.mjs --type scenariusz
 *   node scripts/classify-tags.mjs --system cold-city
 *   node scripts/classify-tags.mjs --file vault/path.md
 *
 * Exit code: 0 (zawsze).
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, extractRawFrontmatter, POLISH_MAP } from "./shared.mjs";
import { GENRES, SYSTEM_NAMES } from "./schema.mjs";

function normalizeTag(tag) {
  return String(tag)
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_MAP[ch] || ch)
    .replace(/­/g, "")
    .toLowerCase();
}

// ─── Słowniki klasyfikacji ───────────────────────────────────────────────────

const GENRE_SET = new Set(GENRES);
const SYSTEM_SET = new Set(Object.keys(SYSTEM_NAMES));

const ROLE_TAGS = new Set([
  "bohater-gracza", "bohater-niezalezny", "epizod", "scenariusz",
  "kampania", "lokacja", "artefakt", "wideo-rpg",
]);

const TRASH_TAGS = new Set([
  "${systemId}", "templates", "slug-systemu", "system", "systemy", "dokumentacja",
]);

// Mapowanie duplikatów case/literówek do wartości kanonicznych.
// "Wied­min" zawiera U+00AD (soft hyphen) między "Wied" a "min".
// l5k1ed nie jest tu mapowane: ~4 pliki mają `system: l5k1ed` jako legacy wariant
// systemu, więc tag `l5k1ed` jest zachowywany przez klauzulę "tag === fm.system".
const CASE_REMAP = {
  "Wied­min": "wiedzmin",
  "7th-Sea": "7th-sea",
};

// ─── Klasyfikacja ────────────────────────────────────────────────────────────

export function classifyTags(rawTags, existingGenre, currentSystem) {
  const inputTags = (rawTags || []).map((t) => String(t).trim()).filter(Boolean);
  const inputGenre = parseGenreString(existingGenre);

  const genreSet = new Set(inputGenre);
  const cleanedTags = [];
  const removed = [];
  const promoted = [];
  const unknown = [];
  const sysCanonical = currentSystem ? normalizeTag(currentSystem) : null;

  for (const tag of inputTags) {
    const remapped = CASE_REMAP[tag] ?? tag;
    const norm = normalizeTag(remapped);

    if (TRASH_TAGS.has(remapped) || TRASH_TAGS.has(norm)) {
      removed.push(tag);
      continue;
    }

    if (GENRE_SET.has(norm)) {
      if (!genreSet.has(norm)) {
        genreSet.add(norm);
        promoted.push(norm);
      } else {
        removed.push(tag);
      }
      continue;
    }

    if (SYSTEM_SET.has(norm) || (sysCanonical && norm === sysCanonical)) {
      if (!cleanedTags.includes(norm)) cleanedTags.push(norm);
      if (norm !== tag) removed.push(tag);
      continue;
    }

    if (ROLE_TAGS.has(norm)) {
      if (!cleanedTags.includes(norm)) cleanedTags.push(norm);
      if (norm !== tag) removed.push(tag);
      continue;
    }

    if (!cleanedTags.includes(remapped)) cleanedTags.push(remapped);
    unknown.push(remapped);
  }

  return {
    tags: cleanedTags,
    gatunek: [...genreSet],
    promoted,
    removed,
    unknown,
  };
}

function parseGenreString(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

// ─── YAML manipulation ──────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rozbija YAML na tablicę bloków pól: [{ name, lines }].
 * Każdy blok zawiera linię definicji + ewentualne kontynuacje (block-style list).
 */
export function splitYamlIntoFields(yaml) {
  const lines = yaml.split(/\r?\n/);
  const fields = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^([\w-]+):/);
    if (m) {
      if (current) fields.push(current);
      current = { name: m[1], lines: [line] };
    } else {
      if (current) current.lines.push(line);
      else fields.push({ name: "__before__", lines: [line] });
    }
  }
  if (current) fields.push(current);
  return fields;
}

export function reassembleYaml(fields) {
  return fields.map((f) => f.lines.join("\n")).join("\n");
}

function renderFlowArray(fieldName, arr) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${fieldName}: [${arr.map((a) => `"${escape(a)}"`).join(", ")}]`;
}

/**
 * Ustawia (lub zastępuje) pole `fieldName` w YAML jako flow-array.
 * Jeśli pole nie istnieje — wstawia po polu `insertAfter` (lub na końcu).
 * Jeśli `valueArr` jest pusty — pole jest usuwane (lub w ogóle nie wstawiane).
 */
export function setArrayField(yaml, fieldName, valueArr, insertAfter) {
  const fields = splitYamlIntoFields(yaml);
  const existingIdx = fields.findIndex((f) => f.name === fieldName);

  if (valueArr.length === 0) {
    if (existingIdx >= 0) fields.splice(existingIdx, 1);
    return reassembleYaml(fields);
  }

  const newLine = renderFlowArray(fieldName, valueArr);

  if (existingIdx >= 0) {
    fields[existingIdx] = { name: fieldName, lines: [newLine] };
    return reassembleYaml(fields);
  }

  let insertIdx = fields.length;
  if (insertAfter) {
    const afterIdx = fields.findIndex((f) => f.name === insertAfter);
    if (afterIdx >= 0) insertIdx = afterIdx + 1;
  }
  fields.splice(insertIdx, 0, { name: fieldName, lines: [newLine] });
  return reassembleYaml(fields);
}

// ─── Args ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { dir: "vault", file: null, type: null, system: null, apply: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dir" && i + 1 < args.length) opts.dir = args[++i];
    else if (a === "--file" && i + 1 < args.length) opts.file = args[++i];
    else if (a === "--type" && i + 1 < args.length) opts.type = args[++i];
    else if (a === "--system" && i + 1 < args.length) opts.system = args[++i];
    else if (a === "--apply") opts.apply = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`Nieznany argument: ${a}`); printHelp(); process.exit(1); }
  }
  return opts;
}

function printHelp() {
  console.error(`Użycie: node scripts/classify-tags.mjs [opcje]

Opcje:
  --dir <path>    Root vault (domyślnie: vault)
  --file <path>   Tylko jeden plik
  --type <type>   Filtr: kampania | scenariusz
  --system <id>   Filtr systemu (np. cold-city)
  --apply         Zapisz zmiany (bez tego: dry-run)
  --help, -h      Pokaż pomoc

Domyślnie: dry-run.`);
}

// ─── Analiza pliku ──────────────────────────────────────────────────────────

async function analyzeFile(filePath, relPath) {
  const content = await readFile(filePath, "utf-8");
  const fm = parseFrontmatter(content);
  if (fm.type !== "kampania" && fm.type !== "scenariusz") return null;

  const rawYaml = extractRawFrontmatter(content);
  if (rawYaml === null) return null;

  const result = classifyTags(fm.tags, fm.gatunek, fm.system);

  const tagsBefore = Array.isArray(fm.tags) ? [...fm.tags] : (fm.tags ? [fm.tags] : []);
  const genreBefore = parseGenreString(fm.gatunek);
  const hasEmptyGatunekLine = /^gatunek:\s*\[\s*\]\s*$/m.test(rawYaml);
  const changed =
    !arraysEqual(result.tags, tagsBefore) ||
    !arraysEqual(result.gatunek, genreBefore) ||
    (hasEmptyGatunekLine && result.gatunek.length === 0);

  return {
    path: relPath, filePath, content, rawYaml,
    type: fm.type, system: fm.system,
    before: { tags: tagsBefore, gatunek: genreBefore },
    after: { tags: result.tags, gatunek: result.gatunek },
    promoted: result.promoted,
    removed: result.removed,
    unknown: result.unknown,
    changed,
  };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ─── Apply ──────────────────────────────────────────────────────────────────

async function applyToFile(entry) {
  let yaml = entry.rawYaml;
  // Tags zawsze obecne (computed); aktualizujemy flow-style.
  yaml = setArrayField(yaml, "tags", entry.after.tags, "type");
  // Gatunek: po tags.
  yaml = setArrayField(yaml, "gatunek", entry.after.gatunek, "tags");
  const newContent = entry.content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${yaml}\n---`);
  await writeFile(entry.filePath, newContent, "utf-8");
}

// ─── Report ──────────────────────────────────────────────────────────────────

function renderEntry(entry) {
  const lines = [`${entry.path}  [${entry.type}]`];
  lines.push(`  tags:    ${JSON.stringify(entry.before.tags)} → ${JSON.stringify(entry.after.tags)}`);
  lines.push(`  gatunek: ${JSON.stringify(entry.before.gatunek)} → ${JSON.stringify(entry.after.gatunek)}`);
  if (entry.promoted.length) lines.push(`  promoted: ${entry.promoted.join(", ")}`);
  if (entry.removed.length) lines.push(`  removed:  ${entry.removed.join(", ")}`);
  if (entry.unknown.length) lines.push(`  unknown:  ${entry.unknown.join(", ")} (manual review)`);
  if (entry.written === true) lines.push(`  [zapisano]`);
  if (entry.writeError) lines.push(`  [BŁĄD ZAPISU: ${entry.writeError}]`);
  return lines.join("\n");
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export async function main() {
  const opts = parseArgs(process.argv);
  const targetDir = resolve(opts.dir);

  let paths;
  if (opts.file) {
    const p = resolve(opts.file);
    try { await readFile(p, "utf-8"); }
    catch { console.error(`Plik nie istnieje: ${opts.file}`); process.exit(1); }
    paths = [p];
  } else {
    paths = await findMdFiles(targetDir);
  }

  const entries = [];
  for (const p of paths) {
    const rel = relative(targetDir, p).replace(/\\/g, "/");
    if (rel.toLowerCase().startsWith("templates/")) continue;
    if (p.endsWith(".excalidraw.md")) continue;

    const entry = await analyzeFile(p, rel);
    if (!entry) continue;
    if (opts.type && entry.type !== opts.type) continue;
    if (opts.system && entry.system !== opts.system) continue;

    if (opts.apply && entry.changed) {
      try {
        await applyToFile(entry);
        entry.written = true;
      } catch (err) {
        entry.writeError = err.message;
      }
    }
    entries.push(entry);
  }

  const changed = entries.filter((e) => e.changed);
  const written = entries.filter((e) => e.written === true);
  const errors = entries.filter((e) => e.writeError);

  for (const e of changed) console.log(renderEntry(e));

  // Globalny raport tagów niejasnych.
  const unknownCount = new Map();
  for (const e of entries) {
    for (const u of e.unknown) {
      unknownCount.set(u, (unknownCount.get(u) || 0) + 1);
    }
  }
  if (unknownCount.size > 0) {
    console.log(`\nTagi do manual review (zostawione w \`tags\`):`);
    const sorted = [...unknownCount.entries()].sort((a, b) => b[1] - a[1]);
    for (const [tag, n] of sorted) console.log(`  ${tag.padEnd(30)} ${n}×`);
  }

  console.log(`\nPodsumowanie:`);
  console.log(`  Przeskanowano (kampania+scenariusz): ${entries.length}`);
  console.log(`  Ze zmianami:                          ${changed.length}${opts.apply ? ` (zapisano: ${written.length})` : ""}`);
  if (errors.length > 0) console.log(`  Błędy zapisu:                         ${errors.length}`);
  if (!opts.apply && changed.length > 0) {
    console.log(`\nTo był dry-run. Dodaj --apply aby zapisać zmiany.`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/classify-tags.mjs")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
