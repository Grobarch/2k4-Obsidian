#!/usr/bin/env node
/**
 * statblock-detect.mjs — Heurystyki detekcji kompletności statbloka
 *
 * Single source of truth dla report-statblocks.mjs i vault-tools.mjs normalize.
 * Wszystkie funkcje pure — pracują na stringach, bez I/O.
 *
 * Heurystyki przeniesione 1:1 z report-statblocks.mjs (RPG-90 baseline):
 *   1. "Brakujące pole" — wzorzec **Label:** —  lub  **Label**: —
 *      (em-dash U+2014 po polu w pogrubieniu). Pomijamy bloki kodu.
 *   2. "Bez statblocka" — brak tabeli markdown ORAZ brak markera <!-- SYSTEM: -->.
 *   3. Pojedyncze komórki | — | i puste komórki w tabelach świadomie pomijamy
 *      (false positive w L5K — em-dash to celowa wartość modyfikatora).
 */

/** Wyciąga ciało notatki (po frontmatterze). */
export function extractBody(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n([\s\S]*)|$)/);
  if (!m) return content;
  return m[1] !== undefined ? m[1] : "";
}

/**
 * Znajduje wszystkie inline-pola z em-dash placeholderem. Akceptuje formy:
 *   **Label:** —      (kanoniczna z templatów)
 *   **Label**: —      (legacy)
 * Opcjonalnie z frazą w nawiasach: **Label (Opis):** —.
 * Pomija wystąpienia wewnątrz bloków kodu (``` ... ```).
 * Zwraca uporządkowaną listę unikalnych nazw pól (zachowuje kolejność).
 */
export function findMissingFields(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  const missing = [];
  const seen = new Set();
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

/** Czy body zawiera tabelę markdown LUB marker <!-- SYSTEM: --> ? */
export function hasStatblock(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  if (/<!--\s*SYSTEM:/i.test(stripped)) return true;
  return /^\s*\|.*\|\s*$/m.test(stripped);
}

/**
 * Wysokopoziomowy compute. Zwraca jeden z trzech statusów (polski ASCII):
 *   "pelny"           — body ma statblock + zero pól z em-dash placeholderem
 *   "niepelny"        — body ma statblock + ≥1 pole z em-dash placeholderem
 *   "brak-statblocka" — body nie ma statblocka
 */
export function computeStatblockStatus(content) {
  return "brak-statblocka"; // TODO task 5
}
