// src/utils/browser-launcher.ts
import { execSync } from "child_process";

/**
 * Opens the default browser to the specified URL using platform-specific commands
 * @param url - The URL to open
 * @throws Error if platform is unsupported or command fails
 */
export function openDefaultBrowser(url: string): void {
    const platform = process.platform;

    let command: string;

    switch (platform) {
        case "darwin":
            command = `open ${url}`;
            break;
        case "linux":
            command = `xdg-open ${url}`;
            break;
        case "win32":
            command = `start ${url}`;
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
        execSync(command);
    } catch (error) {
        throw new Error(`Failed to open browser: ${error}`);
    }
}
