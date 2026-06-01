/**
 * Detect the strongest OS-level sandbox available on this host and turn
 * a plain command into a sandbox-wrapped command.
 *
 * We deliberately ship no JS-level sandbox; the threat model is
 * "user-running-their-own-code", not "untrusted multi-tenant input". The
 * sandbox reduces blast radius of accidental rm-rf or runaway loops, not
 * malicious code escapes.
 *
 * Priority:
 *   - Linux: bwrap > firejail > none
 *   - macOS: sandbox-exec > none
 *   - Windows: none (native AppContainer wrappers are too platform-
 *              specific to ship in v1)
 *
 * If nothing is detected the runner falls back to a plain subprocess and
 * surfaces a `warning` in the `RunResult`. Users who want to refuse to
 * run without a sandbox can set `LEETCODE_MCP_REQUIRE_SANDBOX=1`; the
 * tool layer enforces this — the runner only reports.
 */
import { execFile as execFileCb } from "node:child_process";
import { access, constants as fsConstants } from "node:fs/promises";
import { promisify } from "node:util";

import type { SandboxKind } from "../types/index.js";

const execFile = promisify(execFileCb);

interface DetectedSandbox {
    kind: SandboxKind;
    /** When `kind === "none"`, the absolute path to the wrapping
     *  binary (`bwrap`, `firejail`, `sandbox-exec`) is undefined. */
    path?: string;
}

let cached: DetectedSandbox | undefined;

/**
 * Returns whether `<bin> --version` succeeds. Uses the no-shell
 * `execFile` so the probe never re-interprets `bin`/`args` through
 * `/bin/sh -c` — important because future callers might be tempted to
 * pass dynamic values, and the default `child_process.exec` is a
 * shell-expansion foot-gun.
 */
async function probe(
    bin: string,
    args: string[] = ["--version"]
): Promise<boolean> {
    try {
        await execFile(bin, args, { timeout: 1500 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Probe the host once per server lifetime. Subsequent calls return the
 * cached result; tests can use `__resetSandboxCacheForTest` to force
 * re-detection.
 */
export async function detectSandbox(): Promise<DetectedSandbox> {
    if (cached) {
        return cached;
    }

    const platform = process.platform;
    if (platform === "darwin") {
        // sandbox-exec lives at /usr/bin/sandbox-exec on every macOS
        // version we care about. Detect by file existence + executable
        // bit rather than spawning the binary — its `-help` flag is
        // undocumented and exits non-zero on some macOS versions, which
        // would silently fall through to `kind: "none"` and lie to
        // users that no sandbox is available.
        try {
            await access("/usr/bin/sandbox-exec", fsConstants.X_OK);
            cached = { kind: "sandbox-exec", path: "/usr/bin/sandbox-exec" };
            return cached;
        } catch {
            /* fall through to "none" */
        }
    } else if (platform === "linux") {
        if (await probe("bwrap")) {
            cached = { kind: "bwrap" };
            return cached;
        }
        if (await probe("firejail")) {
            cached = { kind: "firejail" };
            return cached;
        }
    }

    cached = { kind: "none" };
    return cached;
}

/**
 * Wrap an existing command with the detected sandbox. Returns the new
 * `[cmd, args]` pair plus the kind that was applied. When no sandbox is
 * available, returns the input pair untouched and `kind: "none"`.
 *
 * `cwdAllowed` is the temp directory the user code is permitted to read
 * + write — the rest of the filesystem is read-only (Linux) or denied
 * (macOS).
 */
export async function wrapWithSandbox(
    cmd: string,
    args: string[],
    cwdAllowed: string
): Promise<{ cmd: string; args: string[]; kind: SandboxKind }> {
    const detected = await detectSandbox();
    if (detected.kind === "bwrap") {
        return {
            cmd: "bwrap",
            args: [
                "--ro-bind",
                "/",
                "/",
                "--tmpfs",
                "/tmp",
                "--bind",
                cwdAllowed,
                cwdAllowed,
                "--proc",
                "/proc",
                "--dev",
                "/dev",
                "--unshare-all",
                "--die-with-parent",
                "--",
                cmd,
                ...args
            ],
            kind: "bwrap"
        };
    }
    if (detected.kind === "firejail") {
        return {
            cmd: "firejail",
            args: [
                "--quiet",
                "--noprofile",
                "--net=none",
                "--private-tmp",
                `--whitelist=${cwdAllowed}`,
                "--",
                cmd,
                ...args
            ],
            kind: "firejail"
        };
    }
    if (detected.kind === "sandbox-exec") {
        // Minimal sandbox-exec profile — deny by default, allow process
        // primitives + reads everywhere + writes only under cwdAllowed.
        const profile = `(version 1)
(deny default)
(allow process-fork)
(allow process-exec)
(allow file-read*)
(allow file-write* (subpath "${cwdAllowed.replace(/"/g, '\\"')}"))
(allow file-write* (regex #"^/dev/null$"))
(allow file-write* (regex #"^/dev/dtracehelper$"))
(allow sysctl-read)
(allow mach-lookup)
(allow signal (target self))
(allow ipc-posix-shm)
(deny network*)`;
        return {
            cmd: "/usr/bin/sandbox-exec",
            args: ["-p", profile, cmd, ...args],
            kind: "sandbox-exec"
        };
    }
    return { cmd, args, kind: "none" };
}

/** Test helper — clears the per-process cache so unit tests can re-probe. */
export function __resetSandboxCacheForTest(): void {
    cached = undefined;
}
