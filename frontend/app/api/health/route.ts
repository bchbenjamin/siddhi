import { NextResponse } from 'next/server';
import { database } from '../../../lib/server/auth';

export async function GET() {
  try {
    await database().query('SELECT 1');
    return NextResponse.json({ status: 'healthy', app: 'Siddhi', database: 'connected' });
  } catch (error) {
    console.error('[health]', error);
    return NextResponse.json({ status: 'unhealthy', app: 'Siddhi', database: 'disconnected' }, { status: 503 });
  }
}
