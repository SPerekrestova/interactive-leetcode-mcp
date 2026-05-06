import { beforeEach, describe, expect, it, vi } from "vitest";
import { restoreCredentials } from "../../src/auth/auth-flow.js";
import type { LeetcodeServiceInterface } from "../../src/leetcode/leetcode-service-interface.js";
import type { CredentialsStorage } from "../../src/types/credentials.js";

function makeStorage(
    overrides: Partial<CredentialsStorage> = {}
): CredentialsStorage {
    return {
        exists: vi.fn().mockResolvedValue(false),
        load: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        ...overrides
    };
}

function makeService(
    overrides: Partial<LeetcodeServiceInterface> = {}
): LeetcodeServiceInterface {
    return {
        validateCredentials: vi.fn().mockResolvedValue("alice"),
        updateCredentials: vi.fn(),
        isAuthenticated: vi.fn().mockReturnValue(false),
        ...overrides
    } as unknown as LeetcodeServiceInterface;
}

describe("restoreCredentials", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns no_credentials when no creds file exists", async () => {
        const service = makeService();
        const storage = makeStorage({
            exists: vi.fn().mockResolvedValue(false)
        });

        const outcome = await restoreCredentials(service, storage);

        expect(outcome).toEqual({ status: "no_credentials" });
        expect(service.validateCredentials).not.toHaveBeenCalled();
        expect(service.updateCredentials).not.toHaveBeenCalled();
    });

    it("returns invalid/load_failed when file exists but cannot be parsed", async () => {
        const service = makeService();
        const storage = makeStorage({
            exists: vi.fn().mockResolvedValue(true),
            load: vi.fn().mockResolvedValue(null)
        });

        const outcome = await restoreCredentials(service, storage);

        expect(outcome).toEqual({ status: "invalid", reason: "load_failed" });
        expect(service.updateCredentials).not.toHaveBeenCalled();
    });

    it("returns invalid/expired when LeetCode rejects the saved cookies", async () => {
        const service = makeService({
            validateCredentials: vi.fn().mockResolvedValue(null)
        });
        const storage = makeStorage({
            exists: vi.fn().mockResolvedValue(true),
            load: vi.fn().mockResolvedValue({
                csrftoken: "csrf",
                LEETCODE_SESSION: "session"
            })
        });

        const outcome = await restoreCredentials(service, storage);

        expect(outcome).toEqual({ status: "invalid", reason: "expired" });
        expect(service.updateCredentials).not.toHaveBeenCalled();
    });

    it("returns invalid/expired and swallows the error when validate throws", async () => {
        const service = makeService({
            validateCredentials: vi.fn().mockRejectedValue(new Error("boom"))
        });
        const storage = makeStorage({
            exists: vi.fn().mockResolvedValue(true),
            load: vi.fn().mockResolvedValue({
                csrftoken: "csrf",
                LEETCODE_SESSION: "session"
            })
        });

        const outcome = await restoreCredentials(service, storage);

        expect(outcome).toEqual({ status: "invalid", reason: "expired" });
        expect(service.updateCredentials).not.toHaveBeenCalled();
    });

    it("returns restored and pushes creds into the service when validation succeeds", async () => {
        const service = makeService({
            validateCredentials: vi.fn().mockResolvedValue("alice")
        });
        const storage = makeStorage({
            exists: vi.fn().mockResolvedValue(true),
            load: vi.fn().mockResolvedValue({
                csrftoken: "csrf-token",
                LEETCODE_SESSION: "session-token"
            })
        });

        const outcome = await restoreCredentials(service, storage);

        expect(outcome).toEqual({ status: "restored", username: "alice" });
        expect(service.updateCredentials).toHaveBeenCalledWith(
            "csrf-token",
            "session-token"
        );
    });
});
