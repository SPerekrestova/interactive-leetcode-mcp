/**
 * Shared types for the e2e harness fixtures.
 *
 * The fixture file is the contract between the parent test process (which
 * authors the fixture) and the spawned MCP server child process (which reads
 * the fixture via the `preload.mjs` script and replays it through nock).
 *
 * Keep this module dependency-free so it can be imported by both vitest
 * specs and the lightweight preload script without dragging in the rest of
 * the codebase.
 */

export interface MockGraphqlResponse {
    /** Match request body where `body.query` includes this substring. */
    operationContains: string;
    /** Response payload (will be JSON-stringified into the response body). */
    response: unknown;
    /** HTTP status to return. Defaults to 200. */
    status?: number;
    /** How many times this interceptor should fire. Defaults to Infinity. */
    times?: number;
}

export interface MockRestEndpoint {
    /** HTTP method, e.g. "POST" or "GET". */
    method: "GET" | "POST";
    /** URL path on `https://leetcode.com`, e.g. "/problems/two-sum/submit/". */
    path: string;
    /** Response payload. */
    response: unknown;
    /** HTTP status to return. Defaults to 200. */
    status?: number;
    /** How many times this interceptor should fire. Defaults to Infinity. */
    times?: number;
}

export interface E2EFixture {
    /** GraphQL operations on https://leetcode.com/graphql. */
    graphql?: MockGraphqlResponse[];
    /** REST endpoints on https://leetcode.com (submit / check / etc). */
    rest?: MockRestEndpoint[];
}
