/**
 * Vitest globalSetup hook: ensures `build/index.js` exists before any e2e
 * spec spawns the server, and that it's at least as fresh as everything
 * under `src/`.
 *
 * Without this, an unsuspecting `npm run test:e2e` after editing source
 * would silently exercise a stale binary and report green, hiding real
 * regressions. We'd rather pay the ~1s `tsc` cost up front than ship a
 * blind-spot.
 */
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function setup(): Promise<void> {
    if (!(await needsRebuild())) {
        return;
    }
    await execFileAsync("npm", ["run", "build"], {
        // Inherit cwd so it builds the project under test, not whichever
        // sub-package vitest happens to launch from.
        cwd: process.cwd(),
        // Fail loudly if tsc errors, rather than silently letting the e2e
        // suite fall through to "command not found" on `node build/index.js`.
        env: { ...process.env, npm_config_loglevel: "error" }
    });
}

async function needsRebuild(): Promise<boolean> {
    let binMtime: number;
    try {
        binMtime = (await stat("build/index.js")).mtimeMs;
    } catch {
        return true;
    }
    // Walk every `.ts` file under `src/` — comparing only against
    // `src/index.ts` would let edits to any other module slip through.
    const srcMtime = await maxMtimeUnder("src");
    return binMtime < srcMtime;
}

/** Recursively returns the largest mtime among `.ts` files under `dir`. */
async function maxMtimeUnder(dir: string): Promise<number> {
    let max = 0;
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
        entries.map(async (entry) => {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) {
                const sub = await maxMtimeUnder(path);
                if (sub > max) max = sub;
            } else if (entry.isFile() && entry.name.endsWith(".ts")) {
                const m = (await stat(path)).mtimeMs;
                if (m > max) max = m;
            }
        })
    );
    return max;
}
