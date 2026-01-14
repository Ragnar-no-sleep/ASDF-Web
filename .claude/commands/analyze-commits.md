# /analyze-commits

Analyse l'historique git pour comprendre les patterns de développement.

## Usage

```
/analyze-commits [options]
```

## Options

- `--recent` - 10 derniers commits (défaut)
- `--week` - Commits de la semaine
- `--file <path>` - Historique d'un fichier spécifique
- `--search <term>` - Cherche dans les messages de commit

## Exemples

```
/analyze-commits
/analyze-commits --week
/analyze-commits --file server.cjs
/analyze-commits --search "fix"
```

## Comportement

1. Spawn commit-analyzer agent (Sonnet)
2. Exécute git log avec les options
3. Analyse les patterns:
   - Types de commits (feat/fix/refactor)
   - Fichiers les plus modifiés
   - Rythme de développement
4. Retourne insights actionnables

## Sortie

```
## Analyse Git

### Résumé
- X commits analysés
- Pattern dominant: [type]
- Fichiers chauds: [liste]

### Insights
- [observation 1]
- [observation 2]

### Suggestion
[action recommandée si applicable]
```
