---
title: Cold City
type: system
system: cold-city
wydawca: Contested Ground Studios
gatunek: szpiegowski, horror
tags: [system, cold-city, szpiegowski, horror]
draft: "false"
---

# Cold City


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

Gra fabularna osadzona w podzielonym Berlinie roku 1950, gdzie międzynarodowa grupa agentów poluje na potwory -- pozostałości nazistowskich eksperymentów z czasów II wojny światowej. System kładzie nacisk na zaufanie i zdradę między postaciami, które mają własne ukryte cele i narodowe lojalności. Wydana przez Contested Ground Studios, łączy szpiegowski thriller z horrorem w klimacie zimnej wojny.

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
        - file.inFolder("Systemy/Cold City")
    order:
      - file.name
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *cold-city*](/tags/cold-city)
