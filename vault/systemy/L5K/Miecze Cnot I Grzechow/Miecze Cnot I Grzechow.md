---
title: Miecze cnót i grzechów, inaczej zwane mieczami odwróconych imion
type: kampania
system: l5k
system_pelna: Legenda Pięciu Kręgów 1ed
mg: Arkadiusz RYGIEL
gatunek: samurajski
tags: [kampania, l5k, samurajski]
draft: "false"
---

# Miecze cnót i grzechów, inaczej zwane mieczami odwróconych imion


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
    - kampania == ["miecze-cnot-i-grzechow"]
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
    - kampania == ["miecze-cnot-i-grzechow"]
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
    - kampania == ["miecze-cnot-i-grzechow"]
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
    - kampania == ["miecze-cnot-i-grzechow"]
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
        - file.inFolder("Systemy/L5K/Miecze Cnot I Grzechow")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
