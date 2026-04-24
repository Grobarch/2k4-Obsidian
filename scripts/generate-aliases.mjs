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
  return []; // TODO task 4
}

/**
 * D. Prefix strip: iteracyjnie zdejmuje pierwsze słowo jeśli zaczyna się małą literą.
 * Polskie znaki (ąćęłńóśźż) traktowane jak małe.
 */
export function heuristicPrefixStrip(title) {
  return null; // TODO task 5
}

// ─── Kompozycja ──────────────────────────────────────────────────────────────

export function generateCandidates(title) {
  return []; // TODO task 6
}

export function filterCandidates(candidates, title) {
  return []; // TODO task 6
}

// ─── YAML helper ─────────────────────────────────────────────────────────────

export function insertAliasesAfterTitle(yaml, aliasList) {
  return null; // TODO task 7
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export async function main() {
  // TODO task 8
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/generate-aliases.mjs")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
