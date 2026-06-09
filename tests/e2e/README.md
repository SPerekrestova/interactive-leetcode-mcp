# End-to-End Tests

Real end-to-end tests that exercise the MCP server as a black box: each
spec spawns the built binary (`build/index.js`) as a child process,
attaches the MCP SDK's `StdioClientTransport`, and drives the server over
stdio just like a real MCP client would.

## Running

```bash
npm run test:e2e
```

This is also wired into `npm run test:all` (which runs unit + integration

- e2e) so CI exercises the full stack. The default `npm test` script
  **excludes** this directory because spawning a node child per spec is
  significantly slower than the in-memory integration suites; keep it that
  way unless you specifically want the e2e run.

## How HTTP is mocked

The server child process never reaches the real `leetcode.com`. Instead:

1. `harness/preload.mjs` is registered via `NODE_OPTIONS=--import …`
   when the child is spawned, so it runs before any user code.
2. The preload script activates [`nock`](https://github.com/nock/nock)
   with `disableNetConnect()` and reads a JSON fixture from
   `process.env.E2E_FIXTURE_PATH`.
3. The fixture (defined by `harness/types.ts`) describes which GraphQL
   operations and REST endpoints to intercept and what to reply with.

Specs author the fixture in TypeScript and pass it to `spawnServer({ fixture })`;
the harness writes it to a temp file and points the child at it.

## Isolation

Each `spawnServer()` call gets a fresh `mkdtemp` `HOME`, so
`~/.leetcode-mcp/credentials.json` is per-test and never touches the
developer's real home. Specs that need to pre-seed credentials can pass
`{ home }` to reuse a directory they prepared themselves.

## Authoring a spec

```ts
import { spawnServer } from "./harness/spawn-server.js";

const spawned = await spawnServer({
  fixture: {
    graphql: [
      {
        operationContains: "userStatus",
        response: {
          data: { userStatus: { isSignedIn: true, username: "alice" } }
        }
      }
    ]
  }
});

const result = await spawned.client.callTool({
  name: "check_auth_status",
  arguments: {}
});

await spawned.cleanup();
```

`spawnServer` ensures `build/index.js` is fresh (via `tests/e2e/harness/global-setup.ts`)
before any spec runs; you don't need to `npm run build` manually.
