# Context Engineering - ASDF-Web

## Philosophie $asdfasdfa Appliquee

### Les 5 Principes Fondamentaux

```
1. "Don't Trust, Verify"  →  Chaque token doit etre justifie
2. "100% Burn"            →  Pas de gaspillage, tout est utile
3. phi guides all ratios  →  61.8% / 38.2% / 23.6% - pas de magic numbers
4. Geometric Mean         →  K = cbrt(D*O*L) - equilibre obligatoire
5. BUILD > USE > HOLD     →  Conviction > Speculation
```

### "THIS IS FINE" Applique au Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    THIS IS FINE WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1 (Surface): Le feu visible                               │
│  → Taches immediates, bugs, features                             │
│  → TodoWrite pour tracker                                        │
│                                                                  │
│  Layer 2 (Moyen): La piece en feu                                │
│  → Architecture, patterns, decisions                             │
│  → Memoire (claude-mem) pour persister                           │
│                                                                  │
│  Layer 3 (Profond): Le chien zen                                 │
│  → Philosophie, principes, vision long terme                     │
│  → Manifeste $asdfasdfa comme guide                              │
│                                                                  │
│  "This is fine" = calme strategique dans le chaos tactique       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token Budget Phi-Based

```javascript
const PHI = 1.618033988749895;

const CONTEXT_RATIOS = {
  ACTIVE_WORK: 1 / PHI,           // 61.8% → Code, debugging, implementation
  RESEARCH:    1 / (PHI ** 2),    // 23.6% → Subagents, docs, exploration
  OVERHEAD:    1 / (PHI ** 3),    // 14.6% → System prompts, MCP, planning
};

// Sur 200k tokens disponibles:
// - 123k Active work (61.8%)
// - 47k  Research (23.6%)
// - 29k  Overhead (14.6%)
```

### Token Conviction Classes

Comme les holder classes du K-Score:

| Classe      | Exemples                                    | Multiplier |
|-------------|---------------------------------------------|------------|
| ACCUMULATOR | Code fonctionnel, decision validee, bug fix | phi (1.618x) |
| HOLDER      | Context necessaire, docs lus une fois       | 1.0x       |
| REDUCER     | Repetition partielle, exploration vide      | 1/phi (0.618)|
| EXTRACTOR   | Erreur repetee 3x, hallucination, hors-sujet| 1/phi^2 (0.38)|

```
Token Efficiency = Sum(tokens * conviction_multiplier) / Sum(tokens)
Si beaucoup d'Extractors → session inefficace → /rewind
```

---

## Memoire (claude-mem) - Strategie

### 3-Layer Workflow (TOUJOURS SUIVRE)

```
1. search(query)        → Index avec IDs (~50 tokens/result)
2. timeline(anchor=ID)  → Context autour (~500 tokens)
3. get_observations()   → Full details SEULEMENT si filtre
```

### Progressive Disclosure (D * O * L)

Inspire du K-Score: `K = 100 * cbrt(D * O * L)`

```
D (Diamond) = INDEX
• 50 tokens max par resultat
• IDs + metadata seulement
• Question: "est-ce pertinent?"

O (Organic) = TIMELINE
• 500 tokens contexte autour
• Liens entre elements
• Question: "comment ca se connecte?"

L (Longevity) = FULL DETAILS
• Donnees completes seulement si D*O > seuil
• Question: "ca vaut le cout?"

Context Quality = cbrt(D * O * L)
Si D=0 (pas pertinent) → Qualite = 0
```

### Quand Utiliser la Memoire

| Situation | Action | Exemple |
|-----------|--------|---------|
| Nouvelle session | search() historique recent | "learn-v3 implementation" |
| Decision passee | get_observations(decision_id) | "pourquoi system.css structure?" |
| Pattern repete | timeline() autour | "meme erreur que session X?" |
| Fin de session | Memoire auto-sauvegardee | Observations creees automatiquement |

### Anti-Patterns Memoire

1. **Fetch Full Direct** - Toujours index → filter → full
2. **Ignorer l'index** - L'index economise 90%+ tokens
3. **Repeter une recherche** - Verifier memoire d'abord
4. **Pas de timeline** - Context autour souvent crucial

---

## Subagents Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTS ASDF-WEB                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  librarian (Sonnet) - 50k tokens                                 │
│  └── Recherche docs: context7 + WebSearch + Grep                 │
│  └── Usage: /deep-research <topic>                               │
│  └── Economie: ~80% vs recherche directe                         │
│                                                                  │
│  integrity-auditor (Haiku) - 20k tokens                          │
│  └── Audit securite rapide                                       │
│  └── Usage: /audit-security                                      │
│  └── Economie: ~90% vs audit manuel                              │
│                                                                  │
│  commit-analyzer (Sonnet) - 30k tokens                           │
│  └── Historique git, patterns                                    │
│  └── Usage: /analyze-commits                                     │
│  └── Economie: ~70% vs analyse directe                           │
│                                                                  │
│  ui-ux-architect (Sonnet) - 40k tokens                           │
│  └── Design Apple x Helius, system.css                           │
│  └── Usage: Task tool avec subagent                              │
│  └── Focus: Hierarchie, espacement, surfaces                     │
│                                                                  │
│  helius-architect (Opus) - 60k tokens                            │
│  └── RPC patterns, K-Score, production                           │
│  └── Usage: Task tool avec subagent                              │
│  └── Focus: Performance, securite, verification                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quand Utiliser Quel Agent

| Tache | Agent | Pourquoi |
|-------|-------|----------|
| "Comment fonctionne X dans Solana?" | librarian | Recherche docs |
| "Y a-t-il des failles?" | integrity-auditor | Scan rapide |
| "Quels commits recents?" | commit-analyzer | Git history |
| "Ameliorer ce composant UI" | ui-ux-architect | Design system |
| "Optimiser ce RPC call" | helius-architect | Production patterns |

---

## MCP Servers

| Server     | Usage                           | Outils Cles                |
|------------|---------------------------------|----------------------------|
| claude-mem | Memoire persistante cross-session | search, timeline, get_obs |
| render     | Deploiement Render              | services, logs, env vars   |

---

## Workflow Recommande

```
START SESSION
  │
  ├─► Check memoire (search recent context)
  │   └── "ASDF-Web session" ou sujet specifique
  │
  ├─► TodoWrite (planifier la session)
  │   └── Tasks claires et atomiques
  │
  ├─► Progressive Disclosure (D→O→L)
  │   └── Ne fetch full que si D*O > seuil
  │
  ├─► Deleguer aux subagents quand possible
  │   └── librarian pour recherche
  │   └── ui-ux-architect pour design
  │   └── helius-architect pour backend
  │
  ├─► Classify token conviction
  │   └── ACCUMULATOR → keep
  │   └── EXTRACTOR → /rewind
  │
  └─► Memoire auto-sauvegardee en fin de session

"Don't Trust, Verify" - Chaque token justifie
"100% Burn" - Pas de token gaspille
```

---

## Commandes Utiles

| Commande           | Action                              |
|--------------------|-------------------------------------|
| `/deep-research`   | Delegue recherche au librarian      |
| `/audit-security`  | Spawn integrity-auditor             |
| `/analyze-commits` | Analyse historique git              |
| `/compact`         | Reduire contexte si proche limite   |
| `/rewind`          | Revenir en arriere si mauvaise dir  |

---

## Metriques de Succes

```
Session Quality = cbrt(Completion * Efficiency * Freshness)

Completion  = todos done / todos total (target: > 90%)
Efficiency  = accumulator_tokens / total_tokens (target: > 80%)
Freshness   = 1 - (context_used / context_max) (target: > 30%)

Si Session Quality < 50 → considerer /compact ou /new
```

---

## Anti-Patterns a Eviter

1. **Fetch Full Direct** - Toujours index → filter → full
2. **Repeter Meme Erreur** - 2 echecs max, puis demander clarification
3. **Recherche Sans Subagent** - Deleguer au librarian
4. **Context > 90%** - /compact avant degradation
5. **Ignorer les Warnings** - Respecter les limites phi
6. **Pas de TodoWrite** - Toujours tracker les taches
7. **Ignorer la memoire** - Verifier historique d'abord

---

## Reference Rapide Philosophie

```
┌─────────────────────────────────────────────────────────────────┐
│                 $asdfasdfa QUICK REFERENCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MANTRA:                                                         │
│    Don't trust. Verify.                                          │
│    Don't extract. Burn.                                          │
│    Don't panic. Hold.                                            │
│    This is fine.                                                 │
│                                                                  │
│  FORMULES:                                                       │
│    K-Score = 100 * cbrt(D * O * L)                               │
│    phi = 1.618... (ratios: 61.8% / 38.2% / 23.6%)                │
│                                                                  │
│  CONVICTION:                                                     │
│    BUILD > USE > HOLD                                            │
│    (Builders > Traders > Holders en ordre de contribution)       │
│                                                                  │
│  ANTI-EXTRACTION:                                                │
│    100% burn = 0% extraction                                     │
│    Pas de fees cachees, tout transparent                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
