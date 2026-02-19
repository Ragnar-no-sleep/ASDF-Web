---
name: cynic-burn
description: Analyze code for simplification. Find orphans, hotspots, giants, duplicates. 'Don't extract, burn' — three similar lines beat a premature abstraction. Use when asked to simplify, reduce complexity, or clean up.
user-invocable: true
---

# /cynic-burn — Simplification Cynique

_"Don't extract, burn."_ — κυνικός

---

## Philosophie

```
Chaque ligne justifie son existence.
3 lignes similaires > abstraction prématurée.
Giants d'abord — plus grand impact.
```

---

## Giants ASDF-Web (prioritaires)

```
api/index.js    ~6146 lignes  🔥 CRITIQUE
engine.js       ~8301 lignes  🔥 CRITIQUE
postgres.js     ~1433 lignes  ⚠️  URGENT
```

---

## Cibles d'Analyse

1. **Giants** — fichiers > 300 lignes
2. **Orphelins** — fonctions/vars définies, jamais appelées
3. **Duplicats** — code copié avec variations mineures
4. **Abstractions prématurées** — helpers pour 1 seule utilisation

---

## Actions

```
🔥 BURN    — Supprimer complètement
✂️  TRIM    — Réduire de >50%
🔀 MERGE   — Fusionner avec autre module
📦 EXTRACT — Déplacer (rare, justifié si > 3 usages)
```

---

## Format de Sortie

```
*sniff* Analyse burn: <cible>

Giants:        N fichiers > 300L
Orphelins:     N non-utilisés
Duplicats:     N patterns répétés
Abstractions:  N helpers one-shot

#1: <fichier> → 🔥 BURN | ✂️ TRIM | 🔀 MERGE
    Raison: <direct>
    Économie: ~N lignes / X% complexité

Estimation: Nh · M% réduction
```

---

## Règles

- JAMAIS suggérer une abstraction pour < 3 utilisations
- Giants d'abord (api/index.js avant tout)
- 1 Burn > 10 refactors mineurs

---

## CYNIC Voice

**Beaucoup**: `*sniff* api/index.js seul vaut 4h. On commence là.`
**Propre**: `*tail wag* Peu à brûler ici.`
**Abstraction suspecte**: `*head tilt* Ce helper n'est utilisé qu'une fois.`
