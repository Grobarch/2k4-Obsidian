#!/usr/bin/env node
/**
 * generate-aliases.mjs — Heurystyczny generator aliasów dla postaci (BG/BN)
 *
 * Skanuje pliki `type: bohater-gracza` / `bohater-niezalezny` i proponuje aliasy
 * na podstawie kształtu tytułu. Cztery heurystyki:
 *   A. comma-split     — segment przed pierwszym `,`
 *   B. dash-split      — segment przed pierwszym ` - ` lub ` — ` (spacje z obu stron)
 *   C. quote-extract   — zawartość cudzysłowów: '...', "...", „...", '...'
 *   D. prefix-strip    — iteracyjnie zdejmij pierwsze słowo pisane małą literą
 *
 * Policy: jeśli plik ma już klucz `aliases:` (dowolnej wartości) → pomijamy.
 *
 * Użycie:
 *   node scripts/generate-aliases.mjs                        # dry-run
 *   node scripts/generate-aliases.mjs --apply                # zapis
 *   node scripts/generate-aliases.mjs --system l5k           # filtr system
 *   node scripts/generate-aliases.mjs --type bohater-niezalezny
 *   node scripts/generate-aliases.mjs --file vault/path.md   # pojedynczy plik
 *   node scripts/generate-aliases.mjs --dir vault            # alt root
 *
 * Exit code: 0 (zawsze), chyba że --file wskazuje plik nieistniejący.
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, extractRawFrontmatter } from "./shared.mjs";

// ─── Heurystyki ──────────────────────────────────────────────────────────────

/**
 * A. Comma split: zwraca trimowany segment przed pierwszym `,`.
 * Zwraca null gdy brak przecinka lub segment jest pusty.
 */
export function heuristicCommaSplit(title) {
  const idx = title.indexOf(",");
  if (idx < 0) return null;
  const seg = title.slice(0, idx).trim();
  return seg.length > 0 ? seg : null;
}

/**
 * B. Dash split: zwraca trimowany segment przed pierwszym ` - ` lub ` — `.
 * Wymagane spacje z obu stron — nie łamie słów złożonych („Maho-tsukai", „Tuk-Tuk").
 */
export function heuristicDashSplit(title) {
  const hyphenIdx = title.indexOf(" - ");
  const emDashIdx = title.indexOf(" — ");
  const idx = [hyphenIdx, emDashIdx].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (idx === undefined) return null;
  const seg = title.slice(0, idx).trim();
  return seg.length > 0 ? seg : null;
}

/**
 * C. Quote extract: zwraca wszystkie niepuste substringi w cudzysłowach.
 * Obsługuje: '...', "...", „..." (polskie curly), '...' / '...' (smart).
 */
export function heuristicQuoteExtract(title) {
  const patterns = [
    /'([^']+)'/g,                    // ASCII single
    /"([^"]+)"/g,                    // ASCII double
    /\u201E([^\u201D]+)\u201D/g,     // „..." polskie curly
    /\u2018([^\u2019]+)\u2019/g,     // '...' smart single
    /\u201C([^\u201D]+)\u201D/g,     // "..." smart double
  ];
  const results = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(title)) !== null) {
      const v = m[1].trim();
      if (v.length > 0) results.push(v);
    }
  }
  return results;
}

/**
 * D. Prefix strip: iteracyjnie zdejmuje pierwsze słowo jeśli zaczyna się małą literą.
 * Polskie znaki (ąćęłńóśźż) traktowane jak małe.
 */
export function heuristicPrefixStrip(title) {
  const isLowerStart = (s) => /^[a-ząćęłńóśźż]/.test(s);
  let remaining = title.trim();
  let changed = false;
  while (isLowerStart(remaining)) {
    const m = remaining.match(/^\S+\s+/);
    if (!m) return null;
    remaining = remaining.slice(m[0].length);
    changed = true;
  }
  if (!changed) return null;
  return remaining.length > 0 ? remaining : null;
}

// ─── Kompozycja ──────────────────────────────────────────────────────────────

export function generateCandidates(title) {
  const out = [];
  const a = heuristicCommaSplit(title);
  if (a) out.push({ alias: a, source: "comma-split" });
  const b = heuristicDashSplit(title);
  if (b) out.push({ alias: b, source: "dash-split" });
  for (const q of heuristicQuoteExtract(title)) {
    out.push({ alias: q, source: "quote-extract" });
  }
  const d = heuristicPrefixStrip(title);
  if (d) out.push({ alias: d, source: "prefix-strip" });
  return out;
}

export function filterCandidates(candidates, title) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    const a = (c.alias ?? "").trim();
    if (a.length < 2) continue;
    if (a === title) continue;
    if (seen.has(a)) continue;
    seen.add(a);
    out.push({ alias: a, source: c.source });
  }
  return out;
}

// ─── YAML helper ─────────────────────────────────────────────────────────────

export function insertAliasesAfterTitle(yaml, aliasList) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const flowArray = `[${aliasList.map((a) => `"${escape(a)}"`).join(", ")}]`;
  const re = /^(title:.*)$/m;
  if (!re.test(yaml)) return null;
  return yaml.replace(re, `$1\naliases: ${flowArray}`);
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
  console.error(`Użycie: node scripts/generate-aliases.mjs [opcje]

Opcje:
  --dir <path>           Root vault (domyślnie: vault)
  --file <path>          Tylko jeden plik
  --type <type>          Filtr: bohater-gracza | bohater-niezalezny
  --system <id>          Filtr: l5k | wiedzmin | cold-city | ...
  --apply                Zapisz zmiany (bez tego: dry-run)
  --help, -h             Pokaż pomoc

Domyślnie: dry-run — skanuje vault/, wypisuje propozycje, nic nie zapisuje.`);
}

// ─── Analiza pojedynczego pliku ─────────────────────────────────────────────

async function analyzeFile(filePath, relPath) {
  const content = await readFile(filePath, "utf-8");
  const fm = parseFrontmatter(content);
  if (fm.type !== "bohater-gracza" && fm.type !== "bohater-niezalezny") return null;
  if (!fm.title) return null;

  // Policy skip: klucz aliases istnieje w RAW yaml — niezależnie od wartości.
  const rawYaml = extractRawFrontmatter(content);
  const hasAliasesKey = rawYaml !== null && /^aliases:/m.test(rawYaml);
  if (hasAliasesKey) {
    return { path: relPath, status: "skipped-has-aliases", candidates: [] };
  }

  const raw = generateCandidates(String(fm.title));
  const final = filterCandidates(raw, String(fm.title));
  if (final.length === 0) {
    return { path: relPath, status: "no-candidates", candidates: [] };
  }
  return { path: relPath, status: "proposed", candidates: final, rawYaml, content, filePath };
}

// ─── Zapis ──────────────────────────────────────────────────────────────────

async function applyAliasesToFile(entry) {
  const aliasList = entry.candidates.map((c) => c.alias);
  const newYaml = insertAliasesAfterTitle(entry.rawYaml, aliasList);
  if (newYaml === null) {
    return { ok: false, error: "brak linii title: — pominięto zapis" };
  }
  const newContent = entry.content.replace(
    /^---\r?\n[\s\S]*?\r?\n---/,
    `---\n${newYaml}\n---`
  );
  await writeFile(entry.filePath, newContent, "utf-8");
  return { ok: true };
}

// ─── Report ──────────────────────────────────────────────────────────────────

function renderEntry(entry) {
  const lines = [`${entry.path}`];
  for (const c of entry.candidates) {
    const pad = c.alias.length < 40 ? " ".repeat(40 - c.alias.length) : " ";
    lines.push(`  + "${c.alias}"${pad}[${c.source}]`);
  }
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
    try {
      await readFile(p, "utf-8");
    } catch {
      console.error(`Plik nie istnieje: ${opts.file}`);
      process.exit(1);
    }
    paths = [p];
  } else {
    paths = await findMdFiles(targetDir);
  }

  const entries = [];
  for (const p of paths) {
    const rel = relative(targetDir, p).replace(/\\/g, "/");
    if (rel.startsWith("templates/") || rel.toLowerCase().startsWith("templates/")) continue;
    if (p.endsWith(".excalidraw.md")) continue;

    const entry = await analyzeFile(p, rel);
    if (!entry) continue;

    if (opts.type && entry.candidates.length > 0) {
      const content = await readFile(p, "utf-8");
      const fm = parseFrontmatter(content);
      if (opts.type && fm.type !== opts.type) continue;
      if (opts.system && fm.system !== opts.system) continue;
    } else if (opts.type || opts.system) {
      const content = await readFile(p, "utf-8");
      const fm = parseFrontmatter(content);
      if (opts.type && fm.type !== opts.type) continue;
      if (opts.system && fm.system !== opts.system) continue;
    }

    if (opts.apply && entry.status === "proposed") {
      const res = await applyAliasesToFile(entry);
      entry.written = res.ok;
      if (!res.ok) entry.writeError = res.error;
    }

    entries.push(entry);
  }

  const proposed = entries.filter((e) => e.status === "proposed");
  const noCands = entries.filter((e) => e.status === "no-candidates");
  const skipped = entries.filter((e) => e.status === "skipped-has-aliases");
  const errors = entries.filter((e) => e.writeError);
  const written = entries.filter((e) => e.written === true);

  for (const e of proposed) console.log(renderEntry(e));

  console.log(`\nPodsumowanie:`);
  console.log(`  Przeskanowano postaci:  ${entries.length}`);
  console.log(`  Z propozycjami:         ${proposed.length}${opts.apply ? ` (zapisano: ${written.length})` : ""}`);
  console.log(`  Bez propozycji:         ${noCands.length}`);
  console.log(`  Pominięto (ma aliases): ${skipped.length}`);
  if (errors.length > 0) {
    console.log(`  Błędy zapisu:           ${errors.length}`);
  }
  if (!opts.apply && proposed.length > 0) {
    console.log(`\nTo był dry-run. Dodaj --apply aby zapisać zmiany.`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/generate-aliases.mjs")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
