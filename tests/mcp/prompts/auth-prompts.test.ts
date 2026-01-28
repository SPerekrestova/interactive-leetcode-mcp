// tests/mcp/prompts/auth-prompts.test.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPromptRegistry } from "../../../src/mcp/prompts/auth-prompts.js";
import { createMockLeetCodeService } from "../../helpers/mock-leetcode.js";

describe("AuthPromptRegistry", () => {
    let mockServer: McpServer;

    beforeEach(() => {
        mockServer = {
            registerPrompt: vi.fn()
        } as unknown as McpServer;

        // Instantiate registry to trigger registration
        const mockService = createMockLeetCodeService();
        new AuthPromptRegistry(mockServer, mockService).register();
    });

    describe("Prompt Registration", () => {
        it("should register leetcode_authentication_guide prompt", () => {
            expect(mockServer.registerPrompt).toHaveBeenCalledWith(
                "leetcode_authentication_guide",
                expect.any(Object),
                expect.any(Function)
            );
        });

        it("should register prompt with no parameters", () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );

            expect(call).toBeDefined();
            const config = call![1];
            // Empty parameter array results in empty or undefined argsSchema
            expect(config.argsSchema).toBeUndefined();
        });

        it("should include descriptive prompt description", () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );

            const description = call![1].description;
            expect(description).toContain("authentication");
            expect(description).toContain("cookie");
        });
    });

    describe("Prompt Generation", () => {
        it("should generate authentication guide with comprehensive instructions", async () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );
            const handler = call![2];

            const result = await handler({}, {} as any);

            expect(result.messages).toHaveLength(1);
            expect(result.messages[0].role).toBe("user");
            const content = result.messages[0].content;
            expect(content.type).toBe("text");
        });

        it("should include DevTools navigation instructions", async () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );
            const handler = call![2];

            const result = await handler({}, {} as any);
            const content = result.messages[0].content;

            if (content.type === "text") {
                expect(content.text).toContain("DevTools");
                expect(content.text).toContain("F12");
                expect(content.text).toContain("Application");
                expect(content.text).toContain("Cookies");
            }
        });

        it("should include cookie names to extract", async () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );
            const handler = call![2];

            const result = await handler({}, {} as any);
            const content = result.messages[0].content;

            if (content.type === "text") {
                expect(content.text).toContain("csrftoken");
                expect(content.text).toContain("LEETCODE_SESSION");
            }
        });

        it("should include authentication flow steps", async () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );
            const handler = call![2];

            const result = await handler({}, {} as any);
            const content = result.messages[0].content;

            if (content.type === "text") {
                expect(content.text).toContain("start_leetcode_auth");
                expect(content.text).toContain("save_leetcode_credentials");
                expect(content.text).toContain("check_auth_status");
            }
        });

        it("should include error handling guidance", async () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );
            const handler = call![2];

            const result = await handler({}, {} as any);
            const content = result.messages[0].content;

            if (content.type === "text") {
                expect(content.text).toContain("Invalid credentials");
                expect(content.text).toContain("expired");
            }
        });

        it("should include tone guidance for AI agents", async () => {
            const call = vi
                .mocked(mockServer.registerPrompt)
                .mock.calls.find(
                    (call) => call[0] === "leetcode_authentication_guide"
                );
            const handler = call![2];

            const result = await handler({}, {} as any);
            const content = result.messages[0].content;

            if (content.type === "text") {
                expect(content.text).toContain("patient");
                expect(content.text).toContain("encouraging");
            }
        });
    });
});
