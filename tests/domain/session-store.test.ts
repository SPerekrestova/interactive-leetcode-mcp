import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSessionStore } from "../../src/domain/session-store.js";
import type { SessionState } from "../../src/types/index.js";

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

describe("FileSessionStore", () => {
    let dir: string;
    let store: FileSessionStore;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "leetcode-mcp-session-"));
        store = new FileSessionStore({ dir });
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("returns null for a slug that has never been saved", async () => {
        expect(await store.load("two-sum")).toBeNull();
    });

    it("round-trips a saved session through load()", async () => {
        const session = makeSession({ hintLevel: 2, attempts: 1 });
        await store.save(session);
        expect(await store.load("two-sum")).toEqual(session);
    });

    it("creates the sessions directory on save", async () => {
        const subdir = join(dir, "nested", "sessions");
        const subStore = new FileSessionStore({ dir: subdir });
        await subStore.save(makeSession());
        const info = await stat(subdir);
        expect(info.isDirectory()).toBe(true);
    });

    it("delete is idempotent — removing a missing session does not throw", async () => {
        await expect(store.delete("never-saved")).resolves.toBeUndefined();
    });

    it("delete removes a saved session", async () => {
        await store.save(makeSession());
        await store.delete("two-sum");
        expect(await store.load("two-sum")).toBeNull();
    });

    it("rejects slugs with path-traversal characters", () => {
        expect(() => store.pathFor("../etc/passwd")).toThrow(
            /Invalid session slug/
        );
        expect(() => store.pathFor("two_sum")).toThrow(/Invalid session slug/);
        expect(() => store.pathFor("Two-Sum")).toThrow(/Invalid session slug/);
    });

    it("returns null when the JSON file is malformed", async () => {
        // Write garbage to where load() will look.
        await writeFile(store.pathFor("two-sum"), "not json {", "utf-8");
        expect(await store.load("two-sum")).toBeNull();
    });
});
