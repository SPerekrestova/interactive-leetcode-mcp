# Dogfood testing the MCP as a user

This repo has two ways to test the server like an MCP client would:

1. `npm run dogfood:local` — deterministic black-box smoke test with mocked
   LeetCode HTTP.
2. A local-agent prompt — ask Claude Code/another MCP-capable agent to use the
   local build as a real user would.

## Option 1: deterministic local dogfood

```bash
npm install
npm run dogfood:local
```

The script:

- builds `build/index.js`,
- spawns the built MCP server over stdio,
- connects with `@modelcontextprotocol/sdk`'s `StdioClientTransport`,
- gives the server an isolated temporary `HOME`,
- preloads the same `nock` fixture harness used by e2e tests, so it never
  reaches live `leetcode.com`,
- calls tools in a user-like sequence:
  - `listTools`
  - `runner_doctor`
  - `start_problem`
  - `request_hint`
  - `run_local_tests` for each locally available runtime (`python3`, `go`,
    `java`)
  - `get_session_state`

Set `DOGFOOD_KEEP_HOME=1` if you want to inspect the isolated session directory
after a run:

```bash
DOGFOOD_KEEP_HOME=1 npm run dogfood:local
```

This is the fastest path for Devin or CI-like environments because it needs no
LeetCode credentials and is stable even when LeetCode is down.

## Option 2: local Claude/agent dogfood

First build the server:

```bash
npm install
npm run build
```

Then point the local agent at the build:

```bash
claude mcp add --transport stdio leetcode-local -- node /absolute/path/to/interactive-leetcode-mcp/build/index.js
```

If your agent uses an MCP JSON config instead, add:

```json
{
  "mcpServers": {
    "leetcode-local": {
      "command": "node",
      "args": ["/absolute/path/to/interactive-leetcode-mcp/build/index.js"]
    }
  }
}
```

Use this prompt with the local agent:

```text
You are dogfood-testing the local interactive-leetcode-mcp server as if you were
a user practicing a problem with an MCP-aware coding agent.

Rules:
- Use only the MCP server named `leetcode-local`.
- Do not assume LeetCode credentials are present.
- If auth is missing, do not block: skip live submit/profile checks and continue
  with unauthenticated problem/session/local-runner checks.
- Report a concise transcript of every MCP tool call, arguments, and important
  result fields.
- Treat tool errors as findings only after explaining which call produced them.

Test plan:
1. List available MCP tools and confirm these exist:
   `start_problem`, `request_hint`, `get_session_state`, `runner_doctor`,
   `run_local_tests`, `submit_solution`.
2. Call `runner_doctor` and record which runtimes are available for
   `python3`, `go`, and `java`.
3. Call `get_problem` for `two-sum`. Summarize the title, difficulty, tags, and
   starter snippets.
4. Call `start_problem` for `two-sum` in `python3`.
5. Call `request_hint` once and confirm the session hint level advanced.
6. Call `run_local_tests` with an intentionally failing Python snippet and
   confirm the result is a non-passing local run, not a transport failure.
7. Call `run_local_tests` again with a passing Python snippet:
   `print("dogfood ok"); assert 1 + 1 == 2`
8. Call `get_session_state` and confirm attempts incremented and
   `lastLocalRunPassed` reflects the most recent passing run.
9. If `go` or `java` are available in `runner_doctor`, repeat one passing
   `run_local_tests` call for each available runtime using a complete program
   with a `main`.
10. If authenticated and strict mode is enabled, explain whether
    `submit_solution` would be allowed for the exact code/language snapshot. Do
    not spend a real LeetCode submission unless explicitly approved.

Return:
- PASS/FAIL for each step.
- Runtime availability table.
- Any actionable bugs or confusing tool output.
- Exact repro commands/tool calls for failures.
```

## When to use which

- Use `npm run dogfood:local` before PRs and in Devin sessions. It is
  deterministic and does not need secrets.
- Use the local-agent prompt when validating real client behavior, local MCP
  configuration, auth flows, or live LeetCode integration.
