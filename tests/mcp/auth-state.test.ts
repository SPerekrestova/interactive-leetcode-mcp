// tests/mcp/auth-state.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import {
    clearAuthSession,
    createAuthSession,
    getAuthSession
} from "../../src/mcp/auth-state.js";

describe("AuthorizationState", () => {
    beforeEach(() => {
        clearAuthSession();
    });

    it("should create authorization session with timestamp", () => {
        const sessionId = createAuthSession();

        expect(sessionId).toMatch(/^auth-\d+$/);

        const session = getAuthSession(sessionId);
        expect(session).toBeDefined();
        expect(session?.createdAt).toBeInstanceOf(Date);
        expect(session?.expiresAt).toBeInstanceOf(Date);
    });

    it("should expire session after 5 minutes", () => {
        const sessionId = createAuthSession();
        const session = getAuthSession(sessionId);

        expect(session).toBeDefined();

        const expirationTime =
            session!.expiresAt.getTime() - session!.createdAt.getTime();
        expect(expirationTime).toBe(5 * 60 * 1000); // 5 minutes in milliseconds
    });

    it("should return null for expired session", () => {
        const sessionId = createAuthSession();

        // Manually expire the session
        const session = getAuthSession(sessionId);
        session!.expiresAt = new Date(Date.now() - 1000); // 1 second ago

        const retrievedSession = getAuthSession(sessionId);
        expect(retrievedSession).toBeNull();
    });

    it("should return null for non-existent session", () => {
        const session = getAuthSession("non-existent");
        expect(session).toBeNull();
    });

    it("should clear authorization session", () => {
        const sessionId = createAuthSession();
        expect(getAuthSession(sessionId)).toBeDefined();

        clearAuthSession(sessionId);
        expect(getAuthSession(sessionId)).toBeNull();
    });

    it("should clear all sessions if no ID provided", () => {
        const sessionId1 = createAuthSession();
        const sessionId2 = createAuthSession();

        expect(getAuthSession(sessionId1)).toBeDefined();
        expect(getAuthSession(sessionId2)).toBeDefined();

        clearAuthSession();

        expect(getAuthSession(sessionId1)).toBeNull();
        expect(getAuthSession(sessionId2)).toBeNull();
    });
});
