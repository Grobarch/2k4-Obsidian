<%*
// ============================================================
// Utwórz Kampanię — skrypt Templater
// Wymaga: plugin Templater + plugin Meta Bind
// Uruchamiany z przycisku na stronie systemu (type: system)
// ============================================================

const triggerFile = tp.config.target_file;

function cancel(msg) {
  new Notice(msg || "Anulowano tworzenie kampanii.");
  tp.hooks.on_all_templates_executed(async () => {
    const f = app.vault.getAbstractFileByPath(triggerFile.path);
    if (f) await app.vault.delete(f);
  });
  tR = "";
}

// Odczytaj kontekst z pliku systemu, z którego uruchomiono przycisk
const parentFile = tp.config.active_file;
if (!parentFile) { cancel("Nie można odczytać kontekstu."); return; }

const fm = app.metadataCache.getFileCache(parentFile)?.frontmatter;
if (!fm || fm.type !== "system") {
  cancel("Ten przycisk działa tylko na stronie systemu (type: system).");
  return;
}

const systemId    = fm.system;
const systemTitle = fm.title;
const systemFolder = parentFile.parent.path; // np. systemy/Cold City

// ============================================================
// 1. Nazwa kampanii (wymagana)
// ============================================================
const nazwaRaw = await tp.system.prompt("Nazwa kampanii:");
if (!nazwaRaw || !nazwaRaw.trim()) { cancel(); return; }
const nazwa = nazwaRaw.trim();

// ============================================================
// 2. MG (opcjonalnie)
// ============================================================
const mgRaw = await tp.system.prompt("Mistrz Gry (opcjonalnie)", "");
if (mgRaw === null) { cancel(); return; }
const mg = mgRaw.trim();

// ============================================================
// 3. Gatunek (opcjonalnie)
// ============================================================
const gatunekRaw = await tp.system.prompt("Gatunek (opcjonalnie)", "");
if (gatunekRaw === null) { cancel(); return; }
const gatunek = gatunekRaw.trim();

// ============================================================
// Oblicz ścieżki
// ============================================================
function toSlug(str) {
  return str.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const kampaniaSlug   = toSlug(nazwa);
const kampaniaFolder = `${systemFolder}/${nazwa}`;
const kampaniaLink   = `/systemy/${systemId}/${kampaniaSlug}`;

// ============================================================
// Zbuduj frontmatter
// ============================================================
const fmLines = [
  `title: ${nazwa}`,
  `type: kampania`,
  `system: ${systemId}`,
  `system_pelna: ${systemTitle}`,
  `mg: ${mg}`,
];
if (gatunek) fmLines.push(`gatunek: ${gatunek}`);
const tagLine = gatunek
  ? `tags: [kampania, ${systemId}, ${toSlug(gatunek)}]`
  : `tags: [kampania, ${systemId}]`;
fmLines.push(tagLine);

// ============================================================
// Treść folder note kampanii (z przyciskami)
// ============================================================
const content = `---
${fmLines.join("\n")}
---

# ${nazwa}

![${nazwa}](placeholder.jpg)

<div class="obsidian-only">

\`\`\`meta-bind-button
label: "+ Nowy epizod"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Epizod.md"
    openNote: true
\`\`\`

\`\`\`meta-bind-button
label: "+ Nowa postać"
style: default
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Postać.md"
    openNote: true
\`\`\`

</div>

## Opis

*Opis do uzupełnienia.*

## Bohaterowie Graczy

\`\`\`base
filters:
  and:
    - type == "bohater-gracza"
    - kampania == ["${kampaniaSlug}"]
views:
  - type: table
    name: Bohaterowie Graczy
    order:
      - file.name
      - gracz
      - archetyp
    sort:
      - property: title
        direction: ASC
\`\`\`

## Bohaterowie Niezależni

\`\`\`base
filters:
  and:
    - type == "bohater-niezalezny"
    - kampania == ["${kampaniaSlug}"]
views:
  - type: table
    name: Bohaterowie Niezależni
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
\`\`\`

## Lokacje

\`\`\`base
filters:
  and:
    - type == "lokacja"
    - kampania == ["${kampaniaSlug}"]
views:
  - type: table
    name: Lokacje
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
\`\`\`

## Artefakty

\`\`\`base
filters:
  and:
    - type == "artefakt"
    - kampania == ["${kampaniaSlug}"]
views:
  - type: table
    name: Artefakty
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
\`\`\`

## Spis epizodów

\`\`\`base
filters:
  and:
    - type == "epizod"
views:
  - type: table
    name: Epizody
    filters:
      and:
        - file.inFolder("vault/${kampaniaFolder}")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
\`\`\`
`;

// ============================================================
// Utwórz folder i folder note
// ============================================================
await app.vault.createFolder(kampaniaFolder).catch(() => {});
await tp.file.create_new(content, nazwa, true, kampaniaFolder);

tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${kampaniaFolder}/${nazwa}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
