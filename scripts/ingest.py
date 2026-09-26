# -*- coding: utf-8 -*-
"""Ingest CBS baby-name data (babynamesil 1949-2024) + curated PA 2025/תשפ״ו into public/data/."""
from __future__ import annotations

import json
import os
from collections import defaultdict
from pathlib import Path

from babynamesil import load_data

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data"

SECTORS = ["Jewish", "Muslim", "Christian-Arab", "Druze"]
SECTOR_HE = {
    "Jewish": "יהודי",
    "Muslim": "מוסלמי",
    "Christian-Arab": "ערבי-נוצרי",
    "Druze": "דרוזי",
}


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def build_pa2025() -> dict:
    """Curated Population Authority top lists for Gregorian 2025 (with counts)
    and Hebrew תשפ״ו (ranks only, as of 2026-09-06). Do not invent missing counts.
    """
    return {
        "gregorianYear": 2025,
        "hebrewYear": 5786,
        "hebrewLabel": 'תשפ״ו',
        "sources": [
            {
                "label": "רשות האוכלוסין וההגירה — שמות 2025 (מתוקשר עם ספירות)",
                "url": "https://www.jdn.co.il/news/2546853/",
                "asOf": "2025-12-29",
                "note": "Top-10 עם ספירות לשנת לוח 2025; לא יקום מלא של כל השמות.",
            },
            {
                "label": "רשות האוכלוסין וההגירה — תשפ״ו (דירוגים)",
                "url": "https://www.gov.il/he/pages/data062926",
                "asOf": "2026-09-06",
                "note": "Top-10 לפי דירוג בלבד לשנת תשפ״ו; ללא ספירות מפורסמות לכל שם.",
            },
        ],
        "calendar2025": {
            "kind": "top10_with_counts",
            "boysGeneral": [
                {"name": "מוחמד", "n": 1743},
                {"name": "יוסף", "n": 1274},
                {"name": "אדם", "n": 1176},
                {"name": "אריאל", "n": 1061},
                {"name": "דוד", "n": 1036},
                {"name": "לביא", "n": 994},
                {"name": "רפאל", "n": 875},
                {"name": "עומר", "n": 867},
                {"name": "איתן", "n": 744},
                {"name": "מיכאל", "n": 735},
            ],
            "boysJewish": [
                {"name": "אריאל", "n": 1032},
                {"name": "לביא", "n": 973},
                {"name": "דוד", "n": 970},
                {"name": "רפאל", "n": 819},
                {"name": "אורי", "n": 721},
                {"name": "מיכאל", "n": 692},
                {"name": "איתן", "n": 674},
                {"name": "אליה", "n": 665},
                {"name": "יהודה", "n": 653},
                {"name": "ארי", "n": 651},
            ],
            "girlsGeneral": [
                {"name": "אביגיל", "n": 1172},
                {"name": "מרים", "n": 1010},
                {"name": "ליבי", "n": 856},
                {"name": "תמר", "n": 826},
                {"name": "ליה", "n": 770},
                {"name": "שרה", "n": 753},
                {"name": "יעל", "n": 734},
                {"name": "אלה", "n": 719},
                {"name": "אילה", "n": 697},
                {"name": "נועה", "n": 672},
            ],
            "girlsJewish": [
                {"name": "אביגיל", "n": 1160},
                {"name": "ליבי", "n": 830},
                {"name": "תמר", "n": 817},
                {"name": "יעל", "n": 726},
                {"name": "אלה", "n": 674},
                {"name": "נועה", "n": 656},
                {"name": "שרה", "n": 645},
                {"name": "ליה", "n": 634},
                {"name": "אילה", "n": 597},
                {"name": "אדל", "n": 532},
            ],
        },
        "hebrew5786": {
            "kind": "top10_ranks_only",
            "asOf": "2026-09-06",
            "boysGeneral": ["מוחמד", "אריאל", "יוסף", "אדם", "דוד", "עומר", "רפאל", "לביא", "מיכאל", "איתן"],
            "boysJewish": ["אריאל", "דוד", "רפאל", "לביא", "אורי", "מיכאל", "אליה", "איתן", "יהודה", "ארי"],
            "girlsGeneral": ["אביגיל", "מרים", "ליה", "ליבי", "תמר", "יעל", "אילה", "שרה", "אלה", "נאיה"],
            "girlsJewish": ["אביגיל", "ליבי", "תמר", "יעל", "ליה", "אלה", "אילה", "שרה", "נועה", "נאיה"],
        },
        "disclaimer": "לשנת 2025 / תשפ״ו פורסמו רק דירוגי Top-10 (ולעיתים ספירות לטופ). אין יקום מלא של כל השמות עם ספירות כמו בנתוני הלמ״ס עד 2024.",
    }


def main() -> None:
    print("Loading babynamesil (CBS 1949-2024)...")
    df = load_data()
    # Ensure types
    df = df.copy()
    df["year"] = df["year"].astype(int)
    df["n"] = df["n"].astype(int)
    df["name"] = df["name"].astype(str)
    df["sex"] = df["sex"].astype(str)
    df["sector"] = df["sector"].astype(str)

    min_year = int(df["year"].min())
    max_year = int(df["year"].max())
    print(f"Rows={len(df):,} names={df['name'].nunique():,} years={min_year}-{max_year}")

    # ---- years.json: per-year summaries ----
    years: dict = {}
    for year, g in df.groupby("year", sort=True):
        year = int(year)
        # distinct names & total births in published dataset (names with n>=5 typically)
        distinct = int(g["name"].nunique())
        total = int(g["n"].sum())

        def top_agg(sub, limit=30):
            s = sub.groupby("name", as_index=False)["n"].sum().sort_values("n", ascending=False).head(limit)
            return [{"name": r.name, "n": int(r.n)} for r in s.itertuples(index=False)]

        by_sex = {
            "M": top_agg(g[g["sex"] == "M"]),
            "F": top_agg(g[g["sex"] == "F"]),
            "all": top_agg(g),
        }
        by_sector = {}
        for sector in SECTORS:
            sg = g[g["sector"] == sector]
            if sg.empty:
                continue
            by_sector[sector] = {
                "total": int(sg["n"].sum()),
                "distinct": int(sg["name"].nunique()),
                "M": top_agg(sg[sg["sex"] == "M"], 20),
                "F": top_agg(sg[sg["sex"] == "F"], 20),
                "all": top_agg(sg, 20),
            }

        years[str(year)] = {
            "year": year,
            "total": total,
            "distinct": distinct,
            "top": by_sex,
            "bySector": by_sector,
        }

    # ---- byName.json: per-name yearly series (aggregated) ----
    # Structure: name -> { total, peakYear, peakN, series: [{y, all, M, F, sectors: {Jewish: n, ...}}] }
    name_years: dict[str, dict[int, dict]] = defaultdict(lambda: defaultdict(lambda: {"all": 0, "M": 0, "F": 0, "sectors": defaultdict(int)}))
    name_total: dict[str, int] = defaultdict(int)

    for row in df.itertuples(index=False):
        nm = row.name
        y = int(row.year)
        n = int(row.n)
        bucket = name_years[nm][y]
        bucket["all"] += n
        bucket[row.sex] += n
        bucket["sectors"][row.sector] += n
        name_total[nm] += n

    by_name = {}
    for nm, ymap in name_years.items():
        series = []
        peak_year, peak_n = None, -1
        for y in sorted(ymap.keys()):
            b = ymap[y]
            entry = {
                "y": y,
                "all": b["all"],
                "M": b["M"],
                "F": b["F"],
                "s": {k: int(v) for k, v in b["sectors"].items()},
            }
            series.append(entry)
            if b["all"] > peak_n:
                peak_n = b["all"]
                peak_year = y
        by_name[nm] = {
            "total": int(name_total[nm]),
            "peakYear": peak_year,
            "peakN": int(peak_n),
            "series": series,
        }

    # name suggest list sorted by total desc
    name_list = sorted(
        [{"name": nm, "total": int(tot)} for nm, tot in name_total.items()],
        key=lambda x: (-x["total"], x["name"]),
    )

    pa = build_pa2025()

    meta = {
        "cbsMinYear": min_year,
        "cbsMaxYear": max_year,
        "paGregorianYear": 2025,
        "paHebrewYear": 5786,
        "paHebrewLabel": 'תשפ״ו',
        "sectors": SECTORS,
        "sectorHe": SECTOR_HE,
        "nameCount": len(by_name),
        "rowCount": int(len(df)),
        "thresholdNote": "הלמ״ס מפרסם שמות עם לפחות 5 ילודים בשנה/מגזר/מין; מתחת לסף מוצג ריק.",
        "hebrewYearNote": "המרת שנה עברית↔לועזית לילודה משוערת: לועזית ≈ עברית − 3761 (או −3760 ליד ראש השנה). זו קירוב — שנת לידה עברית חופפת שתי שנים לועזיות חלקיות.",
        "footer": 'היסטוריה מלאה: הלמ״ס עד 2024 · מגמות אחרונות: רשות האוכלוסין תשפ״ו / 2025',
        "sources": [
            {
                "label": "הלשכה המרכזית לסטטיסטיקה (למ״ס) — שמות ילודים",
                "url": "https://www.cbs.gov.il/",
                "via": "babynamesil (PyPI)",
                "years": f"{min_year}-{max_year}",
            },
            {
                "label": "רשות האוכלוסין וההגירה — Top-10 2025 / תשפ״ו",
                "url": "https://www.gov.il/he/pages/data062926",
                "years": "2025 / 5786",
            },
        ],
    }

    print("Writing JSON...")
    write_json(OUT / "meta.json", meta)
    write_json(OUT / "years.json", years)
    write_json(OUT / "byName.json", by_name)
    write_json(OUT / "nameList.json", name_list)
    write_json(OUT / "pa2025.json", pa)

    # size report
    for p in sorted(OUT.glob("*.json")):
        print(f"  {p.name}: {p.stat().st_size / 1024:.1f} KB")
    print("Done.")


if __name__ == "__main__":
    main()
