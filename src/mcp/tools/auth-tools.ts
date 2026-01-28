import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import { z } from "zod";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import { openDefaultBrowser } from "../../utils/browser-launcher.js";
import { credentialsStorage } from "../../utils/credentials.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Auth tool registry class that handles registration of LeetCode authentication tools.
 * Uses AI-guided manual credential entry for maximum reliability and cross-platform compatibility.
 */
export class AuthToolRegistry extends ToolRegistry {
    /**
     * Validates LeetCode credentials by making a test API call
     * @param csrf - CSRF token
     * @param session - Session token
     * @returns username if valid, null if invalid
     */
    private async validateCredentials(
        csrf: string,
        session: string
    ): Promise<string | null> {
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

            // Check if user is signed in and return username
            const userStatus = response.data?.data?.userStatus;
            if (userStatus?.isSignedIn === true && userStatus?.username) {
                return userStatus.username;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Attempts to open browser, returns success status
     */
    private async tryOpenBrowser(url: string): Promise<boolean> {
        try {
            openDefaultBrowser(url);
            return true;
        } catch {
            return false;
        }
    }

    protected registerPublic(): void {
        // Tool 1: Start authentication flow
        this.server.registerTool(
            "start_leetcode_auth",
            {
                description:
                    "Initiates LeetCode authentication flow. Opens browser to LeetCode login (if possible) and provides instructions for the AI agent to guide the user through manual credential extraction from browser DevTools."
            },
            async () => {
                const loginUrl = "https://leetcode.com/accounts/login/";
                const browserOpened = await this.tryOpenBrowser(loginUrl);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                status: "awaiting_credentials",
                                browserOpened,
                                loginUrl,
                                instructions: {
                                    step1: "Log in to LeetCode in your browser",
                                    step2_devtools:
                                        "Open DevTools (F12 or Cmd+Option+I on Mac)",
                                    step3_navigate:
                                        "Go to: Application → Cookies → https://leetcode.com",
                                    step4_find:
                                        "Find 'csrftoken' and 'LEETCODE_SESSION' cookies",
                                    step5_copy:
                                        "Copy both values and share them with me",
                                    note: "The AI agent should use the leetcode_authentication_guide prompt to provide detailed step-by-step guidance"
                                }
                            })
                        }
                    ]
                };
            }
        );

        // Tool 2: Save and validate credentials
        this.server.registerTool(
            "save_leetcode_credentials",
            {
                description:
                    "Validates and saves LeetCode credentials provided by the user. Validates credentials by making a test API call to LeetCode, then securely stores them for future authenticated requests.",
                inputSchema: {
                    csrftoken: z
                        .string()
                        .min(1)
                        .describe(
                            "CSRF token from LeetCode cookies (csrftoken)"
                        ),
                    session: z
                        .string()
                        .min(1)
                        .describe(
                            "Session token from LeetCode cookies (LEETCODE_SESSION)"
                        )
                }
            },
            async ({ csrftoken, session }) => {
                try {
                    // Validate credentials
                    const username = await this.validateCredentials(
                        csrftoken,
                        session
                    );

                    if (!username) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        status: "error",
                                        message:
                                            "Invalid credentials. Please ensure you are logged into LeetCode and copied the correct cookie values.",
                                        hint: "Make sure to copy the entire value of both cookies, not just the visible portion."
                                    })
                                }
                            ]
                        };
                    }

                    // Save credentials
                    await credentialsStorage.save({
                        csrftoken,
                        LEETCODE_SESSION: session,
                        createdAt: new Date().toISOString()
                    });

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    status: "success",
                                    username,
                                    message: `Successfully authenticated as ${username}! Your credentials have been saved securely. You can now use all authenticated LeetCode features.`
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
                                    message: `Failed to save credentials: ${error}`,
                                    suggestion:
                                        "Please try the authentication process again."
                                })
                            }
                        ]
                    };
                }
            }
        );

        // Tool 3: Check authentication status
        this.server.registerTool(
            "check_auth_status",
            {
                description:
                    "Checks if LeetCode credentials exist and are still valid. Returns authentication status, username if authenticated, and credential age information."
            },
            async () => {
                try {
                    // Check if credentials exist
                    const credentialsExist = await credentialsStorage.exists();
                    if (!credentialsExist) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        authenticated: false,
                                        message:
                                            "No credentials found. Please use start_leetcode_auth to authenticate."
                                    })
                                }
                            ]
                        };
                    }

                    // Load and validate credentials
                    const credentials = await credentialsStorage.load();
                    if (!credentials) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        authenticated: false,
                                        message:
                                            "Could not load credentials. Please authenticate again."
                                    })
                                }
                            ]
                        };
                    }

                    // Validate credentials are still valid
                    const username = await this.validateCredentials(
                        credentials.csrftoken,
                        credentials.LEETCODE_SESSION
                    );

                    if (!username) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        authenticated: false,
                                        expired: true,
                                        message:
                                            "Credentials have expired. Please authenticate again using start_leetcode_auth."
                                    })
                                }
                            ]
                        };
                    }

                    // Calculate credential age
                    const createdAt = credentials.createdAt
                        ? new Date(credentials.createdAt)
                        : null;
                    const ageInDays = createdAt
                        ? Math.floor(
                              (Date.now() - createdAt.getTime()) /
                                  (1000 * 60 * 60 * 24)
                          )
                        : null;

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    authenticated: true,
                                    username,
                                    credentialsAge: ageInDays
                                        ? `${ageInDays} days`
                                        : "unknown",
                                    message: `Authenticated as ${username}. Credentials are valid.`,
                                    warning:
                                        ageInDays && ageInDays >= 5
                                            ? "Credentials may expire soon (typical lifetime: 7-14 days). If you encounter authentication errors, please re-authenticate."
                                            : null
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
                                    authenticated: false,
                                    message: `Error checking authentication status: ${error}`
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
    leetcodeService: LeetcodeServiceInterface
): void {
    const registry = new AuthToolRegistry(server, leetcodeService);
    registry.register();
}
