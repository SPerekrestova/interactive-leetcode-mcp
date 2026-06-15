#!/usr/bin/env tsx
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { constants } from "node:fs";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonObject = Record<string, unknown>;
type RunnerLanguage = "python3" | "go" | "java";

interface SpawnedDogfoodServer {
    client: Client;
    home: string;
    cleanup(): Promise<void>;
}

interface RunnerSmoke {
    language: RunnerLanguage;
    marker: string;
    code: string;
    timeoutMs?: number;
}

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SERVER_BIN = join(REPO_ROOT, "build", "index.js");
const PRELOAD = join(REPO_ROOT, "tests", "e2e", "harness", "preload.mjs");

const TWO_SUM_PROBLEM = {
    questionId: "1",
    questionFrontendId: "1",
    title: "Two Sum",
    titleSlug: "two-sum",
    difficulty: "Easy",
    isPaidOnly: false,
    content:
        "<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers.</p>",
    topicTags: [{ name: "Array", slug: "array" }],
    codeSnippets: [
        {
            lang: "Python3",
            langSlug: "python3",
            code: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n"
        },
        {
            lang: "Go",
            langSlug: "go",
            code: "package main\n\nfunc main() {}\n"
        },
        {
            lang: "Java",
            langSlug: "java",
            code: "public class Solution {\n    public static void main(String[] args) {}\n}\n"
        }
    ],
    similarQuestions: "[]",
    exampleTestcases: "[2,7,11,15]\n9",
    hints: ["Try storing previously seen numbers in a hash map."],
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

const RUNNER_SMOKES: RunnerSmoke[] = [
    {
        language: "python3",
        marker: "python ok",
        code: 'print("python ok")\nassert 1 + 1 == 2'
    },
    {
        language: "go",
        marker: "go ok",
        timeoutMs: 20_000,
        code: [
            "package main",
            'import "fmt"',
            "func main() {",
            '    fmt.Println("go ok")',
            '    if 1 + 1 != 2 { panic("bad math") }',
            "}"
        ].join("\n")
    },
    {
        language: "java",
        marker: "java ok",
        timeoutMs: 20_000,
        code: [
            "public class Solution {",
            "    public static void main(String[] args) {",
            '        System.out.println("java ok");',
            '        if (1 + 1 != 2) { throw new RuntimeException("bad math"); }',
            "    }",
            "}"
        ].join("\n")
    }
];

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseToolText(result: unknown, toolName: string): JsonObject {
    if (!isJsonObject(result) || !Array.isArray(result.content)) {
        throw new Error(`${toolName} returned a non-standard MCP result`);
    }

    const first = result.content[0];
    if (!isJsonObject(first) || first.type !== "text") {
        throw new Error(`${toolName} did not return text content`);
    }

    const text = first.text;
    if (typeof text !== "string") {
        throw new Error(`${toolName} text content was not a string`);
    }

    const parsed: unknown = JSON.parse(text);
    if (!isJsonObject(parsed)) {
        throw new Error(`${toolName} returned non-object JSON`);
    }
    return parsed;
}

async function callToolJson(
    client: Client,
    name: string,
    args: JsonObject
): Promise<JsonObject> {
    const result = await client.callTool({ name, arguments: args });
    return parseToolText(result, name);
}

async function assertBuiltServerExists(): Promise<void> {
    try {
        await access(SERVER_BIN, constants.X_OK);
    } catch {
        throw new Error(
            `Built server not found at ${SERVER_BIN}. Run "npm run build" first.`
        );
    }
}

async function spawnDogfoodServer(): Promise<SpawnedDogfoodServer> {
    await assertBuiltServerExists();

    const home = await mkdtemp(join(tmpdir(), "leetcode-mcp-dogfood-home-"));
    const fixtureDir = await mkdtemp(
        join(tmpdir(), "leetcode-mcp-dogfood-fixture-")
    );
    const fixturePath = join(fixtureDir, "fixture.json");
    await writeFile(fixturePath, JSON.stringify(FIXTURE), "utf-8");

    const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
    const preloadOption = `--import ${pathToFileURL(PRELOAD).href}`;
    const env: Record<string, string> = {
        PATH: process.env.PATH ?? "",
        HOME: home,
        NODE_OPTIONS: existingNodeOptions
            ? `${existingNodeOptions} ${preloadOption}`
            : preloadOption,
        E2E_FIXTURE_PATH: fixturePath
    };

    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [SERVER_BIN],
        env,
        cwd: REPO_ROOT,
        stderr: "inherit"
    });

    const client = new Client({
        name: "leetcode-mcp-dogfood",
        version: "0.0.0"
    });

    const cleanup = async () => {
        try {
            await client.close();
        } catch {
            // A failed connect may leave the client half-open; cleanup should continue.
        } finally {
            if (process.env.DOGFOOD_KEEP_HOME === "1") {
                console.log(`Keeping dogfood HOME for inspection: ${home}`);
            } else {
                await rm(home, { recursive: true, force: true });
            }
            await rm(fixtureDir, { recursive: true, force: true });
        }
    };

    try {
        await client.connect(transport);
    } catch (error) {
        await cleanup();
        throw error;
    }

    return {
        client,
        home,
        cleanup
    };
}

function languageAvailable(
    doctor: JsonObject,
    language: RunnerLanguage
): boolean {
    const languages = doctor.languages;
    if (!Array.isArray(languages)) {
        return false;
    }

    const entry = languages.find(
        (item) => isJsonObject(item) && item.language === language
    );
    return isJsonObject(entry) && entry.available === true;
}

function assertRunPassed(payload: JsonObject, smoke: RunnerSmoke): void {
    const result = payload.result;
    if (!isJsonObject(result)) {
        throw new Error(`${smoke.language} run_local_tests returned no result`);
    }
    if (result.passed !== true || result.exitCode !== 0) {
        throw new Error(
            `${smoke.language} run_local_tests failed: ${JSON.stringify(result)}`
        );
    }
    if (
        typeof result.stdout !== "string" ||
        !result.stdout.includes(smoke.marker)
    ) {
        throw new Error(
            `${smoke.language} stdout did not include ${JSON.stringify(
                smoke.marker
            )}: ${JSON.stringify(result.stdout)}`
        );
    }
}

async function main(): Promise<void> {
    const spawned = await spawnDogfoodServer();
    try {
        console.log("Dogfood MCP smoke: spawned build/index.js over stdio");
        console.log(`Isolated HOME: ${spawned.home}`);

        const tools = await spawned.client.listTools();
        console.log(`MCP listTools returned ${tools.tools.length} tools`);

        const doctor = await callToolJson(spawned.client, "runner_doctor", {});
        console.log("Agent> runner_doctor");
        console.log(JSON.stringify(doctor, null, 2));

        const start = await callToolJson(spawned.client, "start_problem", {
            titleSlug: "two-sum",
            language: "python3"
        });
        console.log(
            `Agent> start_problem(two-sum) => session status ${String(
                isJsonObject(start.session) ? start.session.status : "unknown"
            )}`
        );

        const hint = await callToolJson(spawned.client, "request_hint", {
            titleSlug: "two-sum"
        });
        console.log(
            `Agent> request_hint(two-sum) => level ${String(hint.level)}`
        );

        for (const smoke of RUNNER_SMOKES) {
            if (!languageAvailable(doctor, smoke.language)) {
                console.log(
                    `Agent> run_local_tests(${smoke.language}) skipped: runtime unavailable`
                );
                continue;
            }

            const payload = await callToolJson(
                spawned.client,
                "run_local_tests",
                {
                    titleSlug: "two-sum",
                    language: smoke.language,
                    code: smoke.code,
                    timeoutMs: smoke.timeoutMs
                }
            );
            assertRunPassed(payload, smoke);
            console.log(`Agent> run_local_tests(${smoke.language}) passed`);
        }

        const state = await callToolJson(spawned.client, "get_session_state", {
            titleSlug: "two-sum"
        });
        console.log("Agent> get_session_state(two-sum)");
        console.log(JSON.stringify(state, null, 2));

        console.log("Dogfood MCP smoke completed successfully");
    } finally {
        await spawned.cleanup();
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack : String(error);
    console.error(message);
    process.exitCode = 1;
});
