/**
 * Share Button Component
 * Social sharing for achievements, streaks, and progress
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { addClass, removeClass } from '../utils/dom.js';
import { sanitizeText } from '../utils/security.js';

// ============================================
// CONFIGURATION
// ============================================

const SHARE_CONFIG = {
  baseUrl: 'https://alonisthe.dev',
  hashtags: ['ASDF', 'Web3', 'Solana', 'BuildInPublic'],
  via: 'asdf_ecosystem',
};

// ============================================
// SHARE TEMPLATES
// ============================================

const SHARE_TEMPLATES = {
  streak: data => ({
    title: `${data.streak}-Day Learning Streak!`,
    text: `I'm on a ${data.streak}-day learning streak on ASDF! Building Web3 skills one day at a time.`,
    url: `${SHARE_CONFIG.baseUrl}/build?ref=streak`,
    image: `/images/share/streak-${Math.min(data.streak, 30)}.png`,
  }),

  levelUp: data => ({
    title: `Level ${data.level} Builder!`,
    text: `Just reached Level ${data.level} (${data.rank}) on ASDF! ${data.totalXP.toLocaleString()} XP earned.`,
    url: `${SHARE_CONFIG.baseUrl}/build?ref=level`,
    image: `/images/share/level-${data.level}.png`,
  }),

  badge: data => ({
    title: `Earned: ${data.badge.name}`,
    text: `Just earned the "${data.badge.name}" badge on ASDF! ${data.badge.description}`,
    url: `${SHARE_CONFIG.baseUrl}/build?ref=badge`,
    image: data.badge.image || `/images/badges/${data.badge.id}.png`,
  }),

  module: data => ({
    title: `Completed: ${data.module.name}`,
    text: `Just completed "${data.module.name}" on ASDF! Learning Web3 development.`,
    url: `${SHARE_CONFIG.baseUrl}/build?ref=module`,
    image: `/images/share/module-complete.png`,
  }),

  milestone: data => ({
    title: `${data.milestone} Milestone!`,
    text: `Hit a ${data.milestone} milestone on my Web3 learning journey with ASDF!`,
    url: `${SHARE_CONFIG.baseUrl}/build?ref=milestone`,
    image: `/images/share/milestone.png`,
  }),
};

// ============================================
// SHARE BUTTON COMPONENT
// ============================================

const ShareButton = {
  /**
   * Initialize share button component
   */
  init() {
    this.bindEvents();
    console.log('[ShareButton] Initialized');
  },

  /**
   * Bind to achievement events
   */
  bindEvents() {
    // Show share prompt on streak milestones
    BuildState.subscribe('streak:milestone', data => {
      this.promptShare('streak', data);
    });

    // Show share on badge earned
    if (typeof window !== 'undefined') {
      window.addEventListener('badge:earned', e => {
        if (e.detail) {
          this.promptShare('badge', e.detail);
        }
      });

      window.addEventListener('xp:levelup', e => {
        if (e.detail) {
          this.promptShare('levelUp', e.detail);
        }
      });
    }
  },

  /**
   * Prompt user to share achievement
   * @param {string} type - Share type
   * @param {Object} data - Data for template
   */
  promptShare(type, data) {
    const template = SHARE_TEMPLATES[type];
    if (!template) return;

    const content = template(data);
    this.showShareModal(content);
  },

  /**
   * Show share modal
   * @param {Object} content - Share content
   */
  showShareModal(content) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Share achievement');

    modal.innerHTML = `
      <div class="share-modal__backdrop"></div>
      <div class="share-modal__content">
        <button class="share-modal__close" aria-label="Close">&times;</button>
        <div class="share-modal__header">
          <h3 class="share-modal__title">Share Your Achievement!</h3>
        </div>
        <div class="share-modal__preview">
          <div class="share-preview-card">
            <div class="share-preview-card__title">${sanitizeText(content.title)}</div>
            <div class="share-preview-card__text">${sanitizeText(content.text)}</div>
          </div>
        </div>
        <div class="share-modal__buttons">
          <button class="share-btn share-btn--twitter" data-platform="twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Twitter/X</span>
          </button>
          <button class="share-btn share-btn--copy" data-platform="copy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy Link</span>
          </button>
          <button class="share-btn share-btn--native" data-platform="native">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>More</span>
          </button>
        </div>
        <button class="share-modal__skip">Maybe later</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind events
    const close = modal.querySelector('.share-modal__close');
    const skip = modal.querySelector('.share-modal__skip');
    const backdrop = modal.querySelector('.share-modal__backdrop');
    const buttons = modal.querySelectorAll('.share-btn');

    const closeModal = () => {
      removeClass(modal, 'share-modal--visible');
      setTimeout(() => modal.remove(), 300);
    };

    close.addEventListener('click', closeModal);
    skip.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.dataset.platform;
        this.share(platform, content);
        closeModal();
      });
    });

    // Animate in
    requestAnimationFrame(() => {
      addClass(modal, 'share-modal--visible');
    });
  },

  /**
   * Share to platform
   * @param {string} platform - Platform name
   * @param {Object} content - Share content
   */
  share(platform, content) {
    switch (platform) {
      case 'twitter':
        this.shareTwitter(content);
        break;
      case 'copy':
        this.copyLink(content);
        break;
      case 'native':
        this.nativeShare(content);
        break;
    }

    // Track share
    BuildState.emit('share:completed', {
      platform,
      type: content.type,
      url: content.url,
    });
  },

  /**
   * Share to Twitter/X
   * @param {Object} content
   */
  shareTwitter(content) {
    const text = encodeURIComponent(content.text);
    const url = encodeURIComponent(content.url);
    const hashtags = encodeURIComponent(SHARE_CONFIG.hashtags.join(','));
    const via = encodeURIComponent(SHARE_CONFIG.via);

    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}&via=${via}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  },

  /**
   * Copy link to clipboard
   * @param {Object} content
   */
  async copyLink(content) {
    try {
      await navigator.clipboard.writeText(content.url);
      this.showToast('Link copied!');
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = content.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      this.showToast('Link copied!');
    }
  },

  /**
   * Use native share API
   * @param {Object} content
   */
  async nativeShare(content) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[ShareButton] Native share failed:', err);
        }
      }
    } else {
      // Fallback to copy
      this.copyLink(content);
    }
  },

  /**
   * Show toast notification
   * @param {string} message
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      addClass(toast, 'share-toast--visible');
    });

    setTimeout(() => {
      removeClass(toast, 'share-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  },

  /**
   * Manually trigger share for specific content
   * @param {string} type - Share type
   * @param {Object} data - Data for template
   */
  trigger(type, data) {
    this.promptShare(type, data);
  },
};

export { ShareButton };
export default ShareButton;

// Global export
if (typeof window !== 'undefined') {
  window.ShareButton = ShareButton;
}
