#!/usr/bin/env node
/**
 * shared.mjs — wspólne utility dla skryptów vault
 *
 * Eksportuje: parseFrontmatter, findMdFiles, slugify, POLISH_MAP
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Mapa polskich znaków do ASCII.
 */
export const POLISH_MAP = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "a", Ć: "c", Ę: "e", Ł: "l", Ń: "n", Ó: "o", Ś: "s", Ź: "z", Ż: "z",
};

/**
 * Zamienia ścieżkę/nazwę na slug Quartz:
 * lowercase, polskie znaki → ASCII, spacje → myślniki, bez .md
 */
export function slugify(str) {
  return str
    .replace(/\.md$/i, "")
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_MAP[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/\/-/g, "/")
    .replace(/-\//g, "/");
}

/**
 * Parsuje YAML frontmatter z pliku markdown (prosty parser, bez zależności).
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  let currentKey = null;
  let currentIsArray = false;
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (m) {
      currentKey = m[1];
      let val = m[2].trim();
      if (val === '') {
        fm[currentKey] = null;
        currentIsArray = true;
      } else {
        currentIsArray = false;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        } else if (val.startsWith('[') && val.endsWith(']')) {
          val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        }
        fm[currentKey] = val;
      }
    } else if (currentKey && currentIsArray) {
      const listMatch = line.match(/^\s*-\s+(.+)/);
      if (listMatch) {
        if (fm[currentKey] === null) fm[currentKey] = [];
        let listVal = listMatch[1].trim();
        if ((listVal.startsWith('"') && listVal.endsWith('"')) || (listVal.startsWith("'") && listVal.endsWith("'"))) {
          listVal = listVal.slice(1, -1);
        }
        fm[currentKey].push(listVal);
      } else if (line.trim() !== '') {
        currentIsArray = false;
      }
    }
  }
  for (const key of Object.keys(fm)) {
    if (fm[key] === null) fm[key] = '';
  }
  return fm;
}

/**
 * Zwraca surowy tekst frontmatter (bez delimiterów ---).
 */
export function extractRawFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Rekurencyjnie znajduje wszystkie pliki .md w folderze.
 */
export async function findMdFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findMdFiles(fullPath)));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Ładuje plik i zwraca { path, content, frontmatter }.
 */
export async function loadFileWithFrontmatter(filePath) {
  const content = await readFile(filePath, "utf-8");
  const frontmatter = parseFrontmatter(content);
  return { path: filePath, content, frontmatter };
}
