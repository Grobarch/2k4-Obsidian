---
title: Cold Tales
type: kampania
system: cold-city
system_pelna: Cold City
mg: Arkadiusz RYGIEL
gatunek: szpiegowski
tags: [kampania, cold-city, szpiegowski, horror]
draft: "false"
---

# Cold Tales


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
    - kampania == ["cold-tales"]
views:
  - type: table
    name: Bohaterowie Graczy
    order:
      - title
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
    - kampania == ["cold-tales"]
views:
  - type: table
    name: Bohaterowie Niezależni
    order:
      - title
    sort:
      - property: title
        direction: ASC
```

## Lokacje

```base
filters:
  and:
    - type == "lokacja"
    - kampania == ["cold-tales"]
views:
  - type: table
    name: Lokacje
    order:
      - title
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
        - file.inFolder("Systemy/Cold City/Cold Tales")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
