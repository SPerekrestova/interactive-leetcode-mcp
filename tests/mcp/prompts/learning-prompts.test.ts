// tests/mcp/prompts/learning-prompts.test.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningPromptRegistry } from "../../../src/mcp/prompts/learning-prompts";

describe("LearningPromptRegistry", () => {
    let mockServer: McpServer;
    let registry: LearningPromptRegistry;

    beforeEach(() => {
        mockServer = {
            prompt: vi.fn()
        } as unknown as McpServer;

        registry = new LearningPromptRegistry(mockServer);
    });

    it("should register leetcode_workspace_setup prompt", () => {
        expect(mockServer.prompt).toHaveBeenCalledWith(
            "leetcode_workspace_setup",
            expect.any(String),
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should register leetcode_learning_mode prompt", () => {
        expect(mockServer.prompt).toHaveBeenCalledWith(
            "leetcode_learning_mode",
            expect.any(String),
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should register leetcode_problem_workflow prompt", () => {
        expect(mockServer.prompt).toHaveBeenCalledWith(
            "leetcode_problem_workflow",
            expect.any(String),
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should generate workspace setup prompt with parameters", () => {
        const workspaceCall = vi
            .mocked(mockServer.prompt)
            .mock.calls.find((call) => call[0] === "leetcode_workspace_setup");
        const handler = workspaceCall![3];

        const result = handler(
            {
                language: "Python",
                problemSlug: "two-sum",
                codeTemplate: "def twoSum(nums, target):\n    pass"
            },
            {} as any
        );

        expect(result.messages[0].content.text).toContain("two-sum.py");
        expect(result.messages[0].content.text).toContain(
            "def twoSum(nums, target)"
        );
    });
});
