// app/offers/page.tsx
import { Search, Plus, Filter } from 'lucide-react';

export default function OffersPage() {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Offers</h1>
      <p className="mt-2 text-neutral-600">Accepted/declined offers and details.</p>

      {/* Toolbar */}
      <div className="mt-6 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search offers..."
            aria-label="Search offers"
            className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/5"
          />
        </div>

        {/* Add button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-black bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 active:bg-black"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>

        {/* Filter button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
        </button>
      </div>
    </section>
  );
}
