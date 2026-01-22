import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios, { AxiosError } from "axios";
import { Browser, chromium } from "playwright";
import { z } from "zod";
import { LeetCodeBaseService } from "../../leetcode/leetcode-base-service.js";
import { LeetCodeCredentials } from "../../types/credentials.js";
import {
    LeetCodeCheckResponse,
    LeetCodeSubmitResponse,
    SubmissionRequest,
    SubmissionResult
} from "../../types/submission.js";
import { credentialsStorage } from "../../utils/credentials.js";
import { ToolRegistry } from "./tool-registry.js";

const LEETCODE_LOGIN_URL = "https://leetcode.com/accounts/login/";

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

interface AuthorizationResult {
    success: boolean;
    message: string;
    error?: string;
}

async function authorizeLeetCode(
    site: "global" | "cn" = "global"
): Promise<AuthorizationResult> {
    let browser: Browser | null = null;

    try {
        // Launch browser with visible UI
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        const loginUrl =
            site === "cn"
                ? "https://leetcode.cn/accounts/login/"
                : LEETCODE_LOGIN_URL;

        // Navigate to login page
        await page.goto(loginUrl);

        // Wait for user to complete login (detect successful login by URL change)
        console.log("Waiting for user to log in...");
        console.log("Please log in to LeetCode in the browser window...");

        // Wait for successful login by detecting URL change away from login page
        try {
            await page.waitForFunction(
                () => {
                    const url = window.location.href;
                    return (
                        !url.includes("/accounts/login") &&
                        !url.includes("/accounts/signup")
                    );
                },
                { timeout: 90000 }
            );

            console.log("Login detected! Extracting cookies...");

            // Give a moment for cookies to be set
            await sleep(2000);
        } catch (error) {
            return {
                success: false,
                message: "Login timeout. Please try again.",
                error: "User did not complete login within 90 seconds"
            };
        }

        // Extract cookies
        const cookies = await context.cookies();

        const csrfCookie = cookies.find((c) => c.name === "csrftoken");
        const sessionCookie = cookies.find(
            (c) => c.name === "LEETCODE_SESSION"
        );

        if (!csrfCookie || !sessionCookie) {
            return {
                success: false,
                message: "Failed to extract authentication cookies",
                error: "csrftoken or LEETCODE_SESSION cookie not found"
            };
        }

        // Save credentials
        const credentials: LeetCodeCredentials = {
            csrftoken: csrfCookie.value,
            LEETCODE_SESSION: sessionCookie.value,
            site,
            createdAt: new Date().toISOString()
        };

        await credentialsStorage.save(credentials);

        await browser.close();

        return {
            success: true,
            message: "Successfully authorized with LeetCode! Credentials saved."
        };
    } catch (error) {
        if (browser) {
            await browser.close();
        }

        return {
            success: false,
            message: "Authorization failed",
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function submitSolution(
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

    const baseUrl =
        credentials.site === "cn"
            ? "https://leetcode.cn"
            : "https://leetcode.com";

    try {
        // Submit solution
        const submitUrl = `${baseUrl}/problems/${problemSlug}/submit/`;

        const submitResponse = await axios.post<LeetCodeSubmitResponse>(
            submitUrl,
            {
                lang: leetcodeLang,
                question_id: problemSlug,
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
 * Auth tool registry class that handles registration of LeetCode authentication tools.
 */
export class AuthToolRegistry extends ToolRegistry {
    protected registerCommon(): void {
        // Authorization tool
        this.server.tool(
            "authorize_leetcode",
            "Authorize with LeetCode by launching a browser for one-time login. Saves credentials for future use.",
            {
                site: z
                    .enum(["global", "cn"])
                    .default("global")
                    .describe("LeetCode site to authorize with (global or cn)")
            },
            async ({ site }) => {
                const result = await authorizeLeetCode(site);
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

        // Submission tool
        this.server.tool(
            "submit_solution",
            "Submit a solution to a LeetCode problem and get results. Returns acceptance status, runtime/memory stats, or failed test case details.",
            {
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

    protected registerGlobal(): void {
        // No global-specific auth tools
    }

    protected registerCN(): void {
        // No CN-specific auth tools
    }
}

export function registerAuthTools(
    server: McpServer,
    leetcodeService: LeetCodeBaseService
): void {
    const registry = new AuthToolRegistry(server, leetcodeService);
    registry.registerTools();
}
