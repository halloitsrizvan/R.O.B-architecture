import { Pool } from 'pg';
import { timingSafeEqual } from 'node:crypto';
import { attachDatabasePool } from '@neon/functions';
import { validateInquiry } from './lib/inquiry-validation';

const secret = process.env.STUDIO_FUNCTION_SECRET;
if (!secret) throw new Error('STUDIO_FUNCTION_SECRET is required.');
const expected = Buffer.from(secret);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('sslmode=require', 'sslmode=verify-full'),
  max: 5,
});
attachDatabasePool(pool);
const handler = {
  async fetch(request: Request): Promise<Response> {
    const provided = Buffer.from(request.headers.get('x-secret') ?? '');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
      return new Response('Unauthorized', { status: 401 });
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      await pool.query('select 1');
      return Response.json({ ok: true, database: true, service: 'studio-inquiries' });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let payload: unknown;
    try {
      const text = await request.text();
      if (Buffer.byteLength(text) > 24000)
        return new Response('Request too large', { status: 413 });
      payload = JSON.parse(text);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    const input = validateInquiry(payload);
    const hash =
      payload && typeof payload === 'object' && 'requestHash' in payload
        ? payload.requestHash
        : null;
    if (!input || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
      return Response.json({ error: 'Invalid inquiry.' }, { status: 400 });
    try {
      await pool.query('select public.submit_contact_inquiry($1,$2,$3,$4,$5)', [
        input.name,
        input.email,
        input.service,
        input.message,
        hash,
      ]);
      return Response.json({ ok: true }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes('RATE_LIMITED'))
        return Response.json(
          { error: 'Please wait before submitting another inquiry.' },
          { status: 429 },
        );
      console.error('Inquiry storage failed.');
      return Response.json({ error: 'Could not save the inquiry.' }, { status: 502 });
    }
  },
};

export default handler;
