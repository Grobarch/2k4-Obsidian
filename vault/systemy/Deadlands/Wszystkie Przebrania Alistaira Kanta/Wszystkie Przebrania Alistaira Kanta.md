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
views:
  - type: table
    name: Bohaterowie Graczy
    filters:
      and:
        - kampania == "wszystkie-przebrania-alistaira-kanta"
    order:
      - file.name
      - gracz
      - archetyp
    sort:
      - property: title
        direction: DESC

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
        - kampania == "wszystkie-przebrania-alistaira-kanta"
    order:
      - file.name
    sort:
      - property: title
        direction: ASC
```

## Artefakty


```base
filters:
  and:
    - type == "artefakt"
views:
  - type: table
    name: Artefakty
    filters:
      and:
        - kampania == "wszystkie-przebrania-alistaira-kanta"
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
        - file.inFolder("systemy/Deadlands/Wszystkie Przebrania Alistaira Kanta")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
