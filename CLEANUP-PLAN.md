# ASDF-Web Cleanup Plan

> **Date:** 2026-02-04
> **Source:** AUDIT-SYNTHESIS-K1.md
> **Objectif:** Épurer la structure pour améliorer la maintenabilité

---

## Structure Actuelle (Problèmes Identifiés)

```
ASDF-Web/
├── _archive/                    # 📦 Code mort - À GARDER pour référence
│   ├── legacy-code/             # Ancien code
│   ├── docs/                    # Anciens docs
│   └── ROADMAP-*-internal.md    # Anciennes roadmaps
│
├── api/
│   ├── index.js                 # ⚠️ 6146 lignes - GOD FILE
│   └── services/
│       └── postgres.js          # ⚠️ 1433 lignes - GOD CLASS
│
├── js/games/pumparena/          # ⚠️ 27 fichiers DISABLED
│
└── docs/
    ├── Audit_k1.md              # ✓ Mis à jour
    └── Audit_k2.md              # À vérifier
```

---

## Actions de Nettoyage

### Phase 1: Documentation (Quick - 30 min)

| Action | Fichier                          | Raison              |
| ------ | -------------------------------- | ------------------- |
| ✓      | Créer AUDIT-SYNTHESIS-K1.md      | Synthèse 8 axes     |
| ✓      | Mettre à jour docs/Audit_k1.md   | Lien vers synthèse  |
| ✓      | Mettre à jour .claude/ROADMAP.md | Nouvelles priorités |
| →      | Archiver anciens roadmaps        | Déjà dans \_archive |

### Phase 2: Code Cleanup (Medium - 2h)

| Action | Cible                 | Impact                                                  |
| ------ | --------------------- | ------------------------------------------------------- |
| KEEP   | `_archive/`           | Référence historique                                    |
| REVIEW | `js/games/pumparena/` | 27 fichiers désactivés - décision: garder ou supprimer? |
| REVIEW | `js/quest/`, `js/xp/` | Legacy systems - utilisés?                              |

### Phase 3: Architecture Refactoring (Sprint 4)

Ces actions sont dans la roadmap, pas le cleanup immédiat:

| Fichier                    | Lignes | Action Future          |
| -------------------------- | ------ | ---------------------- |
| `api/index.js`             | 6146   | Split en routes/       |
| `api/services/postgres.js` | 1433   | Split en repositories/ |

---

## Décisions Requises

### 1. pumparena (27 fichiers)

```
js/games/pumparena/
├── index.js
├── battle.js
├── character.js
└── ... (24 autres)
```

**Status:** Commenté dans games.html
**Options:**

- A) Garder pour développement futur
- B) Archiver dans \_archive/pumparena/
- C) Supprimer complètement

**Recommandation:** Option B - Archiver

### 2. Legacy Systems (js/quest/, js/xp/)

**Status:** Probablement non utilisés
**Options:**

- A) Garder si utilisés
- B) Archiver si non utilisés

**Action:** Vérifier les imports avant de décider

---

## Fichiers Créés/Modifiés

| Fichier                 | Action     | Date       |
| ----------------------- | ---------- | ---------- |
| `AUDIT-SYNTHESIS-K1.md` | Créé       | 2026-02-04 |
| `docs/Audit_k1.md`      | Mis à jour | 2026-02-04 |
| `.claude/ROADMAP.md`    | Mis à jour | 2026-02-04 |
| `CLEANUP-PLAN.md`       | Créé       | 2026-02-04 |

---

## Structure Cible

```
ASDF-Web/
├── api/
│   ├── routes/              # NEW - Split from index.js
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── burns.js
│   │   └── games.js
│   ├── repositories/        # NEW - Split from postgres.js
│   │   ├── user.repository.js
│   │   ├── burn.repository.js
│   │   └── game.repository.js
│   ├── services/
│   │   └── helius.js        # ✓ KEEP (A- grade)
│   └── index.js             # < 500 lines
│
├── js/games/
│   ├── engines/             # ✓ KEEP
│   ├── shop/                # ✓ KEEP
│   ├── shared/              # ✓ KEEP
│   └── hub/                 # ✓ KEEP
│
├── docs/
│   ├── Audit_k1.md          # ✓ Updated
│   ├── Audit_k2.md
│   └── BACKEND_ARCHITECTURE.md
│
├── _archive/
│   ├── pumparena/           # Moved from js/games/
│   ├── legacy-code/
│   └── docs/
│
├── AUDIT-SYNTHESIS-K1.md    # NEW
├── CLEANUP-PLAN.md          # NEW
└── render.yaml              # ✓ Updated
```

---

## Prochaines Étapes

1. **Immédiat:** Valider ce plan avec l'utilisateur
2. **Si OK:** Archiver pumparena (mv js/games/pumparena \_archive/)
3. **Sprint 4:** Refactoring architecture (api/index.js, postgres.js)

---

> _"Don't extract. Burn."_ - Simplifier, pas complexifier.
