# SPRINT P1 — Tool Quality → PRs sollama58

**Objectif** : 5 pages fork-ready → 5 PRs vers les repos sollama58
**Date** : 2026-02-25
**Référence audit** : scores Burns 8.5 / Staking 7.5 / HolDex 7 / Forecast 5 / Ignition 4

---

## Stratégie d'envoi PR

Chaque page = 1 PR vers un repo sollama58 distinct :

| Page | Repo cible | Score actuel | Cible |
|------|-----------|-------------|-------|
| Burns | `ASDFBurnTracker` | 8.5/10 | **Shipper en premier — template PR** |
| Staking | `staking` | 7.5/10 | Quick wins (déjà module) |
| HolDex | `HolDex` | 7/10 | Fix bug critique + density |
| Forecast | `ASDForecast` | 5/10 | Conversion module requise |
| Ignition | `ignition` | 4/10 | Lift le plus lourd |

**Règle** : Une PR ne part que si la page passe un checklist qualité (voir bas du doc).

---

## Cross-cutting — À FAIRE EN PREMIER

### Module System Alignment

3 pages ne peuvent pas importer de modules ES6 :

| Fichier | Pattern actuel | Migration |
|---------|---------------|-----------|
| `js/forecast.js` | `<script src="...">` | → `<script type="module">` + `import { ASDF_ENDPOINTS } from './config/endpoints.js'` |
| `js/holdex.js` | `<script src="...">` | → `<script type="module">` + imports |
| `js/ignition.js` | IIFE `(function(){ ... })()` | → ES6 module (supprimer IIFE wrapper) |

**Impact** : débloque AudioFeedback + format.js pour les 3 pages.

**Fichiers HTML à modifier** :
```html
<!-- AVANT -->
<script src="/js/forecast.js"></script>

<!-- APRÈS -->
<script type="module" src="/js/forecast.js"></script>
```

---

## Page par page

---

### 1. BURNS — 8.5/10 → 10/10

**Status** : Quasi-prête. Shipper en premier pour établir le pattern PR.
**Audit empirique** : Q-78 WAG. Régression format.js détectée (format.js importé mais jamais appelé).

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| B0 | **[REGRESS]** Importer formatNumber/formatWallet/formatTimeAgo depuis utils/format.js (supprimer copies locales) | js/burns.js | XS |
| B1 | Keyboard nav leaderboard tabs (flèches) | js/burns.js | S |
| B2 | ARIA live region sur changement de tab | burns.html | S |
| B3 | Vérifier OG image `og-burns.png` déployée sur alonisthe.dev | — | XS |
| B4 | `animateCounter()` : remplacer `setInterval(16ms)` par `requestAnimationFrame` | js/burns.js | S |
| B5 | FAQ : transition CSS sur reveal density-detailed | css/burns.css | XS |

**Effort total** : ~1.5h (B0 = XS)
**PR prête quand** : B0 + B4 + B1 done

---

### 2. STAKING — 7.5/10 → 9/10

**Status** : Déjà ES6 module. Pas d'API réelle (Streamflow demo) — c'est OK pour la PR.
**Audit empirique** : Q-71 WAG. S2 déjà fait (density CSS confirmé dans staking.css). S4 déjà fait (commentaire Streamflow présent).

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| S1 | Stats grid responsive : 4→2 col à 900px, 2→1 col à 600px | css/staking.css | S |
| ~~S2~~ | ~~Density-detailed CSS~~ | — | DONE ✓ |
| S3 | Loading spinner : afficher `.staking-loading` pendant init() | js/staking.js | XS |
| ~~S4~~ | ~~Commentaire Streamflow~~ | — | DONE ✓ |
| S5 | AudioFeedback : déjà importé — vérifier couverture CTA | js/staking.js | XS |

**Effort total** : ~1h (S2 + S4 déjà faits)
**PR prête quand** : S1 + S3 done

---

### 3. HOLDEX — 7/10 → 9/10

**Status** : Bug critique selector + conversion module + density CSS.

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| H0 | **[BUG]** Filter button selector : `.filter-btn` → `.filter` dans le JS | js/holdex.js | XS |
| H1 | Conversion ES6 module : `type="module"` dans holdex.html | holdex.html | XS |
| H2 | Import ASDF_ENDPOINTS + AudioFeedback | js/holdex.js | S |
| H3 | Density-detailed CSS : ajouter règles de visibilité | css/holdex.css | S |
| H4 | K-Score SVG : animation `stroke-dashoffset` sur load (CSS keyframe) | css/holdex.css | M |
| H5 | Modal focus management : focus premier élément à l'ouverture, trap | js/holdex.js | S |
| H6 | Table accessibility : `aria-rowcount` + vérifier que rows sont de vrais `<tr>` | holdex.html | S |

**Effort total** : ~3h
**PR prête quand** : H0-H3 + H5 done (H4 est du polish)

---

### 4. FORECAST — 5/10 → 8/10

**Status** : Conversion module obligatoire. `alert()` = PR blocker immédiat.
**Audit empirique** : Q-42 BARK. CORRECTION : forecast.css a déjà @media 768px + density levels — F5/F6 sont vérification visuelle seulement, pas réécriture.

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| F0 | **[BLOCKER]** Remplacer 2× `alert()` par inline UI feedback (toast/banner) | js/forecast.js | S |
| F1 | Conversion ES6 module : `type="module"` dans forecast.html | forecast.html | XS |
| F2 | Import ASDF_ENDPOINTS (remplace isDev inline) | js/forecast.js | S |
| F3 | Import formatDuration / formatTimeAgo depuis format.js (déduplique) | js/forecast.js | S |
| F4 | Import AudioFeedback : ajouter feedback sur boutons UP/DOWN + submit | js/forecast.js | S |
| F5 | **Mobile responsive** : vérification visuelle (CSS base déjà présente) | css/forecast.css | XS |
| F6 | Density levels CSS : vérification visuelle (CSS base déjà présente) | css/forecast.css | XS |
| F7 | Indicator de connexion API (LED status dans le header) | forecast.html + js | S |
| F8 | Retry logic sur fetchStats() (pattern burns.js) | js/forecast.js | S |

**Effort total** : ~3h (F5/F6 = vérif visuelle, pas réécriture)
**PR prête quand** : F0 + F1-F4 + F8 done

---

### 5. IGNITION — 4/10 → 7/10

**Status** : Lift le plus lourd. IIFE + 3 alert()s + countdown cassé. À traiter en dernier.
**Audit empirique** : Q-28 GROWL. Countdown `Date.now() + 2*24h` se remet à 48h à chaque load — nouveau bug détecté.

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| I0 | **[BLOCKER]** Remplacer 3× `alert()` par inline UI feedback | js/ignition.js | S |
| I1 | Supprimer IIFE wrapper → ES6 module | js/ignition.js | S |
| I2 | `type="module"` dans ignition.html | ignition.html | XS |
| I3 | Import ASDF_ENDPOINTS + AudioFeedback + format.js | js/ignition.js | S |
| I-C | **[BUG]** Countdown : remplacer `Date.now() + offset` par date cible ISO fixe | js/ignition.js | XS |
| I4 | **Mobile responsive tabs** : flex-wrap + scroll horizontal | css/ignition.css | M |
| I5 | **Mobile responsive holdings grid** : 4→2→1 col | css/ignition.css | M |
| I6 | **Mobile responsive forms** : grid-template-columns 1fr sur mobile | css/ignition.css | S |
| I7 | Tab keyboard nav (flèches gauche/droite) | js/ignition.js | M |
| I8 | Form validation : visual feedback sur input invalide (`:invalid` CSS + JS) | ignition.html + css | M |
| I9 | Density levels : implémenter au moins minimal/detailed | ignition.html + css | L |
| I10 | Leaderboard table : connecter aux données (mock propre ou API) | js/ignition.js | L |
| I11 | Supprimer `<meta>` CSP custom (conflit avec Helmet) | ignition.html | XS |

**Effort total** : ~6h (Tier 1 uniquement, sans I9-I10)
**PR prête quand** : I0 + I1-I8 + I-C + I11 done

---

## Checklist PR sollama58

Avant d'envoyer chaque PR, cocher :

```
[ ] Tests passent (npm test — 485/485)
[ ] npm run lint passe sans erreur
[ ] Page s'affiche correctement en mobile (Chrome DevTools 375px)
[ ] Page s'affiche correctement sur desktop
[ ] density-detailed fonctionne (drawer ouvert, passer en mode "Expliqué")
[ ] Aucun console.error au chargement
[ ] Aucune URL hardcodée (grep pour alonisthe.dev dans le JS)
[ ] Zéro alert() dialog dans le JS
[ ] AudioFeedback présent sur les interactions clés
[ ] Accessibility : tab navigation fonctionne (clavier uniquement)
[ ] prefers-reduced-motion respecté (si animations présentes)
```

---

## Ordre d'exécution recommandé (révisé post-audit empirique)

```
PRIORITÉ 0 — Blockers immédiats (ne pas shipper sans ça) :
  [H0]      Fix HolDex filter-btn → filter (1 ligne, XS)
  [F0]      Fix Forecast alert() × 2 → inline UI
  [I0]      Fix Ignition alert() × 3 → inline UI

Semaine 1 :
  [1] Cross-cutting : module alignment (forecast.html, holdex.html, ignition.js + remove IIFE)
  [2] Burns : B0 + B4 + B1 + B2 → PR #1 vers ASDFBurnTracker

Semaine 2 :
  [3] Staking : S1 + S3 → PR #2 vers staking
  [4] HolDex : H0-H2 + H5 → PR #3 vers HolDex

Semaine 3 :
  [5] Forecast : F0-F4 + F8 + vérif F5/F6 → PR #4 vers ASDForecast
  [6] Ignition : I0 + I1-I8 + I-C + I11 → PR #5 vers ignition
```

---

## Décisions à prendre

1. **API réelle vs mock** : Les PRs incluront-elles des appels API réels ou des mocks propres ?
   - Recommandation : mock propre pour forecast/staking/ignition (l'API backend appartient à sollama58)
   - Burns + HolDex : appels réels vers alonisthe.dev (déjà fonctionnel)

2. **Wallet integration** : Les fonctions wallet (Phantom connect, send tx) sont des stubs.
   - Recommandation : laisser comme stubs commentés — c'est du ressort sollama58
   - Important à documenter dans chaque PR description

3. **Streamflow SDK** (staking) : Integration réelle ou garder demo ?
   - Recommandation : garder demo avec commentaire `// TODO: replace with Streamflow SDK`

---

*sniff* -- CYNIC | 2026-02-25
