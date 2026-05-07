/**
 * User / submission-history / contest type contracts.
 */

/** Result of `fetchUserStatus()` (called for the authenticated user). */
export interface UserStatus {
    isSignedIn: boolean;
    /** `null` when signed out, or signed in but no display username set. */
    username: string | null;
    /** `null` when signed out, or signed in but no avatar set. */
    avatar: string | null;
    isAdmin: boolean;
}

/** Result of `fetchUserProfile(username)`. */
export interface UserProfile {
    username: string;
    realName?: string | null;
    userAvatar?: string | null;
    countryName?: string | null;
    githubUrl?: string | null;
    company?: string | null;
    school?: string | null;
    ranking?: number | null;
    /**
     * Per-difficulty solved counts (LeetCode returns an array with rows for
     * `All`, `Easy`, `Medium`, `Hard`).
     */
    totalSubmissionNum?: Array<{
        difficulty: string;
        count: number;
        submissions: number;
    }>;
    [key: string]: unknown;
}

/** A single contest a user attended (or skipped). */
export interface ContestRankingHistoryEntry {
    attended: boolean;
    rating?: number;
    ranking?: number;
    trendDirection?: string;
    problemsSolved?: number;
    totalProblems?: number;
    finishTimeInSeconds?: number;
    contest?: {
        title?: string;
        startTime?: number;
    };
    [key: string]: unknown;
}

/** Result of `fetchUserContestRanking(username, attended)`. */
export interface UserContestInfo {
    userContestRanking?: {
        attendedContestsCount?: number;
        rating?: number;
        globalRanking?: number;
        totalParticipants?: number;
        topPercentage?: number;
        [key: string]: unknown;
    } | null;
    userContestRankingHistory: ContestRankingHistoryEntry[];
    [key: string]: unknown;
}

/** A single submission row returned by `fetchUserAllSubmissions`. */
export interface SubmissionRow {
    id?: string | number;
    title?: string;
    titleSlug?: string;
    timestamp?: string | number;
    statusDisplay?: string;
    lang?: string;
    runtime?: string;
    memory?: string;
    [key: string]: unknown;
}

/** Result envelope for `fetchUserAllSubmissions`. */
export interface UserAllSubmissions {
    submissions: SubmissionRow[] | { [key: string]: unknown };
    [key: string]: unknown;
}

/** Result envelope for `fetchUserRecentSubmissions`. */
export interface UserRecentSubmissions {
    [key: string]: unknown;
    recentSubmissionList?: SubmissionRow[];
}

/** Result of `fetchUserRecentACSubmissions` — raw GraphQL passthrough. */
export interface UserRecentACSubmissions {
    [key: string]: unknown;
}

/** Result of `fetchUserSubmissionDetail`. */
export interface UserSubmissionDetail {
    id?: number;
    code?: string;
    lang?: string;
    runtime?: string;
    memory?: string;
    statusDisplay?: string;
    [key: string]: unknown;
}

/** Result of `fetchUserProgressQuestionList`. */
export interface UserProgressQuestionList {
    questions?: Array<{ [key: string]: unknown }>;
    totalNum?: number;
    [key: string]: unknown;
}
