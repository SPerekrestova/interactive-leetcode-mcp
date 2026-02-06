/**
 * Test client factory for creating MCP client-server pairs for testing
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Configuration for test client setup
 */
export interface TestClientConfig {
    /** Server name (default: "Test Server") */
    serverName?: string;
    /** Server version (default: "1.0.0") */
    serverVersion?: string;
    /** Client name (default: "Test Client") */
    clientName?: string;
    /** Client version (default: "1.0.0") */
    clientVersion?: string;
}

/**
 * Result of creating a test client-server pair
 */
export interface TestClientPair {
    /** MCP Server instance */
    server: McpServer;
    /** MCP Client instance */
    client: Client;
    /** Cleanup function to close both client and server */
    cleanup: () => Promise<void>;
}

/**
 * Creates a linked MCP client-server pair for testing
 *
 * IMPORTANT: Register all tools/resources/prompts on the server BEFORE calling this function
 * or pass them via the setupServer callback. MCP servers cannot register capabilities after
 * connecting to a transport.
 *
 * @param config Optional configuration for client and server
 * @param setupServer Optional callback to set up server before connection
 * @returns Test client pair with server, client, and cleanup function
 *
 * @example
 * ```typescript
 * const { server, client, cleanup } = await createTestClient({}, (server) => {
 *     // Register tools/resources/prompts BEFORE connection
 *     server.registerTool("test", ...);
 * });
 *
 * // Use client to test
 * const result = await client.callTool({ name: "test", arguments: {} });
 *
 * // Cleanup
 * await cleanup();
 * ```
 */
export async function createTestClient(
    config: TestClientConfig = {},
    setupServer?: (server: McpServer) => void | Promise<void>
): Promise<TestClientPair> {
    const {
        serverName = "Test Server",
        serverVersion = "1.0.0",
        clientName = "Test Client",
        clientVersion = "1.0.0"
    } = config;

    // Create linked in-memory transports
    const [serverTransport, clientTransport] =
        InMemoryTransport.createLinkedPair();

    // Create server
    const server = new McpServer({
        name: serverName,
        version: serverVersion
    });

    // Set up server BEFORE connecting (if callback provided)
    if (setupServer) {
        await setupServer(server);
    }

    // Create client
    const client = new Client({
        name: clientName,
        version: clientVersion
    });

    // Connect both AFTER server setup
    await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport)
    ]);

    // Cleanup function
    const cleanup = async () => {
        await client.close();
        await server.close();
    };

    return { server, client, cleanup };
}
