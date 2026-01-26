// src/mcp/auth-state.ts

export interface AuthorizationState {
    sessionId: string;
    createdAt: Date;
    expiresAt: Date;
}

// In-memory storage for authorization sessions
const authSessions = new Map<string, AuthorizationState>();

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a new authorization session
 * @returns Session ID
 */
export function createAuthSession(): string {
    const sessionId = `auth-${Date.now()}`;
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + SESSION_TIMEOUT_MS);

    authSessions.set(sessionId, {
        sessionId,
        createdAt,
        expiresAt
    });

    return sessionId;
}

/**
 * Retrieves an authorization session if it exists and hasn't expired
 * @param sessionId - The session ID to retrieve
 * @returns AuthorizationState if valid, null otherwise
 */
export function getAuthSession(sessionId: string): AuthorizationState | null {
    const session = authSessions.get(sessionId);

    if (!session) {
        return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
        authSessions.delete(sessionId);
        return null;
    }

    return session;
}

/**
 * Clears authorization session(s)
 * @param sessionId - Optional session ID to clear. If not provided, clears all sessions.
 */
export function clearAuthSession(sessionId?: string): void {
    if (sessionId) {
        authSessions.delete(sessionId);
    } else {
        authSessions.clear();
    }
}
