/**
 * Test fixtures for LeetCode problems
 * Provides sample data for testing
 */

/**
 * Two Sum problem - Most common test case
 */
export const TWO_SUM_PROBLEM = {
    questionId: "1",
    title: "Two Sum",
    titleSlug: "two-sum",
    difficulty: "Easy",
    content: `<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>

<p>You may assume that each input would have <strong><em>exactly</em> one solution</strong>, and you may not use the <em>same</em> element twice.</p>

<p>You can return the answer in any order.</p>`,
    topicTags: [
        { name: "Array", slug: "array" },
        { name: "Hash Table", slug: "hash-table" }
    ],
    codeSnippets: [
        {
            lang: "JavaScript",
            langSlug: "javascript",
            code: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};"
        },
        {
            lang: "Python",
            langSlug: "python",
            code: 'class Solution(object):\n    def twoSum(self, nums, target):\n        """\n        :type nums: List[int]\n        :type target: int\n        :rtype: List[int]\n        """\n        '
        },
        {
            lang: "Python3",
            langSlug: "python3",
            code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        "
        },
        {
            lang: "Java",
            langSlug: "java",
            code: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}"
        }
    ],
    hints: [
        "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions for just for completeness. It is from these brute force solutions that you can come up with optimizations.",
        "So, if we fix one of the numbers, say <code>x</code>, we have to scan the entire array to find the next number <code>y</code> which is <code>value - x</code> where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
        "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?"
    ],
    sampleTestCase: "[2,7,11,15]\n9",
    exampleTestcases: "[2,7,11,15]\n9\n[3,2,4]\n6\n[3,3]\n6"
};

/**
 * Sample search results
 */
export const SEARCH_RESULTS = {
    total: 2847,
    problems: [
        {
            questionId: "1",
            title: "Two Sum",
            titleSlug: "two-sum",
            difficulty: "Easy",
            acRate: 51.4,
            paidOnly: false
        },
        {
            questionId: "15",
            title: "3Sum",
            titleSlug: "3sum",
            difficulty: "Medium",
            acRate: 33.8,
            paidOnly: false
        },
        {
            questionId: "18",
            title: "4Sum",
            titleSlug: "4sum",
            difficulty: "Medium",
            acRate: 37.6,
            paidOnly: false
        }
    ]
};

/**
 * Daily challenge response
 */
export const DAILY_CHALLENGE = {
    date: "2024-01-27",
    link: "/problems/two-sum/",
    question: {
        questionId: "1",
        questionFrontendId: "1",
        title: "Two Sum",
        titleSlug: "two-sum",
        difficulty: "Easy",
        isPaidOnly: false,
        topicTags: [
            { name: "Array", slug: "array" },
            { name: "Hash Table", slug: "hash-table" }
        ]
    }
};
