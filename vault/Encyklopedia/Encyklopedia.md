---
title: Encyklopedia
type: index
---

Baza postaci, lokacji i artefaktów ze wszystkich kampanii.

## Sekcje

- [Bohaterowie Graczy](/encyklopedia/bohaterowie-graczy)
- [Bohaterowie Niezależni](/encyklopedia/bohaterowie-niezalezni)
- [Lokacje](/encyklopedia/lokacje)
- [Artefakty](/encyklopedia/artefakty)

---

<div class="obsidian-only">

```meta-bind-button
label: "+ Nowa postać"
style: primary
actions:
  - type: templaterCreateNote
    templateFile: "Templates/Utwórz Postać.md"
    openNote: true
```

</div>

## Wszystkie wpisy

```base
filters:
  and:
    - type == ["bohater-gracza", "bohater-niezalezny", "lokacja", "artefakt"]
views:
  - type: table
    name: Encyklopedia
    order:
      - file.name
      - file.folder
      - kampania
    sort:
      - property: title
        direction: ASC
```
