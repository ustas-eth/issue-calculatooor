export class Report {
  id: number
  title: string
  internalId: string
  author?: string
  severity: Severity
  url: string
  labels: string[]
  main: boolean
  weight: number = 0
  shares: number = 1
  reward: number = 0

  constructor(
    id: number,
    title: string,
    internalId: string,
    severity: Severity,
    url: string,
    labels: string[],
    main: boolean,
  ) {
    this.id = id
    this.title = title
    this.internalId = internalId
    this.severity = severity
    this.url = url
    this.labels = labels
    this.main = main
  }
}

export enum Severity {
  High = 'High',
  Medium = 'Medium',
  QA = 'QA',
  Gas = 'Gas',
  Analysis = 'Analysis',
  WITHDRAWN = 'WITHDRAWN',
  INVALID = 'INVALID',
  UNKNOWN = 'UNKNOWN',
}
