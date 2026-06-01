/**
 * Wire types for the local code runner introduced in Phase 4.
 *
 * The runner is intentionally simple: callers hand it a string of code
 * plus a language tag, and get back a result envelope describing what the
 * subprocess did. There is no per-problem harness logic at this layer —
 * harnesses live one floor up, in `src/runner/harnesses/*`, and inject
 * test scaffolding into the source before it reaches the runner.
 */

/**
 * Languages the local runner knows how to execute.
 *
 * Phase 4a ships `python3` only; Phase 4b/4c add `go` and `java`. Other
 * LeetCode languages remain valid for `submit_solution` but
 * `run_local_tests` will reject them with
 * `RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE`.
 */
export type RunnerLanguage = "python3" | "go" | "java";

/**
 * What the runner detected when it tried to spawn an isolated subprocess.
 *
 * - `none`     — plain subprocess, no OS-level sandbox (always available)
 * - `bwrap`    — Linux: bubblewrap with read-only fs + writable tmp + no net
 * - `firejail` — Linux fallback when bwrap isn't installed
 * - `sandbox-exec` — macOS: built-in `sandbox-exec` profile
 *
 * Reported alongside every `RunResult` so callers can show "ran in
 * bwrap sandbox" without parsing logs.
 */
export type SandboxKind = "none" | "bwrap" | "firejail" | "sandbox-exec";

export interface RunInput {
    /**
     * LeetCode problem slug. Used by the tool layer to look up the
     * active session and update `lastLocalRunPassed`. Not consumed by
     * the runner itself.
     */
    titleSlug: string;
    /** Language to run as. */
    language: RunnerLanguage;
    /**
     * Source code to execute, exactly as the runner should receive it.
     * The harness layer is responsible for any wrapping, scaffolding, or
     * test-driver injection before this string is built.
     */
    code: string;
    /**
     * Wall-clock budget in milliseconds. Defaults to 5_000 if omitted.
     * The runner kills the subprocess when this elapses and returns
     * `timedOut: true` with whatever partial output was captured.
     */
    timeoutMs?: number;
}

export interface RunResult {
    /** Convenience flag: `exitCode === 0 && !timedOut`. */
    passed: boolean;
    /** Subprocess exit code, or `null` when the process was killed. */
    exitCode: number | null;
    /** Captured stdout, truncated to ~1 MB. */
    stdout: string;
    /** Captured stderr, truncated to ~1 MB. */
    stderr: string;
    /** Whether the wall-clock budget was hit. */
    timedOut: boolean;
    /** Wall-clock time the subprocess ran for, in milliseconds. */
    durationMs: number;
    /** Which sandbox (if any) was used. See {@link SandboxKind}. */
    sandbox: SandboxKind;
    /**
     * Human-readable note when something interesting happened that the
     * caller should know about — e.g. "no OS sandbox available on this
     * host; ran without isolation". Omitted on the happy path.
     */
    warning?: string;
}

/** Capability snapshot the `doctor` subcommand renders to the user. */
export interface RunnerCapabilities {
    /** What languages have a working runtime detected on PATH. */
    languages: Array<{
        language: RunnerLanguage;
        available: boolean;
        version?: string;
        path?: string;
    }>;
    /** Sandbox tooling available on this host, in priority order. */
    sandbox: {
        kind: SandboxKind;
        available: boolean;
    };
}
