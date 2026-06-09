/**
 * Per-problem session persistence: one JSON file per slug under
 * `~/.leetcode-mcp/sessions/<slug>.json`.
 *
 * The store is intentionally minimal — no migrations, no schemas — because
 * the data is local and rebuildable. If a file is unreadable or malformed
 * we treat it as "no session" and let the caller create a fresh one.
 */
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { SessionState } from "../types/index.js";
import logger from "../utils/logger.js";

/**
 * Slugs come from the LeetCode URL and are already filesystem-safe in
 * practice, but defend against a malicious / typo'd input that could
 * traverse the sessions directory.
 */
function assertSafeSlug(slug: string): void {
    if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new Error(
            `Invalid session slug: ${JSON.stringify(slug)}. ` +
                `Expected lowercase alphanumeric and hyphens only.`
        );
    }
}

export interface SessionStore {
    /** Resolves to the saved session, or `null` if none exists / is unreadable. */
    load(slug: string): Promise<SessionState | null>;
    /** Persists the session, creating the sessions directory if needed. */
    save(session: SessionState): Promise<void>;
    /** Removes the file. Idempotent — missing file is not an error. */
    delete(slug: string): Promise<void>;
    /** Absolute path of the file backing a given slug. */
    pathFor(slug: string): string;
}

export interface FileSessionStoreOptions {
    /**
     * Override the directory the store writes to. Defaults to
     * `${homedir()}/.leetcode-mcp/sessions`. Tests pass a temp directory.
     */
    dir?: string;
}

/**
 * Default filesystem-backed implementation. Writes are atomic-ish — same
 * pattern as `credentialsStorage`: write JSON, mode 0o600 (sessions are
 * not secrets but neither are they other-readable by intent).
 */
export class FileSessionStore implements SessionStore {
    private readonly dir: string;

    constructor(options: FileSessionStoreOptions = {}) {
        this.dir = options.dir ?? join(homedir(), ".leetcode-mcp", "sessions");
    }

    pathFor(slug: string): string {
        assertSafeSlug(slug);
        return resolve(this.dir, `${slug}.json`);
    }

    async load(slug: string): Promise<SessionState | null> {
        const path = this.pathFor(slug);
        try {
            await stat(path);
        } catch {
            return null;
        }
        try {
            const raw = await readFile(path, "utf-8");
            return JSON.parse(raw) as SessionState;
        } catch (err) {
            // Corrupt session file is recoverable — log and return null so
            // the caller can rebuild from `start_problem`.
            logger.warn(
                "Discarding malformed session file %s: %s",
                path,
                err instanceof Error ? err.message : String(err)
            );
            return null;
        }
    }

    async save(session: SessionState): Promise<void> {
        const path = this.pathFor(session.slug);
        await mkdir(this.dir, { recursive: true, mode: 0o700 });
        await writeFile(path, JSON.stringify(session, null, 2), {
            encoding: "utf-8",
            mode: 0o600
        });
    }

    async delete(slug: string): Promise<void> {
        const path = this.pathFor(slug);
        await rm(path, { force: true });
    }
}
