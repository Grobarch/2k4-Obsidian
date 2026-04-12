#!/usr/bin/env node
/**
 * apply-statblock.mjs — masowa migracja statblokow w notatkach BG/BN
 *
 * Skanuje vault/Encyklopedia/ w poszukiwaniu notatek z markerem
 * <!-- SYSTEM: {id} --> i pozwala zastapic wklejony blok aktualnym
 * szablonem z vault/templates/statblocks/{id}.md.
 *
 * Uzycie:
 *   node scripts/apply-statblock.mjs <komenda> [argumenty] [opcje]
 *
 * Komendy:
 *   list                      Wylistuj wszystkie postacie z markerem statbloku,
 *                             pogrupowane po systemie.
 *   diff <system-id>          Dla postaci danego systemu pokaz status:
 *                             empty | filled | no-marker.
 *   apply <system-id>         Zastap statblok aktualnym szablonem.
 *
 * Opcje:
 *   --only-empty              (domyslne) Zastepuj tylko puste statbloki.
 *                             "Puste" = identyczne z aktualnym szablonem LUB
 *                             z opcjonalnym --snapshot LUB nie zawierajace
 *                             zadnych niedomyslnych wartosci (same separatory,
 *                             kropki, placeholdery '—', '○').
 *   --force                   Zastap nawet wypelnione statbloki (NIEBEZPIECZNE).
 *   --file <path>             Ogranicz do jednego pliku postaci.
 *   --snapshot <path>         Sciezka do poprzedniej wersji szablonu (np.
 *                             /tmp/old-l5k.md zapisanej z "git show HEAD:...").
 *                             Kazda postac identyczna ze snapshotem = empty.
 *   --apply                   Zapisz zmiany. Bez tej flagi: dry-run (domyslnie).
 *
 * Przyklady:
 *   node scripts/apply-statblock.mjs list
 *   node scripts/apply-statblock.mjs diff l5k
 *   git show HEAD:vault/templates/statblocks/l5k.md > /tmp/old-l5k.md
 *   node scripts/apply-statblock.mjs apply l5k --snapshot /tmp/old-l5k.md --apply
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";
import { SYSTEM_NAMES } from "./schema.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const VAULT_DIR = join(ROOT, "vault");
const ENCYKLOPEDIA_DIR = join(VAULT_DIR, "Encyklopedia");
const STATBLOCKS_DIR = join(VAULT_DIR, "templates", "statblocks");

// ─── Argumenty ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    command: null,
    systemId: null,
    onlyEmpty: true,
    force: false,
    file: null,
    snapshot: null,
    apply: false,
  };
  let i = 0;
  if (args[0] && !args[0].startsWith("--")) { opts.command = args[i++]; }
  if (args[i] && !args[i].startsWith("--")) { opts.systemId = args[i++]; }
  while (i < args.length) {
    const a = args[i];
    if (a === "--only-empty") { opts.onlyEmpty = true; opts.force = false; }
    else if (a === "--force") { opts.force = true; opts.onlyEmpty = false; }
    else if (a === "--file" && i + 1 < args.length) { opts.file = args[++i]; }
    else if (a === "--snapshot" && i + 1 < args.length) { opts.snapshot = args[++i]; }
    else if (a === "--apply") { opts.apply = true; }
    else { console.error(`Nieznana opcja: ${a}`); process.exit(2); }
    i++;
  }
  return opts;
}

// ─── Ekstrakcja bloku statystyk ───────────────────────────────────────────

/**
 * Znajduje marker <!-- SYSTEM: X --> i zwraca:
 *   { systemId, markerLine, bodyStart, bodyEnd, body }
 * Body to zawartosc miedzy linia PO markerze a linia PRZED nastepnym "## ".
 * Jesli nie ma markera — zwraca null.
 */
function extractStatblock(content) {
  const lines = content.split(/\r?\n/);
  const markerRe = /^<!--\s*SYSTEM:\s*([a-z0-9-]+)\s*-->\s*$/i;
  let markerLine = -1;
  let systemId = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(markerRe);
    if (m) { markerLine = i; systemId = m[1]; break; }
  }
  if (markerLine < 0) return null;
  const bodyStart = markerLine + 1;
  let bodyEnd = lines.length;
  for (let i = bodyStart; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { bodyEnd = i; break; }
  }
  const body = lines.slice(bodyStart, bodyEnd).join("\n").replace(/\s+$/, "");
  return { systemId, markerLine, bodyStart, bodyEnd, body, lines };
}

// ─── Normalizacja + detekcja "puste" ──────────────────────────────────────

/** Normalizuje tekst do porownania: zwija whitespace, trim per linia. */
function normalizeForCompare(txt) {
  return txt
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(l => l.length > 0)
    .join("\n");
}

/**
 * Heurystyka "blok nie zawiera zadnych danych uzytkownika":
 * po usunieciu separatorow tabel, placeholderow (— · ○), bold/italic,
 * backticks, naglowkow, strzalek — i po usunieciu znanych etykiet z szablonu
 * (np. "Honor:", "Umiejetnosci:", "Rasa:") — zostaje samo puste/whitespace.
 */
function isStatblockEmpty(bodyText, templateText) {
  // Wyodrebnij etykiety z szablonu: wszystko po lewej stronie ":" w "**X:**"
  // oraz naglowki kolumn tabel (pierwszy wiersz po "|---|").
  const labels = new Set();
  for (const m of templateText.matchAll(/\*\*([^*\n]+?):\*\*/g)) {
    labels.add(m[1].trim());
  }
  // Naglowki wierszy/kolumn tabel
  for (const line of templateText.split(/\r?\n/)) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").map(c => c.trim()).filter(Boolean);
    for (const c of cells) {
      // pomin separatory kolumn (---, :-:, :--, --:) i puste/placeholders
      if (/^:?-+:?$/.test(c)) continue;
      if (!c) continue;
      // tylko etykiety nie-placeholdery
      if (/^[—·○]+$/.test(c)) continue;
      labels.add(c);
    }
  }

  let stripped = bodyText;
  // usun inline markdown/struktury
  stripped = stripped.replace(/!\[.*?\]\(.*?\)/g, ""); // obrazki
  stripped = stripped.replace(/\[.*?\]\(.*?\)/g, "");  // linki (cale)
  stripped = stripped.replace(/<!--[\s\S]*?-->/g, ""); // komentarze html
  stripped = stripped.replace(/```[\s\S]*?```/g, "");  // bloki kodu
  stripped = stripped.replace(/`[^`]*`/g, "");         // inline code
  stripped = stripped.replace(/^#+\s.*$/gm, "");       // naglowki
  stripped = stripped.replace(/\*\*|__|\*|_/g, "");    // bold/italic markery
  // usun znane etykiety (dluzsze najpierw, zeby nie rozbijac "Sila woli" przez "Sila")
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  for (const lbl of sorted) {
    const re = new RegExp(escapeRegex(lbl) + ":?", "g");
    stripped = stripped.replace(re, "");
  }
  // usun pozostale: separatory tabel, placeholders, whitespace, znaki nawiasowe
  stripped = stripped.replace(/[|:\-—·○*\s()\[\]/\\.,;+=?!]+/g, "");
  return stripped.length === 0;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Klasyfikuje stan wklejonego statbloku.
 *   - "empty-identical-template" — body == aktualny szablon (po normalizacji)
 *   - "empty-identical-snapshot" — body == snapshot (stary szablon)
 *   - "empty-placeholders"       — brak danych uzytkownika (heurystyka)
 *   - "filled"                   — cos roznego od powyzszych
 */
function classifyStatblock(body, template, snapshot) {
  const nBody = normalizeForCompare(body);
  if (nBody === normalizeForCompare(template)) return "empty-identical-template";
  if (snapshot != null && nBody === normalizeForCompare(snapshot)) return "empty-identical-snapshot";
  if (isStatblockEmpty(body, template)) return "empty-placeholders";
  return "filled";
}

function isEmptyStatus(status) { return status.startsWith("empty"); }

// ─── Wykrywanie postaci ────────────────────────────────────────────────────

async function findCharacterFiles() {
  const all = await findMdFiles(ENCYKLOPEDIA_DIR);
  const matches = [];
  for (const f of all) {
    const content = await readFile(f, "utf-8");
    const sb = extractStatblock(content);
    if (!sb) continue;
    const fm = parseFrontmatter(content);
    matches.push({
      path: f,
      rel: relative(ROOT, f).replace(/\\/g, "/"),
      systemId: sb.systemId,
      fmSystem: fm.system || null,
      type: fm.type || null,
      title: fm.title || null,
      content,
      sb,
    });
  }
  return matches;
}

async function loadTemplate(systemId) {
  const path = join(STATBLOCKS_DIR, `${systemId}.md`);
  try { return await readFile(path, "utf-8"); }
  catch { return null; }
}

// ─── Komendy ───────────────────────────────────────────────────────────────

async function cmdList() {
  const chars = await findCharacterFiles();
  const bySystem = new Map();
  for (const c of chars) {
    if (!bySystem.has(c.systemId)) bySystem.set(c.systemId, []);
    bySystem.get(c.systemId).push(c);
  }
  const systems = [...bySystem.keys()].sort();
  console.log(`Znaleziono ${chars.length} postaci z markerem statbloku w ${systems.length} systemach:\n`);
  for (const sys of systems) {
    const list = bySystem.get(sys);
    const known = SYSTEM_NAMES[sys] ? "" : " (NIEZNANY SYSTEM)";
    console.log(`  [${sys}]${known} — ${list.length} postaci`);
    for (const c of list) {
      const mismatch = c.fmSystem && c.fmSystem !== c.systemId ? ` (fm.system=${c.fmSystem}!)` : "";
      console.log(`    ${c.rel}${mismatch}`);
    }
    console.log("");
  }
}

async function cmdDiff(systemId, opts) {
  const template = await loadTemplate(systemId);
  if (template == null) {
    console.error(`Brak szablonu: vault/templates/statblocks/${systemId}.md`);
    process.exit(1);
  }
  const snapshot = opts.snapshot ? await readFile(opts.snapshot, "utf-8") : null;

  const all = await findCharacterFiles();
  const chars = all.filter(c => c.systemId === systemId && (!opts.file || c.rel === opts.file || c.path === opts.file));
  if (chars.length === 0) {
    console.log(`Brak postaci z markerem <!-- SYSTEM: ${systemId} -->.`);
    return;
  }
  const counts = { "empty-identical-template": 0, "empty-identical-snapshot": 0, "empty-placeholders": 0, "filled": 0 };
  console.log(`Postacie dla systemu "${systemId}" (${chars.length}):\n`);
  for (const c of chars) {
    const status = classifyStatblock(c.sb.body, template, snapshot);
    counts[status]++;
    console.log(`  [${status.padEnd(26)}] ${c.rel}`);
  }
  console.log(`\nPodsumowanie:`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(28)} ${v}`);
  const emptyTotal = counts["empty-identical-template"] + counts["empty-identical-snapshot"] + counts["empty-placeholders"];
  console.log(`\n  => bezpieczne do auto-replace: ${emptyTotal}`);
  console.log(`  => wymagaja recznej migracji:   ${counts.filled}`);
}

async function cmdApply(systemId, opts) {
  const template = await loadTemplate(systemId);
  if (template == null) {
    console.error(`Brak szablonu: vault/templates/statblocks/${systemId}.md`);
    process.exit(1);
  }
  const snapshot = opts.snapshot ? await readFile(opts.snapshot, "utf-8") : null;
  const templateBody = template.replace(/\s+$/, "");

  const all = await findCharacterFiles();
  const chars = all.filter(c => c.systemId === systemId && (!opts.file || c.rel === opts.file || c.path === opts.file));
  if (chars.length === 0) {
    console.log(`Brak postaci z markerem <!-- SYSTEM: ${systemId} -->.`);
    return;
  }

  let updated = 0;
  const skippedFilled = [];
  for (const c of chars) {
    const status = classifyStatblock(c.sb.body, template, snapshot);
    const shouldUpdate = opts.force || (opts.onlyEmpty && isEmptyStatus(status));
    if (!shouldUpdate) {
      skippedFilled.push({ rel: c.rel, status });
      continue;
    }
    // Zbuduj nowa zawartosc: zachowaj wszystko do i wlacznie z linia markera,
    // wstaw szablon, zachowaj linie od bodyEnd (czyli od kolejnego "## ").
    const lines = c.sb.lines;
    const before = lines.slice(0, c.sb.bodyStart);
    const after = lines.slice(c.sb.bodyEnd);
    const newLines = [...before, templateBody, "", ...after];
    const newContent = newLines.join("\n");
    if (newContent === c.content) {
      // nic do zapisania (body juz identyczny z templateBody po dopasowaniu whitespace)
      continue;
    }
    console.log(`  [${opts.apply ? "UPDATE" : "WOULD UPDATE"}] ${c.rel} (${status})`);
    if (opts.apply) await writeFile(c.path, newContent, "utf-8");
    updated++;
  }

  console.log(`\n${opts.apply ? "APPLIED" : "DRY-RUN"}: zaktualizowane ${updated}, pominiete ${skippedFilled.length}`);
  if (skippedFilled.length > 0) {
    console.log(`\nPominiete (wypelnione — wymagaja recznej migracji):`);
    for (const s of skippedFilled) console.log(`  [${s.status}] ${s.rel}`);
    console.log(`\nAby wymusic: --force (uwaga: zniszczy dane uzytkownika).`);
    console.log(`Aby zawezic do jednego pliku: --file "<sciezka>".`);
  }
  if (!opts.apply && updated > 0) {
    console.log(`\nUruchom z --apply aby zapisac zmiany.`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.command) {
    console.error("Uzycie: node scripts/apply-statblock.mjs <list|diff|apply> [system-id] [opcje]");
    process.exit(2);
  }
  if (opts.command === "list") { await cmdList(); return; }
  if (!opts.systemId) {
    console.error(`Komenda "${opts.command}" wymaga argumentu <system-id>.`);
    process.exit(2);
  }
  if (!SYSTEM_NAMES[opts.systemId]) {
    console.error(`Ostrzezenie: system "${opts.systemId}" nie jest w SYSTEM_NAMES (scripts/schema.mjs).`);
  }
  if (opts.command === "diff") { await cmdDiff(opts.systemId, opts); return; }
  if (opts.command === "apply") { await cmdApply(opts.systemId, opts); return; }
  console.error(`Nieznana komenda: ${opts.command}`);
  process.exit(2);
}

main().catch(err => { console.error(err); process.exit(1); });
