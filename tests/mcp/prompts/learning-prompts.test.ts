// tests/mcp/prompts/learning-prompts.test.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningPromptRegistry } from "../../../src/mcp/prompts/learning-prompts.js";
import { createMockLeetCodeService } from "../../helpers/mock-leetcode.js";

describe("LearningPromptRegistry", () => {
    let mockServer: McpServer;
    let registry: LearningPromptRegistry;

    beforeEach(() => {
        mockServer = {
            registerPrompt: vi.fn()
        } as unknown as McpServer;

        const mockService = createMockLeetCodeService();
        registry = new LearningPromptRegistry(mockServer, mockService);
        registry.register();
    });

    it("should register leetcode_workspace_setup prompt", () => {
        expect(mockServer.registerPrompt).toHaveBeenCalledWith(
            "leetcode_workspace_setup",
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should register leetcode_learning_mode prompt", () => {
        expect(mockServer.registerPrompt).toHaveBeenCalledWith(
            "leetcode_learning_mode",
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should register leetcode_problem_workflow prompt", () => {
        expect(mockServer.registerPrompt).toHaveBeenCalledWith(
            "leetcode_problem_workflow",
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should generate workspace setup prompt with parameters", async () => {
        const workspaceCall = vi
            .mocked(mockServer.registerPrompt)
            .mock.calls.find((call) => call[0] === "leetcode_workspace_setup");
        const handler = workspaceCall![2];

        const result = await handler(
            {
                language: "Python",
                problemSlug: "two-sum",
                codeTemplate: "def twoSum(nums, target):\n    pass"
            },
            {} as any
        );

        const content = result.messages[0].content;
        expect(content.type).toBe("text");
        if (content.type === "text") {
            expect(content.text).toContain("two-sum.py");
            expect(content.text).toContain("def twoSum(nums, target)");
        }
    });
});
