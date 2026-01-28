/**
 * Contest Tools Integration Tests
 * Tests all contest-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerContestTools } from "../../src/mcp/tools/contest-tools.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Contest Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();

        testClient = await createTestClient({}, (server) => {
            registerContestTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("get_user_contest_ranking", () => {
        it(
            "should list get_user_contest_ranking tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "get_user_contest_ranking"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("contest");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_user_contest_ranking successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_user_contest_ranking",
                    arguments: { username: "testuser" }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchUserContestRanking
                ).toHaveBeenCalledWith("testuser", true);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should handle attended parameter",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_user_contest_ranking",
                    arguments: { username: "testuser", attended: false }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchUserContestRanking
                ).toHaveBeenCalledWith("testuser", false);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
