/**
 * ASDF Games - Shared Input Management
 *
 * Handles keyboard, mouse, and touch input with cleanup
 */

'use strict';

const InputManager = {
    /**
     * Create an input handler for a game
     * @param {Object} config - Input configuration
     * @returns {Object} Input state and cleanup function
     */
    create(config = {}) {
        const state = {
            keys: {},
            mouse: { x: 0, y: 0, down: false },
            touch: { x: 0, y: 0, active: false }
        };

        const listeners = [];

        // Keyboard handlers
        if (config.keyboard !== false) {
            const keyDown = (e) => {
                state.keys[e.key.toLowerCase()] = true;
                if (config.onKeyDown) {
                    config.onKeyDown(e, state);
                }
            };

            const keyUp = (e) => {
                state.keys[e.key.toLowerCase()] = false;
                if (config.onKeyUp) {
                    config.onKeyUp(e, state);
                }
            };

            document.addEventListener('keydown', keyDown);
            document.addEventListener('keyup', keyUp);
            listeners.push(
                { target: document, event: 'keydown', handler: keyDown },
                { target: document, event: 'keyup', handler: keyUp }
            );
        }

        // Mouse handlers
        if (config.canvas && config.mouse !== false) {
            const canvas = config.canvas;

            const mouseMove = (e) => {
                const rect = canvas.getBoundingClientRect();
                state.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
                state.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
                if (config.onMouseMove) {
                    config.onMouseMove(e, state);
                }
            };

            const mouseDown = (e) => {
                state.mouse.down = true;
                if (config.onMouseDown) {
                    config.onMouseDown(e, state);
                }
            };

            const mouseUp = (e) => {
                state.mouse.down = false;
                if (config.onMouseUp) {
                    config.onMouseUp(e, state);
                }
            };

            const click = (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                if (config.onClick) {
                    config.onClick(x, y, e, state);
                }
            };

            canvas.addEventListener('mousemove', mouseMove);
            canvas.addEventListener('mousedown', mouseDown);
            canvas.addEventListener('mouseup', mouseUp);
            canvas.addEventListener('click', click);
            listeners.push(
                { target: canvas, event: 'mousemove', handler: mouseMove },
                { target: canvas, event: 'mousedown', handler: mouseDown },
                { target: canvas, event: 'mouseup', handler: mouseUp },
                { target: canvas, event: 'click', handler: click }
            );
        }

        // Touch handlers
        if (config.canvas && config.touch !== false) {
            const canvas = config.canvas;

            const touchStart = (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touch = e.touches[0];
                state.touch.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                state.touch.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                state.touch.active = true;
                if (config.onTouchStart) {
                    config.onTouchStart(e, state);
                }
            };

            const touchMove = (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const touch = e.touches[0];
                state.touch.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                state.touch.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                if (config.onTouchMove) {
                    config.onTouchMove(e, state);
                }
            };

            const touchEnd = (e) => {
                state.touch.active = false;
                if (config.onTouchEnd) {
                    config.onTouchEnd(e, state);
                }
            };

            canvas.addEventListener('touchstart', touchStart, { passive: false });
            canvas.addEventListener('touchmove', touchMove, { passive: false });
            canvas.addEventListener('touchend', touchEnd);
            listeners.push(
                { target: canvas, event: 'touchstart', handler: touchStart, options: { passive: false } },
                { target: canvas, event: 'touchmove', handler: touchMove, options: { passive: false } },
                { target: canvas, event: 'touchend', handler: touchEnd }
            );
        }

        return {
            state,

            /**
             * Check if a key is pressed (supports QZSD/Arrow mapping)
             * @param {string} action - Action name (left, right, up, down)
             * @returns {boolean} True if key is pressed
             */
            isPressed(action) {
                switch (action) {
                    case 'left':
                        return state.keys['q'] || state.keys['arrowleft'] || state.keys['a'];
                    case 'right':
                        return state.keys['d'] || state.keys['arrowright'];
                    case 'up':
                        return state.keys['z'] || state.keys['arrowup'] || state.keys['w'];
                    case 'down':
                        return state.keys['s'] || state.keys['arrowdown'];
                    case 'shoot':
                        return state.keys[' '] || state.keys['space'];
                    default:
                        return state.keys[action] || false;
                }
            },

            /**
             * Cleanup all event listeners
             */
            cleanup() {
                for (const { target, event, handler, options } of listeners) {
                    target.removeEventListener(event, handler, options);
                }
                listeners.length = 0;
            }
        };
    }
};

// Export for module systems
if (typeof window !== 'undefined') {
    window.InputManager = InputManager;
}
