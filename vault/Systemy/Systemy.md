---
title: Systemy
type: index
tags: [systemy]
---

Indeks wszystkich systemów RPG, w których prowadzono kampanie i pisano scenariusze.

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy system"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz System.md"
    openNote: true
```

</div>

## Spis systemów


```base
filters:
  and:
    - type == "system"
views:
  - type: table
    name: Systemy
    order:
      - file.name
      - gatunek
    sort:
      - property: title
        direction: ASC
```
