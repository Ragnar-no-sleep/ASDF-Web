/**
 * @jest-environment node
 */

'use strict';

const { MIGRATIONS, runMigrations } = require('../../../api/services/postgres-migrations');

describe('PostgreSQL Migrations', () => {
  describe('MIGRATIONS array', () => {
    it('should have sequential version numbers', () => {
      for (let i = 0; i < MIGRATIONS.length; i++) {
        expect(MIGRATIONS[i].version).toBe(i + 1);
      }
    });

    it('should have unique version numbers', () => {
      const versions = MIGRATIONS.map(m => m.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });

    it('should have name for each migration', () => {
      MIGRATIONS.forEach(m => {
        expect(typeof m.name).toBe('string');
        expect(m.name.length).toBeGreaterThan(0);
      });
    });

    it('should have SQL up script for each migration', () => {
      MIGRATIONS.forEach(m => {
        expect(typeof m.up).toBe('string');
        expect(m.up.length).toBeGreaterThan(0);
      });
    });

    it('migration 1 should create core tables', () => {
      const m1 = MIGRATIONS[0];
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS burns');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS leaderboard');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS game_scores');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS achievements');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS purchases');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS inventory');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS notifications');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS sessions');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS audit_log');
      expect(m1.up).toContain('CREATE TABLE IF NOT EXISTS migrations');
    });

    it('migration 2 should add referrals', () => {
      const m2 = MIGRATIONS[1];
      expect(m2.name).toBe('add_referrals');
      expect(m2.up).toContain('CREATE TABLE IF NOT EXISTS referrals');
    });

    it('migration 3 should add progression fields', () => {
      const m3 = MIGRATIONS[2];
      expect(m3.name).toBe('add_progression');
      expect(m3.up).toContain('daily_xp');
      expect(m3.up).toContain('weekly_xp');
      expect(m3.up).toContain('xp_history');
    });

    it('migration 4 should create shop v2 tables', () => {
      const m4 = MIGRATIONS[3];
      expect(m4.name).toBe('shop_v2_cosmetics');
      expect(m4.up).toContain('CREATE TABLE IF NOT EXISTS collections');
      expect(m4.up).toContain('CREATE TABLE IF NOT EXISTS shop_items');
      expect(m4.up).toContain('CREATE TABLE IF NOT EXISTS user_favorites');
      expect(m4.up).toContain('CREATE TABLE IF NOT EXISTS user_equipped');
      expect(m4.up).toContain('CREATE TABLE IF NOT EXISTS user_currency');
      expect(m4.up).toContain('CREATE TABLE IF NOT EXISTS shop_events');
    });

    it('migration 5 should add performance indexes', () => {
      const m5 = MIGRATIONS[4];
      expect(m5.name).toBe('performance_indexes');
      expect(m5.up).toContain('CREATE INDEX');
    });

    it('should not contain DROP TABLE statements', () => {
      MIGRATIONS.forEach(m => {
        expect(m.up.toUpperCase()).not.toContain('DROP TABLE');
      });
    });

    it('should not contain TRUNCATE statements', () => {
      MIGRATIONS.forEach(m => {
        expect(m.up.toUpperCase()).not.toContain('TRUNCATE');
      });
    });
  });

  describe('runMigrations()', () => {
    it('should be a function', () => {
      expect(typeof runMigrations).toBe('function');
    });

    it('should handle null pool gracefully', async () => {
      // runMigrations(null) should exit early without error
      await expect(runMigrations(null)).resolves.not.toThrow();
    });
  });
});
