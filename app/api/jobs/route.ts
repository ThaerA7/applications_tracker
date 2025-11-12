import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Proxy to BA Jobsuche:
 *  - forwards BA params (was, wo, umkreis, angebotsart, arbeitszeit, page, size)
 *  - uses 1-based `page`
 *  - returns exact `total` (page.totalElements) so UI shows BA's count
 */
const BASE_URL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs';
const JOBSUCHE_KEY = process.env.JOBSUCHE_API_KEY ?? 'jobboerse-jobsuche';

function extractTotalBA(data: any): number | null {
  const cands = [
    data?.page?.totalElements,
    data?.totalElements,
    data?.gesamt,
    data?.gesamtAnzahl,
    data?.stellenangeboteGesamt,
  ];
  for (const c of cands) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // alias support: q → was
  const was = searchParams.get('was') ?? searchParams.get('q') ?? '';
  const wo = searchParams.get('wo') ?? '';
  const umkreis = searchParams.get('umkreis') ?? '';
  const page = searchParams.get('page') ?? '1';   // 1-based
  const size = searchParams.get('size') ?? '20';  // 20 per page
  const angebotsart = searchParams.get('angebotsart') ?? '1'; // default like BA page: Arbeit
  const arbeitszeit = searchParams.get('arbeitszeit') ?? '';  // vz|tz|mj|ho|snw (optional)
  const sortierung = searchParams.get('sortierung') ?? '';    // optional

  const qs = new URLSearchParams();
  if (was) qs.set('was', was);
  if (wo) qs.set('wo', wo);
  if (umkreis) qs.set('umkreis', umkreis);
  if (angebotsart) qs.set('angebotsart', angebotsart);
  if (arbeitszeit) qs.set('arbeitszeit', arbeitszeit);
  if (sortierung) qs.set('sortierung', sortierung);
  qs.set('page', page);
  qs.set('size', size);

  const url = `${BASE_URL}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'X-API-Key': JOBSUCHE_KEY, Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      let body: any;
      try { body = JSON.parse(text); } catch { body = text; }
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}`, upstream: body, forwardedUrl: url },
        { status: upstream.status }
      );
    }

    const data = JSON.parse(text);
    const rows = Array.isArray(data?.stellenangebote) ? data.stellenangebote : [];
    const total = extractTotalBA(data);

    const results = rows.map((j: any) => {
      const title = j?.titel ?? j?.beruf ?? j?.stellenbezeichnung ?? j?.berufsbezeichnung ?? 'Ohne Titel';
      const employer =
        (typeof j?.arbeitgeber === 'string' && j?.arbeitgeber) ||
        j?.arbeitgeber?.name || j?.unternehmen || j?.firma || '';
      const locObj = j?.arbeitsort ?? j?.arbeitsorte?.[0] ?? {};
      const location =
        typeof locObj === 'string' ? locObj : [locObj?.ort, locObj?.region, locObj?.land].filter(Boolean).join(', ');
      const hashId = j?.hashId ?? j?.hashID ?? j?.refnr;
      const detailUrl = hashId ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(hashId)}` : undefined;

      const offerType = j?.angebotsart ?? j?.arbeitszeit ?? undefined;
      const logoUrl = j?.arbeitgeberLogo ?? j?.logoUrl ?? undefined;
      const distanceKm = j?.entfernung ?? undefined;

      return { title, employer, location, hashId, detailUrl, offerType, logoUrl, distanceKm };
    });

    return NextResponse.json({
      results,
      total,                  // exact BA total
      page: Number(page),     // 1-based
      size: Number(size),
      baPage: data?.page ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 });
  }
}
