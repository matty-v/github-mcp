import { config } from "../config.js";
import { octokit } from "./client.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: any) => Promise<unknown>;
}

export const tools: Record<string, Tool> = {
  list_repos: {
    name: "list_repos",
    description: "List your GitHub repositories",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["all", "owner", "public", "private"],
          description: "Type of repos to list",
          default: "owner",
        },
        per_page: {
          type: "number",
          description: "Results per page (max 100)",
          default: 30,
        },
      },
    },
    handler: async (args: any) => {
      const repos = await octokit.repos.listForAuthenticatedUser({
        type: args.type || "owner",
        per_page: args.per_page || 30,
        sort: "updated",
      });
      return repos.data.map((r) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        private: r.private,
        url: r.html_url,
      }));
    },
  },

  create_issue: {
    name: "create_issue",
    description: "Create a GitHub issue. Use this to trigger Claude Code tasks.",
    inputSchema: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "Repository name (without owner)",
        },
        title: {
          type: "string",
          description: "Issue title",
        },
        body: {
          type: "string",
          description: "Issue body/description",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to add (e.g., ['claude-task'])",
        },
      },
      required: ["repo", "title"],
    },
    handler: async (args: any) => {
      const issue = await octokit.issues.create({
        owner: config.githubOwner,
        repo: args.repo,
        title: args.title,
        body: args.body || "",
        labels: args.labels || ["claude-task"],
      });
      return {
        number: issue.data.number,
        url: issue.data.html_url,
        title: issue.data.title,
        state: issue.data.state,
      };
    },
  },

  get_issue: {
    name: "get_issue",
    description: "Get details of a specific issue",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        issue_number: { type: "number", description: "Issue number" },
      },
      required: ["repo", "issue_number"],
    },
    handler: async (args: any) => {
      const issue = await octokit.issues.get({
        owner: config.githubOwner,
        repo: args.repo,
        issue_number: args.issue_number,
      });
      return {
        number: issue.data.number,
        title: issue.data.title,
        body: issue.data.body,
        state: issue.data.state,
        url: issue.data.html_url,
        labels: issue.data.labels.map((l: any) =>
          typeof l === "string" ? l : l.name
        ),
      };
    },
  },

  list_issues: {
    name: "list_issues",
    description: "List issues in a repository",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          default: "open",
        },
        labels: {
          type: "string",
          description: "Comma-separated label names",
        },
      },
      required: ["repo"],
    },
    handler: async (args: any) => {
      const issues = await octokit.issues.listForRepo({
        owner: config.githubOwner,
        repo: args.repo,
        state: args.state || "open",
        labels: args.labels,
        per_page: 20,
      });
      return issues.data.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
        labels: i.labels.map((l: any) =>
          typeof l === "string" ? l : l.name
        ),
      }));
    },
  },

  add_issue_comment: {
    name: "add_issue_comment",
    description: "Add a comment to an issue",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        issue_number: { type: "number", description: "Issue number" },
        body: { type: "string", description: "Comment body" },
      },
      required: ["repo", "issue_number", "body"],
    },
    handler: async (args: any) => {
      const comment = await octokit.issues.createComment({
        owner: config.githubOwner,
        repo: args.repo,
        issue_number: args.issue_number,
        body: args.body,
      });
      return {
        id: comment.data.id,
        url: comment.data.html_url,
      };
    },
  },
};
