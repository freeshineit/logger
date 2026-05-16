/**
 * Jest setup file for @skax/logger tests.
 *
 * Runs before each test suite to ensure a clean jsdom environment.
 */

// Ensure console methods are available in jsdom (they should be by default,
// but this guarantees consistent behavior across Node versions).
if (typeof console.error === "undefined") {
  (console as unknown as Record<string, unknown>).error = () => {};
}
if (typeof console.warn === "undefined") {
  (console as unknown as Record<string, unknown>).warn = () => {};
}
if (typeof console.info === "undefined") {
  (console as unknown as Record<string, unknown>).info = () => {};
}
if (typeof console.debug === "undefined") {
  (console as unknown as Record<string, unknown>).debug = () => {};
}
if (typeof console.group === "undefined") {
  (console as unknown as Record<string, unknown>).group = () => {};
}
if (typeof console.groupEnd === "undefined") {
  (console as unknown as Record<string, unknown>).groupEnd = () => {};
}
