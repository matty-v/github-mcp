# GitHub MCP Server

A personal GitHub MCP server for Claude.ai with Google OAuth authentication. Deployed to Google Cloud Functions.

## Features

- Connects Claude.ai (web/mobile) to your GitHub repos
- Full GitHub API access: repos, issues, PRs, reviews, and Actions
- Google OAuth authentication (only your email allowed)
- Landing page with tool documentation

## Tools (18 total)

### Repositories
| Tool | Description |
|------|-------------|
| `list_repos` | List your GitHub repositories |
| `create_repo` | Create a new GitHub repository |

### Issues
| Tool | Description |
|------|-------------|
| `create_issue` | Create an issue with labels |
| `get_issue` | Get details of a specific issue |
| `list_issues` | List issues in a repository |
| `add_issue_comment` | Add a comment to an issue |
| `list_issue_comments` | List comments on an issue or PR |

### Pull Requests
| Tool | Description |
|------|-------------|
| `create_pull_request` | Create a PR (supports draft) |
| `get_pull_request` | Get PR details (mergeable state, diff stats) |
| `merge_pull_request` | Merge a PR (merge, squash, or rebase) |
| `list_pr_checks` | List CI check runs for a PR |
| `list_pr_reviews` | List reviews on a PR |

### GitHub Actions
| Tool | Description |
|------|-------------|
| `list_workflows` | List workflows in a repo |
| `list_workflow_runs` | List recent runs (filter by workflow, branch, status) |
| `get_workflow_run` | Get run details (status, conclusion, commit) |
| `list_workflow_run_jobs` | List jobs and steps for a run |
| `rerun_workflow` | Rerun all jobs in a workflow run |
| `rerun_failed_jobs` | Rerun only the failed jobs in a workflow run |

## Setup

### 1. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or use existing)
3. Go to "OAuth consent screen" → Configure for "External" users
4. Add your email to test users
5. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
6. Choose "Web application"
7. Add authorized redirect URI: `https://YOUR-FUNCTION-URL/oauth/callback`
   (You'll update this after deploying)
8. Copy the Client ID and Client Secret

### 2. Create GitHub Personal Access Token

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Generate new token (classic or fine-grained)
3. For classic: select `repo` scope
4. For fine-grained: enable Issues (read/write), Pull requests (read/write), Actions (read), Metadata (read)
5. Copy the token

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
```
BASE_URL=https://your-function-url  # Set after first deploy
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
ALLOWED_EMAIL=your-email@gmail.com
GITHUB_PAT=ghp_xxxxx
GITHUB_OWNER=your-github-username
```

### 4. Deploy to Cloud Functions

```bash
# Install dependencies
npm install

# Deploy (requires gcloud CLI)
npm run deploy
```

The deploy script will:
- Enable required GCP APIs
- Build TypeScript
- Deploy to Cloud Functions (Gen 2)
- Output the function URL

### 5. Update configuration

After first deploy:

1. Copy the function URL from the deploy output
2. Update `BASE_URL` in `.env`
3. Add OAuth redirect URI in Google Cloud Console: `https://YOUR-FUNCTION-URL/oauth/callback`
4. Redeploy: `npm run deploy`

### 6. Connect to Claude.ai

1. Go to [Claude.ai Settings → Connectors](https://claude.ai/settings/connectors)
2. Click "Add MCP Server"
3. Enter the server URL: `https://YOUR-FUNCTION-URL/mcp`
4. Click "Connect" and authenticate with your Google account

## Usage

Once connected, you can say things like:

> "List my recent repos"

> "Create a new repository called 'my-project' with a Node.js .gitignore and MIT license"

> "Create an issue in my project repo titled 'Add dark mode'"

> "Show me open PRs in my website repo"

> "What's the status of the latest GitHub Actions run on main?"

> "Get the reviews on PR #42 in my api repo"

### Creating Repositories

The `create_repo` tool supports several options:

```javascript
// Minimal example - public repo with no initialization
create_repo({ name: "my-new-repo" })

// Full example - private repo with README, .gitignore, and license
create_repo({
  name: "my-project",
  description: "A sample project",
  private: true,
  auto_init: true,              // Creates README.md
  gitignore_template: "Node",   // Adds Node.js .gitignore
  license_template: "mit"       // Adds MIT license
})
```

Available `.gitignore` templates include: `Node`, `Python`, `Ruby`, `Java`, `Go`, `Rust`, and many more.

Available license templates include: `mit`, `apache-2.0`, `gpl-3.0`, `bsd-2-clause`, `bsd-3-clause`, and others.

## Local Development

```bash
# Install dependencies
npm install

# Copy and edit env file
cp .env.example .env

# For local dev, use ngrok or similar for BASE_URL
npm run dev
```

## Security

- **Google OAuth**: Only your Google account (ALLOWED_EMAIL) can authenticate
- **JWT tokens**: Access tokens expire in 1 hour, refresh tokens in 30 days
- **GitHub PAT**: Stored server-side as environment variable, never exposed to clients
- **Cloud Functions**: HTTPS by default, runs in your GCP project

## Project Structure

```
src/
├── index.ts           # Entry point
├── config.ts          # Configuration
├── landing.ts         # Landing page
├── auth/
│   ├── oauth.ts       # OAuth routes + client registration
│   ├── middleware.ts  # JWT auth middleware
│   └── state.ts       # In-memory stores
├── github/
│   ├── client.ts      # Octokit instance
│   └── tools.ts       # MCP tool definitions
└── mcp/
    └── handler.ts     # JSON-RPC protocol handler
```

## Troubleshooting

**"Access denied" on login**
- Check ALLOWED_EMAIL matches exactly (case-sensitive)

**OAuth redirect fails**
- Ensure BASE_URL matches your actual function URL
- Check Google OAuth redirect URI includes `/oauth/callback`

**Tools not showing in Claude**
- Try disconnecting and reconnecting the connector
- Check Cloud Functions logs: `gcloud functions logs read github-mcp --region=us-central1 --gen2`

**GitHub API returns 401**
- Your GitHub PAT may be expired - generate a new one
- Check the token has the required scopes
