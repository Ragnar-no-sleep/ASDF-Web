// api/health.js — Vercel Serverless Function
// Replaces server.cjs /health endpoint after Vercel migration.
// See docs/superpowers/specs/2026-04-24-asdf-web-reorg-design.md §9.5

export default function handler(request, response) {
  response.status(200).json({
    status: 'ok',
    service: 'asdf-web',
    timestamp: new Date().toISOString(),
    runtime: 'vercel-function',
  });
}

export const config = {
  runtime: 'nodejs',
};
