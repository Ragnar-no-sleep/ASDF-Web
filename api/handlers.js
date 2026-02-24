/**
 * API Integration Examples - Using Cache & Connection Pooling
 * Demonstrates how to integrate caching and pooling into existing endpoints
 *
 * Usage in server.cjs:
 * import { apiHandlers } from './api/handlers.js';
 * app.get('/api/burns/stats', apiHandlers.getBurnsStats);
 * app.get('/api/leaderboard/:game', apiHandlers.getLeaderboard);
 *
 * @author CYNIC
 */

import { query } from '../services/postgres-pool.js';
import { cacheManager, cached } from '../services/cache.js';
import { logger } from '../services/logger.js';

/**
 * GET /api/burns/stats
 * Returns burn statistics with caching
 * Cache: 1 hour (stats are per-block, changes infrequently)
 */
export async function getBurnsStats(req, res) {
  const cacheKey = 'burns:stats';

  try {
    // Try cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      logger.http('GET', '/api/burns/stats', 200, 5, { cached: true });
      return res.json({ ...cached, _cached: true });
    }

    // Cache miss - query database with pooling
    const stats = await query(`
      SELECT
        COUNT(*) as total_blocks,
        SUM(tx_count) as total_transactions,
        AVG(block_time) as avg_block_time,
        MAX(created_at) as latest_block
      FROM blocks
      WHERE created_at > NOW() - INTERVAL '1 day'
    `);

    const result = {
      total_blocks: parseInt(stats.rows[0].total_blocks),
      total_transactions: parseInt(stats.rows[0].total_transactions),
      avg_block_time: parseFloat(stats.rows[0].avg_block_time),
      latest_block: stats.rows[0].latest_block,
      timestamp: new Date().toISOString(),
    };

    // Cache for 1 hour
    await cacheManager.set(cacheKey, result, 3600);

    logger.http('GET', '/api/burns/stats', 200, 150, { cached: false });
    res.json({ ...result, _cached: false });
  } catch (err) {
    logger.error('Burns stats endpoint error', {
      error: err.message,
      endpoint: '/api/burns/stats',
    });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

/**
 * GET /api/leaderboard/:game
 * Returns top 100 players for a game
 * Cache: 30 minutes (leaderboards update frequently)
 * Pagination: ?page=1&limit=10 (default: top 100)
 */
export async function getLeaderboard(req, res) {
  const game = req.params.game;
  const page = parseInt(req.query.page || 1);
  const limit = Math.min(parseInt(req.query.limit || 100), 1000); // Cap at 1000

  const cacheKey = `leaderboard:${game}:page${page}:limit${limit}`;

  try {
    // Try cache first
    const cachedData = await cacheManager.get(cacheKey);
    if (cachedData) {
      logger.http('GET', `/api/leaderboard/${game}`, 200, 3, { cached: true });
      return res.json({ ...cachedData, _cached: true });
    }

    // Cache miss - query database
    const offset = (page - 1) * limit;
    const result = await query(
      `
      SELECT
        rank() OVER (ORDER BY score DESC) as rank,
        wallet_address,
        score,
        completed_at,
        completion_time
      FROM game_scores
      WHERE game = $1
      ORDER BY score DESC
      LIMIT $2 OFFSET $3
    `,
      [game, limit, offset]
    );

    // Count total for pagination
    const countResult = await query('SELECT COUNT(*) FROM game_scores WHERE game = $1', [game]);
    const total = parseInt(countResult.rows[0].count);

    const leaderboard = {
      game,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      entries: result.rows.map(row => ({
        rank: parseInt(row.rank),
        wallet: row.wallet_address.slice(0, 8) + '...' + row.wallet_address.slice(-4),
        score: row.score,
        completed_at: row.completed_at,
        completion_time: row.completion_time,
      })),
      timestamp: new Date().toISOString(),
    };

    // Cache for 30 minutes
    await cacheManager.set(cacheKey, leaderboard, 1800);

    logger.http('GET', `/api/leaderboard/${game}`, 200, 120, { cached: false });
    res.json({ ...leaderboard, _cached: false });
  } catch (err) {
    logger.error('Leaderboard endpoint error', {
      error: err.message,
      game,
      endpoint: '/api/leaderboard/:game',
    });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

/**
 * POST /api/game-score
 * Submit a new game score
 * Invalidates leaderboard cache on successful insert
 */
export async function submitGameScore(req, res) {
  const { wallet, game, score, completion_time } = req.body;

  try {
    // Validate input
    if (!wallet || !game || score === undefined || completion_time === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (score < 0 || completion_time < 0) {
      return res.status(400).json({ error: 'Invalid score or completion_time' });
    }

    // Insert with connection pooling
    const result = await query(
      `
      INSERT INTO game_scores (wallet_address, game, score, completion_time, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING rank() OVER (ORDER BY score DESC) as rank, score, game
    `,
      [wallet, game, score, completion_time]
    );

    // Invalidate all leaderboard caches for this game
    await invalidateCachePattern(`leaderboard:${game}:*`);

    logger.info('Game score submitted', {
      wallet: wallet.slice(0, 8),
      game,
      score,
      rank: result.rows[0].rank,
    });

    res.status(201).json({
      success: true,
      score: result.rows[0].score,
      game: result.rows[0].game,
      rank: result.rows[0].rank,
    });
  } catch (err) {
    logger.error('Submit score endpoint error', {
      error: err.message,
      endpoint: '/api/game-score',
    });
    res.status(500).json({ error: 'Failed to submit score' });
  }
}

/**
 * GET /api/ecosystem/projects
 * Returns all projects (paginated)
 * Cache: 24 hours (projects change rarely)
 * Lazy-loads from split module
 */
export async function getProjects(req, res) {
  const page = parseInt(req.query.page || 1);
  const category = req.query.category;
  const limit = 50;

  const cacheKey = `projects:page${page}${category ? ':' + category : ''}`;

  try {
    // Try cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      logger.http('GET', '/api/ecosystem/projects', 200, 2, { cached: true });
      return res.json({ ...cached, _cached: true });
    }

    // Lazy-load projects repository
    const { getProjects: loadProjects } = await import('../ecosystem/projects-repository.js');
    const projects = await loadProjects(page, limit, category);

    // Cache for 24 hours
    await cacheManager.set(cacheKey, projects, 86400);

    logger.http('GET', '/api/ecosystem/projects', 200, 80, { cached: false });
    res.json({ ...projects, _cached: false });
  } catch (err) {
    logger.error('Projects endpoint error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

/**
 * Health check endpoint - shows cache & pool stats
 * GET /api/health
 */
export async function getHealth(req, res) {
  try {
    const cacheStats = cacheManager.getStats();
    const poolStats = require('../services/postgres-pool.js').getPoolStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      database: poolStats,
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
}

/**
 * Helper: Invalidate cache pattern
 * Example: invalidateCachePattern('leaderboard:burns:*')
 */
async function invalidateCachePattern(pattern) {
  const { invalidatePattern } = await import('../services/cache.js');
  await invalidatePattern(pattern);
}

/**
 * Example: Using cached() helper for simple queries
 * GET /api/ecosystem/formations
 */
export async function getFormations(req, res) {
  try {
    const formations = await cached(
      'ecosystem:formations',
      async () => {
        const { getFormations: load } = await import('../ecosystem/formations-repository.js');
        return load();
      },
      86400 // Cache 24 hours
    );

    res.json({ data: formations, _cached: true });
  } catch (err) {
    logger.error('Formations endpoint error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch formations' });
  }
}
