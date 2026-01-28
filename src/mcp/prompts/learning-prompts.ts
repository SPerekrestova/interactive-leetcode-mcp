// src/mcp/prompts/learning-prompts.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RegistryBase } from "../../common/registry-base.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";

/**
 * Registry for LeetCode learning mode prompts
 * Provides prompts that guide AI agent behavior for workspace setup and learning mode
 */
export class LearningPromptRegistry extends RegistryBase {
    protected registerPublic(): void {
        // Workspace setup prompt
        this.server.registerPrompt(
            "leetcode_workspace_setup",
            {
                description:
                    "Guides the agent to create a workspace file with code template for a LeetCode problem",
                argsSchema: {
                    language: z
                        .string()
                        .describe(
                            "Programming language (e.g., Python, Java, C++)"
                        ),
                    problemSlug: z
                        .string()
                        .describe("LeetCode problem slug (e.g., two-sum)"),
                    codeTemplate: z
                        .string()
                        .describe("Code template to paste into the file")
                }
            },
            (args) => {
                const { language, problemSlug, codeTemplate } = args;
                const extension = this.getFileExtension(language || "");
                const fileName = `${problemSlug}${extension}`;

                const promptText = `Create a workspace file for this LeetCode problem:

1. Create a file named "${fileName}" in the current directory
2. Paste the following code template into the file:

\`\`\`${(language || "").toLowerCase()}
${codeTemplate}
\`\`\`

${language === "Java" ? "3. Ensure the class name matches the file name and follows Java conventions" : ""}

After creating the file, inform the user that the workspace is ready and they can start implementing their solution.`;

                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: promptText
                            }
                        }
                    ]
                };
            }
        );

        // Learning mode prompt (global, always active)
        this.server.registerPrompt(
            "leetcode_learning_mode",
            {
                description:
                    "Enforces learning-guided mode where the agent provides hints before solutions"
            },
            () => {
                const promptText = `You are in learning-guided mode for LeetCode practice. Follow these guidelines:

1. **Never reveal complete solutions immediately** - The goal is to help users learn, not to solve problems for them

2. **Provide hints in progressive levels:**
   - Level 1: Ask guiding questions about the problem (What pattern do you see? What data structure might help?)
   - Level 2: Suggest general approaches (Consider using a hash map to store...)
   - Level 3: Provide more specific hints (You can iterate through the array once while...)
   - Level 4: Show pseudocode or partial implementation

3. **Ask guiding questions** like:
   - "What is the time complexity of your current approach?"
   - "Could we optimize this with a different data structure?"
   - "What edge cases should we consider?"

4. **Only show complete solutions when:**
   - User explicitly requests "show me the solution"
   - User has attempted the problem and is stuck after multiple hints
   - User wants to compare their solution with an optimal one

5. **Encourage independent thinking** by validating their ideas and helping them work through logic errors

Remember: The best learning happens when users solve problems themselves with guidance, not when they copy solutions.`;

                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: promptText
                            }
                        }
                    ]
                };
            }
        );

        // Problem workflow prompt
        this.server.registerPrompt(
            "leetcode_problem_workflow",
            {
                description:
                    "Guides the complete problem-solving workflow from fetch to submission",
                argsSchema: {
                    problemSlug: z
                        .string()
                        .describe("LeetCode problem slug (e.g., two-sum)"),
                    difficulty: z
                        .string()
                        .describe("Problem difficulty (Easy/Medium/Hard)")
                }
            },
            (args) => {
                const { problemSlug, difficulty } = args;

                const promptText = `Guide the user through this LeetCode problem workflow:

**Problem:** ${problemSlug} (${difficulty})

**Workflow Steps:**

1. **Understand the Problem**
   - Review the problem description and examples
   - Ask the user to explain the problem in their own words
   - Identify constraints and edge cases

2. **Plan the Approach**
   - Discuss potential approaches (brute force, optimized)
   - Consider time/space complexity trade-offs
   - Select an approach to implement

3. **Workspace Setup**
   - Create workspace file with code template
   - Ensure proper setup for the chosen language

4. **Implementation**
   - Provide hints as needed (follow learning_mode guidelines)
   - Help debug logic errors
   - Encourage testing with provided examples

5. **Optimization**
   - Analyze time/space complexity
   - Discuss potential optimizations
   - Implement improvements if needed

6. **Submission**
   - Test with additional edge cases
   - Submit solution when ready
   - Review submission results and discuss improvements

Keep the user engaged and learning at each step. Adjust the level of guidance based on their progress and comfort level.`;

                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: promptText
                            }
                        }
                    ]
                };
            }
        );
    }

    /**
     * Maps programming language to file extension
     */
    private getFileExtension(language: string): string {
        const extensionMap: Record<string, string> = {
            python: ".py",
            python3: ".py",
            java: ".java",
            javascript: ".js",
            typescript: ".ts",
            "c++": ".cpp",
            cpp: ".cpp",
            c: ".c",
            "c#": ".cs",
            csharp: ".cs",
            go: ".go",
            rust: ".rs",
            ruby: ".rb",
            swift: ".swift",
            kotlin: ".kt",
            scala: ".scala",
            php: ".php"
        };

        return extensionMap[language.toLowerCase()] || ".txt";
    }
}

/**
 * Registers learning mode prompts with the MCP server
 */
export function registerLearningPrompts(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface
): void {
    new LearningPromptRegistry(server, leetcodeService).register();
}
