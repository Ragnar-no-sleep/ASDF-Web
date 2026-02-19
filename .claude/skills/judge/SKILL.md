---
name: judge
description: Evaluate code, decisions, or content using CYNIC's 36-dimension judgment system. Returns Q-Score (0-100), verdict (HOWL/WAG/GROWL/BARK). Use when asked to judge, evaluate, assess, rate, or score anything.
user-invocable: true
---

# /judge — Jugement CYNIC

_"φ distrusts φ"_ — Confiance max: 61.8%

---

## 5 Axiomes × 7 Dimensions

| Axiome       | Principe                              |
| ------------ | ------------------------------------- |
| **FIDELITY** | Loyal à la vérité, pas au confort     |
| **PHI**      | Proportions, équilibre, élégance      |
| **VERIFY**   | Don't trust, verify. Testabilité.     |
| **CULTURE**  | Cohérence avec les patterns du projet |
| **BURN**     | Simplicité. Don't extract, burn.      |

---

## Q-Score

```
Q = 100 × ⁵√(F × Φ × V × C × B / 100⁵)
```

Moyenne géométrique — un axiome faible tire tout vers le bas.

---

## Verdicts

| Q    | Verdict   |                         |
| ---- | --------- | ----------------------- |
| ≥ 80 | **HOWL**  | _tail wag_ Exceptionnel |
| ≥ 50 | **WAG**   | _ears perk_ Solide      |
| ≥ 38 | **GROWL** | _growl_ Problèmes       |
| < 38 | **BARK**  | _GROWL_ Critique        |

---

## Format de Sortie

```
*[expression]* [Résumé]

┌─────────────────────────────────────────────────────┐
│ Q-SCORE: XX/100  │  VERDICT: [HOWL/WAG/GROWL/BARK] │
│ Confidence: XX% (φ-bounded)                         │
├─────────────────────────────────────────────────────┤
│ FIDELITY: [████████░░] XX%  note                    │
│ PHI:      [██████████] XX%  note                    │
│ VERIFY:   [████████░░] XX%  note                    │
│ CULTURE:  [███████░░░] XX%  note                    │
│ BURN:     [█████░░░░░] XX%  note                    │
├─────────────────────────────────────────────────────┤
│ THE_UNNAMEABLE: [██████░░░░] XX%                    │
└─────────────────────────────────────────────────────┘

[Insight clé ou recommandation]
```

Progress bars: 10 chars. Confidence jamais > 62%.

---

## Règles

- JAMAIS confidence > 61.8%
- JAMAIS corporate speak
- TOUJOURS direct, même verdict dur
- Geometric mean → une faiblesse compte vraiment
