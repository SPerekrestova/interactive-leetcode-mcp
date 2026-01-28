/**
 * Auth Tools Integration Tests
 * Tests all authentication-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerAuthTools } from "../../src/mcp/tools/auth-tools.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Auth Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();

        testClient = await createTestClient({}, (server) => {
            registerAuthTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("start_leetcode_auth", () => {
        it(
            "should list start_leetcode_auth tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "start_leetcode_auth"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("authentication");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute start_leetcode_auth successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "start_leetcode_auth",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                // Should return instructions for manual authentication
                expect(data.status).toBe("awaiting_credentials");
                expect(data.browserOpened).toBeDefined();
                expect(data.loginUrl).toBeDefined();
                expect(data.instructions).toBeDefined();
                expect(typeof data.instructions).toBe("object");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("save_leetcode_credentials", () => {
        it(
            "should list save_leetcode_credentials tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find(
                    (t) => t.name === "save_leetcode_credentials"
                );
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("credentials");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute save_leetcode_credentials successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "save_leetcode_credentials",
                    arguments: {
                        csrftoken: "test-csrf-token",
                        session: "test-session-token"
                    }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                // Should return status and message
                expect(data.status).toBeDefined();
                expect(data.message).toBeDefined();
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("check_auth_status", () => {
        it(
            "should list check_auth_status tool",
            async () => {
                const { tools } = await testClient.client.listTools();

                const tool = tools.find((t) => t.name === "check_auth_status");
                expect(tool).toBeDefined();
                expect(tool?.description).toContain("authentication");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute check_auth_status successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "check_auth_status",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);

                expect(data.authenticated).toBeDefined();
                expect(typeof data.authenticated).toBe("boolean");
                expect(data.message).toBeDefined();
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
