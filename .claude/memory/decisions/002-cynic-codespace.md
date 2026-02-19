# ADR-002: CYNIC dans Codespace

**Date**: 2026-02-19
**Status**: Accepted

---

## Contexte

Migrer l'identité CYNIC, les MCP, et la mémoire vers GitHub Codespaces de façon reproductible.

Contraintes:

- Secrets ne peuvent pas être dans le repo (`.mcp.json` gitignored)
- Mémoire locale Windows path-specific — ne migre pas directement
- CYNIC brain MCP local indisponible en Codespace

---

## Décision

### Identité

`CLAUDE.md` enrichi avec identité CYNIC (rules d'affichage, dog voice, confidence footer).

### MCP

`.mcp.json` gitignored. `post-create.sh` le génère depuis les secrets Codespace.
Secrets requis: `ANTHROPIC_API_KEY`, `RENDER_API_KEY`, `GITHUB_TOKEN`.

### Skills

`.claude/skills/` avec: `/workflow` · `/ship` · `/judge` · `/cynic-burn`

### Mémoire

`context.md` = source de vérité persistante (dans le repo, mis à jour manuellement).
`claude-mem` se reconstruit naturellement — pas de migration forcée.

### VS Code MCP

`.vscode/mcp.json` pour `manageTrustedMCPServersForAccount` (Copilot/VS Code natif).

---

## Conséquences

**+** Identité CYNIC reproductible sur tout Codespace
**+** MCP Render actif sans setup manuel
**+** Secrets jamais dans le repo
**−** `brain_cynic_judge` MCP absent (local uniquement)
**−** Mémoire repart de zéro sur nouveau Codespace

---

## Alignement

- **VERIFY**: Secrets via Codespace Secrets
- **BURN**: Config minimale, pas de copie des 96 fichiers CYNIC
- **PHI**: Confiance limitée — mémoire se reconstruit, pas copiée aveuglément

_"Don't trust. Verify. Ship to develop."_ 🐕‍🦺
