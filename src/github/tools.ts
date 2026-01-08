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

  list_issue_comments: {
    name: "list_issue_comments",
    description: "List comments on an issue or pull request",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        issue_number: { type: "number", description: "Issue or PR number" },
        per_page: {
          type: "number",
          description: "Results per page (max 100)",
          default: 30,
        },
      },
      required: ["repo", "issue_number"],
    },
    handler: async (args: any) => {
      const comments = await octokit.issues.listComments({
        owner: config.githubOwner,
        repo: args.repo,
        issue_number: args.issue_number,
        per_page: args.per_page || 30,
      });
      return comments.data.map((c) => ({
        id: c.id,
        user: c.user?.login,
        body: c.body,
        created_at: c.created_at,
        url: c.html_url,
      }));
    },
  },

  create_pull_request: {
    name: "create_pull_request",
    description: "Create a pull request",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "PR title" },
        body: { type: "string", description: "PR description" },
        head: {
          type: "string",
          description: "Branch containing changes (e.g., 'feature-branch')",
        },
        base: {
          type: "string",
          description: "Branch to merge into (e.g., 'main')",
          default: "main",
        },
        draft: {
          type: "boolean",
          description: "Create as draft PR",
          default: false,
        },
      },
      required: ["repo", "title", "head"],
    },
    handler: async (args: any) => {
      const pr = await octokit.pulls.create({
        owner: config.githubOwner,
        repo: args.repo,
        title: args.title,
        body: args.body || "",
        head: args.head,
        base: args.base || "main",
        draft: args.draft || false,
      });
      return {
        number: pr.data.number,
        url: pr.data.html_url,
        title: pr.data.title,
        state: pr.data.state,
        head: pr.data.head.ref,
        base: pr.data.base.ref,
      };
    },
  },

  merge_pull_request: {
    name: "merge_pull_request",
    description: "Merge a pull request",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        pull_number: { type: "number", description: "PR number" },
        commit_title: {
          type: "string",
          description: "Title for the merge commit (optional)",
        },
        commit_message: {
          type: "string",
          description: "Message for the merge commit (optional)",
        },
        merge_method: {
          type: "string",
          enum: ["merge", "squash", "rebase"],
          description: "Merge method to use",
          default: "merge",
        },
      },
      required: ["repo", "pull_number"],
    },
    handler: async (args: any) => {
      const result = await octokit.pulls.merge({
        owner: config.githubOwner,
        repo: args.repo,
        pull_number: args.pull_number,
        commit_title: args.commit_title,
        commit_message: args.commit_message,
        merge_method: args.merge_method || "merge",
      });
      return {
        merged: result.data.merged,
        message: result.data.message,
        sha: result.data.sha,
      };
    },
  },
};
