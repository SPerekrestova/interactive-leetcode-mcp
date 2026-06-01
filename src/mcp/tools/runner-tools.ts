import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SessionService } from "../../domain/session-service.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";
import {
    IMPLEMENTED_LANGUAGES,
    SUPPORTED_LANGUAGES,
    type LocalRunner
} from "../../runner/runner.js";
import type { RunnerLanguage } from "../../types/index.js";
import { ErrorCode, LeetCodeError } from "../../types/index.js";
import { errorEnvelope } from "./session-tools.js";
import { ToolRegistry } from "./tool-registry.js";

/**
 * Local-runner tools introduced in Phase 4.
 *
 * `run_local_tests` is the inner-loop primitive: agent passes code,
 * runner spawns a sandboxed subprocess, captures stdout/stderr/exit
 * code, and reports back. The session's `lastLocalRunPassed` flag is
 * updated as a side effect so `submit_solution`'s strict-mode gate
 * (Phase 6) and any future analytics have a stable hook.
 *
 * v1 deliberately does *not* parse `exampleTestcases` server-side or
 * synthesize a per-problem harness. The agent — which already has the
 * problem in context after `start_problem` — is responsible for adding
 * test invocations to the code it submits to the runner. That keeps
 * the wire surface tiny, language-agnostic, and free of LeetCode-
 * specific signature parsing.
 */
export class RunnerToolRegistry extends ToolRegistry {
    constructor(
        server: McpServer,
        leetcodeService: LeetcodeServiceInterface,
        private readonly sessions: SessionService,
        private readonly runner: LocalRunner
    ) {
        super(server, leetcodeService);
    }

    protected registerPublic(): void {
        this.registerRunLocalTests();
        this.registerDoctor();
    }

    private registerRunLocalTests(): void {
        const supportedLiteral = z.enum(
            SUPPORTED_LANGUAGES as unknown as [string, ...string[]]
        );
        this.server.registerTool(
            "run_local_tests",
            {
                description:
                    "Runs the user's code locally in an isolated subprocess, captures stdout / stderr / exit code, and updates the session's lastLocalRunPassed flag. Use this in the inner loop instead of submit_solution — it costs no LeetCode submission and turns around in seconds. The agent is responsible for including test invocations (e.g. `print(Solution().twoSum([2,7,11,15], 9))`) in the code passed in. Phase 4a ships python3; go and java land in Phase 4b/4c.",
                inputSchema: {
                    titleSlug: z
                        .string()
                        .min(1)
                        .describe(
                            "The URL slug of the problem (must match an active session opened with start_problem)."
                        ),
                    language: supportedLiteral.describe(
                        `Language to execute as. Currently runnable: ${IMPLEMENTED_LANGUAGES.join(
                            ", "
                        )}. Other LeetCode languages remain valid for submit_solution.`
                    ),
                    code: z
                        .string()
                        .min(1)
                        .describe(
                            "Complete source code to execute. Should include test invocations that print results / raise on failure."
                        ),
                    timeoutMs: z
                        .number()
                        .int()
                        .min(100)
                        .max(60_000)
                        .optional()
                        .describe(
                            "Optional wall-clock budget in milliseconds. Defaults to 5000."
                        )
                }
            },
            async ({ titleSlug, language, code, timeoutMs }) => {
                try {
                    // Require a session — keeps the runner aligned with
                    // the pedagogy state machine (and gives us a sane
                    // place to record `attempts` / `lastLocalRunPassed`).
                    await this.sessions.requireSession(titleSlug);

                    const result = await this.runner.run({
                        titleSlug,
                        language: language as RunnerLanguage,
                        code,
                        timeoutMs
                    });

                    await this.sessions.recordLocalRun(
                        titleSlug,
                        result.passed
                    );

                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: JSON.stringify({
                                    titleSlug,
                                    language,
                                    result
                                })
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope(
                        "Failed to run local tests",
                        wrapTimeout(error)
                    );
                }
            }
        );
    }

    private registerDoctor(): void {
        this.server.registerTool(
            "runner_doctor",
            {
                description:
                    "Reports which language runtimes (python3, go, java) and OS sandbox tools (bwrap, firejail, sandbox-exec) are detected on this host. Useful for diagnosing 'LANGUAGE_RUNTIME_NOT_FOUND' errors and confirming whether run_local_tests will be sandboxed.",
                inputSchema: {}
            },
            async () => {
                try {
                    const capabilities = await this.runner.capabilities();
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: JSON.stringify(capabilities)
                            }
                        ]
                    };
                } catch (error) {
                    return errorEnvelope(
                        "Failed to inspect runner capabilities",
                        error
                    );
                }
            }
        );
    }
}

/**
 * `RUNNER_TIMEOUT` is reported as a plain `RunResult` with `timedOut: true`,
 * not as a thrown error — but `run` itself can throw for the runtime-
 * not-found / language-not-implemented cases. Anything else is normalised
 * into `UPSTREAM_ERROR` by the shared envelope.
 */
function wrapTimeout(error: unknown): unknown {
    if (error instanceof LeetCodeError) {
        return error;
    }
    if (error instanceof Error && /timed out/i.test(error.message)) {
        return new LeetCodeError(
            ErrorCode.RUNNER_TIMEOUT,
            error.message,
            error
        );
    }
    return error;
}

export function registerRunnerTools(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface,
    sessions: SessionService,
    runner: LocalRunner
): void {
    const registry = new RunnerToolRegistry(
        server,
        leetcodeService,
        sessions,
        runner
    );
    registry.register();
}
