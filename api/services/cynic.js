/**
 * ASDF API - CYNIC Integration Client
 *
 * Enables ASDF-Web to communicate with CYNIC MCP server
 * for judgment, pattern detection, and reputation scoring.
 *
 * Future integrations:
 * - Anti-cheat behavioral analysis
 * - E-Score reputation scoring
 * - Psychological profiling for personalized experiences
 *
 * @version 1.0.0
 */

'use strict';

const CYNIC_MCP_URL = process.env.CYNIC_MCP_URL || 'https://cynic-mcp.onrender.com';

/**
 * Submit content for CYNIC judgment
 *
 * @param {string} type - Judgment type (e.g., 'behavior', 'transaction', 'content')
 * @param {*} content - Content to be judged
 * @param {Object} context - Additional context for judgment
 * @returns {Promise<Object>} Judgment result with Q-Score and verdict
 */
async function submitJudgment(type, content, context = {}) {
  try {
    const response = await fetch(`${CYNIC_MCP_URL}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        content,
        context,
        source: 'asdf-web',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CYNIC judgment failed: ${error}`);
    }

    return response.json();
  } catch (error) {
    console.error('[CYNIC] Judgment request failed:', error.message);
    // Return neutral judgment on failure (fail-open for non-critical path)
    return {
      success: false,
      error: error.message,
      qScore: 50,
      verdict: 'UNKNOWN',
    };
  }
}

/**
 * Get reputation score for a wallet
 *
 * @param {string} wallet - Solana wallet address
 * @returns {Promise<Object>} Reputation data including E-Score
 */
async function getReputation(wallet) {
  try {
    const response = await fetch(`${CYNIC_MCP_URL}/api/reputation/${wallet}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Reputation fetch failed');
    }

    return response.json();
  } catch (error) {
    console.error('[CYNIC] Reputation fetch failed:', error.message);
    return {
      success: false,
      error: error.message,
      eScore: 50,
      level: 'unknown',
    };
  }
}

/**
 * Report suspicious behavior for analysis
 *
 * @param {string} wallet - Wallet exhibiting behavior
 * @param {string} behaviorType - Type of behavior (e.g., 'rapid_transactions', 'impossible_score')
 * @param {Object} evidence - Evidence data
 * @returns {Promise<Object>} Report acknowledgment
 */
async function reportBehavior(wallet, behaviorType, evidence = {}) {
  try {
    const response = await fetch(`${CYNIC_MCP_URL}/api/behavior/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet,
        behaviorType,
        evidence,
        source: 'asdf-web',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Behavior report failed');
    }

    return response.json();
  } catch (error) {
    console.error('[CYNIC] Behavior report failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if CYNIC MCP is available
 *
 * @returns {Promise<boolean>} True if CYNIC is reachable
 */
async function healthCheck() {
  try {
    const response = await fetch(`${CYNIC_MCP_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

module.exports = {
  submitJudgment,
  getReputation,
  reportBehavior,
  healthCheck,
  CYNIC_MCP_URL,
};
