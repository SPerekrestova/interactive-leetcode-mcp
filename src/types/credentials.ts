export interface LeetCodeCredentials {
    csrftoken: string;
    LEETCODE_SESSION: string;
    createdAt?: string;
}

export interface CredentialsStorage {
    load(): Promise<LeetCodeCredentials | null>;
    save(credentials: LeetCodeCredentials): Promise<void>;
    exists(): Promise<boolean>;
    clear(): Promise<void>;
}
