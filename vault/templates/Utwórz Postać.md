<%*
// ============================================================
// Utwórz Postać — skrypt Templater
// Wymaga: plugin Templater + plugin Meta Bind
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
    { id: "groza-ktora-zawsze-powraca",          name: "Groza, która zawsze powraca",          link: "/systemy/l5k/groza-ktora-zawsze-powraca" },
    { id: "miecze-cnot-i-grzechow",              name: "Miecze cnót i grzechów",              link: "/systemy/l5k/miecze-cnot-i-grzechow" },
    { id: "prawidla-zdrady",                     name: "Prawidła zdrady",                     link: "/systemy/l5k/prawidla-zdrady" },
    { id: "trylogia-klanu-lwa",                  name: "Trylogia Klanu Lwa",                  link: "/systemy/l5k/trylogia-klanu-lwa" },
  ],
  "mafia-ggf":      [{ id: "la-cosa-nostra",                          name: "La Cosa Nostra",                      link: "/systemy/mafia-ggf/la-cosa-nostra" }],
  "7th-sea":        [{ id: "w-maskach",                               name: "W maskach",                           link: "/systemy/7th-sea/w-maskach" }],
  "wampir":         [{ id: "diabel-z-lazareni",                       name: "Diabeł z Łazareni",                   link: "/systemy/wampir/diabel-z-lazareni" }],
  "wiedzmin":       [{ id: "sludzy-miecza",                           name: "Słudzy miecza",                       link: "/systemy/wiedzmin/sludzy-miecza" }],
  "wfrp":           [
    { id: "listy-z-praag",   name: "Listy z Praag",   link: "/systemy/wfrp/listy-z-praag" },
    { id: "losy-bohaterow",  name: "Losy bohaterów",  link: "/systemy/wfrp/losy-bohaterow" },
  ],
  "wolsung": [],
};

// Pomocnicza funkcja do anulowania
function cancel(msg) {
  new Notice(msg || "Anulowano tworzenie postaci.");
  tp.hooks.on_all_templates_executed(async () => {
    const f = app.vault.getAbstractFileByPath(triggerFile.path);
    if (f) await app.vault.delete(f);
  });
  tR = "";
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
const typeLabel = typeId === "bohater-gracza" ? "bohater-gracza" : "bohater-niezalezny";
const folder    = typeId === "bohater-gracza"
  ? "encyklopedia/bohaterowie-graczy"
  : "encyklopedia/bohaterowie-niezalezni";

// ============================================================
// 3. System (wymagany)
// ============================================================
const systemId = await tp.system.suggester(
  SYSTEMS.map(s => s.name),
  SYSTEMS.map(s => s.id)
);
if (!systemId) { cancel(); return; }
const system = SYSTEMS.find(s => s.id === systemId);

// ============================================================
// 4. Kampania (opcjonalna)
// ============================================================
let kampaniaId   = "";
let kampaniaName = "";
let kampaniaLink = "";

const dostepneKampanie = KAMPANIE[systemId] || [];
if (dostepneKampanie.length > 0) {
  const opcje    = ["— brak / nie dotyczy —", ...dostepneKampanie.map(k => k.name)];
  const wartosci = ["",                        ...dostepneKampanie.map(k => k.id)];
  const wybor = await tp.system.suggester(opcje, wartosci);
  if (wybor === null) { cancel(); return; }
  if (wybor) {
    kampaniaId   = wybor;
    const kamp   = dostepneKampanie.find(k => k.id === wybor);
    kampaniaName = kamp.name;
    kampaniaLink = kamp.link;
  }
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
if (kampaniaId) {
  fmLines.push(`kampania_link: ${kampaniaLink}`);
  fmLines.push(`kampania: ${kampaniaId}`);
}
if (typeId === "bohater-gracza") fmLines.push(`gracz: ${gracz}`);
fmLines.push(`archetyp: ${archetyp}`);
fmLines.push(`tags: [${typeLabel}, ${systemId}]`);

// ============================================================
// Sekcja Kampanie
// ============================================================
const kampaniaSection = kampaniaId
  ? `\n## Kampanie\n\n- [${kampaniaName}](${kampaniaLink}/${kampaniaId})\n`
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

// Usuń plik wyzwalacza (pusty plik tworzony przez Meta Bind / Templater)
tp.hooks.on_all_templates_executed(async () => {
  const f = app.vault.getAbstractFileByPath(triggerFile.path);
  if (f && f.path !== `${folder}/${nameTrimmed}.md`) {
    await app.vault.delete(f);
  }
});

tR = "";
_%>
