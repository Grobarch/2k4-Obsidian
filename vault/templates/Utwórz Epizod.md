<%*
// ============================================================
// Utwórz Epizod — skrypt Templater
// Wymaga: plugin Templater + plugin Meta Bind
// Uruchamiany z przycisku na stronie kampanii (type: kampania)
// ============================================================

const triggerFile = tp.config.target_file;

function cancel(msg) {
  new Notice(msg || "Anulowano tworzenie epizodu.");
  tp.hooks.on_all_templates_executed(async () => {
    const f = app.vault.getAbstractFileByPath(triggerFile.path);
    if (f) await app.vault.delete(f);
  });
  tR = "";
}

// Odczytaj kontekst z pliku kampanii, z którego uruchomiono przycisk
const parentFile = tp.config.active_file;
if (!parentFile) { cancel("Nie można odczytać kontekstu."); return; }

const fm = app.metadataCache.getFileCache(parentFile)?.frontmatter;
if (!fm || fm.type !== "kampania") {
  cancel("Ten przycisk działa tylko na stronie kampanii (type: kampania).");
  return;
}

const systemId    = fm.system;
const systemPelna = fm.system_pelna || fm.title;
const mg          = fm.mg || "";
const kampaniaFolderName = parentFile.parent.name;
const kampaniaFolder     = parentFile.parent.path;

function toSlug(str) {
  return str.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const kampaniaSlug = toSlug(kampaniaFolderName);
const kampaniaLink = `/systemy/${systemId}/${kampaniaSlug}`;

// Policz istniejące epizody w folderze kampanii
const allFiles = app.vault.getFiles();
const existingEpisodes = allFiles.filter(f =>
  f.parent && f.parent.path === kampaniaFolder &&
  /^Epizod \d+/.test(f.name)
);
const nextNum = existingEpisodes.length + 1;
const numStr  = String(nextNum).padStart(2, "0");

// ============================================================
// 1. Tytuł epizodu (wymagany)
// ============================================================
const tytulRaw = await tp.system.prompt(`Tytuł Epizodu ${nextNum}:`);
if (!tytulRaw || !tytulRaw.trim()) { cancel(); return; }
const tytul = tytulRaw.trim();

// ============================================================
// 2. Data (opcjonalna)
// ============================================================
const dataRaw = await tp.system.prompt("Data sesji (RRRR-MM-DD, opcjonalnie)", "");
if (dataRaw === null) { cancel(); return; }
const data = dataRaw.trim() || "???";

// ============================================================
// Buduj notatkę
// ============================================================
const fileName  = `Epizod ${numStr}`;
const fullTitle = `Epizod ${numStr}: "${tytul}"`;

const zrodloLine = `zrodlo: "https://arkadiusz-rygiel.blogspot.com/..."`;

const content = `---
title: "${fullTitle.replace(/"/g, '\\"')}"
type: epizod
system: ${systemId}
system_pelna: ${systemPelna}
kampania_link: ${kampaniaLink}
kampania: ${kampaniaSlug}
mg: ${mg}
data: ${data}
${zrodloLine}
tags: [epizod, ${systemId}]
---

---

*Opis do uzupełnienia.*
`;

await tp.file.create_new(content, fileName, true, kampaniaFolder);

tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${kampaniaFolder}/${fileName}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
