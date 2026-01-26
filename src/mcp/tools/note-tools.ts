import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LeetCodeBaseService } from "../../leetcode/leetcode-base-service.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Note tool registry class that handles registration of LeetCode note-related tools.
 * This class manages tools for accessing and searching user notes on LeetCode CN.
 */
export class NoteToolRegistry extends ToolRegistry {}

/**
 * Registers all note-related tools with the MCP server.
 *
 * @param server - The MCP server instance to register tools with
 * @param leetcodeService - The LeetCode service implementation to use for API calls
 */
export function registerNoteTools(
    server: McpServer,
    leetcodeService: LeetCodeBaseService
): void {
    const registry = new NoteToolRegistry(server, leetcodeService);
    registry.register();
}
