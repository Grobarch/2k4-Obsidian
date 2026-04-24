---
title: Cold Tales
type: kampania
system: cold-city
system_pelna: Cold City
mg: Arkadiusz RYGIEL
gatunek: szpiegowski
tags: [kampania, cold-city, szpiegowski, horror]
draft: "false"
status: "zakończona"
---

![[Systemy/Cold City/Cold Tales/assets/Cold Tales Po drugiej stronie Berlina Arkadiusz Rygiel.png]]
*Ilustracja: Arkadiusz Rygiel*

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
        - kampania == "cold-tales"
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
        - kampania == "cold-tales"
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
```

## Lokacje


```base
filters:
  and:
    - type == "lokacja"
views:
  - type: table
    name: Lokacje
    filters:
      and:
        - kampania == "cold-tales"
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
        - file.inFolder("Systemy/Cold City/Cold Tales")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
