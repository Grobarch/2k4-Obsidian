---
title: 7th Sea
type: system
system: 7th-sea
wydawca: AEG / John Wick Presents
gatunek: przygodowy, fantasy
tags: ["system", "7th-Sea", "szpiegowski", "przygodowy", "fantasy", "7th-sea"]
draft: "false"
---

# 7th Sea


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

Gra fabularna osadzona w świecie inspirowanym Europą XVII wieku, pełnym piratów, muszkieterów i dworskich intryg. System kładzie nacisk na filmową akcję w stylu płaszcza i szpady, gdzie bohaterowie są odważnymi awanturnikami walczącymi z tyranią. Wydana przez AEG, łączy romantyczną przygodę z magią opartą na tajemnych krwistych liniach.

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
        - file.inFolder("vault/systemy/7Th Sea")
    order:
      - file.name
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *7th-sea*](/tags/7th-sea)
