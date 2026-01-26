// tests/integration/authorization-flow.test.ts
import { describe, expect, it } from "vitest";
import { createAuthSession, getAuthSession } from "../../src/mcp/auth-state.js";
import {
    extractLeetCodeCookies,
    getBrowserCookiePath
} from "../../src/utils/browser-cookies.js";
import { openDefaultBrowser } from "../../src/utils/browser-launcher.js";

describe("Authorization Flow Integration", () => {
    it("should complete full authorization flow", async () => {
        // This is a manual integration test
        // Skip in CI, run manually with real browser
        if (!process.env.MANUAL_TEST) {
            console.log(
                "Skipping manual integration test. Set MANUAL_TEST=1 to run."
            );
            return;
        }

        // Step 1: Create auth session
        const sessionId = createAuthSession();
        expect(sessionId).toBeDefined();

        // Step 2: Open browser (manual - user must log in)
        console.log("Opening browser for login...");
        openDefaultBrowser("https://leetcode.com/accounts/login/");

        // Wait for user to complete login
        console.log(
            "Please log in to LeetCode in the browser, then press Enter..."
        );
        await new Promise((resolve) => {
            process.stdin.once("data", resolve);
        });

        // Step 3: Verify session is still valid
        const session = getAuthSession(sessionId);
        expect(session).toBeDefined();

        // Step 4: Detect browser
        const browserInfo = getBrowserCookiePath();
        expect(browserInfo).toBeDefined();
        console.log(`Detected browser: ${browserInfo?.browser}`);

        // Step 5: Extract cookies
        const cookies = await extractLeetCodeCookies(browserInfo!.path);
        expect(cookies.csrftoken).toBeDefined();
        expect(cookies.LEETCODE_SESSION).toBeDefined();

        console.log("Authorization flow completed successfully!");
    });
});
