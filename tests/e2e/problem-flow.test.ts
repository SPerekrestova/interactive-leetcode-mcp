/**
 * Happy-path e2e: spawn the server, call `get_problem` with a mocked
 * GraphQL response, and assert the wire-level envelope flows through
 * unchanged.
 *
 * Locks in the contract that callers see structured JSON (not free-form
 * text) when a problem is fetched, and that the slug round-trips through
 * the GraphQL boundary unmodified.
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

describe("e2e: problem-flow happy path", () => {
    let spawned: SpawnedServer | undefined;

    afterEach(async () => {
        if (spawned) {
            await spawned.cleanup();
            spawned = undefined;
        }
    });

    it("get_problem returns a structured envelope for a known slug", async () => {
        spawned = await spawnServer({
            fixture: {
                graphql: [
                    {
                        // `leetcode-query` issues an anonymous GraphQL
                        // `question(titleSlug: ...)` query for problem
                        // fetches. Match on the field-level selector
                        // rather than an operation name (it doesn't have
                        // one) to stay robust to formatting changes.
                        operationContains: "question(titleSlug:",
                        response: {
                            data: { question: TWO_SUM_PROBLEM }
                        }
                    }
                ]
            }
        });

        const result = (await spawned.client.callTool({
            name: "get_problem",
            arguments: { titleSlug: "two-sum" }
        })) as ToolTextResult;

        expect(result.content[0]?.type).toBe("text");
        const payload = JSON.parse(result.content[0].text);
        // The tool wraps the simplified projection in `{ titleSlug, problem }`;
        // assert the wire-level envelope, not the internal projection.
        expect(payload.titleSlug).toBe("two-sum");
        expect(payload.problem.title).toBe("Two Sum");
        // topicTags are projected down to a string[] of slugs.
        expect(payload.problem.topicTags).toEqual(["array"]);
    });
});
