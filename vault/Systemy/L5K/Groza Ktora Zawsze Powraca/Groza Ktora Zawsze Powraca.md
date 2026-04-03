---
title: Groza, która zawsze powraca
type: kampania
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
mg: Arkadiusz RYGIEL
gatunek: samurajski
tags: [kampania, l5k, samurajski]
draft: "false"
---

# Groza, która zawsze powraca


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

## Bohaterowie Graczy


```base
filters:
  and:
    - type == "bohater-gracza"
views:
  - type: table
    name: Bohaterowie Graczy
    filters:
      and:
        - kampania == "groza-ktora-zawsze-powraca"
    order:
      - file.name
      - gracz
      - archetyp
    sort:
      - property: title
        direction: ASC
```

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
        - kampania == "groza-ktora-zawsze-powraca"
    order:
      - file.name
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
        - file.inFolder("Systemy/L5K/Groza Ktora Zawsze Powraca")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
