# ADR-001: Migration vers GitHub Codespaces

**Date**: 2026-01-07
**Status**: Accepted
**Deciders**: User + Claude

## Context

L'environnement de développement local Windows présente des instabilités. Le workflow doit être optimisé avec tests automatisés et validation manuelle des commits.

## Decision

Migrer vers GitHub Codespaces avec:

- DevContainer portable (Dockerfile)
- Git Flow (main/develop/feature)
- PR-based workflow avec Claude review
- Testing stack complet (lint, unit, e2e, security)
- Mémoire persistée dans `.claude/memory/`

## Consequences

### Positives

- Environnement reproductible
- CI/CD intégré
- Collaboration facilitée
- Workflow standardisé

### Negatives

- Dépendance à GitHub
- Coût Codespaces (gratuit limité)
- Latence réseau possible

## Philosophy Alignment

- **Verify**: Tests automatisés à chaque étape
- **Burn**: Config minimale, pas de bloat
- **Hold**: Déploiement stable via CI

_This is fine._ 🐕‍🦺🔥
