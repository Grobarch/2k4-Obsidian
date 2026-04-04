---
title: Artefakty
type: index
draft: "false"
---

# Artefakty

Przedmioty i artefakty ze wszystkich kampanii.

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy artefakt"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Artefakt.md"
    openNote: true
```

</div>

```base
filters:
  and:
    - type == "artefakt"
views:
  - type: cards
    name: Artefakty
    order:
      - file.name
      - system_pelna
    sort:
      - property: title
        direction: ASC
```
