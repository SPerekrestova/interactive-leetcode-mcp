/**
 * Test harness for spawning the LeetCode MCP server as a real child process
 * over stdio and connecting an MCP client to it.
 *
 * Each spawn:
 *   - Runs the freshly built `build/index.js` binary (via `node`).
 *   - Gets its own isolated `HOME` (a fresh `mkdtemp`) so the credentials
 *     store at `~/.leetcode-mcp/credentials.json` is per-test, never leaks
 *     between specs, and never touches the developer's real home.
 *   - Uses `NODE_OPTIONS="--import preload.mjs"` to activate `nock` inside
 *     the child before any application code runs, so all LeetCode HTTP is
 *     served from a JSON fixture instead of the real internet.
 *
 * The harness returns an MCP `Client` already wired to the child plus the
 * directory acting as `HOME` so tests can pre-seed credentials, and a
 * `cleanup()` to close the client and remove the temp directory.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { E2EFixture } from "./types.js";

const HARNESS_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(HARNESS_DIR, "..", "..", "..");
const SERVER_BIN = join(REPO_ROOT, "build", "index.js");
const PRELOAD = join(HARNESS_DIR, "preload.mjs");

export interface SpawnOptions {
    /**
     * LeetCode HTTP responses to serve back to the child via nock. If
     * omitted, nock is still activated (so the child can't reach the real
     * leetcode.com), but no interceptors are installed — useful for
     * lifecycle / negative-path specs that don't drive an authenticated
     * tool.
     */
    fixture?: E2EFixture;
    /**
     * Reuse an existing directory as the child's `HOME` instead of letting
     * the harness mkdtemp a fresh one. The caller is responsible for
     * cleanup of any home it provides; the harness only removes homes it
     * created itself.
     *
     * Useful for specs that need to pre-seed `~/.leetcode-mcp/...` before
     * the server boots (e.g., the auth-restore regression).
     */
    home?: string;
    /**
     * Extra environment variables to pass to the child. Merged on top of
     * the harness-controlled ones (`HOME`, `NODE_OPTIONS`,
     * `E2E_FIXTURE_PATH`).
     */
    env?: Record<string, string>;
}

export interface SpawnedServer {
    /** Connected MCP `Client` ready to call tools / list / etc. */
    client: Client;
    /** Temp directory acting as the child's `HOME`. */
    home: string;
    /** Tear down the client transport and remove the temp directory. */
    cleanup: () => Promise<void>;
}

/**
 * Spawns `build/index.js` as a child process with isolated `HOME` and
 * preloaded nock, and returns an MCP client connected over stdio.
 */
export async function spawnServer(
    options: SpawnOptions = {}
): Promise<SpawnedServer> {
    const homeWasProvided = options.home !== undefined;
    const home =
        options.home ?? (await mkdtemp(join(tmpdir(), "leetcode-mcp-e2e-")));

    // Fixtures live in their own temp directory regardless of who owns
    // `HOME`, so a caller-provided `HOME` never gets a stray
    // `fixture.json` byproduct. The harness owns the fixture dir and
    // always cleans it up.
    let fixtureDir: string | undefined;
    let fixturePath: string | undefined;
    if (options.fixture) {
        fixtureDir = await mkdtemp(join(tmpdir(), "leetcode-mcp-e2e-fix-"));
        fixturePath = join(fixtureDir, "fixture.json");
        await writeFile(fixturePath, JSON.stringify(options.fixture), "utf-8");
    }

    const env: Record<string, string> = {
        // Pass through the bare minimum from the parent so node can find
        // node_modules and the test runner's cwd matches the repo root.
        PATH: process.env.PATH ?? "",
        HOME: home,
        // `pathToFileURL` percent-encodes path segments so the preload
        // import works even when the harness path contains spaces or
        // other URL-reserved characters (common on macOS user dirs).
        NODE_OPTIONS: `--import ${pathToFileURL(PRELOAD).href}`,
        ...(fixturePath ? { E2E_FIXTURE_PATH: fixturePath } : {}),
        ...(options.env ?? {})
    };

    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [SERVER_BIN],
        env,
        cwd: REPO_ROOT,
        // Forward stderr so the test runner surfaces server logs / nock
        // errors when things go wrong.
        stderr: "inherit"
    });

    const client = new Client({
        name: "leetcode-mcp-e2e",
        version: "0.0.0"
    });
    await client.connect(transport);

    const cleanup = async () => {
        try {
            await client.close();
        } catch {
            // Already closed — ignore.
        }
        if (!homeWasProvided) {
            await rm(home, { recursive: true, force: true });
        }
        if (fixtureDir) {
            await rm(fixtureDir, { recursive: true, force: true });
        }
    };

    return { client, home, cleanup };
}
