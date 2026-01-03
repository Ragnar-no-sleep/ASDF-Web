/**
 * OpenAPI Documentation Generator
 * Auto-generates OpenAPI 3.0 documentation from route definitions
 * Security by Design: Documents security schemes, validates schemas
 */

// Configuration
const OPENAPI_CONFIG = {
    version: '3.0.3',
    defaultContentType: 'application/json',
    securitySchemes: {
        bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
        },
        walletSignature: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Wallet-Signature'
        },
        idempotencyKey: {
            type: 'apiKey',
            in: 'header',
            name: 'Idempotency-Key'
        }
    },
    defaultResponses: {
        400: {
            description: 'Bad Request',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error'
                    }
                }
            }
        },
        401: {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error'
                    }
                }
            }
        },
        403: {
            description: 'Forbidden',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error'
                    }
                }
            }
        },
        404: {
            description: 'Not Found',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error'
                    }
                }
            }
        },
        429: {
            description: 'Too Many Requests',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error'
                    }
                }
            }
        },
        500: {
            description: 'Internal Server Error',
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error'
                    }
                }
            }
        }
    }
};

// Common schemas
const commonSchemas = {
    Error: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['success', 'error']
    },
    Success: {
        type: 'object',
        properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['success']
    },
    Pagination: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasMore: { type: 'boolean' }
        }
    },
    WalletAddress: {
        type: 'string',
        pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$',
        description: 'Solana wallet address (base58)'
    },
    TransactionSignature: {
        type: 'string',
        pattern: '^[1-9A-HJ-NP-Za-km-z]{87,88}$',
        description: 'Solana transaction signature'
    },
    Timestamp: {
        type: 'integer',
        format: 'int64',
        description: 'Unix timestamp in milliseconds'
    }
};

// Route registry
const routes = new Map();
const tags = new Map();
const customSchemas = new Map();

// Statistics
const stats = {
    routesRegistered: 0,
    schemasRegistered: 0,
    tagsRegistered: 0,
    documentationsGenerated: 0,
    validationErrors: 0
};

/**
 * Register a tag for grouping routes
 */
function registerTag(name, description, externalDocs = null) {
    const tag = {
        name,
        description
    };

    if (externalDocs) {
        tag.externalDocs = externalDocs;
    }

    tags.set(name, tag);
    stats.tagsRegistered++;

    return tag;
}

/**
 * Register a custom schema
 */
function registerSchema(name, schema) {
    customSchemas.set(name, schema);
    stats.schemasRegistered++;

    return schema;
}

/**
 * Register a route for documentation
 */
function registerRoute(options) {
    const {
        method,
        path,
        summary,
        description,
        tags: routeTags = [],
        parameters = [],
        requestBody,
        responses = {},
        security = [],
        deprecated = false,
        operationId
    } = options;

    // Normalize method
    const normalizedMethod = method.toLowerCase();

    // Create path key
    const pathKey = path.replace(/:([^/]+)/g, '{$1}');

    if (!routes.has(pathKey)) {
        routes.set(pathKey, {});
    }

    // Build operation object
    const operation = {
        summary,
        description,
        tags: routeTags,
        deprecated
    };

    if (operationId) {
        operation.operationId = operationId;
    } else {
        // Auto-generate operationId
        operation.operationId = generateOperationId(normalizedMethod, path);
    }

    // Add parameters
    if (parameters.length > 0) {
        operation.parameters = parameters.map(param => normalizeParameter(param, path));
    }

    // Add request body
    if (requestBody) {
        operation.requestBody = normalizeRequestBody(requestBody);
    }

    // Add responses
    operation.responses = {
        ...OPENAPI_CONFIG.defaultResponses,
        ...normalizeResponses(responses)
    };

    // Add security requirements
    if (security.length > 0) {
        operation.security = security.map(s => {
            if (typeof s === 'string') {
                return { [s]: [] };
            }
            return s;
        });
    }

    routes.get(pathKey)[normalizedMethod] = operation;
    stats.routesRegistered++;

    return operation;
}

/**
 * Generate operation ID from method and path
 */
function generateOperationId(method, path) {
    const segments = path
        .replace(/^\/api\//, '')
        .replace(/[{}:]/g, '')
        .split('/')
        .filter(Boolean);

    const camelCase = segments
        .map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))
        .join('');

    return `${method}${camelCase.charAt(0).toUpperCase()}${camelCase.slice(1)}`;
}

/**
 * Normalize parameter definition
 */
function normalizeParameter(param, path) {
    const normalized = {
        name: param.name,
        in: param.in || (path.includes(`:${param.name}`) ? 'path' : 'query'),
        description: param.description || '',
        required: param.required !== false && param.in === 'path',
        schema: param.schema || { type: param.type || 'string' }
    };

    if (param.example !== undefined) {
        normalized.example = param.example;
    }

    if (param.deprecated) {
        normalized.deprecated = true;
    }

    return normalized;
}

/**
 * Normalize request body definition
 */
function normalizeRequestBody(body) {
    if (body.content) {
        return body;
    }

    return {
        description: body.description || '',
        required: body.required !== false,
        content: {
            [OPENAPI_CONFIG.defaultContentType]: {
                schema: body.schema || body
            }
        }
    };
}

/**
 * Normalize response definitions
 */
function normalizeResponses(responses) {
    const normalized = {};

    for (const [code, response] of Object.entries(responses)) {
        if (response.content) {
            normalized[code] = response;
        } else if (response.schema) {
            normalized[code] = {
                description: response.description || `Response ${code}`,
                content: {
                    [OPENAPI_CONFIG.defaultContentType]: {
                        schema: response.schema
                    }
                }
            };
        } else {
            normalized[code] = {
                description: response.description || `Response ${code}`
            };
        }
    }

    return normalized;
}

/**
 * Generate full OpenAPI specification
 */
function generateSpec(info) {
    const {
        title = 'ASDF API',
        version = '1.0.0',
        description = 'ASDF Game Platform API',
        termsOfService,
        contact,
        license,
        servers = []
    } = info;

    stats.documentationsGenerated++;

    const spec = {
        openapi: OPENAPI_CONFIG.version,
        info: {
            title,
            version,
            description
        },
        servers: servers.length > 0 ? servers : [
            {
                url: '/api',
                description: 'API Server'
            }
        ],
        tags: Array.from(tags.values()),
        paths: Object.fromEntries(routes),
        components: {
            schemas: {
                ...commonSchemas,
                ...Object.fromEntries(customSchemas)
            },
            securitySchemes: OPENAPI_CONFIG.securitySchemes
        }
    };

    if (termsOfService) spec.info.termsOfService = termsOfService;
    if (contact) spec.info.contact = contact;
    if (license) spec.info.license = license;

    return spec;
}

/**
 * Express middleware to serve OpenAPI documentation
 */
function serveDocumentation(info) {
    return (req, res) => {
        const spec = generateSpec(info);
        res.json(spec);
    };
}

/**
 * Generate Swagger UI HTML
 */
function generateSwaggerUI(specUrl = '/api/docs/openapi.json') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASDF API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #1a1a2e; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "${specUrl}",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                docExpansion: "list",
                filter: true,
                showExtensions: true,
                showCommonExtensions: true
            });
        };
    </script>
</body>
</html>
    `.trim();
}

/**
 * Middleware to serve Swagger UI
 */
function serveSwaggerUI(specUrl = '/api/docs/openapi.json') {
    const html = generateSwaggerUI(specUrl);

    return (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    };
}

/**
 * Validate request against OpenAPI schema
 */
function validateRequest(pathKey, method, req) {
    const pathSpec = routes.get(pathKey);
    if (!pathSpec) {
        return { valid: true }; // No spec, skip validation
    }

    const operation = pathSpec[method.toLowerCase()];
    if (!operation) {
        return { valid: true };
    }

    const errors = [];

    // Validate parameters
    if (operation.parameters) {
        for (const param of operation.parameters) {
            const value = getParameterValue(param, req);

            if (param.required && (value === undefined || value === '')) {
                errors.push({
                    location: param.in,
                    parameter: param.name,
                    message: `Required parameter '${param.name}' is missing`
                });
            }

            if (value !== undefined && param.schema) {
                const paramError = validateValue(value, param.schema, param.name);
                if (paramError) {
                    errors.push({
                        location: param.in,
                        parameter: param.name,
                        message: paramError
                    });
                }
            }
        }
    }

    // Validate request body
    if (operation.requestBody && operation.requestBody.required) {
        if (!req.body || Object.keys(req.body).length === 0) {
            errors.push({
                location: 'body',
                message: 'Request body is required'
            });
        }
    }

    if (errors.length > 0) {
        stats.validationErrors++;
        return { valid: false, errors };
    }

    return { valid: true };
}

/**
 * Get parameter value from request
 */
function getParameterValue(param, req) {
    switch (param.in) {
        case 'path':
            return req.params[param.name];
        case 'query':
            return req.query[param.name];
        case 'header':
            return req.headers[param.name.toLowerCase()];
        case 'cookie':
            return req.cookies?.[param.name];
        default:
            return undefined;
    }
}

/**
 * Validate value against schema (basic validation)
 */
function validateValue(value, schema, name) {
    if (schema.type === 'integer' || schema.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
            return `${name} must be a number`;
        }
        if (schema.minimum !== undefined && num < schema.minimum) {
            return `${name} must be >= ${schema.minimum}`;
        }
        if (schema.maximum !== undefined && num > schema.maximum) {
            return `${name} must be <= ${schema.maximum}`;
        }
    }

    if (schema.type === 'string') {
        if (schema.minLength && value.length < schema.minLength) {
            return `${name} must be at least ${schema.minLength} characters`;
        }
        if (schema.maxLength && value.length > schema.maxLength) {
            return `${name} must be at most ${schema.maxLength} characters`;
        }
        if (schema.pattern) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                return `${name} does not match required pattern`;
            }
        }
        if (schema.enum && !schema.enum.includes(value)) {
            return `${name} must be one of: ${schema.enum.join(', ')}`;
        }
    }

    return null;
}

/**
 * Auto-register routes from Express app
 */
function autoRegisterRoutes(app, options = {}) {
    const { basePath = '/api', excludePaths = ['/health', '/metrics'] } = options;

    let registered = 0;

    // This is a simplified version - in production, use express-list-endpoints
    if (app._router && app._router.stack) {
        for (const layer of app._router.stack) {
            if (layer.route) {
                const path = layer.route.path;

                if (excludePaths.some(p => path.startsWith(p))) {
                    continue;
                }

                for (const method of Object.keys(layer.route.methods)) {
                    if (layer.route.methods[method]) {
                        registerRoute({
                            method,
                            path: basePath + path,
                            summary: `${method.toUpperCase()} ${path}`,
                            tags: [guessTag(path)]
                        });
                        registered++;
                    }
                }
            }
        }
    }

    console.log(`[OpenAPI] Auto-registered ${registered} routes`);
    return registered;
}

/**
 * Guess tag from path
 */
function guessTag(path) {
    const segments = path.split('/').filter(Boolean);

    if (segments.length > 0) {
        const first = segments[0].replace(/^:/, '');
        return first.charAt(0).toUpperCase() + first.slice(1);
    }

    return 'General';
}

/**
 * Export spec to file
 */
function exportToFile(info, filePath) {
    const fs = require('fs');
    const spec = generateSpec(info);

    fs.writeFileSync(filePath, JSON.stringify(spec, null, 2));
    console.log(`[OpenAPI] Specification exported to ${filePath}`);

    return filePath;
}

/**
 * Get statistics
 */
function getStats() {
    return {
        ...stats,
        registeredRoutes: routes.size,
        registeredTags: tags.size,
        registeredSchemas: customSchemas.size + Object.keys(commonSchemas).length
    };
}

/**
 * Clear all registrations
 */
function clear() {
    routes.clear();
    tags.clear();
    customSchemas.clear();
    stats.routesRegistered = 0;
    stats.tagsRegistered = 0;
    stats.schemasRegistered = 0;
}

// Pre-register common tags
registerTag('Authentication', 'User authentication and authorization');
registerTag('Users', 'User management operations');
registerTag('Games', 'Game-related operations');
registerTag('Transactions', 'Blockchain transaction operations');
registerTag('Admin', 'Administrative operations');
registerTag('Health', 'Health check and monitoring');

module.exports = {
    registerTag,
    registerSchema,
    registerRoute,
    generateSpec,
    serveDocumentation,
    serveSwaggerUI,
    generateSwaggerUI,
    validateRequest,
    autoRegisterRoutes,
    exportToFile,
    getStats,
    clear,
    commonSchemas,
    OPENAPI_CONFIG
};
