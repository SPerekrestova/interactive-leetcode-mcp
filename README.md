# LeetCode MCP Server Extended

[![GitHub License](https://img.shields.io/github/license/jinzcdev/leetcode-mcp-server.svg)](https://img.shields.io/github/license/jinzcdev/leetcode-mcp-server.svg)
[![Stars](https://img.shields.io/github/stars/SPerekrestova/leetcode-mcp-extended)](https://github.com/SPerekrestova/leetcode-mcp-extended)

The LeetCode MCP Server is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that provides seamless integration with LeetCode APIs, enabling advanced automation and intelligent interaction with LeetCode's programming problems, contests, solutions, and user data.

## 🚀 Extensions

This fork extends the original [@jinzcdev/leetcode-mcp-server](https://github.com/jinzcdev/leetcode-mcp-server) with:

- **One-time Authorization**: Browser-based login flow with automatic credential storage
- **Solution Submission**: Submit code and receive real-time results with detailed feedback
- **Multi-language Support**: Java, Python, C++, JavaScript, TypeScript
- **Session Management**: Automatic credential persistence and session handling

Perfect for conversational LeetCode practice with Claude Code!

## Features

- 🌐 **Multi-site Support**: Support​ both leetcode.com (Global) and leetcode.cn (China) platforms
- 📊 **Problem Data Retrieval**: Obtain detailed problem descriptions, constraints, examples, official editorials, and ​user-submitted solutions
- 👤 **User Data Access**: Retrieve user profiles, submission history, and contest performance
- 🔒 **​Private Data Access**: Create and query user notes, track problem-solving progress, and analyze submission details (AC/WA analysis)
- 🔍 **Advanced Search Capabilities**: Filter problems by tags, difficulty levels, categories, and keywords
- 📅 **Daily Challenge Access**: Easily access daily challenge problems

## Prerequisites

1. Node.js (v20.x or above)
2. (Optional) LeetCode session cookie for authenticated API access

## Installation

### Clone and Build

```bash
# Clone the extended repository
git clone https://github.com/SPerekrestova/leetcode-mcp-extended.git

# Navigate to the project directory
cd leetcode-mcp-extended

# Install dependencies and build
npm install && npm run build
```

### Configuration for Claude Code

Add to your Claude Code MCP configuration file (typically `~/.config/claude-code/mcp.json`):

```json
{
  "mcpServers": {
    "leetcode-extended": {
      "command": "node",
      "args": [
        "/path/to/leetcode-mcp-extended/build/index.js",
        "--site",
        "global"
      ]
    }
  }
}
```

Replace `/path/to/leetcode-mcp-extended` with the actual path where you cloned the repository.

### Optional: Install Globally

For easier access, you can link the package globally:

```bash
npm link
```

Then update your MCP configuration to use the global command:

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

## First-Time Setup

After installation, authorize with LeetCode to enable submission capabilities:

### Using Claude Code

Simply ask Claude to authorize:

```
You: "Authorize with LeetCode"
Claude: [Opens browser for login]
You: [Log in to LeetCode]
Claude: "✓ Successfully authorized!"
```

Credentials are automatically saved to `~/.leetcode-mcp/credentials.json` and will be reused for all future submissions.

### Manual Testing

You can also test authorization manually:

```bash
cd leetcode-mcp-extended
npm run build
node build/index.js
# Then use the authorize_leetcode tool
```

> [!NOTE]
>
> - Authorization is only required once (or when your session expires)
> - Session cookies typically remain valid for weeks/months
> - Re-authorization is only needed when you see "Session expired" errors
> - Credentials are stored locally and never transmitted except to LeetCode

## Usage

### Visual Studio Code Integration

Add the following JSON configuration to your User Settings (JSON) file. Access this by pressing `Ctrl/Cmd + Shift + P` and searching for `Preferences: Open User Settings (JSON)`.

#### Option 1: Using Environment Variables

```json
{
  "mcp": {
    "servers": {
      "leetcode": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@jinzcdev/leetcode-mcp-server"],
        "env": {
          "LEETCODE_SITE": "global",
          "LEETCODE_SESSION": "<YOUR_LEETCODE_SESSION_COOKIE>"
        }
      }
    }
  }
}
```

#### Option 2: Using Command Line Arguments

```json
{
  "mcp": {
    "servers": {
      "leetcode": {
        "type": "stdio",
        "command": "npx",
        "args": [
          "-y",
          "@jinzcdev/leetcode-mcp-server",
          "--site",
          "global",
          "--session",
          "<YOUR_LEETCODE_SESSION_COOKIE>"
        ]
      }
    }
  }
}
```

For LeetCode China site, modify the `--site` parameter to `cn`.

> [!TIP]
>
> The server supports the following optional environment variables:
>
> - `LEETCODE_SITE`: LeetCode API endpoint ('global' or 'cn', default: 'global')
> - `LEETCODE_SESSION`: LeetCode session cookie for authenticated API access (default: empty)
>
> **Priority Note**:
> Command-line arguments take precedence over environment variables when both are specified. For example:
>
> - If `LEETCODE_SITE=cn` is set but you run `leetcode-mcp-server --site global`, the server will use `global`.
> - If `LEETCODE_SESSION` exists but you provide `--session "new_cookie"`, the command-line session value will be used.

## Available Tools

### Authorization & Submission

| Tool                   | Global | CN  | Auth Required | Description                                                       |
| ---------------------- | :----: | :-: | :-----------: | ----------------------------------------------------------------- |
| **authorize_leetcode** |   ✅   | ✅  |      ❌       | Launch browser for one-time LeetCode login and credential storage |
| **submit_solution**    |   ✅   | ❌  |      ✅       | Submit a solution to a LeetCode problem and get real-time results |

### Problems

| Tool                    | Global | CN  | Auth Required | Description                                                  |
| ----------------------- | :----: | :-: | :-----------: | ------------------------------------------------------------ |
| **get_daily_challenge** |   ✅   | ✅  |      ❌       | Retrieves today's LeetCode Daily Challenge problem           |
| **get_problem**         |   ✅   | ✅  |      ❌       | Retrieves details for a specific LeetCode problem            |
| **search_problems**     |   ✅   | ✅  |      ❌       | Searches for LeetCode problems with multiple filter criteria |

### Users

| Tool                              | Global | CN  | Auth Required | Description                                                  |
| --------------------------------- | :----: | :-: | :-----------: | ------------------------------------------------------------ |
| **get_user_profile**              |   ✅   | ✅  |      ❌       | Retrieves profile information for a LeetCode user            |
| **get_user_contest_ranking**      |   ✅   | ✅  |      ❌       | Obtains contest ranking statistics for a user                |
| **get_recent_ac_submissions**     |   ✅   | ✅  |      ❌       | Retrieves a user's recent accepted submissions               |
| **get_recent_submissions**        |   ✅   | ❌  |      ❌       | Retrieves a user's recent submissions history                |
| **get_user_status**               |   ✅   | ✅  |      ✅       | Retrieves current user's current status                      |
| **get_problem_submission_report** |   ✅   | ✅  |      ✅       | Provides detailed submission analysis for a specific problem |
| **get_problem_progress**          |   ✅   | ✅  |      ✅       | Retrieves current user's problem-solving progress            |
| **get_all_submissions**           |   ✅   | ✅  |      ✅       | Retrieves current user's submission history                  |

### Notes

| Tool             | Global | CN  | Auth Required | Description                                           |
| ---------------- | :----: | :-: | :-----------: | ----------------------------------------------------- |
| **search_notes** |   ❌   | ✅  |      ✅       | Searches for user notes with filtering options        |
| **get_note**     |   ❌   | ✅  |      ✅       | Retrieves notes for a specific problem by question ID |
| **create_note**  |   ❌   | ✅  |      ✅       | Creates a new note for a specific problem             |
| **update_note**  |   ❌   | ✅  |      ✅       | Updates an existing note with new content             |

### Solutions

| Tool                       | Global | CN  | Auth Required | Description                                                    |
| -------------------------- | :----: | :-: | :-----------: | -------------------------------------------------------------- |
| **list_problem_solutions** |   ✅   | ✅  |      ❌       | Retrieves a list of community solutions for a specific problem |
| **get_problem_solution**   |   ✅   | ✅  |      ❌       | Retrieves the complete content of a specific solution          |

## Tool Parameters

### Authorization & Submission

- **authorize_leetcode** - Launch browser for one-time LeetCode login. Credentials saved for all future operations.

  - `site`: LeetCode site to authorize with (enum: "global", "cn", optional, default: "global")

  **Example Response (Success):**

  ```json
  {
    "success": true,
    "message": "Successfully authorized with LeetCode! Credentials saved."
  }
  ```

  **Example Response (Failure):**

  ```json
  {
    "success": false,
    "message": "Login timeout. Please try again.",
    "error": "User did not complete login within 90 seconds"
  }
  ```

- **submit_solution** - Submit a solution to a LeetCode problem and get results

  - `problemSlug`: The problem slug/identifier (e.g., "two-sum") (string, required)
  - `code`: The solution code to submit (string, required)
  - `language`: Programming language (enum: "java", "python", "python3", "cpp", "c++", "javascript", "js", "typescript", "ts", required)

  **Example Response (Accepted):**

  ```json
  {
    "accepted": true,
    "runtime": "2 ms",
    "memory": "44.5 MB",
    "statusMessage": "Accepted"
  }
  ```

  **Example Response (Wrong Answer):**

  ```json
  {
    "accepted": false,
    "statusMessage": "Wrong Answer",
    "failedTestCase": "Input: [3,2,4]\nExpected: [1,2]\nGot: [0,1]"
  }
  ```

  **Example Response (Authorization Required):**

  ```json
  {
    "accepted": false,
    "errorMessage": "Not authorized. Please run authorization first.",
    "statusMessage": "Authorization Required"
  }
  ```

### Problems

- **get_daily_challenge** - Retrieves today's LeetCode Daily Challenge problem with complete details

  - No parameters required

- **get_problem** - Retrieves details about a specific LeetCode problem

  - `titleSlug`: The URL slug/identifier of the problem (string, required)

- **search_problems** - Searches for LeetCode problems based on multiple filter criteria
  - `category`: Problem category filter (string, optional, default: "all-code-essentials")
  - `tags`: List of topic tags to filter problems by (string[], optional)
  - `difficulty`: Problem difficulty level filter (enum: "EASY", "MEDIUM", "HARD", optional)
  - `searchKeywords`: Keywords to search in problem titles and descriptions (string, optional)
  - `limit`: Maximum number of problems to return (number, optional, default: 10)
  - `offset`: Number of problems to skip (number, optional)

### Users

- **get_user_profile** - Retrieves profile information about a LeetCode user

  - `username`: LeetCode username (string, required)

- **get_user_contest_ranking** - Retrieves a user's contest ranking information

  - `username`: LeetCode username (string, required)
  - `attended`: Whether to include only the contests the user has participated in (boolean, optional, default: true)

- **get_recent_submissions** - Retrieves a user's recent submissions on LeetCode Global

  - `username`: LeetCode username (string, required)
  - `limit`: Maximum number of submissions to return (number, optional, default: 10)

- **get_recent_ac_submissions** - Retrieves a user's recent accepted submissions

  - `username`: LeetCode username (string, required)
  - `limit`: Maximum number of submissions to return (number, optional, default: 10)

- **get_user_status** - Retrieves the current user's status

  - No parameters required

- **get_problem_submission_report** - Retrieves detailed information about a specific submission

  - `id`: The numerical submission ID (number, required)

- **get_problem_progress** - Retrieves the current user's problem-solving progress

  - `offset`: Number of questions to skip (number, optional, default: 0)
  - `limit`: Maximum number of questions to return (number, optional, default: 100)
  - `questionStatus`: Filter by question status (enum: "ATTEMPTED", "SOLVED", optional)
  - `difficulty`: Filter by difficulty levels (string[], optional)

- **get_all_submissions** - Retrieves paginated list of user's submissions
  - `limit`: Maximum number of submissions to return (number, default: 20)
  - `offset`: Number of submissions to skip (number, default: 0)
  - `questionSlug`: Optional problem identifier (string, optional)
  - `lang`: Programming language filter (string, optional, CN only)
  - `status`: Submission status filter (enum: "AC", "WA", optional, CN only)
  - `lastKey`: Pagination token for retrieving next page (string, optional, CN only)

### Notes

- **search_notes** - Searches for user notes on LeetCode China

  - `keyword`: Search term to filter notes (string, optional)
  - `limit`: Maximum number of notes to return (number, optional, default: 10)
  - `skip`: Number of notes to skip (number, optional, default: 0)
  - `orderBy`: Sort order for returned notes (enum: "ASCENDING", "DESCENDING", optional, default: "DESCENDING")

- **get_note** - Retrieves user notes for a specific LeetCode problem
  - `questionId`: The question ID of the LeetCode problem (string, required)
  - `limit`: Maximum number of notes to return (number, optional, default: 10)
  - `skip`: Number of notes to skip (number, optional, default: 0)
- **create_note** - Creates a new note for a specific LeetCode problem

  - `questionId`: The question ID of the LeetCode problem (string, required)
  - `content`: The content of the note, supports markdown format (string, required)
  - `summary`: An optional short summary or title for the note (string, optional)

- **update_note** - Updates an existing note with new content or summary
  - `noteId`: The ID of the note to update (string, required)
  - `content`: The new content for the note, supports markdown format (string, required)
  - `summary`: An optional new short summary or title for the note (string, optional)

### Solutions

- **list_problem_solutions** - Retrieves a list of community solutions for a specific problem

  - `questionSlug`: The URL slug/identifier of the problem (string, required)
  - `limit`: Maximum number of solutions to return (number, optional, default: 10)
  - `skip`: Number of solutions to skip (number, optional)
  - `userInput`: Search term to filter solutions (string, optional)
  - `tagSlugs`: Array of tag identifiers to filter solutions (string[], optional, default: [])
  - `orderBy`: Sorting criteria for the returned solutions
    - Global: enum: "HOT", "MOST_RECENT", "MOST_VOTES", optional, default: "HOT"
    - CN: enum: "DEFAULT", "MOST_UPVOTE", "HOT", "NEWEST_TO_OLDEST", "OLDEST_TO_NEWEST", optional, default: "DEFAULT"

- **get_problem_solution** - Retrieves the complete content of a specific solution
  - `topicId`: Unique topic ID of the solution (string, required, Global only)
  - `slug`: Unique slug/identifier of the solution (string, required, CN only)

## Available Resources

| Resource Name          | Global | CN  | Auth Required | Description                                                  |
| ---------------------- | :----: | :-: | :-----------: | ------------------------------------------------------------ |
| **problem-categories** |   ✅   | ✅  |      ❌       | A list of all problem classification categories              |
| **problem-tags**       |   ✅   | ✅  |      ❌       | A detailed collection of algorithmic and data structure tags |
| **problem-langs**      |   ✅   | ✅  |      ❌       | A complete list of all supported programming languages       |
| **problem-detail**     |   ✅   | ✅  |      ❌       | Provides details about a specific problem                    |
| **problem-solution**   |   ✅   | ✅  |      ❌       | Provides the complete content of a specific solution         |

## Resource URIs

- **problem-categories** - A list of all problem classification categories

  - URI: `categories://problems/all`

- **problem-tags** - A detailed collection of algorithmic and data structure tags

  - URI: `tags://problems/all`

- **problem-langs** - A complete list of all programming languages supported by LeetCode

  - URI: `langs://problems/all`

- **problem-detail** - Provides details about a specific LeetCode problem

  - URI: `problem://{titleSlug}`
  - Parameters:
    - `titleSlug`: Problem identifier as it appears in the LeetCode URL

- **problem-solution** - Provides the complete content of a specific solution
  - Global URI: `solution://{topicId}`
    - Parameters:
      - `topicId`: Unique topic ID of the solution
  - CN URI: `solution://{slug}`
    - Parameters:
      - `slug`: Unique slug/identifier of the solution

## Authentication

### Recommended: Browser-Based Authorization (Extended Feature)

The easiest way to authorize is using the `authorize_leetcode` tool:

1. Ask Claude: "Authorize with LeetCode"
2. Browser opens automatically
3. Log in to LeetCode
4. Credentials saved automatically

### Alternative: Manual Cookie Configuration

For read-only operations, you can manually configure the session cookie:

1. Log in to LeetCode ([Global](https://leetcode.com) or [China](https://leetcode.cn) site)
2. Extract `LEETCODE_SESSION` cookie from browser developer tools
3. Configure server with `--session` flag or `LEETCODE_SESSION` environment variable

> [!TIP]
> The browser-based authorization method is recommended as it:
>
> - Eliminates manual cookie extraction
> - Automatically refreshes credentials
> - Stores credentials securely for reuse
> - Enables submission capabilities

## Complete Usage Guide

### 1. First-Time Setup

After installation, authorize once to enable submission features:

```
You: "Set up LeetCode for me"
Claude: [Opens browser for authorization]
You: [Log in to LeetCode]
Claude: "✓ Authorized!"
```

Credentials are saved to `~/.leetcode-mcp/credentials.json` and automatically reused.

### 2. Practice Workflow

#### Get a Problem

```
You: "I want to practice the two-sum problem"
Claude: [Fetches problem details, shows description and examples]
```

#### Write Your Solution

Write your code in your preferred editor. When you need help:

```
You: "Can you give me a hint for two-sum?"
Claude: [Provides contextual guidance]
```

#### Submit Your Solution

```
You: "Submit this solution: [paste your code]"
Claude: [Submits code, returns results]
```

**Example submission:**

```
You: "Submit this Java solution for two-sum:
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}"

Claude: "🎉 Accepted! Runtime: 2 ms, Memory: 44.5 MB"
```

### 3. Tips & Best Practices

- **Authorization:** Only needed once (or when session expires after weeks/months)
- **Language Support:** Java, Python, C++, JavaScript, TypeScript
- **Failed Submissions:** Automatically shows test case details for debugging
- **Daily Challenges:** Use `get_daily_challenge` to fetch today's problem
- **Problem Search:** Use `search_problems` with filters for difficulty, tags, keywords

### 4. Conversational Examples

#### Getting Started

```
You: "Show me today's daily challenge"
Claude: [Fetches and displays daily problem]

You: "I'll solve it in Python"
[Write your solution]

You: "Submit my solution: [code]"
Claude: [Shows results]
```

#### Debugging Failed Submissions

```
You: "Submit my solution for valid-parentheses: [code]"
Claude: "Wrong Answer - Input: '([)]', Expected: false, Got: true"

You: "Why did it fail?"
Claude: [Explains the edge case and suggests fix]

You: "Submit updated solution: [fixed code]"
Claude: "✓ Accepted!"
```

#### Exploring Problems

```
You: "Find me medium-difficulty array problems"
Claude: [Lists matching problems]

You: "Tell me about the 'container-with-most-water' problem"
Claude: [Shows problem details]
```

## Troubleshooting

### Authorization Issues

**Problem:** Browser doesn't open

```bash
# Install Playwright browsers
npx playwright install chromium
```

**Problem:** "Login timeout" error

- Login must complete within 90 seconds
- Check browser allows automated control
- Try again with `authorize_leetcode` tool

**Problem:** "Failed to extract cookies"

- Ensure you fully completed login (reached LeetCode homepage)
- Check browser didn't block cookie access

### Submission Issues

**Problem:** "Not authorized" error

```
You: "Authorize with LeetCode"
# Complete login flow
```

**Problem:** "Unsupported language" error

- Supported: `java`, `python`, `python3`, `cpp`, `c++`, `javascript`, `js`, `typescript`, `ts`
- Language names are case-insensitive
- Use exact names from the list

**Problem:** "Session expired" error

- Sessions typically last weeks/months
- Re-authorize when prompted:
  ```
  You: "Authorize with LeetCode"
  ```

**Problem:** Submission timeout

- LeetCode processing may be slow
- Wait 30 seconds for automatic timeout
- Check internet connection
- Retry submission

### MCP Server Issues

**Problem:** Tools not appearing in Claude Code

1. Verify MCP configuration file path
2. Check absolute path to `build/index.js` is correct
3. Restart Claude Code
4. Test server manually:
   ```bash
   node build/index.js --site global
   ```

**Problem:** Server crashes or fails to start

```bash
# Rebuild project
npm run build

# Check for errors
npm run build 2>&1 | grep error

# Verify Node.js version
node --version  # Should be v20.x or above
```

**Problem:** "Module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Testing Issues

**Problem:** Tests fail

```bash
# Run tests with verbose output
npm test

# Run specific test file
npx vitest run tests/utils/credentials.test.ts
```

## Response Format

All tools return JSON-formatted responses with the following structure:

```json
{
  "content": [
    {
      "type": "text",
      "text": "JSON_DATA_STRING"
    }
  ]
}
```

The `JSON_DATA_STRING` contains either the requested data or an error message for failed requests.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Setup

```bash
git clone https://github.com/SPerekrestova/leetcode-mcp-extended.git
cd leetcode-mcp-extended
npm install
npm run build
npm test
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build and test
npm run build && npm test
```

## License

This project is licensed under the MIT License.

## Acknowledgments

- **Original Project:** [@jinzcdev/leetcode-mcp-server](https://github.com/jinzcdev/leetcode-mcp-server)
- **MCP Protocol:** [Anthropic Model Context Protocol](https://modelcontextprotocol.io/)
- **LeetCode:** Platform for coding practice
