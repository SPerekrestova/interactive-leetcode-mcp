// src/utils/browser-cookies.ts
import { existsSync } from "fs";
import { homedir } from "os";
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
