/**
 * Cosmetics Button Handler
 * Opens the shop from Pump Arena modal
 */
(function() {
    'use strict';

    function init() {
        const openShopBtn = document.getElementById('open-shop-btn');
        if (openShopBtn) {
            openShopBtn.addEventListener('click', function() {
                if (window.Hub) {
                    window.Hub.navigateTo('shop');
                    // Close the modal
                    const modal = document.getElementById('modal-pumparena');
                    if (modal) modal.classList.remove('active');
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
