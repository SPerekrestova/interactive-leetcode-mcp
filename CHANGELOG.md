# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-24

### Breaking Changes

- **Removed China (leetcode.cn) site support** - Global leetcode.com only. CN users should stay on v1.x or use original [@jinzcdev/leetcode-mcp-server](https://github.com/jinzcdev/leetcode-mcp-server).
- **Removed manual session cookie configuration** - Browser-based authorization now required. No more `--session` flag or `LEETCODE_SESSION` environment variable.
- **Package renamed** - Now `@sperekrestova/interactive-leetcode-mcp` (was `@sperekrestova/leetcode-mcp-extended`). You must reinstall.
- **CLI parameter changes** - Removed `--site` and `--session` parameters. Server runs with no configuration needed.

### Changed

- **Project rebranded** - Now "Interactive LeetCode MCP" emphasizing conversational learning workflow
- **Simplified authentication** - Single code path using browser authorization only
- **Streamlined documentation** - Removed comparison tables, multi-site options, and custom auth instructions
- **Focused positioning** - Clear emphasis on interactive practice with Claude

### Removed

- `src/leetcode/leetcode-cn-service.ts` - Entire CN service implementation
- All CN-specific tools and resources
- `--site` CLI parameter
- `--session` CLI parameter
- Custom session cookie handling via environment variables
- Multi-site configuration options
- Comparison tables from documentation

### Migration Guide

**From v1.x to v2.0.0:**

1. **Uninstall old package:**

   ```bash
   npm uninstall -g @sperekrestova/leetcode-mcp-extended
   ```

2. **Install new package:**

   ```bash
   npm install -g @sperekrestova/interactive-leetcode-mcp
   ```

3. **Update MCP configuration:**

   ```json
   {
     "mcpServers": {
       "leetcode": {
         "command": "interactive-leetcode-mcp"
       }
     }
   }
   ```

4. **Re-authorize:**
   - Old credentials may not work
   - Ask Claude to "Authorize with LeetCode"
   - Browser will open for you to log in

**Impact:**

- CN site users: Stay on v1.x or use original jinzcdev server
- Custom auth users: Switch to browser-based authorization
- All users: Must reinstall package with new name

---

## [1.0.0] - 2026-01-23

### Added

#### Authorization Features

- **One-time browser-based authorization** with Playwright
- `authorize_leetcode` MCP tool for interactive LeetCode login
- Automatic credential storage in `~/.leetcode-mcp/credentials.json`
- Session cookie persistence and management
- Support for both LeetCode Global and China sites

#### Submission Features

- **Solution submission** with real-time result polling
- `submit_solution` MCP tool for code submission
- Automatic question ID resolution via GraphQL
- Support for multiple programming languages:
  - Java
  - Python (python3)
  - C++ (cpp)
  - JavaScript
  - TypeScript
- Detailed submission feedback:
  - Accepted: runtime and memory statistics
  - Wrong Answer: failed test case details
  - Compilation Error: error messages
  - Runtime Error: error details

#### Infrastructure

- Credentials storage module (`src/utils/credentials.ts`)
- Submission types and interfaces (`src/types/submission.ts`)
- Comprehensive test suite (27 tests passing)
- Unit tests for credentials storage (7 tests)
- Integration tests for submission flow (12 tests)

#### Documentation

- Complete README with authorization and submission tool documentation
- Installation guide (INSTALLATION.md)
- MCP configuration examples
- First-time setup instructions
- Troubleshooting guide

### Extended

Based on [@jinzcdev/leetcode-mcp-server](https://github.com/jinzcdev/leetcode-mcp-server) v1.2.0:

- Maintains all original problem fetching capabilities
- Preserves user data access tools
- Keeps notes and solutions features (China site)
- Adds write operations (submission) to complement read operations

### Technical Details

- **Dependencies Added:**

  - `playwright` v1.57.0 - Browser automation for authorization
  - `axios` v1.13.2 - HTTP client for submission API

- **Build System:**
  - TypeScript with full type safety
  - ESLint and Prettier for code quality
  - Husky pre-commit hooks
  - Vitest for testing

### Fixed

- Question ID resolution for submission API (numeric ID required, not slug)
- Login detection using URL change instead of selector timeout
- Removed CN site tests due to Cloudflare protection

### Security

- Credentials stored locally only (`~/.leetcode-mcp/`)
- No credential transmission except to LeetCode
- Session cookies valid for weeks/months (minimal re-authorization)
- Browser-based auth eliminates manual cookie extraction

### Breaking Changes

None. This is a fully backward-compatible extension of the original server.

### Migration Guide

If migrating from `@jinzcdev/leetcode-mcp-server`:

1. Clone this repository
2. Run `npm install && npm run build`
3. Update MCP configuration to point to new build path
4. Run `authorize_leetcode` to enable submission features
5. All existing tools continue to work without changes

### Known Limitations

- China site (leetcode.cn) submission not tested due to Cloudflare blocks
- Authorization requires GUI environment (browser opens)
- Session expiration requires re-authorization (typically weeks/months)

### Contributors

- **SPerekrestova** - Extended fork with authorization and submission
- **jinzcdev** - Original leetcode-mcp-server

### Links

- **Repository:** https://github.com/SPerekrestova/leetcode-mcp-extended
- **Original:** https://github.com/jinzcdev/leetcode-mcp-server
- **Issues:** https://github.com/SPerekrestova/leetcode-mcp-extended/issues

---

## [Unreleased]

### Planned Features

- Project configuration helper (`.leetcode-config.json`)
- Language preference persistence
- Working file tracking
- Solution history (local storage)

---

_For complete usage documentation, see [README.md](README.md)_
