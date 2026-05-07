import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionService } from "../../domain/session-service.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { errorEnvelope } from "./session-tools.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Solution tool registry — community-solution access.
 *
 * Both tools are gated by the pedagogy state machine: they reject with
 * `HINT_LEVEL_TOO_LOW` until the active session for the slug has reached
 * the maximum hint level. The agent is expected to drive the user
 * through `request_hint` first.
 */
export class SolutionToolRegistry extends ToolRegistry {
    constructor(
        server: McpServer,
        leetcodeService: LeetcodeServiceInterface,
        private readonly sessions: SessionService
    ) {
        super(server, leetcodeService);
    }

    protected registerPublic(): void {
        this.server.registerTool(
            "list_problem_solutions",
            {
                description:
                    "Retrieves community solution metadata (topicIds) for a problem. GATED: rejects with HINT_LEVEL_TOO_LOW unless the active session for the slug has reached the maximum hint level. Drive the user through request_hint until that level is reached.",
                inputSchema: {
                    questionSlug: z
                        .string()
                        .describe(
                            "The URL slug of the problem (e.g., 'two-sum')."
                        ),
                    limit: z
                        .number()
                        .optional()
                        .default(10)
                        .describe(
                            "Maximum number of solutions to return per request. Default 10. Must be a positive integer."
                        ),
                    skip: z
                        .number()
                        .optional()
                        .describe(
                            "Number of solutions to skip before collecting results. Used with `limit` for pagination."
                        ),
                    orderBy: z
                        .enum(["HOT", "MOST_RECENT", "MOST_VOTES"])
                        .default("HOT")
                        .optional()
                        .describe(
                            "Sorting criteria. 'HOT' is LeetCode's default (recency × popularity), 'MOST_VOTES' = upvotes, 'MOST_RECENT' = newest."
                        ),
                    userInput: z
                        .string()
                        .optional()
                        .describe(
                            "Search term to filter solutions by title, content, or author name. Case-insensitive."
                        ),
                    tagSlugs: z
                        .array(z.string())
                        .optional()
                        .default([])
                        .describe(
                            "Tag slugs to filter by (languages or algorithm tags). Solutions must match at least one tag."
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
                    await this.sessions.assertSolutionUnlocked(questionSlug);
                    const data =
                        await this.leetcodeService.fetchQuestionSolutionArticles(
                            questionSlug,
                            { limit, skip, orderBy, userInput, tagSlugs }
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
                } catch (error) {
                    return errorEnvelope("Failed to fetch solutions", error);
                }
            }
        );

        this.server.registerTool(
            "get_problem_solution",
            {
                description:
                    "Retrieves the full content of a specific community solution. GATED: rejects with HINT_LEVEL_TOO_LOW unless the session for `titleSlug` has reached the maximum hint level. Pass the topicId returned by `list_problem_solutions`.",
                inputSchema: {
                    topicId: z
                        .string()
                        .describe(
                            "The unique topic ID of the solution, returned by list_problem_solutions."
                        ),
                    titleSlug: z
                        .string()
                        .describe(
                            "The URL slug of the problem the solution belongs to. Required to verify the session has reached the unlock level."
                        )
                }
            },
            async ({ topicId, titleSlug }) => {
                try {
                    await this.sessions.assertSolutionUnlocked(titleSlug);
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
                                    titleSlug,
                                    solution: data
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope(
                        "Failed to fetch solution detail",
                        error
                    );
                }
            }
        );
    }
}

export function registerSolutionTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface,
    sessions: SessionService
): void {
    const registry = new SolutionToolRegistry(
        server,
        leetcodeService,
        sessions
    );
    registry.register();
}
