import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { ToolRegistry } from "./tool-registry.js";

const USAGE_GUIDE = `# Interactive LeetCode MCP — Usage Guide

## Prompts (must be explicitly invoked — not auto-active)

| Prompt | When to invoke | Params |
|--------|---------------|--------|
| leetcode_learning_mode | START of any practice session, before discussing a problem | none |
| leetcode_problem_workflow | Once the user selects a specific problem | problemSlug, difficulty |
| leetcode_workspace_setup | After problem selection, before user starts coding | language, problemSlug, codeTemplate |
| leetcode_authentication_guide | Whenever auth is needed — first use, 401 errors, or expired credentials | none |

## Session Start Flow

1. Invoke leetcode_learning_mode
2. User picks a problem (daily challenge or search)
3. Invoke leetcode_problem_workflow (problemSlug, difficulty)
4. Invoke leetcode_workspace_setup (language, problemSlug, codeTemplate)
5. Guide user with progressive hints (4 levels)
6. Submit with submit_solution when ready

## Learning Mode Rules

- Never show a full solution without first working through hint levels 1 → 2 → 3
- Level 1: Guiding questions ("What pattern do you see?")
- Level 2: General approaches ("Consider a hash map...")
- Level 3: Specific hints ("Iterate once while tracking seen values...")
- Level 4: Pseudocode or partial implementation
- Only show complete solutions when explicitly requested AFTER earlier hints have been delivered
- get_problem_solution and list_problem_solutions return full community solutions — only use at Level 4 or on explicit "show me the solution" after hints

## Auth Flow

1. Before any auth-sensitive action, call check_auth_status first
2. If not authenticated or expired → invoke leetcode_authentication_guide prompt (do NOT ad-hoc the instructions)
3. The prompt guides: start_leetcode_auth → user extracts cookies → save_leetcode_credentials
4. On success, retry the original action
5. On any 401 from a tool: call check_auth_status → follow steps 2-4

## Submission Language Map

| User says | Pass this to submit_solution |
|-----------|------------------------------|
| Python / Python 3 | python3 |
| Python 2 | python |
| Java | java |
| C++ | cpp |
| JavaScript | javascript |
| TypeScript | typescript |

Default: "Python" without version → python3`;

/**
 * Onboarding tool registry. Provides a get_started tool that returns
 * usage guidance via its response — prompt invocation rules, session
 * flow, learning mode rules, auth flow, and language map.
 */
export class OnboardingToolRegistry extends ToolRegistry {
    protected registerPublic(): void {
        this.server.registerTool(
            "get_started",
            {
                description:
                    "Returns the usage guide for this MCP server: which prompts to invoke and when, session flow, auth flow, and submission language map. Call this at the start of any LeetCode practice session."
            },
            async () => {
                return {
                    content: [
                        {
                            type: "text",
                            text: USAGE_GUIDE
                        }
                    ]
                };
            }
        );
    }
}

export function registerOnboardingTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface
): void {
    const registry = new OnboardingToolRegistry(server, leetcodeService);
    registry.register();
}
