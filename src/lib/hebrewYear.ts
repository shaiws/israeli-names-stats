/** Hebrew year helpers for birth-year search.
 * Approximation: Gregorian ≈ Hebrew − 3761 (or −3760 near Rosh Hashana).
 * A Hebrew birth year spans parts of two Gregorian years.
 */

const HEBREW_DIGITS: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
  ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90,
}

/** Convert Hebrew letters (e.g. תשפ״ו / תשפ"א / תשפא) to numeric Hebrew year (e.g. 5786). */
export function parseHebrewYearLabel(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null
  // strip quotes and geresh/gershayim
  s = s.replace(/["״׳']/g, '').replace(/\s+/g, '')
  // optional leading ה׳
  s = s.replace(/^ה/, '')
  if (/^\d{4}$/.test(s)) {
    const n = Number(s)
    return n >= 5700 && n <= 5900 ? n : null
  }
  let sum = 0
  for (const ch of s) {
    const v = HEBREW_DIGITS[ch]
    if (v == null) return null
    sum += v
  }
  if (sum <= 0) return null
  // modern Israeli years are 57xx / 58xx → add 5000
  if (sum < 1000) sum += 5000
  if (sum < 5700 || sum > 5900) return null
  return sum
}

export function hebrewToGregorianApprox(hebrewYear: number): number {
  return hebrewYear - 3761
}

export function gregorianToHebrewApprox(gregorianYear: number): number {
  return gregorianYear + 3761
}

/** Format numeric Hebrew year as letters, e.g. 5786 → תשפ״ו */
export function formatHebrewYear(hebrewYear: number): string {
  let n = hebrewYear % 1000 // drop thousands (ה׳)
  const parts: string[] = []
  const map: [number, string][] = [
    [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
    [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
    [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א'],
  ]
  for (const [val, ch] of map) {
    while (n >= val) {
      parts.push(ch)
      n -= val
    }
  }
  // 15/16 special forms
  let joined = parts.join('')
  joined = joined.replace('יה', 'טו').replace('יו', 'טז')
  if (joined.length >= 2) {
    return joined.slice(0, -1) + '״' + joined.slice(-1)
  }
  return joined + '׳'
}

export type ResolvedYear =
  | { kind: 'cbs'; gregorian: number; hebrew: number; hebrewLabel: string }
  | { kind: 'pa2025'; gregorian: 2025; hebrew: 5786; hebrewLabel: string }
  | { kind: 'pa5786'; gregorian: 2025; hebrew: 5786; hebrewLabel: string }

export function resolveYearInput(
  input: string,
  cbsMin: number,
  cbsMax: number,
): ResolvedYear | { error: string } {
  const t = input.trim()
  if (!t) return { error: 'נא להזין שנה' }

  // pure digits
  if (/^\d{4}$/.test(t)) {
    const n = Number(t)
    if (n === 2025) return { kind: 'pa2025', gregorian: 2025, hebrew: 5786, hebrewLabel: 'תשפ״ו' }
    if (n === 5786) return { kind: 'pa5786', gregorian: 2025, hebrew: 5786, hebrewLabel: 'תשפ״ו' }
    if (n >= cbsMin && n <= cbsMax) {
      const h = gregorianToHebrewApprox(n)
      return { kind: 'cbs', gregorian: n, hebrew: h, hebrewLabel: formatHebrewYear(h) }
    }
    if (n >= 5700 && n <= 5900) {
      const g = hebrewToGregorianApprox(n)
      if (n === 5786) return { kind: 'pa5786', gregorian: 2025, hebrew: 5786, hebrewLabel: 'תשפ״ו' }
      if (g >= cbsMin && g <= cbsMax) {
        return { kind: 'cbs', gregorian: g, hebrew: n, hebrewLabel: formatHebrewYear(n) }
      }
      return { error: `שנה עברית ${n} ≈ ${g} לועזית — מחוץ לטווח הלמ״ס (${cbsMin}–${cbsMax})` }
    }
    return { error: `שנה ${n} מחוץ לטווח הזמין` }
  }

  const h = parseHebrewYearLabel(t)
  if (h != null) {
    if (h === 5786) return { kind: 'pa5786', gregorian: 2025, hebrew: 5786, hebrewLabel: 'תשפ״ו' }
    const g = hebrewToGregorianApprox(h)
    if (g >= cbsMin && g <= cbsMax) {
      return { kind: 'cbs', gregorian: g, hebrew: h, hebrewLabel: formatHebrewYear(h) }
    }
    return { error: `שנה ${formatHebrewYear(h)} ≈ ${g} — מחוץ לטווח הלמ״ס` }
  }

  return { error: 'לא זוהתה שנה. נסו 2020, 5780 או תש״פ' }
}
