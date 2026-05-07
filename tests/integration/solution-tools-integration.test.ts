/**
 * Solution Tools Integration Tests
 *
 * Validates wire-level behaviour of `list_problem_solutions` and
 * `get_problem_solution` through the MCP protocol — including the
 * pedagogy gate added in Phase 3 (rejection with `HINT_LEVEL_TOO_LOW`
 * when the active session has not reached the maximum hint level).
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionService } from "../../src/domain/session-service.js";
import { FileSessionStore } from "../../src/domain/session-store.js";
import { registerSolutionTools } from "../../src/mcp/tools/solution-tools.js";
import type { SessionState } from "../../src/types/index.js";
import { ErrorCode, MAX_HINT_LEVEL } from "../../src/types/index.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Solution Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;
    let sessions: SessionService;
    let sessionDir: string;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();
        // Sessions live in a per-test temp dir so specs don't leak state.
        sessionDir = await mkdtemp(join(tmpdir(), "leetcode-mcp-itest-"));
        sessions = new SessionService(
            new FileSessionStore({ dir: sessionDir })
        );

        testClient = await createTestClient({}, (server) => {
            registerSolutionTools(server, mockService as any, sessions);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
        await rm(sessionDir, { recursive: true, force: true });
    });

    /**
     * Helper — drops a session for `slug` at the given level into the
     * store. Bypasses `start_problem` so the gate can be tested in
     * isolation.
     */
    async function seedSession(
        slug: string,
        hintLevel: number = MAX_HINT_LEVEL
    ): Promise<void> {
        const now = new Date().toISOString();
        const session: SessionState = {
            slug,
            hintLevel: hintLevel as SessionState["hintLevel"],
            attempts: 0,
            lastLocalRunPassed: null,
            status: "started",
            createdAt: now,
            updatedAt: now
        };
        const store = new FileSessionStore({ dir: sessionDir });
        await store.save(session);
    }

    describe("list_problem_solutions", () => {
        it(
            "should list list_problem_solutions tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "list_problem_solutions"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("solution");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should reject when no session has reached the unlock level",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "list_problem_solutions",
                    arguments: { questionSlug: "two-sum", limit: 5 }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.code).toBe(ErrorCode.SESSION_NOT_FOUND);
                expect(
                    mockService.fetchQuestionSolutionArticles
                ).not.toHaveBeenCalled();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should reject when session is below the unlock level",
            async () => {
                await seedSession("two-sum", 2);

                const result: any = await testClient.client.callTool({
                    name: "list_problem_solutions",
                    arguments: { questionSlug: "two-sum", limit: 5 }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.code).toBe(ErrorCode.HINT_LEVEL_TOO_LOW);
                expect(
                    mockService.fetchQuestionSolutionArticles
                ).not.toHaveBeenCalled();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute list_problem_solutions when session is at unlock level",
            async () => {
                await seedSession("two-sum");

                const result: any = await testClient.client.callTool({
                    name: "list_problem_solutions",
                    arguments: { questionSlug: "two-sum", limit: 5 }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchQuestionSolutionArticles
                ).toHaveBeenCalledWith("two-sum", {
                    limit: 5,
                    skip: undefined,
                    orderBy: undefined,
                    userInput: undefined,
                    tagSlugs: []
                });
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should handle list_problem_solutions with filters",
            async () => {
                await seedSession("two-sum");

                const result: any = await testClient.client.callTool({
                    name: "list_problem_solutions",
                    arguments: {
                        questionSlug: "two-sum",
                        orderBy: "MOST_VOTES",
                        tagSlugs: ["python", "dynamic-programming"]
                    }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchQuestionSolutionArticles
                ).toHaveBeenCalledWith("two-sum", {
                    limit: 10,
                    skip: undefined,
                    orderBy: "MOST_VOTES",
                    userInput: undefined,
                    tagSlugs: ["python", "dynamic-programming"]
                });
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_problem_solution", () => {
        it(
            "should list get_problem_solution tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "get_problem_solution"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("solution");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should reject when titleSlug session is below unlock level",
            async () => {
                await seedSession("two-sum", 3);

                const result: any = await testClient.client.callTool({
                    name: "get_problem_solution",
                    arguments: { topicId: "12345", titleSlug: "two-sum" }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.code).toBe(ErrorCode.HINT_LEVEL_TOO_LOW);
                expect(
                    mockService.fetchSolutionArticleDetail
                ).not.toHaveBeenCalled();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_problem_solution when session is unlocked",
            async () => {
                await seedSession("two-sum");

                const result: any = await testClient.client.callTool({
                    name: "get_problem_solution",
                    arguments: { topicId: "12345", titleSlug: "two-sum" }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchSolutionArticleDetail
                ).toHaveBeenCalledWith("12345");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
