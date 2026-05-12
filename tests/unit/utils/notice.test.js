/**
 * Notice Utility Unit Tests
 * Tests showNotice from js/utils/notice.js
 */

import { showNotice } from '../../../js/utils/notice.js';

describe('showNotice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('appends a notice element to body', () => {
    showNotice('Test message');
    const el = document.querySelector('.error-inline');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Test message');
  });

  it('removes the notice after 4 seconds', () => {
    showNotice('Temporary');
    expect(document.querySelector('.error-inline')).not.toBeNull();
    jest.advanceTimersByTime(4000);
    expect(document.querySelector('.error-inline')).toBeNull();
  });

  it('sets window.showNotice global', () => {
    expect(typeof window.showNotice).toBe('function');
  });
});
