/**
 * Structured error codes for the LeetCode MCP server.
 *
 * Tools and the service layer should throw `LeetCodeError` with one of these
 * codes instead of stringly-typed `Error`s, so the MCP layer can map them to
 * predictable, machine-readable error envelopes.
 */
export const ErrorCode = {
    /** Caller is not authenticated — credentials missing or invalid. */
    AUTH_REQUIRED: "AUTH_REQUIRED",
    /** Stored credentials were rejected by LeetCode (expired / revoked). */
    AUTH_INVALID: "AUTH_INVALID",
    /** Requested LeetCode problem slug doesn't exist. */
    PROBLEM_NOT_FOUND: "PROBLEM_NOT_FOUND",
    /** Requested solution article doesn't exist. */
    SOLUTION_NOT_FOUND: "SOLUTION_NOT_FOUND",
    /** Submission language isn't supported. */
    LANGUAGE_UNSUPPORTED: "LANGUAGE_UNSUPPORTED",
    /** LeetCode rejected the request as rate-limited. */
    RATE_LIMITED: "RATE_LIMITED",
    /** Submission polling timed out before LeetCode produced a verdict. */
    SUBMISSION_TIMEOUT: "SUBMISSION_TIMEOUT",
    /** Network failure talking to LeetCode (DNS, connection refused, etc). */
    NETWORK_ERROR: "NETWORK_ERROR",
    /** LeetCode returned a payload that didn't match the expected schema. */
    UPSTREAM_PAYLOAD_INVALID: "UPSTREAM_PAYLOAD_INVALID",
    /** Catch-all for unexpected upstream errors. */
    UPSTREAM_ERROR: "UPSTREAM_ERROR"
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Error thrown by the service layer with a structured, machine-readable code.
 *
 * Catchers can dispatch on `error.code` to render appropriate user-facing
 * messages without parsing free-form `error.message` strings.
 */
export class LeetCodeError extends Error {
    public readonly code: ErrorCodeValue;

    constructor(code: ErrorCodeValue, message: string, cause?: unknown) {
        // Forward `cause` to the native ES2022 `Error` field so loggers and
        // stack-walkers that rely on the standard chain see it without us
        // shadowing it via a redeclared class field.
        super(message, cause === undefined ? undefined : { cause });
        this.name = "LeetCodeError";
        this.code = code;
    }
}

/** Type-narrowing helper for `instanceof LeetCodeError` checks. */
export function isLeetCodeError(value: unknown): value is LeetCodeError {
    return value instanceof LeetCodeError;
}
