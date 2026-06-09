import { afterEach, describe, expect, it } from "vitest";
import {
    __resetSandboxCacheForTest,
    __setSandboxCacheForTest,
    wrapWithSandbox
} from "../../src/runner/sandbox.js";

describe("sandbox wrapping", () => {
    afterEach(() => {
        __resetSandboxCacheForTest();
    });

    it("escapes sandbox-exec subpath strings", async () => {
        __setSandboxCacheForTest({ kind: "sandbox-exec" });

        const wrapped = await wrapWithSandbox(
            "python3",
            ["solution.py"],
            String.raw`/tmp/leetcode-mcp-run-\with-"quotes"`
        );

        expect(wrapped.cmd).toBe("/usr/bin/sandbox-exec");
        expect(wrapped.args[1]).toContain(
            String.raw`(subpath "/tmp/leetcode-mcp-run-\\with-\"quotes\"")`
        );
    });

    it("rejects sandbox-exec subpaths containing newlines", async () => {
        __setSandboxCacheForTest({ kind: "sandbox-exec" });

        await expect(async () => {
            await wrapWithSandbox("python3", ["solution.py"], "/tmp/bad\npath");
        }).rejects.toThrow("cannot contain newlines");
    });
});
