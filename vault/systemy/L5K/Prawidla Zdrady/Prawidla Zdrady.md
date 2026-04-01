---
title: Prawidła zdrady
type: kampania
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
mg: Arkadiusz RYGIEL
gatunek: samurajski
tags: [kampania, l5k, samurajski]
draft: "false"
---

# Prawidła zdrady


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

## Bohaterowie Niezalezni


```base
filters:
  and:
    - type == "bohater-niezalezny"
views:
  - type: table
    name: Bohaterowie Niezależni
    filters:
      and:
        - kampania == "prawidla-zdrady"
    sort:
      - property: title
        direction: ASC
```

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
        - file.inFolder("systemy/L5K/Prawidla Zdrady")
    order:
      - data
    sort:
      - property: data
        direction: ASC
```
