# AUDIT EMPIRIQUE — Tool Pages P1
## Judge Mode + Meta-Thinking

**Date** : 2026-02-25
**Méthode** : Lecture complète des 5 fichiers JS + CSS + HTML concernés
**Objectif** : Corriger les suppositions de l'audit initial — données empiriques uniquement

---

## Échelle de notation (Q-Score)

| Score | Niveau | Signification |
|-------|--------|---------------|
| 80–100 | HOWL | Urgent — bloque la PR |
| 60–79 | WAG | Recommandé — quick wins |
| 40–59 | BARK | À débattre — effort vs valeur |
| 0–39 | GROWL | Danger — impact critique |

---

## 1. BURNS — Q-Score: 78 / WAG

### Verdict
Quasi-prête mais 1 régression architecturale cachée.

### Findings empiriques

| Finding | Sévérité | Détail |
|---------|----------|--------|
| `animateCounter()` utilise `setInterval(16ms)` | BARK | Ligne ~287. Doit être `requestAnimationFrame` |
| Format functions dupliquées localement | BARK | `formatNumber`, `formatWallet`, `formatTimeAgo` déclarées dans burns.js malgré import ES6 possible — format.js jamais appelé |
| Pas de keyboard nav sur tabs leaderboard | WAG | Flèches gauche/droite attendues (ARIA pattern) |
| ARIA live region manquante sur tab change | WAG | `aria-live="polite"` sur le panel actif |
| PageLifecycle ✓ | OK | Timers enregistrés correctement |
| ASDF_ENDPOINTS ✓ | OK | Import correct depuis config/endpoints.js |
| AudioFeedback ✓ | OK | Importé et utilisé |
| fetchWithRetry ✓ | OK | Pattern retry présent |

### Régression Phase A détectée
burns.js est un ES6 module (`import`) mais N'importe PAS format.js. Les fonctions `formatNumber`, `formatWallet`, `formatTimeAgo` sont redéclarées localement alors que format.js existe pour ça. Régresssion vs objectif Phase A.

### Actions P1

```
[BURNS-REGRESS] Import { formatNumber, formatWallet, formatTimeAgo } from './utils/format.js'
                Supprimer les 3 déclarations locales (~30 LOC)
[B4]            animateCounter: setInterval(16ms) → requestAnimationFrame
[B1]            Tab keyboard nav (flèches)
[B2]            ARIA live region
```

**Effort révisé** : ~1.5h (régression burns-regress = XS, B4 = S)
**PR prête quand** : burns-regress + B4 + B1 done

---

## 2. STAKING — Q-Score: 71 / WAG

### Verdict
Bonne structure ES6. Manques cosmétiques, pas de blockers.

### Findings empiriques

| Finding | Sévérité | Détail |
|---------|----------|--------|
| Format functions dupliquées | BARK | `formatNumber`, `formatDate`, `getProgress`, `getCountdown` locales — même si API = mock, les fonctions génériques pourraient venir de format.js |
| Stats grid : pas de responsive breakpoint pour ≤900px | WAG | css/staking.css confirmé — seulement `font-weight` matches pour 600 |
| Density CSS ✓ | OK | `density-detailed` / `density-full` rules confirmés dans staking.css (lignes 737-748) |
| AudioFeedback ✓ | OK | Importé et utilisé sur interactions |
| Demo Streamflow ✓ | OK | `getDemoLocks()` clairement documenté + TODO comment |
| ES6 module ✓ | OK | Import/export natif |

### Actions P1

```
[S1]  Stats grid responsive : 4→2 col à 900px, 2→1 col à 600px (CSS only)
[S3]  Loading spinner pendant init()
[S4]  Commentaire Streamflow déjà présent ✓ (skip)
[S5]  AudioFeedback déjà présent ✓ (vérifier couverture CTA)
```

**Effort révisé** : ~1h (S4 already done)
**PR prête quand** : S1 + S3 done

---

## 3. HOLDEX — Q-Score: 55 / BARK

### Verdict
Bug critique confirmé empiriquement. Conversion module bloque les améliorations.

### Findings empiriques

| Finding | Sévérité | Détail |
|---------|----------|--------|
| **BUG CONFIRMÉ** : `.filter-btn` vs `.filter` | HOWL | JS ligne ~185 : `querySelectorAll('.filter-btn')` — HTML : `class="filter"`. Zero boutons trouvés → filtre 100% cassé |
| Regular script (pas module) | HOWL | Bloque import AudioFeedback, ASDF_ENDPOINTS, format.js |
| Format functions dupliquées | BARK | formatNumber, formatPrice, formatPercent, formatHolders — toutes locales |
| Pas d'AudioFeedback | WAG | Aucun feedback sonore sur interactions |
| Modal : pas de focus management | WAG | `focus()` sur premier élément manquant à l'ouverture |
| `fetchWithRetry` ✓ | OK | Avec détection CORS (`err instanceof TypeError`) — bonne implémentation |
| Backdrop close ✓ | OK | `modal.addEventListener('click', ...)` pour fermer |
| Escape key ✓ | OK | `keydown` handler présent |

### Actions P1 (révisées)

```
[H0]  FIX BUG CRITIQUE : '.filter-btn' → '.filter' dans le JS (~1 ligne)
[H1]  type="module" dans holdex.html
[H2]  Import ASDF_ENDPOINTS + AudioFeedback + format.js
[H3]  Density-detailed CSS (si manquant — à vérifier)
[H5]  Modal focus management
```

**Effort révisé** : ~2.5h
**PR prête quand** : H0-H2 + H5 done

---

## 4. FORECAST — Q-Score: 42 / BARK

### Verdict
Moins grave que prévu : le CSS est DÉJÀ responsive. Les alertes sont le blocker réel.

### Findings empiriques

| Finding | Sévérité | Détail |
|---------|----------|--------|
| 2 × `alert()` dialog | HOWL | Ligne 239 : `alert('Please install Phantom...')` / Ligne 325 : `alert('Prediction requires wallet...')` — PR rejection immédiate |
| Regular script (pas module) | HOWL | Bloque imports |
| isDev inline (pas ASDF_ENDPOINTS) | BARK | Pattern dupliqué, pas centralisé |
| Pas de retry sur fetchStats() | BARK | Plain `fetch()` sans fallback |
| Pas d'AudioFeedback | WAG | Aucun feedback sonore |
| Pas de PageLifecycle | WAG | setInterval non enregistré |
| **CORRECTION** : responsive ✓ déjà présent | — | `@media (max-width: 768px)` confirmés dans forecast.css — F5 partiellement fait |
| **CORRECTION** : density CSS ✓ déjà présent | — | `density-detailed` / `density-full` rules confirmés (lignes 1096-1107) — F6 partiellement fait |

### Révision sprint tasks

F5 (mobile responsive) et F6 (density levels) sont PARTIELLEMENT FAITS. Vérifier visuellement en mobile, mais la base CSS est là.

### Actions P1 (révisées)

```
[F-ALERT] URGENT : Remplacer les 2 alert() par inline UI feedback
          → toast/banner "Wallet requis" dans le DOM, pas alert()
[F1]      type="module" dans forecast.html
[F2]      Import ASDF_ENDPOINTS (remplace isDev inline)
[F3]      Import formatDuration / formatTimeAgo depuis format.js
[F4]      Import AudioFeedback + feedback sur UP/DOWN + submit
[F8]      Retry logic sur fetchStats() (pattern burns.js)
[F5]      VÉRIFIER visuellement responsive (CSS base déjà présente)
[F6]      VÉRIFIER visuellement density levels (CSS base déjà présente)
```

**Effort révisé** : ~3h (F5/F6 = vérification visuelle, pas réécriture)
**PR prête quand** : F-ALERT + F1-F4 + F8 done

---

## 5. IGNITION — Q-Score: 28 / GROWL

### Verdict
Le lift est réel. 3 alert()s + IIFE + countdown cassé = PR non-envoyable en l'état.

### Findings empiriques

| Finding | Sévérité | Détail |
|---------|----------|--------|
| 3 × `alert()` dialog | HOWL | Ligne 265 : wallet / Ligne 275 : API integration / Ligne 285 : PAGS designation |
| IIFE `(function(){ 'use strict'; ... })()` | HOWL | Bloque tous les imports ES6 |
| Countdown hardcodé au load time | BARK | `Date.now() + 2 * 24 * 60 * 60 * 1000` — repart à 48h à chaque chargement |
| `var` (pas `const`/`let`) | BARK | Cohérence ES6 rompue |
| isDev inline avec `var` | BARK | Pas centralisé |
| Zéro AudioFeedback | WAG | Aucun feedback |
| Zéro format utilities | WAG | Tout local / inline |
| `countdownInterval` non cleanup | WAG | Pas enregistré dans PageLifecycle |
| Tous les appels API commentés | INFO | Normal (stubs) — à documenter dans PR |
| 0 responsive mobile | WAG | Tabs + grid → à traiter en CSS |

### Actions P1 (révisées)

```
[I-ALERT] URGENT : Remplacer les 3 alert() par inline UI feedback
          → toast/banner dans le DOM, class="notification" ou similaire
[I1]      Supprimer IIFE wrapper → module bare (juste retirer la fonction enveloppe)
[I2]      type="module" dans ignition.html
[I3]      Import ASDF_ENDPOINTS + AudioFeedback + format.js
[I-COUNT] Fix countdown : utiliser une date cible fixe (ISO string dans config) pas Date.now()
[I4]      Mobile responsive tabs : flex-wrap + scroll horizontal
[I5]      Mobile responsive holdings grid : 4→2→1 col
[I6]      Mobile forms : grid-template-columns 1fr sur mobile
[I7]      Tab keyboard nav (flèches gauche/droite)
[I8]      Form validation visuelle
[I11]     Supprimer `<meta>` CSP custom
```

**Effort révisé** : ~6h (inchangé — lift lourd confirmé)
**PR prête quand** : I-ALERT + I1-I3 + I-COUNT + I4-I8 + I11 done

---

## Classement révisé

| Page | Q-Score | Niveau | Blockers critiques |
|------|---------|--------|-------------------|
| **Burns** | 78 | WAG | Régression format.js + setInterval |
| **Staking** | 71 | WAG | Responsive stats grid |
| **HolDex** | 55 | BARK | Bug filter + module conversion |
| **Forecast** | 42 | BARK | 2 alert() + module conversion |
| **Ignition** | 28 | GROWL | 3 alert() + IIFE + countdown cassé |

---

## Corrections vs Audit Initial (SPRINT-P1.md)

| Tâche | Audit initial | Réalité empirique |
|-------|--------------|-------------------|
| F5 — Forecast responsive mobile | Manquant, M effort | CSS base déjà présente → vérification visuelle XS |
| F6 — Forecast density levels | Manquant, M effort | CSS base déjà présente → vérification visuelle XS |
| S4 — Commentaire Streamflow | À faire | Déjà présent dans staking.js ✓ → skip |
| Burns format.js | Non détecté | Régression confirmée → ajouter comme BURNS-REGRESS |
| forecast.js alerts | Pas mentionné | 2 alert() critiques → F-ALERT (HOWL) |
| ignition.js alerts | Non explicité | 3 alert() critiques → I-ALERT (HOWL) |
| Countdown ignition | Non mentionné | Cassé (Date.now() au load) → I-COUNT |

---

## Ordre d'exécution révisé

```
PRIORITÉ 0 — Blockers PR (HOWL) :
  [H0]      HolDex filter bug fix (1 ligne)
  [F-ALERT] Forecast : remplacer 2 alert() → inline UI
  [I-ALERT] Ignition : remplacer 3 alert() → inline UI

PRIORITÉ 1 — Cross-cutting module :
  [H1]      holdex.html → type="module"
  [F1]      forecast.html → type="module"
  [I1+I2]   ignition.js remove IIFE + ignition.html → type="module"

PRIORITÉ 2 — Pages dans l'ordre :
  Burns → BURNS-REGRESS + B4 + B1 + B2
  Staking → S1 + S3
  HolDex → H2 + H3 + H5
  Forecast → F2 + F3 + F4 + F8 + vérifier F5/F6
  Ignition → I3 + I-COUNT + I4 + I5 + I6 + I7 + I8 + I11
```

---

*sniff* -- CYNIC | 2026-02-25 | Audit empirique v1
