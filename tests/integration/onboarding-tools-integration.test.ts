/**
 * Onboarding Tools Integration Tests
 * Tests the get_started tool through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerOnboardingTools } from "../../src/mcp/tools/onboarding-tools.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Onboarding Tools Integration", () => {
    let testClient: TestClientPair;

    beforeEach(async () => {
        const mockService = createMockLeetCodeService();
        testClient = await createTestClient({}, (server) => {
            registerOnboardingTools(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("get_started", () => {
        it(
            "should be registered and description tells Claude to call it first",
            async () => {
                const { tools } = await testClient.client.listTools();
                const tool = tools.find((t) => t.name === "get_started");

                expect(tool).toBeDefined();
                expect(tool?.description).toContain("start");
                expect(tool?.description).toContain("prompt");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return prompt invocation rules",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_started",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const text = result.content[0].text as string;

                expect(text).toContain("leetcode_learning_mode");
                expect(text).toContain("leetcode_problem_workflow");
                expect(text).toContain("leetcode_workspace_setup");
                expect(text).toContain("leetcode_authentication_guide");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return session start flow",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_started",
                    arguments: {}
                });

                const text = result.content[0].text as string;
                expect(text).toContain("Session Start Flow");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return learning mode hint levels",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_started",
                    arguments: {}
                });

                const text = result.content[0].text as string;
                expect(text).toContain("Level 1");
                expect(text).toContain("Level 2");
                expect(text).toContain("Level 3");
                expect(text).toContain("Level 4");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return auth flow with check_auth_status gate",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_started",
                    arguments: {}
                });

                const text = result.content[0].text as string;
                expect(text).toContain("check_auth_status");
                expect(text).toContain("save_leetcode_credentials");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return submission language map with python3 default",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_started",
                    arguments: {}
                });

                const text = result.content[0].text as string;
                expect(text).toContain("python3");
                expect(text).toContain("Language Map");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
