# Publishing Guide

## Automated NPM Publishing via GitHub Actions

This repository includes a GitHub Actions workflow that automatically publishes to NPM when a new release is created.

### Setup Instructions

#### 1. Create NPM Automation Token

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to **Access Tokens** in your account settings
3. Click **Generate New Token** → **Automation** (or **Classic Token**)
4. Copy the token (starts with `npm_...`)

#### 2. Add Token to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the NPM token from step 1
6. Click **Add secret**

### Usage

#### Automatic Publishing (Recommended)

The workflow triggers automatically when you create a GitHub release:

1. Create a new tag: `git tag v2.0.1`
2. Push the tag: `git push origin v2.0.1`
3. Create a release on GitHub from this tag
4. The workflow will automatically:
   - Install dependencies
   - Run all tests
   - Build the package
   - Publish to NPM

#### Manual Publishing

You can also trigger the workflow manually from the GitHub Actions tab:

1. Go to **Actions** → **Publish to NPM**
2. Click **Run workflow**
3. Optionally specify a version
4. Click **Run workflow**

### Workflow Details

The workflow (`publish.yml`):

- ✅ Runs tests before publishing
- ✅ Builds the package
- ✅ Publishes as public scoped package
- ✅ Uses secure NPM token from GitHub Secrets
- ✅ Supports manual dispatch for ad-hoc publishing

### Security Notes

- Never commit NPM tokens to the repository
- Use Automation tokens (not Classic tokens with 2FA) for GitHub Actions
- Tokens are encrypted in GitHub Secrets and not exposed in logs
- Consider enabling branch protection to require PR reviews before merging to main
