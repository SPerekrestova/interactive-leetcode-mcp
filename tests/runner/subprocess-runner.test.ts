/**
 * Unit tests for the subprocess runner.
 *
 * These tests assume `python3` is available on PATH (the project's own
 * CI image already has it). The runner's own probe gates each test on
 * availability; a missing python3 produces a `LANGUAGE_RUNTIME_NOT_FOUND`
 * which is its own first-class assertion.
 */
import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    __resetSandboxCacheForTest,
    __setSandboxCacheForTest
} from "../../src/runner/sandbox.js";
import {
    SubprocessRunner,
    __resetProbeCacheForTest
} from "../../src/runner/subprocess-runner.js";
import {
    ErrorCode,
    isLeetCodeError,
    type RunnerLanguage
} from "../../src/types/index.js";

function runtimeAvailable(cmd: string, args: string[]): boolean {
    try {
        execFileSync(cmd, args, { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

const GO_PRESENT = runtimeAvailable("go", ["version"]);

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

        it("reports all supported local-runner languages", async () => {
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

        it.skipIf(!GO_PRESENT)(
            "executes a happy-path Go program",
            async () => {
                const result = await runner.run({
                    titleSlug: "two-sum",
                    language: "go",
                    code: [
                        "package main",
                        'import "fmt"',
                        "func main() {",
                        '    fmt.Println("hello from go")',
                        '    if 1 + 1 != 2 { panic("bad math") }',
                        "}"
                    ].join("\n")
                });

                expect(result.passed).toBe(true);
                expect(result.exitCode).toBe(0);
                expect(result.timedOut).toBe(false);
                expect(result.stdout).toContain("hello from go");
                expect(result.stderr).toBe("");
            },
            30_000
        );

        it("reuses a stable Go build cache across runs", async () => {
            __setSandboxCacheForTest({ kind: "none" });
            const fakeBin = await mkdtemp(join(tmpdir(), "fake-go-bin-"));
            const fakeGo = join(fakeBin, "go");
            const originalPath = process.env.PATH;
            const script = [
                "#!/usr/bin/env node",
                'if (process.argv[2] === "version") {',
                '  console.log("go version go1.test linux/amd64");',
                "} else {",
                "  console.log(JSON.stringify({",
                "    home: process.env.HOME,",
                "    gocache: process.env.GOCACHE,",
                "    gomodcache: process.env.GOMODCACHE",
                "  }));",
                "}"
            ].join("\n");

            try {
                await writeFile(fakeGo, script, "utf-8");
                await chmod(fakeGo, 0o755);
                process.env.PATH = `${fakeBin}${delimiter}${originalPath ?? ""}`;
                __resetProbeCacheForTest();

                const first = await runner.run({
                    titleSlug: "two-sum",
                    language: "go",
                    code: "package main\nfunc main() {}"
                });
                const second = await runner.run({
                    titleSlug: "two-sum",
                    language: "go",
                    code: "package main\nfunc main() {}"
                });

                const firstEnv = JSON.parse(first.stdout);
                const secondEnv = JSON.parse(second.stdout);
                expect(firstEnv.home).not.toBe(secondEnv.home);
                expect(firstEnv.gocache).toBe(secondEnv.gocache);
                expect(firstEnv.gomodcache).toBe(secondEnv.gomodcache);
                expect(firstEnv.gocache).toContain("leetcode-mcp-go-");
                expect(firstEnv.gomodcache).toContain("leetcode-mcp-go-");
            } finally {
                process.env.PATH = originalPath;
                __resetProbeCacheForTest();
                await rm(fakeBin, { recursive: true, force: true });
            }
        });

        it.skipIf(GO_PRESENT)(
            "reports LANGUAGE_RUNTIME_NOT_FOUND when Go is unavailable",
            async () => {
                await expect(async () => {
                    await runner.run({
                        titleSlug: "two-sum",
                        language: "go",
                        code: "package main\nfunc main() {}"
                    });
                }).rejects.toSatisfy((error: unknown) => {
                    if (!isLeetCodeError(error)) {
                        return false;
                    }
                    return error.code === ErrorCode.LANGUAGE_RUNTIME_NOT_FOUND;
                });
            }
        );

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

        it("rejects still-unimplemented languages with RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE", async () => {
            await expect(async () => {
                await runner.run({
                    titleSlug: "two-sum",
                    language: "java" as RunnerLanguage,
                    code: "public class Solution {}"
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
