<%*
// ============================================================
// Utwórz System — skrypt Templater
// Wymaga: plugin Templater + plugin Meta Bind
// Uruchamiany z przycisku na stronie Systemy (type: index)
// ============================================================

const triggerFile = tp.config.target_file;

function cancel(msg) {
  new Notice(msg || "Anulowano tworzenie systemu.");
  tp.hooks.on_all_templates_executed(async () => {
    const f = app.vault.getAbstractFileByPath(triggerFile.path);
    if (f) await app.vault.delete(f);
  });
  tR = "";
}

function toSlug(str) {
  return str.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================
// 1. Nazwa systemu (wymagana)
// ============================================================
const nazwaRaw = await tp.system.prompt("Nazwa systemu:");
if (!nazwaRaw || !nazwaRaw.trim()) { cancel(); return; }
const nazwa = nazwaRaw.trim();

// ============================================================
// 2. ID / slug systemu (wymagany)
// ============================================================
const defaultSlug = toSlug(nazwa);
const slugRaw = await tp.system.prompt("ID systemu (slug, lowercase z myślnikami):", defaultSlug);
if (!slugRaw || !slugRaw.trim()) { cancel(); return; }
const systemId = slugRaw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

// ============================================================
// 3. Wydawca (opcjonalnie)
// ============================================================
const wydawcaRaw = await tp.system.prompt("Wydawca (opcjonalnie):", "");
if (wydawcaRaw === null) { cancel(); return; }
const wydawca = wydawcaRaw.trim();

// ============================================================
// 4. Gatunek (opcjonalnie)
// ============================================================
const gatunekRaw = await tp.system.prompt("Gatunek (opcjonalnie, np. horror, fantasy):", "");
if (gatunekRaw === null) { cancel(); return; }
const gatunek = gatunekRaw.trim();

// ============================================================
// Oblicz ścieżki
// ============================================================
const systemFolder = `Systemy/${nazwa}`;

// ============================================================
// Zbuduj frontmatter
// ============================================================
const fmLines = [
  `title: "${nazwa.replace(/"/g, '\\"')}"`,
  `type: system`,
  `system: ${systemId}`,
];
if (wydawca) fmLines.push(`wydawca: ${wydawca}`);
if (gatunek) fmLines.push(`gatunek: ${gatunek}`);

const tagParts = ["system", systemId];
if (gatunek) {
  gatunek.split(",").map(g => g.trim()).filter(Boolean).forEach(g => tagParts.push(toSlug(g)));
}
fmLines.push(`tags: [${tagParts.join(", ")}]`);

// ============================================================
// Treść folder note systemu
// ============================================================
const content = `---
${fmLines.join("\n")}
---

# ${nazwa}



<div class="obsidian-only">

\`\`\`meta-bind-button
label: "+ Nowa kampania"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Kampanię.md"
    openNote: true
\`\`\`

</div>

## Opis

*Opis do uzupełnienia.*

## Kampanie

\`\`\`base
filters:
  and:
    - type == "kampania"
views:
  - type: table
    name: Kampanie
    filters:
      and:
        - file.inFolder("vault/${systemFolder}")
    order:
      - file.name
      - mg
    sort:
      - property: title
        direction: ASC
\`\`\`

## Wszystkie strony

Przeglądaj: [wszystkie strony z tagiem *${systemId}*](/tags/${systemId})
`;

// ============================================================
// Utwórz folder i folder note
// ============================================================
await app.vault.createFolder(systemFolder).catch(() => {});
await tp.file.create_new(content, nazwa, true, systemFolder);

tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${systemFolder}/${nazwa}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
