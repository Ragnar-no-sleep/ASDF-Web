/**
 * ASDF Games - Shared Interval Management
 *
 * Tracks and manages setInterval/setTimeout for proper cleanup
 */

'use strict';

const IntervalManager = {
    /**
     * Create an interval tracker for a game
     * @returns {Object} Interval manager instance
     */
    create() {
        const intervals = [];
        const timeouts = [];
        let animationFrameId = null;

        return {
            /**
             * Set an interval with automatic tracking
             * @param {Function} callback - Function to call
             * @param {number} delay - Delay in ms
             * @returns {number} Interval ID
             */
            setInterval(callback, delay) {
                const id = setInterval(callback, delay);
                intervals.push(id);
                return id;
            },

            /**
             * Set a timeout with automatic tracking
             * @param {Function} callback - Function to call
             * @param {number} delay - Delay in ms
             * @returns {number} Timeout ID
             */
            setTimeout(callback, delay) {
                const id = setTimeout(() => {
                    callback();
                    // Remove from tracking after execution
                    const index = timeouts.indexOf(id);
                    if (index > -1) timeouts.splice(index, 1);
                }, delay);
                timeouts.push(id);
                return id;
            },

            /**
             * Clear a specific interval
             * @param {number} id - Interval ID
             */
            clearInterval(id) {
                clearInterval(id);
                const index = intervals.indexOf(id);
                if (index > -1) intervals.splice(index, 1);
            },

            /**
             * Clear a specific timeout
             * @param {number} id - Timeout ID
             */
            clearTimeout(id) {
                clearTimeout(id);
                const index = timeouts.indexOf(id);
                if (index > -1) timeouts.splice(index, 1);
            },

            /**
             * Start an animation frame loop
             * @param {Function} callback - Frame callback
             */
            startAnimationLoop(callback) {
                const loop = () => {
                    if (callback() !== false) {
                        animationFrameId = requestAnimationFrame(loop);
                    }
                };
                animationFrameId = requestAnimationFrame(loop);
            },

            /**
             * Stop the animation frame loop
             */
            stopAnimationLoop() {
                if (animationFrameId !== null) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            },

            /**
             * Clear all intervals and timeouts
             */
            cleanup() {
                // Clear all intervals
                for (const id of intervals) {
                    clearInterval(id);
                }
                intervals.length = 0;

                // Clear all timeouts
                for (const id of timeouts) {
                    clearTimeout(id);
                }
                timeouts.length = 0;

                // Stop animation loop
                this.stopAnimationLoop();
            },

            /**
             * Get count of active intervals/timeouts
             * @returns {Object} Counts
             */
            getStats() {
                return {
                    intervals: intervals.length,
                    timeouts: timeouts.length,
                    hasAnimationLoop: animationFrameId !== null
                };
            }
        };
    }
};

// Export for module systems
if (typeof window !== 'undefined') {
    window.IntervalManager = IntervalManager;
}
