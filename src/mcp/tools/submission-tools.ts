import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios, { AxiosError } from "axios";
import { z } from "zod";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { LeetCodeCredentials } from "../../types/credentials.js";
import {
    LeetCodeCheckResponse,
    LeetCodeSubmitResponse,
    SubmissionRequest,
    SubmissionResult
} from "../../types/submission.js";
import { credentialsStorage } from "../../utils/credentials.js";
import { ToolRegistry } from "./tool-registry.js";

const LANGUAGE_MAP: Record<string, string> = {
    java: "java",
    python: "python3",
    python3: "python3",
    cpp: "cpp",
    "c++": "cpp",
    javascript: "javascript",
    js: "javascript",
    typescript: "typescript",
    ts: "typescript"
};

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getQuestionId(
    problemSlug: string,
    baseUrl: string,
    credentials: LeetCodeCredentials
): Promise<string> {
    const graphqlQuery = {
        query: `
            query questionTitle($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                    questionId
                    questionFrontendId
                }
            }
        `,
        variables: { titleSlug: problemSlug }
    };

    const response = await axios.post(`${baseUrl}/graphql`, graphqlQuery, {
        headers: {
            "Content-Type": "application/json",
            Cookie: `csrftoken=${credentials.csrftoken}; LEETCODE_SESSION=${credentials.LEETCODE_SESSION}`,
            "X-CSRFToken": credentials.csrftoken,
            Referer: `${baseUrl}/problems/${problemSlug}/`
        }
    });

    return response.data.data.question.questionId;
}

export async function submitSolution(
    request: SubmissionRequest
): Promise<SubmissionResult> {
    // Load credentials
    const credentials = await credentialsStorage.load();

    if (!credentials) {
        return {
            accepted: false,
            errorMessage: "Not authorized. Please run authorization first.",
            statusMessage: "Authorization Required"
        };
    }

    const { problemSlug, code, language } = request;

    // Map language to LeetCode's expected format
    const leetcodeLang = LANGUAGE_MAP[language.toLowerCase()];
    if (!leetcodeLang) {
        return {
            accepted: false,
            errorMessage: `Unsupported language: ${language}`,
            statusMessage: "Invalid Language"
        };
    }

    const baseUrl = "https://leetcode.com";

    try {
        // First, get the numeric question ID
        const questionId = await getQuestionId(
            problemSlug,
            baseUrl,
            credentials
        );

        // Submit solution
        const submitUrl = `${baseUrl}/problems/${problemSlug}/submit/`;

        const submitResponse = await axios.post<LeetCodeSubmitResponse>(
            submitUrl,
            {
                lang: leetcodeLang,
                question_id: questionId,
                typed_code: code
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Cookie: `csrftoken=${credentials.csrftoken}; LEETCODE_SESSION=${credentials.LEETCODE_SESSION}`,
                    "X-CSRFToken": credentials.csrftoken,
                    Referer: `${baseUrl}/problems/${problemSlug}/`
                }
            }
        );

        const submissionId = submitResponse.data.submission_id;

        // Poll for results
        const checkUrl = `${baseUrl}/submissions/detail/${submissionId}/check/`;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await sleep(1000); // Wait 1 second between polls

            const checkResponse = await axios.get<LeetCodeCheckResponse>(
                checkUrl,
                {
                    headers: {
                        Cookie: `csrftoken=${credentials.csrftoken}; LEETCODE_SESSION=${credentials.LEETCODE_SESSION}`
                    }
                }
            );

            const result = checkResponse.data;

            // Check if processing is complete
            if (result.state === "SUCCESS") {
                const accepted = result.status_msg === "Accepted";

                if (accepted) {
                    return {
                        accepted: true,
                        runtime: result.runtime,
                        memory: result.memory,
                        statusMessage: "Accepted"
                    };
                } else {
                    // Failed - extract test case info
                    let failedTestCase = "";
                    if (result.input) {
                        failedTestCase = `Input: ${result.input}`;
                        if (result.expected_answer && result.code_answer) {
                            failedTestCase += `\nExpected: ${result.expected_answer}`;
                            failedTestCase += `\nGot: ${result.code_answer}`;
                        }
                    }

                    return {
                        accepted: false,
                        statusMessage: result.status_msg,
                        failedTestCase,
                        errorMessage: result.std_output
                    };
                }
            }

            attempts++;
        }

        // Timeout
        return {
            accepted: false,
            statusMessage: "Timeout",
            errorMessage: "Submission check timed out after 30 seconds"
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.response?.status === 401) {
                return {
                    accepted: false,
                    statusMessage: "Unauthorized",
                    errorMessage: "Session expired. Please re-authorize."
                };
            }

            return {
                accepted: false,
                statusMessage: "Submission Failed",
                errorMessage: axiosError.message
            };
        }

        return {
            accepted: false,
            statusMessage: "Error",
            errorMessage: error instanceof Error ? error.message : String(error)
        };
    }
}

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
                const result = await submitSolution({
                    problemSlug,
                    code,
                    language
                });
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
