/**
 * Turbopack loader: inline a .yml/.yaml file as a raw string module.
 *
 * Turbopack's built-in `type: 'raw'` emits a non-ECMAScript asset, which
 * `require.context` (see lib/events.ts and lib/speakers.ts) cannot place into
 * an ESM chunk. Emitting a real JS module instead keeps both the static
 * imports and the require.context globs working.
 *
 * Paired with `as: '*.js'` in next.config.ts so Turbopack treats the output
 * as JavaScript.
 */
module.exports = function yamlRawLoader(source) {
  return `export default ${JSON.stringify(source)};\n`;
};
