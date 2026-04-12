#!/usr/bin/env node
/**
 * fetch-full-size-images.mjs — pobiera pełnowymiarowe wersje obrazków z bloga
 * i nadpisuje lokalne miniatury (zachowując ścieżki i nazwy).
 *
 * Tło: Commit 0a681f9 pobrał obrazki z arkadiusz-rygiel.blogspot.com w rozmiarze
 * thumbnail (`/s320/`, ~320 px). Skrypt ten pobiera te same obrazki w pełnym
 * rozmiarze (`/s1600/` — URL z atrybutu `href` linku <a> owijającego <img>)
 * i nadpisuje lokalne pliki. Notatki nie wymagają żadnych edycji.
 *
 * Algorytm:
 *   1. Dla każdej notatki z `zrodlo: https://*.blogspot.com/...`:
 *   2. Zebrać uporządkowaną listę osadzeń obrazków (![[...]] + ![alt](...)).
 *   3. Pobrać HTML posta i wyekstrahować uporządkowaną listę par
 *      (fullSizeUrl, thumbUrl) z `<a href="...s1600/..."><img src="...s320/..."></a>`.
 *      Fallback: bare <img> bez <a> → przepisać /s\d+/ → /s1600/.
 *   4. Dopasować po nazwie pliku (basename URL == basename osadzenia)
 *      lub pozycji jako fallback.
 *   5. Pobrać każdy full-size URL, porównać rozmiar, nadpisać jeśli większy.
 *
 * Użycie:
 *   node scripts/fetch-full-size-images.mjs                 # dry-run (default)
 *   node scripts/fetch-full-size-images.mjs --apply         # nadpisz pliki
 *   node scripts/fetch-full-size-images.mjs --note "Cialo"  # filtruj notatki
 *   node scripts/fetch-full-size-images.mjs --apply --verbose
 *   node scripts/fetch-full-size-images.mjs --apply --force # nadpisz nawet gdy rozmiar ≤
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { basename, join, relative, extname } from "node:path";
import { findMdFiles, parseFrontmatter } from "./shared.mjs";

// ---------- konfiguracja ----------

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force");
const VERBOSE = args.includes("--verbose");
const dirIdx = args.indexOf("--dir");
const VAULT_DIR = dirIdx !== -1 ? args[dirIdx + 1] : "vault";
const noteIdx = args.indexOf("--note");
const NOTE_FILTER = noteIdx !== -1 ? args[noteIdx + 1] : null;
const timeoutIdx = args.indexOf("--timeout");
const TIMEOUT_MS = timeoutIdx !== -1 ? parseInt(args[timeoutIdx + 1], 10) : 30000;

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const SLEEP_BETWEEN_DOWNLOADS_MS = 250;

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp)$/i;

// ---------- helpers ----------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function kb(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function fetchWithTimeout(url, { timeout = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parsuje treść notatki (bez frontmatter) i zwraca uporządkowaną listę
 * osadzeń obrazków w kolejności występowania:
 *   [{ kind: "wiki"|"md", path: "vault-relative/path.png", index, match }]
 */
function extractEmbeds(content) {
  // Wytnij frontmatter żeby nie łapać osadzeń w YAML (mało prawdopodobne, ale pewne).
  const fmMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\n?/);
  const offset = fmMatch ? fmMatch[0].length : 0;
  const body = fmMatch ? content.slice(offset) : content;

  const results = [];

  const wikiRe = /!\[\[([^\]|]+\.(?:jpe?g|png|gif|webp))(?:\|[^\]]*)?\]\]/gi;
  for (const m of body.matchAll(wikiRe)) {
    results.push({
      kind: "wiki",
      path: m[1],
      index: m.index + offset,
      match: m[0],
    });
  }

  const mdRe = /!\[[^\]]*\]\(([^)\s]+\.(?:jpe?g|png|gif|webp))(?:\s+"[^"]*")?\)/gi;
  for (const m of body.matchAll(mdRe)) {
    const p = m[1];
    if (/^https?:\/\//i.test(p)) continue; // pomijamy zewnętrzne URL
    results.push({
      kind: "md",
      path: p,
      index: m.index + offset,
      match: m[0],
    });
  }

  results.sort((a, b) => a.index - b.index);
  return results;
}

/**
 * Parsuje HTML posta bloga i zwraca uporządkowaną listę obrazków:
 *   [{ fullUrl, thumbUrl, index }]
 *
 * Strategia:
 *   1. Główny pattern: <a href="...blogger..."><img ...src="..."></a>
 *      → href = pełny rozmiar (zwykle /s1600/).
 *   2. Fallback: <img src="...googleusercontent|bp.blogspot.../s\d+/..."/>
 *      → przepisz /s\d+(-[a-z])?/ → /s1600/.
 *
 * Deduplikacja po `match.index` — jeśli ten sam <img> został złapany przez oba
 * patterny (w <a> i bez), wersja z <a> ma priorytet.
 */
function extractBlogImages(html) {
  const bloggerHostRe = /(?:blogger\.googleusercontent\.com|\d+\.bp\.blogspot\.com)/;

  const wrappedRe =
    /<a\b[^>]*\bhref="(https?:\/\/(?:blogger\.googleusercontent\.com|\d+\.bp\.blogspot\.com)\/[^"]+)"[^>]*>\s*(?:<[^>]+>\s*)*<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi;
  const bareImgRe = /<img\b[^>]*\bsrc="(https?:\/\/[^"]+)"[^>]*>/gi;

  const byIndex = new Map();

  for (const m of html.matchAll(wrappedRe)) {
    const fullUrl = m[1];
    const thumbUrl = m[2];
    // Upewnij się, że href też prowadzi do obrazka (ma rozszerzenie albo sBIGNUMBER/)
    if (!IMAGE_EXT_RE.test(fullUrl.split("?")[0].split("/").pop() || "")) {
      // Akceptuj jeśli URL ma wzorzec /sNNN/ lub /sNNN-X/ — to i tak full-size Blogger
      if (!/\/s\d+(?:-[a-z])?\//.test(fullUrl)) continue;
    }
    byIndex.set(m.index, { fullUrl, thumbUrl, index: m.index });
  }

  for (const m of html.matchAll(bareImgRe)) {
    const src = m[1];
    if (!bloggerHostRe.test(src)) continue;
    // Pomiń jeśli w tym miejscu już mamy wersję z <a> (heurystycznie: ten sam src)
    const alreadyCovered = [...byIndex.values()].some((v) => v.thumbUrl === src);
    if (alreadyCovered) continue;
    // Przepisz /sNNN/ lub /sNNN-X/ → /s1600/
    const fullUrl = src.replace(/\/s\d+(-[a-z])?\//, "/s1600/");
    byIndex.set(m.index, { fullUrl, thumbUrl: src, index: m.index });
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

/** Wyodrębnia nazwę pliku z URL Bloggera (ostatni segment, URL-decoded).
 * Blogger używa `+` dla spacji w ostatnim segmencie ścieżki (stary zwyczaj
 * z query-string), więc zamieniamy `+` → ` ` przed `decodeURIComponent`. */
function urlBasename(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last.replace(/\+/g, " "));
  } catch {
    return "";
  }
}

/**
 * Dopasowuje lokalne osadzenia do URL-i z posta.
 * Strategia:
 *   1. Po nazwie pliku (basename osadzenia == basename URL, case-insensitive).
 *   2. Po pozycji (n-te osadzenie ↔ n-ty URL) — dla tych, które nie zostały
 *      dopasowane po nazwie.
 *
 * Zwraca: [{ embed, blogImage | null, strategy: "filename"|"position"|"unmatched" }]
 */
function matchEmbedsToBlogImages(embeds, blogImages) {
  const pairs = embeds.map((e) => ({ embed: e, blogImage: null, strategy: "unmatched" }));
  const used = new Set();

  // 1. Dopasowanie po nazwie pliku
  for (let i = 0; i < pairs.length; i++) {
    const embedName = basename(pairs[i].embed.path).toLowerCase();
    for (let j = 0; j < blogImages.length; j++) {
      if (used.has(j)) continue;
      const urlName = urlBasename(blogImages[j].fullUrl).toLowerCase();
      if (urlName && urlName === embedName) {
        pairs[i].blogImage = blogImages[j];
        pairs[i].strategy = "filename";
        used.add(j);
        break;
      }
    }
  }

  // 2. Dopasowanie po pozycji (dla pozostałych, w zachowanej kolejności)
  const remainingEmbeds = pairs.filter((p) => !p.blogImage);
  const remainingBlogs = blogImages.filter((_, j) => !used.has(j));
  for (let i = 0; i < Math.min(remainingEmbeds.length, remainingBlogs.length); i++) {
    remainingEmbeds[i].blogImage = remainingBlogs[i];
    remainingEmbeds[i].strategy = "position";
  }

  return pairs;
}

async function downloadBinary(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

// ---------- main ----------

async function main() {
  console.log(`Vault: ${VAULT_DIR}`);
  console.log(`Tryb:  ${APPLY ? "APPLY (nadpisuję pliki)" : "DRY-RUN (podgląd)"}`);
  if (NOTE_FILTER) console.log(`Filtr: --note "${NOTE_FILTER}"`);
  if (FORCE) console.log(`Flaga: --force (nadpisuję nawet gdy rozmiar nie większy)`);
  console.log("");

  const mdFiles = await findMdFiles(VAULT_DIR);

  // Cache: URL posta → wynik extractBlogImages (notatki mogą współdzielić zrodlo)
  const postCache = new Map();

  const totals = {
    notesScanned: mdFiles.length,
    notesWithSource: 0,
    notesWithEmbeds: 0,
    notesProcessed: 0,
    notesFailed: 0,
    upgraded: 0,
    noUpgrade: 0,
    failed: 0,
    mismatched: 0,
    targetMissing: 0,
  };

  for (const mdPath of mdFiles) {
    const rel = relative(VAULT_DIR, mdPath).replace(/\\/g, "/");
    if (NOTE_FILTER && !rel.toLowerCase().includes(NOTE_FILTER.toLowerCase())) continue;

    const content = await readFile(mdPath, "utf-8");
    const fm = parseFrontmatter(content);

    const source = fm.zrodlo || "";
    if (!source || !/blogspot\.com/i.test(source)) continue;
    totals.notesWithSource++;

    const embeds = extractEmbeds(content);
    if (embeds.length === 0) continue;
    totals.notesWithEmbeds++;

    console.log(`\n${rel}`);
    console.log(`  source: ${source}`);

    // Pobierz HTML posta (z cache)
    let blogImages;
    if (postCache.has(source)) {
      blogImages = postCache.get(source);
    } else {
      try {
        const res = await fetchWithTimeout(source);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const html = await res.text();
        blogImages = extractBlogImages(html);
        postCache.set(source, blogImages);
      } catch (err) {
        console.log(`  ✗ Nie udało się pobrać posta: ${err.message}`);
        totals.notesFailed++;
        continue;
      }
    }

    const pairs = matchEmbedsToBlogImages(embeds, blogImages);
    totals.notesProcessed++;

    const matched = pairs.filter((p) => p.blogImage).length;
    console.log(
      `  embeds=${embeds.length}  postImages=${blogImages.length}  matched=${matched}`
    );
    if (embeds.length !== blogImages.length) totals.mismatched++;

    let perNoteUpgraded = 0;
    let perNoteNoUpgrade = 0;
    let perNoteFailed = 0;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const embed = pair.embed;
      const embedName = basename(embed.path);
      const absTarget = join(VAULT_DIR, embed.path);

      if (!pair.blogImage) {
        console.log(`    [${i + 1}] ${embedName}  — UNMATCHED (brak na blogu)`);
        perNoteFailed++;
        continue;
      }

      // Istniejący rozmiar lokalny
      let localSize = 0;
      try {
        const st = await stat(absTarget);
        localSize = st.size;
      } catch {
        console.log(
          `    [${i + 1}] ${embedName}  — target-missing (${relative(VAULT_DIR, absTarget)})`
        );
        totals.targetMissing++;
        perNoteFailed++;
        continue;
      }

      const strategyNote = pair.strategy === "position" ? " (po pozycji)" : "";

      if (!APPLY) {
        // W dry-run: HEAD na URL żeby oszacować rozmiar (wiele serwerów zwraca Content-Length)
        let remoteSize = null;
        try {
          const headRes = await fetchWithTimeout(pair.blogImage.fullUrl, { timeout: 15000 });
          if (headRes.ok) {
            const cl = headRes.headers.get("content-length");
            if (cl) remoteSize = parseInt(cl, 10);
            // Drain body żeby zamknąć socket
            await headRes.arrayBuffer();
          }
        } catch {
          // ignoruj — tylko szacunek
        }
        const sizeInfo =
          remoteSize !== null ? `${kb(localSize)} → ${kb(remoteSize)}` : `${kb(localSize)} → ?`;
        console.log(
          `    [${i + 1}] ${embedName}  ${sizeInfo}  DRY${strategyNote}`
        );
        if (VERBOSE) console.log(`         ${pair.blogImage.fullUrl}`);
        continue;
      }

      // APPLY: pobierz i (ewentualnie) nadpisz
      try {
        const buf = await downloadBinary(pair.blogImage.fullUrl);
        const isUpgrade = buf.length > localSize;
        if (!isUpgrade && !FORCE) {
          console.log(
            `    [${i + 1}] ${embedName}  ${kb(localSize)} → ${kb(buf.length)}  skip (no-upgrade)${strategyNote}`
          );
          perNoteNoUpgrade++;
        } else {
          await writeFile(absTarget, buf);
          console.log(
            `    [${i + 1}] ${embedName}  ${kb(localSize)} → ${kb(buf.length)}  ✓${strategyNote}`
          );
          perNoteUpgraded++;
        }
        if (VERBOSE) console.log(`         ${pair.blogImage.fullUrl}`);
        await sleep(SLEEP_BETWEEN_DOWNLOADS_MS);
      } catch (err) {
        console.log(
          `    [${i + 1}] ${embedName}  FAIL: ${err.message}${strategyNote}`
        );
        if (VERBOSE) console.log(`         ${pair.blogImage.fullUrl}`);
        perNoteFailed++;
      }
    }

    console.log(
      `  summary: ${perNoteUpgraded} upgraded, ${perNoteNoUpgrade} no-upgrade, ${perNoteFailed} failed`
    );
    totals.upgraded += perNoteUpgraded;
    totals.noUpgrade += perNoteNoUpgrade;
    totals.failed += perNoteFailed;
  }

  console.log("\n" + "─".repeat(60));
  console.log("Podsumowanie:");
  console.log(`  Notatek przeskanowanych:         ${totals.notesScanned}`);
  console.log(`  Notatek z polem zrodlo(blog):    ${totals.notesWithSource}`);
  console.log(`  Notatek z osadzeniami obrazków:  ${totals.notesWithEmbeds}`);
  console.log(`  Notatek przetworzonych:          ${totals.notesProcessed}`);
  console.log(`  Notatek z błędem fetch posta:    ${totals.notesFailed}`);
  console.log(`  Notatek z niezgodną liczbą img:  ${totals.mismatched}`);
  console.log(`  Obrazków upgraded:               ${totals.upgraded}`);
  console.log(`  Obrazków no-upgrade:             ${totals.noUpgrade}`);
  console.log(`  Obrazków failed:                 ${totals.failed}`);
  console.log(`  Obrazków target-missing:         ${totals.targetMissing}`);
  if (!APPLY) console.log("\nDodaj --apply, aby faktycznie nadpisać pliki.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
