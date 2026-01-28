import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeetcodeServiceInterface } from "../leetcode/leetcode-service-interface.js";

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
    constructor(
        protected server: McpServer,
        protected leetcodeService: LeetcodeServiceInterface
    ) {}

    /**
     * Determines if the current LeetCode service has valid authentication credentials.
     *
     * @returns True if authenticated, false otherwise
     */
    get isAuthenticated(): boolean {
        return this.leetcodeService.isAuthenticated();
    }

    /**
     * Registers all applicable components based on authentication status.
     */
    public register(): void {
        this.registerPublic();
        if (this.isAuthenticated) {
            this.registerAuthenticated();
        }
    }

    /**
     * Hook for registering components that don't require authentication.
     * Override this in subclasses.
     */
    protected registerPublic(): void {}

    /**
     * Hook for registering components that require authentication.
     * Override this in subclasses.
     */
    protected registerAuthenticated(): void {}
}
