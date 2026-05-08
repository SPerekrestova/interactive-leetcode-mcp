/**
 * Runner Tools Integration Tests
 *
 * Drives `run_local_tests` and `runner_doctor` through the MCP wire,
 * with a fake `LocalRunner` that records what it was called with so we
 * can assert the tool layer's behaviour without depending on `python3`
 * being installed where these tests run.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionService } from "../../src/domain/session-service.js";
import { FileSessionStore } from "../../src/domain/session-store.js";
import { registerRunnerTools } from "../../src/mcp/tools/runner-tools.js";
import type { LocalRunner } from "../../src/runner/runner.js";
import {
    ErrorCode,
    LeetCodeError,
    type RunInput,
    type RunResult,
    type RunnerCapabilities
} from "../../src/types/index.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

const HAPPY_RESULT: RunResult = {
    passed: true,
    exitCode: 0,
    stdout: "ok\n",
    stderr: "",
    timedOut: false,
    durationMs: 42,
    sandbox: "none",
    warning: "No OS sandbox available on this host; ran without isolation."
};

const FAKE_CAPS: RunnerCapabilities = {
    languages: [
        { language: "python3", available: true, version: "Python 3.12.0" },
        { language: "go", available: false },
        { language: "java", available: false }
    ],
    sandbox: { kind: "none", available: false }
};

interface FakeRunnerOptions {
    nextResult?: RunResult;
    runError?: unknown;
}

function createFakeRunner(options: FakeRunnerOptions = {}): LocalRunner & {
    runs: RunInput[];
} {
    const runs: RunInput[] = [];
    return {
        runs,
        async run(input: RunInput): Promise<RunResult> {
            runs.push(input);
            if (options.runError) {
                throw options.runError;
            }
            return options.nextResult ?? HAPPY_RESULT;
        },
        async capabilities(): Promise<RunnerCapabilities> {
            return FAKE_CAPS;
        }
    };
}

describe("Runner Tools Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;
    let sessions: SessionService;
    let sessionDir: string;
    let runner: ReturnType<typeof createFakeRunner>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();
        sessionDir = await mkdtemp(join(tmpdir(), "leetcode-mcp-runner-"));
        sessions = new SessionService(
            new FileSessionStore({ dir: sessionDir })
        );
        runner = createFakeRunner();

        testClient = await createTestClient({}, (server) => {
            registerRunnerTools(server, mockService as any, sessions, runner);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
        await rm(sessionDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    describe("run_local_tests", () => {
        it(
            "rejects with SESSION_NOT_FOUND when no session has been opened",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "run_local_tests",
                    arguments: {
                        titleSlug: "two-sum",
                        language: "python3",
                        code: "print('hi')"
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.code).toBe(ErrorCode.SESSION_NOT_FOUND);
                expect(runner.runs).toHaveLength(0);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "delegates to the runner and records lastLocalRunPassed",
            async () => {
                await sessions.startOrResume({ slug: "two-sum" });

                const result: any = await testClient.client.callTool({
                    name: "run_local_tests",
                    arguments: {
                        titleSlug: "two-sum",
                        language: "python3",
                        code: 'print("hi")'
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.titleSlug).toBe("two-sum");
                expect(payload.result.passed).toBe(true);
                expect(runner.runs).toHaveLength(1);
                expect(runner.runs[0].language).toBe("python3");
                expect(runner.runs[0].code).toBe('print("hi")');

                const session = await sessions.requireSession("two-sum");
                expect(session.lastLocalRunPassed).toBe(true);
                expect(session.attempts).toBe(1);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "records lastLocalRunPassed=false on a failing run",
            async () => {
                await sessions.startOrResume({ slug: "two-sum" });
                const failing = createFakeRunner({
                    nextResult: { ...HAPPY_RESULT, passed: false, exitCode: 1 }
                });
                // Re-build the test client with the failing runner.
                await testClient.cleanup();
                testClient = await createTestClient({}, (server) => {
                    registerRunnerTools(
                        server,
                        mockService as any,
                        sessions,
                        failing
                    );
                });

                await testClient.client.callTool({
                    name: "run_local_tests",
                    arguments: {
                        titleSlug: "two-sum",
                        language: "python3",
                        code: "raise SystemExit(1)"
                    }
                });

                const session = await sessions.requireSession("two-sum");
                expect(session.lastLocalRunPassed).toBe(false);
                expect(session.attempts).toBe(1);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "surfaces RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE thrown from the runner",
            async () => {
                await sessions.startOrResume({ slug: "two-sum" });
                const broken = createFakeRunner({
                    runError: new LeetCodeError(
                        ErrorCode.RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE,
                        "Go runner ships in Phase 4b"
                    )
                });
                await testClient.cleanup();
                testClient = await createTestClient({}, (server) => {
                    registerRunnerTools(
                        server,
                        mockService as any,
                        sessions,
                        broken
                    );
                });

                const result: any = await testClient.client.callTool({
                    name: "run_local_tests",
                    arguments: {
                        titleSlug: "two-sum",
                        language: "go",
                        code: "package main"
                    }
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.code).toBe(
                    ErrorCode.RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE
                );

                // The session attempt counter should NOT bump on a
                // pre-run rejection.
                const session = await sessions.requireSession("two-sum");
                expect(session.attempts).toBe(0);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("runner_doctor", () => {
        it(
            "returns the capabilities snapshot",
            async () => {
                const result: any = await testClient.client.callTool({
                    name: "runner_doctor",
                    arguments: {}
                });

                assertions.hasToolResultStructure(result);
                const payload = JSON.parse(result.content[0].text);
                expect(payload.languages).toBeDefined();
                expect(payload.sandbox).toBeDefined();
                expect(
                    payload.languages.find(
                        (l: { language: string }) => l.language === "python3"
                    )?.available
                ).toBe(true);
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
