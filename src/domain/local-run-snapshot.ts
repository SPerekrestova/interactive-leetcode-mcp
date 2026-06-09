import { createHash } from "node:crypto";

export interface LocalRunSnapshotInput {
    code: string;
    language: string;
}

export function createLocalRunSnapshot(input: LocalRunSnapshotInput): string {
    return createHash("sha256")
        .update(JSON.stringify([input.language, input.code]))
        .digest("hex");
}
