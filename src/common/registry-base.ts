import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeetCodeBaseService } from "../leetcode/leetcode-base-service.js";

/**
 * Abstract base registry class for LeetCode components that provides site type detection and authentication status checks.
 * This class defines the framework for registering different categories of components based on
 * authentication requirements.
 */
export abstract class RegistryBase {
    /**
     * Creates a new registry instance.
     *
     * @param server - The MCP server instance to register components with
     * @param leetcodeService - The LeetCode service implementation to use for API calls
     */
    protected constructor(
        protected server: McpServer,
        protected leetcodeService: LeetCodeBaseService
    ) {}

    /**
     * Determines if the current LeetCode service has valid authentication credentials.
     *
     * @returns True if authenticated, false otherwise
     */
    protected get isAuthenticated(): boolean {
        return this.leetcodeService.isAuthenticated();
    }

    /**
     * Registers all applicable components based on authentication status.
     */
    public register(): void {
        this.registerPublic();

        if (this.isAuthenticated) {
            this.registerPrivate();
        }
    }

    /**
     * Registers public components that don't require authentication.
     * Implementing classes must define this method to register their public components.
     */
    protected registerPublic(): void {}

    /**
     * Registers private components that require authentication.
     * Implementing classes must define this method to register their authenticated components.
     */
    protected registerPrivate(): void {}
}
