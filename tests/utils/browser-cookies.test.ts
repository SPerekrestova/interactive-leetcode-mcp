// tests/utils/browser-cookies.test.ts
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import { getBrowserCookiePath } from "../../src/utils/browser-cookies";

vi.mock("fs", () => ({
    existsSync: vi.fn()
}));

describe("getBrowserCookiePath", () => {
    const home = homedir();

    it("should detect Chrome on macOS", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "darwin" });

        const chromePath = join(
            home,
            "Library/Application Support/Google/Chrome/Default/Cookies"
        );
        vi.mocked(existsSync).mockImplementation((path) => path === chromePath);

        const result = getBrowserCookiePath();

        expect(result).toEqual({ path: chromePath, browser: "chrome" });

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should detect Edge on macOS if Chrome not found", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "darwin" });

        const edgePath = join(
            home,
            "Library/Application Support/Microsoft Edge/Default/Cookies"
        );
        vi.mocked(existsSync).mockImplementation((path) => path === edgePath);

        const result = getBrowserCookiePath();

        expect(result).toEqual({ path: edgePath, browser: "edge" });

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should detect Brave on macOS if Chrome and Edge not found", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "darwin" });

        const bravePath = join(
            home,
            "Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies"
        );
        vi.mocked(existsSync).mockImplementation((path) => path === bravePath);

        const result = getBrowserCookiePath();

        expect(result).toEqual({ path: bravePath, browser: "brave" });

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should return null if no browser found", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const result = getBrowserCookiePath();

        expect(result).toBeNull();
    });

    it("should detect Chrome on Linux", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "linux" });

        const chromePath = join(home, ".config/google-chrome/Default/Cookies");
        vi.mocked(existsSync).mockImplementation((path) => path === chromePath);

        const result = getBrowserCookiePath();

        expect(result).toEqual({ path: chromePath, browser: "chrome" });

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should detect Chrome on Windows", () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        const localAppData =
            process.env.LOCALAPPDATA || join(home, "AppData/Local");
        const chromePath = join(
            localAppData,
            "Google/Chrome/User Data/Default/Cookies"
        );
        vi.mocked(existsSync).mockImplementation((path) => path === chromePath);

        const result = getBrowserCookiePath();

        expect(result).toEqual({ path: chromePath, browser: "chrome" });

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });
});
