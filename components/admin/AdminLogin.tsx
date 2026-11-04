'use client';

import { useActionState } from 'react';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { signIn } from '../../app/admin/actions';

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: '' });
  return (
    <main className="admin-login">
      <a href="/" className="admin-login-brand">
        <img src="/logo.png" alt="R.O.B Architectural Studio" />
      </a>
      <div className="admin-login-art">
        <span>
          Considered spaces.
          <br />
          <em>Thoughtfully managed.</em>
        </span>
        <div className="admin-plan-mark" aria-hidden="true" />
      </div>
      <section className="admin-login-card">
        <span className="admin-overline">
          <LockKeyhole size={14} /> Studio access
        </span>
        <h1>Welcome back.</h1>
        <p>A quiet place to manage your studio’s work.</p>
        {!configured && (
          <div className="admin-notice">
            Sign-in will be available after Supabase and an administrator are connected.{' '}
            <a href="/admin">
              Explore the read-only preview <ArrowUpRight size={13} />
            </a>
          </div>
        )}
        <form action={action}>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="you@robarchstudio.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
              placeholder="Your password"
            />
          </label>
          {state.error && (
            <p role="alert" className="admin-error">
              {state.error}
            </p>
          )}
          <button className="admin-button primary" disabled={!configured || pending}>
            {pending ? 'Signing in…' : 'Sign in to the studio'} <ArrowUpRight size={16} />
          </button>
        </form>
        <small>Access is limited to approved studio administrators.</small>
      </section>
    </main>
  );
}
