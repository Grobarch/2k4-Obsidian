<%*
// ============================================================
// Utwórz Scenariusz — skrypt Templater
// Wymaga: plugin Templater + plugin Meta Bind
// Uruchamiany z przycisku na stronie Scenariusze (folder note)
// ============================================================

const triggerFile = tp.config.target_file;

function cancel(msg) {
  new Notice(msg || "Anulowano tworzenie scenariusza.");
  tp.hooks.on_all_templates_executed(async () => {
    const f = app.vault.getAbstractFileByPath(triggerFile.path);
    if (f) await app.vault.delete(f);
  });
  tR = "";
}

// Kontekst: Scenariusze.md w Systemy/[System]/Scenariusze/
const activeFile = tp.config.active_file;
if (!activeFile) { cancel("Nie można odczytać kontekstu."); return; }

const scenarFolder = activeFile.parent;       // Systemy/[System]/Scenariusze
const systemFolder = scenarFolder?.parent;    // Systemy/[System]
if (!systemFolder) { cancel("Nieprawidłowy kontekst folderu."); return; }

// Odczytaj system slug z system note (plik o tej samej nazwie co folder)
const systemNoteFile = app.vault.getFiles().find(f =>
  f.parent?.path === systemFolder.path &&
  f.basename === systemFolder.name
);

let systemId    = "";
let systemPelna = systemFolder.name;

if (systemNoteFile) {
  const sfm = app.metadataCache.getFileCache(systemNoteFile)?.frontmatter;
  if (sfm) {
    systemId    = sfm.system    || "";
    systemPelna = sfm.system_pelna || sfm.title || systemFolder.name;
  }
}

if (!systemId) {
  // Fallback: slugify nazwy folderu
  systemId = systemFolder.name.toLowerCase()
    .replace(/ą/g,"a").replace(/ć/g,"c").replace(/ę/g,"e")
    .replace(/ł/g,"l").replace(/ń/g,"n").replace(/ó/g,"o")
    .replace(/ś/g,"s").replace(/ź/g,"z").replace(/ż/g,"z")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

// ============================================================
// 1. Tytuł (wymagany)
// ============================================================
const tytulRaw = await tp.system.prompt("Tytuł scenariusza:");
if (!tytulRaw?.trim()) { cancel(); return; }
const tytul = tytulRaw.trim();

// ============================================================
// 2. Data publikacji (opcjonalna)
// ============================================================
const dataRaw = await tp.system.prompt("Data publikacji (RRRR-MM-DD, opcjonalnie)", "");
if (dataRaw === null) { cancel(); return; }
const data = dataRaw.trim() || "???";

// ============================================================
// 3. Źródło (opcjonalne)
// ============================================================
const zrodloRaw = await tp.system.prompt("URL źródłowy (blog, opcjonalnie)", "");
if (zrodloRaw === null) { cancel(); return; }
const zrodlo = zrodloRaw.trim() || "https://arkadiusz-rygiel.blogspot.com/...";

// ============================================================
// Buduj notatkę
// ============================================================
function capitalize(str) {
  return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const fileName = capitalize(tytul);

const content = `---
title: "${tytul.replace(/"/g, '\\"')}"
type: scenariusz
system: ${systemId}
system_pelna: "${systemPelna}"
zrodlo: "${zrodlo}"
data: ${data}
tags: [scenariusz, ${systemId}]
---

# ${tytul}

*Opis do uzupełnienia.*
`;

await tp.file.create_new(content, fileName, true, scenarFolder.path);

tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${scenarFolder.path}/${fileName}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
