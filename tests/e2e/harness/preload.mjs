/**
 * Preload script that runs inside the spawned MCP server child process before
 * any user code.
 *
 * Registered via `NODE_OPTIONS="--import .../preload.mjs"`. Its job is to:
 *
 *   1. Activate `nock`, blocking the child from making any real network
 *      requests to leetcode.com (the e2e suite must never depend on the
 *      live LeetCode service being reachable or behaving consistently).
 *   2. Read fixture data from a JSON file whose path is provided via the
 *      `E2E_FIXTURE_PATH` env var, and install nock interceptors that
 *      replay the canned GraphQL / REST responses back to the server.
 *
 * The fixture format is the {@link E2EFixture} type from `./types.ts`. Tests
 * write a JSON file describing the LeetCode responses they want, point the
 * child at it via env, and then drive the server through StdioClientTransport.
 *
 * If `E2E_FIXTURE_PATH` is not set, this preload is a no-op apart from
 * disabling network — useful for lifecycle tests that don't touch LeetCode.
 */
import nock from "nock";
import { readFileSync } from "node:fs";

nock.disableNetConnect();

const fixturePath = process.env.E2E_FIXTURE_PATH;
if (fixturePath) {
    /** @type {import("./types.ts").E2EFixture} */
    let fixture;
    try {
        fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
    } catch (error) {
        // If the fixture file is malformed, fail loudly rather than silently
        // letting the server hit `nock.disableNetConnect` and produce a
        // confusing "Nock: Disallowed net connect" error mid-test.
        process.stderr.write(
            `[e2e preload] Failed to read fixture at ${fixturePath}: ${error}\n`
        );
        process.exit(1);
    }

    for (const entry of fixture.graphql ?? []) {
        // `.persist()` is a Scope method (must be called before the
        // interceptor is constructed); `.times()` is an Interceptor method.
        // Default to persist so a single fixture entry can serve multiple
        // calls to the same operation without callers tracking counts.
        const scope = nock("https://leetcode.com");
        if (entry.times === undefined) {
            scope.persist();
        }
        const interceptor = scope.post(
            "/graphql",
            (body) =>
                typeof body?.query === "string" &&
                body.query.includes(entry.operationContains)
        );
        if (entry.times !== undefined) {
            interceptor.times(entry.times);
        }
        interceptor.reply(entry.status ?? 200, entry.response);
    }

    for (const entry of fixture.rest ?? []) {
        const scope = nock("https://leetcode.com");
        if (entry.times === undefined) {
            scope.persist();
        }
        const interceptor =
            entry.method === "GET"
                ? scope.get(entry.path)
                : scope.post(entry.path);
        if (entry.times !== undefined) {
            interceptor.times(entry.times);
        }
        interceptor.reply(entry.status ?? 200, entry.response);
    }
}
