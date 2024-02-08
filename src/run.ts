import moment from 'moment'
import { getFromGithub } from './requests.js'
import {
  extractSeverityFromLabels,
  generateInternalId,
  getLabels,
  getPrimaryIssueId,
  getPrimaryIssueReport,
  includesLabels,
  partialScoring,
} from './utils.js'
import { createArrayCsvWriter } from 'csv-writer'
import { existsSync, mkdirSync } from 'fs'
import { Report, Severity } from './Report.js'

const REPO = process.env.REPO!

console.log(REPO)

console.log('Fetching issues...')
const issues = await getFromGithub('/issues', REPO, { state: 'all' })
console.log('Total issues number:', issues.length)

console.log('Fetching commits...')
const commits = await getFromGithub('/commits', REPO)
console.log('Total commits number:', commits.length)

console.log('Processing...')

const reports = new Map<number, Report>()
const mainIssuesIdCounter = new Map<Severity, number>()
const internalIdCounters = new Map<string, number>()

/**
 * Create basic reports for every issue
 */
for (const issue of issues) {
  const id = issue.number
  const labels = getLabels(issue)

  if (labels.length === 0 || issue.title === 'Agreements & Disclosures')
    continue

  let severity = extractSeverityFromLabels(labels)
  let internalId = 'NONE'
  let main = false

  if (
    severity !== Severity.INVALID &&
    severity !== Severity.WITHDRAWN &&
    severity !== Severity.UNKNOWN &&
    !includesLabels(labels, ['duplicate'])
  ) {
    main = true
    internalId = generateInternalId(severity, mainIssuesIdCounter)

    const current = internalIdCounters.get(internalId) || 0
    internalIdCounters.set(internalId, current + 1)
  }

  const report = new Report(
    id,
    issue.title,
    internalId,
    severity,
    issue.html_url,
    labels,
    main,
  )

  reports.set(report.id, report)
}

for (const [, report] of reports) {
  const { severity, labels } = report

  if (
    severity !== Severity.INVALID &&
    severity !== Severity.WITHDRAWN &&
    severity !== Severity.UNKNOWN &&
    includesLabels(labels, ['duplicate'])
  ) {
    const primary = getPrimaryIssueReport(labels, reports)

    if (primary && primary.main) {
      report.severity = primary.severity
      report.internalId = primary.internalId

      internalIdCounters.set(
        report.internalId,
        (internalIdCounters.get(report.internalId) || 0) + 1,
      )
    } else {
      report.severity = Severity.INVALID
      report.internalId = 'INVALID'
    }
  }
}

/**
 * Parse commits to get all the authors of the issues
 *
 * During the initialization of a findings repo c4-submissions account
 * creates commits with the following pattern: author issue #1234.
 */
for (const commit of commits) {
  const message = commit['commit']['message']

  if (
    message.includes('data for issue') ||
    message.includes('updated by') ||
    message.includes('withdrawn by')
  )
    continue

  const split = message.split(' issue #')

  if (split.length == 2) {
    const report = reports.get(parseInt(split[1]))
    if (report) report.author = split[0]
  }
}

console.log(`Totals:
High: ${mainIssuesIdCounter.get(Severity.High)}
Medium: ${mainIssuesIdCounter.get(Severity.Medium)}
QA: ${mainIssuesIdCounter.get(Severity.QA)}
Gas: ${mainIssuesIdCounter.get(Severity.Gas)}
Analysis: ${mainIssuesIdCounter.get(Severity.Analysis)}`)

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

let hmShares = 0

/**
 * Calculate weights and shares
 */
for (const [, report] of reports) {
  const { labels, severity } = report
  const duplicates = internalIdCounters.get(report.internalId) || 1

  if (severity !== Severity.INVALID && severity !== Severity.WITHDRAWN) {
    report.weight = 1

    const selected = includesLabels(labels, ['selected for report'])
    const partial = partialScoring(labels)

    if (selected) report.weight = 1.3
    else if (partial) report.weight = partial
  }

  const weight = report.weight
  if (severity === Severity.High) {
    report.shares = 10 * (0.9 ** (duplicates - 1) / duplicates) * weight
    hmShares += report.shares
  } else if (severity === Severity.Medium) {
    report.shares = 3 * (0.9 ** (duplicates - 1) / duplicates) * weight
    hmShares += report.shares
  } else {
    report.shares *= weight
  }
}

const parsed = []
const totals = {
  rewards: 0,
  percents: 0,
}

/**
 * Calculate rewards and create an array from the reports
 */
for (const [id, report] of reports) {
  const { title, internalId, labels, main, severity, url, weight, shares } =
    report
  const author = report.author || ''

  const primary = getPrimaryIssueId(labels, reports)

  if (severity === Severity.High || severity === Severity.Medium) {
    totals.rewards += (shares / hmShares) * parseInt(process.env.HM_POT!)
    totals.percents += shares / hmShares
    report.reward = (shares / hmShares) * parseInt(process.env.HM_POT!)
  }

  const sortingField =
    '' + severitySorting[severity] + internalId + (main ? 'a' : 'b') + author

  parsed.push([
    sortingField,
    id,
    internalId,
    primary,
    title,
    author,
    weight,
    shares,
    report.reward.toFixed(2),
    severity,
    url,
    labels,
  ])
}

console.log(hmShares)
console.log(totals)

/**
 * Sort the array of reports
 */
parsed.sort((a, b) => (a[0]! < b[0]! ? -1 : 1))
parsed.forEach((e) => e.shift())

/**
 * Write all the entries to a csv file
 */
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
    'shares',
    'reward',
    'severity',
    'url',
    'labels',
  ],
})

await writer.writeRecords(parsed)
