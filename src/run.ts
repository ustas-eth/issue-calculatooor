import moment from 'moment'
import { getFromGithub } from './requests.js'
import {
  extractSeverityFromLabels,
  getLabels,
  includesLabels,
  initCounter,
  isInvalid,
  partialScoring,
  primaryFromDuplicate,
} from './utils.js'
import { createArrayCsvWriter } from 'csv-writer'
import { existsSync, mkdirSync } from 'fs'

const REPO = process.env.REPO!

console.log(REPO)

console.log('Fetching issues...')
const issues = await getFromGithub('/issues', REPO, { state: 'all' })
console.log('Total issues number:', issues.length)

console.log('Fetching commits...')
const commits = await getFromGithub('/commits', REPO)
console.log('Total commits number:', commits.length)

console.log('Processing...')

const issueAuthor: { [index: string]: any } = {}

for (const commit of commits) {
  const message = commit['commit']['message']

  if (
    message.includes('data for issue') ||
    message.includes('updated by') ||
    message.includes('withdrawn by')
  )
    continue

  const split = message.split(' issue #')

  if (split.length == 2) issueAuthor[split[1]] = split[0]
}

const issueSeverities: { [index: string]: string } = {}
const issueInternalIds: { [index: string]: any } = {}
const mainIssuesIdCounter = initCounter()
const mainIssues = new Set()

for (const issue of issues) {
  const id = issue.number
  const labels = getLabels(issue)
  const severity = extractSeverityFromLabels(labels)

  if (labels.length === 0 || severity === undefined) continue

  if (
    !isInvalid(labels) &&
    !includesLabels(labels, ['duplicate', 'withdrawn']) &&
    issue.title != 'Agreements & Disclosures'
  ) {
    mainIssues.add(id)
    issueSeverities[id] = severity

    const currentNumber = mainIssuesIdCounter.get(severity)!
    const inString = String(currentNumber).padStart(3, '0')

    issueInternalIds[id] = `${severity[0]}-${inString}`
    mainIssuesIdCounter.set(severity, currentNumber + 1)
  }
}

console.log('Number of severities: ', mainIssuesIdCounter)

for (const issue of issues) {
  const id = issue.number
  const labels = getLabels(issue)

  if (labels.length === 0) continue

  if (mainIssues.has(id)) {
    continue
  } else if (includesLabels(labels, ['withdrawn'])) {
    issueSeverities[id] = 'WITHDRAWN'
    issueInternalIds[id] = 'WITHDRAWN'
  } else if (isInvalid(labels)) {
    issueSeverities[id] = 'INVALID'
    issueInternalIds[id] = 'INVALID'
  } else if (includesLabels(labels, ['duplicate'])) {
    const primary = primaryFromDuplicate(labels)

    if (mainIssues.has(primary)) {
      issueSeverities[id] = issueSeverities[primary]
      issueInternalIds[id] = issueInternalIds[primary]
    } else {
      issueSeverities[id] = 'INVALID'
      issueInternalIds[id] = 'INVALID'
    }
  } else {
    issueSeverities[id] = 'UNKNOWN'
    issueInternalIds[id] = 'UNKNOWN'
  }
}

const severitySorting: { [index: string]: number } = {
  High: 0,
  Medium: 1,
  QA: 2,
  Gas: 3,
  Analysis: 4,
  INVALID: 5,
  WITHDRAWN: 6,
  UNKNOWN: 7,
}

const parsed = []

for (const issue of issues) {
  const id = issue.number
  const labels = getLabels(issue)
  const author = issueAuthor[id] || ''

  if (labels.length === 0 || issue.title === 'Agreements & Disclosures')
    continue

  let primary = primaryFromDuplicate(labels)
  if (mainIssues.has(primary)) primary = issueInternalIds[primary]

  let weight
  if (
    issueSeverities[id] !== 'INVALID' &&
    issueSeverities[id] !== 'WITHDRAWN'
  ) {
    weight = 1

    const selected = includesLabels(labels, ['selected for report'])
    const partial = partialScoring(labels)

    if (selected) weight = 1.3
    else if (partial) weight = partial
  }

  const sortingField =
    '' +
    severitySorting[issueSeverities[id]] +
    issueInternalIds[id] +
    (mainIssues.has(id) ? 'a' : 'b') +
    author

  parsed.push([
    id,
    issueInternalIds[id],
    primary || undefined,
    issue.title,
    author,
    weight,
    issueSeverities[id],
    issue['html_url'],
    labels,
    sortingField,
  ])
}

parsed.sort((a, b) => (a[9] < b[9] ? -1 : 1))
parsed.forEach((e) => e.pop())

const date = moment().format('DD-MM-YY--HH-mm-ss')
const filename = `out/${REPO.split('/')[1]}--${date}.csv`

if (!existsSync('out')) {
  mkdirSync('out')
}

const writer = createArrayCsvWriter({
  path: filename,
  fieldDelimiter: ';',
  header: [
    'github id',
    'internal id',
    'duplicate of',
    'title',
    'warden',
    'weight',
    'severity',
    'url',
    'labels',
  ],
})

await writer.writeRecords(parsed)
