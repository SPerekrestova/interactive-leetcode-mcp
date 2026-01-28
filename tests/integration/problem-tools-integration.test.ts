/**
 * Problem Tools Integration Tests
 * Tests all problem-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerProblemTools } from "../../src/mcp/tools/problem-tools.js";
import {
    createMockFailingService,
    createMockLeetCodeService
} from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Problem Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();

        testClient = await createTestClient({}, (server) => {
            registerProblemTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("get_daily_challenge", () => {
        it(
            "should list get_daily_challenge tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const dailyChallengeTool = tools.find(
                    (t) => t.name === "get_daily_challenge"
                );
                expect(dailyChallengeTool).toBeDefined();
                expect(dailyChallengeTool?.description).toContain(
                    "Daily Challenge"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_daily_challenge successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_daily_challenge",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                expect(data.date).toBeDefined();
                expect(data.problem).toBeDefined();
                expect(data.problem.question).toBeDefined();
                expect(mockService.fetchDailyChallenge).toHaveBeenCalledOnce();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should handle errors gracefully",
            async () => {
                const failingService = createMockFailingService();
                const failingClient = await createTestClient({}, (server) => {
                    registerProblemTools(server, failingService as any);
                });

                try {
                    await failingClient.client.callTool({
                        name: "get_daily_challenge",
                        arguments: {}
                    });
                    // Should not reach here
                    expect(true).toBe(false);
                } catch (error: any) {
                    expect(error).toBeDefined();
                } finally {
                    await failingClient.cleanup();
                }
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_problem", () => {
        it(
            "should list get_problem tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const problemTool = tools.find((t) => t.name === "get_problem");
                expect(problemTool).toBeDefined();
                expect(problemTool?.description).toContain("problem");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should have titleSlug parameter",
            async () => {
                const { tools } = await testClient.client.listTools();

                const problemTool = tools.find((t) => t.name === "get_problem");
                expect(
                    problemTool?.inputSchema.properties?.titleSlug
                ).toBeDefined();
                expect(
                    problemTool?.inputSchema.required?.includes("titleSlug")
                ).toBe(true);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_problem successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_problem",
                    arguments: { titleSlug: "two-sum" }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                expect(data.titleSlug).toBe("two-sum");
                expect(data.problem).toBeDefined();
                expect(mockService.fetchProblemSimplified).toHaveBeenCalledWith(
                    "two-sum"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("search_problems", () => {
        it(
            "should list search_problems tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const searchTool = tools.find(
                    (t) => t.name === "search_problems"
                );
                expect(searchTool).toBeDefined();
                expect(searchTool?.description).toContain("Search");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute search_problems with default parameters",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "search_problems",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                expect(data.problems).toBeDefined();
                expect(mockService.searchProblems).toHaveBeenCalled();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute search_problems with filters",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "search_problems",
                    arguments: {
                        difficulty: "EASY",
                        tags: ["array", "hash-table"],
                        limit: 5,
                        offset: 10
                    }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                expect(data.filters.difficulty).toBe("EASY");
                expect(data.filters.tags).toEqual(["array", "hash-table"]);
                expect(data.pagination.limit).toBe(5);
                expect(data.pagination.offset).toBe(10);
                expect(mockService.searchProblems).toHaveBeenCalledWith(
                    "all-code-essentials",
                    ["array", "hash-table"],
                    "EASY",
                    5,
                    10,
                    undefined
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should handle search with keywords",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "search_problems",
                    arguments: {
                        searchKeywords: "binary tree"
                    }
                });

                assertions.hasToolResultStructure(result);
                expect(mockService.searchProblems).toHaveBeenCalledWith(
                    "all-code-essentials",
                    undefined,
                    undefined,
                    10,
                    undefined,
                    "binary tree"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
