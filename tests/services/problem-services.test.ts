import { Credential, LeetCode } from "leetcode-query";
import { describe, expect, it } from "vitest";
import { LeetCodeGlobalService } from "../../src/leetcode/leetcode-global-service.js";

describe("LeetCode Problem Services", () => {
    describe("LeetCodeGlobalService", () => {
        const credential = new Credential();
        const leetCodeApi = new LeetCode(credential);
        const service = new LeetCodeGlobalService(leetCodeApi, credential);

        describe("fetchDailyChallenge", () => {
            it("should return daily challenge data", async () => {
                const result = await service.fetchDailyChallenge();

                expect(result).toBeDefined();
                expect(result.question).toBeDefined();
                expect(result.question.title).toBeDefined();
                expect(result.question.questionId).toBeDefined();
            }, 30000);
        });

        describe("fetchProblemSimplified", () => {
            it("should return simplified problem data", async () => {
                const titleSlug = "two-sum";
                const result = await service.fetchProblemSimplified(titleSlug);

                expect(result).toBeDefined();
                expect(result.titleSlug).toBe(titleSlug);
                expect(result.title).toBe("Two Sum");
                expect(result.questionId).toBeDefined();
                expect(result.content).toBeDefined();
                expect(result.difficulty).toBeDefined();
                expect(Array.isArray(result.topicTags)).toBe(true);
                expect(Array.isArray(result.codeSnippets)).toBe(true);
                expect(result.hints).toBeDefined();

                if (result.similarQuestions) {
                    expect(Array.isArray(result.similarQuestions)).toBe(true);
                }
            }, 30000);

            it("should handle invalid problems correctly", async () => {
                const invalidSlug = `invalid-problem-${Date.now()}`;
                await expect(
                    service.fetchProblemSimplified(invalidSlug)
                ).rejects.toThrow(`Problem ${invalidSlug} not found`);
            }, 30000);
        });
    });
});
