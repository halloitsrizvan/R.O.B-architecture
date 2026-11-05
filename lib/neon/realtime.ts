import 'server-only';
import { createRealtime, rawSql } from '@neon/realtime/server';

export interface LiveInquiry {
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  status: string;
  created_at: string;
}
export const inboxSQL = `select i.id,i.name,i.email,i.service,i.message,i.status,i.created_at::text as created_at
  from public.contact_inquiries i inner join public.studio_admins a on a.user_id=$1
  order by i.created_at desc limit 100`;

export async function sealInbox(userId: string) {
  const realtime = createRealtime({
    secret: process.env.NEON_REALTIME_SECRET!,
    db: new URL(process.env.DATABASE_URL!).pathname.slice(1),
  });
  return realtime.seal({ query: rawSql<LiveInquiry>(inboxSQL, [userId]) });
}
