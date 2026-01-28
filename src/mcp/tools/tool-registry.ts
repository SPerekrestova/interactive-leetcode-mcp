import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RegistryBase } from "../../common/registry-base.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";

/**
 * Base registry class for LeetCode tools that provides site type detection and authentication status checks.
 * This abstract class defines the framework for registering different categories of tools
 */
export abstract class ToolRegistry extends RegistryBase {
    /**
     * Creates a new tool registry instance.
     *
     * @param server - The MCP server instance to register tools with
     * @param leetcodeService - The LeetCode service implementation to use for API calls
     */
    constructor(
        protected server: McpServer,
        protected leetcodeService: LeetcodeServiceInterface
    ) {
        super(server, leetcodeService);
    }
}
