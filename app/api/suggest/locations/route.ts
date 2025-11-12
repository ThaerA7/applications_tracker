import { NextRequest } from 'next/server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Photon (OpenStreetMap) location suggestions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return Response.json({ suggestions: [] });

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=de&limit=12`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return Response.json({ suggestions: [] }, { status: 200 });

    const data = await res.json();
    const features: any[] = data?.features ?? [];
    const germanOnly = features.filter((f: any) =>
      (f?.properties?.countrycode ?? f?.properties?.country_code ?? '').toLowerCase() === 'de'
      || ['Deutschland', 'Germany'].includes(f?.properties?.country)
    );

    const labels = germanOnly.map((f: any) => {
      const p = f?.properties ?? {};
      const name = p.name || p.city || p.town || p.village || p.state || p.county;
      const region = p.state || p.county || p.district;
      return [name, region].filter(Boolean).join(', ');
    }).filter(Boolean);

    const suggestions = Array.from(new Set(labels)).slice(0, 8);
    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] }, { status: 200 });
  }
}
