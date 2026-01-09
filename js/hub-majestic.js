/**
 * ASDF Hub Majestic - Interactive Controller
 * Handles entrance animations and magnetic tool interactions
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        entranceDelay: 100, // ms before starting entrance animation
        magneticRadius: 200, // px - radius of magnetic effect
        magneticStrength: 0.3, // 0-1 - how strongly tools react to cursor
        toolsExpandDelay: 150, // ms delay between each tool appearing
        toolsCollapseDelay: 300 // ms before tools collapse when leaving zone
    };

    // ============================================
    // DOM REFERENCES
    // ============================================

    const hubRadial = document.getElementById('hubRadial');
    const toolsZone = document.getElementById('toolsZone');
    const toolsTrigger = document.getElementById('toolsTrigger');
    const toolItems = document.querySelectorAll('.hub-tool-item');

    // ============================================
    // ENTRANCE ANIMATION
    // ============================================

    /**
     * Triggers the majestic entrance animation sequence
     */
    function initEntranceAnimation() {
        // Wait for DOM and fonts to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startEntrance);
        } else {
            startEntrance();
        }
    }

    function startEntrance() {
        // Small delay for polish
        setTimeout(() => {
            hubRadial.classList.remove('hub-entrance');
            hubRadial.classList.add('hub-animate');

            // After all animations complete, allow interactions
            setTimeout(() => {
                hubRadial.classList.add('hub-ready');
            }, 2550); // Total entrance duration
        }, CONFIG.entranceDelay);
    }

    // ============================================
    // TOOLS MAGNETIC/ORBITAL INTERACTION
    // ============================================

    let isToolsExpanded = false;
    let collapseTimeout = null;
    let magneticAnimationFrame = null;

    /**
     * Initialize tools zone interactions
     */
    function initToolsInteraction() {
        if (!toolsZone || !toolsTrigger) return;

        // Expand on hover/click
        toolsTrigger.addEventListener('mouseenter', expandTools);
        toolsTrigger.addEventListener('click', toggleTools);

        // Track mouse for magnetic effect
        toolsZone.addEventListener('mousemove', handleMagneticEffect);
        toolsZone.addEventListener('mouseleave', handleToolsLeave);

        // Touch support
        toolsTrigger.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleTools();
        }, { passive: false });
    }

    /**
     * Expand tools with staggered animation
     */
    function expandTools() {
        if (isToolsExpanded) return;

        clearTimeout(collapseTimeout);
        isToolsExpanded = true;
        toolsZone.classList.add('expanded');

        // Stagger tool appearances
        toolItems.forEach((item, index) => {
            item.style.transitionDelay = `${index * CONFIG.toolsExpandDelay}ms`;
        });
    }

    /**
     * Toggle tools expansion
     */
    function toggleTools() {
        if (isToolsExpanded) {
            collapseTools();
        } else {
            expandTools();
        }
    }

    /**
     * Collapse tools back to trigger
     */
    function collapseTools() {
        isToolsExpanded = false;
        toolsZone.classList.remove('expanded');

        // Reset transition delays
        toolItems.forEach(item => {
            item.style.transitionDelay = '0ms';
        });

        // Cancel magnetic animation
        if (magneticAnimationFrame) {
            cancelAnimationFrame(magneticAnimationFrame);
            magneticAnimationFrame = null;
        }

        // Reset tool positions
        resetToolPositions();
    }

    /**
     * Handle mouse leaving tools zone
     */
    function handleToolsLeave() {
        clearTimeout(collapseTimeout);
        collapseTimeout = setTimeout(() => {
            collapseTools();
        }, CONFIG.toolsCollapseDelay);
    }

    /**
     * Magnetic effect - tools react to cursor position
     */
    function handleMagneticEffect(e) {
        if (!isToolsExpanded) return;

        // Cancel previous frame
        if (magneticAnimationFrame) {
            cancelAnimationFrame(magneticAnimationFrame);
        }

        magneticAnimationFrame = requestAnimationFrame(() => {
            const rect = toolsZone.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            toolItems.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                const itemCenterX = itemRect.left + itemRect.width / 2;
                const itemCenterY = itemRect.top + itemRect.height / 2;

                // Calculate distance from mouse to item
                const dx = mouseX - itemCenterX;
                const dy = mouseY - itemCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Apply magnetic pull if within radius
                if (distance < CONFIG.magneticRadius) {
                    const force = (1 - distance / CONFIG.magneticRadius) * CONFIG.magneticStrength;
                    const pullX = dx * force;
                    const pullY = dy * force;

                    // Get base position from CSS custom property
                    const baseX = parseFloat(getComputedStyle(item).getPropertyValue('--expand-x')) || 0;
                    const baseY = parseFloat(getComputedStyle(item).getPropertyValue('--expand-y')) || 0;

                    // Apply magnetic offset
                    item.style.transform = `scale(1) translate(${baseX + pullX}px, ${baseY + pullY}px)`;
                } else {
                    resetToolPosition(item);
                }
            });
        });
    }

    /**
     * Reset individual tool position
     */
    function resetToolPosition(item) {
        const baseX = getComputedStyle(item).getPropertyValue('--expand-x');
        const baseY = getComputedStyle(item).getPropertyValue('--expand-y');
        item.style.transform = `scale(1) translate(${baseX}, ${baseY})`;
    }

    /**
     * Reset all tool positions
     */
    function resetToolPositions() {
        toolItems.forEach(item => {
            item.style.transform = '';
        });
    }

    // ============================================
    // PORTAL INTERACTIONS
    // ============================================

    /**
     * Initialize portal hover effects
     */
    function initPortalInteractions() {
        const portals = document.querySelectorAll('.hub-portal:not(.unavailable)');

        portals.forEach(portal => {
            // Add subtle glow follow effect
            portal.addEventListener('mousemove', (e) => {
                const rect = portal.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                portal.style.setProperty('--glow-x', `${x}%`);
                portal.style.setProperty('--glow-y', `${y}%`);
            });

            portal.addEventListener('mouseleave', () => {
                portal.style.removeProperty('--glow-x');
                portal.style.removeProperty('--glow-y');
            });
        });
    }

    // ============================================
    // AMBIENT EFFECTS
    // ============================================

    /**
     * Initialize subtle ambient effects
     */
    function initAmbientEffects() {
        // Parallax effect on background glow
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            const bg = document.querySelector('.hub-background');
            if (bg) {
                bg.style.setProperty('--parallax-x', `${x}px`);
                bg.style.setProperty('--parallax-y', `${y}px`);
            }
        });
    }

    // ============================================
    // ACCESSIBILITY
    // ============================================

    /**
     * Handle keyboard navigation
     */
    function initKeyboardNavigation() {
        // Allow Enter/Space on tools trigger
        if (toolsTrigger) {
            toolsTrigger.setAttribute('tabindex', '0');
            toolsTrigger.setAttribute('role', 'button');
            toolsTrigger.setAttribute('aria-expanded', 'false');
            toolsTrigger.setAttribute('aria-label', 'Expand tools menu');

            toolsTrigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTools();
                    toolsTrigger.setAttribute('aria-expanded', isToolsExpanded);
                }
            });
        }

        // ESC to collapse tools
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isToolsExpanded) {
                collapseTools();
                toolsTrigger?.focus();
            }
        });
    }

    // ============================================
    // REDUCED MOTION
    // ============================================

    /**
     * Check for reduced motion preference
     */
    function respectReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            // Skip entrance animation
            hubRadial?.classList.remove('hub-entrance');
            hubRadial?.classList.add('hub-ready');

            // Disable magnetic effect
            CONFIG.magneticStrength = 0;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        respectReducedMotion();
        initEntranceAnimation();
        initToolsInteraction();
        initPortalInteractions();
        initAmbientEffects();
        initKeyboardNavigation();
    }

    // Start
    init();

})();
