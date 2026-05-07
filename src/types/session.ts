/**
 * Per-problem session state — the durable record the pedagogy state machine
 * reads and writes.
 *
 * One file per problem slug under `~/.leetcode-mcp/sessions/<slug>.json`.
 * Persisted across restarts so the user can step away from a problem and
 * resume at the same hint level / attempt count later.
 */

/**
 * Discrete hint progression. Higher values strictly subsume lower ones —
 * a session at level 4 has access to everything level 1 unlocked.
 *
 * - **0** Initial state after `start_problem`. No hints, no solutions.
 * - **1** Clarification — restate the problem in the user's own words,
 *   surface invariants and edge cases. No algorithmic direction yet.
 * - **2** Approach — high-level paradigm or data structure to consider
 *   ("what lookup is O(1)?"). No code, no pseudocode.
 * - **3** Implementation sketch — pseudocode-level structure of a working
 *   solution. Still does not unlock the canonical full solution.
 * - **4** Optimal — the canonical full solution and the community
 *   solutions tools (`get_problem_solution`, `list_problem_solutions`)
 *   become callable.
 */
export type HintLevel = 0 | 1 | 2 | 3 | 4;

export const MAX_HINT_LEVEL = 4 as const;

/**
 * Lifecycle of a per-problem session. The state machine moves through
 * these labels as the user (or agent) drives `start_problem` →
 * `request_hint` ↔ `submit_solution` → `solved`.
 */
export type SessionStatus = "started" | "attempting" | "solved" | "abandoned";

export interface SessionState {
    /** LeetCode problem slug (matches `Problem.titleSlug`). */
    slug: string;
    /** Language the user is solving in, when `start_problem` is given one. */
    language?: string;
    /** Current hint level. Bumped by `request_hint`. */
    hintLevel: HintLevel;
    /** Total submission attempts the session has driven so far. */
    attempts: number;
    /**
     * Outcome of the most recent local-runner invocation. `null` until the
     * user runs locally for the first time. Wired by Phase 4 (local
     * runner); kept here so Phase 3 sets the contract.
     */
    lastLocalRunPassed: boolean | null;
    /** Lifecycle label — see {@link SessionStatus}. */
    status: SessionStatus;
    /**
     * Absolute path of the workspace file `start_problem` created for the
     * user, if any. Workspace awareness lands in Phase 5; this field is
     * already part of the contract so the file shape is stable.
     */
    workspacePath?: string;
    /** ISO-8601 of session creation. */
    createdAt: string;
    /** ISO-8601 of the most recent state transition. */
    updatedAt: string;
}
