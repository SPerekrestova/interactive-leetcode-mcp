/**
 * Submission Tools Integration Tests
 * Tests all submission-related tools through MCP protocol
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionService } from "../../src/domain/session-service.js";
import { FileSessionStore } from "../../src/domain/session-store.js";
import { registerSubmissionTools } from "../../src/mcp/tools/submission-tools.js";
import { ErrorCode } from "../../src/types/index.js";
import { createMockAuthenticatedService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Submission Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockAuthenticatedService>;
    let sessions: SessionService;
    let sessionDir: string;

    beforeEach(async () => {
        // Use authenticated service since submission requires authentication
        mockService = createMockAuthenticatedService();
        sessionDir = await mkdtemp(join(tmpdir(), "leetcode-mcp-sub-"));
        sessions = new SessionService(
            new FileSessionStore({ dir: sessionDir })
        );

        testClient = await createTestClient({}, (server) => {
            registerSubmissionTools(server, mockService as any, sessions);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
        await rm(sessionDir, { recursive: true, force: true });
        delete process.env.LEETCODE_MCP_STRICT_MODE;
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

    describe("submit_solution — strict mode", () => {
        it(
            "blocks submission when LEETCODE_MCP_STRICT_MODE=1 and session has not passed locals",
            async () => {
                process.env.LEETCODE_MCP_STRICT_MODE = "1";
                await sessions.startOrResume({ slug: "two-sum" });
                // No recordLocalRun call → lastLocalRunPassed is null.

                const result: any = await testClient.client.callTool({
                    name: "submit_solution",
                    arguments: {
                        problemSlug: "two-sum",
                        code: "def twoSum(nums, target): pass",
                        language: "python3"
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text as string);
                expect(payload.code).toBe(ErrorCode.LOCAL_TESTS_NOT_PASSED);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "permits submission when strict mode is on and locals have passed",
            async () => {
                process.env.LEETCODE_MCP_STRICT_MODE = "1";
                await sessions.startOrResume({ slug: "two-sum" });
                await sessions.recordLocalRun("two-sum", true);

                const result: any = await testClient.client.callTool({
                    name: "submit_solution",
                    arguments: {
                        problemSlug: "two-sum",
                        code: "def twoSum(nums, target): pass",
                        language: "python3"
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text as string);
                // Mock service returns a normal submission envelope —
                // we just need to confirm we didn't get the error code.
                expect(payload.code).not.toBe(ErrorCode.LOCAL_TESTS_NOT_PASSED);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "permits submission when strict mode is on but no session was opened",
            async () => {
                process.env.LEETCODE_MCP_STRICT_MODE = "1";
                // Deliberately no startOrResume — strict mode should
                // not block ad-hoc submissions outside the tutoring
                // flow.

                const result: any = await testClient.client.callTool({
                    name: "submit_solution",
                    arguments: {
                        problemSlug: "two-sum",
                        code: "def twoSum(nums, target): pass",
                        language: "python3"
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text as string);
                expect(payload.code).not.toBe(ErrorCode.LOCAL_TESTS_NOT_PASSED);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "does not block by default (LEETCODE_MCP_STRICT_MODE unset)",
            async () => {
                // No env var; session exists with lastLocalRunPassed === null.
                await sessions.startOrResume({ slug: "two-sum" });

                const result: any = await testClient.client.callTool({
                    name: "submit_solution",
                    arguments: {
                        problemSlug: "two-sum",
                        code: "def twoSum(nums, target): pass",
                        language: "python3"
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text as string);
                expect(payload.code).not.toBe(ErrorCode.LOCAL_TESTS_NOT_PASSED);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
