// ./app/api/chat/route.ts
import { NextResponse } from 'next/server';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    throw 'Not implemented';
  } catch (error) {
    return NextResponse.json(
      { name: '403 forbidden', status: 403, message: 'Test' },
      { status: 403 },
    );
  }
}
