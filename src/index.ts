#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Credential, LeetCode } from "leetcode-query";
import minimist from "minimist";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LeetCodeGlobalService } from "./leetcode/leetcode-global-service.js";
import { LeetcodeServiceInterface } from "./leetcode/leetcode-service-interface.js";
import { registerAuthPrompts } from "./mcp/prompts/auth-prompts.js";
import { registerLearningPrompts } from "./mcp/prompts/learning-prompts.js";
import { registerProblemResources } from "./mcp/resources/problem-resources.js";
import { registerSolutionResources } from "./mcp/resources/solution-resources.js";
import { registerAuthTools } from "./mcp/tools/auth-tools.js";
import { registerContestTools } from "./mcp/tools/contest-tools.js";
import { registerProblemTools } from "./mcp/tools/problem-tools.js";
import { registerSolutionTools } from "./mcp/tools/solution-tools.js";
import { registerSubmissionTools } from "./mcp/tools/submission-tools.js";
import { registerUserTools } from "./mcp/tools/user-tools.js";
import logger from "./utils/logger.js";

/**
 * Validates that the current Node.js version meets minimum requirements.
 * @throws Error if Node.js version is below the minimum required version
 */
function validateNodeVersion() {
    const currentVersion = process.versions.node;
    const majorVersion = parseInt(currentVersion.split(".")[0], 10);
    const minVersion = 20;

    if (majorVersion < minVersion) {
        console.error(
            `Node.js version ${currentVersion} is not supported. Please upgrade to Node.js ${minVersion} or higher.`
        );
        process.exit(1);
    }
}

/**
 * Parses and validates command line arguments for the LeetCode MCP Server.
 *
 * @returns Configuration object
 */
function parseArgs() {
    const args = minimist(process.argv.slice(2), {
        boolean: ["help", "version"],
        alias: {
            h: "help",
            v: "version"
        }
    });

    if (args.help) {
        console.error(`LeetCode MCP Server - Model Context Protocol server for LeetCode

  Usage: leetcode-mcp-server [options]

  Options:
    --help, -h                 Show this help message
    --version, -v              Show version number`);
        process.exit(0);
    }

    if (args.version) {
        const packageJSON = getPackageJson();
        console.error(packageJSON.version);
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
    return JSON.parse(readFileSync(packageJSONPath, "utf-8"));
}

/**
 * Sets up graceful shutdown handlers for the process.
 * Ensures the server shuts down cleanly on SIGINT and SIGTERM signals.
 */
function setupShutdownHandlers() {
    const shutdown = (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

/**
 * Main function that initializes and starts the LeetCode MCP Server.
 * This function creates the server, sets up the LeetCode service,
 * registers all tools and resources, and connects the server to the stdio transport.
 */
async function main() {
    validateNodeVersion(); // Ensure Node.js version meets requirements
    parseArgs(); // Handle --help and --version flags
    setupShutdownHandlers(); // Set up graceful shutdown

    const packageJSON = getPackageJson();

    const server = new McpServer({
        name: "LeetCode MCP Server",
        version: packageJSON.version
    });

    const credential: Credential = new Credential();
    const leetcodeService: LeetcodeServiceInterface = new LeetCodeGlobalService(
        new LeetCode(credential),
        credential
    );

    // Register MCP prompts for learning mode and workspace guidance
    registerLearningPrompts(server, leetcodeService);

    // Register MCP prompts for authentication guidance
    registerAuthPrompts(server, leetcodeService);

    registerProblemTools(server, leetcodeService);
    registerUserTools(server, leetcodeService);
    registerContestTools(server, leetcodeService);
    registerSolutionTools(server, leetcodeService);
    registerAuthTools(server, leetcodeService);
    registerSubmissionTools(server, leetcodeService);

    registerProblemResources(server, leetcodeService);
    registerSolutionResources(server, leetcodeService);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("LeetCode MCP Server started successfully");
}

main().catch((error) => {
    logger.error("Failed to start LeetCode MCP Server: %s", error);

    // Provide actionable error messages for common issues
    if (error.message?.includes("ECONNREFUSED")) {
        logger.error(
            "Connection refused. Please check your internet connection and try again."
        );
    } else if (
        error.message?.includes("authentication") ||
        error.message?.includes("authorized")
    ) {
        logger.error(
            "Authentication failed. Please run the authorization tool to log in to LeetCode."
        );
    }

    process.exit(1);
});
