#!/usr/bin/env node

/**
 * Manual Authorization Flow Test Script
 *
 * This script tests the complete authorization flow interactively.
 * It's designed to be run standalone, not through test runners.
 *
 * Usage: node scripts/test-auth-flow.js
 */

/* global process */

import readline from "readline";
import { createAuthSession, getAuthSession } from "../build/mcp/auth-state.js";
import {
    extractLeetCodeCookies,
    getBrowserCookiePath
} from "../build/utils/browser-cookies.js";
import { openDefaultBrowser } from "../build/utils/browser-launcher.js";

async function waitForEnter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(
            "Press Enter when you have completed login in the browser...",
            () => {
                rl.close();
                resolve();
            }
        );
    });
}

async function testAuthFlow() {
    console.log("\n=== Authorization Flow Manual Test ===\n");

    try {
        // Step 1: Create auth session
        console.log("Step 1: Creating authorization session...");
        const sessionId = createAuthSession();
        console.log(`✓ Session created: ${sessionId}`);

        // Step 2: Open browser
        console.log("\nStep 2: Opening browser to LeetCode login...");
        openDefaultBrowser("https://leetcode.com/accounts/login/");
        console.log("✓ Browser opened");

        // Step 3: Wait for user to complete login
        console.log("\nStep 3: Waiting for you to complete login...");
        await waitForEnter();

        // Step 4: Verify session is still valid
        console.log("\nStep 4: Verifying session is still valid...");
        const session = getAuthSession(sessionId);
        if (!session) {
            throw new Error("Session expired (5-minute timeout)");
        }
        console.log("✓ Session is valid");

        // Step 5: Detect browser
        console.log("\nStep 5: Detecting browser...");
        const browserInfo = getBrowserCookiePath();
        if (!browserInfo) {
            throw new Error("Could not detect Chrome, Edge, or Brave browser");
        }
        console.log(`✓ Detected browser: ${browserInfo.browser}`);
        console.log(`  Cookie path: ${browserInfo.path}`);

        // Step 6: Extract cookies
        console.log("\nStep 6: Extracting cookies from browser...");
        const cookies = await extractLeetCodeCookies(browserInfo.path);
        console.log("✓ Cookies extracted successfully");
        console.log(`  csrftoken: ${cookies.csrftoken.substring(0, 10)}...`);
        console.log(
            `  LEETCODE_SESSION: ${cookies.LEETCODE_SESSION.substring(0, 10)}...`
        );

        console.log("\n=== ✓ Authorization flow completed successfully! ===\n");
        process.exit(0);
    } catch (error) {
        console.error("\n=== ✗ Authorization flow failed ===");
        console.error(`Error: ${error.message}\n`);
        process.exit(1);
    }
}

// Run the test
testAuthFlow();
