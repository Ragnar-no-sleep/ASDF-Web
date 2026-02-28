/**
 * Logger Service - Structured Logging
 * Provides centralized logging with file persistence and different log levels
 *
 * Usage:
 * import { logger } from './services/logger.js';
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Database connection failed', { error: err.message });
 *
 * @author CYNIC
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels with severity
 */
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
};

/**
 * Logger class
 * Writes to console and file with structured JSON format
 */
export class Logger {
  constructor(options = {}) {
    this.level = LEVELS[options.level || 'info'];
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.logFile = options.logFile || path.join(logsDir, 'app.log');
    this.errorFile = options.errorFile || path.join(logsDir, 'error.log');
  }

  /**
   * Format log entry as JSON
   * @private
   */
  #formatEntry(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      message,
      ...data,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown',
    };
  }

  /**
   * Write to file
   * @private
   */
  #writeToFile(entry, isError = false) {
    if (!this.enableFile) return;

    const file = isError ? this.errorFile : this.logFile;
    const line = JSON.stringify(entry) + '\n';

    fs.appendFile(file, line, err => {
      if (err) {
        console.error(`[Logger] Failed to write to ${file}:`, err);
      }
    });
  }

  /**
   * Write to console with formatting
   * @private
   */
  #writeToConsole(entry) {
    if (!this.enableConsole) return;

    const color = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m', // Green
      WARN: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m',
    };

    const levelColor = color[entry.level] || '';
    const reset = color.RESET;

    const formatted = `${levelColor}[${entry.timestamp}] ${entry.level}${reset} ${entry.message}`;

    // Log metadata if present (excluding standard fields)
    const metadata = { ...entry };
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.message;
    delete metadata.pid;
    delete metadata.hostname;

    if (Object.keys(metadata).length > 0) {
      console.log(formatted, metadata);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Log at given level
   * @private
   */
  #log(level, message, data = {}) {
    if (level < this.level) return; // Don't log if below threshold

    const entry = this.#formatEntry(level, message, data);

    this.#writeToConsole(entry);
    this.#writeToFile(entry, level >= LEVELS.error);
  }

  /**
   * Debug level
   */
  debug(message, data = {}) {
    this.#log(LEVELS.debug, message, data);
  }

  /**
   * Info level
   */
  info(message, data = {}) {
    this.#log(LEVELS.info, message, data);
  }

  /**
   * Warn level
   */
  warn(message, data = {}) {
    this.#log(LEVELS.warn, message, data);
  }

  /**
   * Error level
   */
  error(message, data = {}) {
    this.#log(LEVELS.error, message, data);
  }

  /**
   * Log HTTP request
   */
  http(method, path, status, duration, data = {}) {
    const level = status >= 500 ? LEVELS.error : status >= 400 ? LEVELS.warn : LEVELS.info;
    const message = `${method} ${path} → ${status}`;

    this.#log(level, message, {
      http: { method, path, status, duration },
      ...data,
    });
  }

  /**
   * Log database operation
   */
  database(operation, table, duration, rowsAffected = null, data = {}) {
    const message = `[DB] ${operation.toUpperCase()} ${table}`;

    this.#log(LEVELS.info, message, {
      db: { operation, table, duration, rowsAffected },
      ...data,
    });
  }

  /**
   * Log authentication event
   */
  auth(event, userId = null, data = {}) {
    const message = `[AUTH] ${event}`;

    this.#log(LEVELS.info, message, {
      auth: { event, userId },
      ...data,
    });
  }

  /**
   * Log security event
   */
  security(event, severity = 'warn', data = {}) {
    const level = severity === 'critical' ? LEVELS.error : LEVELS.warn;
    const message = `[SECURITY] ${event}`;

    this.#log(level, message, {
      security: { event, severity },
      ...data,
    });
  }

  /**
   * Clear log files (useful for testing)
   */
  clear() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '');
      }
      if (fs.existsSync(this.errorFile)) {
        fs.writeFileSync(this.errorFile, '');
      }
    } catch (err) {
      console.error('[Logger] Failed to clear logs:', err);
    }
  }

  /**
   * Get recent logs
   * @param {number} lines - Number of lines to read
   */
  getTail(lines = 50) {
    try {
      const data = fs.readFileSync(this.logFile, 'utf8');
      return data
        .split('\n')
        .filter(line => line.trim())
        .slice(-lines)
        .map(line => JSON.parse(line));
    } catch (err) {
      return [];
    }
  }

  /**
   * Search logs by keyword
   * @param {string} keyword - Search term
   */
  search(keyword) {
    try {
      const data = fs.readFileSync(this.logFile, 'utf8');
      return data
        .split('\n')
        .filter(line => line.trim() && line.toLowerCase().includes(keyword.toLowerCase()))
        .map(line => JSON.parse(line));
    } catch (err) {
      return [];
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableFile: true,
});

/**
 * HTTP Request Logger Middleware
 * Logs all incoming requests with status codes and response times
 *
 * Usage:
 * app.use(httpLogger);
 */
export function httpLogger(req, res, next) {
  const startTime = Date.now();

  // Capture original res.end
  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;
    logger.http(req.method, req.path, res.statusCode, duration, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    // Call original end
    res.end = originalEnd;
    res.end(chunk, encoding);
  };

  next();
}

/**
 * Error Logger Middleware
 * Logs unhandled errors
 *
 * Usage:
 * app.use(errorLogger);
 */
export function errorLogger(err, req, res, next) {
  logger.error('Unhandled error', {
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
  });

  next(err);
}
