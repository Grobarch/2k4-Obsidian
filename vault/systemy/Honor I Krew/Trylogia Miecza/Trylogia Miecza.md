---
title: Trylogia miecza
type: kampania
system: honor-i-krew
system_pelna: Honor i Krew
mg: Arkadiusz RYGIEL
gatunek: samurajski
tags: [kampania, honor-i-krew, fantasy, samurajski]
draft: "false"
---

# Trylogia miecza


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
        - file.inFolder("Systemy/Honor I Krew/Trylogia Miecza")
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```
