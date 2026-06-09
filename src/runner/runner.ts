/**
 * The local runner contract — implemented by `SubprocessRunner` for
 * production and easily faked in tests.
 *
 * Tools should depend on this interface, never on the concrete
 * implementation. Phase 4d will add an alternative implementation that
 * delegates to a stronger sandbox; Phase 5 will compose this with the
 * workspace abstraction.
 */
import type {
    RunInput,
    RunResult,
    RunnerCapabilities,
    RunnerLanguage
} from "../types/index.js";

export interface LocalRunner {
    /** Runs the user's code; returns the result envelope (never throws on user-code failures). */
    run(input: RunInput): Promise<RunResult>;
    /** Snapshot of what the runner detected on this host — drives the `doctor` command. */
    capabilities(): Promise<RunnerCapabilities>;
}

/**
 * Languages the runner currently knows about. Used by the tool layer
 * for early validation before spawning anything.
 */
export const SUPPORTED_LANGUAGES: readonly RunnerLanguage[] = [
    "python3",
    "go",
    "java"
] as const;

/**
 * The languages this build of the runner has *implemented*. Phase 4a
 * ships `python3` only. Phase 4b/4c grow this list.
 *
 * Kept distinct from `SUPPORTED_LANGUAGES` so the wire-level
 * `RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE` error has a single source of
 * truth: anything in `SUPPORTED_LANGUAGES` but not in this list is a
 * "coming soon" language.
 */
export const IMPLEMENTED_LANGUAGES: readonly RunnerLanguage[] = [
    "python3"
] as const;
