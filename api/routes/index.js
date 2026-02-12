/**
 * API Routes Aggregator
 *
 * Aggregates all route modules for mounting in index.js.
 * Each module exports an Express Router.
 *
 * @module routes
 */

'use strict';

const probes = require('./probes');
const { authRouter, userRouter } = require('./auth');
const shop = require('./shop');
const ecosystem = require('./ecosystem');

module.exports = {
  probes,
  auth: authRouter,
  user: userRouter,
  shop,
  ecosystem,
};
