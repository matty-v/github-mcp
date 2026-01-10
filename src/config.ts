// Validate required config at startup
const required = [
  "BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ALLOWED_EMAIL",
  "GITHUB_PAT",
  "GITHUB_OWNER",
  "JWT_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || "8080"),
  baseUrl: process.env.BASE_URL!,

  // Google OAuth (for authenticating the user)
  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  allowedEmail: process.env.ALLOWED_EMAIL!,

  // JWT signing for tokens issued to Claude
  jwtSecret: process.env.JWT_SECRET!,

  // GitHub (for API calls)
  githubPat: process.env.GITHUB_PAT!,
  githubOwner: process.env.GITHUB_OWNER!,
};
