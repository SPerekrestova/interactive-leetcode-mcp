import axios, { AxiosError } from "axios";
import { Credential, LeetCode } from "leetcode-query";
import { ErrorCode, LeetCodeError } from "../types/errors.js";
import {
    DailyChallenge,
    Problem,
    ProblemSearchResult,
    SimilarQuestion,
    SimplifiedProblem,
    TopicTag
} from "../types/problem.js";
import {
    SolutionArticleDetail,
    SolutionArticleList,
    SolutionArticleSummary
} from "../types/solution.js";
import { SubmissionResult } from "../types/submission.js";
import {
    UserAllSubmissions,
    UserContestInfo,
    UserProfile,
    UserProgressQuestionList,
    UserRecentACSubmissions,
    UserRecentSubmissions,
    UserStatus,
    UserSubmissionDetail
} from "../types/user.js";
import logger from "../utils/logger.js";
import { SEARCH_PROBLEMS_QUERY } from "./graphql/search-problems.js";
import { SOLUTION_ARTICLE_DETAIL_QUERY } from "./graphql/solution-article-detail.js";
import { SOLUTION_ARTICLES_QUERY } from "./graphql/solution-articles.js";
import {
    LeetcodeServiceInterface,
    SolutionArticlesQueryOptions
} from "./leetcode-service-interface.js";
import {
    CheckResponseSchema,
    QuestionIdResponseSchema,
    SubmitResponseSchema,
    ValidateCredentialsResponseSchema
} from "./schemas.js";

const LANGUAGE_MAP: Record<string, string> = {
    java: "java",
    python: "python3",
    python3: "python3",
    c: "c",
    cpp: "cpp",
    "c++": "cpp",
    csharp: "csharp",
    "c#": "csharp",
    javascript: "javascript",
    js: "javascript",
    typescript: "typescript",
    ts: "typescript",
    php: "php",
    swift: "swift",
    kotlin: "kotlin",
    dart: "dart",
    golang: "golang",
    go: "golang",
    ruby: "ruby",
    scala: "scala",
    rust: "rust",
    racket: "racket",
    erlang: "erlang",
    elixir: "elixir"
};

/**
 * LeetCode Global API Service Implementation
 */
export class LeetCodeGlobalService implements LeetcodeServiceInterface {
    private readonly leetCodeApi: LeetCode;
    private readonly credential: Credential;

    constructor(leetCodeApi: LeetCode, credential: Credential) {
        this.leetCodeApi = leetCodeApi;
        this.credential = credential;
    }

    async fetchUserSubmissionDetail(id: number): Promise<UserSubmissionDetail> {
        if (!this.isAuthenticated()) {
            throw new LeetCodeError(
                ErrorCode.AUTH_REQUIRED,
                "Authentication required to fetch user submission detail"
            );
        }
        return (await this.leetCodeApi.submission(
            id
        )) as unknown as UserSubmissionDetail;
    }

    async fetchUserStatus(): Promise<UserStatus> {
        if (!this.isAuthenticated()) {
            throw new LeetCodeError(
                ErrorCode.AUTH_REQUIRED,
                "Authentication required to fetch user status"
            );
        }
        const res = await this.leetCodeApi.whoami();
        return {
            isSignedIn: res?.isSignedIn ?? false,
            username: res?.username ?? "",
            avatar: res?.avatar ?? "",
            isAdmin: res?.isAdmin ?? false
        };
    }

    async fetchUserAllSubmissions(options: {
        offset: number;
        limit: number;
        questionSlug?: string;
        lastKey?: string;
        lang?: string;
        status?: string;
    }): Promise<UserAllSubmissions> {
        if (!this.isAuthenticated()) {
            throw new LeetCodeError(
                ErrorCode.AUTH_REQUIRED,
                "Authentication required to fetch user submissions"
            );
        }
        const submissions = await this.leetCodeApi.submissions({
            offset: options.offset ?? 0,
            limit: options.limit ?? 20,
            slug: options.questionSlug
        });
        return {
            submissions
        } as unknown as UserAllSubmissions;
    }

    async fetchUserRecentSubmissions(
        username: string,
        limit?: number
    ): Promise<UserRecentSubmissions> {
        return (await this.leetCodeApi.recent_submissions(
            username,
            limit
        )) as unknown as UserRecentSubmissions;
    }

    async fetchUserRecentACSubmissions(
        username: string,
        limit?: number
    ): Promise<UserRecentACSubmissions> {
        return (await this.leetCodeApi.graphql({
            query: `
                    query ($username: String!, $limit: Int) {
                        recentAcSubmissionList(username: $username, limit: $limit) {
                            id
                            title
                            titleSlug
                            time
                            timestamp
                            statusDisplay
                            lang
                        }
                    }

                `,
            variables: {
                username,
                limit
            }
        })) as unknown as UserRecentACSubmissions;
    }

    async fetchUserProfile(username: string): Promise<UserProfile> {
        const profile = await this.leetCodeApi.user(username);
        if (profile && profile.matchedUser) {
            const { matchedUser } = profile;

            return {
                username: matchedUser.username,
                realName: matchedUser.profile.realName,
                userAvatar: matchedUser.profile.userAvatar,
                countryName: matchedUser.profile.countryName,
                githubUrl: matchedUser.githubUrl ?? undefined,
                company: matchedUser.profile.company,
                school: matchedUser.profile.school,
                ranking: matchedUser.profile.ranking,
                totalSubmissionNum: matchedUser.submitStats?.totalSubmissionNum
            };
        }
        return profile as unknown as UserProfile;
    }

    async fetchUserContestRanking(
        username: string,
        attended: boolean = true
    ): Promise<UserContestInfo> {
        const contestInfo = (await this.leetCodeApi.user_contest_info(
            username
        )) as unknown as UserContestInfo;
        if (contestInfo.userContestRankingHistory) {
            if (attended) {
                contestInfo.userContestRankingHistory =
                    contestInfo.userContestRankingHistory.filter((contest) => {
                        return contest && contest.attended;
                    });
            }
        } else {
            contestInfo.userContestRankingHistory = [];
        }
        return contestInfo;
    }

    async fetchDailyChallenge(): Promise<DailyChallenge> {
        return (await this.leetCodeApi.daily()) as unknown as DailyChallenge;
    }

    async fetchProblem(titleSlug: string): Promise<Problem> {
        return (await this.leetCodeApi.problem(
            titleSlug
        )) as unknown as Problem;
    }

    async fetchProblemSimplified(
        titleSlug: string
    ): Promise<SimplifiedProblem> {
        const problem = await this.fetchProblem(titleSlug);
        if (!problem) {
            throw new LeetCodeError(
                ErrorCode.PROBLEM_NOT_FOUND,
                `Problem ${titleSlug} not found`
            );
        }

        const filteredTopicTags: string[] =
            problem.topicTags?.map((tag: TopicTag) => tag.slug) ?? [];

        const filteredCodeSnippets = problem.codeSnippets ?? [];

        let parsedSimilarQuestions: SimilarQuestion[] = [];
        if (problem.similarQuestions) {
            try {
                const allQuestions: SimilarQuestion[] = JSON.parse(
                    problem.similarQuestions
                );
                parsedSimilarQuestions = allQuestions
                    .slice(0, 3)
                    .map((q: SimilarQuestion) => ({
                        titleSlug: q.titleSlug,
                        difficulty: q.difficulty
                    }));
            } catch (e) {
                logger.error("Error parsing similarQuestions: %s", e);
            }
        }

        return {
            titleSlug,
            questionId: problem.questionId,
            title: problem.title,
            content: problem.content,
            difficulty: problem.difficulty,
            topicTags: filteredTopicTags,
            codeSnippets: filteredCodeSnippets,
            exampleTestcases: problem.exampleTestcases,
            hints: problem.hints,
            similarQuestions: parsedSimilarQuestions
        };
    }

    async searchProblems(
        category?: string,
        tags?: string[],
        difficulty?: string,
        limit: number = 10,
        offset: number = 0,
        searchKeywords?: string
    ): Promise<ProblemSearchResult> {
        const filters: Record<string, unknown> = {};
        if (difficulty) {
            filters.difficulty = difficulty.toUpperCase();
        }
        if (tags && tags.length > 0) {
            filters.tags = tags;
        }
        if (searchKeywords) {
            filters.searchKeywords = searchKeywords;
        }

        const response = await this.leetCodeApi.graphql({
            query: SEARCH_PROBLEMS_QUERY,
            variables: {
                categorySlug: category,
                limit,
                skip: offset,
                filters
            }
        });

        const questionList = response.data?.problemsetQuestionList;
        if (!questionList) {
            return {
                total: 0,
                questions: []
            };
        }
        return {
            total: questionList.total,
            questions: questionList.questions.map(
                (question: {
                    title: string;
                    titleSlug: string;
                    difficulty: string;
                    acRate: number;
                    topicTags: TopicTag[];
                }) => ({
                    title: question.title,
                    titleSlug: question.titleSlug,
                    difficulty: question.difficulty,
                    acRate: question.acRate,
                    topicTags: question.topicTags.map((tag) => tag.slug)
                })
            )
        };
    }

    async fetchUserProgressQuestionList(options?: {
        offset?: number;
        limit?: number;
        questionStatus?: string;
        difficulty?: string[];
    }): Promise<UserProgressQuestionList> {
        if (!this.isAuthenticated()) {
            throw new LeetCodeError(
                ErrorCode.AUTH_REQUIRED,
                "Authentication required to fetch user progress question list"
            );
        }

        // Cast through unknown because leetcode-query types these as enums
        // (LeetCodeQuestionStatus / LeetCodeDifficulty) but accepts the raw
        // strings we forward from MCP tool inputs.
        const filters = {
            skip: options?.offset || 0,
            limit: options?.limit || 20,
            questionStatus: options?.questionStatus as unknown as undefined,
            difficulty: options?.difficulty as unknown as undefined
        };

        return (await this.leetCodeApi.user_progress_questions(
            filters
        )) as unknown as UserProgressQuestionList;
    }

    /**
     * Retrieves a list of solutions for a specific problem.
     *
     * @param questionSlug - The URL slug/identifier of the problem
     * @param options - Optional parameters for filtering and sorting the solutions
     * @returns Promise resolving to the solutions list data
     */
    async fetchQuestionSolutionArticles(
        questionSlug: string,
        options?: SolutionArticlesQueryOptions
    ): Promise<SolutionArticleList> {
        const variables = {
            questionSlug,
            first: options?.limit || 5,
            skip: options?.skip || 0,
            orderBy: options?.orderBy || "HOT",
            userInput: options?.userInput,
            tagSlugs: options?.tagSlugs ?? []
        };

        const res = await this.leetCodeApi.graphql({
            query: SOLUTION_ARTICLES_QUERY,
            variables
        });
        const ugcArticleSolutionArticles = res.data?.ugcArticleSolutionArticles;
        if (!ugcArticleSolutionArticles) {
            return {
                totalNum: 0,
                hasNextPage: false,
                articles: []
            };
        }

        return {
            totalNum: ugcArticleSolutionArticles?.totalNum || 0,
            hasNextPage:
                ugcArticleSolutionArticles?.pageInfo?.hasNextPage || false,
            articles:
                ugcArticleSolutionArticles?.edges
                    ?.map((edge: { node?: SolutionArticleSummary | null }) => {
                        const node = edge?.node;
                        if (node && node.topicId && node.slug) {
                            node.articleUrl = `https://leetcode.com/problems/${questionSlug}/solutions/${node.topicId}/${node.slug}`;
                        }
                        return node;
                    })
                    .filter(
                        (
                            node: SolutionArticleSummary | null | undefined
                        ): node is SolutionArticleSummary =>
                            !!node && !!node.canSee
                    ) || []
        };
    }

    /**
     * Retrieves detailed information about a specific solution on LeetCode.
     *
     * @param topicId - The topic ID of the solution
     * @returns Promise resolving to the solution detail data
     */
    async fetchSolutionArticleDetail(
        topicId: string
    ): Promise<SolutionArticleDetail | null> {
        const response = await this.leetCodeApi.graphql({
            query: SOLUTION_ARTICLE_DETAIL_QUERY,
            variables: {
                topicId
            }
        });
        return (response.data?.ugcArticleSolutionArticle ??
            null) as SolutionArticleDetail | null;
    }

    async submitSolution(
        problemSlug: string,
        code: string,
        language: string
    ): Promise<SubmissionResult> {
        if (!this.isAuthenticated()) {
            return {
                accepted: false,
                errorMessage: "Not authorized. Please run authorization first.",
                statusMessage: "Authorization Required"
            };
        }

        // Map language to LeetCode's expected format
        const leetcodeLang = LANGUAGE_MAP[language.toLowerCase()];
        if (!leetcodeLang) {
            return {
                accepted: false,
                errorMessage: `Unsupported language: ${language}`,
                statusMessage: "Invalid Language"
            };
        }

        const baseUrl = "https://leetcode.com";

        try {
            // First, get the numeric question ID
            const questionId = await this.getQuestionId(problemSlug, baseUrl);

            // Submit solution
            const submitUrl = `${baseUrl}/problems/${problemSlug}/submit/`;

            const submitResponse = await axios.post(
                submitUrl,
                {
                    lang: leetcodeLang,
                    question_id: questionId,
                    typed_code: code
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `csrftoken=${this.credential.csrf}; LEETCODE_SESSION=${this.credential.session}`,
                        "X-CSRFToken": this.credential.csrf,
                        Referer: `${baseUrl}/problems/${problemSlug}/`
                    }
                }
            );

            const parsedSubmit = SubmitResponseSchema.safeParse(
                submitResponse.data
            );
            if (!parsedSubmit.success) {
                throw new LeetCodeError(
                    ErrorCode.UPSTREAM_PAYLOAD_INVALID,
                    `Submit response did not match expected schema: ${parsedSubmit.error.message}`,
                    parsedSubmit.error
                );
            }
            const submissionId = parsedSubmit.data.submission_id;

            // Poll for results
            const checkUrl = `${baseUrl}/submissions/detail/${submissionId}/check/`;
            let attempts = 0;
            const maxAttempts = 30;

            while (attempts < maxAttempts) {
                // Wait 1 second between polls
                await new Promise((resolve) => setTimeout(resolve, 1000));

                const checkResponse = await axios.get(checkUrl, {
                    headers: {
                        Cookie: `csrftoken=${this.credential.csrf}; LEETCODE_SESSION=${this.credential.session}`
                    }
                });

                const parsedCheck = CheckResponseSchema.safeParse(
                    checkResponse.data
                );
                if (!parsedCheck.success) {
                    throw new LeetCodeError(
                        ErrorCode.UPSTREAM_PAYLOAD_INVALID,
                        `Check response did not match expected schema: ${parsedCheck.error.message}`,
                        parsedCheck.error
                    );
                }
                const result = parsedCheck.data;

                if (
                    result.state !== "SUCCESS" &&
                    result.state !== "PENDING" &&
                    result.state !== "STARTED"
                ) {
                    return {
                        accepted: false,
                        statusMessage: "Error",
                        errorMessage: `Unexpected submission state: ${result.state}`
                    };
                }

                // Check if processing is complete
                if (result.state === "SUCCESS") {
                    const accepted = result.status_msg === "Accepted";

                    if (accepted) {
                        return {
                            accepted: true,
                            runtime: result.runtime,
                            memory: result.memory,
                            runtimePercentile:
                                result.runtime_percentile ?? undefined,
                            memoryPercentile:
                                result.memory_percentile ?? undefined,
                            totalCorrect: result.total_correct ?? undefined,
                            totalTestcases: result.total_testcases ?? undefined,
                            statusMessage: "Accepted"
                        };
                    } else {
                        // Failed - extract test case info
                        let failedTestCase = "";
                        if (result.input) {
                            failedTestCase = `Input: ${result.input}`;
                            if (result.expected_answer && result.code_answer) {
                                failedTestCase += `\nExpected: ${JSON.stringify(result.expected_answer)}`;
                                failedTestCase += `\nGot: ${JSON.stringify(result.code_answer)}`;
                            }
                        }

                        // Use the most specific error message available
                        const errorMessage =
                            result.full_compile_error ||
                            result.compile_error ||
                            result.full_runtime_error ||
                            result.runtime_error ||
                            result.std_output ||
                            undefined;

                        return {
                            accepted: false,
                            statusMessage: result.status_msg ?? "Unknown",
                            failedTestCase,
                            errorMessage,
                            totalCorrect: result.total_correct ?? undefined,
                            totalTestcases: result.total_testcases ?? undefined
                        };
                    }
                }

                attempts++;
            }

            // Timeout
            return {
                accepted: false,
                statusMessage: "Timeout",
                errorMessage: "Submission check timed out after 30 seconds"
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;

                if (axiosError.response?.status === 401) {
                    return {
                        accepted: false,
                        statusMessage: "Unauthorized",
                        errorMessage: "Session expired. Please re-authorize."
                    };
                }

                return {
                    accepted: false,
                    statusMessage: "Submission Failed",
                    errorMessage: axiosError.message
                };
            }

            return {
                accepted: false,
                statusMessage: "Error",
                errorMessage:
                    error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async getQuestionId(
        problemSlug: string,
        baseUrl: string
    ): Promise<string> {
        const graphqlQuery = {
            query: `
                query questionTitle($titleSlug: String!) {
                    question(titleSlug: $titleSlug) {
                        questionId
                        questionFrontendId
                    }
                }
            `,
            variables: { titleSlug: problemSlug }
        };

        const response = await axios.post(`${baseUrl}/graphql`, graphqlQuery, {
            headers: {
                "Content-Type": "application/json",
                Cookie: `csrftoken=${this.credential.csrf}; LEETCODE_SESSION=${this.credential.session}`,
                "X-CSRFToken": this.credential.csrf,
                Referer: `${baseUrl}/problems/${problemSlug}/`
            }
        });

        const parsed = QuestionIdResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new LeetCodeError(
                ErrorCode.UPSTREAM_PAYLOAD_INVALID,
                `Question-id response did not match expected schema: ${parsed.error.message}`,
                parsed.error
            );
        }
        const question = parsed.data.data?.question;
        if (!question) {
            throw new LeetCodeError(
                ErrorCode.PROBLEM_NOT_FOUND,
                `Problem slug "${problemSlug}" not found or invalid.`
            );
        }
        return question.questionId;
    }

    isAuthenticated(): boolean {
        return (
            !!this.credential &&
            !!this.credential.csrf &&
            !!this.credential.session
        );
    }

    async validateCredentials(
        csrf: string,
        session: string
    ): Promise<string | null> {
        try {
            // Make a simple GraphQL query to validate credentials
            const graphqlQuery = {
                query: `
                    query globalData {
                        userStatus {
                            username
                            isSignedIn
                        }
                    }
                `
            };

            const response = await axios.post(
                "https://leetcode.com/graphql",
                graphqlQuery,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `csrftoken=${csrf}; LEETCODE_SESSION=${session}`,
                        "X-CSRFToken": csrf
                    }
                }
            );

            const parsed = ValidateCredentialsResponseSchema.safeParse(
                response.data
            );
            if (!parsed.success) {
                logger.warn(
                    "validateCredentials: upstream payload did not match schema: %s",
                    parsed.error.message
                );
                return null;
            }
            const userStatus = parsed.data.data?.userStatus;
            if (userStatus?.isSignedIn === true && userStatus.username) {
                return userStatus.username;
            }
            return null;
        } catch {
            return null;
        }
    }

    updateCredentials(csrf: string, session: string): void {
        this.credential.csrf = csrf;
        this.credential.session = session;
    }
}
