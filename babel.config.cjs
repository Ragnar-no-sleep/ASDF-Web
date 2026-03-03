/**
 * Babel config — used ONLY by Jest to transform ES modules to CJS.
 * Browser code is served as-is (no bundler, no build step).
 */
module.exports = {
  env: {
    test: {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
