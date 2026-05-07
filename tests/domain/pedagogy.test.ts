import { describe, expect, it } from "vitest";
import { generateHint } from "../../src/domain/pedagogy.js";
import type { SimplifiedProblem } from "../../src/types/index.js";

const TWO_SUM: SimplifiedProblem = {
    titleSlug: "two-sum",
    questionId: "1",
    title: "Two Sum",
    content: "<p>Find two indices that sum to target.</p>",
    difficulty: "Easy",
    topicTags: ["array", "hash-table"],
    codeSnippets: [],
    exampleTestcases: "[2,7,11,15]\n9",
    hints: ["A hash map gives O(1) lookup."],
    similarQuestions: []
};

describe("generateHint", () => {
    it("level 1 restates the problem and surfaces example testcases", () => {
        const hint = generateHint(TWO_SUM, 1);
        expect(hint).toContain("Level 1");
        expect(hint).toContain("Two Sum");
        expect(hint).toContain("[2,7,11,15]");
    });

    it("level 2 references the topic tags but does not give code", () => {
        const hint = generateHint(TWO_SUM, 2);
        expect(hint).toContain("Level 2");
        expect(hint).toContain("array");
        expect(hint).toContain("hash-table");
        // No literal code blocks should appear at level 2.
        expect(hint).not.toMatch(/```python|```js|```ts/);
    });

    it("level 3 surfaces the upstream LeetCode hint when available", () => {
        const hint = generateHint(TWO_SUM, 3);
        expect(hint).toContain("Level 3");
        expect(hint).toContain("hash map");
    });

    it("level 4 announces solution unlock", () => {
        const hint = generateHint(TWO_SUM, 4);
        expect(hint).toContain("Level 4");
        expect(hint).toContain("get_problem_solution");
    });

    it("does not crash on a problem with no hints / examples / tags", () => {
        const sparse: SimplifiedProblem = {
            ...TWO_SUM,
            topicTags: [],
            hints: [],
            exampleTestcases: ""
        };
        for (const level of [1, 2, 3, 4] as const) {
            expect(generateHint(sparse, level).length).toBeGreaterThan(0);
        }
    });
});
