import { Octokit } from "@octokit/rest";
import { config } from "../config.js";

export const octokit: InstanceType<typeof Octokit> = new Octokit({
  auth: config.githubPat,
});
