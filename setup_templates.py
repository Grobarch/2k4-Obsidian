import os
import sys

# Define the directory path
dir_path = r"F:\RPG\RPG_repo\2k4-Obsidian\vault\templates"

# Create the directory if it doesn't exist
os.makedirs(dir_path, exist_ok=True)
print(f"Directory ready: {dir_path}")

# Template file contents
files_content = {
    "Template - System.md": """---
title: TYTUŁ SYSTEMU
type: system
system: slug-systemu
wydawca: Wydawca
gatunek: gatunek
tags: [system, slug-systemu]
---

# TYTUŁ SYSTEMU

![TYTUŁ SYSTEMU](placeholder.jpg)

## Opis

*Opis do uzupełnienia.*

## Kampanie

| Kampania | MG | Epizody |
|----------|-------|---------|
| [Nazwa Kampanii](/systemy/slug-systemu/slug-kampanii) | Imię MG | 0 |

## Wszystkie strony

Przeglądaj: [wszystkie strony z tagiem *slug-systemu*](/tags/slug-systemu)
""",
    "Template - Kampania.md": """---
title: TYTUŁ KAMPANII
type: kampania
system: slug-systemu
system_pelna: Pełna Nazwa Systemu
mg: Imię MG
gatunek: gatunek
tags: [kampania, slug-systemu]
---

# TYTUŁ KAMPANII

![TYTUŁ KAMPANII](placeholder.jpg)

## Opis

*Opis do uzupełnienia.*

## Bohaterowie Graczy

<!-- PLAYERS_START -->
| Postać | Gracz | Archetyp |
|--------|-------|----------|
<!-- PLAYERS_END -->

## Bohaterowie Niezależni

<!-- NPCS_START -->
| # | Bohater niezależny |
|---|--------------------|
<!-- NPCS_END -->

## Lokacje

<!-- LOCATIONS_START -->
| # | Lokacja |
|---|---------|
<!-- LOCATIONS_END -->

## Artefakty

<!-- ARTIFACTS_START -->
| # | Artefakt |
|---|----------|
<!-- ARTIFACTS_END -->

## Spis epizodów

<!-- EPISODES_START -->
| # | Tytuł | Data |
|---|-------|------|
<!-- EPISODES_END -->
""",
    "Template - Epizod.md": """---
title: "Epizod XX: \\"Tytuł Epizodu\\""
type: epizod
system: slug-systemu
system_pelna: Pełna Nazwa Systemu
kampania_link: /systemy/slug-systemu/slug-kampanii
kampania: slug-kampanii
mg: Imię MG
data: RRRR-MM-DD
zrodlo: "https://arkadiusz-rygiel.blogspot.com/..."
tags: [epizod, slug-systemu]
---

# Epizod XX: "Tytuł Epizodu"

---

*Opis do uzupełnienia.*
""",
    "Template - Lokacja.md": """---
title: NAZWA LOKACJI
type: lokacja
system: slug-systemu
system_pelna: Pełna Nazwa Systemu
kampania_link: /systemy/slug-systemu/slug-kampanii
kampania: slug-kampanii
tags: [lokacja, slug-systemu]
---

# NAZWA LOKACJI

![NAZWA LOKACJI](placeholder.jpg)

## Opis

*Opis do uzupełnienia.*

## Wystąpienia

*Do uzupełnienia.*
""",
    "Template - Artefakt.md": """---
title: NAZWA ARTEFAKTU
type: artefakt
system: slug-systemu
system_pelna: Pełna Nazwa Systemu
kampania_link: /systemy/slug-systemu/slug-kampanii
kampania: slug-kampanii
tags: [artefakt, slug-systemu]
---

# NAZWA ARTEFAKTU

![NAZWA ARTEFAKTU](placeholder.jpg)

## Opis

*Opis do uzupełnienia.*

## Wystąpienia

*Do uzupełnienia.*
"""
}

# Create all files with UTF-8 encoding
success_count = 0
for filename, content in files_content.items():
    filepath = os.path.join(dir_path, filename)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Created: {filename}")
        success_count += 1
    except Exception as e:
        print(f"✗ Failed to create {filename}: {e}")
        sys.exit(1)

print(f"\n✓ Success! All 5 template files created with UTF-8 encoding.")
print(f"Location: {dir_path}")
