/**
 * Problem-related type contracts.
 *
 * These describe the shapes returned by the LeetcodeServiceInterface methods
 * (`fetchProblem`, `fetchProblemSimplified`, `searchProblems`, etc.) — not the
 * raw GraphQL payloads from `leetcode-query`. The service layer is responsible
 * for projecting the upstream data into these shapes.
 */

/** A `langSlug -> starter code` snippet attached to a problem. */
export interface CodeSnippet {
    lang: string;
    langSlug: string;
    code: string;
}

/** A topic tag on a LeetCode problem (e.g. `array`, `hash-table`). */
export interface TopicTag {
    name?: string;
    slug: string;
}

/** A neighbour problem reference returned by `similarQuestions`. */
export interface SimilarQuestion {
    titleSlug: string;
    difficulty: string;
}

/**
 * Full problem payload as returned by the upstream leetcode-query library.
 *
 * Many fields are optional because LeetCode populates different subsets
 * depending on whether the caller is authenticated and whether the problem is
 * paid-only.
 */
export interface Problem {
    questionId: string;
    questionFrontendId?: string;
    title: string;
    titleSlug: string;
    difficulty: string;
    content?: string | null;
    isPaidOnly?: boolean;
    topicTags?: TopicTag[];
    codeSnippets?: CodeSnippet[];
    hints?: string[];
    sampleTestCase?: string;
    exampleTestcases?: string;
    /** JSON-encoded array of similar-question metadata. */
    similarQuestions?: string;
    stats?: string;
    metaData?: string;
    [key: string]: unknown;
}

/**
 * Trimmed-down problem payload returned by `fetchProblemSimplified` —
 * the fields most useful to the AI agent without the upstream noise.
 */
export interface SimplifiedProblem {
    titleSlug: string;
    questionId: string;
    title: string;
    content?: string | null;
    difficulty: string;
    topicTags: string[];
    codeSnippets: CodeSnippet[];
    exampleTestcases?: string;
    hints?: string[];
    similarQuestions: SimilarQuestion[];
}

/** A row in the search-problems result list. */
export interface ProblemSummary {
    title: string;
    titleSlug: string;
    difficulty: string;
    acRate: number;
    topicTags: string[];
}

/** Result envelope for `searchProblems`. */
export interface ProblemSearchResult {
    total: number;
    questions: ProblemSummary[];
}

/** The daily-challenge envelope returned by `fetchDailyChallenge`. */
export interface DailyChallenge {
    date?: string;
    link?: string;
    question?: Problem;
    [key: string]: unknown;
}
