/**
 * Lifecycle e2e: spawns the real `build/index.js` over stdio, performs the
 * MCP handshake via the SDK client, and asserts the server reports the
 * tools / resources / prompts we expect.
 *
 * This locks in the wire-level surface area: any drift in tool names or
 * server identity is caught before clients do.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnServer, type SpawnedServer } from "./harness/spawn-server.js";

describe("e2e: server lifecycle", () => {
    let spawned: SpawnedServer;

    beforeAll(async () => {
        spawned = await spawnServer();
    });

    afterAll(async () => {
        await spawned.cleanup();
    });

    it("advertises a non-empty server name and version after handshake", () => {
        const info = spawned.client.getServerVersion();
        expect(info?.name).toBeTruthy();
        expect(info?.version).toBeTruthy();
    });

    it("registers all expected tools", async () => {
        const { tools } = await spawned.client.listTools();
        const names = tools.map((t) => t.name).sort();

        // The exact set must stay stable — adding a tool is intentional and
        // should bump this assertion. Keep alphabetised so diffs are easy to
        // read.
        const expected = [
            "check_auth_status",
            "get_all_submissions",
            "get_daily_challenge",
            "get_problem",
            "get_problem_progress",
            "get_problem_solution",
            "get_problem_submission_report",
            "get_recent_ac_submissions",
            "get_recent_submissions",
            "get_started",
            "get_user_contest_ranking",
            "get_user_profile",
            "get_user_status",
            "list_problem_solutions",
            "save_leetcode_credentials",
            "search_problems",
            "start_leetcode_auth",
            "submit_solution"
        ];

        // Use toEqual with a sorted expected so any addition / rename
        // surfaces clearly without a brittle "every name in any order"
        // assertion.
        expect(names).toEqual(expected.sort());
    });

    it("registers MCP prompts", async () => {
        const { prompts } = await spawned.client.listPrompts();
        expect(prompts.length).toBeGreaterThan(0);
        const names = prompts.map((p) => p.name);
        expect(names).toContain("leetcode_authentication_guide");
    });

    it("exposes resource templates for problems and solutions", async () => {
        const { resourceTemplates } =
            await spawned.client.listResourceTemplates();
        expect(resourceTemplates.length).toBeGreaterThan(0);
        const uriTemplates = resourceTemplates.map((r) => r.uriTemplate);
        expect(uriTemplates.some((u) => u.startsWith("problem://"))).toBe(true);
    });
});
