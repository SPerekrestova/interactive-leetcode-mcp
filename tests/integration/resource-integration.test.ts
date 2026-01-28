/**
 * Resource Integration Tests
 * Tests all resources through MCP protocol
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerProblemResources } from "../../src/mcp/resources/problem-resources.js";
import { registerSolutionResources } from "../../src/mcp/resources/solution-resources.js";
import { createMockLeetCodeService } from "../helpers/mock-leetcode.js";
import type { TestClientPair } from "../helpers/test-client.js";
import { createTestClient } from "../helpers/test-client.js";
import { INTEGRATION_TEST_TIMEOUT, assertions } from "./setup.js";

describe("Resource Integration", () => {
    let testClient: TestClientPair;
    let mockService: ReturnType<typeof createMockLeetCodeService>;

    beforeEach(async () => {
        mockService = createMockLeetCodeService();

        testClient = await createTestClient({}, (server) => {
            registerProblemResources(server, mockService as any);
            registerSolutionResources(server, mockService as any);
        });
    }, INTEGRATION_TEST_TIMEOUT);

    afterEach(async () => {
        if (testClient) {
            await testClient.cleanup();
        }
    });

    describe("Problem Resources", () => {
        it(
            "should list problem-categories resource",
            async () => {
                const { resources } = await testClient.client.listResources();

                const resource = resources.find(
                    (r) => r.name === "problem-categories"
                );
                expect(resource).toBeDefined();
                expect(resource?.uri).toBe("categories://problems/all");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should read problem-categories resource",
            async () => {
                const result: any = await testClient.client.readResource({
                    uri: "categories://problems/all"
                });

                assertions.hasResourceStructure(result);
                const data = JSON.parse(result.contents[0].text as string);

                expect(Array.isArray(data)).toBe(true);
                expect(data.length).toBeGreaterThan(0);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should list problem-tags resource",
            async () => {
                const { resources } = await testClient.client.listResources();

                const resource = resources.find(
                    (r) => r.name === "problem-tags"
                );
                expect(resource).toBeDefined();
                expect(resource?.uri).toBe("tags://problems/all");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should read problem-tags resource",
            async () => {
                const result: any = await testClient.client.readResource({
                    uri: "tags://problems/all"
                });

                assertions.hasResourceStructure(result);
                const data = JSON.parse(result.contents[0].text as string);

                expect(Array.isArray(data)).toBe(true);
                expect(data.length).toBeGreaterThan(0);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should list problem-langs resource",
            async () => {
                const { resources } = await testClient.client.listResources();

                const resource = resources.find(
                    (r) => r.name === "problem-langs"
                );
                expect(resource).toBeDefined();
                expect(resource?.uri).toBe("langs://problems/all");
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should read problem-langs resource",
            async () => {
                const result: any = await testClient.client.readResource({
                    uri: "langs://problems/all"
                });

                assertions.hasResourceStructure(result);
                const data = JSON.parse(result.contents[0].text as string);

                expect(Array.isArray(data)).toBe(true);
                expect(data.length).toBeGreaterThan(0);
            },
            INTEGRATION_TEST_TIMEOUT
        );

        it(
            "should read problem-detail resource with titleSlug",
            async () => {
                const result: any = await testClient.client.readResource({
                    uri: "problem://two-sum"
                });

                assertions.hasResourceStructure(result);
                const data = JSON.parse(result.contents[0].text as string);

                expect(data.titleSlug).toBe("two-sum");
                expect(data.problem).toBeDefined();
                expect(mockService.fetchProblem).toHaveBeenCalledWith(
                    "two-sum"
                );
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });

    describe("Solution Resources", () => {
        it(
            "should read problem-solution resource with topicId",
            async () => {
                const result: any = await testClient.client.readResource({
                    uri: "solution://12345"
                });

                assertions.hasResourceStructure(result);
                const data = JSON.parse(result.contents[0].text as string);

                expect(data.topicId).toBe("12345");
                expect(data.solution).toBeDefined();
                expect(
                    mockService.fetchSolutionArticleDetail
                ).toHaveBeenCalledWith("12345");
            },
            INTEGRATION_TEST_TIMEOUT
        );
    });
});
