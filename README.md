# Interactive LeetCode MCP

> Interactive LeetCode practice with AI-guided learning through Claude

[![npm version](https://img.shields.io/npm/v/@sperekrestova/interactive-leetcode-mcp.svg)](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@sperekrestova/interactive-leetcode-mcp.svg)](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
[![GitHub stars](https://img.shields.io/github/stars/SPerekrestova/interactive-leetcode-mcp)](https://github.com/SPerekrestova/interactive-leetcode-mcp)
[![GitHub license](https://img.shields.io/github/license/SPerekrestova/interactive-leetcode-mcp)](https://github.com/SPerekrestova/interactive-leetcode-mcp/blob/main/LICENSE)

## Features

- 🔐 **One-time browser authorization** - Log in once, practice forever
- 📝 **Solution submission** - Submit code and get instant results
- 💬 **Conversational workflow** - Practice naturally with Claude Code
- 🌍 **Multi-language support** - Java, Python, C++, JavaScript, TypeScript
- 📊 **Detailed feedback** - Runtime stats, memory usage, failed test cases
- 📚 **Problem data** - Descriptions, constraints, examples, editorial solutions
- 👤 **User tracking** - Profile data, submission history, contest rankings

## Prerequisites

- Node.js v20.x or above
- LeetCode account

## Installation

### Via NPM (Recommended)

```bash
npm install -g @sperekrestova/interactive-leetcode-mcp
```

### From Source

```bash
git clone https://github.com/SPerekrestova/interactive-leetcode-mcp.git
cd interactive-leetcode-mcp
npm install && npm run build
npm link
```

## Configuration

### Claude Code

Add to your MCP configuration file (`~/.config/claude-code/mcp.json`):

```json
{
  "mcpServers": {
    "leetcode": {
      "command": "interactive-leetcode-mcp"
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "leetcode": {
      "command": "interactive-leetcode-mcp"
    }
  }
}
```

## Quick Start

### 1. Authorize with LeetCode

```
You: "Authorize with LeetCode"
Claude: [Opens browser window]
You: [Log in to your LeetCode account]
Claude: "✓ Authorized! Credentials saved."
```

### 2. Practice a Problem

```
You: "I want to practice two-sum"
Claude: [Fetches problem and creates working file]
```

### 3. Get Help When Stuck

```
You: "Give me a hint"
Claude: [Provides contextual guidance based on your code]
```

### 4. Submit Your Solution

```
You: "Submit my solution"
Claude: "🎉 Accepted! Runtime: 2ms (beats 95.3%)"
```

## Available Tools

### Authorization

**`authorize_leetcode`**

- Opens browser for one-time login
- Saves credentials for all future operations
- No parameters required

### Problem Tools

**`get_daily_challenge`**

- Fetch today's daily coding challenge

**`get_problem`**

- Get detailed problem information by slug
- Parameters: `titleSlug` (e.g., "two-sum")

**`search_problems`**

- Search problems by difficulty, tags, keywords
- Supports filtering and pagination

### Submission Tools

**`submit_solution`**

- Submit code and get real-time results
- Parameters: `problemSlug`, `code`, `language`
- Returns: acceptance status, runtime, memory, or failed test case

### User Tools

**`get_user_profile`**

- Retrieve user profile information

**`get_user_submissions`**

- Get submission history with filtering

**`get_user_contest_ranking`**

- View contest performance and rankings

See [full tool documentation](./docs/tools.md) for complete details.

## Example Workflow

```javascript
// 1. Authorize (one-time setup)
await authorize_leetcode();

// 2. Get today's challenge
const challenge = await get_daily_challenge();

// 3. Fetch problem details
const problem = await get_problem({ titleSlug: "two-sum" });

// 4. Submit solution
const result = await submit_solution({
  problemSlug: "two-sum",
  code: "class Solution { ... }",
  language: "java"
});

// 5. Check user stats
const profile = await get_user_profile({ username: "myusername" });
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Watch Mode

```bash
npm run dev
```

## Troubleshooting

**"Not authorized" error**

- Run authorization again: Ask Claude to "Authorize with LeetCode"
- Browser will open for you to log in

**"Unsupported language" error**

- Supported languages: java, python, python3, cpp, c++, javascript, js, typescript, ts

**Submission timeout**

- LeetCode may be slow, wait and retry
- Check internet connection

**Browser doesn't open during authorization**

- Ensure Playwright is installed: `npx playwright install chromium`

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT © SPerekrestova

## Links

- [NPM Package](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
- [GitHub Repository](https://github.com/SPerekrestova/interactive-leetcode-mcp)
- [Report Issues](https://github.com/SPerekrestova/interactive-leetcode-mcp/issues)
- [MCP Documentation](https://modelcontextprotocol.io)
