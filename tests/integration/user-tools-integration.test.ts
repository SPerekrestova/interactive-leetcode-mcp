/**
 * User Tools Integration Tests
 * Tests all user-related tools through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    describe("get_user_status", () => {
        it(
            "should list get_user_status tool",
            async () => {
                const { tools } = await testClient.client.listTools();
                const tool = tools.find((t) => t.name === "get_user_status");

                expect(tool).toBeDefined();
                expect(tool?.description).toContain("status");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_user_status successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_user_status",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);
                expect(data.status).toBeDefined();
                expect(mockService.fetchUserStatus).toHaveBeenCalledOnce();
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return error when service throws auth error",
            async () => {
                const failingService = createMockLeetCodeService();
                vi.mocked(failingService.fetchUserStatus).mockRejectedValue(
                    new Error("Authentication required to fetch user status")
                );
                const failingClient = await createTestClient({}, (server) => {
                    registerUserTools(server, failingService as any);
                });

                try {
                    const result: any = await failingClient.client.callTool({
                        name: "get_user_status",
                        arguments: {}
                    });

                    assertions.hasToolResultStructure(result);
                    const data = JSON.parse(result.content[0].text as string);
                    expect(data.error).toContain("Authentication required");
                } finally {
                    await failingClient.cleanup();
                }
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_problem_submission_report", () => {
        it(
            "should list get_problem_submission_report tool",
            async () => {
                const { tools } = await testClient.client.listTools();
                const tool = tools.find(
                    (t) => t.name === "get_problem_submission_report"
                );

                expect(tool).toBeDefined();
                expect(tool?.description).toContain("submission");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_problem_submission_report successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_problem_submission_report",
                    arguments: { id: 12345 }
                });

                assertions.hasToolResultStructure(result);
                const data = JSON.parse(result.content[0].text as string);
                expect(data.submissionId).toBe(12345);
                expect(
                    mockService.fetchUserSubmissionDetail
                ).toHaveBeenCalledWith(12345);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return error when service throws auth error",
            async () => {
                const failingService = createMockLeetCodeService();
                vi.mocked(
                    failingService.fetchUserSubmissionDetail
                ).mockRejectedValue(
                    new Error(
                        "Authentication required to fetch user submission detail"
                    )
                );
                const failingClient = await createTestClient({}, (server) => {
                    registerUserTools(server, failingService as any);
                });

                try {
                    const result: any = await failingClient.client.callTool({
                        name: "get_problem_submission_report",
                        arguments: { id: 12345 }
                    });

                    assertions.hasToolResultStructure(result);
                    const data = JSON.parse(result.content[0].text as string);
                    expect(data.error).toContain("Authentication required");
                } finally {
                    await failingClient.cleanup();
                }
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_problem_progress", () => {
        it(
            "should list get_problem_progress tool",
            async () => {
                const { tools } = await testClient.client.listTools();
                const tool = tools.find(
                    (t) => t.name === "get_problem_progress"
                );

                expect(tool).toBeDefined();
                expect(tool?.description).toContain("problem-solving");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_problem_progress successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_problem_progress",
                    arguments: {
                        offset: 0,
                        limit: 10,
                        questionStatus: "SOLVED",
                        difficulty: ["EASY"]
                    }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchUserProgressQuestionList
                ).toHaveBeenCalledWith({
                    offset: 0,
                    limit: 10,
                    questionStatus: "SOLVED",
                    difficulty: ["EASY"]
                });
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return error when service throws auth error",
            async () => {
                const failingService = createMockLeetCodeService();
                vi.mocked(
                    failingService.fetchUserProgressQuestionList
                ).mockRejectedValue(
                    new Error(
                        "Authentication required to fetch user progress question list"
                    )
                );
                const failingClient = await createTestClient({}, (server) => {
                    registerUserTools(server, failingService as any);
                });

                try {
                    const result: any = await failingClient.client.callTool({
                        name: "get_problem_progress",
                        arguments: { offset: 0, limit: 10 }
                    });

                    assertions.hasToolResultStructure(result);
                    const data = JSON.parse(result.content[0].text as string);
                    expect(data.error).toContain(
                        "Failed to fetch user progress questions"
                    );
                } finally {
                    await failingClient.cleanup();
                }
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("get_all_submissions", () => {
        it(
            "should list get_all_submissions tool",
            async () => {
                const { tools } = await testClient.client.listTools();
                const tool = tools.find(
                    (t) => t.name === "get_all_submissions"
                );

                expect(tool).toBeDefined();
                expect(tool?.description).toContain("submissions");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should execute get_all_submissions successfully",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "get_all_submissions",
                    arguments: {
                        limit: 10,
                        offset: 0,
                        questionSlug: "two-sum"
                    }
                });

                assertions.hasToolResultStructure(result);
                expect(
                    mockService.fetchUserAllSubmissions
                ).toHaveBeenCalledWith({
                    offset: 0,
                    limit: 10,
                    questionSlug: "two-sum"
                });
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should return error when service throws auth error",
            async () => {
                const failingService = createMockLeetCodeService();
                vi.mocked(
                    failingService.fetchUserAllSubmissions
                ).mockRejectedValue(
                    new Error(
                        "Authentication required to fetch user submissions"
                    )
                );
                const failingClient = await createTestClient({}, (server) => {
                    registerUserTools(server, failingService as any);
                });

                try {
                    const result: any = await failingClient.client.callTool({
                        name: "get_all_submissions",
                        arguments: { limit: 10, offset: 0 }
                    });

                    assertions.hasToolResultStructure(result);
                    const data = JSON.parse(result.content[0].text as string);
                    expect(data.error).toContain(
                        "Failed to fetch user submissions"
                    );
                } finally {
                    await failingClient.cleanup();
                }
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
