/**
 * Unit tests for SessionService methods that don't already have
 * coverage via the e2e/integration suites — primarily the Phase 4
 * additions (`requireSession`, `recordLocalRun`).
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionService } from "../../src/domain/session-service.js";
import { FileSessionStore } from "../../src/domain/session-store.js";
import { ErrorCode, isLeetCodeError } from "../../src/types/index.js";

describe("SessionService — Phase 4 additions", () => {
    let dir: string;
    let service: SessionService;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "leetcode-mcp-svc-"));
        service = new SessionService(new FileSessionStore({ dir }));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    describe("requireSession", () => {
        it("returns the session when present", async () => {
            const session = await service.startOrResume({ slug: "two-sum" });
            const fetched = await service.requireSession("two-sum");
            expect(fetched.slug).toBe(session.slug);
        });

        it("throws SESSION_NOT_FOUND when no session exists", async () => {
            await expect(async () => {
                await service.requireSession("never-opened");
            }).rejects.toSatisfy(
                (error: unknown) =>
                    isLeetCodeError(error) &&
                    error.code === ErrorCode.SESSION_NOT_FOUND
            );
        });
    });

    describe("recordLocalRun", () => {
        it("increments attempts and stores lastLocalRunPassed", async () => {
            await service.startOrResume({ slug: "two-sum" });

            const after1 = await service.recordLocalRun("two-sum", false);
            expect(after1.attempts).toBe(1);
            expect(after1.lastLocalRunPassed).toBe(false);
            expect(after1.status).toBe("attempting");

            const after2 = await service.recordLocalRun("two-sum", true);
            expect(after2.attempts).toBe(2);
            expect(after2.lastLocalRunPassed).toBe(true);
            // Status should not regress from "attempting".
            expect(after2.status).toBe("attempting");
        });

        it("persists across service instances", async () => {
            await service.startOrResume({ slug: "two-sum" });
            await service.recordLocalRun("two-sum", true);

            // Reload from disk via a fresh service.
            const reloaded = new SessionService(new FileSessionStore({ dir }));
            const session = await reloaded.requireSession("two-sum");
            expect(session.attempts).toBe(1);
            expect(session.lastLocalRunPassed).toBe(true);
        });

        it("throws SESSION_NOT_FOUND when no session exists", async () => {
            await expect(async () => {
                await service.recordLocalRun("never-opened", true);
            }).rejects.toSatisfy(
                (error: unknown) =>
                    isLeetCodeError(error) &&
                    error.code === ErrorCode.SESSION_NOT_FOUND
            );
        });
    });
});
