import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';

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
  const functionURL = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  const secret = process.env.STUDIO_FUNCTION_SECRET;
  const hashSecret = process.env.INQUIRY_HASH_SECRET;
  if (!functionURL || !secret || !hashSecret)
    return NextResponse.json(
      { error: 'The website inbox is unavailable. Please use WhatsApp.' },
      { status: 503 },
    );
  const source = process.env.VERCEL
    ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown')
    : 'local';
  const requestHash = createHmac('sha256', hashSecret).update(source).digest('hex');
  try {
    const response = await fetch(new URL('inquiries', functionURL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret': secret },
      body: JSON.stringify({ name, email, service, message, requestHash }),
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) return NextResponse.json({ ok: true }, { status: 201 });
    return NextResponse.json(
      {
        error:
          response.status === 429
            ? 'Please wait before submitting another inquiry.'
            : 'Could not save your inquiry. Please use WhatsApp.',
      },
      { status: response.status === 429 ? 429 : 502 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Could not save your inquiry. Please use WhatsApp.' },
      { status: 502 },
    );
  }
}
