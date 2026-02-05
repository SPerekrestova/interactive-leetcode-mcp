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
     * Registers all public components.
     */
    public register(): void {
        this.registerPublic();
    }

    /**
     * Hook for registering components. Override in subclasses.
     */
    protected registerPublic(): void {}
}
