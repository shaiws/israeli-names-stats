import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  formatHebrewYear,
  resolveYearInput,
  type ResolvedYear,
} from './lib/hebrewYear'
import {
  formatN,
  loadByName,
  loadMeta,
  loadNameList,
  loadPa2025,
  loadYears,
  type Meta,
  type NameData,
  type NameListItem,
  type Pa2025,
  type SectorFilter,
  type SexFilter,
  type YearData,
} from './lib/data'

type View =
  | { mode: 'home' }
  | { mode: 'year'; resolved: ResolvedYear }
  | { mode: 'name'; name: string }

const SEX_LABEL: Record<SexFilter, string> = {
  all: 'הכל',
  M: 'בנים',
  F: 'בנות',
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [years, setYears] = useState<Record<string, YearData> | null>(null)
  const [byName, setByName] = useState<Record<string, NameData> | null>(null)
  const [nameList, setNameList] = useState<NameListItem[] | null>(null)
  const [pa, setPa] = useState<Pa2025 | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [nameQuery, setNameQuery] = useState('')
  const [yearQuery, setYearQuery] = useState('')
  const [yearError, setYearError] = useState<string | null>(null)
  const [sex, setSex] = useState<SexFilter>('all')
  const [sector, setSector] = useState<SectorFilter>('all')
  const [view, setView] = useState<View>({ mode: 'home' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [m, y, bn, nl, p] = await Promise.all([
          loadMeta(),
          loadYears(),
          loadByName(),
          loadNameList(),
          loadPa2025(),
        ])
        if (!cancelled) {
          setMeta(m)
          setYears(y)
          setByName(bn)
          setNameList(nl)
          setPa(p)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const suggestions = useMemo(() => {
    if (!nameList || nameQuery.trim().length < 1) return []
    const q = nameQuery.trim()
    return nameList.filter((x) => x.name.startsWith(q)).slice(0, 12)
  }, [nameList, nameQuery])

  function goName(name: string) {
    setNameQuery(name)
    setView({ mode: 'name', name })
  }

  function goYear() {
    if (!meta) return
    const r = resolveYearInput(yearQuery, meta.cbsMinYear, meta.cbsMaxYear)
    if ('error' in r) {
      setYearError(r.error)
      return
    }
    setYearError(null)
    setView({ mode: 'year', resolved: r })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        טוען נתונים…
      </div>
    )
  }

  if (error || !meta || !years || !byName || !nameList || !pa) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center text-red-700">
        <p className="font-bold">שגיאה בטעינת הנתונים</p>
        <p className="mt-2 text-sm">{error ?? 'חסרים קבצים — הריצו npm run ingest'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 text-slate-900">
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setView({ mode: 'home' })}
              className="text-right text-2xl font-bold text-sky-800 hover:text-sky-600"
            >
              שמות ילודים בישראל
            </button>
            <p className="mt-1 text-sm text-slate-500">
              חיפוש סטטיסטיקה לפי שם ושנה · למ״ס {meta.cbsMinYear}–{meta.cbsMaxYear} · מעודכן{' '}
              {meta.paHebrewLabel} / 2025
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            מעודכן · רשות האוכלוסין 2025
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Search panels */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">חיפוש שם</h2>
            <div className="relative">
              <input
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameQuery.trim()) goName(nameQuery.trim())
                }}
                placeholder="לדוגמה: דוד, אביגיל, מוחמד"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                dir="rtl"
                autoComplete="off"
              />
              {suggestions.length > 0 && view.mode !== 'name' && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((s) => (
                    <li key={s.name}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-right hover:bg-sky-50"
                        onClick={() => goName(s.name)}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-slate-400">{formatN(s.total)} סה״כ</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => nameQuery.trim() && goName(nameQuery.trim())}
              className="mt-3 w-full rounded-xl bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700"
            >
              הצג סטטיסטיקת שם
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">חיפוש שנה (לועזית או עברית)</h2>
            <input
              value={yearQuery}
              onChange={(e) => setYearQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goYear()
              }}
              placeholder='2020 · 5780 · תש״פ · 2025 · תשפ״ו'
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              dir="rtl"
            />
            {yearError && <p className="mt-2 text-sm text-red-600">{yearError}</p>}
            <button
              type="button"
              onClick={goYear}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              הצג סטטיסטיקת שנה
            </button>
            <p className="mt-2 text-xs text-slate-500">{meta.hebrewYearNote}</p>
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="text-sm font-medium text-slate-600">מין:</span>
          {(['all', 'M', 'F'] as SexFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`rounded-full px-3 py-1 text-sm ${
                sex === s ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {SEX_LABEL[s]}
            </button>
          ))}
          <span className="mx-2 hidden h-5 w-px bg-slate-200 sm:inline" />
          <span className="text-sm font-medium text-slate-600">מגזר:</span>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as SectorFilter)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            <option value="all">הכל</option>
            {meta.sectors.map((s) => (
              <option key={s} value={s}>
                {meta.sectorHe[s] ?? s}
              </option>
            ))}
          </select>
        </section>

        {view.mode === 'home' && (
          <HomeHints meta={meta} onYear={(q) => { setYearQuery(q); setTimeout(() => {
            const r = resolveYearInput(q, meta.cbsMinYear, meta.cbsMaxYear)
            if (!('error' in r)) setView({ mode: 'year', resolved: r })
          }, 0) }} onName={goName} />
        )}

        {view.mode === 'year' && (
          <YearView
            resolved={view.resolved}
            years={years}
            pa={pa}
            meta={meta}
            sex={sex}
            sector={sector}
            onName={goName}
          />
        )}

        {view.mode === 'name' && (
          <NameView
            name={view.name}
            data={byName[view.name]}
            sex={sex}
            sector={sector}
            meta={meta}
            pa={pa}
          />
        )}
      </main>

      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">{meta.footer}</p>
          <p>{meta.thresholdNote}</p>
          <ul className="list-inside list-disc space-y-1">
            {meta.sources.map((s) => (
              <li key={s.url}>
                <a className="text-sky-700 underline hover:text-sky-900" href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
                {s.via ? ` (${s.via})` : ''} · {s.years}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  )
}

function HomeHints({
  meta,
  onYear,
  onName,
}: {
  meta: Meta
  onYear: (q: string) => void
  onName: (n: string) => void
}) {
  return (
    <section className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-5">
      <h2 className="text-lg font-semibold text-sky-900">מה אפשר לבדוק?</h2>
      <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <li>
          <button type="button" className="text-sky-700 underline" onClick={() => onYear('2024')}>
            כמה שמות וכמה ילודים ב־2024?
          </button>
        </li>
        <li>
          <button type="button" className="text-sky-700 underline" onClick={() => onYear('תשפ״ו')}>
            Top-10 בתשפ״ו (רשות האוכלוסין)
          </button>
        </li>
        <li>
          <button type="button" className="text-sky-700 underline" onClick={() => onYear('2025')}>
            מובילים ב־2025 עם ספירות
          </button>
        </li>
        <li>
          <button type="button" className="text-sky-700 underline" onClick={() => onName('אביגיל')}>
            מגמת השם אביגיל לאורך השנים
          </button>
        </li>
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        למ״ס: {meta.cbsMinYear}–{meta.cbsMaxYear} ({formatN(meta.nameCount)} שמות, {formatN(meta.rowCount)} רשומות)
      </p>
    </section>
  )
}

function YearView({
  resolved,
  years,
  pa,
  meta,
  sex,
  sector,
  onName,
}: {
  resolved: ResolvedYear
  years: Record<string, YearData>
  pa: Pa2025
  meta: Meta
  sex: SexFilter
  sector: SectorFilter
  onName: (n: string) => void
}) {
  if (resolved.kind === 'pa2025' || resolved.kind === 'pa5786') {
    return <PaYearView resolved={resolved} pa={pa} onName={onName} />
  }

  const yd = years[String(resolved.gregorian)]
  if (!yd) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        אין נתוני למ״ס לשנה {resolved.gregorian}. נסו שנה בין {meta.cbsMinYear}–{meta.cbsMaxYear}, או 2025 / תשפ״ו.
      </div>
    )
  }

  let total = yd.total
  let distinct = yd.distinct
  let top = yd.top[sex]

  if (sector !== 'all') {
    const block = yd.bySector[sector]
    if (!block) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          אין נתונים למגזר זה בשנת {yd.year}.
        </div>
      )
    }
    total = block.total
    distinct = block.distinct
    top = block[sex]
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          שנת {resolved.gregorian} · {resolved.hebrewLabel} ({resolved.hebrew})
        </h2>
        <p className="mt-1 text-sm text-slate-500">מקור: הלמ״ס (יקום מלא של שמות מעל הסף)</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="שמות ייחודיים" value={formatN(distinct)} />
          <StatCard label="סה״כ ילודים בנתונים" value={formatN(total)} />
          <StatCard label="מין" value={SEX_LABEL[sex]} />
          <StatCard
            label="מגזר"
            value={sector === 'all' ? 'הכל' : meta.sectorHe[sector] ?? sector}
          />
        </div>
      </div>
      <TopTable title="שמות מובילים" rows={top} onName={onName} emptyHint="אין שמות מעל סף הפרסום (&lt;5) לסינון הנוכחי." />
    </section>
  )
}

function PaYearView({
  resolved,
  pa,
  onName,
}: {
  resolved: ResolvedYear
  pa: Pa2025
  onName: (n: string) => void
}) {
  const isRanks = resolved.kind === 'pa5786'
  const cal = pa.calendar2025
  const heb = pa.hebrew5786

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-amber-950">
            {isRanks ? `תשפ״ו (${pa.hebrewYear})` : `2025 · ${pa.hebrewLabel}`}
          </h2>
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
            מעודכן · רשות האוכלוסין
          </span>
        </div>
        <p className="mt-2 text-sm text-amber-900">{pa.disclaimer}</p>
        <p className="mt-1 text-xs text-amber-800">
          {isRanks
            ? `דירוגי Top-10 נכון ל־${heb.asOf} — ללא ספירות מלאות.`
            : 'Top-10 עם ספירות לשנת לוח 2025 (מתוקשר מפרסומי הרשות). אין חיפוש לכל השמות.'}
        </p>
      </div>

      {isRanks ? (
        <div className="grid gap-4 md:grid-cols-2">
          <RankList title="בנים — כללי" names={heb.boysGeneral} onName={onName} />
          <RankList title="בנים — יהודי" names={heb.boysJewish} onName={onName} />
          <RankList title="בנות — כללי" names={heb.girlsGeneral} onName={onName} />
          <RankList title="בנות — יהודי" names={heb.girlsJewish} onName={onName} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <TopTable title="בנים — כללי" rows={cal.boysGeneral} onName={onName} />
          <TopTable title="בנים — יהודי" rows={cal.boysJewish} onName={onName} />
          <TopTable title="בנות — כללי" rows={cal.girlsGeneral} onName={onName} />
          <TopTable title="בנות — יהודי" rows={cal.girlsJewish} onName={onName} />
        </div>
      )}
    </section>
  )
}

function NameView({
  name,
  data,
  sex,
  sector,
  meta,
  pa,
}: {
  name: string
  data: NameData | undefined
  sex: SexFilter
  sector: SectorFilter
  meta: Meta
  pa: Pa2025
}) {
  if (!data) {
    // Check if name appears only in PA tops
    const inPa =
      [
        ...pa.calendar2025.boysGeneral,
        ...pa.calendar2025.boysJewish,
        ...pa.calendar2025.girlsGeneral,
        ...pa.calendar2025.girlsJewish,
      ].some((x) => x.name === name) ||
      [
        ...pa.hebrew5786.boysGeneral,
        ...pa.hebrew5786.boysJewish,
        ...pa.hebrew5786.girlsGeneral,
        ...pa.hebrew5786.girlsJewish,
      ].includes(name)

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="mt-2 text-slate-600">
          {inPa
            ? 'השם מופיע בדירוגי רשות האוכלוסין ל־2025/תשפ״ו, אך אין עבורו סדרת למ״ס מלאה (או מתחת לסף).'
            : 'אין נתונים לשם זה בקבצי הלמ״ס (ייתכן מתחת לסף הפרסום של 5).'}
        </p>
      </div>
    )
  }

  const chartData = data.series.map((p) => {
    let v = 0
    if (sector !== 'all') {
      v = p.s[sector] ?? 0
      // sector totals are not split by sex in compact form; when sex filtered + sector, show sector total only if sex=all
      if (sex !== 'all') {
        // approximate: we don't have sector×sex in series; fall back to sex-only when sector=all
        v = 0
      }
    } else {
      v = sex === 'all' ? p.all : p[sex]
    }
    return { year: p.y, n: v }
  })

  // If sector+sex both set, rebuild from note: show sex-only (sector×sex needs full cube)
  const effectiveSeries =
    sector !== 'all' && sex !== 'all'
      ? data.series.map((p) => ({ year: p.y, n: p[sex] }))
      : chartData

  const filteredTotal = effectiveSeries.reduce((a, b) => a + b.n, 0)
  const peak = effectiveSeries.reduce(
    (best, cur) => (cur.n > best.n ? cur : best),
    { year: data.peakYear, n: 0 },
  )

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-sky-900">{name}</h2>
        <p className="text-sm text-slate-500">נתוני למ״ס {meta.cbsMinYear}–{meta.cbsMaxYear}</p>
        {sector !== 'all' && sex !== 'all' && (
          <p className="mt-2 text-xs text-amber-700">
            שילוב מגזר+מין מוצג כקירוב לפי מין בלבד (פירוט מגזר×מין לא נשמר בכל נקודה בגרף).
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="סה״כ (לפי סינון)" value={filteredTotal > 0 ? formatN(filteredTotal) : '—'} />
          <StatCard label="שנת שיא" value={peak.n > 0 ? String(peak.year) : '—'} />
          <StatCard label="בשיא" value={peak.n > 0 ? formatN(peak.n) : '—'} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">מגמה לאורך השנים</h3>
        {filteredTotal === 0 ? (
          <p className="text-sm text-slate-500">אין ערכים מעל הסף לסינון הנוכחי.</p>
        ) : (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={effectiveSeries.filter((d) => d.n > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="n" name="מספר" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right">שנה</th>
              <th className="px-3 py-2 text-right">עברית (קירוב)</th>
              <th className="px-3 py-2 text-right">מספר</th>
            </tr>
          </thead>
          <tbody>
            {[...effectiveSeries].reverse().map((row) =>
              row.n > 0 ? (
                <tr key={row.year} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">{row.year}</td>
                  <td className="px-3 py-1.5 text-slate-500">
                    {formatHebrewYear(row.year + 3761)}
                  </td>
                  <td className="px-3 py-1.5 font-medium">{formatN(row.n)}</td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
    </div>
  )
}

function TopTable({
  title,
  rows,
  onName,
  emptyHint,
}: {
  title: string
  rows: { name: string; n?: number }[]
  onName: (n: string) => void
  emptyHint?: string
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        {emptyHint ?? 'אין נתונים'}
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2 font-semibold">{title}</h3>
      <ol className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <li key={r.name + i} className="flex items-center justify-between px-4 py-2">
            <button type="button" className="font-medium text-sky-800 hover:underline" onClick={() => onName(r.name)}>
              <span className="ml-2 inline-block w-6 text-slate-400">{i + 1}.</span>
              {r.name}
            </button>
            <span className="tabular-nums text-slate-700">{r.n != null ? formatN(r.n) : '—'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function RankList({
  title,
  names,
  onName,
}: {
  title: string
  names: string[]
  onName: (n: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2 font-semibold">{title}</h3>
      <ol className="divide-y divide-slate-100">
        {names.map((name, i) => (
          <li key={name} className="flex items-center justify-between px-4 py-2">
            <button type="button" className="font-medium text-sky-800 hover:underline" onClick={() => onName(name)}>
              <span className="ml-2 inline-block w-6 text-slate-400">{i + 1}.</span>
              {name}
            </button>
            <span className="text-xs text-slate-400">דירוג בלבד</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
