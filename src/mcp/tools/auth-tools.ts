import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import { z } from "zod";
import { LeetCodeBaseService } from "../../leetcode/leetcode-base-service.js";
import {
    extractLeetCodeCookies,
    getBrowserCookiePath
} from "../../utils/browser-cookies.js";
import { openDefaultBrowser } from "../../utils/browser-launcher.js";
import { credentialsStorage } from "../../utils/credentials.js";
import {
    clearAuthSession,
    createAuthSession,
    getAuthSession
} from "../auth-state.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Auth tool registry class that handles registration of LeetCode authentication tools.
 */
export class AuthToolRegistry extends ToolRegistry {
    /**
     * Validates LeetCode credentials by making a test API call
     * @param csrf - CSRF token
     * @param session - Session token
     * @returns true if credentials are valid, false otherwise
     */
    private async validateCredentials(
        csrf: string,
        session: string
    ): Promise<boolean> {
        try {
            // Make a simple GraphQL query to validate credentials
            const graphqlQuery = {
                query: `
                    query globalData {
                        userStatus {
                            username
                            isSignedIn
                        }
                    }
                `
            };

            const response = await axios.post(
                "https://leetcode.com/graphql",
                graphqlQuery,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `csrftoken=${csrf}; LEETCODE_SESSION=${session}`,
                        "X-CSRFToken": csrf
                    }
                }
            );

            // Check if user is signed in
            return (
                response.data?.data?.userStatus?.isSignedIn === true &&
                response.data?.data?.userStatus?.username
            );
        } catch {
            return false;
        }
    }

    protected registerPublic(): void {
        // Authorization tool
        this.server.tool(
            "authorize_leetcode",
            "Opens your default browser to LeetCode login page. After logging in, use confirm_leetcode_login to complete authorization.",
            {},
            async () => {
                try {
                    // Create authorization session
                    const sessionId = createAuthSession();

                    // Open browser to LeetCode login
                    const loginUrl = "https://leetcode.com/accounts/login/";
                    openDefaultBrowser(loginUrl);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    status: "pending",
                                    sessionId,
                                    message:
                                        "Browser opened to LeetCode login page. Please complete the login process in your browser, then use the confirm_leetcode_login tool to complete authorization.",
                                    expiresIn: "5 minutes",
                                    nextStep:
                                        "Call confirm_leetcode_login when you have completed login"
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    status: "error",
                                    message: `Could not open browser automatically: ${error}. Please manually visit https://leetcode.com/accounts/login/ and log in, then use confirm_leetcode_login.`
                                })
                            }
                        ]
                    };
                }
            }
        );

        // Confirm login tool
        this.server.tool(
            "confirm_leetcode_login",
            "Confirms LeetCode login completion and extracts cookies from your browser. Call this after logging in via authorize_leetcode.",
            {
                sessionId: z
                    .string()
                    .describe(
                        "Authorization session ID from authorize_leetcode"
                    )
            },
            async ({ sessionId }) => {
                try {
                    // Verify session exists and hasn't expired
                    const session = getAuthSession(sessionId);
                    if (!session) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        status: "error",
                                        message:
                                            "Authorization session expired or not found. Please run authorize_leetcode again."
                                    })
                                }
                            ]
                        };
                    }

                    // Detect browser cookie path
                    const browserInfo = getBrowserCookiePath();
                    if (!browserInfo) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        status: "error",
                                        message:
                                            "Could not detect Chrome, Edge, or Brave browser. Automatic cookie extraction is not supported for other browsers yet.",
                                        manualSteps: [
                                            "1. Open Chrome DevTools (F12)",
                                            "2. Go to Application → Cookies → https://leetcode.com",
                                            "3. Copy values for: csrftoken and LEETCODE_SESSION",
                                            "4. [Future: Use manual_authorize_leetcode tool]"
                                        ]
                                    })
                                }
                            ]
                        };
                    }

                    // Extract cookies from browser
                    const cookies = await extractLeetCodeCookies(
                        browserInfo.path
                    );

                    // Validate cookies by testing API call
                    const isValid = await this.validateCredentials(
                        cookies.csrftoken,
                        cookies.LEETCODE_SESSION
                    );

                    if (!isValid) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        status: "error",
                                        message:
                                            "Extracted cookies are invalid. Please make sure you are logged into LeetCode in your browser and try again."
                                    })
                                }
                            ]
                        };
                    }

                    // Save credentials
                    await credentialsStorage.save({
                        csrftoken: cookies.csrftoken,
                        LEETCODE_SESSION: cookies.LEETCODE_SESSION,
                        browser: browserInfo.browser,
                        createdAt: new Date().toISOString()
                    });

                    // Clear auth session
                    clearAuthSession(sessionId);

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    status: "success",
                                    message: `Successfully authorized using ${browserInfo.browser} cookies. You can now use authenticated LeetCode features.`,
                                    browser: browserInfo.browser
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    status: "error",
                                    message: `Failed to extract cookies: ${error}`,
                                    manualSteps: [
                                        "1. Open Chrome DevTools (F12)",
                                        "2. Go to Application → Cookies → https://leetcode.com",
                                        "3. Copy values for: csrftoken and LEETCODE_SESSION",
                                        "4. [Future: Use manual_authorize_leetcode tool]"
                                    ]
                                })
                            }
                        ]
                    };
                }
            }
        );
    }
}

export function registerAuthTools(
    server: McpServer,
    leetcodeService: LeetCodeBaseService
): void {
    const registry = new AuthToolRegistry(server, leetcodeService);
    registry.register();
}
