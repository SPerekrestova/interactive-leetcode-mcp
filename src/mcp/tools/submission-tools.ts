import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Submission tool registry class that handles registration of LeetCode submission tools.
 */
export class SubmissionToolRegistry extends ToolRegistry {
    protected registerPublic(): void {
        // Submission tool
        this.server.registerTool(
            "submit_solution",
            {
                description:
                    "Submit a solution to a LeetCode problem and get results. Returns acceptance status, runtime/memory stats, or failed test case details.",
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
                            "cpp",
                            "c++",
                            "javascript",
                            "js",
                            "typescript",
                            "ts"
                        ])
                        .describe(
                            "Programming language (java, python, cpp, javascript, typescript)"
                        )
                }
            },
            async ({ problemSlug, code, language }) => {
                const result = await this.leetcodeService.submitSolution(
                    problemSlug,
                    code,
                    language
                );
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }
        );
    }
}

/**
 * Registers all submission-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 */
export function registerSubmissionTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface
): void {
    const registry = new SubmissionToolRegistry(server, leetcodeService);
    registry.register();
}
