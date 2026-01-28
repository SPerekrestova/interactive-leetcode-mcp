// src/mcp/prompts/auth-prompts.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RegistryBase } from "../../common/registry-base.js";
import { LeetcodeServiceInterface } from "../../leetcode/leetcode-service-interface.js";

/**
 * Registry for LeetCode authentication prompts
 * Provides prompts that guide AI agents through the authentication process
 */
export class AuthPromptRegistry extends RegistryBase {
    protected registerPublic(): void {
        this.server.registerPrompt(
            "leetcode_authentication_guide",
            {
                description:
                    "Provides comprehensive instructions for guiding users through LeetCode authentication with manual cookie extraction"
            },
            () => {
                const promptText = `# LeetCode Authentication Guide for AI Agents

You are helping a user authenticate with LeetCode. This process requires manual cookie extraction because LeetCode does not provide a public OAuth API.

## Authentication Flow

### Step 1: Initiate Authentication
Call the \`start_leetcode_auth\` tool. This will:
- Attempt to open the browser automatically (may succeed or fail gracefully)
- Return structured instructions for you to present to the user

### Step 2: Guide User Through Cookie Extraction
Present these instructions clearly and patiently. Adapt based on the browserOpened status:

**If browser opened successfully:**
"I've opened LeetCode in your browser. Please log in to your account.

Once you're logged in, follow these steps to get your credentials:

1. **Open DevTools** in your browser:
   - Windows/Linux: Press \`F12\`
   - Mac: Press \`Cmd+Option+I\`
   - Alternative: Right-click anywhere on the page → "Inspect" or "Inspect Element"

2. **Navigate to the Cookies section:**
   - Click the **"Application"** tab at the top of DevTools
     (In Firefox, it's called **"Storage"**)
   - In the left sidebar, find and expand **"Cookies"**
   - Click on **"https://leetcode.com"**

3. **Find and copy two cookie values:**
   You'll see a table with cookie names and values. Find these two:
   - \`csrftoken\`
   - \`LEETCODE_SESSION\`

4. **Copy each value:**
   - Click on the value field (the long random text)
   - The entire value should be selected
   - Press \`Cmd+C\` (Mac) or \`Ctrl+C\` (Windows/Linux) to copy
   - **Important:** Make sure you copy the complete value, not just the visible portion

5. **Share both values with me**
   Paste them in your message, and I'll save them securely."

**If browser did not open:**
"Please open https://leetcode.com/accounts/login in your browser and log in to your account.

Once you're logged in, follow these steps to get your credentials:
[... same instructions as above ...]"

### Step 3: Handle User Responses

**When user shares cookies:**
- Call \`save_leetcode_credentials\` immediately with both values
- The tool will validate credentials and return success or error

**If user is confused about finding DevTools:**
Offer browser-specific guidance:
- "Which browser are you using? I can provide specific instructions for Chrome, Firefox, Safari, or Edge."

**If user asks "why do I need to do this?":**
- "LeetCode doesn't provide an official authentication API for third-party tools like this MCP server. Cookie extraction is the standard approach used by LeetCode CLI tools and integrations. Your credentials are stored securely and locally on your machine."

**If user is concerned about security:**
- "Your credentials are encrypted and stored locally in ~/.leetcode-mcp/credentials.json. They're never sent anywhere except directly to LeetCode's API to make requests on your behalf. This is the same method used by official LeetCode CLI tools."

**If user has trouble copying the entire value:**
- "Make sure you're clicking on the value field (not the name), and that you can see the full text is selected before copying. The value is typically quite long (50+ characters)."

### Step 4: Confirm Success
After \`save_leetcode_credentials\` succeeds:
- Welcome the user by their username (returned by the tool)
- Confirm they can now use all authenticated LeetCode features
- Offer to help them start practicing:
  - "Would you like to see today's daily challenge?"
  - "What problem would you like to practice?"
  - "Want to check your profile statistics?"

### Step 5: Handle Errors

**Invalid credentials error:**
- "The credentials didn't work. Let's try again:"
  - "Make sure you're logged in to LeetCode in your browser"
  - "Ensure you copied the complete value of both cookies"
  - "The values can be very long - make sure nothing was cut off"
- Offer to restart: "Let me know when you're ready to try again."

**Expired credentials (during later use):**
When tools return authentication errors:
- Call \`check_auth_status\` to confirm expiration
- "Your LeetCode session has expired (this typically happens after 7-14 days). Let's quickly re-authenticate."
- Automatically restart the authentication flow

## Important Guidelines

### Tone & Approach
- **Be patient and encouraging** - This is a one-time setup process
- **Don't rush through steps** - Give users time to complete each step
- **Acknowledge it's tedious** - "I know this seems like extra work, but it's a one-time setup"
- **Celebrate success** - Make it feel rewarding when authentication completes

### What NOT to do
- Don't skip steps or assume users know where DevTools is
- Don't make users feel bad for asking clarifying questions
- Don't move on until you've called \`save_leetcode_credentials\` and it succeeded
- Don't forget to actually call the tools - guiding users through the process isn't enough

### Progressive Disclosure
- Start with simple instructions
- Add browser-specific details only when users ask or seem confused
- Provide screenshots or visual descriptions if users are stuck
- Offer to break down steps further if needed

## Example Conversation Flow

**User:** "I want to authorize with LeetCode"

**You:** [Call start_leetcode_auth]
"I've opened LeetCode in your browser. Please log in to your account.

Once you're logged in, I'll walk you through getting two cookie values we need for authentication. Ready? First step is to open DevTools..."

**User:** "Okay, I'm logged in. How do I open DevTools?"

**You:** "Great! Which browser are you using? I can give you the exact steps."

**User:** "Chrome"

**You:** "Perfect! In Chrome, press F12 (or Cmd+Option+I on Mac). A panel will open - that's DevTools. Let me know when you see it."

**User:** "Got it, I see a panel with tabs"

**You:** "Excellent! Click the 'Application' tab at the top of that panel. In the left sidebar, you should see 'Cookies' - click to expand it, then click 'https://leetcode.com'. You'll see a list of cookies. Do you see that?"

**User:** "Yes! I see csrftoken and LEETCODE_SESSION"

**You:** "Perfect! Now click on the value next to csrftoken (the long random text), copy it, and paste it here. Then do the same for LEETCODE_SESSION. I'll save both securely."

**User:** "Here they are: csrftoken is abc123def456... and LEETCODE_SESSION is xyz789ghi012..."

**You:** [Call save_leetcode_credentials]
"✓ Perfect! Your credentials are validated and saved. Welcome back, johndoe! You're all set to practice problems. What would you like to work on?"

## Technical Notes
- Credentials typically expire after 7-14 days
- LeetCode allows only one active session per account at a time
- The MCP server validates credentials by making a test API call to LeetCode's GraphQL endpoint
- Credentials are stored encrypted in ~/.leetcode-mcp/credentials.json`;

                return {
                    messages: [
                        {
                            role: "user",
                            content: {
                                type: "text",
                                text: promptText
                            }
                        }
                    ]
                };
            }
        );
    }
}

/**
 * Registers all authentication-related prompts
 */
export function registerAuthPrompts(
    server: McpServer,
    leetcodeService: LeetcodeServiceInterface
): void {
    new AuthPromptRegistry(server, leetcodeService).register();
}
