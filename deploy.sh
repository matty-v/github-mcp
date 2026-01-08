#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== GitHub MCP Server Deployment ===${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Not logged in to gcloud. Initiating login...${NC}"
    gcloud auth login
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No project set. Please select a project:${NC}"
    gcloud projects list
    read -p "Enter project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi
echo -e "${GREEN}Using project: ${PROJECT_ID}${NC}"

# Function name
FUNCTION_NAME="github-mcp"
REGION="us-central1"

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo -e "${GREEN}Loading environment from .env file${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Check required environment variables
REQUIRED_VARS="GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ALLOWED_EMAIL GITHUB_PAT GITHUB_OWNER"
MISSING_VARS=""
for var in $REQUIRED_VARS; do
    if [ -z "${!var}" ]; then
        MISSING_VARS="$MISSING_VARS $var"
    fi
done

if [ -n "$MISSING_VARS" ]; then
    echo -e "${RED}Missing required environment variables:${MISSING_VARS}${NC}"
    echo "Please set them in a .env file or export them before running this script."
    echo ""
    echo "Example .env file:"
    echo "  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
    echo "  GOOGLE_CLIENT_SECRET=your-client-secret"
    echo "  ALLOWED_EMAIL=your-email@gmail.com"
    echo "  GITHUB_PAT=ghp_xxxxxxxxxxxx"
    echo "  GITHUB_OWNER=your-github-username"
    exit 1
fi

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Deploy to Cloud Functions (Gen 2)
echo -e "${YELLOW}Deploying to Cloud Functions...${NC}"

# First deployment won't have a URL yet, so we use a placeholder
# After deployment, we'll update with the real URL
TEMP_BASE_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"

gcloud functions deploy "$FUNCTION_NAME" \
    --gen2 \
    --region="$REGION" \
    --runtime=nodejs20 \
    --entry-point=githubMcp \
    --trigger-http \
    --allow-unauthenticated \
    --memory=256MB \
    --timeout=60s \
    --set-env-vars="BASE_URL=${BASE_URL:-$TEMP_BASE_URL},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},ALLOWED_EMAIL=${ALLOWED_EMAIL},GITHUB_PAT=${GITHUB_PAT},GITHUB_OWNER=${GITHUB_OWNER}${JWT_SECRET:+,JWT_SECRET=${JWT_SECRET}}"

# Get the deployed URL
FUNCTION_URL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --gen2 --format="value(serviceConfig.uri)")

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "Function URL: ${GREEN}${FUNCTION_URL}${NC}"
echo ""

# Check if BASE_URL needs updating
if [ -z "$BASE_URL" ] || [ "$BASE_URL" = "$TEMP_BASE_URL" ]; then
    echo -e "${YELLOW}NOTE: Update BASE_URL and redeploy for OAuth to work correctly:${NC}"
    echo ""
    echo "  1. Add to your .env file:"
    echo "     BASE_URL=${FUNCTION_URL}"
    echo ""
    echo "  2. Run: npm run deploy"
    echo ""
fi

echo -e "${YELLOW}=== Google OAuth Setup ===${NC}"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo ""
echo "2. Create OAuth 2.0 Client ID (or update existing):"
echo "   - Application type: Web application"
echo "   - Authorized redirect URIs: ${FUNCTION_URL}/oauth/callback"
echo ""
echo "3. Update your .env with the client ID and secret"
echo ""
echo -e "${YELLOW}=== Claude.ai Setup ===${NC}"
echo ""
echo "1. Go to Claude.ai > Settings > Connectors"
echo "2. Add MCP Server with URL: ${FUNCTION_URL}/mcp"
echo ""
