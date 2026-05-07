/**
 * Vitest globalSetup hook: ensures `build/index.js` exists before any e2e
 * spec spawns the server, and that it's at least as fresh as `src/`.
 *
 * Without this, an unsuspecting `npm run test:e2e` after editing source
 * would silently exercise a stale binary and report green, hiding real
 * regressions. We'd rather pay the ~1s `tsc` cost up front than ship a
 * blind-spot.
 */
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
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
    try {
        const [binStat, srcStat] = await Promise.all([
            stat("build/index.js"),
            stat("src/index.ts")
        ]);
        return binStat.mtimeMs < srcStat.mtimeMs;
    } catch {
        // Either file missing — definitely need to (re)build.
        return true;
    }
}
