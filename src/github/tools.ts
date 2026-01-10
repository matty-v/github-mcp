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

  get_pull_request: {
    name: "get_pull_request",
    description: "Get details of a specific pull request",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        pull_number: { type: "number", description: "PR number" },
      },
      required: ["repo", "pull_number"],
    },
    handler: async (args: any) => {
      const pr = await octokit.pulls.get({
        owner: config.githubOwner,
        repo: args.repo,
        pull_number: args.pull_number,
      });
      return {
        number: pr.data.number,
        title: pr.data.title,
        body: pr.data.body,
        state: pr.data.state,
        draft: pr.data.draft,
        merged: pr.data.merged,
        mergeable: pr.data.mergeable,
        mergeable_state: pr.data.mergeable_state,
        head: pr.data.head.ref,
        base: pr.data.base.ref,
        user: pr.data.user?.login,
        url: pr.data.html_url,
        created_at: pr.data.created_at,
        updated_at: pr.data.updated_at,
        additions: pr.data.additions,
        deletions: pr.data.deletions,
        changed_files: pr.data.changed_files,
      };
    },
  },

  list_pr_checks: {
    name: "list_pr_checks",
    description: "List CI check runs for a pull request",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        pull_number: { type: "number", description: "PR number" },
      },
      required: ["repo", "pull_number"],
    },
    handler: async (args: any) => {
      // First get the PR to find the head SHA
      const pr = await octokit.pulls.get({
        owner: config.githubOwner,
        repo: args.repo,
        pull_number: args.pull_number,
      });
      const sha = pr.data.head.sha;

      // Get check runs for that commit
      const checks = await octokit.checks.listForRef({
        owner: config.githubOwner,
        repo: args.repo,
        ref: sha,
      });

      return {
        total_count: checks.data.total_count,
        checks: checks.data.check_runs.map((c) => ({
          name: c.name,
          status: c.status,
          conclusion: c.conclusion,
          started_at: c.started_at,
          completed_at: c.completed_at,
          url: c.html_url,
        })),
      };
    },
  },

  list_pr_reviews: {
    name: "list_pr_reviews",
    description: "List reviews on a pull request",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        pull_number: { type: "number", description: "PR number" },
      },
      required: ["repo", "pull_number"],
    },
    handler: async (args: any) => {
      const reviews = await octokit.pulls.listReviews({
        owner: config.githubOwner,
        repo: args.repo,
        pull_number: args.pull_number,
      });
      return reviews.data.map((r) => ({
        id: r.id,
        user: r.user?.login,
        state: r.state,
        body: r.body,
        submitted_at: r.submitted_at,
        url: r.html_url,
      }));
    },
  },

  list_workflows: {
    name: "list_workflows",
    description: "List GitHub Actions workflows in a repository",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
      },
      required: ["repo"],
    },
    handler: async (args: any) => {
      const workflows = await octokit.actions.listRepoWorkflows({
        owner: config.githubOwner,
        repo: args.repo,
      });
      return workflows.data.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        path: w.path,
        state: w.state,
        url: w.html_url,
      }));
    },
  },

  list_workflow_runs: {
    name: "list_workflow_runs",
    description: "List recent GitHub Actions workflow runs",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        workflow_id: {
          type: "string",
          description: "Workflow ID or filename (e.g., 'ci.yml'). If omitted, lists all runs.",
        },
        branch: {
          type: "string",
          description: "Filter by branch name",
        },
        status: {
          type: "string",
          enum: ["completed", "action_required", "cancelled", "failure", "neutral", "skipped", "stale", "success", "timed_out", "in_progress", "queued", "requested", "waiting", "pending"],
          description: "Filter by status",
        },
        per_page: {
          type: "number",
          description: "Results per page (max 100)",
          default: 10,
        },
      },
      required: ["repo"],
    },
    handler: async (args: any) => {
      let runs;
      if (args.workflow_id) {
        runs = await octokit.actions.listWorkflowRuns({
          owner: config.githubOwner,
          repo: args.repo,
          workflow_id: args.workflow_id,
          branch: args.branch,
          status: args.status,
          per_page: args.per_page || 10,
        });
      } else {
        runs = await octokit.actions.listWorkflowRunsForRepo({
          owner: config.githubOwner,
          repo: args.repo,
          branch: args.branch,
          status: args.status,
          per_page: args.per_page || 10,
        });
      }
      return {
        total_count: runs.data.total_count,
        runs: runs.data.workflow_runs.map((r) => ({
          id: r.id,
          name: r.name,
          workflow: r.workflow_id,
          status: r.status,
          conclusion: r.conclusion,
          branch: r.head_branch,
          event: r.event,
          created_at: r.created_at,
          updated_at: r.updated_at,
          url: r.html_url,
          run_number: r.run_number,
        })),
      };
    },
  },

  get_workflow_run: {
    name: "get_workflow_run",
    description: "Get details of a specific workflow run",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        run_id: { type: "number", description: "Workflow run ID" },
      },
      required: ["repo", "run_id"],
    },
    handler: async (args: any) => {
      const run = await octokit.actions.getWorkflowRun({
        owner: config.githubOwner,
        repo: args.repo,
        run_id: args.run_id,
      });
      return {
        id: run.data.id,
        name: run.data.name,
        status: run.data.status,
        conclusion: run.data.conclusion,
        branch: run.data.head_branch,
        commit_sha: run.data.head_sha,
        commit_message: run.data.head_commit?.message,
        event: run.data.event,
        actor: run.data.actor?.login,
        created_at: run.data.created_at,
        updated_at: run.data.updated_at,
        run_started_at: run.data.run_started_at,
        url: run.data.html_url,
        run_number: run.data.run_number,
        run_attempt: run.data.run_attempt,
      };
    },
  },

  list_workflow_run_jobs: {
    name: "list_workflow_run_jobs",
    description: "List jobs for a workflow run",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        run_id: { type: "number", description: "Workflow run ID" },
      },
      required: ["repo", "run_id"],
    },
    handler: async (args: any) => {
      const jobs = await octokit.actions.listJobsForWorkflowRun({
        owner: config.githubOwner,
        repo: args.repo,
        run_id: args.run_id,
      });
      return jobs.data.jobs.map((j) => ({
        id: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion,
        started_at: j.started_at,
        completed_at: j.completed_at,
        url: j.html_url,
        steps: j.steps?.map((s) => ({
          name: s.name,
          status: s.status,
          conclusion: s.conclusion,
          number: s.number,
        })),
      }));
    },
  },

  rerun_workflow: {
    name: "rerun_workflow",
    description: "Rerun all jobs in a workflow run",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        run_id: { type: "number", description: "Workflow run ID" },
      },
      required: ["repo", "run_id"],
    },
    handler: async (args: any) => {
      await octokit.actions.reRunWorkflow({
        owner: config.githubOwner,
        repo: args.repo,
        run_id: args.run_id,
      });
      return {
        success: true,
        message: `Workflow run ${args.run_id} has been queued for rerun`,
        run_id: args.run_id,
      };
    },
  },

  rerun_failed_jobs: {
    name: "rerun_failed_jobs",
    description: "Rerun only the failed jobs in a workflow run",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        run_id: { type: "number", description: "Workflow run ID" },
      },
      required: ["repo", "run_id"],
    },
    handler: async (args: any) => {
      await octokit.actions.reRunWorkflowFailedJobs({
        owner: config.githubOwner,
        repo: args.repo,
        run_id: args.run_id,
      });
      return {
        success: true,
        message: `Failed jobs in workflow run ${args.run_id} have been queued for rerun`,
        run_id: args.run_id,
      };
    },
  },
};
