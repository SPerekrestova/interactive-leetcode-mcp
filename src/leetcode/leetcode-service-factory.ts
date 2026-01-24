import { Credential, LeetCode } from "leetcode-query";
import { LeetCodeBaseService } from "./leetcode-base-service.js";
import { LeetCodeGlobalService } from "./leetcode-global-service.js";

/**
 * Factory class for creating LeetCode service instances.
 * This factory handles the creation of Global LeetCode service implementations.
 * Authentication is handled through browser-based authorization only.
 */
export class LeetCodeServiceFactory {
    /**
     * Creates and configures a LeetCode service instance.
     * Authentication credentials are loaded from stored credentials (browser-based auth).
     *
     * @returns A promise that resolves to a configured LeetCodeBaseService implementation
     */
    static async createService(): Promise<LeetCodeBaseService> {
        // Create empty credential - auth will come from stored credentials
        const credential: Credential = new Credential();

        // Create and return the global service
        return new LeetCodeGlobalService(new LeetCode(credential), credential);
    }
}
