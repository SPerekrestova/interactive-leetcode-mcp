import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createLocalRunSnapshot } from "../../domain/local-run-snapshot.js";
import type { SessionService } from "../../domain/session-service.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { ErrorCode, LeetCodeError } from "../../types/index.js";
import { errorEnvelope } from "./session-tools.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Submission tool registry class that handles registration of LeetCode submission tools.
 *
 * Phase 4 wires the strict-mode gate (`LEETCODE_MCP_STRICT_MODE=1`):
 * when enabled, `submit_solution` refuses to spend a real LeetCode
 * submission unless the active session's `lastLocalRunPassed === true`.
 * Default is *off* (preserves current behaviour); session is optional
 * so existing flows without `start_problem` aren't broken.
 */
export class SubmissionToolRegistry extends ToolRegistry {
    constructor(
        server: McpServer,
        leetcodeService: LeetcodeServiceInterface,
        private readonly sessions?: SessionService
    ) {
        super(server, leetcodeService);
    }

    private isStrictMode(): boolean {
        const value = process.env.LEETCODE_MCP_STRICT_MODE;
        return value === "1" || value === "true";
    }

    protected registerPublic(): void {
        // Submission tool
        this.server.registerTool(
            "submit_solution",
            {
                description:
                    "Submit a solution to a LeetCode problem and get results. Returns acceptance status, runtime/memory stats, or failed test case details. When LEETCODE_MCP_STRICT_MODE=1 is set, requires `run_local_tests` to have last passed for the problem first — saves real LeetCode submissions for solutions that pass examples locally.",
                inputSchema: {
                    problemSlug: z
                        .string()
                        .describe('The problem slug (e.g., "two-sum")'),
                    code: z.string().describe("The solution code to submit"),
                    language: z
                        .enum([
                            "java",
                            "python",
                            "python3",
                            "c",
                            "cpp",
                            "c++",
                            "csharp",
                            "c#",
                            "javascript",
                            "js",
                            "typescript",
                            "ts",
                            "php",
                            "swift",
                            "kotlin",
                            "dart",
                            "golang",
                            "go",
                            "ruby",
                            "scala",
                            "rust",
                            "racket",
                            "erlang",
                            "elixir"
                        ])
                        .describe("Programming language for the solution")
                }
            },
            async ({ problemSlug, code, language }) => {
                try {
                    if (this.isStrictMode()) {
                        if (!this.sessions) {
                            throw new LeetCodeError(
                                ErrorCode.LOCAL_TESTS_NOT_PASSED,
                                "Strict mode is enabled but no session service is available to verify local test results."
                            );
                        }
                        const session =
                            await this.sessions.requireSession(problemSlug);
                        const snapshot = createLocalRunSnapshot({
                            code,
                            language
                        });
                        if (
                            session.lastLocalRunPassed !== true ||
                            session.lastLocalRunSnapshot !== snapshot
                        ) {
                            throw new LeetCodeError(
                                ErrorCode.LOCAL_TESTS_NOT_PASSED,
                                "Strict mode is enabled and submit_solution requires run_local_tests to pass for the exact code and language being submitted."
                            );
                        }
                    }
                    const result = await this.leetcodeService.submitSolution(
                        problemSlug,
                        code,
                        language
                    );
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: JSON.stringify(result, null, 2)
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope("Failed to submit solution", error);
                }
            }
        );
    }
}

/**
 * Registers all submission-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 * @param sessions - Optional session service used for the strict-mode gate
 */
export function registerSubmissionTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface,
    sessions?: SessionService
): void {
    const registry = new SubmissionToolRegistry(
        server,
        leetcodeService,
        sessions
    );
    registry.register();
}
