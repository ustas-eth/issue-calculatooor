export function initCounter() {
  return new Map([
    ['High', 1],
    ['Medium', 1],
    ['QA', 1],
    ['Gas', 1],
    ['Analysis', 1],
  ])
}

export function getLabels(issue: any) {
  return issue.labels.map((label: any) => label.name)
}

export function extractSeverityFromLabels(labels: string[]) {
  for (const label of labels) {
    if (label.includes('High Risk')) return 'High'
    if (label.includes('Med Risk')) return 'Medium'
    if (label.includes('Quality Assurance')) return 'QA'
    if (label.includes('Gas Optimization')) return 'Gas'
    if (label.includes('analysis')) return 'Analysis'
  }
}

export function includesLabels(labels: string[], checklist: string[]) {
  return labels.some((label) => checklist.some((c) => label.includes(c)))
}

export function isInvalid(labels: string[]) {
  return includesLabels(labels, ['unsatisfactory', 'nullified'])
}

export function primaryFromDuplicate(labels: string[]) {
  const label = labels.find((label) => label.includes('duplicate-'))
  const primary = label?.split('duplicate-')?.[1] || ''
  return parseInt(primary)
}

export function partialScoring(labels: string[]) {
  const label = labels.find((label) => label.includes('partial-'))
  const percent = label?.split('duplicate-')?.[1] || ''
  return parseInt(percent) / 100
}
