<%*
// ============================================================
// Utwórz Postać — skrypt Templater
// Wymaga: plugin Templater + plugin Meta Bind
// Może być uruchamiany z: kampanii (type: kampania),
//   systemu (type: system) lub encyklopedii (inne).
// ============================================================

const triggerFile = tp.config.target_file;

// --- Systemy ---
const SYSTEMS = [
  { id: "cold-city",      name: "Cold City",             pelna: "Cold City" },
  { id: "deadlands",      name: "Deadlands",             pelna: "Deadlands: Martwe Ziemie" },
  { id: "gasnace-slonca", name: "Gasnące Słońca 2ed",    pelna: "Gasnące Słońca 2ed" },
  { id: "honor-i-krew",   name: "Honor i Krew",          pelna: "Honor i Krew" },
  { id: "l5k",            name: "L5K 1ed",               pelna: "Legenda Pięciu Kręgów 1ed" },
  { id: "mafia-ggf",      name: "Mafia GGF",             pelna: "Mafia: Gangsterska Gra Fabularna" },
  { id: "7th-sea",        name: "7th Sea",               pelna: "7th Sea" },
  { id: "wampir",         name: "Wampir: Mroczne Wieki", pelna: "Wampir: Mroczne Wieki" },
  { id: "wiedzmin",       name: "Wiedźmin",              pelna: "Wiedźmin: Gra Wyobraźni" },
  { id: "wfrp",           name: "WFRP 2ed",              pelna: "Warhammer Fantasy Role Play" },
  { id: "wolsung",        name: "Wolsung",               pelna: "Wolsung: Magia Wieku Pary" },
];

// --- Kampanie per system ---
const KAMPANIE = {
  "cold-city":      [{ id: "cold-tales",                              name: "Cold Tales",                          link: "/systemy/cold-city/cold-tales" }],
  "deadlands":      [{ id: "wszystkie-przebrania-alistaira-kanta",    name: "Wszystkie przebrania Alistaira Kanta", link: "/systemy/deadlands/wszystkie-przebrania-alistaira-kanta" }],
  "gasnace-slonca": [{ id: "tajemnice-z-hortusa",                     name: "Tajemnice z Hortusa",                 link: "/systemy/gasnace-slonca/tajemnice-z-hortusa" }],
  "honor-i-krew":   [{ id: "trylogia-miecza",                         name: "Trylogia miecza",                     link: "/systemy/honor-i-krew/trylogia-miecza" }],
  "l5k":            [
    { id: "groza-ktora-zawsze-powraca", name: "Groza, która zawsze powraca", link: "/systemy/l5k/groza-ktora-zawsze-powraca" },
    { id: "miecze-cnot-i-grzechow",    name: "Miecze cnót i grzechów",      link: "/systemy/l5k/miecze-cnot-i-grzechow" },
    { id: "prawidla-zdrady",           name: "Prawidła zdrady",             link: "/systemy/l5k/prawidla-zdrady" },
    { id: "trylogia-klanu-lwa",        name: "Trylogia Klanu Lwa",          link: "/systemy/l5k/trylogia-klanu-lwa" },
  ],
  "mafia-ggf":      [{ id: "la-cosa-nostra", name: "La Cosa Nostra", link: "/systemy/mafia-ggf/la-cosa-nostra" }],
  "7th-sea":        [{ id: "w-maskach",       name: "W maskach",      link: "/systemy/7th-sea/w-maskach" }],
  "wampir":         [{ id: "diabel-z-lazareni", name: "Diabeł z Łazareni", link: "/systemy/wampir/diabel-z-lazareni" }],
  "wiedzmin":       [{ id: "sludzy-miecza",   name: "Słudzy miecza",  link: "/systemy/wiedzmin/sludzy-miecza" }],
  "wfrp":           [
    { id: "listy-z-praag",  name: "Listy z Praag",  link: "/systemy/wfrp/listy-z-praag" },
    { id: "losy-bohaterow", name: "Losy bohaterów", link: "/systemy/wfrp/losy-bohaterow" },
  ],
  "wolsung": [],
};

function cancel(msg) {
  new Notice(msg || "Anulowano tworzenie postaci.");
  tp.hooks.on_all_templates_executed(async () => {
    const f = app.vault.getAbstractFileByPath(triggerFile.path);
    if (f) await app.vault.delete(f);
  });
  tR = "";
}

// ============================================================
// Odczytaj kontekst z pliku nadrzędnego
// ============================================================
const parentFile = tp.config.active_file;
const parentFm   = parentFile
  ? app.metadataCache.getFileCache(parentFile)?.frontmatter
  : null;
const parentType = parentFm?.type || "";

// Wartości pre-wypełnione z kontekstu
let preSystemId    = "";
let preKampaniaId  = "";
let preKampaniaName = "";
let preKampaniaLink = "";

if (parentType === "kampania") {
  // Przycisk kliknięty na stronie kampanii
  preSystemId = parentFm.system || "";
  const folderName = parentFile.parent.name;
  // Slug kampanii z nazwy folderu
  function toSlugLocal(str) {
    return str.toLowerCase()
      .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
      .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
      .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  preKampaniaId = toSlugLocal(folderName);
  preKampaniaLink = `/systemy/${preSystemId}/${preKampaniaId}`;
  // Szukaj w liście kampanii po id
  const listaK = KAMPANIE[preSystemId] || [];
  const znaleziona = listaK.find(k => k.id === preKampaniaId);
  preKampaniaName = znaleziona ? znaleziona.name : parentFm.title || folderName;
} else if (parentType === "system") {
  // Przycisk kliknięty na stronie systemu
  preSystemId = parentFm.system || "";
}

// ============================================================
// 1. Imię postaci (wymagane)
// ============================================================
const name = await tp.system.prompt("Imię postaci");
if (!name || !name.trim()) { cancel(); return; }
const nameTrimmed = name.trim();

// ============================================================
// 2. Typ (BG / BN)
// ============================================================
const typeId = await tp.system.suggester(
  ["Bohater Gracza (BG)", "Bohater Niezależny (BN)"],
  ["bohater-gracza",      "bohater-niezalezny"]
);
if (!typeId) { cancel(); return; }
const typeLabel = typeId;
const folder    = typeId === "bohater-gracza"
  ? "encyklopedia/bohaterowie-graczy"
  : "encyklopedia/bohaterowie-niezalezni";

// ============================================================
// 3. System (pominięty jeśli znany z kontekstu)
// ============================================================
let systemId;
if (preSystemId) {
  systemId = preSystemId;
} else {
  systemId = await tp.system.suggester(
    SYSTEMS.map(s => s.name),
    SYSTEMS.map(s => s.id)
  );
  if (!systemId) { cancel(); return; }
}
const system = SYSTEMS.find(s => s.id === systemId) || { id: systemId, name: systemId, pelna: systemId };

// ============================================================
// 4. Kampanie (wielokrotny wybór, opcjonalne)
// ============================================================
let wybraneCampanie = []; // array of {id, name, link}

// Pre-wypełnij z kontekstu kampanii
if (preKampaniaId) {
  wybraneCampanie.push({ id: preKampaniaId, name: preKampaniaName, link: preKampaniaLink });
}

// Pętla wyboru kolejnych kampanii
const dostepneKampanie = KAMPANIE[systemId] || [];
let remaining = dostepneKampanie.filter(k => !wybraneCampanie.find(w => w.id === k.id));

while (remaining.length > 0) {
  const doneLabel = wybraneCampanie.length > 0
    ? "— gotowe —"
    : "— brak / nie dotyczy —";
  const opcje    = [doneLabel, ...remaining.map(k => k.name)];
  const wartosci = ["__done__", ...remaining.map(k => k.id)];
  const wybor = await tp.system.suggester(opcje, wartosci);
  if (wybor === null) { cancel(); return; }
  if (wybor === "__done__") break;
  const kamp = remaining.find(k => k.id === wybor);
  wybraneCampanie.push(kamp);
  remaining = remaining.filter(k => k.id !== wybor);
}

// ============================================================
// 5. Gracz (opcjonalnie — tylko BG)
// ============================================================
let gracz = "";
if (typeId === "bohater-gracza") {
  const g = await tp.system.prompt("Gracz (opcjonalnie — Enter aby pominąć)", "");
  if (g === null) { cancel(); return; }
  gracz = g.trim();
}

// ============================================================
// 6. Archetyp (opcjonalnie)
// ============================================================
const a = await tp.system.prompt("Archetyp (opcjonalnie — Enter aby pominąć)", "");
if (a === null) { cancel(); return; }
const archetyp = a.trim();

// ============================================================
// Wczytaj statblock z pliku szablonu
// ============================================================
let statblock = "";
const sbAbstract =
  app.vault.getAbstractFileByPath(`templates/statblocks/${systemId}.md`) ||
  app.vault.getAbstractFileByPath(`templates/statblocks/generic.md`);
if (sbAbstract && sbAbstract.stat) {
  statblock = await app.vault.read(sbAbstract);
}

// ============================================================
// Zbuduj frontmatter
// ============================================================
const fmLines = [
  `title: "${nameTrimmed.replace(/"/g, '\\"')}"`,
  `type: ${typeLabel}`,
  `system: ${systemId}`,
  `system_pelna: "${system.pelna}"`,
];
if (wybraneCampanie.length === 1) {
  fmLines.push(`kampania_link: ${wybraneCampanie[0].link}`);
  fmLines.push(`kampania: ${wybraneCampanie[0].id}`);
} else if (wybraneCampanie.length > 1) {
  fmLines.push(`kampania_link:`);
  for (const k of wybraneCampanie) fmLines.push(`  - ${k.link}`);
  fmLines.push(`kampania:`);
  for (const k of wybraneCampanie) fmLines.push(`  - ${k.id}`);
}
if (typeId === "bohater-gracza") fmLines.push(`gracz: ${gracz}`);
fmLines.push(`archetyp: ${archetyp}`);
fmLines.push(`tags: [${typeLabel}, ${systemId}]`);

// ============================================================
// Sekcja Kampanie
// ============================================================
const kampaniaSection = wybraneCampanie.length > 0
  ? `\n## Kampanie\n\n` + wybraneCampanie.map(k => `- [${k.name}](${k.link}/${k.id})`).join("\n") + "\n"
  : "";

// ============================================================
// Treść notatki
// ============================================================
const content = `---
${fmLines.join("\n")}
---

# ${nameTrimmed}

![Portret ${nameTrimmed}](placeholder.jpg)


## Statystyki

<!-- SYSTEM: ${systemId} -->
${statblock.trimEnd()}

## Opis

*Opis do uzupełnienia.*

## Wystąpienia
${kampaniaSection}`;

// ============================================================
// Utwórz notatkę i otwórz ją
// ============================================================
await tp.file.create_new(content, nameTrimmed, true, folder);

tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${folder}/${nameTrimmed}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
