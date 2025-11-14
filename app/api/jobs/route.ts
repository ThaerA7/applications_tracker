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
  const candidates = [
    data?.maxErgebnisse, // <-- REAL BA total
    data?.stellenangeboteGesamt,
    data?.page?.totalElements,
    data?.totalElements,
    data?.gesamt,
    data?.gesamtAnzahl,
  ]
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n >= 0);

  return candidates.length ? Math.max(...candidates) : null;
}

// Build a nice label for the type of employment from BA fields
function deriveOfferTypeLabel(j: any): string | undefined {
  const angebotCode =
    j?.angebotsart !== undefined && j?.angebotsart !== null ? String(j.angebotsart).trim() : '';

  const arbeitszeitRaw = typeof j?.arbeitszeit === 'string' ? j.arbeitszeit.trim().toLowerCase() : '';
  const arbeitszeitParts = arbeitszeitRaw
    ? arbeitszeitRaw
        .split(/[;,]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  // Angebotstyp priorisiert
  if (angebotCode === '4') return 'Ausbildung / Duales Studium';
  if (angebotCode === '34') return 'Praktikum / Trainee';
  if (angebotCode === '2') return 'Selbstständigkeit';

  // Arbeitszeit-Codes
  if (arbeitszeitParts.includes('mj')) return 'Minijob';
  if (arbeitszeitParts.includes('tz')) return 'Teilzeit Job';
  if (arbeitszeitParts.includes('vz')) return 'Vollzeit Job';
  if (arbeitszeitParts.includes('ho')) return 'Homeoffice Job';
  if (arbeitszeitParts.includes('snw')) return 'Schicht / Nacht / Wochenende';

  if (angebotCode === '1') return 'Arbeit';

  // Fallback: Titel scannen
  const t = typeof j?.titel === 'string' ? j.titel.toLowerCase() : '';
  if (t.includes('werkstudent')) return 'Werkstudent';
  if (t.includes('praktikum') || t.includes('praktikant')) return 'Praktikum';
  if (t.includes('ausbildung')) return 'Ausbildung';

  return undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const was = searchParams.get('was') ?? searchParams.get('q') ?? '';
  const wo = searchParams.get('wo') ?? '';
  const umkreis = searchParams.get('umkreis') ?? '';
  const uiPage = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const size = searchParams.get('size') ?? '20';
  const angebotsart = searchParams.get('angebotsart') ?? '1';
  const arbeitszeit = searchParams.get('arbeitszeit') ?? '';
  const sortierung = searchParams.get('sortierung') ?? '';

  // BA is 1-based – keep as-is
  const upstreamPage = String(uiPage);

  const qs = new URLSearchParams();
  if (was) qs.set('was', was);
  if (wo) qs.set('wo', wo);
  if (umkreis) qs.set('umkreis', umkreis);
  if (angebotsart) qs.set('angebotsart', angebotsart);
  if (arbeitszeit) qs.set('arbeitszeit', arbeitszeit);
  if (sortierung) qs.set('sortierung', sortierung);
  qs.set('page', upstreamPage);
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
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}`, upstream: body, forwardedUrl: url },
        { status: upstream.status },
      );
    }

    const data = JSON.parse(text);
    const rows = Array.isArray(data?.stellenangebote) ? data.stellenangebote : [];
    const total = extractTotalBA(data);

    const results = rows.map((j: any) => {
      const title =
        j?.titel ??
        j?.beruf ??
        j?.stellenbezeichnung ??
        j?.berufsbezeichnung ??
        'Ohne Titel';

      const employer =
        (typeof j?.arbeitgeber === 'string' && j?.arbeitgeber) ||
        j?.arbeitgeber?.name ||
        j?.unternehmen ||
        j?.firma ||
        '';

      const locObj = j?.arbeitsort ?? j?.arbeitsorte?.[0] ?? {};
      const location =
        typeof locObj === 'string'
          ? locObj
          : [locObj?.ort, locObj?.region, locObj?.land].filter(Boolean).join(', ');

      const hashId = j?.hashId ?? j?.hashID ?? j?.refnr;

      // 🔗 1) try to use the company / external URL from BA
      const externalUrlRaw = j?.externeUrl ?? j?.externeURL ?? j?.externeurl ?? undefined;

      const externalUrl =
        typeof externalUrlRaw === 'string' && externalUrlRaw.trim().length > 0
          ? externalUrlRaw.trim()
          : undefined;

      // 🔗 2) fallback: BA job detail page
      const baDetailUrl = hashId
        ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(hashId)}`
        : undefined;

      // 🔗 3) final URL sent to the frontend
      const detailUrl = externalUrl ?? baDetailUrl;

      const offerType = deriveOfferTypeLabel(j);

      const logoUrl = j?.arbeitgeberLogo ?? j?.logoUrl ?? undefined;

      // Entfernung kommt aus arbeitsort.entfernung (ggf. als String)
      const distanceRaw =
        typeof locObj?.entfernung === 'number'
          ? locObj.entfernung
          : typeof locObj?.entfernung === 'string'
          ? Number(locObj.entfernung)
          : typeof j?.entfernung === 'number'
          ? j.entfernung
          : typeof j?.entfernung === 'string'
          ? Number(j.entfernung)
          : NaN;

      const distanceKm = Number.isFinite(distanceRaw) ? distanceRaw : undefined;

      // Beginn-Datum (eintrittsdatum)
      const startDate =
        typeof j?.eintrittsdatum === 'string'
          ? j.eintrittsdatum
          : typeof j?.aktuelleVeroeffentlichung?.eintrittsdatum === 'string'
          ? j.aktuelleVeroeffentlichung.eintrittsdatum
          : null;

      return {
        title,
        employer,
        location,
        hashId,
        detailUrl, // company URL first, BA fallback
        offerType,
        logoUrl,
        distanceKm,
        startDate,
      };
    });

    return NextResponse.json({
      results,
      total, // now reliable
      page: uiPage, // keep UI 1-based
      size: Number(size),
      baPage: data?.page ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 });
  }
}
