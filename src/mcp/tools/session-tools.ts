import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionService } from "../../domain/session-service.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { ErrorCode, isLeetCodeError } from "../../types/index.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Pedagogy-flow tools: session lifecycle + hint progression.
 *
 * These four tools replace the prompt-based "remember to invoke X" flow
 * with explicit, server-tracked state. The agent calls `start_problem`
 * once, then drives `request_hint` until the user has engaged with each
 * level, and only then are the solution-returning tools callable.
 */
export class SessionToolRegistry extends ToolRegistry {
    constructor(
        server: McpServer,
        leetcodeService: LeetcodeServiceInterface,
        private readonly sessions: SessionService
    ) {
        super(server, leetcodeService);
    }

    protected registerPublic(): void {
        this.registerStartProblem();
        this.registerRequestHint();
        this.registerGetSessionState();
        this.registerResetSession();
    }

    private registerStartProblem(): void {
        this.server.registerTool(
            "start_problem",
            {
                description:
                    "Opens (or resumes) a tutoring session for a LeetCode problem. Must be called before request_hint, list_problem_solutions, or get_problem_solution. Idempotent: re-running on a slug the user is already mid-way through preserves their hint progress.",
                inputSchema: {
                    titleSlug: z
                        .string()
                        .min(1)
                        .describe(
                            "The URL slug of the problem (e.g., 'two-sum')."
                        ),
                    language: z
                        .string()
                        .optional()
                        .describe(
                            "Optional: the language the user is solving in. Recorded on the session for future workspace / runner phases."
                        )
                }
            },
            async ({ titleSlug, language }) => {
                try {
                    const problem =
                        await this.leetcodeService.fetchProblemSimplified(
                            titleSlug
                        );
                    const session = await this.sessions.startOrResume({
                        slug: titleSlug,
                        language
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    titleSlug,
                                    session,
                                    problem
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope("Failed to start problem", error);
                }
            }
        );
    }

    private registerRequestHint(): void {
        this.server.registerTool(
            "request_hint",
            {
                description:
                    "Advances the hint level for an active session and returns the next hint. Levels: 1 clarification → 2 approach → 3 implementation sketch → 4 solution unlock. The community-solutions tools become callable only after this has been driven to level 4.",
                inputSchema: {
                    titleSlug: z
                        .string()
                        .min(1)
                        .describe(
                            "The URL slug of the problem the user is working on."
                        )
                }
            },
            async ({ titleSlug }) => {
                try {
                    const problem =
                        await this.leetcodeService.fetchProblemSimplified(
                            titleSlug
                        );
                    const result = await this.sessions.advance(
                        titleSlug,
                        problem
                    );
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    titleSlug,
                                    level: result.level,
                                    hint: result.hint,
                                    session: result.session
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope("Failed to request hint", error);
                }
            }
        );
    }

    private registerGetSessionState(): void {
        this.server.registerTool(
            "get_session_state",
            {
                description:
                    "Returns the persisted session for a problem, or null if the user has not called start_problem for it. Useful for restoring context after a restart.",
                inputSchema: {
                    titleSlug: z
                        .string()
                        .min(1)
                        .describe("The URL slug of the problem.")
                }
            },
            async ({ titleSlug }) => {
                try {
                    const session = await this.sessions.get(titleSlug);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    titleSlug,
                                    session
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope("Failed to read session", error);
                }
            }
        );
    }

    private registerResetSession(): void {
        this.server.registerTool(
            "reset_session",
            {
                description:
                    "Resets the tutoring session for a problem back to hint level 0. Use when the user wants to re-attempt the problem from scratch.",
                inputSchema: {
                    titleSlug: z
                        .string()
                        .min(1)
                        .describe("The URL slug of the problem to reset.")
                }
            },
            async ({ titleSlug }) => {
                try {
                    const session = await this.sessions.reset(titleSlug);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    titleSlug,
                                    session
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope("Failed to reset session", error);
                }
            }
        );
    }
}

/**
 * Renders a `LeetCodeError` (or any unknown failure) into the MCP
 * tool-result envelope shape, with the structured `code` field surfaced
 * alongside the human-readable message so clients can dispatch on it.
 *
 * Returns the MCP SDK tool-result shape; widened from the literal
 * single-content-item type so handler signatures unify with the SDK's
 * inferred return type.
 */
function errorEnvelope(fallbackMessage: string, error: unknown) {
    if (isLeetCodeError(error)) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify({
                        error: fallbackMessage,
                        code: error.code,
                        message: error.message
                    })
                }
            ]
        };
    }
    const message =
        error instanceof Error ? error.message : String(error ?? "unknown");
    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify({
                    error: fallbackMessage,
                    code: ErrorCode.UPSTREAM_ERROR,
                    message
                })
            }
        ]
    };
}
// Re-exported so other tool registries can render the same shape when
// gating on the session service throws.
export { errorEnvelope };

export function registerSessionTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface,
    sessions: SessionService
): void {
    const registry = new SessionToolRegistry(server, leetcodeService, sessions);
    registry.register();
}
