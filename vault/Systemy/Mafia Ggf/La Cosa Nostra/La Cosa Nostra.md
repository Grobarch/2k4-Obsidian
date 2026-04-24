---
title: La Cosa Nostra
type: kampania
system: mafia-ggf
system_pelna: "Mafia: Gangsterska Gra Fabularna"
mg: Arkadiusz RYGIEL
gatunek: gangsterski
tags: [kampania, mafia-ggf, gangsterski]
draft: "false"
status: "zakończona"
---


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
        - file.inFolder("Systemy/Mafia Ggf/La Cosa Nostra")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
