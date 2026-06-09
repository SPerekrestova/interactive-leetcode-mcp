import { defineConfig } from "vitest/config";

/**
 * Dedicated config for the e2e suite.
 *
 * - Only includes `tests/e2e/**` so the slow spawn-the-binary specs don't
 *   run alongside the fast unit / integration suites.
 * - Wires in `global-setup.ts` so `build/index.js` is guaranteed to exist
 *   and be at least as fresh as `src/` before any spec spawns the server.
 * - 30s test timeout because spawning a Node child process plus an MCP
 *   handshake comfortably exceeds the 5s integration default.
 */
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/e2e/**/*.test.ts"],
        globals: true,
        globalSetup: ["tests/e2e/harness/global-setup.ts"],
        testTimeout: 30_000,
        hookTimeout: 30_000
    }
});
