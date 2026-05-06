# End-to-End Tests

This directory will host real end-to-end tests that exercise the MCP server as
a black box: the suite spawns the built binary (`build/index.js`), attaches the
MCP SDK's `StdioClientTransport`, and mocks LeetCode HTTP via `nock`.

The full e2e harness is defined in §6 of the assessment report and will be
implemented in a dedicated PR (Phase 2 of the redesign plan). This Phase 0 PR
only sets up the directory and a placeholder spec so that `npm run test:e2e`
exits 0 instead of 1 with "No test files found".

Once the harness lands, the placeholder will be removed.
