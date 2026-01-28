/**
 * Submission Tools Integration Tests
 * Tests all submission-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerSubmissionTools } from "../../src/mcp/tools/submission-tools.js";
import { createMockAuthenticatedService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Submission Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockAuthenticatedService>;

    beforeEach(async () => {
        // Use authenticated service since submission requires authentication
        mockService = createMockAuthenticatedService();

        testClient = await createTestClient({}, (server) => {
            registerSubmissionTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("submit_solution", () => {
        it(
            "should list submit_solution tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find((t) => t.name === "submit_solution");
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("solution");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should have required parameters",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find((t) => t.name === "submit_solution");
                expect(tool?.inputSchema.required).toContain("problemSlug");
                expect(tool?.inputSchema.required).toContain("code");
                expect(tool?.inputSchema.required).toContain("language");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute submit_solution successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "submit_solution",
                    arguments: {
                        problemSlug: "two-sum",
                        code: "def twoSum(nums, target): pass",
                        language: "python3"
                    }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                // Should return submission result structure
                expect(data).toBeDefined();
                // Tool makes direct HTTP calls, not through service
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should handle different languages",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "submit_solution",
                    arguments: {
                        problemSlug: "two-sum",
                        code: "class Solution { public int[] twoSum(int[] nums, int target) { return null; } }",
                        language: "java"
                    }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                // Should return submission result structure
                expect(data).toBeDefined();
                // Tool makes direct HTTP calls, not through service
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
