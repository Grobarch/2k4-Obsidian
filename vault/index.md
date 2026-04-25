---
title: "Wiki RPG — Papierowe RPG"
---

> [!quote] Witaj, Wędrowcze!
> Znajdujesz się w otwartej wiki dokumentującej dziesiątki kampanii, barwne postacie i niesamowite światy papierowego RPG tworzone i prowadzone przez **[Arkadiusza Rygla](https://arkadiusz-rygiel.blogspot.com)**.

***

## 🧭 Główne działy

> [!info] 📜 **[Encyklopedia](encyklopedia)**
> Zbiór wspólnej wiedzy o opisywanych światach. Znajdziesz tu śmiałych herosów, zawiłe lokacje, potężne artefakty i najważniejszych Bohaterów Niezależnych.

> [!example] 🎲 **[Systemy i Kampanie](systemy)**
> Zbiór używanych przez nas mechanik oraz wszystkie obszerne notatki, logi i podsumowania sesji z naszych głównych kampanii RPG.

> [!tip] 🗺️ **[Scenariusze](scenariusze)**
> Gotowe przygody, konspekty one-shotów dla Mistrzów Gry do rozegrania przy własnym stole ze swoimi graczami.

***

## 🎯 Aktywne kampanie

```base
filters:
  and:
    - type == "kampania"
    - status == "aktywna"
views:
  - type: cards
    name: Aktywne kampanie
    order:
      - file.name
      - system_pelna
      - mg
      - gatunek
    sort:
      - property: title
        direction: ASC
```

## ⏱️ Ostatnio edytowane

```base
filters:
  and:
    - type == ["epizod", "scenariusz", "bohater-gracza", "bohater-niezalezny", "lokacja", "artefakt", "kampania", "system"]
limit: 10
views:
  - type: list
    name: Ostatnio edytowane
    order:
      - file.name
      - type
      - file.mtime
    sort:
      - property: file.mtime
        direction: DESC
```

## 🎭 BN do statowania

> [!todo] Raport kompletności statblocków
> Sekcja zostanie włączona po wdrożeniu raportu kompletności (osobny ticket: lista konkretnych postaci z brakującymi polami statblocka). Do tego czasu: przeglądaj wszystkich BN w [Encyklopedii → Bohaterowie Niezależni](/encyklopedia/bohaterowie-niezalezni/bohaterowie-niezalezni).

***

## 📚 Rozegrane kampanie

```base
filters:
  and:
    - type == "kampania"
    - status == "zakończona"
views:
  - type: table
    name: Rozegrane kampanie
    order:
      - file.name
      - system_pelna
      - gatunek
    sort:
      - property: title
        direction: ASC
```
