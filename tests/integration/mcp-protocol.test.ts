/**
 * MCP Protocol Integration Tests
 * Tests that verify MCP protocol compliance and basic server functionality
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("MCP Protocol Integration", () => {
    let testClient: TestClientPair;

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("Server Initialization", () => {
        it(
            "should create server and client successfully",
            async () => {
                testClient = await createTestClient();
                expect(testClient.server).toBeDefined();
                expect(testClient.client).toBeDefined();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should connect via in-memory transport",
            async () => {
                testClient = await createTestClient();
                // If we got here without errors, connection is successful
                expect(true).toBe(true);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("Tool Registration", () => {
        beforeEach(async () => {
            // Register tool BEFORE connection
            testClient = await createTestClient({}, (server) => {
                server.registerTool(
                    "test_echo",
                    {
                        description: "Echoes the input message",
                        inputSchema: {
                            message: z
                                .string()
                                .optional()
                                .describe("Message to echo")
                        }
                    },
                    async ({ message }: { message?: string }) => ({
                        content: [
                            {
                                type: "text",
                                text: message || "no message"
                            }
                        ]
                    })
                );
            });
        });

        it(
            "should list registered tools",
            async () => {
                const { tools } = await testClient.client.listTools();

                expect(tools).toBeDefined();
                expect(Array.isArray(tools)).toBe(true);
                expect(tools.length).toBe(1);
                expect(tools[0].name).toBe("test_echo");
                expect(tools[0].description).toBe("Echoes the input message");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should call registered tool",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "test_echo",
                    arguments: { message: "Hello MCP!" }
                });

                assertions.hasToolResultStructure(result);
                expect(result.content[0].type).toBe("text");
                expect(result.content[0].text).toBe("Hello MCP!");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should handle tool with no arguments",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "test_echo",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                expect(result.content[0].text).toBe("no message");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("Resource Registration", () => {
        beforeEach(async () => {
            // Register resource BEFORE connection
            testClient = await createTestClient({}, (server) => {
                server.registerResource(
                    "test-resource",
                    "test://data",
                    {
                        description: "A test resource",
                        mimeType: "application/json"
                    },
                    async (uri) => ({
                        contents: [
                            {
                                uri: uri.toString(),
                                text: JSON.stringify({ test: "data" }),
                                mimeType: "application/json"
                            }
                        ]
                    })
                );
            });
        });

        it(
            "should list registered resources",
            async () => {
                const { resources } = await testClient.client.listResources();

                expect(resources).toBeDefined();
                expect(Array.isArray(resources)).toBe(true);
                expect(resources.length).toBe(1);
                expect(resources[0].name).toBe("test-resource");
                expect(resources[0].uri).toBe("test://data");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should read registered resource",
            async () => {
                const result: any = await testClient.client.readResource({
                    uri: "test://data"
                });

                assertions.hasResourceStructure(result);
                expect(result.contents[0].mimeType).toBe("application/json");

                const data = JSON.parse(result.contents[0].text as string);
                expect(data.test).toBe("data");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("Prompt Registration", () => {
        beforeEach(async () => {
            // Register prompt BEFORE connection
            testClient = await createTestClient({}, (server) => {
                // Use server.prompt() method with Zod schema
                server.prompt(
                    "test-prompt",
                    "A test prompt",
                    {
                        topic: z.string().describe("Topic to discuss")
                    },
                    (args) => ({
                        messages: [
                            {
                                role: "user",
                                content: {
                                    type: "text",
                                    text: `Let's discuss ${args.topic}`
                                }
                            }
                        ]
                    })
                );
            });
        });

        it(
            "should list registered prompts",
            async () => {
                const { prompts } = await testClient.client.listPrompts();

                expect(prompts).toBeDefined();
                expect(Array.isArray(prompts)).toBe(true);
                expect(prompts.length).toBe(1);
                expect(prompts[0].name).toBe("test-prompt");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should get prompt with arguments",
            async () => {
                const result: any = await testClient.client.getPrompt({
                    name: "test-prompt",
                    arguments: { topic: "testing" }
                });

                assertions.hasPromptStructure(result);
                expect(result.messages[0].role).toBe("user");
                expect(result.messages[0].content.text).toBe(
                    "Let's discuss testing"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
