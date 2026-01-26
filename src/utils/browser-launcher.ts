// src/utils/browser-launcher.ts
import { execFileSync } from "child_process";

/**
 * Opens the default browser to the specified URL using platform-specific commands
 * @param url - The URL to open
 * @throws Error if platform is unsupported or command fails
 */
export function openDefaultBrowser(url: string): void {
    const platform = process.platform;

    try {
        switch (platform) {
            case "darwin":
                execFileSync("open", [url]);
                break;
            case "linux":
                execFileSync("xdg-open", [url]);
                break;
            case "win32":
                // Windows 'start' is a shell built-in, not an executable
                // Use 'cmd /c start' with proper argument separation to prevent injection
                execFileSync("cmd", ["/c", "start", "", url]);
                break;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    } catch (error) {
        throw new Error(`Failed to open browser: ${error}`);
    }
}
