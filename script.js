(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.querySelector('.intro');
  const firstHero = document.querySelector('.hero-image');
  let heroStarted = false;
  function startHeroSlideshow() {
    if (!firstHero || heroStarted) return;
    heroStarted = true;
    const photos = [
      { src: firstHero.getAttribute('src'), alt: firstHero.alt },
      { src: 'assets/hero-image.png', alt: 'Contemporary residence framed by tropical planting' },
      { src: 'assets/image1.jpg', alt: 'Tropical Home architecture' }
    ];
    const slides = photos.map((photo, index) => {
      const image = index === 0 ? firstHero : new Image();
      image.className = 'hero-image hero-slide';
      image.alt = photo.alt;
      image.src = photo.src;
      if (index !== 0) {
        image.setAttribute('aria-hidden', 'true');
        firstHero.after(image);
      }
      return image;
    });
    let current = 0;
    slides[0].classList.add('is-active');
    // Keep a still hero for visitors who request reduced motion.
    if (reduced) return;
    setInterval(() => {
      if (document.hidden) return;
      let next = (current + 1) % slides.length;
      while (next !== current && (!slides[next].complete || !slides[next].naturalWidth)) {
        next = (next + 1) % slides.length;
      }
      if (next === current) return;
      const outgoing = slides[current];
      outgoing.classList.replace('is-active', 'is-leaving');
      outgoing.setAttribute('aria-hidden', 'true');
      slides[next].removeAttribute('aria-hidden');
      slides[next].classList.add('is-active');
      setTimeout(() => outgoing.classList.remove('is-leaving'), 650);
      current = next;
    }, 3000);
  }
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
        startHeroSlideshow();
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
  if (!intro || !document.body.classList.contains('home-page')) startHeroSlideshow();
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
  const whatsapp = document.querySelector('.whatsapp-float');
  if (whatsapp) {
    const popup = document.createElement('aside');
    popup.className = 'whatsapp-popup';
    popup.hidden = true;
    popup.setAttribute('aria-label', 'Chat with R.O.B Studio');
    const close = document.createElement('button');
    close.className = 'whatsapp-popup-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss WhatsApp message');
    close.textContent = '\u00d7';
    const name = document.createElement('strong');
    name.textContent = 'R.O.B Studio';
    const message = document.createElement('p');
    message.textContent = 'Have a project in mind?';
    message.setAttribute('role', 'status');
    const link = document.createElement('a');
    link.href = whatsapp.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Chat on WhatsApp \u2197';
    popup.append(close, name, message, link);
    whatsapp.before(popup);
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('whatsapp-message-dismissed') === 'true'; } catch {}
    close.addEventListener('click', () => {
      popup.hidden = true;
      try { sessionStorage.setItem('whatsapp-message-dismissed', 'true'); } catch {}
      if (document.activeElement === close) whatsapp.focus();
    });
    if (!dismissed) setTimeout(() => { popup.hidden = false; }, 5000);
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
