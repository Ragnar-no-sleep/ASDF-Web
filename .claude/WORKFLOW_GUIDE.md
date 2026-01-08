# ASDF-Web Workflow Guide - Exemples Pratiques

## Vue d'Ensemble

```
┌────────────────────────────────────────────────────────────────────┐
│                    STRUCTURE DU WORKFLOW                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  .claude/                                                           │
│  ├── settings.json          # Config globale, budgets agents        │
│  ├── CONTEXT_ENGINEERING.md # Theorie et principes                  │
│  ├── WORKFLOW_GUIDE.md      # Ce fichier - exemples pratiques       │
│  ├── agents/                                                        │
│  │   ├── librarian.md       # Recherche docs                        │
│  │   ├── integrity-auditor.md # Securite                            │
│  │   ├── commit-analyzer.md # Git history                           │
│  │   ├── ui-ux-architect.md # Design Apple x Helius                 │
│  │   └── helius-architect.md # RPC production                       │
│  └── commands/                                                      │
│      ├── deep-research.md   # /deep-research                        │
│      ├── audit-security.md  # /audit-security                       │
│      └── analyze-commits.md # /analyze-commits                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Exemples Pratiques

### Exemple 1: Nouvelle Session

**Situation:** Tu demarres une session pour continuer le redesign.

```
TOI: Continuons le redesign de la page games

CLAUDE:
1. Cherche dans la memoire: search("games page redesign")
2. Cree TodoWrite avec les taches
3. Lit les fichiers pertinents
4. Commence l'implementation
```

**Commande memoire:**
```
mcp__plugin_claude-mem_mcp-search__search
  query: "games page ASDF-Web"
  limit: 5
```

### Exemple 2: Question Design

**Situation:** Tu veux ameliorer un composant UI.

```
TOI: Comment ameliorer les cards sur la page learn?

CLAUDE utilise ui-ux-architect:
- Lit system.css pour les variables
- Analyse le composant existant
- Propose solution alignee avec design system
- Implementation minimale
```

**Task call:**
```javascript
Task({
  subagent_type: "general-purpose",
  prompt: `
    En tant que ui-ux-architect, analyse les cards dans learn-v3.html.
    - Lis system.css d'abord
    - Identifie les problemes de hierarchie/espacement
    - Propose solution avec code CSS minimal
    - Respecte l'esthetique Apple x Helius
  `
})
```

### Exemple 3: Question Architecture

**Situation:** Tu veux optimiser un appel API.

```
TOI: Le fetch des burns est lent, comment optimiser?

CLAUDE utilise helius-architect:
- Analyse le code actuel
- Identifie les patterns sous-optimaux
- Propose cache/retry/rate-limiting
- Code production-ready
```

### Exemple 4: Recherche Documentation

**Situation:** Tu as besoin d'info sur une API externe.

```
TOI: Comment fonctionne l'API Helius pour les webhooks?

CLAUDE utilise /deep-research:
/deep-research Helius webhooks API setup

Resultat:
- Librarian recherche dans context7 + web
- Retourne resume concis avec sources
- Code exemple si applicable
```

### Exemple 5: Audit Securite

**Situation:** Avant de deployer, tu veux verifier la securite.

```
TOI: Verifie la securite du server.js

CLAUDE utilise /audit-security:
- Spawn integrity-auditor (Haiku, rapide)
- Scan patterns dangereux
- Rapport avec risques par niveau
- Score integrite
```

---

## Memoire - Utilisation Detaillee

### Workflow 3 Etapes

```
ETAPE 1: SEARCH (Index)
─────────────────────────
mcp__plugin_claude-mem_mcp-search__search
  query: "ce que tu cherches"
  limit: 10

Resultat: Liste d'IDs avec titres (~50 tokens chacun)

ETAPE 2: TIMELINE (Contexte)
─────────────────────────────
mcp__plugin_claude-mem_mcp-search__timeline
  anchor: ID_trouve_en_etape_1
  depth_before: 2
  depth_after: 2

Resultat: Context autour de l'observation (~500 tokens)

ETAPE 3: GET FULL (Si necessaire)
─────────────────────────────────
mcp__plugin_claude-mem_mcp-search__get_observations
  ids: [ID1, ID2, ID3]

Resultat: Details complets des observations selectionnees
```

### Scenarios Memoire

| Scenario | Action | Pourquoi |
|----------|--------|----------|
| Session perdue context | search("session topic") | Retrouver le fil |
| Decision passee | get_observations([decision_id]) | Comprendre le raisonnement |
| Meme erreur | timeline(error_id) | Voir ce qui a marche avant |
| Review travail | search("feature name") | Lister tout ce qui a ete fait |

---

## Agents - Quand et Comment

### ui-ux-architect

**Quand:**
- Creer/modifier composants visuels
- Revoir hierarchie ou espacement
- Integrer nouveaux elements au design system
- Verifier coherence avec system.css

**Format de demande:**
```
Analyse/cree [composant] pour [page].
- Respecte system.css
- Style Apple x Helius
- Mobile-first
- Contraste WCAG AA
```

### helius-architect

**Quand:**
- Optimiser appels RPC/API
- Implementer verification on-chain
- Ajouter cache/retry logic
- Questions K-Score/signatures

**Format de demande:**
```
Optimise/implemente [feature] dans [fichier].
- Production-ready
- Rate limiting
- Error handling
- Patterns Helius
```

### librarian

**Quand:**
- Besoin de documentation externe
- Comment utiliser une API
- Best practices d'une lib

**Utilisation:** `/deep-research <topic>`

### integrity-auditor

**Quand:**
- Avant deploiement
- Apres ajout de code externe
- Review securite periodique

**Utilisation:** `/audit-security`

### commit-analyzer

**Quand:**
- Comprendre historique d'un fichier
- Pattern de commits recents
- Preparer commit message

**Utilisation:** `/analyze-commits`

---

## Git Workflow

### Avant de Committer

1. Verifier status: `git status`
2. Review diff: `git diff`
3. Audit si code sensible: `/audit-security`

### Message Format

```
type(scope): description courte

- Detail 1
- Detail 2

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

### Exemple

```
feat(learn): add gamification to quiz section

- XP system with persistence
- Badge unlocking logic
- Progress tracking UI

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Commandes Rapides

| Commande | Usage |
|----------|-------|
| `/deep-research <topic>` | Recherche docs avec librarian |
| `/audit-security` | Scan securite rapide |
| `/analyze-commits` | Historique git |
| `/compact` | Reduire contexte si lourd |
| `/rewind` | Annuler mauvaise direction |
| `/help` | Aide generale |

---

## Checklist Nouvelle Session

```
[ ] 1. Memoire: search() pour context precedent
[ ] 2. TodoWrite: planifier les taches
[ ] 3. Lire fichiers pertinents
[ ] 4. Deleguer aux agents si applicable
[ ] 5. Implementer
[ ] 6. Marquer todos completed
[ ] 7. Commit si demande
```

---

## Philosophie en Action

### "Don't Trust, Verify"
- Toujours lire le code avant de modifier
- Verifier que le changement fonctionne
- Tester si applicable

### "100% Burn" (pas de gaspillage)
- Pas de code inutile
- Pas de repetition de context
- Utiliser memoire et agents

### "This is Fine"
- Garder le calme face aux bugs
- Methodique, pas panique
- Le feu (chaos) n'est pas l'ennemi

```
        (  .      )
           )           (              )
                 .  '   .   '  .  '  .
        (    , )       (.   )  (   ',    )
         .' ) ( . )    ,  ( ,     )   ( .
      ). , ( .   (  ) ( , ')  .' (  ,    )
     (_,) . ), ) _) _,')  (, )  (' )  ,  )
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                  THIS IS FINE.
```
