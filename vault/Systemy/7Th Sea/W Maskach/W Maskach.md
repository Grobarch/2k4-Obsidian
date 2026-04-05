---
title: W maskach
type: kampania
system: 7th-sea
system_pelna: 7th Sea
mg: Arkadiusz RYGIEL
gatunek: fantasy
tags: ["kampania", "7th-Sea", "szpiegowski", "fantasy", "7th-sea"]
draft: "false"
---


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
        - file.inFolder("Systemy/7Th Sea/W Maskach")
    order:
      - file.name
      - data
    sort:
      - property: data
        direction: ASC
```
