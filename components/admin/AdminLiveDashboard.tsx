'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';
import AdminDashboard from './AdminDashboard';
import type { AdminData, AdminSection } from '../../lib/admin/types';
import type { LiveInquiry } from '../../lib/neon/realtime';

type Props = { data: AdminData; view: AdminSection };

export default function AdminLiveDashboard({ data, view }: Props) {
  if (!data.realtime) return <AdminDashboard key={view} data={data} view={view} />;
  return (
    <ConnectedDashboard key={data.realtime.sealedQuery.queryFingerprint} data={data} view={view} />
  );
}
function ConnectedDashboard({ data, view }: Props) {
  const [client] = useState(() => createRealtimeClient({ url: data.realtime!.url }));
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(closeTimer.current);
    return () => {
      // Strict Mode replays effects with the same client. Defer permanent disposal
      // so the next setup can cancel it; a real unmount still closes the client.
      closeTimer.current = window.setTimeout(() => client.close(), 0);
    };
  }, [client]);

  return (
    <RealtimeProvider client={client}>
      <LiveDashboard data={data} view={view} />
    </RealtimeProvider>
  );
}
function LiveDashboard({ data, view }: Props) {
  const [sealedQuery] = useState(() => data.realtime!.sealedQuery);
  const userId = data.realtime!.userId;
  const refreshQuery = useCallback(async () => {
    const response = await fetch('/api/admin/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (response.status === 401) {
      window.location.assign(new URL('/admin/login', window.location.origin).href);
      throw new Error('Session ended.');
    }
    if (!response.ok) throw new Error('Live updates could not reconnect.');
    return (await response.json()) as SealedLiveQuery<LiveInquiry>;
  }, [userId]);
  const initialData = data.inquiries.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    service: item.service,
    message: item.message,
    status: item.status,
    created_at: item.createdAt,
  }));
  const live = useLiveQuery(sealedQuery, { refreshQuery, initialData });
  return (
    <AdminDashboard
      key={view}
      view={view}
      data={{
        ...data,
        liveState:
          live.status === 'error' ? 'error' : live.status === 'live' ? 'live' : 'connecting',
        inquiries: (live.data ?? initialData).map((item) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          service: item.service,
          message: item.message,
          status: item.status === 'archived' || item.status === 'contacted' ? item.status : 'new',
          createdAt: item.created_at,
        })),
      }}
    />
  );
}
