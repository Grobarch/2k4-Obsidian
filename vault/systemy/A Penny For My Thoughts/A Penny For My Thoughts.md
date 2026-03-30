---
title: A Penny for My Thoughts
type: system
system: a-penny-for-my-thoughts
wydawca: Evil Hat Productions
gatunek: psychologiczny
tags: [system, a-penny-for-my-thoughts, psychologiczny]
draft: "false"
---

# A Penny for My Thoughts


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

Kameralna gra fabularna autorstwa Paula Tevis'a, w której gracze wcielają się w pacjentów kliniki odzyskujących utracone wspomnienia za pomocą eksperymentalnego leku. Rozgrywka opiera się na wspólnym tworzeniu narracji -- gracze podsuwają sobie nawzajem fragmenty wspomnień, budując coraz bardziej niepokojące historie. To gra bez Mistrza Gry, idealna na jednorazowe sesje o silnym ładunku psychologicznym.

## Scenariusze samodzielne


```base
filters:
  and:
    - type == "scenariusz"
views:
  - type: table
    name: Scenariusze
    filters:
      and:
        - system == "a-penny-for-my-thoughts"
    order:
      - title
      - data
    sort:
      - property: data
        direction: ASC
```

## Wszystkie strony

Przegladaj: [wszystkie strony z tagiem *a-penny-for-my-thoughts*](/tags/a-penny-for-my-thoughts)
