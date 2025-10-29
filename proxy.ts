// middleware.ts
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

