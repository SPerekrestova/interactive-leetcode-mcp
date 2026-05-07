/**
 * Pedagogy state machine e2e: spawn the real server, drive a problem
 * through `start_problem` → `request_hint` × 4, and assert the
 * solution-returning tools are gated until the maximum hint level.
 *
 * Locks in the Phase 3 contract end-to-end: the rules are enforced by
 * the wire, not by prompts the agent might forget to read.
 */
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
    content:
        "<p>Given an array of integers <code>nums</code> and an integer <code>target</code>...</p>",
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
    hints: ["Try a hash map for O(n) lookup"],
    stats: '{"totalAccepted":"10M","totalSubmission":"20M","acRate":"50.0%"}'
};

const SOLUTION_LIST_PAYLOAD = {
    data: {
        ugcArticleSolutionArticles: {
            edges: [{ node: { topicId: "topic-42", title: "Hash map O(n)" } }],
            totalNum: 1,
            pageInfo: { hasNextPage: false }
        }
    }
};

/**
 * The fixture serves the same canned GraphQL payload for every request
 * that contains the matching field selector — `start_problem` and each
 * `request_hint` both refetch the problem, so the question fixture must
 * be replayable.
 */
const FIXTURE = {
    graphql: [
        {
            operationContains: "question(titleSlug:",
            response: { data: { question: TWO_SUM_PROBLEM } }
        },
        {
            operationContains: "ugcArticleSolutionArticles",
            response: SOLUTION_LIST_PAYLOAD
        }
    ]
};

describe("e2e: pedagogy gate", () => {
    let spawned: SpawnedServer | undefined;

    afterEach(async () => {
        if (spawned) {
            await spawned.cleanup();
            spawned = undefined;
        }
    });

    it("gates list_problem_solutions until request_hint reaches level 4", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        // 1. No session yet — solutions must reject with SESSION_NOT_FOUND.
        const noSession = (await spawned.client.callTool({
            name: "list_problem_solutions",
            arguments: { questionSlug: "two-sum" }
        })) as ToolTextResult;
        const noSessionPayload = JSON.parse(noSession.content[0].text);
        expect(noSessionPayload.code).toBe("SESSION_NOT_FOUND");

        // 2. Open a session and assert the initial state.
        const start = (await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum", language: "python3" }
        })) as ToolTextResult;
        const startPayload = JSON.parse(start.content[0].text);
        expect(startPayload.session.hintLevel).toBe(0);
        expect(startPayload.session.status).toBe("started");

        // 3. Walk the hint flow up to (but not at) the unlock level.
        for (let expectedLevel = 1; expectedLevel < 4; expectedLevel++) {
            const hint = (await spawned.client.callTool({
                name: "request_hint",
                arguments: { titleSlug: "two-sum" }
            })) as ToolTextResult;
            const payload = JSON.parse(hint.content[0].text);
            expect(payload.level).toBe(expectedLevel);
            expect(typeof payload.hint).toBe("string");
            expect(payload.hint.length).toBeGreaterThan(0);

            // At each pre-unlock level, list_problem_solutions still rejects.
            const stillGated = (await spawned.client.callTool({
                name: "list_problem_solutions",
                arguments: { questionSlug: "two-sum" }
            })) as ToolTextResult;
            const stillGatedPayload = JSON.parse(stillGated.content[0].text);
            expect(stillGatedPayload.code).toBe("HINT_LEVEL_TOO_LOW");
        }

        // 4. Final hint bump unlocks the solutions tool.
        const finalHint = (await spawned.client.callTool({
            name: "request_hint",
            arguments: { titleSlug: "two-sum" }
        })) as ToolTextResult;
        const finalPayload = JSON.parse(finalHint.content[0].text);
        expect(finalPayload.level).toBe(4);

        // 5. Now the gate opens.
        const unlocked = (await spawned.client.callTool({
            name: "list_problem_solutions",
            arguments: { questionSlug: "two-sum" }
        })) as ToolTextResult;
        const unlockedPayload = JSON.parse(unlocked.content[0].text);
        expect(unlockedPayload.questionSlug).toBe("two-sum");
        expect(unlockedPayload.solutionArticles).toBeDefined();
    });

    it("reset_session clamps hint level back to 0 and re-engages the gate", async () => {
        spawned = await spawnServer({ fixture: FIXTURE });

        await spawned.client.callTool({
            name: "start_problem",
            arguments: { titleSlug: "two-sum" }
        });
        for (let i = 0; i < 4; i++) {
            await spawned.client.callTool({
                name: "request_hint",
                arguments: { titleSlug: "two-sum" }
            });
        }

        const reset = (await spawned.client.callTool({
            name: "reset_session",
            arguments: { titleSlug: "two-sum" }
        })) as ToolTextResult;
        const resetPayload = JSON.parse(reset.content[0].text);
        expect(resetPayload.session.hintLevel).toBe(0);

        const gatedAgain = (await spawned.client.callTool({
            name: "list_problem_solutions",
            arguments: { questionSlug: "two-sum" }
        })) as ToolTextResult;
        const gatedAgainPayload = JSON.parse(gatedAgain.content[0].text);
        expect(gatedAgainPayload.code).toBe("HINT_LEVEL_TOO_LOW");
    });
});
