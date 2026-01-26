# Integration Testing

## Manual Authorization Flow Test

To test the full authorization flow:

```bash
MANUAL_TEST=1 npm test tests/integration/authorization-flow.test.ts
```

This will:

1. Create an authorization session
2. Open your browser to LeetCode login
3. Wait for you to complete login
4. Extract cookies from your browser
5. Validate the extracted credentials

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
