/**
 * Prompt Integration Tests
 * Tests all prompts through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerAuthPrompts } from "../../src/mcp/prompts/auth-prompts.js";
import { registerLearningPrompts } from "../../src/mcp/prompts/learning-prompts.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Prompt Integration", () => {
    let testClient: TestClientPair;

    beforeEach(async () => {
        const mockService = createMockLeetCodeService();
        testClient = await createTestClient({}, (server) => {
            registerLearningPrompts(server, mockService);
            registerAuthPrompts(server, mockService);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("Learning Prompts", () => {
        it(
            "should list leetcode_workspace_setup prompt",
            async () => {
                const { prompts } = await testClient.client.listPrompts();

                const prompt = prompts.find(
                    (p) => p.name === "leetcode_workspace_setup"
                );
                expect(prompt).toBeDefined();
                expect(prompt?.description).toContain("workspace");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should get leetcode_workspace_setup prompt with arguments",
            async () => {
                const result: any = await testClient.client.getPrompt({
                    name: "leetcode_workspace_setup",
                    arguments: {
                        language: "Python",
                        problemSlug: "two-sum",
                        codeTemplate: "def twoSum(nums, target):\n    pass"
                    }
                });

                assertions.hasPromptStructure(result);
                expect(result.messages[0].role).toBe("user");
                expect(result.messages[0].content.text).toContain("two-sum.py");
                expect(result.messages[0].content.text).toContain(
                    "def twoSum(nums, target):"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should list leetcode_learning_mode prompt",
            async () => {
                const { prompts } = await testClient.client.listPrompts();

                const prompt = prompts.find(
                    (p) => p.name === "leetcode_learning_mode"
                );
                expect(prompt).toBeDefined();
                expect(prompt?.description).toContain("learning");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should get leetcode_learning_mode prompt",
            async () => {
                const result: any = await testClient.client.getPrompt({
                    name: "leetcode_learning_mode",
                    arguments: {}
                });

                assertions.hasPromptStructure(result);
                expect(result.messages[0].role).toBe("user");
                expect(result.messages[0].content.text).toContain(
                    "learning-guided mode"
                );
                expect(result.messages[0].content.text).toContain("hints");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should list leetcode_problem_workflow prompt",
            async () => {
                const { prompts } = await testClient.client.listPrompts();

                const prompt = prompts.find(
                    (p) => p.name === "leetcode_problem_workflow"
                );
                expect(prompt).toBeDefined();
                expect(prompt?.description).toContain("workflow");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should get leetcode_problem_workflow prompt with arguments",
            async () => {
                const result: any = await testClient.client.getPrompt({
                    name: "leetcode_problem_workflow",
                    arguments: {
                        problemSlug: "two-sum",
                        difficulty: "Easy"
                    }
                });

                assertions.hasPromptStructure(result);
                expect(result.messages[0].role).toBe("user");
                expect(result.messages[0].content.text).toContain("two-sum");
                expect(result.messages[0].content.text).toContain("Easy");
                expect(result.messages[0].content.text).toContain("Workflow");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("Auth Prompts", () => {
        it(
            "should list leetcode_authentication_guide prompt",
            async () => {
                const { prompts } = await testClient.client.listPrompts();

                const prompt = prompts.find(
                    (p) => p.name === "leetcode_authentication_guide"
                );
                expect(prompt).toBeDefined();
                expect(prompt?.description).toContain("authentication");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should get leetcode_authentication_guide prompt",
            async () => {
                const result: any = await testClient.client.getPrompt({
                    name: "leetcode_authentication_guide",
                    arguments: {}
                });

                assertions.hasPromptStructure(result);
                expect(result.messages[0].role).toBe("user");
                expect(result.messages[0].content.text).toContain(
                    "Authentication"
                );
                expect(result.messages[0].content.text).toContain("DevTools");
                expect(result.messages[0].content.text).toContain("csrftoken");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
