# Interactive LeetCode MCP

> Interactive LeetCode practice with AI-guided learning through Claude

[![npm version](https://img.shields.io/npm/v/@sperekrestova/interactive-leetcode-mcp.svg)](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@sperekrestova/interactive-leetcode-mcp.svg)](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
[![GitHub stars](https://img.shields.io/github/stars/SPerekrestova/interactive-leetcode-mcp)](https://github.com/SPerekrestova/interactive-leetcode-mcp)
[![MCP Registry](https://badge.mcpx.dev?status=on)](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.SPerekrestova%2Finteractive-leetcode-mcp/versions/2.0.1)
[![GitHub license](https://img.shields.io/github/license/SPerekrestova/interactive-leetcode-mcp)](https://github.com/SPerekrestova/interactive-leetcode-mcp/blob/main/LICENSE)


## Attention!

> - Current project is under active development
> - Main branch **does not guarantee** working version
> - Stable builds are published in npm and modelcontextprotocol registries
> - Also available by latest release tag


## Features

- 🔐 **Native browser authorization** - Uses your default browser with automatic cookie extraction
- 🎓 **Learning-guided mode** - AI provides hints before solutions to maximize learning
- 📝 **Solution submission** - Submit code and get instant results
- 💬 **Conversational workflow** - Practice naturally with Claude Code
- 🌍 **Multi-language support** - Java, Python, C++, JavaScript, TypeScript, and more
- 📊 **Detailed feedback** - Runtime stats, memory usage, failed test cases
- 📚 **Problem data** - Descriptions, constraints, examples, editorial solutions
- 👤 **User tracking** - Profile data, submission history, contest rankings

## Prerequisites

- Node.js v20.x or above
- LeetCode account
- Chromium-based browser (Chrome, Edge, or Brave)

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

### Claude Code & Claude Desktop

You can execute this command in CLI

```bash
claude mcp add --transport stdio leetcode -- npx -y @sperekrestova/interactive-leetcode-mcp@latest
```

Or add to your MCP configuration file (`~/.config/claude-code/mcp.json`) or (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "leetcode": {
      "command": "npx",
      "args": ["-y", "interactive-leetcode-mcp"]
    }
  }
}
```

### Local build

```json
{
  "mcpServers": {
    "leetcode": {
      "command": "node",
      "args": ["/path/to/this/project/interactive-leetcode-mcp/build/index.js"]
    }
  }
}
```

## Quick Start

### 1. Authorize with LeetCode

```
You: "Authorize with LeetCode"
Claude: [Opens your default browser to LeetCode login]
You: [Log in to your LeetCode account in the browser]
Claude: "Session created. Now use confirm_leetcode_login to complete authorization."
You: "Confirm my LeetCode login"
Claude: "✓ Successfully authorized using chrome cookies!"
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

- Opens your default browser to LeetCode login page
- Creates authorization session (5-minute timeout)
- Returns session ID for next step
- No parameters required

**`confirm_leetcode_login`**

- Completes authorization after browser login
- Extracts cookies from Chrome/Edge/Brave automatically
- Validates credentials with LeetCode API
- Parameters: `sessionId` (from authorize_leetcode)
- Saves credentials for all future operations

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

## Learning Mode

The Interactive LeetCode MCP includes AI agent guidance through MCP Prompts to create a better learning experience.

### Features

**Automatic Workspace Setup:**
When you fetch a problem, the MCP guides Claude to:

- Create a workspace file named `{problem-slug}.{extension}`
- Paste the code template into the file
- Set up proper naming conventions (e.g., Java class names)

**Learning-Guided Mode:**
The MCP enforces pedagogical best practices:

- Provides progressive hints (4 levels) before revealing solutions
- Asks guiding questions about approach and complexity
- Encourages independent problem-solving
- Only shows complete solutions when explicitly requested

**Problem Workflow:**
Guides you through the complete cycle:

1. Understand the problem
2. Plan the approach
3. Set up workspace
4. Implement with hints
5. Optimize and analyze complexity
6. Submit and review results

### How to Use Learning Mode

The learning mode is always active. When working with LeetCode problems:

1. **Fetch a problem** to see the description and get workspace setup guidance
2. **Ask for hints** rather than solutions ("Give me a hint")
3. **Implement your solution** with progressive guidance
4. **Request the solution** only when you want to compare with optimal approach ("Show me the solution")

Claude will automatically follow learning-mode guidelines thanks to the MCP prompts.

## Troubleshooting

**"Not authorized" error**

- Run authorization again: Ask Claude to "Authorize with LeetCode"
- Complete both steps: `authorize_leetcode` then `confirm_leetcode_login`
- Make sure you're logged into LeetCode in your browser

**"Authorization session expired"**

- Run `authorize_leetcode` again
- You have 5 minutes to complete the login process

**"Could not detect Chrome, Edge, or Brave browser"**

- The MCP currently supports Chromium-based browsers only
- Firefox and Safari support coming in future updates
- Make sure Chrome, Edge, or Brave is installed

**"LeetCode cookies not found"**

- Make sure you're logged into LeetCode in your browser
- Try logging out and back in
- Check that you're using a supported browser (Chrome/Edge/Brave)

**"Extracted cookies are invalid"**

- Cookies may have expired - log into LeetCode again in your browser
- Try clearing your browser cookies and logging in fresh

**"Unsupported language" error**

- Supported languages: java, python, python3, cpp, c++, javascript, js, typescript, ts

**Submission timeout**

- LeetCode may be slow, wait and retry
- Check internet connection

**Browser doesn't open during authorization**

- Check if your default browser is set correctly
- Try opening https://leetcode.com/accounts/login/ manually
- Then proceed with `confirm_leetcode_login`

## Acknowledgements

Forked from [Leetcode mcp](https://github.com/jinzcdev/leetcode-mcp-server))

## License

MIT © SPerekrestova

## Links

- [NPM Package](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
- [Report Issues](https://github.com/SPerekrestova/interactive-leetcode-mcp/issues)
- [MCP Documentation](https://modelcontextprotocol.io)
