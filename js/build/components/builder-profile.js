/**
 * Build V2 - Builder Profile Component
 * Modal card displaying builder/contributor information
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { GitHubApiService } from '../services/github-api.js';
import { $, $$, addClass, removeClass, on, safeInnerHTML } from '../utils/dom.js';
import { sanitizeText } from '../utils/security.js';

// ============================================
// BUILDER PROFILE CONFIGURATION
// ============================================

const PROFILE_CONFIG = {
  // Animation
  animation: {
    fadeIn: 300,
  },
};

// ============================================
// BUILDER PROFILE COMPONENT
// ============================================

const BuilderProfile = {
  /**
   * Modal element
   */
  modal: null,

  /**
   * Backdrop element
   */
  backdrop: null,

  /**
   * Current username
   */
  currentUser: null,

  /**
   * Loading state
   */
  isLoading: false,

  /**
   * Open state
   */
  isOpen: false,

  /**
   * Initialize builder profile
   * @param {string|Element} containerSelector
   */
  init(containerSelector = 'body') {
    const container =
      typeof containerSelector === 'string' ? $(containerSelector) : containerSelector;

    if (!container) {
      console.warn('[BuilderProfile] Container not found');
      return;
    }

    // Create modal DOM
    this.createModal(container);

    // Bind events
    this.bindEvents();

    console.log('[BuilderProfile] Initialized');
  },

  /**
   * Create modal DOM
   * @param {Element} container
   */
  createModal(container) {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'builder-profile-backdrop';
    this.backdrop.style.display = 'none';
    container.appendChild(this.backdrop);

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'builder-profile-modal';
    this.modal.innerHTML = `
      <div class="builder-profile-card">
        <button class="profile-close" aria-label="Close">&times;</button>

        <div class="profile-loading">
          <div class="loading-spinner"></div>
          <span>Loading profile...</span>
        </div>

        <div class="profile-error" style="display: none;">
          <span class="error-icon">&#9888;</span>
          <span class="error-message">Failed to load profile</span>
        </div>

        <div class="profile-content" style="display: none;">
          <div class="profile-header">
            <img class="profile-avatar" src="" alt="" />
            <div class="profile-info">
              <h3 class="profile-name"></h3>
              <p class="profile-login">@<span class="login-text"></span></p>
              <p class="profile-bio"></p>
            </div>
          </div>

          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value repos-count">0</span>
              <span class="stat-label">Repos</span>
            </div>
            <div class="stat-item">
              <span class="stat-value followers-count">0</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="stat-item">
              <span class="stat-value following-count">0</span>
              <span class="stat-label">Following</span>
            </div>
          </div>

          <div class="profile-details">
            <div class="detail-item location" style="display: none;">
              <span class="detail-icon">&#128205;</span>
              <span class="detail-value"></span>
            </div>
            <div class="detail-item company" style="display: none;">
              <span class="detail-icon">&#127970;</span>
              <span class="detail-value"></span>
            </div>
            <div class="detail-item blog" style="display: none;">
              <span class="detail-icon">&#128279;</span>
              <a class="detail-value" href="" target="_blank" rel="noopener"></a>
            </div>
            <div class="detail-item twitter" style="display: none;">
              <span class="detail-icon">&#128038;</span>
              <a class="detail-value" href="" target="_blank" rel="noopener"></a>
            </div>
            <div class="detail-item joined">
              <span class="detail-icon">&#128197;</span>
              <span class="detail-value">Joined </span>
            </div>
          </div>

          <div class="profile-contributions">
            <h4>ASDF Contributions</h4>
            <div class="contributions-list"></div>
          </div>

          <div class="profile-actions">
            <a class="profile-btn primary" href="" target="_blank" rel="noopener">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    `;
    container.appendChild(this.modal);

    // Cache references
    this.loadingEl = $('.profile-loading', this.modal);
    this.errorEl = $('.profile-error', this.modal);
    this.contentEl = $('.profile-content', this.modal);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Close button
    const closeBtn = $('.profile-close', this.modal);
    if (closeBtn) {
      on(closeBtn, 'click', () => this.close());
    }

    // Backdrop click
    on(this.backdrop, 'click', () => this.close());

    // Listen for contributor clicks
    BuildState.subscribe('contributor:click', data => {
      if (data.login) {
        this.open(data.login);
      }
    });

    // Listen for builder profile request
    BuildState.subscribe('builder:view', data => {
      if (data.username) {
        this.open(data.username);
      }
    });

    // Keyboard
    on(document, 'keydown', e => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  /**
   * Open profile modal
   * @param {string} username
   */
  async open(username) {
    if (this.isLoading) return;

    this.currentUser = username;
    this.isOpen = true;
    this.backdrop.style.display = 'block';
    addClass(this.modal, 'open');

    // Show loading
    this.showLoading();

    // Fetch profile
    try {
      const profile = await this.fetchProfile(username);
      this.renderProfile(profile);
      this.hideLoading();
    } catch (error) {
      console.error('[BuilderProfile] Failed to load:', error);
      this.showError(error.message);
    }

    BuildState.emit('builder:opened', { username });
  },

  /**
   * Close profile modal
   */
  close() {
    this.isOpen = false;
    removeClass(this.modal, 'open');

    setTimeout(() => {
      this.backdrop.style.display = 'none';
    }, PROFILE_CONFIG.animation.fadeIn);

    BuildState.emit('builder:closed', {});
  },

  /**
   * Fetch GitHub profile via service
   * @param {string} username
   * @returns {Promise<Object>}
   */
  async fetchProfile(username) {
    const profileData = await GitHubApiService.getUserProfile(username);
    if (!profileData) {
      throw new Error('Profile not found');
    }
    return profileData;
  },

  /**
   * Render profile data
   * @param {Object} profile
   */
  renderProfile(profile) {
    // Avatar
    const avatar = $('.profile-avatar', this.contentEl);
    if (avatar) {
      avatar.src = profile.avatar_url;
      avatar.alt = profile.login;
    }

    // Name and login
    const name = $('.profile-name', this.contentEl);
    if (name) name.textContent = profile.name || profile.login;

    const login = $('.login-text', this.contentEl);
    if (login) login.textContent = profile.login;

    // Bio
    const bio = $('.profile-bio', this.contentEl);
    if (bio) {
      bio.textContent = profile.bio || 'No bio available';
      bio.style.display = profile.bio ? 'block' : 'none';
    }

    // Stats
    const repos = $('.repos-count', this.contentEl);
    if (repos) repos.textContent = profile.public_repos || 0;

    const followers = $('.followers-count', this.contentEl);
    if (followers) followers.textContent = profile.followers || 0;

    const following = $('.following-count', this.contentEl);
    if (following) following.textContent = profile.following || 0;

    // Location
    const locationItem = $('.detail-item.location', this.contentEl);
    if (locationItem) {
      if (profile.location) {
        locationItem.style.display = 'flex';
        $('.detail-value', locationItem).textContent = profile.location;
      } else {
        locationItem.style.display = 'none';
      }
    }

    // Company
    const companyItem = $('.detail-item.company', this.contentEl);
    if (companyItem) {
      if (profile.company) {
        companyItem.style.display = 'flex';
        $('.detail-value', companyItem).textContent = profile.company;
      } else {
        companyItem.style.display = 'none';
      }
    }

    // Blog
    const blogItem = $('.detail-item.blog', this.contentEl);
    if (blogItem) {
      if (profile.blog) {
        blogItem.style.display = 'flex';
        const link = $('a', blogItem);
        link.href = profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`;
        link.textContent = profile.blog.replace(/^https?:\/\//, '');
      } else {
        blogItem.style.display = 'none';
      }
    }

    // Twitter
    const twitterItem = $('.detail-item.twitter', this.contentEl);
    if (twitterItem) {
      if (profile.twitter_username) {
        twitterItem.style.display = 'flex';
        const link = $('a', twitterItem);
        link.href = `https://twitter.com/${profile.twitter_username}`;
        link.textContent = `@${profile.twitter_username}`;
      } else {
        twitterItem.style.display = 'none';
      }
    }

    // Joined date
    const joined = $('.detail-item.joined .detail-value', this.contentEl);
    if (joined && profile.created_at) {
      const date = new Date(profile.created_at);
      joined.textContent = `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }

    // GitHub link
    const githubBtn = $('.profile-btn.primary', this.contentEl);
    if (githubBtn) {
      githubBtn.href = profile.html_url;
    }

    // Render ASDF contributions
    this.renderContributions(profile.login);
  },

  /**
   * Render ASDF contributions
   * @param {string} username
   */
  async renderContributions(username) {
    const container = $('.contributions-list', this.contentEl);
    if (!container) return;

    // Check which projects this user has contributed to
    const contributions = [];

    // For now, show placeholder
    // In production, this would query the GitHub API for each project
    container.innerHTML = `
      <div class="contribution-item">
        <span class="contribution-project">ASDF-Web</span>
        <span class="contribution-count">Builder</span>
      </div>
    `;
  },

  /**
   * Show loading state
   */
  showLoading() {
    this.isLoading = true;
    if (this.loadingEl) this.loadingEl.style.display = 'flex';
    if (this.contentEl) this.contentEl.style.display = 'none';
    if (this.errorEl) this.errorEl.style.display = 'none';
  },

  /**
   * Hide loading state
   */
  hideLoading() {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.contentEl) this.contentEl.style.display = 'block';
  },

  /**
   * Show error state
   * @param {string} message
   */
  showError(message) {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.contentEl) this.contentEl.style.display = 'none';
    if (this.errorEl) {
      this.errorEl.style.display = 'flex';
      const msgEl = $('.error-message', this.errorEl);
      if (msgEl) msgEl.textContent = message || 'Failed to load profile';
    }
  },

  /**
   * Get modal element
   * @returns {Element}
   */
  getModal() {
    return this.modal;
  },

  /**
   * Dispose
   */
  dispose() {
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }

    this.modal = null;
    this.backdrop = null;
    this.currentUser = null;
    this.isOpen = false;
  },
};

// ============================================
// EXPORTS
// ============================================

export { BuilderProfile };
export default BuilderProfile;

// Global export
if (typeof window !== 'undefined') {
  window.BuilderProfile = BuilderProfile;
}
