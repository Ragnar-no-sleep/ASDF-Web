/**
 * Build V2 - GitHub API Service
 * Fetches repository data for project panels
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================

const GITHUB_API = 'https://api.github.com';
const CACHE_TTL = 300000; // 5 minutes
const FETCH_TIMEOUT = 8000; // 8 seconds

// Repository mappings for ASDF projects
const PROJECT_REPOS = {
  'burn-tracker': { owner: 'Ragnar-no-sleep', repo: 'burn-tracker' },
  'burn-engine': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  'token-launcher': { owner: 'Ragnar-no-sleep', repo: 'token-launcher' },
  'learn-platform': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  'games-platform': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  holdex: { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  forecast: { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  ignition: { owner: 'Ragnar-no-sleep', repo: 'ignition' },
  oracle: { owner: 'Ragnar-no-sleep', repo: 'asdf-oracle' },
  'rpc-monitor': { owner: 'Ragnar-no-sleep', repo: 'rpc-monitor' },
  'community-hub': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  'deploy-pipeline': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  'ambassador-program': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
  'security-audit': { owner: 'Ragnar-no-sleep', repo: 'ASDF-Web' },
};

// ============================================
// GITHUB API SERVICE
// ============================================

const GitHubApiService = {
  /**
   * Cache storage
   */
  cache: {},

  /**
   * Check if cache is valid for a key
   * @param {string} key
   * @returns {boolean}
   */
  isCacheValid(key) {
    const cached = this.cache[key];
    return cached && Date.now() - cached.timestamp < CACHE_TTL;
  },

  /**
   * Get cached data or null
   * @param {string} key
   * @returns {any|null}
   */
  getCached(key) {
    if (this.isCacheValid(key)) {
      return this.cache[key].data;
    }
    return null;
  },

  /**
   * Set cache data
   * @param {string} key
   * @param {any} data
   */
  setCache(key, data) {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };
  },

  /**
   * Fetch with timeout and error handling
   * @param {string} url
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * Get repository info for a project
   * @param {string} projectId
   * @returns {Promise<Object|null>}
   */
  async getRepoInfo(projectId) {
    const repoConfig = PROJECT_REPOS[projectId];
    if (!repoConfig) return null;

    const cacheKey = `repo:${projectId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { owner, repo } = repoConfig;
      const response = await this.fetchWithTimeout(`${GITHUB_API}/repos/${owner}/${repo}`);

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('[GitHubApiService] Rate limited');
          return this.getFallbackRepoInfo(projectId);
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        name: data.name,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        language: data.language,
        updatedAt: data.updated_at,
        url: data.html_url,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[GitHubApiService] Failed to fetch repo info:', error.message);
      return this.getFallbackRepoInfo(projectId);
    }
  },

  /**
   * Get recent commits for a project
   * @param {string} projectId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentCommits(projectId, limit = 5) {
    const repoConfig = PROJECT_REPOS[projectId];
    if (!repoConfig) return [];

    const cacheKey = `commits:${projectId}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { owner, repo } = repoConfig;
      const response = await this.fetchWithTimeout(
        `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${limit}`
      );

      if (!response.ok) {
        return this.getFallbackCommits(projectId);
      }

      const data = await response.json();
      const commits = data.map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0].substring(0, 60),
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url,
      }));

      this.setCache(cacheKey, commits);
      return commits;
    } catch (error) {
      console.warn('[GitHubApiService] Failed to fetch commits:', error.message);
      return this.getFallbackCommits(projectId);
    }
  },

  /**
   * Get contributors for a project
   * @param {string} projectId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getContributors(projectId, limit = 10) {
    const repoConfig = PROJECT_REPOS[projectId];
    if (!repoConfig) return [];

    const cacheKey = `contributors:${projectId}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { owner, repo } = repoConfig;
      const response = await this.fetchWithTimeout(
        `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=${limit}`
      );

      if (!response.ok) {
        return this.getFallbackContributors();
      }

      const data = await response.json();
      const contributors = data.map(contrib => ({
        login: contrib.login,
        avatar: contrib.avatar_url,
        contributions: contrib.contributions,
        url: contrib.html_url,
      }));

      this.setCache(cacheKey, contributors);
      return contributors;
    } catch (error) {
      console.warn('[GitHubApiService] Failed to fetch contributors:', error.message);
      return this.getFallbackContributors();
    }
  },

  /**
   * Calculate project completion percentage
   * Based on milestones/issues if available, otherwise estimate
   * @param {string} projectId
   * @returns {Promise<number>} 0-100
   */
  async getCompletionPercentage(projectId) {
    const repoConfig = PROJECT_REPOS[projectId];
    if (!repoConfig) return 0;

    const cacheKey = `completion:${projectId}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;

    try {
      const { owner, repo } = repoConfig;

      // Try to get milestones first
      const milestonesResponse = await this.fetchWithTimeout(
        `${GITHUB_API}/repos/${owner}/${repo}/milestones?state=all`
      );

      if (milestonesResponse.ok) {
        const milestones = await milestonesResponse.json();
        if (milestones.length > 0) {
          // Calculate based on closed vs total issues in milestones
          let totalIssues = 0;
          let closedIssues = 0;

          milestones.forEach(m => {
            totalIssues += m.open_issues + m.closed_issues;
            closedIssues += m.closed_issues;
          });

          if (totalIssues > 0) {
            const completion = Math.round((closedIssues / totalIssues) * 100);
            this.setCache(cacheKey, completion);
            return completion;
          }
        }
      }

      // Fallback: estimate based on recent activity
      const repoInfo = await this.getRepoInfo(projectId);
      if (repoInfo) {
        // More stars + less open issues = more complete
        const activityScore = Math.min(100, repoInfo.stars * 5);
        const issuesPenalty = Math.min(30, repoInfo.openIssues * 2);
        const completion = Math.max(10, Math.min(95, activityScore - issuesPenalty + 50));
        this.setCache(cacheKey, completion);
        return completion;
      }

      return 50; // Default middle value
    } catch (error) {
      console.warn('[GitHubApiService] Failed to calculate completion:', error.message);
      return 50;
    }
  },

  /**
   * Get full project data bundle
   * @param {string} projectId
   * @returns {Promise<Object>}
   */
  async getProjectData(projectId) {
    const cacheKey = `project:${projectId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Fetch all data in parallel
    const [repoInfo, commits, contributors, completion] = await Promise.all([
      this.getRepoInfo(projectId),
      this.getRecentCommits(projectId, 5),
      this.getContributors(projectId, 5),
      this.getCompletionPercentage(projectId),
    ]);

    const result = {
      projectId,
      repo: repoInfo,
      commits,
      contributors,
      completion,
      fetchedAt: Date.now(),
    };

    this.setCache(cacheKey, result);
    return result;
  },

  // ============================================
  // BUILDER PROFILE METHODS
  // ============================================

  /**
   * Get detailed user profile
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  async getUserProfile(username) {
    if (!username) return null;

    const cacheKey = `user:${username}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithTimeout(`${GITHUB_API}/users/${username}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[GitHubApiService] User not found: ${username}`);
          return null;
        }
        if (response.status === 403) {
          console.warn('[GitHubApiService] Rate limited for user profile');
          return this.getFallbackUserProfile(username);
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        login: data.login,
        name: data.name || data.login,
        avatar: data.avatar_url,
        bio: data.bio,
        company: data.company,
        location: data.location,
        blog: data.blog,
        twitter: data.twitter_username,
        publicRepos: data.public_repos,
        followers: data.followers,
        following: data.following,
        createdAt: data.created_at,
        url: data.html_url,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[GitHubApiService] Failed to fetch user profile:', error.message);
      return this.getFallbackUserProfile(username);
    }
  },

  /**
   * Get user's recent public activity
   * @param {string} username
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getUserActivity(username, limit = 10) {
    if (!username) return [];

    const cacheKey = `activity:${username}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithTimeout(
        `${GITHUB_API}/users/${username}/events/public?per_page=${limit}`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const activity = data.map(event => ({
        id: event.id,
        type: event.type,
        repo: event.repo?.name,
        createdAt: event.created_at,
        payload: this.summarizeEventPayload(event),
      }));

      this.setCache(cacheKey, activity);
      return activity;
    } catch (error) {
      console.warn('[GitHubApiService] Failed to fetch user activity:', error.message);
      return [];
    }
  },

  /**
   * Event summarizer strategies (Open/Closed principle)
   */
  eventSummarizers: {
    PushEvent: event => {
      const commits = event.payload?.commits?.length || 0;
      return `Pushed ${commits} commit${commits !== 1 ? 's' : ''}`;
    },
    PullRequestEvent: event =>
      `${event.payload?.action} PR #${event.payload?.pull_request?.number}`,
    IssuesEvent: event => `${event.payload?.action} issue #${event.payload?.issue?.number}`,
    CreateEvent: event => `Created ${event.payload?.ref_type} ${event.payload?.ref || ''}`,
    DeleteEvent: event => `Deleted ${event.payload?.ref_type} ${event.payload?.ref || ''}`,
    WatchEvent: () => 'Starred repository',
    ForkEvent: () => 'Forked repository',
    IssueCommentEvent: event => `Commented on #${event.payload?.issue?.number}`,
  },

  /**
   * Summarize event payload for display
   * @param {Object} event
   * @returns {string}
   */
  summarizeEventPayload(event) {
    const summarizer = this.eventSummarizers[event.type];
    return summarizer ? summarizer(event) : event.type.replace('Event', '');
  },

  /**
   * Get user's public repositories
   * @param {string} username
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getUserRepos(username, limit = 6) {
    if (!username) return [];

    const cacheKey = `repos:${username}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithTimeout(
        `${GITHUB_API}/users/${username}/repos?sort=updated&per_page=${limit}`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const repos = data.map(repo => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        url: repo.html_url,
      }));

      this.setCache(cacheKey, repos);
      return repos;
    } catch (error) {
      console.warn('[GitHubApiService] Failed to fetch user repos:', error.message);
      return [];
    }
  },

  /**
   * Get full builder profile with activity and repos
   * @param {string} username
   * @returns {Promise<Object>}
   */
  async getBuilderProfile(username) {
    const cacheKey = `builder:${username}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Fetch all data in parallel
    const [profile, activity, repos] = await Promise.all([
      this.getUserProfile(username),
      this.getUserActivity(username, 10),
      this.getUserRepos(username, 6),
    ]);

    if (!profile) {
      return null;
    }

    const result = {
      ...profile,
      activity,
      repos,
      fetchedAt: Date.now(),
    };

    this.setCache(cacheKey, result);
    return result;
  },

  /**
   * Check if user has contributed to ASDF projects
   * @param {string} username
   * @returns {Promise<Array>}
   */
  async getUserAsdfContributions(username) {
    if (!username) return [];

    const cacheKey = `asdf-contrib:${username}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const contributions = [];

    // Check each ASDF project for this contributor
    for (const [projectId, repoConfig] of Object.entries(PROJECT_REPOS)) {
      try {
        const contributors = await this.getContributors(projectId, 100);
        const found = contributors.find(c => c.login.toLowerCase() === username.toLowerCase());

        if (found) {
          contributions.push({
            projectId,
            repo: repoConfig.repo,
            contributions: found.contributions,
          });
        }
      } catch (error) {
        // Skip this project on error
      }
    }

    this.setCache(cacheKey, contributions);
    return contributions;
  },

  // ============================================
  // FALLBACK DATA
  // ============================================

  /**
   * Fallback repo info when API unavailable
   * @param {string} projectId
   * @returns {Object}
   */
  getFallbackRepoInfo(projectId) {
    return {
      name: projectId,
      description: 'ASDF Ecosystem Project',
      stars: 0,
      forks: 0,
      openIssues: 0,
      language: 'JavaScript',
      updatedAt: new Date().toISOString(),
      url: `https://github.com/Ragnar-no-sleep/${projectId}`,
    };
  },

  /**
   * Fallback commits
   * @returns {Array}
   */
  getFallbackCommits() {
    return [
      {
        sha: 'xxxxxxx',
        message: 'Recent updates',
        author: 'Builder',
        date: new Date().toISOString(),
        url: '#',
      },
    ];
  },

  /**
   * Fallback contributors
   * @returns {Array}
   */
  getFallbackContributors() {
    return [
      {
        login: 'Ragnar',
        avatar: '/assets/default-avatar.png',
        contributions: 100,
        url: 'https://github.com/Ragnar-no-sleep',
      },
    ];
  },

  /**
   * Fallback user profile
   * @param {string} username
   * @returns {Object}
   */
  getFallbackUserProfile(username) {
    return {
      login: username,
      name: username,
      avatar: '/assets/default-avatar.png',
      bio: null,
      company: null,
      location: null,
      blog: null,
      twitter: null,
      publicRepos: 0,
      followers: 0,
      following: 0,
      createdAt: null,
      url: `https://github.com/${username}`,
    };
  },

  /**
   * Format relative time
   * @param {string} dateString
   * @returns {string}
   */
  formatTimeAgo(dateString) {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  },

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache = {};
  },
};

// ============================================
// EXPORTS
// ============================================

export { GitHubApiService };
export default GitHubApiService;

// Global export for browser
if (typeof window !== 'undefined') {
  window.GitHubApiService = GitHubApiService;
}
