#!/usr/bin/env node

/**
 * Syncs the version from package.json to:
 * - server.json (MCP registry metadata)
 * - .claude-plugin/plugin.json (Claude Code plugin manifest)
 * - All SKILL.md files (pinned npm package version in install instructions)
 *
 * Run: npm run sync-version
 * Runs automatically before publish via prepublishOnly hook.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pkg = require(path.join(ROOT, "package.json"));
const version = pkg.version;

// --- server.json ---
const serverPath = path.join(ROOT, "server.json");
const server = JSON.parse(fs.readFileSync(serverPath, "utf-8"));
server.version = version;
server.packages[0].version = version;
fs.writeFileSync(serverPath, JSON.stringify(server, null, 4) + "\n");

// --- .claude-plugin/plugin.json ---
const pluginPath = path.join(ROOT, ".claude-plugin", "plugin.json");
if (fs.existsSync(pluginPath)) {
    const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf-8"));
    plugin.version = version;
    fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n");
}

// --- .claude-plugin/marketplace.json ---
const marketplacePath = path.join(ROOT, ".claude-plugin", "marketplace.json");
if (fs.existsSync(marketplacePath)) {
    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf-8"));
    for (const p of marketplace.plugins || []) {
        p.version = version;
    }
    fs.writeFileSync(
        marketplacePath,
        JSON.stringify(marketplace, null, 2) + "\n"
    );
}

// --- SKILL.md files (update pinned @version in install instructions) ---
const skillPaths = [
    "skills/interactive-leetcode-mcp/SKILL.md",
    ".claude/skills/using-interactive-leetcode-mcp/SKILL.md",
    "clawhub-skill/interactive-leetcode-mcp/SKILL.md"
];

const versionPattern = /@sperekrestova\/interactive-leetcode-mcp@[\w.-]+/g;
const versionReplacement = `@sperekrestova/interactive-leetcode-mcp@${version}`;

for (const rel of skillPaths) {
    const fullPath = path.join(ROOT, rel);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    const updated = content.replace(versionPattern, versionReplacement);
    if (updated !== content) {
        fs.writeFileSync(fullPath, updated);
    }
}

console.log(`Synced version ${version} to all targets.`);
