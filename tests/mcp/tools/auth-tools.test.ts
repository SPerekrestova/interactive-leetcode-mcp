// tests/mcp/tools/auth-tools.test.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeetcodeServiceInterface } from "../../../src/leetcode/leetcode-service-interface.js";
import { AuthToolRegistry } from "../../../src/mcp/tools/auth-tools.js";
import { credentialsStorage } from "../../../src/utils/credentials.js";

// Mock dependencies
vi.mock("axios");
vi.mock("../../../src/utils/browser-launcher.js", () => ({
    openDefaultBrowser: vi.fn()
}));
vi.mock("../../../src/utils/credentials.js", () => ({
    credentialsStorage: {
        exists: vi.fn(),
        load: vi.fn(),
        save: vi.fn(),
        clear: vi.fn()
    }
}));

describe("AuthToolRegistry", () => {
    let mockServer: McpServer;
    let mockLeetCodeService: LeetcodeServiceInterface;
    let registry: AuthToolRegistry;
    let registeredTools: Map<
        string,
        {
            description: string;
            inputSchema: any;
            handler: (args: any) => Promise<any>;
        }
    >;

    beforeEach(() => {
        registeredTools = new Map();

        mockServer = {
            registerTool: vi.fn((name, config, handler) => {
                registeredTools.set(name, {
                    description: config.description,
                    inputSchema: config.inputSchema,
                    handler
                });
            })
        } as unknown as McpServer;

        mockLeetCodeService = {
            isAuthenticated: vi.fn().mockReturnValue(false)
        } as unknown as LeetcodeServiceInterface;

        registry = new AuthToolRegistry(mockServer, mockLeetCodeService);
        // Trigger registration
        registry.register();

        // Clear all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Tool Registration", () => {
        it("should register start_leetcode_auth tool", () => {
            expect(registeredTools.has("start_leetcode_auth")).toBe(true);
        });

        it("should register save_leetcode_credentials tool", () => {
            expect(registeredTools.has("save_leetcode_credentials")).toBe(true);
        });

        it("should register check_auth_status tool", () => {
            expect(registeredTools.has("check_auth_status")).toBe(true);
        });

        it("save_leetcode_credentials should have correct input schema", () => {
            const tool = registeredTools.get("save_leetcode_credentials");
            expect(tool?.inputSchema).toBeDefined();
            expect(tool?.inputSchema.csrftoken).toBeDefined();
            expect(tool?.inputSchema.session).toBeDefined();
        });
    });

    describe("start_leetcode_auth", () => {
        it("should return awaiting_credentials status", async () => {
            const tool = registeredTools.get("start_leetcode_auth");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.status).toBe("awaiting_credentials");
        });

        it("should include login URL", async () => {
            const tool = registeredTools.get("start_leetcode_auth");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.loginUrl).toBe(
                "https://leetcode.com/accounts/login/"
            );
        });

        it("should include browserOpened status", async () => {
            const tool = registeredTools.get("start_leetcode_auth");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(typeof response.browserOpened).toBe("boolean");
        });

        it("should include structured instructions", async () => {
            const tool = registeredTools.get("start_leetcode_auth");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.instructions).toBeDefined();
            expect(response.instructions.step1).toBeDefined();
            expect(response.instructions.step2_devtools).toBeDefined();
            expect(response.instructions.step5_copy).toBeDefined();
        });
    });

    describe("save_leetcode_credentials", () => {
        it("should validate credentials with LeetCode API", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("save_leetcode_credentials");
            await tool!.handler({
                csrftoken: "test-csrf",
                session: "test-session"
            });

            expect(axios.post).toHaveBeenCalledWith(
                "https://leetcode.com/graphql",
                expect.objectContaining({
                    query: expect.stringContaining("userStatus")
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Cookie: "csrftoken=test-csrf; LEETCODE_SESSION=test-session",
                        "X-CSRFToken": "test-csrf"
                    })
                })
            );
        });

        it("should save valid credentials", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("save_leetcode_credentials");
            await tool!.handler({
                csrftoken: "test-csrf",
                session: "test-session"
            });

            expect(credentialsStorage.save).toHaveBeenCalledWith({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: expect.any(String)
            });
        });

        it("should return success with username for valid credentials", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("save_leetcode_credentials");
            const result = await tool!.handler({
                csrftoken: "test-csrf",
                session: "test-session"
            });

            const response = JSON.parse(result.content[0].text);
            expect(response.status).toBe("success");
            expect(response.username).toBe("testuser");
        });

        it("should return error for invalid credentials", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: false,
                            username: null
                        }
                    }
                }
            });

            const tool = registeredTools.get("save_leetcode_credentials");
            const result = await tool!.handler({
                csrftoken: "invalid-csrf",
                session: "invalid-session"
            });

            const response = JSON.parse(result.content[0].text);
            expect(response.status).toBe("error");
            expect(credentialsStorage.save).not.toHaveBeenCalled();
        });

        it("should handle API errors gracefully", async () => {
            vi.mocked(axios.post).mockRejectedValue(new Error("Network error"));

            const tool = registeredTools.get("save_leetcode_credentials");
            const result = await tool!.handler({
                csrftoken: "test-csrf",
                session: "test-session"
            });

            const response = JSON.parse(result.content[0].text);
            expect(response.status).toBe("error");
        });
    });

    describe("check_auth_status", () => {
        it("should return not authenticated when credentials don't exist", async () => {
            vi.mocked(credentialsStorage.exists).mockResolvedValue(false);

            const tool = registeredTools.get("check_auth_status");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.authenticated).toBe(false);
        });

        it("should check credential validity when credentials exist", async () => {
            vi.mocked(credentialsStorage.exists).mockResolvedValue(true);
            vi.mocked(credentialsStorage.load).mockResolvedValue({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: new Date().toISOString()
            });
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("check_auth_status");
            await tool!.handler({});

            expect(axios.post).toHaveBeenCalled();
        });

        it("should return authenticated with username for valid credentials", async () => {
            vi.mocked(credentialsStorage.exists).mockResolvedValue(true);
            vi.mocked(credentialsStorage.load).mockResolvedValue({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: new Date().toISOString()
            });
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("check_auth_status");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.authenticated).toBe(true);
            expect(response.username).toBe("testuser");
        });

        it("should return expired status for invalid credentials", async () => {
            vi.mocked(credentialsStorage.exists).mockResolvedValue(true);
            vi.mocked(credentialsStorage.load).mockResolvedValue({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: new Date().toISOString()
            });
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: false,
                            username: null
                        }
                    }
                }
            });

            const tool = registeredTools.get("check_auth_status");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.authenticated).toBe(false);
            expect(response.expired).toBe(true);
        });

        it("should calculate credential age correctly", async () => {
            const fiveDaysAgo = new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toISOString();

            vi.mocked(credentialsStorage.exists).mockResolvedValue(true);
            vi.mocked(credentialsStorage.load).mockResolvedValue({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: fiveDaysAgo
            });
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("check_auth_status");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.credentialsAge).toBe("5 days");
        });

        it("should warn about expiration for old credentials", async () => {
            const sixDaysAgo = new Date(
                Date.now() - 6 * 24 * 60 * 60 * 1000
            ).toISOString();

            vi.mocked(credentialsStorage.exists).mockResolvedValue(true);
            vi.mocked(credentialsStorage.load).mockResolvedValue({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: sixDaysAgo
            });
            vi.mocked(axios.post).mockResolvedValue({
                data: {
                    data: {
                        userStatus: {
                            isSignedIn: true,
                            username: "testuser"
                        }
                    }
                }
            });

            const tool = registeredTools.get("check_auth_status");
            const result = await tool!.handler({});

            const response = JSON.parse(result.content[0].text);
            expect(response.warning).toBeTruthy();
            expect(response.warning).toContain("expire soon");
        });
    });
});
