/**
 * ASDF API - Request Validation Service
 *
 * JSON Schema-based validation:
 * - Type validation and coercion
 * - Custom format validators
 * - Sanitization pipelines
 * - Error aggregation
 *
 * Security by Design:
 * - XSS prevention
 * - SQL injection protection
 * - Path traversal prevention
 * - Size limits enforcement
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const VALIDATOR_CONFIG = {
  // Size limits
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  maxObjectKeys: 100,

  // Patterns
  patterns: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    solanaAddress: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    hexColor: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
    url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    semver: /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/,
  },

  // Dangerous patterns to block
  dangerousPatterns: [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*text\/html/i,
    /\.\.\/|\.\.\\/, // Path traversal
    /['";]\s*(OR|AND)\s+/i, // SQL injection
    /UNION\s+SELECT/i,
    /DROP\s+TABLE/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
  ],
};

// Schema registry
const schemas = new Map();

// Validation stats
const validationStats = {
  validated: 0,
  passed: 0,
  failed: 0,
  sanitized: 0,
};

// ============================================
// SCHEMA DEFINITION
// ============================================

/**
 * Register a validation schema
 * @param {string} name - Schema name
 * @param {Object} schema - Schema definition
 */
function registerSchema(name, schema) {
  schemas.set(name, normalizeSchema(schema));
  console.log(`[Validator] Registered schema: ${name}`);
}

/**
 * Get registered schema
 * @param {string} name - Schema name
 * @returns {Object|null}
 */
function getSchema(name) {
  return schemas.get(name) || null;
}

/**
 * Normalize schema definition
 * @param {Object} schema - Raw schema
 * @returns {Object}
 */
function normalizeSchema(schema) {
  if (typeof schema === 'string') {
    return { type: schema };
  }

  return {
    type: schema.type || 'any',
    required: schema.required ?? false,
    nullable: schema.nullable ?? false,
    default: schema.default,
    enum: schema.enum,
    pattern: schema.pattern,
    format: schema.format,
    min: schema.min,
    max: schema.max,
    minLength: schema.minLength,
    maxLength: schema.maxLength ?? VALIDATOR_CONFIG.maxStringLength,
    minItems: schema.minItems,
    maxItems: schema.maxItems ?? VALIDATOR_CONFIG.maxArrayLength,
    items: schema.items ? normalizeSchema(schema.items) : null,
    properties: schema.properties ? normalizeProperties(schema.properties) : null,
    additionalProperties: schema.additionalProperties ?? false,
    sanitize: schema.sanitize ?? true,
    transform: schema.transform,
    validate: schema.validate,
  };
}

/**
 * Normalize properties object
 * @param {Object} properties - Properties definition
 * @returns {Object}
 */
function normalizeProperties(properties) {
  const normalized = {};
  for (const [key, value] of Object.entries(properties)) {
    normalized[key] = normalizeSchema(value);
  }
  return normalized;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate data against schema
 * @param {any} data - Data to validate
 * @param {Object|string} schema - Schema or schema name
 * @param {Object} options - Validation options
 * @returns {{valid: boolean, errors: Array, data: any}}
 */
function validate(data, schema, options = {}) {
  validationStats.validated++;

  const { path = '', strict = true, sanitize = true, coerce = true } = options;

  // Resolve schema name
  const resolvedSchema = typeof schema === 'string' ? schemas.get(schema) : normalizeSchema(schema);

  if (!resolvedSchema) {
    return {
      valid: false,
      errors: [{ path, message: 'Schema not found', code: 'SCHEMA_NOT_FOUND' }],
      data: null,
    };
  }

  const errors = [];
  const result = validateValue(data, resolvedSchema, path, errors, { strict, sanitize, coerce });

  if (errors.length > 0) {
    validationStats.failed++;
    return { valid: false, errors, data: null };
  }

  validationStats.passed++;
  return { valid: true, errors: [], data: result };
}

/**
 * Validate a single value
 * @param {any} value - Value to validate
 * @param {Object} schema - Schema definition
 * @param {string} path - Current path
 * @param {Array} errors - Error accumulator
 * @param {Object} options - Validation options
 * @returns {any}
 */
function validateValue(value, schema, path, errors, options) {
  // Handle null/undefined
  if (value === null) {
    if (schema.nullable) return null;
    if (schema.required) {
      errors.push({ path, message: 'Value cannot be null', code: 'NULL_VALUE' });
    }
    return schema.default ?? null;
  }

  if (value === undefined) {
    if (schema.required) {
      errors.push({ path, message: 'Value is required', code: 'REQUIRED' });
      return undefined;
    }
    return schema.default ?? undefined;
  }

  // Type coercion
  if (options.coerce) {
    value = coerceType(value, schema.type);
  }

  // Type validation
  if (!validateType(value, schema.type)) {
    errors.push({
      path,
      message: `Expected ${schema.type}, got ${typeof value}`,
      code: 'TYPE_MISMATCH',
    });
    return value;
  }

  // Sanitize string values
  if (options.sanitize && schema.sanitize && typeof value === 'string') {
    value = sanitizeString(value);
    validationStats.sanitized++;
  }

  // Check dangerous patterns
  if (typeof value === 'string' && containsDangerousContent(value)) {
    errors.push({
      path,
      message: 'Value contains potentially dangerous content',
      code: 'DANGEROUS_CONTENT',
    });
    return value;
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `Value must be one of: ${schema.enum.join(', ')}`,
      code: 'INVALID_ENUM',
    });
    return value;
  }

  // Format validation
  if (schema.format && !validateFormat(value, schema.format)) {
    errors.push({
      path,
      message: `Invalid format: ${schema.format}`,
      code: 'INVALID_FORMAT',
    });
    return value;
  }

  // Pattern validation
  if (schema.pattern) {
    const pattern =
      typeof schema.pattern === 'string' ? new RegExp(schema.pattern) : schema.pattern;
    if (!pattern.test(value)) {
      errors.push({
        path,
        message: 'Value does not match pattern',
        code: 'PATTERN_MISMATCH',
      });
      return value;
    }
  }

  // Numeric constraints
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push({
        path,
        message: `Value must be >= ${schema.min}`,
        code: 'MIN_VALUE',
      });
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push({
        path,
        message: `Value must be <= ${schema.max}`,
        code: 'MAX_VALUE',
      });
    }
  }

  // String constraints
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `String must be at least ${schema.minLength} characters`,
        code: 'MIN_LENGTH',
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `String must be at most ${schema.maxLength} characters`,
        code: 'MAX_LENGTH',
      });
    }
  }

  // Array validation
  if (Array.isArray(value)) {
    value = validateArray(value, schema, path, errors, options);
  }

  // Object validation
  if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    value = validateObject(value, schema, path, errors, options);
  }

  // Custom transform
  if (schema.transform && typeof schema.transform === 'function') {
    value = schema.transform(value);
  }

  // Custom validation
  if (schema.validate && typeof schema.validate === 'function') {
    const customResult = schema.validate(value);
    if (customResult !== true) {
      errors.push({
        path,
        message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
        code: 'CUSTOM_VALIDATION',
      });
    }
  }

  return value;
}

/**
 * Validate array items
 * @param {Array} arr - Array to validate
 * @param {Object} schema - Schema definition
 * @param {string} path - Current path
 * @param {Array} errors - Error accumulator
 * @param {Object} options - Validation options
 * @returns {Array}
 */
function validateArray(arr, schema, path, errors, options) {
  // Check array constraints
  if (schema.minItems !== undefined && arr.length < schema.minItems) {
    errors.push({
      path,
      message: `Array must have at least ${schema.minItems} items`,
      code: 'MIN_ITEMS',
    });
  }

  if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
    errors.push({
      path,
      message: `Array must have at most ${schema.maxItems} items`,
      code: 'MAX_ITEMS',
    });
    arr = arr.slice(0, schema.maxItems);
  }

  // Validate items
  if (schema.items) {
    return arr.map((item, index) =>
      validateValue(item, schema.items, `${path}[${index}]`, errors, options)
    );
  }

  return arr;
}

/**
 * Validate object properties
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema definition
 * @param {string} path - Current path
 * @param {Array} errors - Error accumulator
 * @param {Object} options - Validation options
 * @returns {Object}
 */
function validateObject(obj, schema, path, errors, options) {
  // Check depth
  const depth = path.split('.').length;
  if (depth > VALIDATOR_CONFIG.maxObjectDepth) {
    errors.push({
      path,
      message: 'Object nesting too deep',
      code: 'MAX_DEPTH',
    });
    return obj;
  }

  // Check key count
  const keys = Object.keys(obj);
  if (keys.length > VALIDATOR_CONFIG.maxObjectKeys) {
    errors.push({
      path,
      message: `Object has too many keys (max: ${VALIDATOR_CONFIG.maxObjectKeys})`,
      code: 'MAX_KEYS',
    });
  }

  const result = {};

  if (schema.properties) {
    // Validate defined properties
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propPath = path ? `${path}.${key}` : key;
      result[key] = validateValue(obj[key], propSchema, propPath, errors, options);
    }

    // Check for additional properties
    if (options.strict && !schema.additionalProperties) {
      for (const key of keys) {
        if (!schema.properties[key]) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: 'Additional property not allowed',
            code: 'ADDITIONAL_PROPERTY',
          });
        }
      }
    } else if (schema.additionalProperties) {
      // Include additional properties
      for (const key of keys) {
        if (!schema.properties[key]) {
          result[key] = obj[key];
        }
      }
    }
  } else {
    // No schema, just return sanitized object
    return obj;
  }

  return result;
}

// ============================================
// TYPE HANDLING
// ============================================

/**
 * Validate value type
 * @param {any} value - Value to check
 * @param {string} type - Expected type
 * @returns {boolean}
 */
function validateType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'any':
      return true;
    default:
      return true;
  }
}

/**
 * Coerce value to target type
 * @param {any} value - Value to coerce
 * @param {string} type - Target type
 * @returns {any}
 */
function coerceType(value, type) {
  if (value === null || value === undefined) return value;

  switch (type) {
    case 'string':
      return String(value);
    case 'number':
      const num = Number(value);
      return isNaN(num) ? value : num;
    case 'integer':
      const int = parseInt(value, 10);
      return isNaN(int) ? value : int;
    case 'boolean':
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);
    default:
      return value;
  }
}

// ============================================
// FORMAT VALIDATORS
// ============================================

/**
 * Validate value format
 * @param {any} value - Value to validate
 * @param {string} format - Format name
 * @returns {boolean}
 */
function validateFormat(value, format) {
  if (typeof value !== 'string') return false;

  switch (format) {
    case 'email':
      return VALIDATOR_CONFIG.patterns.email.test(value);
    case 'uuid':
      return VALIDATOR_CONFIG.patterns.uuid.test(value);
    case 'solana-address':
    case 'wallet':
      return VALIDATOR_CONFIG.patterns.solanaAddress.test(value);
    case 'hex-color':
      return VALIDATOR_CONFIG.patterns.hexColor.test(value);
    case 'url':
      return VALIDATOR_CONFIG.patterns.url.test(value);
    case 'slug':
      return VALIDATOR_CONFIG.patterns.slug.test(value);
    case 'semver':
      return VALIDATOR_CONFIG.patterns.semver.test(value);
    case 'date':
      return !isNaN(Date.parse(value));
    case 'iso-date':
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
    case 'iso-datetime':
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    default:
      // Check custom patterns
      if (VALIDATOR_CONFIG.patterns[format]) {
        return VALIDATOR_CONFIG.patterns[format].test(value);
      }
      return true;
  }
}

/**
 * Register custom format validator
 * @param {string} name - Format name
 * @param {RegExp|Function} validator - Validation pattern or function
 */
function registerFormat(name, validator) {
  if (validator instanceof RegExp) {
    VALIDATOR_CONFIG.patterns[name] = validator;
  } else if (typeof validator === 'function') {
    // Store function validators separately
    const originalValidateFormat = validateFormat;
    // This is a simplified approach - in production, use a proper registry
  }
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize string value
 * @param {string} value - String to sanitize
 * @returns {string}
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;

  return (
    value
      // Trim whitespace
      .trim()
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize unicode
      .normalize('NFC')
      // Encode HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  );
}

/**
 * Sanitize for SQL (basic)
 * @param {string} value - String to sanitize
 * @returns {string}
 */
function sanitizeForSQL(value) {
  if (typeof value !== 'string') return value;

  return value.replace(/'/g, "''").replace(/\\/g, '\\\\').replace(/;/g, '');
}

/**
 * Check for dangerous content
 * @param {string} value - String to check
 * @returns {boolean}
 */
function containsDangerousContent(value) {
  for (const pattern of VALIDATOR_CONFIG.dangerousPatterns) {
    if (pattern.test(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Deep sanitize object
 * @param {Object} obj - Object to sanitize
 * @param {number} depth - Current depth
 * @returns {Object}
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > VALIDATOR_CONFIG.maxObjectDepth) {
    return {};
  }

  if (Array.isArray(obj)) {
    return obj
      .slice(0, VALIDATOR_CONFIG.maxArrayLength)
      .map(item => sanitizeValue(item, depth + 1));
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    const keys = Object.keys(obj).slice(0, VALIDATOR_CONFIG.maxObjectKeys);

    for (const key of keys) {
      const sanitizedKey = sanitizeString(key);
      result[sanitizedKey] = sanitizeValue(obj[key], depth + 1);
    }

    return result;
  }

  return obj;
}

/**
 * Sanitize any value
 * @param {any} value - Value to sanitize
 * @param {number} depth - Current depth
 * @returns {any}
 */
function sanitizeValue(value, depth = 0) {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value, depth);
  }

  return value;
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Create validation middleware
 * @param {Object|string} bodySchema - Schema for request body
 * @param {Object|string} querySchema - Schema for query params
 * @param {Object|string} paramsSchema - Schema for URL params
 * @returns {Function}
 */
function createMiddleware(bodySchema = null, querySchema = null, paramsSchema = null) {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (bodySchema && req.body) {
      const result = validate(req.body, bodySchema, { path: 'body' });
      if (!result.valid) {
        errors.push(...result.errors.map(e => ({ ...e, location: 'body' })));
      } else {
        req.body = result.data;
      }
    }

    // Validate query
    if (querySchema && req.query) {
      const result = validate(req.query, querySchema, { path: 'query', coerce: true });
      if (!result.valid) {
        errors.push(...result.errors.map(e => ({ ...e, location: 'query' })));
      } else {
        req.query = result.data;
      }
    }

    // Validate params
    if (paramsSchema && req.params) {
      const result = validate(req.params, paramsSchema, { path: 'params', coerce: true });
      if (!result.valid) {
        errors.push(...result.errors.map(e => ({ ...e, location: 'params' })));
      } else {
        req.params = result.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Request validation failed',
        details: errors,
      });
    }

    next();
  };
}

// ============================================
// PREDEFINED SCHEMAS
// ============================================

// Common schemas
registerSchema('wallet', {
  type: 'string',
  format: 'solana-address',
  required: true,
});

registerSchema('pagination', {
  type: 'object',
  properties: {
    page: { type: 'integer', min: 1, default: 1 },
    limit: { type: 'integer', min: 1, max: 100, default: 20 },
    sort: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
});

registerSchema('dateRange', {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'iso-date' },
    endDate: { type: 'string', format: 'iso-date' },
  },
});

registerSchema('id', {
  type: 'string',
  minLength: 1,
  maxLength: 100,
  required: true,
});

// ============================================
// METRICS
// ============================================

/**
 * Get validation statistics
 * @returns {Object}
 */
function getStats() {
  return {
    ...validationStats,
    registeredSchemas: schemas.size,
    passRate:
      validationStats.validated > 0
        ? ((validationStats.passed / validationStats.validated) * 100).toFixed(2) + '%'
        : '100%',
  };
}

module.exports = {
  // Core
  validate,
  registerSchema,
  getSchema,

  // Formats
  registerFormat,
  validateFormat,

  // Sanitization
  sanitizeString,
  sanitizeObject,
  sanitizeValue,
  sanitizeForSQL,
  containsDangerousContent,

  // Middleware
  createMiddleware,

  // Utilities
  coerceType,
  validateType,

  // Stats
  getStats,

  // Config
  VALIDATOR_CONFIG,
};
