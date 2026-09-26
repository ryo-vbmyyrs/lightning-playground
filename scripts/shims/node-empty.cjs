// Stand-in for Node built-ins (fs, os, module, ...) that @lwc/compiler's dependencies
// reference but never need for in-memory compilation. Any property access returns
// another no-op, so load-time feature checks don't crash in the browser.
const noop = new Proxy(function () {}, {
  get: (_target, key) => (key === '__esModule' ? false : noop),
  apply: () => undefined,
});
module.exports = noop;
