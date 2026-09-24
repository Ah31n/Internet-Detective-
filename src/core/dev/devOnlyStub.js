/**
 * Stands in for every developer-only module in a production bundle.
 *
 * Metro's resolver (see metro.config.js) redirects the QA console, the tool
 * registry, the inspectors, the canonical-solution loader, and the sealed
 * solution record to this file whenever the build is not a development build.
 * The real sources are never read, so nothing they contain — not a tool label,
 * not a line of the solution — can reach the binary.
 *
 * Nothing calls into this at runtime: every call site sits behind
 * `DEV_TOOLS_ENABLED`, which is false in exactly the builds where this
 * substitution happens. It exists so the import graph stays valid, not so it
 * can be used.
 */
module.exports = {};
