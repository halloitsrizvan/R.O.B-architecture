(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.querySelector('.intro');
  if (intro && document.body.classList.contains('home-page')) {
    intro.classList.add('is-active');
    document.body.classList.add('locked');
    const content = [...document.body.children].filter(el => el !== intro && el.tagName !== 'SCRIPT');
    content.forEach(el => { el.inert = true; });
    setTimeout(() => {
      document.documentElement.classList.remove('intro-pending');
      window.studioMotion?.start();
      const complete = () => {
        intro.classList.add('is-done');
        document.body.classList.remove('locked');
        content.forEach(el => { el.inert = false; });
        window.studioMotion?.refresh();
      };
      if (!window.studioMotion?.revealIntro(intro, complete)) {
        intro.classList.add('is-revealing');
        setTimeout(complete, reduced ? 250 : 900);
      }
    }, 1500);
  }
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 48);
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('pageshow', updateHeader);
  updateHeader();
  function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  if (!window.studioMotion?.available && 'IntersectionObserver' in window && !reduced) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  const cards = [...document.querySelectorAll('.project-card')];
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    cards.forEach(card => { card.hidden = btn.dataset.filter !== 'all' && !card.dataset.category.split(' ').includes(btn.dataset.filter); });
    document.querySelector('#project-total').textContent = cards.filter(c => !c.hidden).length + ' projects';
    window.studioMotion?.refresh();
  }));
  document.querySelector('#contact-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const values = new FormData(e.target);
    const body = `Name: ${values.get('name')}\nEmail: ${values.get('email')}\nService: ${values.get('service')}\n\n${values.get('message')}`;
    window.open(`https://wa.me/918921533894?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    document.querySelector('#form-status').textContent = 'Your inquiry is ready in WhatsApp. Review and send it there to +91 89215 33894.';
  });
  if (!intro || !document.body.classList.contains('home-page')) window.studioMotion?.start();
})();
