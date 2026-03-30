---
title: Trylogia Klanu Lwa
type: kampania
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
mg: Arkadiusz RYGIEL
gatunek: samurajski
tags: [kampania, l5k, samurajski]
draft: "false"
---

# Trylogia Klanu Lwa


<div class="obsidian-only">

```meta-bind-button
label: "+ Nowy epizod"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Epizod.md"
    openNote: true
```

```meta-bind-button
label: "+ Nowa postać"
style: default
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Postać.md"
    openNote: true
```

</div>

## Spis epizodow


```base
filters:
  and:
    - type == "epizod"
views:
  - type: table
    name: Epizody
    filters:
      and:
        - file.inFolder("systemy/L5K/Trylogia Klanu Lwa")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
