import axios from "axios";
import { Credential, LeetCode } from "leetcode-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeetCodeGlobalService } from "../../src/leetcode/leetcode-global-service.js";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("LeetCode Service Layer Implementation", () => {
    const credential = new Credential();
    credential.csrf = "test-csrf";
    credential.session = "test-session";
    const leetCodeApi = new LeetCode(credential);
    const service = new LeetCodeGlobalService(leetCodeApi, credential);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("validateCredentials", () => {
        it("should return username when credentials are valid", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        userStatus: {
                            username: "testuser",
                            isSignedIn: true
                        }
                    }
                }
            });

            const result = await service.validateCredentials("csrf", "session");
            expect(result).toBe("testuser");
            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://leetcode.com/graphql",
                expect.objectContaining({
                    query: expect.stringContaining("userStatus")
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Cookie: "csrftoken=csrf; LEETCODE_SESSION=session"
                    })
                })
            );
        });

        it("should return null when credentials are invalid", async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        userStatus: {
                            username: "",
                            isSignedIn: false
                        }
                    }
                }
            });

            const result = await service.validateCredentials("csrf", "session");
            expect(result).toBeNull();
        });

        it("should return null on network error", async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

            const result = await service.validateCredentials("csrf", "session");
            expect(result).toBeNull();
        });
    });

    describe("submitSolution", () => {
        it("should successfully submit and poll for results", async () => {
            // 1. Mock getQuestionId (GraphQL)
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        question: {
                            questionId: "1"
                        }
                    }
                }
            });

            // 2. Mock submission post
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    submission_id: 12345
                }
            });

            // 3. Mock polling results
            // First poll: PENDING
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    state: "PENDING"
                }
            });
            // Second poll: SUCCESS
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    state: "SUCCESS",
                    status_msg: "Accepted",
                    runtime: "72 ms",
                    memory: "42.5 MB"
                }
            });

            const result = await service.submitSolution(
                "two-sum",
                "code",
                "python3"
            );

            expect(result.accepted).toBe(true);
            expect(result.statusMessage).toBe("Accepted");
            expect(result.runtime).toBe("72 ms");

            // Verify calls
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it("should handle submission failures", async () => {
            // 1. Mock getQuestionId (GraphQL)
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: {
                        question: {
                            questionId: "1"
                        }
                    }
                }
            });

            // 2. Mock submission post
            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    submission_id: 12346
                }
            });

            // 3. Mock polling results: Wrong Answer
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    state: "SUCCESS",
                    status_msg: "Wrong Answer",
                    input: "[2,7,11,15]",
                    expected_answer: "[0,1]",
                    code_answer: "[0,2]"
                }
            });

            const result = await service.submitSolution(
                "two-sum",
                "code",
                "python3"
            );

            expect(result.accepted).toBe(false);
            expect(result.statusMessage).toBe("Wrong Answer");
            expect(result.failedTestCase).toContain("Input: [2,7,11,15]");
        });

        it("should handle unauthorized error", async () => {
            // Mock getQuestionId failing with 401
            const error = {
                response: {
                    status: 401
                },
                isAxiosError: true,
                message: "401 error"
            };
            mockedAxios.isAxiosError.mockReturnValueOnce(true);
            mockedAxios.post.mockRejectedValueOnce(error);

            const result = await service.submitSolution(
                "two-sum",
                "code",
                "python3"
            );

            expect(result.accepted).toBe(false);
            expect(result.statusMessage).toBe("Unauthorized");
            expect(result.errorMessage).toBe(
                "Session expired. Please re-authorize."
            );
        });

        it("should return error if not authenticated", async () => {
            const unauthService = new LeetCodeGlobalService(
                new LeetCode(new Credential()),
                new Credential()
            );
            const result = await unauthService.submitSolution(
                "two-sum",
                "code",
                "python3"
            );

            expect(result.accepted).toBe(false);
            expect(result.statusMessage).toBe("Authorization Required");
        });
    });
});
