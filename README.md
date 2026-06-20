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
interactive-leetcode-mcp --version
interactive-leetcode-mcp --help
```

You can also run the package without installing it globally:

```bash
npx -y @sperekrestova/interactive-leetcode-mcp@latest --version
```

### From Source

```bash
git clone https://github.com/SPerekrestova/interactive-leetcode-mcp.git
cd interactive-leetcode-mcp
npm install && npm run build
npm link
```

### Fresh Environment Smoke Test

Use this to verify the published npm package from a clean directory without any
LeetCode credentials:

```bash
mkdir leetcode-mcp-smoke
cd leetcode-mcp-smoke
npm init -y
npm install @sperekrestova/interactive-leetcode-mcp
npx --no-install interactive-leetcode-mcp --version
npx --no-install interactive-leetcode-mcp --help
```

Those commands confirm that Node can install the package and expose the CLI
binary. For actual MCP server validation, use an integration test that connects
over stdio and completes the MCP handshake.

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
      "args": ["-y", "@sperekrestova/interactive-leetcode-mcp@latest"]
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

### Getting Started

**`get_started`**

- Returns the server usage guide, learning flow, authentication flow, and
  submission language map
- Call this at the start of a LeetCode practice session

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

### Session and Learning Tools

**`start_problem`**

- Opens or resumes a tutoring session for a problem
- Parameters: `titleSlug`, optional `language`
- Required before problem-specific hint and solution tools

**`request_hint`**

- Advances progressive hint levels for the active session
- Parameters: `titleSlug`
- Unlocks community solution tools after the final hint level

**`get_session_state`**

- Shows current hint level and session metadata
- Parameters: `titleSlug`

**`reset_session`**

- Resets hint progress for a problem
- Parameters: `titleSlug`

### Local Runner Tools

**`runner_doctor`**

- Reports which local runtimes are available for supported languages

**`run_local_tests`**

- Runs user code against sample tests in a local subprocess sandbox
- Parameters: `titleSlug`, `language`, `code`, optional `timeoutMs`

### Solution Tools

**`list_problem_solutions`**

- Lists community/editorial solution articles for a problem
- Parameters: `questionSlug`, optional `limit`, `skip`, `orderBy`, `userInput`,
  `tagSlugs`
- Requires the session to reach the solution-unlocked hint level

**`get_problem_solution`**

- Fetches a specific solution article
- Parameters: `topicId`, `titleSlug`
- Requires the session to reach the solution-unlocked hint level

### Submission Tools

**`submit_solution`**

- Submit code and get real-time results
- Parameters: `problemSlug`, `code`, `language`
- Returns: acceptance status, runtime, memory, or failed test case

### User Tools

**`get_user_profile`**

- Retrieve user profile information

**`get_recent_submissions`**

- Get submission history with filtering

**`get_recent_ac_submissions`**

- Get recent accepted submissions

**`get_user_status`**

- Get authenticated user's status/profile summary

**`get_problem_submission_report`**

- Get submission report for one problem

**`get_problem_progress`**

- Get solved/attempted progress for a problem

**`get_all_submissions`**

- Get paginated submission history

**`get_user_contest_ranking`**

- View contest performance and rankings

## Learning Mode

The Interactive LeetCode MCP includes AI agent guidance through MCP Prompts to create a better learning experience.

### Features

**Workspace Setup:**
When learning mode is active, Claude will:

- Create a workspace file named `{problem-slug}.{extension}`
- Paste the code template into the file
- Set up proper naming conventions (e.g., Java class names)

**Learning-Guided Mode:**
When active, Claude follows these guidelines:

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

To activate learning mode, tell Claude you want to practice with guidance — for example, "Let's practice in learning mode" or "I want to learn two-sum with hints." Once active:

1. **Call `get_started`** to load the server's usage guide
2. **Fetch a problem** with `get_daily_challenge`, `search_problems`, or
   `get_problem`
3. **Open a session** with `start_problem`
4. **Ask for hints** via `request_hint` rather than jumping straight to solutions
5. **Implement your solution** with progressive guidance
6. **Request the solution** only after the final hint level or when you want to
   compare with an optimal approach

## Dogfood Testing

To test the MCP server as a black-box MCP client without live LeetCode traffic:

```bash
npm run dogfood:local
```

This builds the server, spawns `build/index.js` over stdio, connects with the
MCP SDK client, uses an isolated `HOME`, serves LeetCode responses from fixtures,
and drives a user-like flow through `runner_doctor`, `start_problem`,
`request_hint`, `run_local_tests`, and `get_session_state`.

See [DOGFOOD_TESTING.md](DOGFOOD_TESTING.md) for the full workflow and a
copy-paste prompt for local Claude/agent dogfood testing.

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

## Skills & Plugins

This repo also ships an **agent skill** that teaches Claude (and other AI agents) how to use the MCP server correctly — including session flow, prompt invocations, learning mode, and authentication.

### Claude Code Plugin

Install the skill directly as a Claude Code plugin:

```
/plugin marketplace add SPerekrestova/interactive-leetcode-mcp
/plugin install interactive-leetcode-mcp@interactive-leetcode-mcp
```

Then start a practice session with:

```
/interactive-leetcode-mcp:interactive-leetcode-mcp
```

### ClawHub (OpenClaw / Clawbot)

The skill is also published on [ClawHub](https://clawhub.ai/SPerekrestova/interactive-leetcode) for use with OpenClaw-compatible agents.

## Acknowledgements

Forked from [Leetcode mcp](https://github.com/jinzcdev/leetcode-mcp-server))

## License

MIT © SPerekrestova

## Links

- [NPM Package](https://www.npmjs.com/package/@sperekrestova/interactive-leetcode-mcp)
- [Report Issues](https://github.com/SPerekrestova/interactive-leetcode-mcp/issues)
- [MCP Documentation](https://modelcontextprotocol.io)
