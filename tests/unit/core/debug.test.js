/**
 * Debug Utilities Unit Tests
 * Tests the REAL source at js/core/debug.js
 *
 * Covers: shouldLog filtering, all log functions, createLogger,
 * enableDebug, disableDebug, auto-enable on localhost.
 */

import {
  debug,
  debugWarn,
  debugError,
  debugInfo,
  debugTable,
  debugGroup,
  debugGroupEnd,
  createLogger,
  enableDebug,
  disableDebug,
} from '../../../js/core/debug.js';

// NOTE: jsdom defaults window.location.hostname to 'localhost' (testURL).
// This triggers getDebugSetting auto-enable. We cannot override window.location
// in jsdom (non-configurable). Instead, to test "disabled" state, we set DEBUG
// to a non-matching module string (avoids the hostname branch entirely).

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'table').mockImplementation(() => {});
  jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
  jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function setDebugEnabled() {
  localStorage.getItem.mockReturnValue('true');
}

function setDebugDisabled() {
  // Return a non-matching module name — avoids the localhost auto-enable branch
  localStorage.getItem.mockReturnValue('_disabled_');
}

function setDebugModules(modules) {
  localStorage.getItem.mockReturnValue(modules);
}

function setDebugAbsent() {
  localStorage.getItem.mockReturnValue(null);
}

// ============================================
// debug()
// ============================================

describe('debug()', () => {
  it('calls console.log with formatted prefix when DEBUG=true', () => {
    setDebugEnabled();
    debug('Wallet', 'hello', 42);
    expect(console.log).toHaveBeenCalledTimes(1);
    const [prefix, ...rest] = console.log.mock.calls[0];
    expect(prefix).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\[Wallet\]$/);
    expect(rest).toEqual(['hello', 42]);
  });

  it('does NOT log when module is not in the DEBUG list', () => {
    setDebugDisabled();
    debug('Wallet', 'silent');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('logs for matching module when DEBUG="Wallet"', () => {
    setDebugModules('Wallet');
    debug('Wallet', 'matched');
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('does NOT log for non-matching module', () => {
    setDebugModules('Wallet');
    debug('Game', 'silent');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('matches module name case-insensitively', () => {
    setDebugModules('wallet');
    debug('Wallet', 'case insensitive');
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('handles comma-separated module list', () => {
    setDebugModules('Wallet,Game');
    debug('Game', 'matched');
    expect(console.log).toHaveBeenCalledTimes(1);
    debug('Burns', 'no match');
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});

// ============================================
// debugWarn()
// ============================================

describe('debugWarn()', () => {
  it('calls console.warn when enabled', () => {
    setDebugEnabled();
    debugWarn('Forecast', 'low confidence');
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.calls[0][0]).toMatch(/\[Forecast\]/);
  });

  it('does NOT call console.warn when disabled', () => {
    setDebugDisabled();
    debugWarn('Forecast', 'silent');
    expect(console.warn).not.toHaveBeenCalled();
  });
});

// ============================================
// debugError() — ALWAYS logs
// ============================================

describe('debugError()', () => {
  it('ALWAYS calls console.error even when debug is off', () => {
    setDebugDisabled();
    debugError('Burns', 'critical');
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toMatch(/\[Burns\]/);
  });

  it('ALWAYS calls console.error when module is not in list', () => {
    setDebugModules('OtherModule');
    debugError('Wallet', 'still logs');
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

// ============================================
// debugInfo()
// ============================================

describe('debugInfo()', () => {
  it('calls console.info when enabled', () => {
    setDebugEnabled();
    debugInfo('HolDex', 'loaded');
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it('does NOT call console.info when disabled', () => {
    setDebugDisabled();
    debugInfo('HolDex', 'silent');
    expect(console.info).not.toHaveBeenCalled();
  });
});

// ============================================
// debugTable()
// ============================================

describe('debugTable()', () => {
  it('calls console.log AND console.table when enabled', () => {
    setDebugEnabled();
    const data = [{ id: 1 }];
    debugTable('Staking', data);
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.table).toHaveBeenCalledWith(data);
  });

  it('does not log when disabled', () => {
    setDebugDisabled();
    debugTable('Staking', []);
    expect(console.log).not.toHaveBeenCalled();
    expect(console.table).not.toHaveBeenCalled();
  });
});

// ============================================
// debugGroup / debugGroupEnd
// ============================================

describe('debugGroup()', () => {
  it('calls console.groupCollapsed when enabled', () => {
    setDebugEnabled();
    debugGroup('Ignition', 'init');
    expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
  });

  it('does NOT call when disabled', () => {
    setDebugDisabled();
    debugGroup('Ignition', 'silent');
    expect(console.groupCollapsed).not.toHaveBeenCalled();
  });
});

describe('debugGroupEnd()', () => {
  it('calls console.groupEnd when enabled', () => {
    setDebugEnabled();
    debugGroupEnd('Ignition');
    expect(console.groupEnd).toHaveBeenCalledTimes(1);
  });

  it('does NOT call when disabled', () => {
    setDebugDisabled();
    debugGroupEnd('Ignition');
    expect(console.groupEnd).not.toHaveBeenCalled();
  });
});

// ============================================
// createLogger()
// ============================================

describe('createLogger()', () => {
  it('returns an object with all expected methods', () => {
    const log = createLogger('Test');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.table).toBe('function');
    expect(typeof log.group).toBe('function');
    expect(typeof log.groupEnd).toBe('function');
  });

  it('log.debug delegates to debug() with bound module name', () => {
    setDebugEnabled();
    const log = createLogger('Logger');
    log.debug('test');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls[0][0]).toMatch(/\[Logger\]/);
  });

  it('log.error ALWAYS logs (delegates to debugError)', () => {
    setDebugDisabled();
    const log = createLogger('Logger');
    log.error('always');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('scoped logger does not log when module is not in DEBUG list', () => {
    setDebugModules('OtherModule');
    const log = createLogger('Logger');
    log.debug('silent');
    expect(console.log).not.toHaveBeenCalled();
  });
});

// ============================================
// enableDebug / disableDebug
// ============================================

describe('enableDebug()', () => {
  it('sets localStorage DEBUG to "true" when called with true', () => {
    enableDebug(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('DEBUG', 'true');
  });

  it('removes localStorage DEBUG when called with false', () => {
    enableDebug(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('DEBUG');
  });

  it('sets localStorage DEBUG to module list string', () => {
    enableDebug('Wallet,Game');
    expect(localStorage.setItem).toHaveBeenCalledWith('DEBUG', 'Wallet,Game');
  });

  it('defaults to true when called with no argument', () => {
    enableDebug();
    expect(localStorage.setItem).toHaveBeenCalledWith('DEBUG', 'true');
  });
});

describe('disableDebug()', () => {
  it('removes localStorage DEBUG', () => {
    disableDebug();
    expect(localStorage.removeItem).toHaveBeenCalledWith('DEBUG');
  });
});

// ============================================
// Auto-enable on localhost
// ============================================

describe('auto-enable on localhost', () => {
  // jsdom defaults window.location.hostname to 'localhost' (testURL)
  it('logs when no DEBUG key and hostname is localhost (jsdom default)', () => {
    setDebugAbsent();
    debug('Wallet', 'auto-enabled');
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
