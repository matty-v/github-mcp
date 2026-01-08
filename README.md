# GitHub MCP Server

A personal GitHub MCP server for Claude.ai with Google OAuth authentication. Only your Google account can authorize access.

## What it does

- Connects Claude.ai (web/mobile) to your GitHub repos
- Creates issues to trigger your Claude Code GitHub Action
- Authenticates via Google OAuth (only your email allowed)

## Tools available

| Tool | Description |
|------|-------------|
| `list_repos` | List your GitHub repositories |
| `create_issue` | Create an issue (triggers your Claude Code action) |
| `get_issue` | Get details of a specific issue |
| `list_issues` | List issues in a repository |
| `add_issue_comment` | Add a comment to an issue |

## Setup

### 1. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or use existing)
3. Go to "OAuth consent screen" → Configure for "External" users
4. Add your email to test users
5. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
6. Choose "Web application"
7. Add authorized redirect URI: `https://YOUR-CLOUD-RUN-URL/oauth/callback`
   (You'll update this after deploying)
8. Copy the Client ID and Client Secret

### 2. Create GitHub Personal Access Token

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Select scopes: `repo` (for private repos) or `public_repo` (public only)
4. Copy the token

### 3. Deploy to Cloud Run

```bash
# Clone/copy this project
cd github-mcp-server

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy github-mcp-server \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "BASE_URL=https://PLACEHOLDER" \
  --set-env-vars "GOOGLE_CLIENT_ID=your-client-id" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=your-client-secret" \
  --set-env-vars "ALLOWED_EMAIL=your-email@gmail.com" \
  --set-env-vars "GITHUB_PAT=ghp_xxxxx" \
  --set-env-vars "GITHUB_OWNER=your-github-username"
```

After deployment, note the URL (e.g., `https://github-mcp-server-abc123-uc.a.run.app`)

### 4. Update BASE_URL

```bash
gcloud run services update github-mcp-server \
  --region us-central1 \
  --set-env-vars "BASE_URL=https://github-mcp-server-abc123-uc.a.run.app"
```

### 5. Update Google OAuth redirect URI

Go back to Google Cloud Console and add the authorized redirect URI:
```
https://github-mcp-server-abc123-uc.a.run.app/oauth/callback
```

### 6. Connect to Claude.ai

1. Go to [Claude.ai Settings → Connectors](https://claude.ai/settings/connectors)
2. Click "Add custom connector"
3. Enter:
   - **Name:** GitHub
   - **Remote MCP server URL:** `https://github-mcp-server-abc123-uc.a.run.app/mcp`
4. Leave OAuth fields empty (the server handles OAuth discovery)
5. Click "Add"
6. Click "Connect" and authenticate with your Google account

## Usage

Once connected, you can say things like:

> "Create an issue in my disc-golf-tracker repo titled 'Add CSV export' with the claude-task label"

> "List my recent repos"

> "Show me open issues in my website repo"

## Security

- **Google OAuth**: Only your Google account (ALLOWED_EMAIL) can authenticate
- **JWT tokens**: Access tokens expire in 1 hour, refresh tokens in 30 days
- **GitHub PAT**: Stored server-side, never exposed to Claude
- **Cloud Run**: HTTPS by default, runs in your GCP project

## Local development

```bash
# Install dependencies
npm install

# Copy and edit env file
cp .env.example .env
# Edit .env with your values

# For local dev, set BASE_URL to your ngrok/tunnel URL
# Run with hot reload
npm run dev
```

## Troubleshooting

**"Access denied" on login**
- Check ALLOWED_EMAIL matches exactly (case-sensitive)

**OAuth redirect fails**
- Ensure BASE_URL matches your actual Cloud Run URL
- Check Google OAuth redirect URI includes `/oauth/callback`

**Tools not showing in Claude**
- Try disconnecting and reconnecting the connector
- Check Cloud Run logs: `gcloud run logs read github-mcp-server`
