# Interactive LeetCode MCP

[![npm version](https://img.shields.io/npm/v/@sperekrestova/interactive-leetcode-mcp.svg)](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@sperekrestova/interactive-leetcode-mcp.svg)](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
[![GitHub stars](https://img.shields.io/github/stars/SPerekrestova/interactive-leetcode-mcp)](https://github.com/SPerekrestova/interactive-leetcode-mcp)
[![MCP Registry](https://badge.mcpx.dev?status=on)](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.SPerekrestova%2Finteractive-leetcode-mcp/versions/latest)
[![GitHub license](https://img.shields.io/github/license/SPerekrestova/interactive-leetcode-mcp)](https://github.com/SPerekrestova/interactive-leetcode-mcp/blob/main/LICENSE)

> Current project is under active development and may not work perfectly

## Features

<video src="https://github.com/user-attachments/assets/935bbc9f-7199-417e-8987-fd6cd60b8fb5"></video>

- 🔐 **AI-guided authentication** - Claude walks you through one-time credential setup
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
- Any modern web browser (Chrome, Firefox, Safari, Edge, etc.)

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
Claude: [Opens LeetCode in your browser and guides you through the process]
Claude: "Please log in to your account. Once logged in, I'll walk you through
        getting two cookie values we need. First, press F12 to open DevTools..."
You: [Follows Claude's step-by-step guidance]
You: "Here are my cookies: csrftoken is abc123... and LEETCODE_SESSION is xyz789..."
Claude: "✓ Perfect! Your credentials are validated and saved. Welcome back, johndoe!"
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

**`start_leetcode_auth`**

- Initiates authentication flow
- Opens browser to LeetCode login (when possible)
- Returns structured instructions for AI agent to guide you
- No parameters required

**`save_leetcode_credentials`**

- Validates and saves your LeetCode credentials
- Parameters: `csrftoken`, `session` (cookie values you provide)
- Makes test API call to verify credentials
- Securely stores credentials for future use

**`check_auth_status`**

- Checks if you're authenticated
- Returns username and credential age
- Warns if credentials may expire soon
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

**"Not authorized" or "Invalid credentials" error**

- Ask Claude to "Authorize with LeetCode" to start fresh authentication
- Make sure you're logged into LeetCode in your browser before extracting cookies
- Verify you copied the complete cookie values (they can be very long)
- Check that you didn't accidentally copy extra spaces or characters

**"Credentials have expired"**

- LeetCode cookies typically expire after 7-14 days
- Simply ask Claude to "Authorize with LeetCode" again
- You'll need to extract fresh cookies from your browser

**Can't find DevTools or cookies**

- Ask Claude which browser you're using - Claude will provide browser-specific instructions
- In Chrome: Press F12, click "Application" tab, expand "Cookies"
- In Firefox: Press F12, click "Storage" tab, expand "Cookies"
- In Safari: Enable Developer menu first (Preferences → Advanced), then Develop → Show Web Inspector

**Copied wrong values**

- Make sure you're copying the VALUE column, not the name
- The values should be long random strings (50+ characters)
- Double-click the value to select all of it before copying
- If you're unsure, Claude can guide you through the process again

**Browser doesn't open during authorization**

- That's okay! Just open https://leetcode.com/accounts/login/ manually
- Claude will still guide you through the cookie extraction process

**"Unsupported language" error**

- Supported languages: java, python, python3, cpp, c++, javascript, js, typescript, ts

**Submission timeout**

- LeetCode may be experiencing high traffic - wait and retry
- Check your internet connection

## Acknowledgements

Forked from [Leetcode mcp](https://github.com/jinzcdev/leetcode-mcp-server))

## License

MIT © SPerekrestova

## Links

- [NPM Package](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
- [Report Issues](https://github.com/SPerekrestova/interactive-leetcode-mcp/issues)
- [MCP Documentation](https://modelcontextprotocol.io)
