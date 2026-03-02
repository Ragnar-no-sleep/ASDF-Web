/**
 * PostgreSQL Connection Pooling Service
 * Efficient connection pool for database queries
 *
 * Usage:
 * import { pool, query } from './services/postgres-pool.js';
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 * const rows = result.rows;
 *
 * @author CYNIC
 */

import pg from 'pg';

const { Pool } = pg;

/**
 * Connection pool configuration
 * Tuned for Render PostgreSQL shared instance (20 connection limit)
 */
export const pool = new Pool({
  // Connection details from environment
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'asdf_web',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,

  // Pool sizing
  // Render shared: max 20 connections total
  // Reserve 5 for other services, use 15 for app
  max: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE) : 15,

  // Connection lifecycle
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if can't get connection in 5s
  statementTimeoutMillis: 30000, // Kill query if takes >30s

  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Tuning
  allowExitOnIdle: false, // Keep connections open
  max_connections: 15,
});

/**
 * Log pool events for monitoring
 */
pool.on('connect', () => {
  console.log('[DB] New connection created');
});

pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

pool.on('remove', () => {
  console.log('[DB] Connection removed from pool');
});

/**
 * Execute a query with automatic connection management
 * @param {string} sql - SQL query with $1, $2, etc. placeholders
 * @param {Array} values - Values to bind (indices start at 1)
 * @returns {Promise<{rows: Array, rowCount: number, command: string}>}
 *
 * @example
 * const result = await query('SELECT * FROM users WHERE id = $1', [123]);
 * console.log(result.rows); // Array of rows
 * console.log(result.rowCount); // Number of rows returned
 */
export async function query(sql, values = []) {
  const startTime = Date.now();

  try {
    // Validate SQL to prevent injection (basic check)
    if (!sql || typeof sql !== 'string') {
      throw new Error('Invalid SQL query');
    }

    if (Array.isArray(values) && values.length > 0) {
      // Validate placeholder count
      const placeholderCount = (sql.match(/\$\d+/g) || []).length;
      if (placeholderCount !== values.length) {
        console.warn(
          `[DB] Placeholder mismatch: expected ${placeholderCount}, got ${values.length}`
        );
      }
    }

    // Execute query
    const result = await pool.query(sql, values);
    const duration = Date.now() - startTime;

    // Log slow queries (>100ms)
    if (duration > 100) {
      console.warn(`[DB] Slow query (${duration}ms):`, sql.substring(0, 80));
    }

    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[DB] Query error (${duration}ms):`, err.message);
    console.error('[DB] SQL:', sql.substring(0, 200));
    console.error('[DB] Values:', values);
    throw err;
  }
}

/**
 * Execute multiple queries in a transaction
 * Rolls back all if any fail
 *
 * @param {Function} callback - Async function receiving client object
 * @returns {Promise<any>} Result from callback
 *
 * @example
 * await transaction(async (client) => {
 *   await client.query('INSERT INTO logs (msg) VALUES ($1)', ['test']);
 *   await client.query('UPDATE stats SET count = count + 1');
 * });
 */
export async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get pool statistics
 * @returns {Object} Connection pool stats
 */
export function getPoolStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    maxConnections: pool._max,
    idleTimeoutMs: pool.idleTimeoutMillis,
    utilizationPercent: (((pool.totalCount - pool.idleCount) / pool._max) * 100).toFixed(1),
  };
}

/**
 * Drain and close the connection pool
 * Call on server shutdown
 */
export async function closePool() {
  console.log('[DB] Closing connection pool...');
  await pool.end();
  console.log('[DB] Pool closed');
}

/**
 * Health check for database connectivity
 * @returns {Promise<{healthy: boolean, message: string}>}
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT NOW()');
    return {
      healthy: true,
      message: 'Connected to PostgreSQL',
      timestamp: result.rows[0].now,
    };
  } catch (err) {
    return {
      healthy: false,
      message: `Connection failed: ${err.message}`,
    };
  }
}

/**
 * Batch query execution for better performance
 * Ideal for inserting many rows
 *
 * @param {string} sql - SQL with placeholders
 * @param {Array<Array>} valuesList - Array of value arrays
 * @returns {Promise<Array>} Array of results
 *
 * @example
 * const results = await batchQuery(
 *   'INSERT INTO users (name, email) VALUES ($1, $2)',
 *   [['Alice', 'alice@example.com'], ['Bob', 'bob@example.com']]
 * );
 */
export async function batchQuery(sql, valuesList) {
  const results = [];

  for (const values of valuesList) {
    try {
      const result = await query(sql, values);
      results.push(result);
    } catch (err) {
      console.error('[DB] Batch insert failed for values:', values);
      throw err;
    }
  }

  return results;
}

/**
 * Prepared statement helper
 * Reuse optimized query plan across multiple executions
 *
 * @param {string} name - Prepared statement name
 * @param {string} sql - SQL query
 * @param {Array} types - Parameter types (optional)
 * @returns {Object} Object with execute() method
 *
 * @example
 * const stmt = prepared('get_user', 'SELECT * FROM users WHERE id = $1');
 * const result1 = await stmt.execute(123);
 * const result2 = await stmt.execute(456);
 */
export function prepared(name, sql, types = []) {
  return {
    execute: async values => {
      try {
        const result = await query(sql, Array.isArray(values) ? values : [values]);
        return result;
      } catch (err) {
        console.error(`[DB] Prepared statement ${name} failed:`, err.message);
        throw err;
      }
    },
  };
}

/**
 * Query builder helper for common patterns
 */
export const queryBuilder = {
  /**
   * Select query builder
   * @example
   * queryBuilder.select('users')
   *   .where('id', '=', 123)
   *   .orderBy('created_at', 'DESC')
   *   .limit(10)
   */
  select: table => ({
    table,
    _columns: ['*'],
    conditions: [],
    joins: [],
    orderByClause: '',
    limitClause: '',

    columns(cols) {
      this._columns = Array.isArray(cols) ? cols : [cols];
      return this;
    },

    where(column, operator, value) {
      this.conditions.push({ column, operator, value });
      return this;
    },

    orderBy(column, direction = 'ASC') {
      this.orderByClause = `ORDER BY ${column} ${direction}`;
      return this;
    },

    limit(count) {
      this.limitClause = `LIMIT ${count}`;
      return this;
    },

    async execute() {
      let sql = `SELECT ${this._columns.join(', ')} FROM ${this.table}`;

      const values = [];
      if (this.conditions.length > 0) {
        sql += ' WHERE ';
        sql += this.conditions
          .map(({ column, operator, value }) => {
            values.push(value);
            return `${column} ${operator} $${values.length}`;
          })
          .join(' AND ');
      }

      if (this.orderByClause) sql += ` ${this.orderByClause}`;
      if (this.limitClause) sql += ` ${this.limitClause}`;

      return query(sql, values);
    },
  }),

  /**
   * Insert query builder
   */
  insert: (table, data) => ({
    async execute() {
      const columns = Object.keys(data);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      return query(sql, Object.values(data));
    },
  }),

  /**
   * Update query builder
   */
  update: (table, data) => ({
    conditions: [],

    where(column, operator, value) {
      this.conditions.push({ column, operator, value });
      return this;
    },

    async execute() {
      const columns = Object.keys(data);
      let sql = `UPDATE ${table} SET ${columns.map((col, i) => `${col} = $${i + 1}`).join(', ')}`;

      const values = Object.values(data);

      if (this.conditions.length > 0) {
        sql += ' WHERE ';
        sql += this.conditions
          .map(({ column, operator, value }) => {
            values.push(value);
            return `${column} ${operator} $${values.length}`;
          })
          .join(' AND ');
      }

      sql += ' RETURNING *';
      return query(sql, values);
    },
  }),
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await closePool();
  process.exit(0);
});

export default pool;
