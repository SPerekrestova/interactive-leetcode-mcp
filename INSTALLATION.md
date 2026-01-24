# Installation Guide

## Prerequisites

- Node.js v20.x or above
- npm v8.x or above
- LeetCode account

## Installation Options

### Option 1: Global NPM Install (Recommended)

```bash
npm install -g @sperekrestova/interactive-leetcode-mcp
```

Verify installation:

```bash
interactive-leetcode-mcp --version
```

### Option 2: Local Development Install

```bash
# Clone repository
git clone https://github.com/SPerekrestova/interactive-leetcode-mcp.git

# Navigate to directory
cd interactive-leetcode-mcp

# Install dependencies and build
npm install
npm run build

# Link globally
npm link
```

## Configuration

### Claude Code

1. Locate your MCP configuration file:

   - Default: `~/.config/claude-code/mcp.json`

2. Add the server configuration:

```json
{
  "mcpServers": {
    "leetcode": {
      "command": "interactive-leetcode-mcp"
    }
  }
}
```

3. Restart Claude Code

### Claude Desktop

1. Locate your configuration file:

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`

2. Add the server configuration:

```json
{
  "mcpServers": {
    "leetcode": {
      "command": "interactive-leetcode-mcp"
    }
  }
}
```

3. Restart Claude Desktop

## First-Time Setup

After installation and configuration, authorize with LeetCode:

### Using Claude Code or Claude Desktop

Simply ask Claude:

```
"Authorize with LeetCode"
```

Claude will:

1. Open a browser window
2. Navigate to LeetCode login page
3. Wait for you to log in
4. Automatically extract and save credentials
5. Confirm: "✓ Authorized!"

Your credentials are saved to `~/.leetcode-mcp/credentials.json` and will be used for all future operations.

## Verification

Test the installation:

```
You: "Get today's LeetCode daily challenge"
Claude: [Fetches and displays the daily challenge]
```

If this works, you're all set!

## Troubleshooting

### Command not found

**Issue:** `interactive-leetcode-mcp: command not found`

**Solution:**

- Verify global install: `npm list -g @sperekrestova/interactive-leetcode-mcp`
- Check npm global bin path is in PATH: `npm config get prefix`
- Reinstall: `npm install -g @sperekrestova/interactive-leetcode-mcp`

### Authorization fails

**Issue:** Browser doesn't open or credentials not saved

**Solution:**

- Install Playwright browsers: `npx playwright install chromium`
- Check permissions on `~/.leetcode-mcp/` directory
- Try manual authorization from command line: `interactive-leetcode-mcp` (if server has standalone auth)

### Claude can't find the server

**Issue:** Claude says "MCP server not available"

**Solution:**

- Verify configuration file syntax (valid JSON)
- Check command is correct in config: `"command": "interactive-leetcode-mcp"`
- Restart Claude Code/Desktop
- Check MCP logs for errors

### Tools not appearing

**Issue:** LeetCode tools don't show up in Claude

**Solution:**

- Verify server is running: Check MCP server status in Claude
- Check configuration is loaded: Tools should appear in tool list
- Restart Claude and try again

## Upgrading

### From v1.x to v2.0.0

Version 2.0.0 includes breaking changes. Follow migration steps:

1. Uninstall old version:

```bash
npm uninstall -g @sperekrestova/leetcode-mcp-extended
```

2. Install new version:

```bash
npm install -g @sperekrestova/interactive-leetcode-mcp
```

3. Update MCP configuration:

   - Change command from `leetcode-mcp-extended` to `interactive-leetcode-mcp`

4. Re-authorize:
   - Old credentials may not work
   - Run authorization flow again

## Uninstalling

```bash
# Remove global package
npm uninstall -g @sperekrestova/interactive-leetcode-mcp

# Remove credentials (optional)
rm -rf ~/.leetcode-mcp/

# Remove MCP configuration
# Edit your MCP config file and remove the leetcode server entry
```

## Support

- [GitHub Issues](https://github.com/SPerekrestova/interactive-leetcode-mcp/issues)
- [Discussions](https://github.com/SPerekrestova/interactive-leetcode-mcp/discussions)
