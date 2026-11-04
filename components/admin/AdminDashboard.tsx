'use client';
import ProjectEditor from './ProjectEditor';
import AdminProjectTable from './AdminProjectTable';
import { disciplines } from '../../lib/admin/constants';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  FolderOpen,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import type { ActionResult, AdminData, AdminProject, AdminInquiry } from '../../lib/admin/types';
import { signOut, updateInquiry } from '../../app/admin/actions';

type View = 'overview' | 'projects' | 'inbox' | 'settings';
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'inbox', label: 'Inquiries', icon: Inbox },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export default function AdminDashboard({ data }: { data: AdminData }) {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editor, setEditor] = useState<AdminProject | null>(null);
  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null);
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const published = data.projects.filter((project) => project.published).length;
  const newInquiries = data.inquiries.filter((item) => item.status === 'new').length;
  const photoCount = data.projects.reduce((total, project) => total + project.images.length, 0);
  const visibleProjects = data.projects.filter(
    (project) =>
      `${project.title} ${project.categories.join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'all' || (filter === 'published' ? project.published : !project.published)),
  );
  const visibleInquiries = data.inquiries.filter((item) =>
    `${item.name} ${item.email} ${item.service}`.toLowerCase().includes(search.toLowerCase()),
  );
  const spotlight = data.projects.find((project) => project.featured && project.images.length);
  const modalOpen = Boolean(editor || inquiry);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled)',
        ) ?? [],
      );
    focusable()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEditor(null);
        setInquiry(null);
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [modalOpen]);

  function navigate(next: View) {
    setView(next);
    setSearch('');
    setMenu(false);
    setNotice('');
  }
  function edit(project: AdminProject) {
    setEditor(project);
    setNotice('');
  }
  function addProject() {
    edit({
      slug: '',
      title: '',
      description: '',
      categories: ['architecture'],
      published: false,
      featured: false,
      sortOrder: Math.max(-1, ...data.projects.map((project) => project.sortOrder)) + 1,
      images: [],
    });
  }
  function run(task: () => Promise<ActionResult>, complete?: () => void) {
    if (data.preview) {
      setNotice('Connect Supabase to make changes. This is a read-only preview.');
      return;
    }
    startTransition(async () => {
      try {
        const result = await task();
        setNotice(result.ok ? result.message : result.error);
        if (result.ok) {
          complete?.();
          router.refresh();
        }
      } catch {
        setNotice('The action could not be completed. Check your connection or sign in again.');
      }
    });
  }

  return (
    <>
      {menu && (
        <button
          className="admin-menu-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`admin-sidebar ${menu ? 'open' : ''}`}>
        <a href="/admin" className="admin-brand">
          <img src="/logo.png" alt="R.O.B" />
          <span>
            STUDIO
            <br />
            MANAGEMENT
          </span>
        </a>
        <span className="admin-nav-label">Workspace</span>
        <nav aria-label="Admin navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} strokeWidth={1.5} />
              {item.label}
              {item.id === 'inbox' && newInquiries > 0 && (
                <span className="admin-nav-count">{newInquiries}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} />
            View website
            <ArrowUpRight size={14} />
          </a>
          <div className="admin-profile">
            <span className="admin-avatar">R</span>
            <span>
              <strong>R.O.B Studio</strong>
              <small>{data.preview ? 'Preview workspace' : data.email}</small>
            </span>
            {!data.preview && (
              <form action={signOut}>
                <button className="admin-icon-button" aria-label="Sign out">
                  <LogOut size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <button
              className="admin-mobile-menu admin-icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Studio workspace</span>
            <span className="admin-breadcrumb">/</span>
            <strong>{navigation.find((item) => item.id === view)?.label}</strong>
          </div>
          <a href="https://www.robarchstudio.com" target="_blank" rel="noopener noreferrer">
            robarchstudio.com <ArrowUpRight size={13} />
          </a>
          <span className={`admin-connection ${data.preview ? 'preview' : ''}`}>
            <i />
            {data.preview ? 'Preview mode' : 'Connected'}
          </span>
        </header>
        <main className="admin-main" id="admin-main">
          {data.preview && (
            <div className="admin-preview-banner">
              <span>
                <Circle size={14} />
                Read-only preview{' '}
                <span className="admin-banner-detail">
                  · Connect Supabase to publish changes and receive inquiries.
                </span>
              </span>
              <button onClick={() => navigate('settings')}>
                Complete setup <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {data.error && (
            <div role="alert" className="admin-error">
              {data.error}
            </div>
          )}
          {notice && (
            <div className="admin-toast" role="status">
              {notice}
              <button
                className="admin-icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {view === 'overview' && (
            <>
              <div className="admin-page-heading">
                <div>
                  <span className="admin-overline">The studio, at a glance</span>
                  <h1>
                    Room for <em>what’s next.</em>
                  </h1>
                  <p>Keep your projects considered and your conversations moving.</p>
                </div>
                <button className="admin-button primary" onClick={addProject}>
                  <Plus size={16} />
                  Add project
                </button>
              </div>
              <div className="admin-stats">
                {[
                  {
                    label: 'Total projects',
                    value: data.projects.length,
                    detail: 'In your portfolio',
                    icon: FolderOpen,
                  },
                  {
                    label: 'Published',
                    value: published,
                    detail: `${data.projects.length - published} projects in draft`,
                    icon: CheckCircle2,
                  },
                  {
                    label: 'Project images',
                    value: photoCount,
                    detail: 'Across your collection',
                    icon: Images,
                  },
                  {
                    label: 'New inquiries',
                    value: data.preview ? '—' : newInquiries,
                    detail: data.preview ? 'Connect your inbox' : 'Waiting for a conversation',
                    icon: Inbox,
                  },
                ].map((stat) => (
                  <article key={stat.label}>
                    <div>
                      <span>{stat.label}</span>
                      <stat.icon size={18} strokeWidth={1.5} />
                    </div>
                    <strong>{stat.value}</strong>
                    <small>{stat.detail}</small>
                  </article>
                ))}
              </div>
              <div className="admin-overview-grid">
                <section className="admin-spotlight">
                  {spotlight?.images[0] && (
                    <img src={spotlight.images[0].src} alt={spotlight.images[0].alt} />
                  )}
                  <div className="admin-spotlight-overlay" />
                  <span className="admin-spotlight-tag">
                    <Sparkles size={13} />
                    Your selected work
                  </span>
                  <div className="admin-spotlight-copy">
                    <span>Thoughtful work deserves to be seen.</span>
                    <h2>
                      Your portfolio.
                      <br />
                      <em>Your perspective.</em>
                    </h2>
                    <button onClick={() => navigate('projects')}>
                      Curate your projects <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <span className="admin-spotlight-index">01 / STUDIO COLLECTION</span>
                </section>
                <section className="admin-panel admin-collection">
                  <div className="admin-panel-heading">
                    <h2>A balanced collection</h2>
                    <SlidersHorizontal size={16} />
                  </div>
                  <p>The disciplines that shape your studio.</p>
                  <div className="admin-discipline-bars">
                    {disciplines.map((discipline, index) => {
                      const count = data.projects.filter((project) =>
                        project.categories.includes(discipline.id),
                      ).length;
                      return (
                        <div key={discipline.id}>
                          <div>
                            <span>
                              <i className={`discipline-${index}`} />
                              {discipline.label}
                            </span>
                            <strong>{String(count).padStart(2, '0')}</strong>
                          </div>
                          <div className="admin-bar">
                            <span
                              className={`discipline-${index}`}
                              style={{
                                width: `${data.projects.length ? (count / data.projects.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="admin-collection-note">
                    <span className="admin-line-mark" aria-hidden="true" />
                    <p>
                      Make room for your next
                      <br />
                      <em>great idea.</em>
                    </p>
                    <button
                      className="admin-icon-button"
                      aria-label="Add a project"
                      onClick={addProject}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </section>
              </div>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Your project collection</h2>
                    <p>A few of the spaces you’ve brought to life.</p>
                  </div>
                  <button className="admin-text-button" onClick={() => navigate('projects')}>
                    All projects <ArrowUpRight size={14} />
                  </button>
                </div>
                <AdminProjectTable items={data.projects.slice(0, 4)} onEdit={edit} />
              </section>
            </>
          )}

          {view === 'projects' && (
            <>
              <div className="admin-page-heading">
                <div>
                  <span className="admin-overline">The portfolio</span>
                  <h1>
                    Your <em>selected work.</em>
                  </h1>
                  <p>Manage the spaces, stories, and images that represent your studio.</p>
                </div>
                <button className="admin-button primary" onClick={addProject}>
                  <Plus size={16} />
                  Add project
                </button>
              </div>
              <section className="admin-panel">
                <div className="admin-toolbar">
                  <label className="admin-search">
                    <Search size={17} />
                    <input
                      aria-label="Search projects"
                      placeholder="Search your projects…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <div className="admin-filter-tabs">
                    {['all', 'published', 'draft'].map((status) => (
                      <button
                        key={status}
                        aria-pressed={filter === status}
                        onClick={() => setFilter(status)}
                      >
                        {status === 'all' ? 'All projects' : status}
                      </button>
                    ))}
                  </div>
                </div>
                <AdminProjectTable items={visibleProjects} onEdit={edit} />
                <div className="admin-table-footer">
                  {visibleProjects.length} of {data.projects.length} projects
                  <span>Ordered as shown on your website</span>
                </div>
              </section>
            </>
          )}

          {view === 'inbox' && (
            <>
              <div className="admin-page-heading">
                <div>
                  <span className="admin-overline">Conversations</span>
                  <h1>
                    Good things start
                    <br />
                    <em>with a hello.</em>
                  </h1>
                  <p>Review project inquiries and keep the conversation moving.</p>
                </div>
                <span className="admin-small-caption">Latest 100 inquiries</span>
              </div>
              <section className="admin-panel">
                <div className="admin-toolbar">
                  <label className="admin-search">
                    <Search size={17} />
                    <input
                      aria-label="Search inquiries"
                      placeholder="Search name, email, or service…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <span className="admin-small-caption">
                    {data.preview ? 'Not connected' : `${newInquiries} new`}
                  </span>
                </div>
                {!visibleInquiries.length ? (
                  <div className="admin-empty roomy">
                    <span className="admin-empty-icon">
                      <Inbox size={26} strokeWidth={1.2} />
                    </span>
                    <h2>
                      {data.preview
                        ? 'Your next conversation belongs here.'
                        : 'A little room for new conversations.'}
                    </h2>
                    <p>
                      {data.preview
                        ? 'Connect Supabase to securely receive and manage website inquiries.'
                        : 'New project inquiries will appear here when someone reaches out.'}
                    </p>
                    {data.preview && (
                      <button
                        className="admin-button secondary"
                        onClick={() => navigate('settings')}
                      >
                        View setup <ArrowUpRight size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="admin-inquiry-list">
                    {visibleInquiries.map((item) => (
                      <button key={item.id} onClick={() => setInquiry(item)}>
                        <span className="admin-avatar">{item.name.slice(0, 1)}</span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.service} · {item.email}
                          </small>
                        </span>
                        <span
                          className={`admin-badge ${item.status === 'new' ? 'published' : 'draft'}`}
                        >
                          {item.status}
                        </span>
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </time>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {view === 'settings' && (
            <>
              <div className="admin-page-heading">
                <div>
                  <span className="admin-overline">Workspace settings</span>
                  <h1>
                    A considered <em>foundation.</em>
                  </h1>
                  <p>Your studio’s connection, access, and publishing settings.</p>
                </div>
              </div>
              <div className="admin-settings-grid">
                <section className="admin-panel admin-settings-card">
                  <span className="admin-settings-icon">
                    <Settings size={22} />
                  </span>
                  <h2>Website details</h2>
                  <dl>
                    <div>
                      <dt>Studio</dt>
                      <dd>R.O.B Architectural Studio</dd>
                    </div>
                    <div>
                      <dt>Domain</dt>
                      <dd>www.robarchstudio.com</dd>
                    </div>
                    <div>
                      <dt>Content refresh</dt>
                      <dd>Immediate after publishing</dd>
                    </div>
                    <div>
                      <dt>Administration</dt>
                      <dd>Approved studio accounts only</dd>
                    </div>
                  </dl>
                  <a
                    className="admin-text-button"
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open website <ArrowUpRight size={14} />
                  </a>
                </section>
                <section className="admin-panel admin-settings-card">
                  <span className="admin-settings-icon">
                    <CheckCircle2 size={22} />
                  </span>
                  <h2>{data.preview ? 'Connect your studio' : 'Your studio is connected'}</h2>
                  <p>
                    {data.preview
                      ? 'Complete these steps to enable publishing, image uploads, and your private inbox.'
                      : 'Content changes are protected by verified Supabase sign-in and a server-side administrator allowlist.'}
                  </p>
                  <ol className="admin-setup-list">
                    {[
                      'Connect the Supabase project and run the portfolio migration.',
                      'Set the Supabase URL, publishable key, and server-only secret.',
                      'Create a confirmed Supabase user and add its email to ADMIN_EMAILS.',
                    ].map((item, index) => (
                      <li key={item}>
                        <span>{data.preview ? index + 1 : <Check size={13} />}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                  <a
                    className="admin-button secondary"
                    href={data.preview ? '/admin/login' : 'https://supabase.com/dashboard'}
                    target={data.preview ? undefined : '_blank'}
                    rel={data.preview ? undefined : 'noopener noreferrer'}
                  >
                    {data.preview ? 'Studio sign-in' : 'Open Supabase'} <ArrowUpRight size={14} />
                  </a>
                </section>
              </div>
            </>
          )}
          <footer className="admin-footer">
            <span>R.O.B Architectural Studio</span>
            <span>A place for thoughtful work.</span>
          </footer>
        </main>
      </div>

      {editor && (
        <ProjectEditor
          editor={editor}
          preview={data.preview}
          pending={pending}
          notice={notice}
          onClose={() => setEditor(null)}
          run={run}
        />
      )}

      {inquiry && (
        <div className="admin-modal-backdrop" onClick={() => setInquiry(null)}>
          <section
            className="admin-editor admin-inquiry-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-editor-heading">
              <span className="admin-overline">A new conversation</span>
              <button
                className="admin-icon-button"
                aria-label="Close inquiry"
                onClick={() => setInquiry(null)}
              >
                <X size={20} />
              </button>
            </div>
            <h2 id="inquiry-title">{inquiry.name}</h2>
            <a href={`mailto:${inquiry.email}`}>
              {inquiry.email}
              <ArrowUpRight size={14} />
            </a>
            <span className="admin-badge published">{inquiry.service}</span>
            <p className="admin-inquiry-message">{inquiry.message}</p>
            <label>
              Status
              <select
                value={inquiry.status}
                disabled={pending}
                onChange={(event) => {
                  const status = event.target.value;
                  run(
                    () => updateInquiry(inquiry.id, status),
                    () => setInquiry(null),
                  );
                }}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <a
              className="admin-button primary"
              href={`mailto:${inquiry.email}?subject=${encodeURIComponent('Your project with R.O.B Studio')}`}
            >
              Reply by email
              <ArrowUpRight size={15} />
            </a>
          </section>
        </div>
      )}
    </>
  );
}
