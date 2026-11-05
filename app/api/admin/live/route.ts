import { getAdminIdentity } from '../../../../lib/admin/auth';
import { sealInbox } from '../../../../lib/neon/realtime';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const user = await getAdminIdentity();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('userId' in payload) ||
    payload.userId !== user.id
  )
    return Response.json({ error: 'Session changed.' }, { status: 401 });
  return Response.json(await sealInbox(user.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
