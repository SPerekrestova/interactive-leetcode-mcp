/**
 * Solution-article type contracts.
 *
 * Solutions are community-written walkthroughs ("Solution articles") that live
 * under `https://leetcode.com/problems/<slug>/solutions/`. The service layer
 * fetches them via GraphQL and projects the results into these shapes.
 */

/** A single solution article in a list. */
export interface SolutionArticleSummary {
    topicId?: number | string;
    slug?: string;
    title?: string;
    summary?: string;
    articleUrl?: string;
    canSee?: boolean;
    author?: {
        username?: string;
        userSlug?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

/** Result envelope for `fetchQuestionSolutionArticles`. */
export interface SolutionArticleList {
    totalNum: number;
    hasNextPage: boolean;
    articles: SolutionArticleSummary[];
}

/** Detailed solution article returned by `fetchSolutionArticleDetail`. */
export interface SolutionArticleDetail {
    topicId?: number | string;
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    [key: string]: unknown;
}
