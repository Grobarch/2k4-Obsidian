---
title: Wszystkie przebrania Alistaira Kanta
type: kampania
system: deadlands
system_pelna: "Deadlands: Martwe Ziemie"
mg: Arkadiusz RYGIEL
gatunek: western
tags: [kampania, deadlands, western, horror]
draft: "false"
---

# Wszystkie przebrania Alistaira Kanta


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
    - kampania == ["wszystkie-przebrania-alistaira-kanta"]
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

## Lokacje

```base
filters:
  and:
    - type == "lokacja"
    - kampania == ["wszystkie-przebrania-alistaira-kanta"]
views:
  - type: table
    name: Lokacje
    order:
      - title
    sort:
      - property: title
        direction: ASC
```

## Artefakty

```base
filters:
  and:
    - type == "artefakt"
    - kampania == ["wszystkie-przebrania-alistaira-kanta"]
views:
  - type: table
    name: Artefakty
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
        - file.inFolder("Systemy/Deadlands/Wszystkie Przebrania Alistaira Kanta")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
