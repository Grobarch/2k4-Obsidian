#!/usr/bin/env node
/**
 * migrate-wolsung.mjs — jednorazowa migracja postaci Wolsung.
 *
 * Parsuje sekcję "### Dane surowe" w statblocku i wstawia wartości do nowego
 * szablonu (atrybuty w tabeli + umiejętności jako lista).
 *
 * Użycie:
 *   node scripts/migrate-wolsung.mjs           # dry-run
 *   node scripts/migrate-wolsung.mjs --apply   # zapisz
 */

import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(process.cwd());
const DIRS = [
  "vault/Encyklopedia/Bohaterowie Graczy",
  "vault/Encyklopedia/Bohaterowie Niezalezni",
];

const MARKER = "<!-- SYSTEM: wolsung -->";

function parseDaneSurowe(block) {
  // Znajdź sekcję "### Dane surowe" w bloku statblocka
  const m = block.match(/###\s*Dane surowe\s*\n+([\s\S]*?)(?=\n##|\n---|$)/);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, " ").trim();

  // "Atrybuty: Krzepa X+, Zręczność Y+, ..., Umiejętności: A 3, B 6, ..."
  const atrMatch = raw.match(/Atrybuty:\s*([^]+?)\s*Umiejętności:/);
  const skillsMatch = raw.match(/Umiejętności:\s*(.+?)$/);
  if (!atrMatch || !skillsMatch) return null;

  const atrs = {};
  for (const part of atrMatch[1].split(",")) {
    const p = part.trim();
    if (!p) continue;
    const mm = p.match(/^(Krzepa|Zręczność|Przenikliwość|Charyzma|Opanowanie)\s+(.+)$/);
    if (mm) atrs[mm[1]] = mm[2].trim();
  }

  const skills = skillsMatch[1].replace(/,\s*$/, "").trim();
  return { atrs, skills };
}

function buildStatblock({ atrs, skills }) {
  const row = (name) => `| ${name.padEnd(13)} | ${(atrs[name] || "—").padStart(5).padEnd(5)}   |`;
  return `| Atrybut       | Wartość |
|---------------|:-------:|
${row("Krzepa")}
${row("Zręczność")}
${row("Przenikliwość")}
${row("Charyzma")}
${row("Opanowanie")}

**Archetyp:** — **Rasa:** — **Przynależność / Loża:** —

**Maniera:** — **Motto:** —

---

**Umiejętności:** ${skills}

**Atuty:** —

**Wyczyny (Akcje specjalne):** —

**Magia / Nauka / Gadżety:** —

---

**Żywotność:**

\`○ ○ ○\` Siniaki · \`○ ○ ○\` Rany · \`○\` Ciężka rana · \`○\` Martwy

**Inicjatywa:** — **Obrona:** — **Odporność:** —

| Broń | Obrażenia | Zasięg | Właściwości |
|------|:---------:|--------|-------------|
|      |           |        |             |

**Pancerz / Strój ochronny:** —

---

**Ekwipunek:** —

**Gadżety / Wynalazki:** —

**Funty / Szylingi / Pensy:** — / — / —
`;
}

function processFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const idx = src.indexOf(MARKER);
  if (idx < 0) return { file, status: "no-marker" };

  // Blok statblocka: od markera do następnego "## " (heading nadrzędny)
  const after = src.slice(idx + MARKER.length);
  const nextH2 = after.search(/\n##\s/);
  if (nextH2 < 0) return { file, status: "no-next-h2" };

  const block = after.slice(0, nextH2);
  const parsed = parseDaneSurowe(block);
  if (!parsed) return { file, status: "parse-fail" };

  const newBlock = "\n" + buildStatblock(parsed) + "\n";
  const newSrc = src.slice(0, idx + MARKER.length) + newBlock + after.slice(nextH2);

  if (APPLY) {
    fs.writeFileSync(file, newSrc, "utf8");
  }
  return { file, status: "migrated", atrs: parsed.atrs, skillsCount: parsed.skills.split(",").length };
}

function findWolsungFiles() {
  const out = [];
  for (const d of DIRS) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (!f.endsWith(".md")) continue;
      const p = path.join(abs, f);
      const s = fs.readFileSync(p, "utf8");
      if (s.includes(MARKER)) out.push(p);
    }
  }
  return out;
}

const files = findWolsungFiles();
console.log(`Znaleziono ${files.length} postaci Wolsung.\n`);

let migrated = 0, failed = 0;
for (const f of files) {
  const r = processFile(f);
  const rel = path.relative(ROOT, r.file);
  if (r.status === "migrated") {
    migrated++;
    console.log(`[${APPLY ? "APPLY" : "DRY"}] ${rel} (${r.skillsCount} umiejętności)`);
  } else {
    failed++;
    console.log(`[FAIL:${r.status}] ${rel}`);
  }
}

console.log(`\n${APPLY ? "Zapisano" : "Dry-run"}: migrated=${migrated}, failed=${failed}`);
if (!APPLY) console.log("Uruchom z --apply aby zapisać zmiany.");
