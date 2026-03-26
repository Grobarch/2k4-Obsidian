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
fmLines.push(`draft: true`);

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

| Kampania | MG | Epizody |
|----------|-------|---------|

## Wszystkie strony

Przeglądaj: [wszystkie strony z tagiem *${systemId}*](/tags/${systemId})
`;

// ============================================================
// Utwórz folder i folder note
// ============================================================
await app.vault.createFolder(systemFolder).catch(() => {});
await tp.file.create_new(content, nazwa, true, systemFolder);

// ============================================================
// Aktualizuj tabelkę systemów w Systemy.md
// ============================================================
const systemyNotePath = "Systemy/Systemy.md";
const systemyFile = app.vault.getAbstractFileByPath(systemyNotePath);
if (systemyFile) {
  const systemyContent = await app.vault.read(systemyFile);
  const systemLink = `/systemy/${systemId}/${systemId}`;
  const displayLink = `[${nazwa}](${systemLink})`;
  const newRow = `| ${displayLink} | ${gatunek} | 0 |`;

  // Wstaw wiersz przed marker END, zachowując porządek alfabetyczny
  const startMarker = "<!-- SYSTEMS_START -->";
  const endMarker = "<!-- SYSTEMS_END -->";
  const startIdx = systemyContent.indexOf(startMarker);
  const endIdx = systemyContent.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    const before = systemyContent.substring(0, startIdx + startMarker.length);
    const tableContent = systemyContent.substring(startIdx + startMarker.length, endIdx);
    const after = systemyContent.substring(endIdx);

    // Parsuj istniejące wiersze tabelki
    const lines = tableContent.split("\n").filter(l => l.trim());
    const headerLines = lines.filter(l => l.includes("System") || l.match(/^\|[-\s|]+\|$/));
    const dataLines = lines.filter(l => !l.includes("System") && !l.match(/^\|[-\s|]+\|$/) && l.startsWith("|"));

    // Dodaj nowy wiersz i posortuj alfabetycznie po nazwie systemu
    dataLines.push(newRow);
    dataLines.sort((a, b) => {
      const nameA = (a.match(/\[([^\]]+)\]/) || ["", ""])[1].toLowerCase();
      const nameB = (b.match(/\[([^\]]+)\]/) || ["", ""])[1].toLowerCase();
      return nameA.localeCompare(nameB, "pl");
    });

    const newTable = [...headerLines, ...dataLines].join("\n");
    const updated = `${before}\n${newTable}\n${after}`;

    if (updated !== systemyContent) {
      await app.vault.modify(systemyFile, updated);
    }
  }
}

tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${systemFolder}/${nazwa}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
