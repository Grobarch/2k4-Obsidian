#!/usr/bin/env node

/**
 * validate-frontmatter.mjs
 *
 * Validates YAML frontmatter in vault markdown files.
 * Usage: node scripts/validate-frontmatter.mjs <directory>
 *
 * Exit code 0 = all valid, 1 = errors found.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const targetDir = process.argv[2];
if (!targetDir) {
  console.error("Usage: node scripts/validate-frontmatter.mjs <directory>");
  process.exit(1);
}

/**
 * Recursively collect all .md files, skipping templates/ folder (case-insensitive).
 */
async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === "templates") continue;
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Parse YAML frontmatter from markdown content.
 * Returns null if no frontmatter found, otherwise an object of key-value pairs.
 */
function parseFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return null;

  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) return null;

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const data = {};

  for (const line of yamlBlock.split("\n")) {
    // Match simple key: value pairs (covers strings, numbers, arrays in [] notation)
    const match = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Validate frontmatter fields based on type.
 * Returns array of error messages.
 */
function validate(frontmatter, filePath) {
  const errors = [];
  const relPath = relative(process.cwd(), filePath);

  if (!frontmatter) {
    // Files without frontmatter are skipped (not an error).
    return errors;
  }

  // All files with frontmatter require title
  if (!frontmatter.title) {
    errors.push(`${relPath}: missing required field "title"`);
  }

  const type = frontmatter.type;
  if (!type) return errors;

  const requiredByType = {
    epizod: ["data", "kampania_link", "kampania", "title"],
    scenariusz: ["zrodlo", "data", "title"],
    "bohater-gracza": ["system", "tags", "title"],
    "bohater-niezalezny": ["system", "tags", "title"],
    kampania: ["system", "title"],
    system: ["system", "title"],
    artykul: ["title"],
  };

  const required = requiredByType[type];
  if (!required) return errors;

  for (const field of required) {
    if (!frontmatter[field]) {
      errors.push(`${relPath}: type "${type}" requires field "${field}"`);
    }
  }

  return errors;
}

// Main
const files = await collectMarkdownFiles(targetDir);
let allErrors = [];

for (const file of files) {
  const content = await readFile(file, "utf-8");
  const frontmatter = parseFrontmatter(content);
  const errors = validate(frontmatter, file);
  allErrors.push(...errors);
}

if (allErrors.length > 0) {
  console.error(`Frontmatter validation failed with ${allErrors.length} error(s):\n`);
  for (const err of allErrors) {
    console.error(`  ERROR: ${err}`);
  }
  process.exit(1);
} else {
  console.log(`Frontmatter validation passed. Checked ${files.length} files.`);
  process.exit(0);
}
