/**
 * Application route definitions and metadata
 */
export type RouteConfig = {
  path: string;
  title: string;
  icon: string;
};

export const ROUTES: Record<string, RouteConfig> = {
  home: { path: "/", title: "Overview", icon: "/icons/home.png" },
  jobSearch: {
    path: "/job-search",
    title: "Job Search",
    icon: "/icons/briefcase.png",
  },
  offers: {
    path: "/offers-received",
    title: "Offers",
    icon: "/icons/accepted.png",
  },
  applied: { path: "/applied", title: "Applied", icon: "/icons/checklist.png" },
  interviews: {
    path: "/interviews",
    title: "Interviews",
    icon: "/icons/interview.png",
  },
  rejected: { path: "/rejected", title: "Rejected", icon: "/icons/cancel.png" },
  withdrawn: {
    path: "/withdrawn",
    title: "Withdrawn",
    icon: "/icons/withdrawn.png",
  },
  wishlist: { path: "/wishlist", title: "Wishlist", icon: "/icons/star.png" },
  notes: { path: "/notes", title: "Notes", icon: "/icons/note.png" },
  documents: {
    path: "/documents",
    title: "Documents",
    icon: "/icons/documents.png",
  },
  calendar: {
    path: "/calendar",
    title: "Calendar",
    icon: "/icons/calendar.png",
  },
  settings: {
    path: "/settings",
    title: "Settings",
    icon: "/icons/settings.png",
  },
} as const;

/**
 * Navigation items for sidebar in display order
 */
export const NAV_ITEMS = [
  ROUTES.home,
  ROUTES.jobSearch,
  ROUTES.offers,
  ROUTES.applied,
  ROUTES.interviews,
  ROUTES.rejected,
  ROUTES.withdrawn,
  ROUTES.wishlist,
  ROUTES.notes,
  ROUTES.calendar,
  ROUTES.settings,
] as const;

/**
 * Route accent colors for theming
 */
export type RouteAccent = {
  washFrom: string;
  barFrom: string;
  barTo: string;
  focus: string;
};

export const ROUTE_ACCENTS: Record<string, RouteAccent> = {
  "/": {
    washFrom: "from-sky-50",
    barFrom: "after:from-sky-500",
    barTo: "after:to-sky-400",
    focus: "focus-visible:ring-sky-300",
  },
  "/applied": {
    washFrom: "from-sky-50",
    barFrom: "after:from-sky-500",
    barTo: "after:to-fuchsia-500",
    focus: "focus-visible:ring-sky-300",
  },
  "/interviews": {
    washFrom: "from-emerald-50",
    barFrom: "after:from-emerald-500",
    barTo: "after:to-teal-500",
    focus: "focus-visible:ring-emerald-300",
  },
  "/job-search": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-orange-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/offers-received": {
    washFrom: "from-lime-50",
    barFrom: "after:from-lime-500",
    barTo: "after:to-emerald-500",
    focus: "focus-visible:ring-lime-300",
  },
  "/rejected": {
    washFrom: "from-rose-50",
    barFrom: "after:from-rose-500",
    barTo: "after:to-pink-500",
    focus: "focus-visible:ring-rose-300",
  },
  "/withdrawn": {
    washFrom: "from-amber-50",
    barFrom: "after:from-amber-500",
    barTo: "after:to-rose-500",
    focus: "focus-visible:ring-amber-300",
  },
  "/wishlist": {
    washFrom: "from-yellow-50",
    barFrom: "after:from-yellow-500",
    barTo: "after:to-amber-400",
    focus: "focus-visible:ring-yellow-300",
  },
  "/calendar": {
    washFrom: "from-indigo-50",
    barFrom: "after:from-indigo-500",
    barTo: "after:to-sky-500",
    focus: "focus-visible:ring-indigo-300",
  },
  "/notes": {
    washFrom: "from-fuchsia-50",
    barFrom: "after:from-fuchsia-500",
    barTo: "after:to-violet-500",
    focus: "focus-visible:ring-fuchsia-300",
  },
  "/settings": {
    washFrom: "from-indigo-50",
    barFrom: "after:from-indigo-500",
    barTo: "after:to-sky-500",
    focus: "focus-visible:ring-indigo-300",
  },
} as const;
