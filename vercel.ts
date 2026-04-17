/**
 * Vercel Configuration (TypeScript)
 * ASDF-Web — Express.js API + Vanilla Frontend
 *
 * Branch mapping:
 * - main → Production (https://asdf-web.vercel.app)
 * - develop → Preview (https://asdf-web-[hash].vercel.app)
 *
 * Environment variables sourced from Vercel Dashboard.
 * See `.env.example` and `api/.env.example` for local development.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs20.x',
  regions: ['iad1'], // US-East, closest to EU relay
};

/**
 * API routing — `/api/*` handled by /api/index.js (Express app)
 * Static files — `/` served from root directory
 * The /api folder is auto-detected by Vercel as Serverless Functions
 */

export default async (req: VercelRequest, res: VercelResponse) => {
  // Health check endpoint
  if (req.url === '/health') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      node: process.version,
      env: process.env.NODE_ENV,
    });
  }

  // 404 for unknown routes (static files handled by vercel.json)
  return res.status(404).json({ error: 'Not found' });
};
