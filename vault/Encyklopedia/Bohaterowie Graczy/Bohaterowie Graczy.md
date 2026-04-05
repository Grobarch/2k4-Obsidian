---
title: Bohaterowie Graczy
type: index
draft: "false"
---

Postacie graczy ze wszystkich kampanii.

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy BG"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Postać.md"
    openNote: true
```

</div>

```base
filters:
  and:
    - type == "bohater-gracza"
views:
  - type: cards
    name: Bohaterowie Graczy
    order:
      - file.name
      - system_pelna
      - gracz
      - archetyp
    sort:
      - property: title
        direction: ASC
```
