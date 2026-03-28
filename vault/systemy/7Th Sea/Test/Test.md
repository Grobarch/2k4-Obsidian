---
title: Test
type: kampania
system: 7th-sea
system_pelna: 7th Sea
mg: Krzyś
gatunek: Test
tags: [kampania, 7th-sea, test]
draft: "false"
---

# Test

![Test](placeholder.jpg)

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

## Opis

*Opis do uzupełnienia.*

## Bohaterowie Graczy

```base
filters:
  and:
    - type == "bohater-gracza"
    - kampania == ["test"]
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

## Bohaterowie Niezależni

```base
filters:
  and:
    - type == "bohater-niezalezny"
    - kampania == ["test"]
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
    - kampania == ["test"]
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
    - kampania == ["test"]
views:
  - type: table
    name: Artefakty
    order:
      - title
    sort:
      - property: title
        direction: ASC
```

## Spis epizodów

```base
filters:
  and:
    - type == "epizod"
views:
  - type: table
    name: Epizody
    filters:
      and:
        - file.inFolder("Systemy/7Th Sea/Test")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
