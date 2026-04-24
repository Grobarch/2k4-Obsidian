#!/usr/bin/env node
/**
 * report-statblocks.mjs — Raport kompletności statbloków postaci
 *
 * Skanuje pliki z `type: bohater-gracza` lub `type: bohater-niezalezny`,
 * analizuje ciało notatki (body) pod kątem placeholderów statblocka i drukuje
 * raport per system: liczba postaci pełnych / niepełnych / bez statblocka,
 * oraz listę konkretnych postaci z nazwami brakujących pól.
 *
 * Heurystyki detekcji (świadomie minimalistyczne — unikamy fałszywych pozytywów):
 *   1. "Brakujące pole" — wzorzec `**Label:** —` (em-dash U+2014 tuż po polu w
 *      pogrubieniu). W szablonach statblocków (`vault/templates/statblocks/*.md`)
 *      puste inline fields są generowane właśnie tym wzorcem, a wypełnione
 *      notatki tracą go na rzecz wartości.
 *   2. "Bez statblocka" — brak jakiejkolwiek tabeli markdown ORAZ brak komentarza
 *      HTML `<!-- SYSTEM: xxx -->` w ciele notatki.
 *   3. Pojedyncze komórki `| — |` ORAZ puste komórki w tabelach świadomie
 *      pomijamy — mają fałszywe pozytywy (np. `| Martwy | — |` w L5K gdzie
 *      em-dash jest właściwą wartością modyfikatora; interlaced attribute tables
 *      z celowo pustymi komórkami-separatorami).
 *
 * Użycie:
 *   node scripts/report-statblocks.mjs                    # skan vault/, wydruk
 *   node scripts/report-statblocks.mjs --dir <path>       # inny katalog
 *   node scripts/report-statblocks.mjs --type bohater-gracza  # tylko BG
 *   node scripts/report-statblocks.mjs --system l5k       # tylko l5k
 *   node scripts/report-statblocks.mjs --md <file>        # dodatkowo zapisz md
 *
 * Exit code: zawsze 0 (raport nie blokuje CI).
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";
import { SYSTEM_NAMES } from "./schema.mjs";

// ─── Parsowanie argumentów ───────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { dir: "vault", type: null, system: null, md: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dir" && i + 1 < args.length) opts.dir = args[++i];
    else if (a === "--type" && i + 1 < args.length) opts.type = args[++i];
    else if (a === "--system" && i + 1 < args.length) opts.system = args[++i];
    else if (a === "--md" && i + 1 < args.length) opts.md = args[++i];
  }
  return opts;
}

// ─── Detekcja ─────────────────────────────────────────────────────────────────

/** Wyciąga ciało notatki (po frontmatterze). */
function extractBody(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return m ? m[1] : content;
}

/**
 * Znajduje wszystkie inline-pola z em-dash placeholderem. Akceptuje dwie formy:
 *   **Label:** —      (kanoniczna — tak generują szablony w `vault/templates/statblocks/`)
 *   **Label**: —      (legacy — historyczne notatki pisane ręcznie, dwukropek poza **)
 * Opcjonalnie z frazą w nawiasach: **Label (Opis):** — / **Label (Opis)**: —.
 * Pomija wystąpienia wewnątrz bloków kodu (``` ... ```).
 * Zwraca uporządkowaną listę unikalnych nazw pól (zachowuje kolejność wystąpień).
 */
function findMissingFields(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  const missing = [];
  const seen = new Set();
  // Regex dopuszcza `:` przed LUB po zamykającym `**` (obie konwencje w vault).
  const re = /\*\*\s*([^*\n:]+?)(?:\s*\([^)\n]*\))?\s*:?\s*\*\*\s*:?\s*—/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      missing.push(name);
    }
  }
  return missing;
}

/** Sprawdza, czy plik zawiera jakikolwiek statblock (tabelę lub marker SYSTEM). */
function hasStatblock(body) {
  // Usuń bloki kodu — tabele w ```base``` nie liczą się jako statblock
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  // Marker HTML (konwencja vault: `<!-- SYSTEM: l5k -->` przed statblockiem)
  if (/<!--\s*SYSTEM:/i.test(stripped)) return true;
  // Dowolny wiersz zaczynający się od `|` (potencjalna tabela)
  return /^\s*\|.*\|\s*$/m.test(stripped);
}

/**
 * Analizuje pojedynczy plik postaci.
 * Zwraca obiekt raportu dla pliku lub `null` jeśli plik nie jest postacią.
 */
function analyzeFile(content, fm, relPath) {
  const type = fm.type;
  if (type !== "bohater-gracza" && type !== "bohater-niezalezny") return null;

  const body = extractBody(content);
  const missing = findMissingFields(body);
  const has = hasStatblock(body);

  let status;
  if (!has) status = "no-statblock";
  else if (missing.length === 0) status = "complete";
  else status = "incomplete";

  return {
    path: relPath,
    type,
    system: fm.system || "(brak)",
    title: fm.title || relPath,
    status,
    missing,
  };
}

// ─── Raport ──────────────────────────────────────────────────────────────────

/**
 * Grupuje raporty per system i zwraca uporządkowaną mapę.
 */
function groupBySystem(reports) {
  const byS = new Map();
  for (const r of reports) {
    if (!byS.has(r.system)) byS.set(r.system, []);
    byS.get(r.system).push(r);
  }
  // Sort systemów: alfabetycznie po ID (stabilne)
  return new Map([...byS.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/** Buduje podsumowującą tabelę markdown. */
function renderSummary(bySystem) {
  const lines = [];
  lines.push("| System | Łącznie | Pełne | Niepełne | Bez statblocka |");
  lines.push("|--------|--------:|------:|---------:|---------------:|");
  let total = 0, complete = 0, incomplete = 0, noStat = 0;
  for (const [sys, reports] of bySystem) {
    const c = reports.filter(r => r.status === "complete").length;
    const i = reports.filter(r => r.status === "incomplete").length;
    const n = reports.filter(r => r.status === "no-statblock").length;
    const sysLabel = SYSTEM_NAMES[sys] ? `${sys} (${SYSTEM_NAMES[sys]})` : sys;
    lines.push(`| ${sysLabel} | ${reports.length} | ${c} | ${i} | ${n} |`);
    total += reports.length; complete += c; incomplete += i; noStat += n;
  }
  lines.push(`| **Razem** | **${total}** | **${complete}** | **${incomplete}** | **${noStat}** |`);
  return lines.join("\n");
}

/** Renderuje listę niepełnych postaci (z nazwami brakujących pól) per system. */
function renderIncompleteList(bySystem) {
  const lines = [];
  for (const [sys, reports] of bySystem) {
    const incomplete = reports.filter(r => r.status === "incomplete");
    if (incomplete.length === 0) continue;
    const sysLabel = SYSTEM_NAMES[sys] ? `${sys} (${SYSTEM_NAMES[sys]})` : sys;
    lines.push(`\n### ${sysLabel} — ${incomplete.length} ${incomplete.length === 1 ? "postać" : "postaci"}\n`);
    // Sort: BN first (priorytet uzupełnienia), then BG; w ramach grupy alfabetycznie
    incomplete.sort((a, b) => {
      if (a.type !== b.type) return a.type === "bohater-niezalezny" ? -1 : 1;
      return a.title.localeCompare(b.title, "pl");
    });
    for (const r of incomplete) {
      const typeTag = r.type === "bohater-niezalezny" ? "BN" : "BG";
      lines.push(`- **${r.title}** _(${typeTag})_ — \`${r.path}\``);
      lines.push(`    Brakujące pola (${r.missing.length}): ${r.missing.join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** Renderuje listę postaci bez statblocka per system. */
function renderNoStatblockList(bySystem) {
  const lines = [];
  for (const [sys, reports] of bySystem) {
    const no = reports.filter(r => r.status === "no-statblock");
    if (no.length === 0) continue;
    const sysLabel = SYSTEM_NAMES[sys] ? `${sys} (${SYSTEM_NAMES[sys]})` : sys;
    lines.push(`\n### ${sysLabel} — ${no.length} ${no.length === 1 ? "postać" : "postaci"}\n`);
    no.sort((a, b) => a.title.localeCompare(b.title, "pl"));
    for (const r of no) {
      const typeTag = r.type === "bohater-niezalezny" ? "BN" : "BG";
      lines.push(`- **${r.title}** _(${typeTag})_ — \`${r.path}\``);
    }
  }
  return lines.join("\n");
}

/** Pełny raport markdown (używany w stdout i opcjonalnym pliku --md). */
function renderReport(reports) {
  const bySystem = groupBySystem(reports);
  const sections = [];
  sections.push("# Raport kompletności statbloków\n");
  sections.push(`Przeskanowano ${reports.length} postaci (BG + BN).\n`);
  sections.push("## Podsumowanie per system\n");
  sections.push(renderSummary(bySystem));

  const incompleteTotal = reports.filter(r => r.status === "incomplete").length;
  if (incompleteTotal > 0) {
    sections.push(`\n## Niepełne postacie (${incompleteTotal})`);
    sections.push(renderIncompleteList(bySystem));
  }

  const noStatTotal = reports.filter(r => r.status === "no-statblock").length;
  if (noStatTotal > 0) {
    sections.push(`\n## Postacie bez statblocka (${noStatTotal})`);
    sections.push(renderNoStatblockList(bySystem));
  }

  return sections.join("\n") + "\n";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);
  const targetDir = resolve(opts.dir);

  const allPaths = await findMdFiles(targetDir);
  const reports = [];

  for (const p of allPaths) {
    const rel = relative(targetDir, p).replace(/\\/g, "/");
    if (rel.startsWith("templates/") || rel.toLowerCase().startsWith("templates/")) continue;
    if (p.endsWith(".excalidraw.md")) continue;

    const content = await readFile(p, "utf-8");
    const fm = parseFrontmatter(content);
    const r = analyzeFile(content, fm, rel);
    if (!r) continue;

    if (opts.type && r.type !== opts.type) continue;
    if (opts.system && r.system !== opts.system) continue;

    reports.push(r);
  }

  if (reports.length === 0) {
    console.log("Brak postaci spełniających filtry.");
    return;
  }

  const md = renderReport(reports);
  process.stdout.write(md);

  if (opts.md) {
    await writeFile(opts.md, md, "utf-8");
    console.error(`\nZapisano raport do: ${opts.md}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
