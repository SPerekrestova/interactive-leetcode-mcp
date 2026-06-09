/**
 * Unit tests for the subprocess runner.
 *
 * These tests assume `python3` is available on PATH (the project's own
 * CI image already has it). The runner's own probe gates each test on
 * availability; a missing python3 produces a `LANGUAGE_RUNTIME_NOT_FOUND`
 * which is its own first-class assertion.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetSandboxCacheForTest } from "../../src/runner/sandbox.js";
import {
    SubprocessRunner,
    __resetProbeCacheForTest
} from "../../src/runner/subprocess-runner.js";
import {
    ErrorCode,
    isLeetCodeError,
    type RunnerLanguage
} from "../../src/types/index.js";

describe("SubprocessRunner", () => {
    let runner: SubprocessRunner;

    beforeEach(() => {
        // Force re-probing per test so mutations to PATH (none here, but
        // future tests may) don't leak between cases.
        __resetProbeCacheForTest();
        __resetSandboxCacheForTest();
        runner = new SubprocessRunner();
    });

    afterEach(() => {
        __resetProbeCacheForTest();
        __resetSandboxCacheForTest();
    });

    describe("capabilities", () => {
        it("reports python3 as a supported language", async () => {
            const caps = await runner.capabilities();
            const py = caps.languages.find((l) => l.language === "python3");
            expect(py).toBeDefined();
            // Don't assert availability — environments without python3
            // should still produce a coherent envelope.
            expect(typeof py?.available).toBe("boolean");
        });

        it("reports go and java as supported languages even before they are implemented", async () => {
            const caps = await runner.capabilities();
            const langs = caps.languages.map((l) => l.language).sort();
            expect(langs).toEqual(["go", "java", "python3"]);
        });

        it("includes a sandbox descriptor", async () => {
            const caps = await runner.capabilities();
            expect(caps.sandbox).toBeDefined();
            expect(["none", "bwrap", "firejail", "sandbox-exec"]).toContain(
                caps.sandbox.kind
            );
        });
    });

    describe("run", () => {
        it("executes a happy-path python script", async () => {
            const result = await runner.run({
                titleSlug: "two-sum",
                language: "python3",
                code: 'print("hello"); assert 1 + 1 == 2'
            });

            expect(result.passed).toBe(true);
            expect(result.exitCode).toBe(0);
            expect(result.timedOut).toBe(false);
            expect(result.stdout).toContain("hello");
            expect(result.stderr).toBe("");
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("captures non-zero exit code without throwing", async () => {
            const result = await runner.run({
                titleSlug: "two-sum",
                language: "python3",
                code: "raise SystemExit(7)"
            });

            expect(result.passed).toBe(false);
            expect(result.exitCode).toBe(7);
            expect(result.timedOut).toBe(false);
        });

        it("captures stderr from raised exceptions", async () => {
            const result = await runner.run({
                titleSlug: "two-sum",
                language: "python3",
                code: 'raise ValueError("boom")'
            });

            expect(result.passed).toBe(false);
            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).toContain("ValueError");
            expect(result.stderr).toContain("boom");
        });

        it("kills runaway processes after the timeout budget", async () => {
            const start = Date.now();
            const result = await runner.run({
                titleSlug: "two-sum",
                language: "python3",
                code: "while True: pass",
                timeoutMs: 400
            });
            const elapsed = Date.now() - start;

            expect(result.timedOut).toBe(true);
            expect(result.passed).toBe(false);
            // Tolerate slow CI: budget + the 500 ms SIGTERM-then-SIGKILL
            // grace + scheduler jitter. Should not run for full 5s.
            expect(elapsed).toBeLessThan(2_500);
        });

        it("rejects unsupported languages with RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE", async () => {
            await expect(async () => {
                await runner.run({
                    titleSlug: "two-sum",
                    language: "go" as RunnerLanguage,
                    code: 'package main\nfunc main() { println("hi") }'
                });
            }).rejects.toSatisfy((error: unknown) => {
                if (!isLeetCodeError(error)) {
                    return false;
                }
                return (
                    error.code === ErrorCode.RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE
                );
            });
        });

        it("forwards a clean env (no leaking secrets)", async () => {
            // Ask the child to print one of its env vars. We never set
            // SECRET_ON_PARENT in the child env, so it should print
            // empty even if defined on the parent.
            const before = process.env.SECRET_ON_PARENT;
            process.env.SECRET_ON_PARENT = "leak-me";
            try {
                const result = await runner.run({
                    titleSlug: "two-sum",
                    language: "python3",
                    code: 'import os; print(os.environ.get("SECRET_ON_PARENT", "MISSING"))'
                });

                expect(result.passed).toBe(true);
                expect(result.stdout.trim()).toBe("MISSING");
            } finally {
                if (before === undefined) {
                    delete process.env.SECRET_ON_PARENT;
                } else {
                    process.env.SECRET_ON_PARENT = before;
                }
            }
        });
    });
});
