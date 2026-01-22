import axios, { AxiosError } from "axios";
import { Browser, chromium } from "playwright";
import { LeetCodeCredentials } from "./src/types/credentials.js";
import {
    LeetCodeCheckResponse,
    LeetCodeSubmitResponse,
    SubmissionRequest,
    SubmissionResult
} from "./src/types/submission.js";
import { credentialsStorage } from "./src/utils/credentials.js";

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

async function authorizeLeetCode(
    site: "global" | "cn" = "global"
): Promise<{ success: boolean; message: string; error?: string }> {
    let browser: Browser | null = null;

    try {
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        const loginUrl =
            site === "cn"
                ? "https://leetcode.cn/accounts/login/"
                : LEETCODE_LOGIN_URL;

        await page.goto(loginUrl);
        console.log("Waiting for user to log in...");

        try {
            await page.waitForSelector('[data-cypress="user-menu"]', {
                timeout: 60000
            });
        } catch (error) {
            return {
                success: false,
                message: "Login timeout. Please try again.",
                error: "User did not complete login within 60 seconds"
            };
        }

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
    const credentials = await credentialsStorage.load();

    if (!credentials) {
        return {
            accepted: false,
            errorMessage: "Not authorized. Please run authorization first.",
            statusMessage: "Authorization Required"
        };
    }

    const { problemSlug, code, language } = request;

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

        const checkUrl = `${baseUrl}/submissions/detail/${submissionId}/check/`;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await sleep(1000);

            const checkResponse = await axios.get<LeetCodeCheckResponse>(
                checkUrl,
                {
                    headers: {
                        Cookie: `csrftoken=${credentials.csrftoken}; LEETCODE_SESSION=${credentials.LEETCODE_SESSION}`
                    }
                }
            );

            const result = checkResponse.data;

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

async function testAuthorization() {
    console.log("Testing authorization...");
    const result = await authorizeLeetCode("global");
    console.log("Authorization result:", result);
}

async function testSubmission() {
    console.log("\nTesting submission...");

    // Simple two-sum solution in Java
    const code = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
`.trim();

    const result = await submitSolution({
        problemSlug: "two-sum",
        code,
        language: "java"
    });

    console.log("Submission result:", result);
}

async function main() {
    const command = process.argv[2];

    if (command === "auth") {
        await testAuthorization();
    } else if (command === "submit") {
        await testSubmission();
    } else {
        console.log("Usage: npm run test:manual [auth|submit]");
    }
}

main().catch(console.error);
