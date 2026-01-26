// tests/mcp/prompts/prompt-registry-base.test.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromptRegistry } from "../../../src/mcp/prompts/prompt-registry-base.js";

class TestPromptRegistry extends PromptRegistry {
    protected registerPrompts(): void {
        this.registerPrompt(
            "test_prompt",
            "A test prompt",
            [
                {
                    name: "param1",
                    description: "First parameter",
                    required: true
                }
            ],
            (args) => {
                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: `Test prompt with ${args.param1}`
                            }
                        }
                    ]
                };
            }
        );
    }
}

describe("PromptRegistry", () => {
    let mockServer: McpServer;
    let registry: TestPromptRegistry;

    beforeEach(() => {
        mockServer = {
            prompt: vi.fn()
        } as unknown as McpServer;

        registry = new TestPromptRegistry(mockServer);
    });

    it("should register prompts on the server", () => {
        expect(mockServer.prompt).toHaveBeenCalledWith(
            "test_prompt",
            "A test prompt",
            expect.any(Object),
            expect.any(Function)
        );
    });

    it("should call prompt handler with arguments", async () => {
        const promptHandler = vi.mocked(mockServer.prompt).mock.calls[0][3];
        const result = await promptHandler({ param1: "value1" }, {} as any);

        expect(result).toEqual({
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: "Test prompt with value1"
                    }
                }
            ]
        });
    });
});
