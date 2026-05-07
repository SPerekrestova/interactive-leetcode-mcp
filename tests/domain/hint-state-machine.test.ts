import { describe, expect, it } from "vitest";
import {
    SOLUTION_HINT_LEVEL,
    advanceHint,
    assertSolutionUnlocked,
    resetSession
} from "../../src/domain/hint-state-machine.js";
import {
    ErrorCode,
    LeetCodeError,
    type HintLevel,
    type SessionState
} from "../../src/types/index.js";

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
    return {
        slug: "two-sum",
        hintLevel: 0,
        attempts: 0,
        lastLocalRunPassed: null,
        status: "started",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        ...overrides
    };
}

describe("advanceHint", () => {
    it("bumps the hint level by one", () => {
        const next = advanceHint(makeSession({ hintLevel: 1 }));
        expect(next.hintLevel).toBe(2);
    });

    it("stamps updatedAt", () => {
        const before = makeSession();
        const next = advanceHint(before);
        expect(next.updatedAt).not.toBe(before.updatedAt);
    });

    it("does not mutate the input", () => {
        const before = makeSession({ hintLevel: 1 });
        advanceHint(before);
        expect(before.hintLevel).toBe(1);
    });

    it("clamps at the maximum level rather than overflowing", () => {
        const next = advanceHint(
            makeSession({ hintLevel: SOLUTION_HINT_LEVEL })
        );
        expect(next.hintLevel).toBe(SOLUTION_HINT_LEVEL);
    });
});

describe("resetSession", () => {
    it("returns to a level-0, started state", () => {
        const before = makeSession({
            hintLevel: 3,
            attempts: 5,
            lastLocalRunPassed: true,
            status: "attempting"
        });
        const next = resetSession(before);
        expect(next.hintLevel).toBe(0);
        expect(next.attempts).toBe(0);
        expect(next.lastLocalRunPassed).toBeNull();
        expect(next.status).toBe("started");
    });

    it("preserves slug / language / workspacePath", () => {
        const before = makeSession({
            language: "python3",
            workspacePath: "/tmp/two-sum.py",
            hintLevel: 4
        });
        const next = resetSession(before);
        expect(next.slug).toBe("two-sum");
        expect(next.language).toBe("python3");
        expect(next.workspacePath).toBe("/tmp/two-sum.py");
    });
});

describe("assertSolutionUnlocked", () => {
    it("does not throw when the session is at the maximum hint level", () => {
        expect(() =>
            assertSolutionUnlocked(
                makeSession({ hintLevel: SOLUTION_HINT_LEVEL })
            )
        ).not.toThrow();
    });

    it.each([0, 1, 2, 3] satisfies HintLevel[] as HintLevel[])(
        "throws HINT_LEVEL_TOO_LOW when the session is at level %d",
        (level) => {
            try {
                assertSolutionUnlocked(makeSession({ hintLevel: level }));
                throw new Error("did not throw");
            } catch (err) {
                expect(err).toBeInstanceOf(LeetCodeError);
                expect((err as LeetCodeError).code).toBe(
                    ErrorCode.HINT_LEVEL_TOO_LOW
                );
            }
        }
    );
});
