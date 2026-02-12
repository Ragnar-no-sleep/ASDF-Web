/**
 * API Routes Aggregator
 *
 * This module aggregates all route modules and exports them for use in index.js.
 * As routes are extracted from index.js, add them here.
 *
 * @module routes
 */

'use strict';

const probes = require('./probes');

module.exports = {
  probes,
  // Future extractions:
  // auth: require('./auth'),
  // shop: require('./shop'),
  // game: require('./game'),
  // admin: require('./admin'),
};
