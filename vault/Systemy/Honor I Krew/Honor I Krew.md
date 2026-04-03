---
title: Honor i Krew
type: system
system: honor-i-krew
wydawca: Gramel
gatunek: samurajski
tags: [system, honor-i-krew, fantasy, samurajski]
draft: "false"
---

# Honor i Krew


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

Polska gra fabularna wydana przez Gramel, osadzona w feudalnej Japonii, skupiona na tematyce samurajskiej -- honorze, lojalności i tragicznych wyborach między obowiązkiem a uczuciem. System kładzie nacisk na dramaturgię i konflikty moralne bohaterów w świecie, gdzie miecz i etykieta są równie ważne. Gra inspirowana japońską kulturą i filmami o samurajach.

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
        - file.inFolder("Systemy/Honor I Krew")
    order:
      - file.name
      - mg
    sort:
      - property: title
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *honor-i-krew*](/tags/honor-i-krew)
