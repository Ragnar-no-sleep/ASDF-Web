/**
 * Tests for HudFactory (games/framework/hud.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/hud.js'));
});

const HF = () => global.HudFactory;

describe('HudFactory', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    HF().destroy();
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('create', () => {
    it('should create HUD with items', () => {
      const hud = HF().create({
        gameId: 'testgame',
        container: '#test-container',
        items: [
          { id: 'score', type: 'text', value: 0 },
          { id: 'label', type: 'label', value: 'Score:' },
        ],
      });

      expect(hud).toBeDefined();
      expect(HF()._elements.size).toBe(2);
    });

    it('should create HUD container with correct class', () => {
      HF().create({ gameId: 'testgame', container: '#test-container', items: [] });
      expect(document.querySelector('.testgame-hud-container')).toBeTruthy();
    });

    it('should create HUD item elements with correct attributes', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'score', type: 'text', value: 100 }],
      });

      const el = document.getElementById('tg-score');
      expect(el).toBeTruthy();
      expect(el.textContent).toBe('100');
      expect(el.getAttribute('data-hud-type')).toBe('text');
      expect(el.getAttribute('data-hud-id')).toBe('score');
    });

    it('should handle missing container gracefully', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const hud = HF().create({ container: '#nonexistent', items: [] });
      spy.mockRestore();
      expect(hud.update).toBeDefined();
      expect(hud.destroy).toBeDefined();
    });

    it('should create bar type with fill element', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'hp', type: 'bar', value: 50, max: 100 }],
      });
      const el = document.getElementById('tg-hp');
      expect(el.querySelector('[class*="-bar-fill"]')).toBeTruthy();
    });

    it('should create timer type with formatted time', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'time', type: 'timer', value: 125 }],
      });
      const el = document.getElementById('tg-time');
      expect(el.textContent).toBe('02:05');
    });
  });

  describe('update', () => {
    it('should update text element value', () => {
      const hud = HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'score', type: 'text', value: 0 }],
      });

      hud.update('score', 500);
      expect(document.getElementById('tg-score').textContent).toBe('500');
    });

    it('should update timer element', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'time', type: 'timer', value: 0 }],
      });

      HF().update('time', 90);
      expect(document.getElementById('tg-time').textContent).toBe('01:30');
    });

    it('should handle non-existent element', () => {
      HF().create({ gameId: 'tg', container: '#test-container', items: [] });
      expect(() => HF().update('nonexistent', 100)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should remove HUD container from DOM', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'score', type: 'text' }],
      });

      expect(document.querySelector('.tg-hud-container')).toBeTruthy();
      HF().destroy();
      expect(document.querySelector('.tg-hud-container')).toBeNull();
    });

    it('should clear elements map', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'score', type: 'text' }],
      });
      HF().destroy();
      expect(HF()._elements.size).toBe(0);
    });
  });

  describe('get', () => {
    it('should return element by ID', () => {
      HF().create({
        gameId: 'tg',
        container: '#test-container',
        items: [{ id: 'score', type: 'text' }],
      });
      const el = HF().get('score');
      expect(el).toBeTruthy();
      expect(el.id).toBe('tg-score');
    });

    it('should return null for non-existent element', () => {
      HF().create({ gameId: 'tg', container: '#test-container', items: [] });
      expect(HF().get('nonexistent')).toBeNull();
    });
  });

  describe('setVisible', () => {
    it('should toggle visibility', () => {
      HF().create({ gameId: 'tg', container: '#test-container', items: [] });
      HF().setVisible(false);
      expect(HF()._container.style.display).toBe('none');
      HF().setVisible(true);
      expect(HF()._container.style.display).toBe('block');
    });
  });
});
