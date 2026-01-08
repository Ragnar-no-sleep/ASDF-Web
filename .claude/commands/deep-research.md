# /deep-research

Délègue une recherche approfondie au librarian agent.

## Usage
```
/deep-research <topic>
```

## Exemples
```
/deep-research Helius webhooks setup
/deep-research Solana token extensions
/deep-research CSP configuration for embedded scripts
```

## Comportement
1. Parse le topic de la commande
2. Spawn le librarian agent avec le topic
3. Librarian utilise context7 + WebSearch + Grep
4. Retourne un résumé concis avec sources

## Économie
- Délègue au subagent = ~80% tokens économisés
- Résumé retourné = actionnable immédiatement
- Sources citées = vérifiable

## Template de Prompt pour Librarian
```
Recherche approfondie: {topic}

Instructions:
1. Cherche dans context7 d'abord (docs officielles)
2. WebSearch si context7 insuffisant
3. Grep le codebase pour exemples existants
4. Synthétise en max 500 tokens
5. Cite tes sources

Format attendu:
- Réponse directe (2-3 phrases)
- Code exemple si applicable
- Liens sources
```
