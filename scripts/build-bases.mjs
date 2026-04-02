#!/usr/bin/env node
/**
 * build-bases.mjs
 *
 * Zastępuje osadzenia Obsidian Bases statycznymi tabelami markdown.
 * Przeznaczony do uruchamiania na quartz/content/ (CI) lub vault/ (lokalnie).
 *
 * Obsługiwane wzorce w plikach .md:
 *   ![[Plik.base]]          — wikilink embed pliku .base
 *   ```base ... ```         — inline code block z YAML bases
 *
 * Użycie:
 *   node scripts/build-bases.mjs [katalog]
 *
 * Domyślnie: vault
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, relative, resolve } from "node:path";
import { findMdFiles, parseFrontmatter, slugify } from "./shared.mjs";

const targetDir = resolve(process.argv[2] || "vault");

// ---------------------------------------------------------------------------
// Parser YAML .base (bez zewnętrznych zależności)
// ---------------------------------------------------------------------------

/**
 * Usuwa prefiksy blockquote (">") jeśli cały YAML pochodzi z callout.
 */
function stripBlockquotePrefixes(yaml) {
  const lines = yaml.split(/\r?\n/);
  if (lines.every(l => l.startsWith(">") || l.trim() === "")) {
    return lines.map(l => l.startsWith(">") ? l.slice(1) : l).join("\n");
  }
  return yaml;
}

/**
 * Parsuje plik .base (YAML) do struktury:
 *   { filters: { and: [...], or: [...] }, views: [{ type, name, order, sort, filters }] }
 */
function parseBaseYaml(text) {
  text = stripBlockquotePrefixes(text);
  const lines = text.split(/\r?\n/);
  const result = { filters: { and: [], or: [] }, views: [] };

  let section = null;        // 'filters' | 'views'
  let filterKey = null;      // 'and' | 'or'
  let currentView = null;
  let viewSection = null;    // 'order' | 'sort' | 'filters_and' | 'filters_or' | null

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Top-level keys
    if (/^filters:/.test(trimmed)) { section = "filters"; currentView = null; continue; }
    if (/^views:/.test(trimmed))   { section = "views";   currentView = null; continue; }
    if (/^\w/.test(trimmed) && trimmed.includes(":")) { section = null; continue; }

    if (section === "filters") {
      if (/^\s{2}and:/.test(trimmed)) { filterKey = "and"; continue; }
      if (/^\s{2}or:/.test(trimmed))  { filterKey = "or";  continue; }
      if (filterKey && /^\s{4}-\s/.test(trimmed)) {
        const expr = trimmed.replace(/^\s{4}-\s+/, "").trim();
        result.filters[filterKey].push(expr);
        continue;
      }
    }

    if (section === "views") {
      // Nowy element listy views
      if (/^\s{2}-\s+type:/.test(trimmed)) {
        const typeMatch = trimmed.match(/type:\s*(.+)/);
        currentView = { type: typeMatch ? typeMatch[1].trim() : "table", name: "", order: [], sort: [], filters: { and: [], or: [] } };
        result.views.push(currentView);
        viewSection = null;
        continue;
      }
      if (!currentView) continue;

      if (/^\s{4}name:/.test(trimmed)) {
        currentView.name = trimmed.replace(/^\s{4}name:\s*/, "").trim();
        viewSection = null;
        continue;
      }
      if (/^\s{4}order:/.test(trimmed))   { viewSection = "order";   continue; }
      if (/^\s{4}sort:/.test(trimmed))    { viewSection = "sort";    continue; }
      if (/^\s{4}filters:/.test(trimmed)) { viewSection = "filters"; continue; }

      if (viewSection === "order" && /^\s{6}-\s/.test(trimmed)) {
        currentView.order.push(trimmed.replace(/^\s{6}-\s+/, "").trim());
        continue;
      }
      if (viewSection === "sort" && /^\s{6}-\s+property:/.test(trimmed)) {
        const prop = trimmed.match(/property:\s*(.+)/);
        currentView.sort.push({ property: prop ? prop[1].trim() : "", direction: "ASC" });
        continue;
      }
      if (viewSection === "sort" && /^\s{8}direction:/.test(trimmed)) {
        if (currentView.sort.length > 0) {
          currentView.sort[currentView.sort.length - 1].direction =
            trimmed.replace(/^\s{8}direction:\s*/, "").trim().toUpperCase();
        }
        continue;
      }
      if (viewSection === "filters") {
        if (/^\s{6}and:/.test(trimmed)) { viewSection = "filters_and"; continue; }
        if (/^\s{6}or:/.test(trimmed))  { viewSection = "filters_or";  continue; }
      }
      if (viewSection === "filters_and" && /^\s{8}-\s/.test(trimmed)) {
        currentView.filters.and.push(trimmed.replace(/^\s{8}-\s+/, "").trim());
        continue;
      }
      if (viewSection === "filters_or" && /^\s{8}-\s/.test(trimmed)) {
        currentView.filters.or.push(trimmed.replace(/^\s{8}-\s+/, "").trim());
        continue;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Filtrowanie notatek
// ---------------------------------------------------------------------------

/**
 * Parsuje expression string do obiektu { field, op, value }.
 * Obsługuje: field == "val", field == ["v1","v2"], field != val,
 *            file.inFolder("path") (jako specjalny przypadek)
 * Zwraca { unsupported: true } dla wyrażeń z nieznanymi funkcjami.
 */
function parseExpr(expr) {
  // Specjalne funkcje: file.inFolder("path")
  const folderMatch = expr.match(/^file\.inFolder\(["'](.+?)["']\)$/);
  if (folderMatch) return { special: "inFolder", path: folderMatch[1] };

  // Nieobsługiwane — wyrażenia z dowolnymi wywołaniami funkcji lub this.*
  if (/\(/.test(expr) || /\bthis\b/.test(expr)) {
    return { unsupported: true, expr };
  }

  const m = expr.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!m) return null;

  let [, field, op, rawVal] = m;
  rawVal = rawVal.trim();

  let value;
  if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
    value = rawVal.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
  } else if ((rawVal.startsWith('"') && rawVal.endsWith('"')) ||
             (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
    value = rawVal.slice(1, -1);
  } else {
    value = rawVal;
  }

  return { field, op, value };
}

/**
 * Sprawdza czy pojedyncze wyrażenie pasuje do frontmatter + ścieżki pliku.
 */
function matchExpr(expr, fm, filePath, vaultRoot) {
  const parsed = parseExpr(expr);
  if (!parsed) return false;
  if (parsed.unsupported) throw new Error(`unsupported:${parsed.expr}`);

  // Specjalna: file.inFolder
  if (parsed.special === "inFolder") {
    const rel = relative(vaultRoot, dirname(filePath)).replace(/\\/g, "/").toLowerCase();
    return rel.includes(parsed.path.toLowerCase());
  }

  const { field, op, value } = parsed;

  // file.* properties
  let fmVal;
  if (field.startsWith("file.")) {
    const prop = field.slice(5);
    const base = filePath.replace(/\\/g, "/").split("/").pop();
    switch (prop) {
      case "name":     fmVal = base; break;
      case "basename": fmVal = base.replace(/\.md$/i, ""); break;
      case "folder":   fmVal = relative(vaultRoot, dirname(filePath)).replace(/\\/g, "/"); break;
      default:         fmVal = undefined;
    }
  } else {
    fmVal = fm[field];
  }

  if (fmVal === undefined || fmVal === null || fmVal === "") return false;

  const fmArr = Array.isArray(fmVal) ? fmVal : [String(fmVal)];
  const valueArr = Array.isArray(value) ? value : [String(value)];

  if (op === "==") return valueArr.some(v => fmArr.map(String).includes(v));
  if (op === "!=") return !valueArr.some(v => fmArr.map(String).includes(v));

  // Comparison operators — compare as dates if YYYY-MM-DD, otherwise as strings
  const cmpVal = String(value);
  const fmStr = String(fmVal);
  const isDate = /^\d{4}-\d{2}-\d{2}/.test(cmpVal) && /^\d{4}-\d{2}-\d{2}/.test(fmStr);
  const a = isDate ? new Date(fmStr) : fmStr;
  const b = isDate ? new Date(cmpVal) : cmpVal;
  if (op === ">")  return a > b;
  if (op === "<")  return a < b;
  if (op === ">=") return a >= b;
  if (op === "<=") return a <= b;
  return false;
}

/**
 * Sprawdza czy plik pasuje do zestawu filtrów (and + or).
 * Globalne filtry AND view-specific filtry (AND-łączone).
 * Rzuca Error("unsupported:...") gdy filtr zawiera nieobsługiwane wyrażenie.
 */
function matchesFilters(globalFilters, viewFilters, fm, filePath, vaultRoot) {
  const andConds = [...(globalFilters.and || []), ...(viewFilters?.and || [])];
  const orConds  = [...(globalFilters.or  || []), ...(viewFilters?.or  || [])];

  if (andConds.length > 0) {
    if (!andConds.every(e => matchExpr(e, fm, filePath, vaultRoot))) return false;
  }
  if (orConds.length > 0) {
    if (!orConds.some(e => matchExpr(e, fm, filePath, vaultRoot))) return false;
  }
  return true;
}

/**
 * Sprawdza czy konfiguracja .base zawiera nieobsługiwane wyrażenia.
 * Zwraca nazwę wyrażenia lub null.
 */
function findUnsupportedExpr(baseConfig) {
  const view = baseConfig.views[0];
  const allExprs = [
    ...(baseConfig.filters.and || []),
    ...(baseConfig.filters.or || []),
    ...(view?.filters?.and || []),
    ...(view?.filters?.or || []),
  ];
  for (const expr of allExprs) {
    const p = parseExpr(expr);
    if (p && p.unsupported) return expr;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generowanie tabeli
// ---------------------------------------------------------------------------

/** Nagłówki przyjazne dla kolumn frontmatter */
const COLUMN_HEADERS = {
  title: "Tytuł", data: "Data", system_pelna: "System", system: "System",
  kampania: "Kampania", gracz: "Gracz", archetyp: "Archetyp",
  type: "Typ", mg: "MG", gatunek: "Gatunek", wydawca: "Wydawca",
  "file.name": "Tytuł", "file.basename": "Tytuł",
};

/**
 * Zwraca wartość kolumny dla wiersza (frontmatter + file.* props).
 */
function getCellValue(col, fm, filePath, vaultRoot) {
  if (col.startsWith("file.")) {
    const prop = col.slice(5);
    const base = filePath.replace(/\\/g, "/").split("/").pop();
    switch (prop) {
      case "name":     return base;
      case "basename": return base.replace(/\.md$/i, "");
      case "folder":   return relative(vaultRoot, dirname(filePath)).replace(/\\/g, "/");
      default:         return "";
    }
  }
  const val = fm[col];
  if (Array.isArray(val)) return val.join(", ");
  return val !== undefined && val !== null ? String(val) : "";
}

/**
 * Buduje absolutny URL do pliku (względem vault root, przez slugify).
 */
function buildUrl(filePath, vaultRoot) {
  const rel = relative(vaultRoot, filePath).replace(/\\/g, "/");
  return "/" + slugify(rel);
}

/**
 * Sortuje matchedFiles in-place wg sortSpec z view.
 */
function sortFiles(matchedFiles, sortSpec, vaultRoot) {
  if (sortSpec.length === 0) return;
  matchedFiles.sort((a, b) => {
    for (const { property, direction } of sortSpec) {
      const va = getCellValue(property, a.fm, a.path, vaultRoot);
      const vb = getCellValue(property, b.fm, b.path, vaultRoot);
      const cmp = va.localeCompare(vb, "pl");
      if (cmp !== 0) return direction === "DESC" ? -cmp : cmp;
    }
    return 0;
  });
}

/**
 * Zwraca kolumny na podstawie view.order.
 * Jeśli brak order lub pusty, zwraca ["file.name"].
 */
function resolveColumns(view) {
  let columns = (view.order || []).filter(c => !c.startsWith("file.ctime") && !c.startsWith("file.mtime"));
  if (columns.length === 0) {
    columns = ["file.name"];
  }
  return columns;
}

/**
 * Generuje tabelę markdown z pasujących plików.
 * Kolumny file.name / file.basename → link do pliku z fm.title jako etykietą.
 */
function generateTable(baseConfig, matchedFiles, vaultRoot) {
  const view = baseConfig.views[0] || {};
  const columns = resolveColumns(view);

  sortFiles(matchedFiles, view.sort || [], vaultRoot);

  if (matchedFiles.length === 0) {
    return "_Brak wyników._\n";
  }

  const headers = columns.map(c => COLUMN_HEADERS[c] || c);
  const sep     = columns.map(() => "---");

  const rows = matchedFiles.map(({ fm, path }) => {
    return columns.map(col => {
      if (col === "file.name" || col === "file.basename") {
        const url   = buildUrl(path, vaultRoot);
        const label = cleanFmVal(fm.title || path.replace(/\\/g, "/").split("/").pop().replace(/\.md$/i, ""));
        return `[${label}](${url})`;
      }
      return getCellValue(col, fm, path, vaultRoot) || "";
    });
  });

  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...rows.map(r => `| ${r.join(" | ")} |`),
  ];

  return lines.join("\n") + "\n";
}

/**
 * Generuje listę markdown (bullet points) z pasujących plików.
 */
function generateList(baseConfig, matchedFiles, vaultRoot) {
  const view = baseConfig.views[0] || {};
  const columns = resolveColumns(view);

  sortFiles(matchedFiles, view.sort || [], vaultRoot);

  if (matchedFiles.length === 0) {
    return "_Brak wyników._\n";
  }

  const lines = matchedFiles.map(({ fm, path }) => {
    const url   = buildUrl(path, vaultRoot);
    const label = cleanFmVal(fm.title || path.replace(/\\/g, "/").split("/").pop().replace(/\.md$/i, ""));
    const link  = `[${label}](${url})`;

    // Dodatkowe kolumny (poza title) jako metadata po linku
    const extra = columns
      .filter(c => c !== "title")
      .map(c => {
        const val = getCellValue(c, fm, path, vaultRoot);
        if (!val) return null;
        const header = COLUMN_HEADERS[c] || c;
        return `${header}: ${val}`;
      })
      .filter(Boolean);

    if (extra.length > 0) {
      return `- ${link} — ${extra.join(" · ")}`;
    }
    return `- ${link}`;
  });

  return lines.join("\n") + "\n";
}

/** Usuwa zbędne backslashe z wartości frontmatter (np. \" → ") */
function cleanFmVal(str) {
  return str.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

/** Escapuje znaki specjalne HTML */
function escHtml(str) {
  return cleanFmVal(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generuje widok kart (HTML) z pasujących plików.
 */
function generateCards(baseConfig, matchedFiles, vaultRoot) {
  const view = baseConfig.views[0] || {};
  const columns = resolveColumns(view);

  sortFiles(matchedFiles, view.sort || [], vaultRoot);

  if (matchedFiles.length === 0) {
    return "_Brak wyników._\n";
  }

  const cards = matchedFiles.map(({ fm, path }) => {
    const url   = buildUrl(path, vaultRoot);
    const label = fm.title || path.replace(/\\/g, "/").split("/").pop().replace(/\.md$/i, "");

    const metaItems = columns
      .filter(c => c !== "title")
      .map(c => {
        const val = getCellValue(c, fm, path, vaultRoot);
        if (!val) return "";
        const header = COLUMN_HEADERS[c] || c;
        return `      <dt>${escHtml(header)}</dt><dd>${escHtml(val)}</dd>`;
      })
      .filter(Boolean);

    const metaBlock = metaItems.length > 0
      ? `\n    <dl>\n${metaItems.join("\n")}\n    </dl>`
      : "";

    return `  <div class="base-card">\n    <a href="${url}">${escHtml(label)}</a>${metaBlock}\n  </div>`;
  });

  return `<div class="base-cards">\n${cards.join("\n")}\n</div>\n`;
}

/**
 * Generuje output na podstawie typu widoku (table/list/cards).
 */
function generateOutput(baseConfig, matchedFiles, vaultRoot) {
  const viewType = (baseConfig.views[0]?.type || "table").toLowerCase();
  switch (viewType) {
    case "list":  return generateList(baseConfig, matchedFiles, vaultRoot);
    case "cards": return generateCards(baseConfig, matchedFiles, vaultRoot);
    default:      return generateTable(baseConfig, matchedFiles, vaultRoot);
  }
}

// ---------------------------------------------------------------------------
// Przetwarzanie pliku .md
// ---------------------------------------------------------------------------

/**
 * Przetwarza jeden plik .md — zastępuje ![[*.base]] i ```base ... ``` bloki.
 * Zwraca nową treść (lub null jeśli bez zmian).
 */
async function processMarkdownFile(mdPath, allFiles, vaultRoot) {
  let content = await readFile(mdPath, "utf-8");
  let changed = false;

  // Wzorzec A: ![[NazwaPlik.base]]
  const wikilinkRe = /!\[\[([^\]]+\.base)\]\]/g;
  let match;
  const wikilinkReplacements = [];
  while ((match = wikilinkRe.exec(content)) !== null) {
    wikilinkReplacements.push({ full: match[0], baseName: match[1] });
  }

  for (const { full, baseName } of wikilinkReplacements) {
    const basePath = join(dirname(mdPath), baseName);
    let baseText;
    try { baseText = await readFile(basePath, "utf-8"); }
    catch { console.warn(`  WARN: nie znaleziono ${basePath}`); continue; }

    const baseConfig = parseBaseYaml(baseText);
    const unsupported = findUnsupportedExpr(baseConfig);
    if (unsupported) {
      console.warn(`  SKIP: ![[${baseName}]] — nieobsługiwane wyrażenie: ${unsupported}`);
      continue;
    }
    const view = baseConfig.views[0];
    const viewFilters = view ? view.filters : null;

    const matched = allFiles
      .filter(f => f !== mdPath)
      .map(f => ({ path: f, fm: null }));

    for (const item of matched) {
      const txt = await readFile(item.path, "utf-8");
      item.fm = parseFrontmatter(txt);
    }

    const filtered = matched.filter(({ fm, path }) =>
      matchesFilters(baseConfig.filters, viewFilters, fm, path, vaultRoot)
    );

    const output = generateOutput(baseConfig, filtered, vaultRoot);
    content = content.replace(full, output.trimEnd());
    changed = true;
    const vt = (baseConfig.views[0]?.type || "table").toLowerCase();
    console.log(`  ✓ ![[${baseName}]] → ${vt} (${filtered.length} wierszy)`);
  }

  // Wzorzec B: ```base ... ```
  const codeBlockRe = /```base\r?\n([\s\S]*?)```/g;
  const codeReplacements = [];
  while ((match = codeBlockRe.exec(content)) !== null) {
    codeReplacements.push({ full: match[0], yaml: match[1] });
  }

  for (const { full, yaml } of codeReplacements) {
    const baseConfig = parseBaseYaml(yaml);
    const unsupported = findUnsupportedExpr(baseConfig);
    if (unsupported) {
      console.warn(`  SKIP: \`\`\`base block — nieobsługiwane wyrażenie: ${unsupported}`);
      continue;
    }
    const view = baseConfig.views[0];
    const viewFilters = view ? view.filters : null;

    const matched = allFiles
      .filter(f => f !== mdPath)
      .map(f => ({ path: f, fm: null }));

    for (const item of matched) {
      const txt = await readFile(item.path, "utf-8");
      item.fm = parseFrontmatter(txt);
    }

    const filtered = matched.filter(({ fm, path }) =>
      matchesFilters(baseConfig.filters, viewFilters, fm, path, vaultRoot)
    );

    const output = generateOutput(baseConfig, filtered, vaultRoot);
    content = content.replace(full, output.trimEnd());
    changed = true;
    const vt2 = (baseConfig.views[0]?.type || "table").toLowerCase();
    console.log(`  ✓ \`\`\`base block → ${vt2} (${filtered.length} wierszy)`);
  }

  return changed ? content : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[build-bases] Katalog: ${targetDir}`);
  const allFiles = await findMdFiles(targetDir);
  console.log(`[build-bases] Znaleziono ${allFiles.length} plików .md`);

  let processed = 0;
  let modified = 0;

  for (const mdPath of allFiles) {
    const result = await processMarkdownFile(mdPath, allFiles, targetDir);
    processed++;
    if (result !== null) {
      await writeFile(mdPath, result, "utf-8");
      const rel = relative(targetDir, mdPath).replace(/\\/g, "/");
      console.log(`  Zapisano: ${rel}`);
      modified++;
    }
  }

  console.log(`[build-bases] Gotowe. Przetworzono: ${processed}, zmodyfikowano: ${modified}`);
}

main().catch(err => { console.error(err); process.exit(1); });
