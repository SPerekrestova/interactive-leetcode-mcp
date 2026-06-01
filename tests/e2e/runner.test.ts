/**
 * Local-runner e2e: spawn the real `build/index.js`, drive
 * `runner_doctor` and `run_local_tests` over the wire, and assert the
 * runner actually executes Python on the host.
 *
 * Skipped automatically on hosts without `python3` so the suite stays
 * portable; the project's CI image has it.
 */
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { spawnServer, type SpawnedServer } from "./harness/spawn-server.js";

interface ToolTextResult {
    content: Array<{ type: string; text: string }>;
}

const TWO_SUM_PROBLEM = {
    questionId: "1",
    questionFrontendId: "1",
    title: "Two Sum",
    titleSlug: "two-sum",
    difficulty: "Easy",
    isPaidOnly: false,
    content: "<p>Two Sum problem</p>",
    topicTags: [{ name: "Array", slug: "array" }],
    codeSnippets: [
        {
            lang: "Python3",
            langSlug: "python3",
            code: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n"
        }
    ],
    similarQuestions: "[]",
    exampleTestcases: "[2,7,11,15]\n9",
    hints: [],
    stats: '{"totalAccepted":"10M","totalSubmission":"20M","acRate":"50.0%"}'
};

const FIXTURE = {
    graphql: [
        {
            operationContains: "question(titleSlug:",
            response: { data: { question: TWO_SUM_PROBLEM } }
        }
    ]
};

function pythonAvailable(): boolean {
    try {
        execFileSync("python3", ["--version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

const PYTHON_PRESENT = pythonAvailable();

describe.skipIf(!PYTHON_PRESENT)("e2e: local runner (python3)", () => {
    let spawned: SpawnedServer | undefined;

    afterEach(async () => {
        if (spawned) {
            await spawned.cleanup();
            spawned = undefined;
        }
    });

    it("runner_doctor reports python3 availability", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        const doctor = (await spawned.client.callTool({
            name: "runner_doctor",
            arguments: {}
        })) as ToolTextResult;

        const payload = JSON.parse(doctor.content[0].text);
        expect(payload.languages).toBeDefined();
        const py = payload.languages.find(
            (l: { language: string }) => l.language === "python3"
        );
        expect(py?.available).toBe(true);
        expect(payload.sandbox).toBeDefined();
    });

    it("rejects run_local_tests when no session is open", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        const result = (await spawned.client.callTool({
            name: "run_local_tests",
            arguments: {
                titleSlug: "two-sum",
                language: "python3",
                code: "print('ok')"
            }
        })) as ToolTextResult;

        const payload = JSON.parse(result.content[0].text);
        expect(payload.code).toBe("SESSION_NOT_FOUND");
    });

    it("executes a passing python script and updates the session", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum", language: "python3" }
        });

        const run = (await spawned.client.callTool({
            name: "run_local_tests",
            arguments: {
                titleSlug: "two-sum",
                language: "python3",
                code: 'print("hi")\nassert 1 + 1 == 2'
            }
        })) as ToolTextResult;

        const payload = JSON.parse(run.content[0].text);
        expect(payload.titleSlug).toBe("two-sum");
        expect(payload.result.passed).toBe(true);
        expect(payload.result.exitCode).toBe(0);
        expect(payload.result.timedOut).toBe(false);
        expect(payload.result.stdout).toContain("hi");

        // Session state is observable via get_session_state.
        const state = (await spawned.client.callTool({
            name: "get_session_state",
            arguments: { titleSlug: "two-sum" }
        })) as ToolTextResult;
        const sessionPayload = JSON.parse(state.content[0].text);
        expect(sessionPayload.session.lastLocalRunPassed).toBe(true);
        expect(sessionPayload.session.attempts).toBe(1);
    });

    it("captures non-zero exit code without throwing", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum", language: "python3" }
        });

        const run = (await spawned.client.callTool({
            name: "run_local_tests",
            arguments: {
                titleSlug: "two-sum",
                language: "python3",
                code: "raise SystemExit(2)"
            }
        })) as ToolTextResult;

        const payload = JSON.parse(run.content[0].text);
        expect(payload.result.passed).toBe(false);
        expect(payload.result.exitCode).toBe(2);

        const state = (await spawned.client.callTool({
            name: "get_session_state",
            arguments: { titleSlug: "two-sum" }
        })) as ToolTextResult;
        const sessionPayload = JSON.parse(state.content[0].text);
        expect(sessionPayload.session.lastLocalRunPassed).toBe(false);
    });

    it("kills runaway processes after the timeout budget", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum", language: "python3" }
        });

        const run = (await spawned.client.callTool({
            name: "run_local_tests",
            arguments: {
                titleSlug: "two-sum",
                language: "python3",
                code: "while True: pass",
                timeoutMs: 500
            }
        })) as ToolTextResult;

        const payload = JSON.parse(run.content[0].text);
        expect(payload.result.timedOut).toBe(true);
        expect(payload.result.passed).toBe(false);
    });

    it("rejects unimplemented languages with RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum", language: "go" }
        });

        const run = (await spawned.client.callTool({
            name: "run_local_tests",
            arguments: {
                titleSlug: "two-sum",
                language: "go",
                code: "package main\nfunc main() {}"
            }
        })) as ToolTextResult;

        const payload = JSON.parse(run.content[0].text);
        expect(payload.code).toBe("RUNNER_NOT_IMPLEMENTED_FOR_LANGUAGE");
    });

    it("blocks submit_solution under strict mode until run_local_tests passes", async () => {
        spawned = await spawnServer({
            fixture: FIXTURE,
            env: { LEETCODE_MCP_STRICT_MODE: "1" }
        });

        await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum", language: "python3" }
        });

        // First submit attempt: no run_local_tests yet → rejected.
        const blocked = (await spawned.client.callTool({
            name: "submit_solution",
            arguments: {
                problemSlug: "two-sum",
                code: "def twoSum(nums, target): pass",
                language: "python3"
            }
        })) as ToolTextResult;
        const blockedPayload = JSON.parse(blocked.content[0].text);
        expect(blockedPayload.code).toBe("LOCAL_TESTS_NOT_PASSED");

        // Run locals successfully.
        const run = (await spawned.client.callTool({
            name: "run_local_tests",
            arguments: {
                titleSlug: "two-sum",
                language: "python3",
                code: 'print("ok")'
            }
        })) as ToolTextResult;
        const runPayload = JSON.parse(run.content[0].text);
        expect(runPayload.result.passed).toBe(true);

        // Submit again: strict mode now permits it (the upstream
        // request itself will fail via nock — we don't care; the gate
        // is what we're locking down here).
        const allowed = (await spawned.client.callTool({
            name: "submit_solution",
            arguments: {
                problemSlug: "two-sum",
                code: "def twoSum(nums, target): pass",
                language: "python3"
            }
        })) as ToolTextResult;
        const allowedPayload = JSON.parse(allowed.content[0].text);
        expect(allowedPayload.code).not.toBe("LOCAL_TESTS_NOT_PASSED");
    });
});
