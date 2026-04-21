#!/usr/bin/env node
/**
 * schema.mjs — Kanoniczny schemat frontmatter dla plików vault
 *
 * Single source of truth: używany przez vault-tools.mjs (normalize, validate)
 * i validate-frontmatter.mjs (CI).
 *
 * SYSTEM_NAMES: mapa system_id → pełna nazwa (system_pelna)
 * TYPE_SCHEMAS: definicje pól per type:
 *   - required:    musi istnieć i być niepuste (błąd walidacji)
 *   - arrayFields: muszą być tablicą (normalize migruje scalar → [scalar])
 *   - computed:    mogą być automatycznie obliczone przez normalize
 *   - defaults:    wartości domyślne dla brakujących pól required
 */

// ─── Mapa systemów ──────────────────────────────────────────────────────────
// Źródło: vault/templates/Utwórz Postać.md (SYSTEMS array)

export const SYSTEM_NAMES = {
  "cold-city":      "Cold City",
  "deadlands":      "Deadlands: Martwe Ziemie",
  "deathwatch":     "Deathwatch",
  "gasnace-slonca": "Gasnące Słońca 2ed",
  "honor-i-krew":   "Honor i Krew",
  "l5k":            "Legenda Pięciu Kręgów 1ed",
  "mafia-ggf":      "Mafia: Gangsterska Gra Fabularna",
  "7th-sea":        "7th Sea",
  "wampir":         "Wampir: Mroczne Wieki",
  "wiedzmin":       "Wiedźmin: Gra Wyobraźni",
  "wfrp-1ed":       "Warhammer Fantasy Role Play 1ed",
  "wfrp-2ed":       "Warhammer Fantasy Role Play 2ed",
  "wfrp-4ed":       "Warhammer Fantasy Role Play 4ed",
  "wolsung":        "Wolsung: Magia Wieku Pary",
};

// ─── Schematy per type ──────────────────────────────────────────────────────

export const TYPE_SCHEMAS = {
  "bohater-gracza": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "bohater-niezalezny": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "epizod": {
    required:    ["title", "type", "system", "system_pelna", "kampania_link", "kampania", "data", "tags"],
    arrayFields: ["tags"],
    computed:    ["system_pelna", "kampania_link", "kampania", "tags"],
    defaults:    { mg: "Arkadiusz RYGIEL" },
  },
  "kampania": {
    required:    ["title", "type", "system", "system_pelna", "mg", "gatunek", "tags", "draft"],
    arrayFields: ["tags"],
    computed:    ["system_pelna", "tags"],
    defaults:    { draft: "false", mg: "Arkadiusz RYGIEL" },
  },
  "system": {
    required:    ["title", "type", "system", "wydawca", "gatunek", "tags", "draft"],
    arrayFields: ["tags"],
    computed:    ["tags"],
    defaults:    { draft: "false" },
  },
  "lokacja": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "artefakt": {
    required:    ["title", "type", "system", "system_pelna", "tags"],
    arrayFields: ["tags", "kampania", "kampania_link"],
    computed:    ["system_pelna", "tags"],
    defaults:    {},
  },
  "scenariusz": {
    required:    ["title", "type", "system", "data", "tags"],
    arrayFields: ["tags"],
    computed:    ["tags"],
    defaults:    {},
  },
  "index": {
    required:    ["title", "type"],
    arrayFields: ["tags"],
    computed:    [],
    defaults:    {},
  },
};
