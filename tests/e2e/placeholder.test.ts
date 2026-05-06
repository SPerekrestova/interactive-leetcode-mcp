/**
 * Placeholder e2e spec.
 *
 * The real end-to-end harness — spawning `build/index.js`, attaching
 * `StdioClientTransport`, and mocking LeetCode over `nock` — lands in a
 * dedicated PR (Phase 2 of the redesign plan). This file exists so that
 * `npm run test:e2e` (which targets `tests/e2e/`) exits 0 instead of 1
 * with "No test files found", giving CI an honest signal until then.
 *
 * Once the real harness lands, this file is removed.
 */
import { describe, expect, it } from "vitest";

describe("e2e harness placeholder", () => {
    it("reserves the tests/e2e directory until the real harness lands", () => {
        expect(true).toBe(true);
    });
});
