# Integration Testing

## Automated Integration Tests

The automated integration tests in this directory verify individual components of the authorization flow:

- Authorization session creation and retrieval
- Browser cookie path detection
- Session timeout validation

Run with:

```bash
npm test tests/integration/
```

## Manual End-to-End Testing

For full end-to-end authorization flow testing with real browser interaction, use the standalone script:

```bash
npm run build
node scripts/test-auth-flow.js
```

This script will:

1. Create an authorization session
2. Open your browser to LeetCode login
3. Wait for you to complete login (interactive prompt)
4. Detect your browser (Chrome/Edge/Brave)
5. Extract cookies from browser database
6. Validate the extracted credentials

**Note:** The manual script must be run outside of test runners because it requires interactive stdin input, which doesn't work reliably in IDE test runners or CI environments.

## Platform Testing Checklist

Test on each platform:

- [ ] macOS (primary development platform)
- [ ] Linux (CI environment)
- [ ] Windows (manual testing)

For each platform, verify:

- [ ] Browser opens correctly
- [ ] Cookie database is detected
- [ ] Cookies are extracted successfully
- [ ] Credentials are validated
- [ ] File permissions are correct
