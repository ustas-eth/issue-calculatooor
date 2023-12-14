import { octokit } from './octokit.js'

export async function getFromGithub(
  path: string,
  repo: string,
  options: object = {},
) {
  const result = []

  let page = 1
  while (true) {
    const { data } = await octokit.request(`GET /repos/${repo}${path}`, {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
      page,
      per_page: 100,
      ...options,
    })

    page++
    result.push(...data)

    if (data.length == 0) break
  }

  return result
}
