---
title: Gasnące Słońca 2ed
type: system
system: gasnace-slonca
wydawca: Gramel
gatunek: space fantasy
tags: [system, gasnace-slonca, space-fantasy]
draft: "false"
---

# Gasnące Słońca 2ed


<div class="obsidian-only">

```meta-bind-button
label: "+ Nowa kampania"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Kampanię.md"
    openNote: true
```

</div>

## Opis

Polska gra fabularna wydana przez Gramel, osadzona w oryginalnym uniwersum kosmicznego fantasy, gdzie ludzkość skolonizowała odległe gwiazdy, a cywilizacja opiera się na mistycznych mocach i feudalnych strukturach. Świat gry łączy elementy space opery z baśniową estetyką i motywami słowiańskimi. System oferuje unikatowe połączenie przygody kosmicznej z duchowością i magią.

## Kampanie


```base
filters:
  and:
    - type == "kampania"
views:
  - type: table
    name: Kampanie
    filters:
      and:
        - file.inFolder("systemy/Gasnace Slonca")
    order:
      - title
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *gasnace-slonca*](/tags/gasnace-slonca)
