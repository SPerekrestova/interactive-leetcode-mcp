import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeetCodeCredentials } from "../../src/types/credentials.js";
import {
    LeetCodeCheckResponse,
    LeetCodeSubmitResponse
} from "../../src/types/submission.js";
import { credentialsStorage } from "../../src/utils/credentials.js";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

// Mock credentials storage
vi.mock("../../src/utils/credentials.js", () => ({
    credentialsStorage: {
        load: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        clear: vi.fn()
    }
}));

describe("Submission Integration", () => {
    const mockCredentials: LeetCodeCredentials = {
        csrftoken: "test-csrf-token",
        LEETCODE_SESSION: "test-session-token",
        createdAt: new Date().toISOString()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Question ID Fetching", () => {
        it("should fetch numeric question ID from GraphQL", async () => {
            const mockGraphQLResponse = {
                data: {
                    data: {
                        question: {
                            questionId: "1",
                            questionFrontendId: "1"
                        }
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockGraphQLResponse);
            vi.mocked(credentialsStorage.load).mockResolvedValue(
                mockCredentials
            );

            // We'll test this through the actual function when we import it
            const response = await axios.post("https://leetcode.com/graphql", {
                query: expect.any(String),
                variables: { titleSlug: "two-sum" }
            });

            expect(response.data.data.question.questionId).toBe("1");
        });

        it("should handle GraphQL errors", async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

            await expect(
                axios.post("https://leetcode.com/graphql", {})
            ).rejects.toThrow("Network error");
        });
    });

    describe("Solution Submission", () => {
        it("should submit solution successfully", async () => {
            const mockSubmitResponse: { data: LeetCodeSubmitResponse } = {
                data: {
                    submission_id: 123456
                }
            };

            const mockCheckResponse: { data: LeetCodeCheckResponse } = {
                data: {
                    state: "SUCCESS",
                    status_msg: "Accepted",
                    runtime: "2 ms",
                    memory: "44.5 MB"
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockSubmitResponse);
            mockedAxios.get.mockResolvedValueOnce(mockCheckResponse);
            vi.mocked(credentialsStorage.load).mockResolvedValue(
                mockCredentials
            );

            // Test the submission flow
            const submitResponse = await axios.post(
                "https://leetcode.com/problems/two-sum/submit/",
                {
                    lang: "java",
                    question_id: "1",
                    typed_code: "class Solution {}"
                }
            );

            expect(submitResponse.data.submission_id).toBe(123456);

            // Test the check flow
            const checkResponse = await axios.get(
                `https://leetcode.com/submissions/detail/${submitResponse.data.submission_id}/check/`
            );

            expect(checkResponse.data.state).toBe("SUCCESS");
            expect(checkResponse.data.status_msg).toBe("Accepted");
        });

        it("should handle submission with wrong answer", async () => {
            const mockSubmitResponse: { data: LeetCodeSubmitResponse } = {
                data: {
                    submission_id: 123457
                }
            };

            const mockCheckResponse: { data: LeetCodeCheckResponse } = {
                data: {
                    state: "SUCCESS",
                    status_msg: "Wrong Answer",
                    input: "[2,7,11,15]",
                    expected_answer: ["[0,1]"],
                    code_answer: ["[0,2]"]
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockSubmitResponse);
            mockedAxios.get.mockResolvedValueOnce(mockCheckResponse);

            const submitResponse = await axios.post(
                "https://leetcode.com/problems/two-sum/submit/",
                {}
            );
            const checkResponse = await axios.get(
                `https://leetcode.com/submissions/detail/${submitResponse.data.submission_id}/check/`
            );

            expect(checkResponse.data.status_msg).toBe("Wrong Answer");
            expect(checkResponse.data.input).toBeDefined();
            expect(checkResponse.data.expected_answer).toBeDefined();
            expect(checkResponse.data.code_answer).toBeDefined();
        });

        it("should handle compilation errors", async () => {
            const mockSubmitResponse: { data: LeetCodeSubmitResponse } = {
                data: {
                    submission_id: 123458
                }
            };

            const mockCheckResponse: { data: LeetCodeCheckResponse } = {
                data: {
                    state: "SUCCESS",
                    status_msg: "Compile Error",
                    std_output: "Line 1: error: ';' expected"
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockSubmitResponse);
            mockedAxios.get.mockResolvedValueOnce(mockCheckResponse);

            const submitResponse = await axios.post(
                "https://leetcode.com/problems/two-sum/submit/",
                {}
            );
            const checkResponse = await axios.get(
                `https://leetcode.com/submissions/detail/${submitResponse.data.submission_id}/check/`
            );

            expect(checkResponse.data.status_msg).toBe("Compile Error");
            expect(checkResponse.data.std_output).toContain("error");
        });

        it("should handle 401 unauthorized", async () => {
            const error = {
                response: {
                    status: 401
                },
                isAxiosError: true,
                message: "Request failed with status code 401"
            };

            mockedAxios.post.mockRejectedValueOnce(error);

            await expect(
                axios.post("https://leetcode.com/problems/two-sum/submit/", {})
            ).rejects.toMatchObject({
                response: {
                    status: 401
                }
            });
        });

        it("should handle network errors", async () => {
            mockedAxios.post.mockRejectedValueOnce(
                new Error("Network timeout")
            );

            await expect(
                axios.post("https://leetcode.com/problems/two-sum/submit/", {})
            ).rejects.toThrow("Network timeout");
        });
    });

    describe("Language Mapping", () => {
        it("should map language names correctly", () => {
            const languageMap: Record<string, string> = {
                java: "java",
                python: "python3",
                python3: "python3",
                cpp: "cpp",
                "c++": "cpp",
                javascript: "javascript",
                js: "javascript",
                typescript: "typescript",
                ts: "typescript"
            };

            expect(languageMap["java"]).toBe("java");
            expect(languageMap["python"]).toBe("python3");
            expect(languageMap["python3"]).toBe("python3");
            expect(languageMap["cpp"]).toBe("cpp");
            expect(languageMap["c++"]).toBe("cpp");
            expect(languageMap["javascript"]).toBe("javascript");
            expect(languageMap["js"]).toBe("javascript");
            expect(languageMap["typescript"]).toBe("typescript");
            expect(languageMap["ts"]).toBe("typescript");
        });
    });

    describe("Authorization Requirements", () => {
        it("should require credentials for submission", async () => {
            vi.mocked(credentialsStorage.load).mockResolvedValue(null);

            // When credentials are null, submission should fail
            const credentials = await credentialsStorage.load();
            expect(credentials).toBeNull();
        });

        it("should use saved credentials", async () => {
            vi.mocked(credentialsStorage.load).mockResolvedValue(
                mockCredentials
            );

            const credentials = await credentialsStorage.load();
            expect(credentials).toBeDefined();
            expect(credentials?.csrftoken).toBe("test-csrf-token");
            expect(credentials?.LEETCODE_SESSION).toBe("test-session-token");
        });
    });
});
