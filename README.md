# ASDF Web

Official website for the ASDFASDFA ecosystem - The Optimistic Burn Protocol on Solana.

**Live:** https://alonisthe.dev/ecosystem

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | index.html | Landing page |
| `/story` | learn.html | Learn about ASDF |
| `/ignition` | games.html | Games hub |
| `/widget` | index.html | Embeddable widget |

## Deployment

Deployed on [Render](https://render.com) - see `render.yaml` for configuration.

## Tech Stack

- Express.js with security middleware (Helmet, rate limiting)
- Vanilla HTML/CSS/JS (no build step)
- CSP configured for Squarespace embedding
