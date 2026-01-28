// tests/utils/browser-launcher.test.ts
import { execFileSync } from "child_process";
import { describe, expect, it, vi } from "vitest";
import { openDefaultBrowser } from "../../src/utils/browser-launcher.js";

vi.mock("child_process", () => ({
    execFileSync: vi.fn()
}));

describe("browser-launcher", () => {
    it('should use "open" command on macOS', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "darwin" });

        openDefaultBrowser("https://leetcode.com");

        expect(execFileSync).toHaveBeenCalledWith("open", [
            "https://leetcode.com"
        ]);

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it('should use "xdg-open" command on Linux', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        openDefaultBrowser("https://leetcode.com");

        expect(execFileSync).toHaveBeenCalledWith("xdg-open", [
            "https://leetcode.com"
        ]);

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it('should use "start" command on Windows', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        openDefaultBrowser("https://leetcode.com");

        expect(execFileSync).toHaveBeenCalledWith("cmd", [
            "/c",
            "start",
            "",
            "https://leetcode.com"
        ]);

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should throw error on unsupported platform", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "freebsd" });

        expect(() => openDefaultBrowser("https://leetcode.com")).toThrow(
            "Unsupported platform: freebsd"
        );

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });
});
