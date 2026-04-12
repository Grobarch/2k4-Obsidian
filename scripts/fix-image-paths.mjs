#!/usr/bin/env node
/**
 * fix-image-paths.mjs — naprawa ścieżek obrazków w vault
 *
 * 1. Przenosi obrazki z folderów z notatkami do podfolderu assets/
 *    (zgodnie z ustawieniem Obsidian attachmentFolderPath: "./assets")
 * 2. Naprawia referencje do obrazków w .md:
 *    - ![alt](filename.jpg)      → ![[Pełna/Ścieżka/assets/filename.jpg]]
 *    - ![[filename.jpg]]         → ![[Pełna/Ścieżka/assets/filename.jpg]]
 * 3. Naprawia wikilinki z niepełną ścieżką (np. ![[zbroja.jpeg]] gdy obraz
 *    jest już w assets/ ale bez ścieżki vault-relative)
 *
 * Pomija: placeholder.jpg (korzeń vault działa poprawnie z Quartz "absolute")
 *
 * Dlaczego pełna ścieżka jest potrzebna dla Quartz:
 *   Z markdownLinkResolution:"absolute" + bare filename → URL w korzeniu witryny (błąd)
 *   Z pełną ścieżką vault-relative → CrawlLinks generuje poprawny URL ✓
 *
 * Użycie:
 *   node scripts/fix-image-paths.mjs              # dry-run
 *   node scripts/fix-image-paths.mjs --apply      # wykonaj zmiany
 *   node scripts/fix-image-paths.mjs --dir vault  # inny katalog (domyślnie: vault)
 */

import { readdir, readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, dirname, basename, extname, relative } from "node:path";

// ---------- konfiguracja ----------

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"]);

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const dirIdx = args.indexOf("--dir");
const VAULT_DIR = dirIdx !== -1 ? args[dirIdx + 1] : "vault";

// ---------- helpers ----------

/** Rekurencyjnie zbiera pliki obrazkowe w danym katalogu. */
async function findImageFiles(dir, vaultRoot) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    // pomijaj ukryte foldery (.obsidian, .git)
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findImageFiles(fullPath, vaultRoot)));
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        results.push({
          fullPath,
          vaultRel: relative(vaultRoot, fullPath).replace(/\\/g, "/"),
          name: entry.name,
        });
      }
    }
  }
  return results;
}

/** Rekurencyjnie zbiera pliki .md w danym katalogu. */
async function findMdFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findMdFiles(fullPath)));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Czy plik jest już w podfolderze assets/? */
function isInAssets(vaultRel) {
  return vaultRel.split("/").includes("assets");
}

/** Czy to placeholder.jpg w korzeniu vault? */
function isPlaceholder(vaultRel) {
  return vaultRel === "placeholder.jpg";
}

// ---------- main ----------

async function main() {
  console.log(`Vault: ${VAULT_DIR}`);
  console.log(`Tryb: ${APPLY ? "APPLY (wykonuję zmiany)" : "DRY-RUN (podgląd)"}`);
  console.log("");

  // 1. Zbierz wszystkie obrazki
  const allImages = await findImageFiles(VAULT_DIR, VAULT_DIR);

  // Zbuduj plan przesunięcia: vaultRel → targetVaultRel
  const movePlan = new Map(); // string → string
  // Mapa: basename → targetVaultRel (do wyszukiwania podczas naprawy referencji)
  const nameToTarget = new Map();

  for (const img of allImages) {
    if (isPlaceholder(img.vaultRel)) {
      // placeholder.jpg zostaje w korzeniu, nie ruszamy
      nameToTarget.set(img.name, img.vaultRel);
      continue;
    }

    let targetVaultRel;
    if (isInAssets(img.vaultRel)) {
      // Już jest w assets/ — nie przenosimy, tylko rejestrujemy
      targetVaultRel = img.vaultRel;
    } else {
      // Przenosimy do assets/ w tym samym folderze
      const parentDir = dirname(img.vaultRel);
      targetVaultRel = `${parentDir}/assets/${img.name}`;
      movePlan.set(img.vaultRel, targetVaultRel);
    }

    if (nameToTarget.has(img.name)) {
      console.warn(`⚠  Duplikat nazwy: "${img.name}" — plik zostanie pominięty`);
    } else {
      nameToTarget.set(img.name, targetVaultRel);
    }
  }

  // 2. Raport: pliki do przeniesienia
  if (movePlan.size > 0) {
    console.log(`📁 Obrazki do przeniesienia do assets/ (${movePlan.size} plików):`);
    for (const [from, to] of movePlan) {
      console.log(`   ${from}`);
      console.log(`   → ${to}`);
    }
    console.log("");
  } else {
    console.log("✓ Wszystkie obrazki są już w assets/\n");
  }

  // 3. Zbierz pliki .md i napraw referencje
  const mdFiles = await findMdFiles(VAULT_DIR);
  const changes = []; // { mdPath, newContent, fileChanges[] }

  // Regex: standardowy markdown ![alt](ścieżka.ext)
  // Uwaga: używamy funkcji replace z callbackiem, nie globalnego g-flag w pętli
  const mdImgPattern =
    /!\[([^\]]*)\]\(([^)]*\.(jpg|jpeg|png|gif|webp|bmp|svg))\)/gi;

  // Regex: Obsidian wikilink ![[ścieżka.ext]] lub ![[ścieżka.ext|alias]]
  const wikiImgPattern =
    /!\[\[([^\]|]*\.(jpg|jpeg|png|gif|webp|bmp|svg))(\|[^\]]*)?\]\]/gi;

  for (const mdPath of mdFiles) {
    const content = await readFile(mdPath, "utf-8");
    let newContent = content;
    const fileChanges = [];

    // --- Napraw standardowe markdown images: ![alt](filename.ext) ---
    newContent = newContent.replace(mdImgPattern, (match, alt, imgPath) => {
      // Pomijaj zewnętrzne URL
      if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
        return match;
      }
      // Pomijaj placeholder.jpg
      const imgName = basename(imgPath);
      if (imgName === "placeholder.jpg") return match;

      const targetRel = nameToTarget.get(imgName);
      if (!targetRel) {
        console.warn(
          `  ⚠ Nie znaleziono pliku obrazka: "${imgName}" referenced in ${relative(VAULT_DIR, mdPath)}`
        );
        return match;
      }

      const newRef = `![[${targetRel}]]`;
      if (newRef !== match) {
        fileChanges.push({ old: match, new: newRef });
      }
      return newRef;
    });

    // --- Napraw wikilinki bez pełnej ścieżki: ![[filename.ext]] ---
    newContent = newContent.replace(wikiImgPattern, (match, imgPath, _ext, alias) => {
      // Jeśli już zawiera ścieżkę (ma /), sprawdź czy to pełna ścieżka
      if (imgPath.includes("/")) {
        // Sprawdź czy ta ścieżka jest poprawna (zaczyna się od prawidłowego katalogu)
        // Jeśli tak, pomijamy; jeśli nie, naprawiamy na podstawie nazwy pliku
        const imgName = basename(imgPath);
        if (imgName === "placeholder.jpg") return match;
        const targetRel = nameToTarget.get(imgName);
        if (!targetRel) return match;
        // Jeśli ścieżka już jest docelową, nie zmieniamy
        if (imgPath === targetRel) return match;
        // Ścieżka jest inna niż docelowa — napraw
        const aliasPart = alias || "";
        const newRef = `![[${targetRel}${aliasPart}]]`;
        if (newRef !== match) fileChanges.push({ old: match, new: newRef });
        return newRef;
      }

      // Bare filename (brak /)
      const imgName = imgPath;
      if (imgName === "placeholder.jpg") return match;

      const targetRel = nameToTarget.get(imgName);
      if (!targetRel) {
        console.warn(
          `  ⚠ Nie znaleziono pliku obrazka: "${imgName}" referenced in ${relative(VAULT_DIR, mdPath)}`
        );
        return match;
      }

      const aliasPart = alias || "";
      const newRef = `![[${targetRel}${aliasPart}]]`;
      if (newRef !== match) {
        fileChanges.push({ old: match, new: newRef });
      }
      return newRef;
    });

    if (fileChanges.length > 0) {
      changes.push({ mdPath, newContent, oldContent: content, fileChanges });
    }
  }

  // 4. Raport: zmiany w .md
  if (changes.length > 0) {
    console.log(`📝 Pliki .md do zaktualizowania (${changes.length}):`);
    for (const { mdPath, fileChanges } of changes) {
      console.log(`\n  ${relative(VAULT_DIR, mdPath)}:`);
      for (const fc of fileChanges) {
        console.log(`    - ${fc.old}`);
        console.log(`    + ${fc.new}`);
      }
    }
    console.log("");
  } else {
    console.log("✓ Brak zmian do wykonania w plikach .md\n");
  }

  // 5. Podsumowanie
  console.log(
    `Podsumowanie: ${movePlan.size} plików do przeniesienia, ${changes.length} notatek do zaktualizowania`
  );

  if (!APPLY) {
    console.log("\nDodaj --apply żeby wykonać powyższe zmiany.");
    return;
  }

  // 6. Wykonaj: przenieś obrazki
  let movedCount = 0;
  for (const [fromRel, toRel] of movePlan) {
    const fromFull = join(VAULT_DIR, fromRel);
    const toFull = join(VAULT_DIR, toRel);
    await mkdir(dirname(toFull), { recursive: true });
    await rename(fromFull, toFull);
    movedCount++;
  }
  if (movedCount > 0) {
    console.log(`\n✓ Przeniesiono ${movedCount} plików do assets/`);
  }

  // 7. Wykonaj: zaktualizuj pliki .md
  let updatedCount = 0;
  for (const { mdPath, newContent, oldContent } of changes) {
    if (newContent !== oldContent) {
      await writeFile(mdPath, newContent, "utf-8");
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    console.log(`✓ Zaktualizowano ${updatedCount} plików .md`);
  }

  console.log("\nGotowe!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
