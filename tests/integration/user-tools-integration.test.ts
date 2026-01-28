/**
 * User Tools Integration Tests
 * Tests all user-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerUserTools } from "../../src/mcp/tools/user-tools.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("User Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();

        testClient = await createTestClient({}, (server) => {
            registerUserTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("get_user_profile", () => {
        it(
            "should list get_user_profile tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find((t) => t.name === "get_user_profile");
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("profile");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_user_profile successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_user_profile",
                    arguments: { username: "testuser" }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                expect(data.username).toBe("testuser");
                expect(mockService.fetchUserProfile).toHaveBeenCalledWith(
                    "testuser"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_recent_submissions", () => {
        it(
            "should list get_recent_submissions tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "get_recent_submissions"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("submissions");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_recent_submissions successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_recent_submissions",
                    arguments: { username: "testuser", limit: 5 }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchUserRecentSubmissions
                ).toHaveBeenCalledWith("testuser", 5);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_recent_ac_submissions", () => {
        it(
            "should list get_recent_ac_submissions tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "get_recent_ac_submissions"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("accepted");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_recent_ac_submissions successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_recent_ac_submissions",
                    arguments: { username: "testuser" }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchUserRecentACSubmissions
                ).toHaveBeenCalledWith("testuser", 10);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
