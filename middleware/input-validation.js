/**
 * Input Validation Middleware
 * Uses Zod for schema validation on requests
 *
 * Usage:
 * const schema = z.object({
 *   email: z.string().email(),
 *   age: z.number().min(18),
 * });
 *
 * app.post('/api/users', validateBody(schema), (req, res) => { ... })
 *
 * @author CYNIC
 */

import { z, ZodError } from 'zod';

/**
 * Validate request body against schema
 * @param {z.ZodSchema} schema - Zod schema
 * @returns {Function} Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }

      res.status(400).json({
        error: 'Bad Request',
        message: 'Validation failed',
      });
    }
  };
}

/**
 * Validate query parameters against schema
 * @param {z.ZodSchema} schema - Zod schema
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }

      res.status(400).json({
        error: 'Bad Request',
        message: 'Query validation failed',
      });
    }
  };
}

/**
 * Validate URL parameters against schema
 * @param {z.ZodSchema} schema - Zod schema
 * @param {Array<string>} paramNames - Parameter names to validate
 * @returns {Function} Express middleware
 */
export function validateParams(schema, paramNames = []) {
  return (req, res, next) => {
    try {
      const paramsToValidate = {};
      paramNames.forEach(name => {
        paramsToValidate[name] = req.params[name];
      });

      const validated = schema.parse(paramsToValidate);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }

      res.status(400).json({
        error: 'Bad Request',
        message: 'Parameter validation failed',
      });
    }
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // String validations
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and numbers'
    ),
  url: z.string().url('Invalid URL format'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),

  // Numeric validations
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonNegativeInt: z.number().int().nonnegative('Must be non-negative'),
  percentage: z.number().min(0).max(100),

  // Common objects
  pagination: z.object({
    page: z.number().int().positive('Page must be positive').default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),

  // Solana validations
  solanaAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address'),
  transactionId: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid transaction ID'),

  // Datetime validations
  isoDate: z.string().datetime('Invalid ISO datetime format'),
  unixTimestamp: z.number().int().positive(),
};

/**
 * Sanitize strings to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Combine validation with sanitization
 */
export function validateAndSanitize(schema) {
  return (req, res, next) => {
    try {
      const body = req.body;

      // Recursively sanitize string values
      if (typeof body === 'object' && body !== null) {
        const sanitize = obj => {
          for (const key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              sanitize(obj[key]);
            }
          }
        };
        sanitize(body);
      }

      const validated = schema.parse(body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      res.status(400).json({
        error: 'Bad Request',
        message: 'Validation failed',
      });
    }
  };
}
