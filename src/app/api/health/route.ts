import { NextResponse } from 'next/server';
import { getProviderStatus } from '@/lib/providers';

export async function GET() {
  const status = getProviderStatus();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
