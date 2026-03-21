#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from pathlib import Path
import subprocess
import sys

# Try to run the existing create_templates.py script
try:
    result = subprocess.run([sys.executable, r"F:\RPG\RPG_repo\2k4-Obsidian\create_templates.py"], 
                          capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    print(f"Script exit code: {result.returncode}")
except Exception as e:
    print(f"Error running script: {e}")
    # If script fails, create manually
    print("\nFalling back to manual creation...")
    
    dir_path = r"F:\RPG\RPG_repo\2k4-Obsidian\vault\templates"
    
    # Create the directory
    try:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ Directory created: {dir_path}")
    except Exception as e:
        print(f"✗ Error creating directory: {e}")
        exit(1)
    
    # Define the template files
    templates = {
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

Przeglądaj: [wszystkie strony z tagiem *slug-systemu*](/tags/slug-systemu)""",

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
<!-- EPISODES_END -->""",

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

*Opis do uzupełnienia.*""",

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

*Do uzupełnienia.*""",

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

*Do uzupełnienia.*"""
    }
    
    # Create all template files
    created_count = 0
    for filename, content in templates.items():
        file_path = os.path.join(dir_path, filename)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Created: {filename}")
            created_count += 1
        except Exception as e:
            print(f"✗ Error creating {filename}: {e}")
    
    print(f"\n✓ Successfully created {created_count}/5 template files")
