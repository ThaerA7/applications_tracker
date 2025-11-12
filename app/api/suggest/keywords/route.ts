import { NextRequest } from 'next/server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const JOBSUCHE_KEY = process.env.JOBSUCHE_API_KEY ?? 'jobboerse-jobsuche';
const BERUFENET_KEY = process.env.BERUFENET_API_KEY ?? 'infosysbub-berufenet';

function rank(q: string, arr: string[], max = 8) {
  const nq = q.trim().toLowerCase();
  const scored = Array.from(new Set(arr.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)))
    .map(s => {
      const ns = s.toLowerCase();
      const idx = ns.indexOf(nq);
      if (idx === -1) return null;
      const starts = idx === 0 ? 0 : 1;
      const score = starts * 1000 + idx * 10 + ns.length;
      return { s, score };
    })
    .filter(Boolean) as { s: string; score: number }[];
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, max).map(x => x.s);
}

function pluckTitles(j: any): string[] {
  const out = new Set<string>();
  const tryFields = (obj: any, keys: string[]) => {
    if (!obj) return;
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === 'string') out.add(v);
    }
  };
  tryFields(j, ['titel', 'bezeichnung', 'stellenbezeichnung', 'beruf', 'headline']);
  tryFields(j?.aktuelleVeroeffentlichung, ['titel', 'bezeichnung']);
  tryFields(j?.stellenbeschreibung, ['titel', 'bezeichnung']);
  if (Array.isArray(j?.berufe)) {
    for (const b of j.berufe) {
      if (typeof b === 'string') out.add(b);
      else if (typeof b?.bezeichnung === 'string') out.add(b.bezeichnung);
    }
  }
  return Array.from(out);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return Response.json({ suggestions: [] });

  const suggestions: string[] = [];

  try {
    const url = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?was=${encodeURIComponent(q)}&size=25&veroeffentlichtseit=100`;
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'X-API-Key': JOBSUCHE_KEY },
      cache: 'no-store',
    });
    if (r.ok) {
      const data = await r.json();
      const jobs: any[] = data?.stellenangebote ?? [];
      const titles = jobs.flatMap(pluckTitles);
      suggestions.push(...titles);
    }
  } catch {}

  if (suggestions.length < 4) {
    try {
      const url = `https://rest.arbeitsagentur.de/infosysbub/bnet/pc/v1/berufe?suchwoerter=${encodeURIComponent(q)}*&page=0`;
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-API-Key': BERUFENET_KEY },
        cache: 'no-store',
      });
      if (r.ok) {
        const data = await r.json();
        const rows: any[] = data?.berufe ?? data?.result ?? [];
        for (const x of rows) {
          const s = x?.kurzbezeichnung ?? x?.kurzBezeichnung ?? x?.bezeichnung ?? x?.name;
          if (typeof s === 'string') suggestions.push(s);
        }
      }
    } catch {}
  }

  const ranked = rank(q, suggestions, 8);
  return Response.json({ suggestions: ranked });
}
