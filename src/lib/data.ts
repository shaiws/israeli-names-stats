export type SexFilter = 'all' | 'M' | 'F'
export type SectorFilter = 'all' | 'Jewish' | 'Muslim' | 'Christian-Arab' | 'Druze'

export interface NameCount {
  name: string
  n: number
}

export interface YearSectorBlock {
  total: number
  distinct: number
  M: NameCount[]
  F: NameCount[]
  all: NameCount[]
}

export interface YearData {
  year: number
  total: number
  distinct: number
  top: { M: NameCount[]; F: NameCount[]; all: NameCount[] }
  bySector: Record<string, YearSectorBlock>
}

export interface NameSeriesPoint {
  y: number
  all: number
  M: number
  F: number
  s: Record<string, number>
}

export interface NameData {
  total: number
  peakYear: number
  peakN: number
  series: NameSeriesPoint[]
}

export interface Meta {
  cbsMinYear: number
  cbsMaxYear: number
  paGregorianYear: number
  paHebrewYear: number
  paHebrewLabel: string
  sectors: string[]
  sectorHe: Record<string, string>
  nameCount: number
  rowCount: number
  thresholdNote: string
  hebrewYearNote: string
  footer: string
  sources: { label: string; url: string; via?: string; years: string }[]
}

export interface PaTopEntry {
  name: string
  n?: number
}

export interface Pa2025 {
  gregorianYear: number
  hebrewYear: number
  hebrewLabel: string
  sources: { label: string; url: string; asOf: string; note: string }[]
  calendar2025: {
    kind: string
    boysGeneral: PaTopEntry[]
    boysJewish: PaTopEntry[]
    girlsGeneral: PaTopEntry[]
    girlsJewish: PaTopEntry[]
  }
  hebrew5786: {
    kind: string
    asOf: string
    boysGeneral: string[]
    boysJewish: string[]
    girlsGeneral: string[]
    girlsJewish: string[]
  }
  disclaimer: string
}

export interface NameListItem {
  name: string
  total: number
}

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

let metaCache: Meta | null = null
let yearsCache: Record<string, YearData> | null = null
let byNameCache: Record<string, NameData> | null = null
let nameListCache: NameListItem[] | null = null
let paCache: Pa2025 | null = null

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadMeta(): Promise<Meta> {
  if (!metaCache) metaCache = await getJson<Meta>(dataUrl('meta.json'))
  return metaCache
}

export async function loadYears(): Promise<Record<string, YearData>> {
  if (!yearsCache) yearsCache = await getJson(dataUrl('years.json'))
  return yearsCache!
}

export async function loadByName(): Promise<Record<string, NameData>> {
  if (!byNameCache) byNameCache = await getJson(dataUrl('byName.json'))
  return byNameCache!
}

export async function loadNameList(): Promise<NameListItem[]> {
  if (!nameListCache) nameListCache = await getJson(dataUrl('nameList.json'))
  return nameListCache!
}

export async function loadPa2025(): Promise<Pa2025> {
  if (!paCache) paCache = await getJson(dataUrl('pa2025.json'))
  return paCache!
}

export function formatN(n: number): string {
  return n.toLocaleString('he-IL')
}
