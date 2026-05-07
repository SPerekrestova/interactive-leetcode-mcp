/**
 * E2E regression for the "silent-logout-on-restart" bug fixed in Phase 1.
 *
 * Before the fix, a server restart would re-read the credentials file from
 * `~/.leetcode-mcp/credentials.json` and tell the user they were
 * authenticated, but never actually push the cookies into the in-memory
 * `Credential` the LeetCode client reads from. The very next authenticated
 * tool call then failed with "Authentication required".
 *
 * This spec spawns a real server with a pre-seeded credentials file and a
 * mocked `userStatus` GraphQL response, then calls `check_auth_status` over
 * stdio. If the fix regresses, the tool will report `authenticated: false`
 * and this spec fails.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnServer, type SpawnedServer } from "./harness/spawn-server.js";

interface ToolTextResult {
    content: Array<{ type: string; text: string }>;
}

describe("e2e: auth restore on startup", () => {
    let spawned: SpawnedServer | undefined;
    let seededHome: string | undefined;

    beforeEach(() => {
        spawned = undefined;
        seededHome = undefined;
    });

    afterEach(async () => {
        if (spawned) {
            await spawned.cleanup();
        }
        if (seededHome) {
            await rm(seededHome, { recursive: true, force: true });
        }
    });

    async function makeSeededHome(): Promise<string> {
        const home = await mkdtemp(join(tmpdir(), "leetcode-mcp-e2e-auth-"));
        const dir = join(home, ".leetcode-mcp");
        await mkdir(dir, { recursive: true });
        await writeFile(
            join(dir, "credentials.json"),
            JSON.stringify({
                csrftoken: "test-csrf",
                LEETCODE_SESSION: "test-session",
                createdAt: new Date().toISOString()
            }),
            "utf-8"
        );
        return home;
    }

    it("check_auth_status reports authenticated after a fresh restart", async () => {
        seededHome = await makeSeededHome();

        spawned = await spawnServer({
            home: seededHome,
            fixture: {
                graphql: [
                    {
                        operationContains: "userStatus",
                        response: {
                            data: {
                                userStatus: {
                                    isSignedIn: true,
                                    username: "alice"
                                }
                            }
                        }
                    }
                ]
            }
        });

        const result = (await spawned.client.callTool({
            name: "check_auth_status",
            arguments: {}
        })) as ToolTextResult;

        expect(result.content[0]?.type).toBe("text");
        const payload = JSON.parse(result.content[0].text);
        expect(payload.authenticated).toBe(true);
        expect(payload.username).toBe("alice");
    });

    it("check_auth_status reports unauthenticated when no credentials file exists", async () => {
        spawned = await spawnServer();

        const result = (await spawned.client.callTool({
            name: "check_auth_status",
            arguments: {}
        })) as ToolTextResult;

        const payload = JSON.parse(result.content[0].text);
        expect(payload.authenticated).toBe(false);
    });
});
