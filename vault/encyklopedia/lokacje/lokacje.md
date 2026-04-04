---
title: Lokacje
type: index
draft: "false"
---

# Lokacje

Miejsca i lokacje ze wszystkich kampanii.

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowa lokacja"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Lokację.md"
    openNote: true
```

</div>

```base
filters:
  and:
    - type == "lokacja"
views:
  - type: cards
    name: Lokacje
    order:
      - title
      - system_pelna
    sort:
      - property: title
        direction: ASC
```
