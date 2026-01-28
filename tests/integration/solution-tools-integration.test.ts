/**
 * Solution Tools Integration Tests
 * Tests all solution-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerSolutionTools } from "../../src/mcp/tools/solution-tools.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Solution Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();

        testClient = await createTestClient({}, (server) => {
            registerSolutionTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("list_problem_solutions", () => {
        it(
            "should list list_problem_solutions tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "list_problem_solutions"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("solutions");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute list_problem_solutions successfully",
            async () => {
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
            "should execute get_problem_solution successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_problem_solution",
                    arguments: { topicId: "12345" }
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
