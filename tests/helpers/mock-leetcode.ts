/**
 * Mock LeetCode service for testing
 * Provides mock implementations of all LeetCode API methods
 */
import { vi } from "vitest";
import type { LeetcodeServiceInterface } from "../../src/leetcode/leetcode-service-interface.js";
import {
    DAILY_CHALLENGE,
    SEARCH_RESULTS,
    TWO_SUM_PROBLEM
} from "./fixtures/problems.js";

/**
 * Creates a mock LeetCode service with all methods mocked
 * Returns a new mock instance for each test to avoid state pollution
 *
 * @returns Mock LeetCode service with vitest mocks
 *
 * @example
 * ```typescript
 * const mockService = createMockLeetCodeService();
 * const { server, client, cleanup } = await createTestClientWithServer(mockService);
 *
 * // Test that service is called correctly
 * await client.callTool({ name: "get_problem", arguments: { titleSlug: "two-sum" } });
 * expect(mockService.fetchProblemSimplified).toHaveBeenCalledWith("two-sum");
 * ```
 */
export function createMockLeetCodeService(): LeetcodeServiceInterface {
    return {
        // Problem methods
        fetchDailyChallenge: vi.fn().mockResolvedValue(DAILY_CHALLENGE),

        fetchProblem: vi.fn().mockResolvedValue(TWO_SUM_PROBLEM),

        fetchProblemSimplified: vi.fn().mockResolvedValue({
            questionId: "1",
            title: "Two Sum",
            titleSlug: "two-sum",
            difficulty: "Easy",
            topicTags: ["Array", "Hash Table"],
            codeSnippets: [
                {
                    lang: "JavaScript",
                    langSlug: "javascript",
                    code: "var twoSum = function(nums, target) {\n    \n};"
                }
            ],
            content: "<p>Given an array...</p>",
            hints: ["A brute force approach would use two loops."],
            sampleTestCase: "[2,7,11,15]\n9",
            exampleTestcases: "[2,7,11,15]\n9\n[3,2,4]\n6"
        }),

        searchProblems: vi.fn().mockResolvedValue(SEARCH_RESULTS),

        // User methods
        fetchUserStatus: vi.fn().mockResolvedValue({
            username: "testuser",
            isSignedIn: true
        }),

        fetchUserProfile: vi.fn().mockResolvedValue({
            username: "testuser",
            profile: {
                realName: "Test User",
                ranking: 100000
            },
            submitStats: {
                totalSubmissionNum: [
                    { difficulty: "All", count: 100, submissions: 200 },
                    { difficulty: "Easy", count: 50, submissions: 75 },
                    { difficulty: "Medium", count: 40, submissions: 100 },
                    { difficulty: "Hard", count: 10, submissions: 25 }
                ]
            }
        }),

        fetchUserRecentSubmissions: vi.fn().mockResolvedValue({
            recentSubmissionList: [
                {
                    title: "Two Sum",
                    titleSlug: "two-sum",
                    timestamp: "1609459200",
                    statusDisplay: "Accepted",
                    lang: "javascript"
                }
            ]
        }),

        fetchUserRecentACSubmissions: vi.fn().mockResolvedValue([
            {
                title: "Two Sum",
                titleSlug: "two-sum",
                timestamp: "1609459200",
                statusDisplay: "Accepted",
                lang: "javascript"
            }
        ]),

        fetchUserAllSubmissions: vi.fn().mockResolvedValue({
            submissions: []
        }),

        fetchUserProgressQuestionList: vi.fn().mockResolvedValue({
            questions: []
        }),

        fetchUserSubmissionDetail: vi.fn().mockResolvedValue({
            id: 1,
            code: "var twoSum = function(nums, target) { ... }",
            runtime: "100 ms",
            memory: "42.5 MB"
        }),

        // Contest methods
        fetchUserContestRanking: vi.fn().mockResolvedValue({
            userContestRanking: {
                rating: 1500,
                globalRanking: 50000,
                totalParticipants: 100000,
                attendedContestsCount: 10
            },
            userContestRankingHistory: []
        }),

        // Solution methods
        fetchQuestionSolutionArticles: vi.fn().mockResolvedValue([
            {
                id: "1",
                title: "Two Sum - Solution",
                slug: "two-sum-solution",
                topicId: 12345,
                authorUsername: "leetcode",
                voteCount: 1000
            }
        ]),

        fetchSolutionArticleDetail: vi.fn().mockResolvedValue({
            topicId: 12345,
            title: "Two Sum - Solution",
            content: "# Approach 1: Brute Force\n\n...",
            authorUsername: "leetcode",
            createdAt: "1609459200"
        }),

        // Submission methods
        submitSolution: vi.fn().mockResolvedValue({
            status_code: 10,
            status_msg: "Accepted",
            run_success: true,
            state: "SUCCESS",
            runtime: "100 ms",
            memory: "42.5 MB",
            code_output: "",
            total_correct: 10,
            total_testcases: 10
        }),

        // Authentication
        isAuthenticated: vi.fn().mockReturnValue(false)
    } as unknown as LeetcodeServiceInterface;
}

/**
 * Creates a mock authenticated LeetCode service
 * Same as createMockLeetCodeService but with isAuthenticated returning true
 */
export function createMockAuthenticatedService(): LeetcodeServiceInterface {
    const service = createMockLeetCodeService();
    vi.mocked(service.isAuthenticated).mockReturnValue(true);
    return service;
}

/**
 * Creates a mock LeetCode service that throws errors
 * Useful for testing error handling
 */
export function createMockFailingService(): LeetcodeServiceInterface {
    const error = new Error("Mock API Error");

    return {
        fetchDailyChallenge: vi.fn().mockRejectedValue(error),
        fetchProblem: vi.fn().mockRejectedValue(error),
        fetchProblemSimplified: vi.fn().mockRejectedValue(error),
        searchProblems: vi.fn().mockRejectedValue(error),
        fetchUserStatus: vi.fn().mockRejectedValue(error),
        fetchUserProfile: vi.fn().mockRejectedValue(error),
        fetchUserRecentSubmissions: vi.fn().mockRejectedValue(error),
        fetchUserRecentACSubmissions: vi.fn().mockRejectedValue(error),
        fetchUserAllSubmissions: vi.fn().mockRejectedValue(error),
        fetchUserProgressQuestionList: vi.fn().mockRejectedValue(error),
        fetchUserSubmissionDetail: vi.fn().mockRejectedValue(error),
        fetchUserContestRanking: vi.fn().mockRejectedValue(error),
        fetchQuestionSolutionArticles: vi.fn().mockRejectedValue(error),
        fetchSolutionArticleDetail: vi.fn().mockRejectedValue(error),
        submitSolution: vi.fn().mockRejectedValue(error),
        isAuthenticated: vi.fn().mockReturnValue(false)
    } as unknown as LeetcodeServiceInterface;
}
