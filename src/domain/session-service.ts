/**
 * Application-layer wrapper around the session store + state machine +
 * hint generator. Tools should depend on this, not on the lower-level
 * pieces directly — it's the seam that makes the gate uniform.
 */
import {
    ErrorCode,
    LeetCodeError,
    type HintLevel,
    type SessionState,
    type SimplifiedProblem
} from "../types/index.js";
import {
    advanceHint,
    assertSolutionUnlocked,
    resetSession
} from "./hint-state-machine.js";
import { generateHint } from "./pedagogy.js";
import { FileSessionStore, type SessionStore } from "./session-store.js";

export interface StartProblemInput {
    slug: string;
    language?: string;
}

export class SessionService {
    constructor(
        private readonly store: SessionStore = new FileSessionStore()
    ) {}

    /**
     * Returns the existing session for a slug, or creates a fresh
     * level-0 session if none exists. Idempotent: starting a problem the
     * user already started just returns the in-progress session
     * unchanged (so you don't lose hint progress by re-running
     * `start_problem`).
     */
    async startOrResume(input: StartProblemInput): Promise<SessionState> {
        const existing = await this.store.load(input.slug);
        if (existing) {
            // Update language only if the caller specified one and we
            // didn't have one before — never silently overwrite.
            if (input.language && !existing.language) {
                const updated: SessionState = {
                    ...existing,
                    language: input.language,
                    updatedAt: new Date().toISOString()
                };
                await this.store.save(updated);
                return updated;
            }
            return existing;
        }
        const now = new Date().toISOString();
        const fresh: SessionState = {
            slug: input.slug,
            language: input.language,
            hintLevel: 0,
            attempts: 0,
            lastLocalRunPassed: null,
            status: "started",
            createdAt: now,
            updatedAt: now
        };
        await this.store.save(fresh);
        return fresh;
    }

    /** Returns the session, or `null` if `start_problem` was never called. */
    async get(slug: string): Promise<SessionState | null> {
        return this.store.load(slug);
    }

    /**
     * Advances the hint level by one and returns the new session +
     * generated hint text. The text is produced from the supplied
     * problem so callers don't need to load it twice.
     *
     * Throws `SESSION_NOT_FOUND` if the user never opened the problem.
     */
    async advance(
        slug: string,
        problem: SimplifiedProblem
    ): Promise<{ session: SessionState; hint: string; level: HintLevel }> {
        const session = await this.requireSession(slug);
        const next = advanceHint(session);
        await this.store.save(next);
        const level = next.hintLevel;
        if (level === 0) {
            // Unreachable — advanceHint never returns 0 — but the type
            // narrows from HintLevel to 1..4 only with this guard.
            throw new LeetCodeError(
                ErrorCode.UPSTREAM_ERROR,
                "Hint level transition produced level 0"
            );
        }
        return {
            session: next,
            level,
            hint: generateHint(problem, level)
        };
    }

    /** Resets the session back to the level-0 initial state. */
    async reset(slug: string): Promise<SessionState> {
        const session = await this.requireSession(slug);
        const next = resetSession(session);
        await this.store.save(next);
        return next;
    }

    /**
     * Throws if the canonical solution is not yet unlocked for `slug`.
     * If `slug` is undefined, accepts the operation when *any* known
     * session has reached the maximum level — the only way for the
     * agent to obtain a `topicId` is via `list_problem_solutions`,
     * which IS slug-gated, so this is sufficient for the typical flow.
     */
    async assertSolutionUnlocked(slug?: string): Promise<void> {
        if (slug) {
            const session = await this.requireSession(slug);
            assertSolutionUnlocked(session);
            return;
        }
        // No slug provided. We can't enumerate sessions without a
        // discovery API on the store; defer to the caller to provide
        // slug context. This branch is reserved for future expansion.
        throw new LeetCodeError(
            ErrorCode.HINT_LEVEL_TOO_LOW,
            "Cannot determine session context without titleSlug. " +
                "Provide titleSlug to verify the session has reached the required hint level."
        );
    }

    private async requireSession(slug: string): Promise<SessionState> {
        const session = await this.store.load(slug);
        if (!session) {
            throw new LeetCodeError(
                ErrorCode.SESSION_NOT_FOUND,
                `No active session for "${slug}". Call start_problem first.`
            );
        }
        return session;
    }
}
