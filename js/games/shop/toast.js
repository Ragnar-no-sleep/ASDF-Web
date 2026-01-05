/**
 * ASDF Shop V2 - Toast Notification System
 *
 * Reusable toast notifications with various styles and animations
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// TOAST MANAGER
// ============================================

const Toast = {
    // Container element
    container: null,

    // Active toasts
    toasts: [],

    // Configuration
    config: {
        position: 'top-right',
        duration: 4000,
        maxToasts: 5,
        pauseOnHover: true
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize toast system
     */
    init() {
        if (this.container) return;

        // Create container
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(this.container);

        console.log('[Toast] Initialized');
    },

    /**
     * Ensure initialization
     */
    ensureInit() {
        if (!this.container) {
            this.init();
        }
    },

    // ============================================
    // TOAST METHODS
    // ============================================

    /**
     * Show a toast notification
     * @param {Object|string} options - Toast options or message string
     * @returns {Object} Toast instance
     */
    show(options) {
        this.ensureInit();

        // Handle string shorthand
        if (typeof options === 'string') {
            options = { message: options };
        }

        const toast = {
            id: Date.now() + Math.random(),
            type: options.type || 'info',
            title: options.title || null,
            message: options.message || '',
            duration: options.duration ?? this.config.duration,
            icon: options.icon || this.getIcon(options.type || 'info'),
            item: options.item || null, // For item preview
            actions: options.actions || null,
            onClose: options.onClose || null,
            element: null,
            timeout: null,
            pausedAt: null
        };

        // Enforce max toasts
        while (this.toasts.length >= this.config.maxToasts) {
            this.close(this.toasts[0].id);
        }

        // Create element
        toast.element = this.createToastElement(toast);
        this.container.appendChild(toast.element);
        this.toasts.push(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.element.classList.add('show');
        });

        // Setup auto-close
        if (toast.duration > 0) {
            toast.timeout = setTimeout(() => {
                this.close(toast.id);
            }, toast.duration);
        }

        // Pause on hover
        if (this.config.pauseOnHover && toast.duration > 0) {
            toast.element.addEventListener('mouseenter', () => {
                this.pauseToast(toast);
            });
            toast.element.addEventListener('mouseleave', () => {
                this.resumeToast(toast);
            });
        }

        return toast;
    },

    /**
     * Create toast DOM element
     * @param {Object} toast - Toast object
     * @returns {HTMLElement} Toast element
     */
    createToastElement(toast) {
        const el = document.createElement('div');
        el.className = `toast ${toast.type}`;
        el.setAttribute('role', 'alert');
        el.setAttribute('data-toast-id', toast.id);

        let content = '';

        // Icon
        content += `<span class="toast-icon">${this.escapeHtml(toast.icon)}</span>`;

        // Content
        content += '<div class="toast-content">';
        if (toast.title) {
            content += `<div class="toast-title">${this.escapeHtml(toast.title)}</div>`;
        }
        content += `<div class="toast-message">${this.escapeHtml(toast.message)}</div>`;
        content += '</div>';

        // Item preview (for purchases, etc.)
        if (toast.item) {
            const itemHtml = `
                <div class="toast-item">
                    ${toast.item.image ? `<img src="${this.escapeHtml(toast.item.image)}" alt="" class="toast-item-image">` : ''}
                    <div class="toast-item-info">
                        <div class="toast-item-name">${this.escapeHtml(toast.item.name)}</div>
                        ${toast.item.tier ? `<div class="toast-item-tier">${this.escapeHtml(toast.item.tier)}</div>` : ''}
                    </div>
                </div>
            `;
            content = content.replace('</div></div>', `${itemHtml}</div></div>`);
        }

        // Close button
        content += '<button class="toast-close" aria-label="Close">&times;</button>';

        // Actions
        if (toast.actions && toast.actions.length > 0) {
            content += '<div class="toast-actions">';
            toast.actions.forEach((action, index) => {
                content += `<button class="toast-action-btn" data-action="${index}">${this.escapeHtml(action.label)}</button>`;
            });
            content += '</div>';
        }

        el.innerHTML = content;

        // Bind close button
        el.querySelector('.toast-close').addEventListener('click', () => {
            this.close(toast.id);
        });

        // Bind action buttons
        if (toast.actions) {
            el.querySelectorAll('.toast-action-btn').forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    if (toast.actions[index].onClick) {
                        toast.actions[index].onClick();
                    }
                    if (toast.actions[index].closeOnClick !== false) {
                        this.close(toast.id);
                    }
                });
            });
        }

        return el;
    },

    /**
     * Close a toast
     * @param {string|number} id - Toast ID
     */
    close(id) {
        const index = this.toasts.findIndex(t => t.id === id);
        if (index === -1) return;

        const toast = this.toasts[index];

        // Clear timeout
        if (toast.timeout) {
            clearTimeout(toast.timeout);
        }

        // Animate out
        toast.element.classList.remove('show');

        // Remove after animation
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            if (toast.onClose) {
                toast.onClose();
            }
        }, 300);

        // Remove from array
        this.toasts.splice(index, 1);
    },

    /**
     * Close all toasts
     */
    closeAll() {
        [...this.toasts].forEach(toast => {
            this.close(toast.id);
        });
    },

    /**
     * Pause a toast timer
     */
    pauseToast(toast) {
        if (toast.timeout) {
            clearTimeout(toast.timeout);
            toast.pausedAt = Date.now();
        }
    },

    /**
     * Resume a toast timer
     */
    resumeToast(toast) {
        if (toast.pausedAt && toast.duration) {
            const remaining = toast.duration - (toast.pausedAt - (Date.now() - toast.duration));
            toast.timeout = setTimeout(() => {
                this.close(toast.id);
            }, Math.max(remaining, 1000));
            toast.pausedAt = null;
        }
    },

    // ============================================
    // CONVENIENCE METHODS
    // ============================================

    /**
     * Show success toast
     */
    success(message, options = {}) {
        return this.show({ ...options, message, type: 'success', title: options.title || 'Success' });
    },

    /**
     * Show error toast
     */
    error(message, options = {}) {
        return this.show({ ...options, message, type: 'error', title: options.title || 'Error', duration: options.duration ?? 6000 });
    },

    /**
     * Show warning toast
     */
    warning(message, options = {}) {
        return this.show({ ...options, message, type: 'warning', title: options.title || 'Warning' });
    },

    /**
     * Show info toast
     */
    info(message, options = {}) {
        return this.show({ ...options, message, type: 'info' });
    },

    /**
     * Show purchase success toast
     */
    purchaseSuccess(item) {
        return this.show({
            type: 'success',
            title: 'Purchase Complete!',
            message: `You now own ${item.name}`,
            item: {
                name: item.name,
                image: item.asset_url || item.image,
                tier: item.tierName
            },
            duration: 5000
        });
    },

    /**
     * Show achievement unlocked toast
     */
    achievement(achievement) {
        return this.show({
            type: 'success',
            title: 'Achievement Unlocked!',
            message: achievement.name,
            icon: achievement.icon || '🏆',
            duration: 5000
        });
    },

    /**
     * Show collection complete toast
     */
    collectionComplete(collection) {
        return this.show({
            type: 'success',
            title: 'Collection Complete!',
            message: `${collection.name} - Bonus unlocked!`,
            icon: collection.icon || '📚',
            duration: 6000
        });
    },

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Get icon for toast type
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    /**
     * Escape HTML
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }
};

// Auto-init when DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Toast.init());
    } else {
        Toast.init();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Toast };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.Toast = Toast;
}
