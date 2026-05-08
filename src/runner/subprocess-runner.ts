/**
 * Plain-subprocess `LocalRunner` implementation.
 *
 * Per-language registry (currently `python3`) describes how to:
 *   - probe whether the runtime is available on PATH
 *   - spawn the runtime against a source file written to the run's
 *     temp dir
 *
 * Probes run lazily on the first `run()` for the language and the
 * results are cached for the lifetime of the process.
 *
 * Safety nets every run gets, even with no OS sandbox:
 *   - per-process wall-clock timeout (default 5_000 ms; configurable
 *     per `RunInput`)
 *   - clean env (just PATH / HOME / LANG forwarded — secrets in the
 *     user's shell never leak in)
 *   - cwd is a freshly-mkdtemp'd directory under the OS tmp; it is
 *     removed after the run regardless of outcome
 *   - stdout/stderr captured with a 1 MB ceiling; runaway output gets
 *     truncated with a marker rather than blowing memory
 */
import { execFile as execFileCb, spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

import type {
    RunInput,
    RunResult,
    RunnerCapabilities,
    RunnerLanguage,
    SandboxKind
} from "../types/index.js";
import { ErrorCode, LeetCodeError } from "../types/index.js";
import logger from "../utils/logger.js";
import type { LocalRunner } from "./runner.js";
import { IMPLEMENTED_LANGUAGES, SUPPORTED_LANGUAGES } from "./runner.js";
import { wrapWithSandbox } from "./sandbox.js";

// `execFile` (no shell) — never `promisify(exec)`, which routes through
// `/bin/sh -c` and is a shell-expansion foot-gun if anyone interpolates
// a dynamic value into a probe in the future.
const execFile = promisify(execFileCb);

const MAX_OUTPUT_BYTES = 1_000_000; // 1 MB per stream
const DEFAULT_TIMEOUT_MS = 5_000;
const TRUNCATION_MARKER = "\n[...output truncated at 1 MB...]";

interface LanguageSpec {
    /** File extension (without dot) used for the temp source file. */
    extension: string;
    /** `[binary, args]` to probe — exit code 0 means available. */
    probe: { cmd: string; args: string[] };
    /**
     * Build the spawn args given the path of the source file we wrote
     * for this run. Compiled languages (Go, Java) will hook in extra
     * compile steps via subclassing later.
     */
    buildArgs(sourcePath: string): { cmd: string; args: string[] };
}

const LANGUAGES: Record<RunnerLanguage, LanguageSpec> = {
    python3: {
        extension: "py",
        probe: { cmd: "python3", args: ["--version"] },
        buildArgs: (sourcePath) => ({
            cmd: "python3",
            args: [sourcePath]
        })
    },
    // Phase 4b/4c stubs — present in the registry so the type system
    // requires they stay in sync with `RunnerLanguage`. The runner
    // refuses to use these until we actually wire harnesses.
    go: {
        extension: "go",
        probe: { cmd: "go", args: ["version"] },
        buildArgs: () => {
            throw new LeetCodeError(
                ErrorCode.RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE,
                "Go runner ships in Phase 4b"
            );
        }
    },
    java: {
        extension: "java",
        probe: { cmd: "java", args: ["-version"] },
        buildArgs: () => {
            throw new LeetCodeError(
                ErrorCode.RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE,
                "Java runner ships in Phase 4c"
            );
        }
    }
};

interface ProbeResult {
    available: boolean;
    version?: string;
    path?: string;
}

const probeCache = new Map<RunnerLanguage, ProbeResult>();

async function probeLanguage(language: RunnerLanguage): Promise<ProbeResult> {
    const cached = probeCache.get(language);
    if (cached) {
        return cached;
    }
    const spec = LANGUAGES[language];
    try {
        const { stdout, stderr } = await execFile(
            spec.probe.cmd,
            spec.probe.args,
            { timeout: 2000 }
        );
        // `python3 --version` and `go version` write to stdout; `java
        // -version` historically writes to stderr — accept either.
        const versionLine = (stdout || stderr || "").split("\n")[0]?.trim();
        const result: ProbeResult = {
            available: true,
            version: versionLine || undefined
        };
        try {
            const { stdout: which } = await execFile(
                "which",
                [spec.probe.cmd],
                { timeout: 1000 }
            );
            result.path = which.trim() || undefined;
        } catch {
            /* `which` may not exist (Windows); leave `path` undefined */
        }
        probeCache.set(language, result);
        return result;
    } catch (error) {
        const result: ProbeResult = { available: false };
        probeCache.set(language, result);
        logger.debug(
            { language, error: (error as Error)?.message },
            "Language probe failed"
        );
        return result;
    }
}

/** Test helper — clears the probe cache so unit tests can re-detect. */
export function __resetProbeCacheForTest(): void {
    probeCache.clear();
}

function clampOutput(buf: Buffer): string {
    if (buf.length <= MAX_OUTPUT_BYTES) {
        return buf.toString("utf-8");
    }
    return (
        buf.subarray(0, MAX_OUTPUT_BYTES).toString("utf-8") + TRUNCATION_MARKER
    );
}

export class SubprocessRunner implements LocalRunner {
    async capabilities(): Promise<RunnerCapabilities> {
        const languages = await Promise.all(
            SUPPORTED_LANGUAGES.map(async (language) => {
                const probe = await probeLanguage(language);
                return {
                    language,
                    available: probe.available,
                    version: probe.version,
                    path: probe.path
                };
            })
        );
        // Sandbox detection is in `./sandbox.ts`; importing inline here
        // avoids a dependency cycle with `subprocess-runner` ↔ `sandbox`.
        const { detectSandbox } = await import("./sandbox.js");
        const detected = await detectSandbox();
        return {
            languages,
            sandbox: {
                kind: detected.kind,
                available: detected.kind !== "none"
            }
        };
    }

    async run(input: RunInput): Promise<RunResult> {
        if (!IMPLEMENTED_LANGUAGES.includes(input.language)) {
            throw new LeetCodeError(
                ErrorCode.RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE,
                `Local runner has no harness for ${input.language} yet`
            );
        }

        const probe = await probeLanguage(input.language);
        if (!probe.available) {
            throw new LeetCodeError(
                ErrorCode.LANGUAGE_RUNTIME_NOT_FOUND,
                `Required runtime for ${input.language} not found on PATH`
            );
        }

        const spec = LANGUAGES[input.language];
        const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const workDir = await mkdtemp(join(tmpdir(), "leetcode-mcp-run-"));
        const sourcePath = join(workDir, `solution.${spec.extension}`);

        try {
            await writeFile(sourcePath, input.code, "utf-8");
            const baseArgs = spec.buildArgs(sourcePath);
            const wrapped = await wrapWithSandbox(
                baseArgs.cmd,
                baseArgs.args,
                workDir
            );

            return await this.spawnAndCapture({
                cmd: wrapped.cmd,
                args: wrapped.args,
                cwd: workDir,
                timeoutMs,
                sandbox: wrapped.kind
            });
        } finally {
            await rm(workDir, { recursive: true, force: true }).catch(
                (error) => {
                    logger.debug(
                        { error: (error as Error)?.message, workDir },
                        "Failed to clean up runner workdir"
                    );
                }
            );
        }
    }

    private spawnAndCapture(options: {
        cmd: string;
        args: string[];
        cwd: string;
        timeoutMs: number;
        sandbox: SandboxKind;
    }): Promise<RunResult> {
        return new Promise((resolve) => {
            const start = performance.now();
            const child = spawn(options.cmd, options.args, {
                cwd: options.cwd,
                env: {
                    PATH: process.env.PATH ?? "",
                    HOME: options.cwd,
                    LANG: process.env.LANG ?? "C.UTF-8"
                },
                stdio: ["ignore", "pipe", "pipe"]
            });

            const stdout: Buffer[] = [];
            const stderr: Buffer[] = [];
            let stdoutBytes = 0;
            let stderrBytes = 0;
            let timedOut = false;
            let killTimer: NodeJS.Timeout | undefined;

            // Tight guard: never let the buffered total exceed
            // `MAX_OUTPUT_BYTES` even by a chunk. We slice the
            // overflowing chunk to the exact remaining headroom and
            // drop the rest. `clampOutput` still runs at finalize as a
            // belt-and-braces final cap.
            const captureChunk = (
                buffers: Buffer[],
                bytes: number,
                chunk: Buffer
            ): number => {
                const remaining = MAX_OUTPUT_BYTES - bytes;
                if (remaining <= 0) {
                    return bytes;
                }
                if (chunk.length <= remaining) {
                    buffers.push(chunk);
                    return bytes + chunk.length;
                }
                buffers.push(chunk.subarray(0, remaining));
                return bytes + remaining;
            };

            child.stdout?.on("data", (chunk: Buffer) => {
                stdoutBytes = captureChunk(stdout, stdoutBytes, chunk);
            });
            child.stderr?.on("data", (chunk: Buffer) => {
                stderrBytes = captureChunk(stderr, stderrBytes, chunk);
            });

            const timer = setTimeout(() => {
                timedOut = true;
                // SIGTERM first; if the child ignores it, hard SIGKILL
                // 500 ms later. Belt + braces for runaway loops.
                child.kill("SIGTERM");
                killTimer = setTimeout(() => child.kill("SIGKILL"), 500);
            }, options.timeoutMs);

            const finalize = (exitCode: number | null): void => {
                clearTimeout(timer);
                if (killTimer) {
                    clearTimeout(killTimer);
                }
                const durationMs = Math.round(performance.now() - start);
                const passed = !timedOut && exitCode === 0;
                resolve({
                    passed,
                    exitCode,
                    stdout: clampOutput(Buffer.concat(stdout)),
                    stderr: clampOutput(Buffer.concat(stderr)),
                    timedOut,
                    durationMs,
                    sandbox: options.sandbox,
                    warning:
                        options.sandbox === "none"
                            ? "No OS sandbox available on this host; ran without isolation."
                            : undefined
                });
            };

            child.on("close", (code, signal) => {
                if (signal && code === null) {
                    finalize(null);
                } else {
                    finalize(code);
                }
            });
            child.on("error", (error) => {
                logger.warn(
                    { error: error.message, cmd: options.cmd },
                    "Runner subprocess errored before exit"
                );
                clearTimeout(timer);
                if (killTimer) {
                    clearTimeout(killTimer);
                }
                resolve({
                    passed: false,
                    exitCode: null,
                    stdout: clampOutput(Buffer.concat(stdout)),
                    stderr:
                        clampOutput(Buffer.concat(stderr)) +
                        `\n[runner error: ${error.message}]`,
                    timedOut: false,
                    durationMs: Math.round(performance.now() - start),
                    sandbox: options.sandbox,
                    warning: undefined
                });
            });
        });
    }
}
