import { Report, Severity } from './Report.js'

export function generateInternalId(
  severity: Severity,
  counter: Map<Severity, number>,
) {
  const current = counter.get(severity) || 1
  const inString = String(current).padStart(3, '0')

  counter.set(severity, current + 1)

  switch (severity) {
    case Severity.High:
      return `H-${inString}`

    case Severity.Medium:
      return `M-${inString}`

    case Severity.QA:
      return `Q-${inString}`

    case Severity.Gas:
      return `G-${inString}`

    case Severity.Analysis:
      return `A-${inString}`
  }

  return 'NONE'
}

export function getLabels(issue: any) {
  return issue.labels.map((label: any) => label.name)
}

export function extractSeverityFromLabels(labels: string[]) {
  if (includesLabels(labels, ['withdrawn'])) return Severity.WITHDRAWN
  if (includesLabels(labels, ['unsatisfactory', 'nullified', 'invalid']))
    return Severity.INVALID

  for (const label of labels) {
    if (label.includes('High Risk')) return Severity.High
    if (label.includes('Med Risk')) return Severity.Medium
    if (label.includes('Quality Assurance')) return Severity.QA
    if (label.includes('Gas Optimization')) return Severity.Gas
    if (label.includes('analysis')) return Severity.Analysis
  }

  return Severity.UNKNOWN
}

export function includesLabels(labels: string[], checklist: string[]) {
  return labels.some((label) => checklist.some((c) => label.includes(c)))
}

export function partialScoring(labels: string[]) {
  const label = labels.find((label) => label.includes('partial-'))
  const percent = label?.split('duplicate-')?.[1] || ''
  return parseInt(percent) / 100
}

function primaryIdFromDuplicate(labels: string[]) {
  const label = labels.find((label) => label.includes('duplicate-'))
  const primary = label?.split('duplicate-')?.[1]
  return primary ? parseInt(primary) : undefined
}

export function getPrimaryIssueReport(
  labels: string[],
  reports: Map<number, Report>,
) {
  const primaryId = primaryIdFromDuplicate(labels)

  if (!primaryId) return

  const primary = reports.get(primaryId)

  if (primary) {
    if (primary.main) return primary
    else return getPrimaryIssueReport(primary.labels, reports)
  }
}

export function getPrimaryIssueId(
  labels: string[],
  reports: Map<number, Report>,
  prevPrimaryId: number | undefined = undefined,
) {
  const primaryId = primaryIdFromDuplicate(labels)

  if (!primaryId) return prevPrimaryId?.toString()

  const primary = reports.get(primaryId)

  if (primary) {
    if (primary.main) return primary.internalId
    else return getPrimaryIssueId(primary.labels, reports, primaryId)
  } else {
    return primaryId.toString()
  }
}
