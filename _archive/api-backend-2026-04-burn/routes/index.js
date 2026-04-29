/**
 * API Routes Aggregator
 *
 * Aggregates all route modules for mounting in index.js.
 * Each module exports an Express Router (or factory function).
 *
 * @module routes
 */

'use strict';

const probes = require('./probes');
const { authRouter, userRouter } = require('./auth');
const shop = require('./shop');
const ecosystem = require('./ecosystem');
const games = require('./games');
const admin = require('./admin');
const helius = require('./helius');
const notifications = require('./notifications');
const formations = require('./formations');
const transactions = require('./transactions');
const data = require('./data');
const referrals = require('./referrals');
const mint = require('./mint');
const createMiscRouter = require('./misc');

module.exports = {
  probes,
  auth: authRouter,
  user: userRouter,
  shop,
  ecosystem,
  games,
  admin,
  helius,
  notifications,
  formations,
  transactions,
  data,
  referrals,
  mint,
  createMiscRouter,
};
