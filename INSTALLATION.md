# Installation Guide

This guide helps you install and configure the leetcode-mcp-extended server with Claude Code.

## Prerequisites

- Node.js v20.x or above
- Git
- Claude Code CLI
- LeetCode account (for authorization and submission)

## Installation Steps

### 1. Clone and Build

```bash
git clone https://github.com/SPerekrestova/leetcode-mcp-extended.git
cd leetcode-mcp-extended
npm install
npm run build
```

### 2. Configure Claude Code

Add the MCP server to your Claude Code configuration:

**Location:** `~/.config/claude-code/mcp.json` or equivalent

**Configuration:**

```json
{
  "mcpServers": {
    "leetcode-extended": {
      "command": "node",
      "args": [
        "/absolute/path/to/leetcode-mcp-extended/build/index.js",
        "--site",
        "global"
      ]
    }
  }
}
```

Replace `/absolute/path/to` with the actual path where you cloned the repository.

### 3. Restart Claude Code

After updating the configuration, restart Claude Code for changes to take effect.

### 4. Verify Installation

In a new Claude Code session:

```
You: "What LeetCode tools are available?"
Claude: [Lists tools including authorize_leetcode and submit_solution]
```

### 5. First-Time Authorization

Before submitting solutions, authorize with LeetCode:

```
You: "Authorize with LeetCode"
Claude: [Opens browser]
You: [Log in to LeetCode]
Claude: "✓ Successfully authorized!"
```

## Alternative: Global Installation

For easier access, you can link the package globally:

```bash
cd leetcode-mcp-extended
npm link
```

Then update your MCP configuration:

```json
{
  "mcpServers": {
    "leetcode-extended": {
      "command": "leetcode-mcp-extended",
      "args": ["--site", "global"]
    }
  }
}
```

## Verification

To verify the server is working:

```bash
# Test server starts
node build/index.js --site global

# Should start without errors and wait for MCP protocol messages
```

## Troubleshooting

### Server doesn't start

```bash
# Rebuild the project
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep error
```

### Tools not appearing in Claude Code

1. Check your MCP configuration file path is correct
2. Verify the absolute path to `build/index.js` is correct
3. Restart Claude Code
4. Check Claude Code logs for MCP connection errors

### Authorization fails

```bash
# Check Playwright browsers are installed
npx playwright install chromium

# Verify credentials directory is writable
mkdir -p ~/.leetcode-mcp
```

## Configuration Options

The server supports these command-line arguments:

- `--site <global|cn>`: LeetCode site (default: global)
- `--session <cookie>`: Optional session cookie for read-only operations

Environment variables are also supported:

- `LEETCODE_SITE`: global or cn
- `LEETCODE_SESSION`: Session cookie

## Next Steps

Once installed:

1. Authorize with LeetCode (see README.md)
2. Start solving problems conversationally
3. Submit solutions directly from chat

See README.md for complete usage documentation.
