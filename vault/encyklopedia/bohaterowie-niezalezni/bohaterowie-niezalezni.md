---
title: Bohaterowie Niezależni
type: index
draft: "false"
---

# Bohaterowie Niezależni

Postacie niezależne (BN) ze wszystkich kampanii.

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy BN"
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
    - type == "bohater-niezalezny"
views:
  - type: cards
    name: Bohaterowie Niezależni
    order:
      - title
      - system_pelna
    sort:
      - property: title
        direction: ASC
```
