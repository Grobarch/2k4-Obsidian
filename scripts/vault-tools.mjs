#!/usr/bin/env node
/**
 * vault-tools.mjs — CLI do masowych operacji na frontmatter plików vault
 *
 * Domyślnie działa w trybie dry-run. Aby zapisać zmiany, dodaj --apply.
 *
 * Użycie:
 *   node scripts/vault-tools.mjs <komenda> [argumenty] [opcje]
 *
 * Komendy:
 *   list                                  — listuj pliki i ich frontmatter
 *   validate                              — raport brakujących/niepoprawnych pól
 *   normalize                             — napraw frontmatter do kanonicznego formatu
 *   rename-field <stare> <nowe>           — zmień nazwę pola YAML
 *   set-field <pole> <wartość>            — ustaw pole na wartość
 *   delete-field <pole>                   — usuń pole z frontmatter
 *   migrate-to-array <pole>              — konwertuj skalarne pole na tablicę [wartość]
 *
 * Opcje:
 *   --where "pole=wartość"               — filtruj po frontmatter (wielokrotne)
 *   --type <typ>                          — skrót do --where "type=<typ>"
 *   --dir <ścieżka>                       — folder do przeszukania (domyślnie: vault/)
 *   --dry-run                             — pokaż co by się zmieniło (domyślne!)
 *   --apply                               — faktycznie zapisz zmiany
 */

import { readFile, writeFile } from "node:fs/promises";
import { relative, dirname, basename } from "node:path";
import { findMdFiles, parseFrontmatter, extractRawFrontmatter, slugify, setFieldIfAbsentInYaml } from "./shared.mjs";
import { TYPE_SCHEMAS, SYSTEM_NAMES } from "./schema.mjs";

// ─── Parsowanie argumentów ───────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    command: null,
    positional: [],
    where: [],
    type: null,
    dir: "vault",
    apply: false,
  };

  let i = 0;
  if (args.length > 0 && !args[0].startsWith("--")) {
    opts.command = args[0];
    i = 1;
  }

  while (i < args.length) {
    const arg = args[i];
    if (arg === "--where" && i + 1 < args.length) {
      opts.where.push(args[++i]);
    } else if (arg === "--type" && i + 1 < args.length) {
      opts.type = args[++i];
    } else if (arg === "--dir" && i + 1 < args.length) {
      opts.dir = args[++i];
    } else if (arg === "--apply") {
      opts.apply = true;
    } else if (arg === "--dry-run") {
      opts.apply = false;
    } else if (!arg.startsWith("--")) {
      opts.positional.push(arg);
    }
    i++;
  }

  if (opts.type) {
    opts.where.push(`type=${opts.type}`);
  }

  return opts;
}

// ─── Filtrowanie ─────────────────────────────────────────────────────────────

function parseWhereClause(clause) {
  const eq = clause.indexOf("=");
  if (eq === -1) return null;
  return { field: clause.slice(0, eq), value: clause.slice(eq + 1) };
}

function matchesFilters(frontmatter, whereFilters) {
  for (const clause of whereFilters) {
    const filter = parseWhereClause(clause);
    if (!filter) continue;
    const val = frontmatter[filter.field];
    if (Array.isArray(val)) {
      if (!val.includes(filter.value)) return false;
    } else {
      if (String(val || "") !== filter.value) return false;
    }
  }
  return true;
}

// ─── Modyfikacja frontmatter (tekstowa — zachowuje formatowanie) ─────────────

function replaceFrontmatterInContent(content, newFrontmatterYaml) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${newFrontmatterYaml}\n---`);
}

function renameFieldInYaml(yaml, oldName, newName) {
  const regex = new RegExp(`^(${escapeRegex(oldName)})(:\\s)`, "m");
  if (!regex.test(yaml)) return null;
  return yaml.replace(regex, `${newName}$2`);
}

function setFieldInYaml(yaml, fieldName, value) {
  // Determine if value looks like an array
  const isArray = value.startsWith("[") && value.endsWith("]");
  const formattedValue = isArray ? value : `"${value}"`;

  const regex = new RegExp(`^(${escapeRegex(fieldName)}:)\\s*.*$`, "m");
  if (regex.test(yaml)) {
    // Replace existing — also remove subsequent list items if field was multi-line array
    let result = yaml.replace(regex, `$1 ${formattedValue}`);
    // Remove any trailing "  - item" lines that belonged to old multi-line array
    const lines = result.split(/\r?\n/);
    const newLines = [];
    let skipListItems = false;
    for (const line of lines) {
      if (skipListItems) {
        if (/^\s+-\s+/.test(line)) continue;
        skipListItems = false;
      }
      if (line.match(new RegExp(`^${escapeRegex(fieldName)}:\\s`)) && !isArray) {
        skipListItems = true;
      }
      newLines.push(line);
    }
    return newLines.join("\n");
  }
  // Append new field at end
  return yaml.trimEnd() + `\n${fieldName}: ${formattedValue}`;
}

function deleteFieldInYaml(yaml, fieldName) {
  const lines = yaml.split(/\r?\n/);
  const result = [];
  let skipping = false;
  for (const line of lines) {
    if (line.match(new RegExp(`^${escapeRegex(fieldName)}:\\s*`))) {
      skipping = true;
      continue;
    }
    if (skipping) {
      // Skip continuation lines (multi-line array items)
      if (/^\s+-\s+/.test(line)) continue;
      skipping = false;
    }
    result.push(line);
  }
  if (result.length === lines.length) return null; // nothing removed
  return result.join("\n");
}

function migrateToArrayInYaml(yaml, fieldName) {
  const lines = yaml.split(/\r?\n/);
  const result = [];
  let found = false;
  for (const line of lines) {
    const match = line.match(new RegExp(`^(${escapeRegex(fieldName)}:\\s*)(.+)$`));
    if (match) {
      const val = match[2].trim();
      // Skip if already an array
      if (val.startsWith("[")) {
        result.push(line);
      } else {
        // Strip quotes if present
        const clean = val.replace(/^["']|["']$/g, "");
        result.push(`${match[1]}["${clean}"]`);
        found = true;
      }
    } else {
      result.push(line);
    }
  }
  return found ? result.join("\n") : null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Komendy ─────────────────────────────────────────────────────────────────

async function cmdList(files, opts) {
  console.log(`\nZnaleziono ${files.length} plików:\n`);
  for (const f of files) {
    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    const fm = f.frontmatter;
    const fields = Object.entries(fm)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? JSON.stringify(v) : v}`)
      .join("  ");
    console.log(`  ${rel}`);
    console.log(`    ${fields}`);
  }
}

async function cmdValidate(files, opts) {
  let issues = 0;
  for (const f of files) {
    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    const fm = f.frontmatter;
    const type = fm.type || "(brak type)";
    const schema = TYPE_SCHEMAS[type];
    const required = schema ? schema.required : ["title", "type"];
    const missing = required.filter((field) => !fm[field] || fm[field] === "");
    if (missing.length > 0) {
      console.log(`  ⚠ ${rel}`);
      console.log(`    type: ${type}  brakuje: ${missing.join(", ")}`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log(`\n✅ Wszystkie ${files.length} plików przeszły walidację.`);
  } else {
    console.log(`\n⚠ ${issues}/${files.length} plików ma braki.`);
  }
}

async function cmdRenameField(files, opts) {
  const [oldName, newName] = opts.positional;
  if (!oldName || !newName) {
    console.error("Użycie: rename-field <stare-pole> <nowe-pole>");
    process.exit(1);
  }

  let affected = 0;
  for (const f of files) {
    const rawYaml = extractRawFrontmatter(f.content);
    if (!rawYaml) continue;
    const modified = renameFieldInYaml(rawYaml, oldName, newName);
    if (modified === null) continue;

    affected++;
    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    console.log(`  ${rel}: ${oldName} → ${newName}`);

    if (opts.apply) {
      const newContent = replaceFrontmatterInContent(f.content, modified);
      await writeFile(f.path, newContent, "utf-8");
    }
  }

  printSummary("rename-field", affected, files.length, opts.apply);
}

async function cmdSetField(files, opts) {
  const [fieldName, value] = opts.positional;
  if (!fieldName || value === undefined) {
    console.error('Użycie: set-field <pole> <wartość>');
    process.exit(1);
  }

  let affected = 0;
  for (const f of files) {
    const rawYaml = extractRawFrontmatter(f.content);
    if (!rawYaml) continue;
    const modified = setFieldInYaml(rawYaml, fieldName, value);

    // Check if actually changed
    if (modified === rawYaml) continue;

    affected++;
    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    const oldVal = f.frontmatter[fieldName] || "(brak)";
    console.log(`  ${rel}: ${fieldName}=${oldVal} → ${value}`);

    if (opts.apply) {
      const newContent = replaceFrontmatterInContent(f.content, modified);
      await writeFile(f.path, newContent, "utf-8");
    }
  }

  printSummary("set-field", affected, files.length, opts.apply);
}

async function cmdDeleteField(files, opts) {
  const [fieldName] = opts.positional;
  if (!fieldName) {
    console.error("Użycie: delete-field <pole>");
    process.exit(1);
  }

  let affected = 0;
  for (const f of files) {
    const rawYaml = extractRawFrontmatter(f.content);
    if (!rawYaml) continue;
    const modified = deleteFieldInYaml(rawYaml, fieldName);
    if (modified === null) continue;

    affected++;
    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    console.log(`  ${rel}: usunięto ${fieldName}`);

    if (opts.apply) {
      const newContent = replaceFrontmatterInContent(f.content, modified);
      await writeFile(f.path, newContent, "utf-8");
    }
  }

  printSummary("delete-field", affected, files.length, opts.apply);
}

async function cmdMigrateToArray(files, opts) {
  const [fieldName] = opts.positional;
  if (!fieldName) {
    console.error("Użycie: migrate-to-array <pole>");
    process.exit(1);
  }

  let affected = 0;
  for (const f of files) {
    const rawYaml = extractRawFrontmatter(f.content);
    if (!rawYaml) continue;
    const modified = migrateToArrayInYaml(rawYaml, fieldName);
    if (modified === null) continue;

    affected++;
    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    const oldVal = f.frontmatter[fieldName] || "(brak)";
    console.log(`  ${rel}: ${fieldName}: ${oldVal} → [${oldVal}]`);

    if (opts.apply) {
      const newContent = replaceFrontmatterInContent(f.content, modified);
      await writeFile(f.path, newContent, "utf-8");
    }
  }

  printSummary("migrate-to-array", affected, files.length, opts.apply);
}

async function cmdNormalize(files, opts) {
  let affected = 0;
  const warnings = [];

  for (const f of files) {
    const fm = f.frontmatter;
    const type = fm.type;
    if (!type || !TYPE_SCHEMAS[type]) continue;

    const schema = TYPE_SCHEMAS[type];
    let yaml = extractRawFrontmatter(f.content);
    if (!yaml) continue;

    const rel = relative(opts.dir, f.path).replace(/\\/g, "/");
    const mutations = [];

    // Re-parse frontmatter after each YAML mutation to keep fm in sync
    function reParse() {
      return parseFrontmatter(replaceFrontmatterInContent(f.content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${yaml}\n---`), yaml));
    }

    // ── Pass 1: Migrate scalar → array ──────────────────────────────────
    for (const field of schema.arrayFields) {
      if (fm[field] && !Array.isArray(fm[field])) {
        const result = migrateToArrayInYaml(yaml, field);
        if (result !== null) {
          yaml = result;
          mutations.push(`  ${field}: "${fm[field]}" → ["${fm[field]}"]  [migrate-to-array]`);
        }
      }
    }

    // ── Pass 2: Compute missing values ──────────────────────────────────

    // 2a: system_pelna from SYSTEM_NAMES
    if (schema.computed.includes("system_pelna") && !fm.system_pelna && fm.system) {
      const pelna = SYSTEM_NAMES[fm.system];
      if (pelna) {
        yaml = setFieldInYaml(yaml, "system_pelna", pelna);
        mutations.push(`  system_pelna: (brak) → "${pelna}"  [computed]`);
      }
    }

    // 2b: tags — ensure [type, system] are present
    if (schema.computed.includes("tags")) {
      const currentTags = Array.isArray(fm.tags) ? fm.tags : [];
      const requiredTags = [type];
      if (fm.system) requiredTags.push(fm.system);
      const missingTags = requiredTags.filter((t) => !currentTags.includes(t));
      if (missingTags.length > 0) {
        const newTags = [...currentTags, ...missingTags];
        const formatted = `[${newTags.map((t) => `"${t}"`).join(", ")}]`;
        yaml = setFieldInYaml(yaml, "tags", formatted);
        mutations.push(`  tags: +[${missingTags.join(", ")}]  [computed]`);
      }
    }

    // 2c: kampania_link for epizod — derive from parent folder path
    if (type === "epizod" && schema.computed.includes("kampania_link") && !fm.kampania_link) {
      const parentDir = dirname(f.path);
      const relFromDir = relative(opts.dir, parentDir).replace(/\\/g, "/");
      const kampaniaLink = "/" + slugify(relFromDir);
      yaml = setFieldInYaml(yaml, "kampania_link", kampaniaLink);
      mutations.push(`  kampania_link: (brak) → "${kampaniaLink}"  [computed]`);
    }

    // 2d: kampania for epizod — derive from parent folder name
    if (type === "epizod" && schema.computed.includes("kampania") && !fm.kampania) {
      const parentFolderName = basename(dirname(f.path));
      const kampaniaSlug = slugify(parentFolderName);
      yaml = setFieldInYaml(yaml, "kampania", kampaniaSlug);
      mutations.push(`  kampania: (brak) → "${kampaniaSlug}"  [computed]`);
    }

    // ── Pass 3: Fill defaults for missing required fields ───────────────
    for (const field of schema.required) {
      if ((!fm[field] || fm[field] === "") && schema.defaults[field]) {
        const result = setFieldIfAbsentInYaml(yaml, field, schema.defaults[field]);
        if (result !== null) {
          yaml = result;
          mutations.push(`  ${field}: (brak) → "${schema.defaults[field]}"  [default]`);
        }
      }
    }

    // ── Pass 4: Warnings for missing required without defaults ──────────
    for (const field of schema.required) {
      if ((!fm[field] || fm[field] === "") && !schema.defaults[field] && !schema.computed.includes(field)) {
        warnings.push(`  ⚠ ${rel}: brakuje ${field} (wymagane, brak default)`);
      }
    }

    // ── Apply ───────────────────────────────────────────────────────────
    if (mutations.length > 0) {
      affected++;
      console.log(`\n  ${rel}:`);
      for (const m of mutations) console.log(m);

      if (opts.apply) {
        const newContent = replaceFrontmatterInContent(f.content, yaml);
        await writeFile(f.path, newContent, "utf-8");
      }
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log(`\nOstrzeżenia:`);
    for (const w of warnings) console.log(w);
  }

  printSummary("normalize", affected, files.length, opts.apply);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function printSummary(cmd, affected, total, applied) {
  const mode = applied ? "ZAPISANO" : "DRY-RUN";
  console.log(`\n[${mode}] ${cmd}: ${affected}/${total} plików ${applied ? "zmodyfikowano" : "do zmodyfikowania"}.`);
  if (!applied && affected > 0) {
    console.log("Dodaj --apply aby zapisać zmiany.");
  }
}

function printHelp() {
  console.log(`
vault-tools.mjs — Masowe operacje na frontmatter plików vault

Użycie:
  node scripts/vault-tools.mjs <komenda> [argumenty] [opcje]

Komendy:
  list                               Listuj pliki i ich frontmatter
  validate                           Raport brakujących pól
  normalize                          Napraw frontmatter do kanonicznego formatu
  rename-field <stare> <nowe>        Zmień nazwę pola YAML
  set-field <pole> <wartość>         Ustaw pole na wartość
  delete-field <pole>                Usuń pole z frontmatter
  migrate-to-array <pole>            Konwertuj skalarne pole na tablicę

Opcje:
  --where "pole=wartość"    Filtruj po frontmatter (można użyć wielokrotnie)
  --type <typ>              Skrót do --where "type=<typ>"
  --dir <ścieżka>           Folder do przeszukania (domyślnie: vault/)
  --dry-run                 Pokaż co by się zmieniło (domyślne!)
  --apply                   Faktycznie zapisz zmiany

Przykłady:
  node scripts/vault-tools.mjs normalize
  node scripts/vault-tools.mjs normalize --type bohater-gracza --apply
  node scripts/vault-tools.mjs list --type bohater-gracza
  node scripts/vault-tools.mjs validate --type bohater-gracza
  node scripts/vault-tools.mjs rename-field archetyp archetype --where "system=l5k"
  node scripts/vault-tools.mjs set-field system_pelna "Cold City" --where "system=cold-city"
  node scripts/vault-tools.mjs delete-field stare_pole --type epizod
  node scripts/vault-tools.mjs migrate-to-array kampania --type bohater-niezalezny --apply
`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const COMMANDS = {
  list: cmdList,
  validate: cmdValidate,
  normalize: cmdNormalize,
  "rename-field": cmdRenameField,
  "set-field": cmdSetField,
  "delete-field": cmdDeleteField,
  "migrate-to-array": cmdMigrateToArray,
};

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.command || !COMMANDS[opts.command]) {
    printHelp();
    process.exit(opts.command ? 1 : 0);
  }

  console.log(`\nSkanowanie ${opts.dir}...`);
  const allPaths = await findMdFiles(opts.dir);

  // Load all files with frontmatter (skip templates/ and .excalidraw.md)
  const allFiles = [];
  for (const p of allPaths) {
    const rel = relative(opts.dir, p).replace(/\\/g, "/").toLowerCase();
    if (rel.startsWith("templates/")) continue;
    if (p.endsWith(".excalidraw.md")) continue;
    const content = await readFile(p, "utf-8");
    const frontmatter = parseFrontmatter(content);
    if (Object.keys(frontmatter).length > 0) {
      allFiles.push({ path: p, content, frontmatter });
    }
  }

  // Filter
  const filtered = allFiles.filter((f) => matchesFilters(f.frontmatter, opts.where));

  console.log(`Plików z frontmatter: ${allFiles.length}, po filtrach: ${filtered.length}`);

  if (filtered.length === 0) {
    console.log("Brak plików spełniających filtry.");
    process.exit(0);
  }

  await COMMANDS[opts.command](filtered, opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
