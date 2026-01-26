import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
    CredentialsStorage,
    LeetCodeCredentials
} from "../types/credentials.js";

const CREDENTIALS_DIR = join(homedir(), ".leetcode-mcp");
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, "credentials.json");

export class FileCredentialsStorage implements CredentialsStorage {
    async exists(): Promise<boolean> {
        try {
            await fs.access(CREDENTIALS_FILE);
            return true;
        } catch {
            return false;
        }
    }

    async load(): Promise<LeetCodeCredentials | null> {
        try {
            const data = await fs.readFile(CREDENTIALS_FILE, "utf-8");
            return JSON.parse(data) as LeetCodeCredentials;
        } catch {
            return null;
        }
    }

    async save(credentials: LeetCodeCredentials): Promise<void> {
        try {
            await fs.mkdir(CREDENTIALS_DIR, { recursive: true });
            await fs.writeFile(
                CREDENTIALS_FILE,
                JSON.stringify(credentials, null, 2),
                { encoding: "utf-8", mode: 0o600 }
            );
        } catch (error) {
            throw new Error(`Failed to save credentials: ${error}`);
        }
    }

    async clear(): Promise<void> {
        try {
            await fs.unlink(CREDENTIALS_FILE);
        } catch {
            // File doesn't exist, that's fine
        }
    }
}

export const credentialsStorage = new FileCredentialsStorage();
