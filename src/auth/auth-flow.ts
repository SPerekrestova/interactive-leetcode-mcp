/**
 * Authentication helpers that bridge the on-disk credentials store and the
 * in-memory `LeetcodeServiceInterface`.
 *
 * Closes the silent-logout-on-restart gap where saved credentials existed in
 * `~/.leetcode-mcp/credentials.json` but the running server never re-hydrated
 * them, so every authenticated tool failed with "Authentication required" until
 * the user pasted their cookies again.
 */
import { LeetcodeServiceInterface } from "../leetcode/leetcode-service-interface.js";
import { CredentialsStorage } from "../types/credentials.js";
import { credentialsStorage as defaultStorage } from "../utils/credentials.js";
import logger from "../utils/logger.js";

/** Outcome of an `restoreCredentials` call — useful in tests and logs. */
export type RestoreOutcome =
    | { status: "no_credentials" }
    | { status: "invalid"; reason: "load_failed" | "expired" }
    | { status: "restored"; username: string };

/**
 * Loads saved credentials from disk, validates them against LeetCode, and
 * pushes them into the running service if they're still good.
 *
 * Safe to call at server startup; never throws — failures are logged and the
 * outcome is returned for callers that want to react.
 */
export async function restoreCredentials(
    service: LeetcodeServiceInterface,
    storage: CredentialsStorage = defaultStorage
): Promise<RestoreOutcome> {
    if (!(await storage.exists())) {
        return { status: "no_credentials" };
    }

    const credentials = await storage.load();
    if (!credentials) {
        logger.warn(
            "Saved credentials file exists but could not be parsed; ignoring."
        );
        return { status: "invalid", reason: "load_failed" };
    }

    let username: string | null = null;
    try {
        username = await service.validateCredentials(
            credentials.csrftoken,
            credentials.LEETCODE_SESSION
        );
    } catch (error) {
        logger.warn(
            "Saved credentials could not be validated against LeetCode: %s",
            error instanceof Error ? error.message : String(error)
        );
        return { status: "invalid", reason: "expired" };
    }

    if (!username) {
        logger.info(
            "Saved credentials are no longer valid; user will need to re-authenticate."
        );
        return { status: "invalid", reason: "expired" };
    }

    service.updateCredentials(
        credentials.csrftoken,
        credentials.LEETCODE_SESSION
    );
    logger.info(
        "Restored LeetCode session for %s from saved credentials.",
        username
    );
    return { status: "restored", username };
}
