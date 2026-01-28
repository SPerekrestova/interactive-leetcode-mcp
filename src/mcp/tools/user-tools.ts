import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * User tool registry class that handles registration of LeetCode user-related tools.
 * This class manages tools for accessing user profiles, submissions, and progress data.
 */
export class UserToolRegistry extends ToolRegistry {
    protected get requiresAuthentication(): boolean {
        return true;
    }

    protected registerPublic(): void {
        // User profile tool
        this.server.registerTool(
            "get_user_profile",
            {
                description:
                    "Retrieves profile information about a LeetCode user, including user stats, solved problems, and profile details",
                inputSchema: {
                    username: z
                        .string()
                        .describe(
                            "LeetCode username to retrieve profile information for"
                        )
                }
            },
            async ({ username }) => {
                const data =
                    await this.leetcodeService.fetchUserProfile(username);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                username: username,
                                profile: data
                            })
                        }
                    ]
                };
            }
        );

        // Recent submissions tool (Global-specific)
        this.server.registerTool(
            "get_recent_submissions",
            {
                description:
                    "Retrieves a user's recent submissions on LeetCode Global, including both accepted and failed submissions with detailed metadata",

                inputSchema: {
                    username: z
                        .string()
                        .describe(
                            "LeetCode username to retrieve recent submissions for"
                        ),
                    limit: z
                        .number()
                        .optional()
                        .default(10)
                        .describe(
                            "Maximum number of submissions to return (optional, defaults to server-defined limit)"
                        )
                }
            },
            async ({ username, limit }) => {
                try {
                    const data =
                        await this.leetcodeService.fetchUserRecentSubmissions(
                            username,
                            limit
                        );
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    username,
                                    submissions: data
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: "Failed to fetch recent submissions",
                                    message: error.message
                                })
                            }
                        ]
                    };
                }
            }
        );

        // Recent accepted submissions tool
        this.server.registerTool(
            "get_recent_ac_submissions",
            {
                description:
                    "Retrieves a user's recent accepted (AC) submissions on LeetCode Global, focusing only on successfully completed problems",
                inputSchema: {
                    username: z
                        .string()
                        .describe(
                            "LeetCode username to retrieve recent accepted submissions for"
                        ),
                    limit: z
                        .number()
                        .optional()
                        .default(10)
                        .describe(
                            "Maximum number of accepted submissions to return (optional, defaults to server-defined limit)"
                        )
                }
            },
            async ({ username, limit }) => {
                try {
                    const data =
                        await this.leetcodeService.fetchUserRecentACSubmissions(
                            username,
                            limit
                        );
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    username,
                                    submissions: data
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: "Failed to fetch recent submissions",
                                    message: error.message
                                })
                            }
                        ]
                    };
                }
            }
        );
    }

    /**
     * Registers tools specific to the Global LeetCode site that require authentication.
     */
    protected registerAuthenticated(): void {
        this.server.registerTool(
            "get_user_status",
            {
                description:
                    "Retrieves the current user's status on LeetCode, including login status, premium membership details, and user information (requires authentication)"
            },
            async () => {
                try {
                    const status = await this.leetcodeService.fetchUserStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    status: status
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({ error: error.message })
                            }
                        ]
                    };
                }
            }
        );

        // Submission detail tool (requires authentication)
        this.server.registerTool(
            "get_problem_submission_report",
            {
                description:
                    "Retrieves detailed information about a specific LeetCode submission by its ID, including source code, runtime stats, and test results (requires authentication)",

                inputSchema: {
                    id: z
                        .number()
                        .describe(
                            "The numerical submission ID to retrieve detailed information for"
                        )
                }
            },
            async ({ id }) => {
                try {
                    const submissionDetail =
                        await this.leetcodeService.fetchUserSubmissionDetail(
                            id
                        );
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    submissionId: id,
                                    detail: submissionDetail
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({ error: error.message })
                            }
                        ]
                    };
                }
            }
        );

        // User progress questions tool (requires authentication)
        this.server.registerTool(
            "get_problem_progress",
            {
                description:
                    "Retrieves the current user's problem-solving status with filtering options, including detailed solution history for attempted or solved questions (requires authentication)",
                inputSchema: {
                    offset: z
                        .number()
                        .default(0)
                        .describe(
                            "The number of questions to skip for pagination purposes"
                        ),
                    limit: z
                        .number()
                        .default(100)
                        .describe(
                            "The maximum number of questions to return in a single request"
                        ),
                    questionStatus: z
                        .enum(["ATTEMPTED", "SOLVED"])
                        .optional()
                        .describe(
                            "Filter by question status: 'ATTEMPTED' for questions that have been tried but not necessarily solved, 'SOLVED' for questions that have been successfully completed"
                        ),
                    difficulty: z
                        .array(z.string())
                        .optional()
                        .describe(
                            "Filter by difficulty levels as an array (e.g., ['EASY', 'MEDIUM', 'HARD']); if not provided, questions of all difficulty levels will be returned"
                        )
                }
            },
            async ({ offset, limit, questionStatus, difficulty }) => {
                try {
                    const filters = {
                        offset,
                        limit,
                        questionStatus,
                        difficulty
                    };

                    const progressQuestions =
                        await this.leetcodeService.fetchUserProgressQuestionList(
                            filters
                        );
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    filters,
                                    questions: progressQuestions
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: "Failed to fetch user progress questions",
                                    message: error.message
                                })
                            }
                        ]
                    };
                }
            }
        );

        // Global user submissions tool (requires authentication)
        this.server.registerTool(
            "get_all_submissions",
            {
                description:
                    "Retrieves a paginated list of the current user's submissions for a specific problem or all problems on LeetCode Global, with detailed submission metadata (requires authentication)",
                inputSchema: {
                    limit: z
                        .number()
                        .default(20)
                        .describe(
                            "Maximum number of submissions to return per page (typically defaults to 20 if not specified)"
                        ),
                    offset: z
                        .number()
                        .default(0)
                        .describe(
                            "Number of submissions to skip for pagination purposes"
                        ),
                    questionSlug: z
                        .string()
                        .optional()
                        .describe(
                            "Optional problem identifier (slug) to filter submissions for a specific problem (e.g., 'two-sum'); if omitted, returns submissions across all problems"
                        )
                }
            },
            async ({ questionSlug, limit, offset }) => {
                try {
                    const submissions =
                        await this.leetcodeService.fetchUserAllSubmissions({
                            offset,
                            limit,
                            questionSlug
                        });
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    problem: questionSlug,
                                    submissions: submissions
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: "Failed to fetch user submissions",
                                    message: error.message
                                })
                            }
                        ]
                    };
                }
            }
        );
    }
}

/**
 * Registers all user-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 */
export function registerUserTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface
): void {
    const registry = new UserToolRegistry(server, leetcodeService);
    registry.register();
}
