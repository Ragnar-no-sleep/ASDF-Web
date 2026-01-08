/**
 * ASDF ARCADE HUB - Minimal
 * Card navigation only
 */

(function() {
    'use strict';

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    }

    function setup() {
        const cards = document.querySelectorAll('.arcade-card');

        cards.forEach(card => {
            card.addEventListener('click', () => {
                // Don't navigate if not available
                if (card.classList.contains('not-available')) {
                    return;
                }

                const target = card.dataset.hubView;
                if (target && window.Hub && typeof window.Hub.navigateTo === 'function') {
                    window.Hub.navigateTo(target);
                } else if (target) {
                    window.location.hash = target;
                }
            });
        });

        console.log('[ArcadeHub] Ready');
    }

    init();
})();
