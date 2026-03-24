import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

async function findMdFiles(dir) {
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

function capitalizeTitle(content) {
  // Zastępuje `title: "coś"` lub `title: coś` wielką literą
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontmatterRegex);
  if (!match) return content;

  let fm = match[1];
  let changed = false;

  const lines = fm.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const titleMatch = lines[i].match(/^(title:\s*)(.*)$/);
    if (titleMatch) {
      let val = titleMatch[2];
      // remove quotes if exist
      let hasQuotes = false;
      let quoteChar = "";
      if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
        hasQuotes = true;
        quoteChar = val[0];
        val = val.substring(1, val.length - 1);
      }
      
      if (val.length > 0) {
        // Capitalize first letter
        const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
        if (capitalized !== val) {
          changed = true;
          let newVal = hasQuotes ? `${quoteChar}${capitalized}${quoteChar}` : capitalized;
          lines[i] = `${titleMatch[1]}${newVal}`;
        }
      }
    }
  }

  if (changed) {
    const newFm = lines.join("\n");
    return content.replace(frontmatterRegex, `---\n${newFm}\n---`);
  }
  
  return content;
}

async function main() {
  const vaultDir = process.argv[2] || "vault";
  const files = await findMdFiles(vaultDir);
  let updated = 0;
  
  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const newContent = capitalizeTitle(content);
    if (newContent !== content) {
      await writeFile(file, newContent, "utf-8");
      console.log(`Zaktualizowano tytuł w: ${file}`);
      updated++;
    }
  }
  
  console.log(`Łącznie zaktualizowano tytułów: ${updated}`);
}

main().catch(console.error);
