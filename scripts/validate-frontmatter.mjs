#!/usr/bin/env node

/**
 * validate-frontmatter.mjs
 *
 * Validates YAML frontmatter in vault markdown files.
 * Uses canonical schema from schema.mjs.
 *
 * Usage: node scripts/validate-frontmatter.mjs <directory>
 *
 * Exit code 0 = all valid, 1 = errors found.
 */

import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";
import { TYPE_SCHEMAS } from "./schema.mjs";

const targetDir = process.argv[2];
if (!targetDir) {
  console.error("Usage: node scripts/validate-frontmatter.mjs <directory>");
  process.exit(1);
}

/**
 * Validate frontmatter fields based on type.
 * Returns array of error messages.
 */
function validate(frontmatter, filePath) {
  const errors = [];
  const relPath = relative(process.cwd(), filePath);

  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return errors;
  }

  // All files with frontmatter require title
  if (!frontmatter.title) {
    errors.push(`${relPath}: missing required field "title"`);
  }

  const type = frontmatter.type;
  if (!type) return errors;

  const schema = TYPE_SCHEMAS[type];
  if (!schema) return errors;

  for (const field of schema.required) {
    if (!frontmatter[field]) {
      errors.push(`${relPath}: type "${type}" requires field "${field}"`);
    }
  }

  return errors;
}

// Main
const allPaths = await findMdFiles(targetDir);
// Skip templates/ folder
const files = allPaths.filter((p) => {
  const rel = relative(targetDir, p).replace(/\\/g, "/").toLowerCase();
  if (rel.startsWith("templates/")) return false;
  if (p.endsWith(".excalidraw.md")) return false;
  return true;
});

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
