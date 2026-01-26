// src/utils/browser-cookies.ts
import Database from "better-sqlite3";
import { copyFileSync, existsSync, unlinkSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";

export interface BrowserCookieInfo {
    path: string;
    browser: "chrome" | "edge" | "brave";
}

/**
 * Detects the cookie database path for Chromium-based browsers
 * Checks in order: Chrome → Edge → Brave
 * @returns BrowserCookieInfo if found, null otherwise
 */
export function getBrowserCookiePath(): BrowserCookieInfo | null {
    const platform = process.platform;
    const home = homedir();

    const browsers: Array<{
        name: "chrome" | "edge" | "brave";
        paths: Record<string, string>;
    }> = [
        {
            name: "chrome",
            paths: {
                darwin: join(
                    home,
                    "Library/Application Support/Google/Chrome/Default/Cookies"
                ),
                linux: join(home, ".config/google-chrome/Default/Cookies"),
                win32: join(
                    process.env.LOCALAPPDATA || join(home, "AppData/Local"),
                    "Google/Chrome/User Data/Default/Cookies"
                )
            }
        },
        {
            name: "edge",
            paths: {
                darwin: join(
                    home,
                    "Library/Application Support/Microsoft Edge/Default/Cookies"
                ),
                linux: join(home, ".config/microsoft-edge/Default/Cookies"),
                win32: join(
                    process.env.LOCALAPPDATA || join(home, "AppData/Local"),
                    "Microsoft/Edge/User Data/Default/Cookies"
                )
            }
        },
        {
            name: "brave",
            paths: {
                darwin: join(
                    home,
                    "Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies"
                ),
                linux: join(
                    home,
                    ".config/BraveSoftware/Brave-Browser/Default/Cookies"
                ),
                win32: join(
                    process.env.LOCALAPPDATA || join(home, "AppData/Local"),
                    "BraveSoftware/Brave-Browser/User Data/Default/Cookies"
                )
            }
        }
    ];

    for (const browser of browsers) {
        const path = browser.paths[platform as "darwin" | "linux" | "win32"];
        if (path && existsSync(path)) {
            return { path, browser: browser.name };
        }
    }

    return null;
}

export interface LeetCodeCookies {
    csrftoken: string;
    LEETCODE_SESSION: string;
}

/**
 * Extracts LeetCode cookies from a Chromium cookie database
 * @param cookiePath - Path to the Cookies SQLite database
 * @returns Object with csrftoken and LEETCODE_SESSION
 * @throws Error if cookies not found or database cannot be read
 */
export async function extractLeetCodeCookies(
    cookiePath: string
): Promise<LeetCodeCookies> {
    // Copy database to temp location to avoid lock conflicts
    const tempPath = join(tmpdir(), `leetcode-cookies-${Date.now()}.db`);

    try {
        copyFileSync(cookiePath, tempPath);

        const db = new Database(tempPath, { readonly: true });

        const rows = db
            .prepare(
                `
            SELECT name, value
            FROM cookies
            WHERE host_key LIKE '%leetcode.com%'
            AND (name = 'csrftoken' OR name = 'LEETCODE_SESSION')
        `
            )
            .all() as Array<{ name: string; value: string }>;

        db.close();

        const cookies: Partial<LeetCodeCookies> = {};

        for (const row of rows) {
            if (row.name === "csrftoken") {
                cookies.csrftoken = row.value;
            } else if (row.name === "LEETCODE_SESSION") {
                cookies.LEETCODE_SESSION = row.value;
            }
        }

        if (!cookies.csrftoken || !cookies.LEETCODE_SESSION) {
            throw new Error(
                "LeetCode cookies not found. Please make sure you are logged into LeetCode in your browser."
            );
        }

        return cookies as LeetCodeCookies;
    } finally {
        // Clean up temp file
        try {
            unlinkSync(tempPath);
        } catch {
            // Ignore cleanup errors
        }
    }
}
