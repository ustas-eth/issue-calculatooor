import { Octokit } from 'octokit'

export const octokit = new Octokit({
  auth: process.env.GH_API_TOKEN,
})
