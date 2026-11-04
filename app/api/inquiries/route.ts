import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createInquiryClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'JSON required.' }, { status: 415 });
  }
  // Stream with a hard bound so chunked bodies cannot bypass the request-size limit.
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: 'Request body required.' }, { status: 400 });
  let raw = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 24000) {
      await reader.cancel();
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object')
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const fields = payload as Record<string, unknown>;
  if (fields.website) return NextResponse.json({ ok: true }); // Honeypot; no record is stored.
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  const email = typeof fields.email === 'string' ? fields.email.trim().toLowerCase() : '';
  const service = typeof fields.service === 'string' ? fields.service : '';
  const message = typeof fields.message === 'string' ? fields.message.trim() : '';
  if (
    name.length < 2 ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 10 ||
    message.length > 5000 ||
    !['Architecture', 'Interior design', 'Landscape design'].includes(service)
  ) {
    return NextResponse.json(
      { error: 'Please check your contact details and message.' },
      { status: 400 },
    );
  }
  const client = createInquiryClient();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!client || !secret)
    return NextResponse.json(
      {
        error: 'The website inbox is not connected yet. Please send your message through WhatsApp.',
      },
      { status: 503 },
    );
  // Trust Vercel's overwritten proxy header in production, never a client-supplied forwarded header.
  const source = process.env.VERCEL
    ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown')
    : 'local';
  const requestHash = createHmac('sha256', secret).update(source).digest('hex');
  const { error } = await client.rpc('submit_contact_inquiry', {
    p_name: name,
    p_email: email,
    p_service: service,
    p_message: message,
    p_request_hash: requestHash,
  });
  if (error) {
    if (error.message.includes('RATE_LIMITED'))
      return NextResponse.json(
        { error: 'Please wait before submitting another inquiry.' },
        { status: 429 },
      );
    console.error('Inquiry storage failed:', error.code);
    return NextResponse.json(
      { error: 'Could not save your inquiry. Please use WhatsApp.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
