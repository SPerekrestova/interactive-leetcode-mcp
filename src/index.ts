#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import minimist from "minimist";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LeetCodeBaseService } from "./leetcode/leetcode-base-service.js";
import { LeetCodeServiceFactory } from "./leetcode/leetcode-service-factory.js";
import { registerProblemResources } from "./mcp/resources/problem-resources.js";
import { registerSolutionResources } from "./mcp/resources/solution-resources.js";
import { registerAuthTools } from "./mcp/tools/auth-tools.js";
import { registerContestTools } from "./mcp/tools/contest-tools.js";
import { registerNoteTools } from "./mcp/tools/note-tools.js";
import { registerProblemTools } from "./mcp/tools/problem-tools.js";
import { registerSolutionTools } from "./mcp/tools/solution-tools.js";
import { registerUserTools } from "./mcp/tools/user-tools.js";
import logger from "./utils/logger.js";

/**
 * Parses and validates command line arguments for the LeetCode MCP Server.
 *
 * @returns Configuration object
 */
function parseArgs() {
    const args = minimist(process.argv.slice(2), {
        boolean: ["help"],
        alias: {
            h: "help"
        }
    });

    if (args.help) {
        logger.info(`LeetCode MCP Server - Model Context Protocol server for LeetCode

  Usage: leetcode-mcp-server [options]

  Options:
    --help, -h                 Show this help message`);
        process.exit(0);
    }

    return {};
}

/**
 * Retrieves the package.json object containing metadata about the project.
 *
 * @returns The package.json object containing metadata about the project.
 */
function getPackageJson() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJSONPath = join(__dirname, "..", "package.json");
    const packageJSON = JSON.parse(readFileSync(packageJSONPath, "utf-8"));
    return packageJSON;
}

/**
 * Main function that initializes and starts the LeetCode MCP Server.
 * This function creates the server, sets up the LeetCode service,
 * registers all tools and resources, and connects the server to the stdio transport.
 */
async function main() {
    parseArgs(); // Handle --help flag
    const packageJSON = getPackageJson();

    const server = new McpServer({
        name: "LeetCode MCP Server",
        version: packageJSON.version
    });

    const leetcodeService: LeetCodeBaseService =
        await LeetCodeServiceFactory.createService();

    registerProblemTools(server, leetcodeService);
    registerUserTools(server, leetcodeService);
    registerContestTools(server, leetcodeService);
    registerSolutionTools(server, leetcodeService);
    registerNoteTools(server, leetcodeService);
    registerAuthTools(server, leetcodeService);

    registerProblemResources(server, leetcodeService);
    registerSolutionResources(server, leetcodeService);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    logger.error("Failed to start LeetCode MCP Server: %s", error);
    process.exit(1);
});
