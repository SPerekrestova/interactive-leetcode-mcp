import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Solution tool registry class that handles registration of LeetCode solution-related tools.
 * This class manages tools for accessing solutions, filtering solutions, and reading solution details.
 */
export class SolutionToolRegistry extends ToolRegistry {
    protected registerPublic(): void {
        // Problem solutions listing tool (Global-specific)
        this.server.registerTool(
            "list_problem_solutions",
            {
                description:
                    "Retrieves a list of community solutions for a specific LeetCode problem, including only metadata like topicId. To view the full content of a solution, use the 'get_problem_solution' tool with the topicId returned by this tool.",

                inputSchema: {
                    questionSlug: z
                        .string()
                        .describe(
                            "The URL slug/identifier of the problem to retrieve solutions for (e.g., 'two-sum', 'add-two-numbers'). This is the same string that appears in the LeetCode problem URL after '/problems/'"
                        ),
                    limit: z
                        .number()
                        .optional()
                        .default(10)
                        .describe(
                            "Maximum number of solutions to return per request. Used for pagination and controlling response size. Default is 20 if not specified. Must be a positive integer."
                        ),
                    skip: z
                        .number()
                        .optional()
                        .describe(
                            "Number of solutions to skip before starting to collect results. Used in conjunction with 'limit' for implementing pagination. Default is 0 if not specified. Must be a non-negative integer."
                        ),
                    orderBy: z
                        .enum(["HOT", "MOST_RECENT", "MOST_VOTES"])
                        .default("HOT")
                        .optional()
                        .describe(
                            "Sorting criteria for the returned solutions. 'DEFAULT' sorts by LeetCode's default algorithm (typically a combination of recency and popularity), 'MOST_VOTES' sorts by the number of upvotes (highest first), and 'MOST_RECENT' sorts by publication date (newest first)."
                        ),
                    userInput: z
                        .string()
                        .optional()
                        .describe(
                            "Search term to filter solutions by title, content, or author name. Case insensitive. Useful for finding specific approaches or algorithms mentioned in solutions."
                        ),
                    tagSlugs: z
                        .array(z.string())
                        .optional()
                        .default([])
                        .describe(
                            "Array of tag identifiers to filter solutions by programming languages (e.g., 'python', 'java') or problem algorithm/data-structure tags (e.g., 'dynamic-programming', 'recursion'). Only solutions tagged with at least one of the specified tags will be returned."
                        )
                }
            },
            async ({
                questionSlug,
                limit,
                skip,
                orderBy,
                userInput,
                tagSlugs
            }) => {
                try {
                    const options = {
                        limit,
                        skip,
                        orderBy,
                        userInput,
                        tagSlugs
                    };

                    const data =
                        await this.leetcodeService.fetchQuestionSolutionArticles(
                            questionSlug,
                            options
                        );

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    questionSlug,
                                    solutionArticles: data
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
                                    error: "Failed to fetch solutions",
                                    message: error.message
                                })
                            }
                        ]
                    };
                }
            }
        );

        // Solution article detail tool (Global-specific)
        this.server.registerTool(
            "get_problem_solution",
            {
                description:
                    "Retrieves the complete content and metadata of a specific solution, including the full article text, author information, and related navigation links",

                inputSchema: {
                    topicId: z
                        .string()
                        .describe(
                            "The unique topic ID of the solution to retrieve. This ID can be obtained from the 'topicId' field in the response of the 'list_problem_solutions' tool. Format is typically a string of numbers and letters that uniquely identifies the solution in LeetCode's database."
                        )
                }
            },
            async ({ topicId }) => {
                try {
                    const data =
                        await this.leetcodeService.fetchSolutionArticleDetail(
                            topicId
                        );

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    topicId,
                                    solution: data
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
                                    error: "Failed to fetch solution detail",
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
 * Registers all solution-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 */
export function registerSolutionTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface
): void {
    const registry = new SolutionToolRegistry(server, leetcodeService);
    registry.register();
}
