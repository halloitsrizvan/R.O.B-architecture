import { getImageProps } from 'next/image';
import { heroImages } from './hero-images';

export function initInteractions() {
  const controller = new AbortController();
  const timers = new Set<number>();
  const intervals = new Set<number>();
  const observers: IntersectionObserver[] = [];
  const setTimeout = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(fn, ms);
    timers.add(id);
    return id;
  };
  const setInterval = (fn: () => void, ms: number): number => {
    const id = window.setInterval(fn, ms);
    intervals.add(id);
    return id;
  };
  function on<K extends keyof WindowEventMap>(
    target: EventTarget | null,
    event: K,
    listener: (event: WindowEventMap[K]) => void,
    options: AddEventListenerOptions = {},
  ): void {
    target?.addEventListener(event, listener as EventListener, {
      ...options,
      signal: controller.signal,
    });
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.querySelector<HTMLElement>('.intro');
  const firstHero = document.querySelector<HTMLImageElement>('.hero-image');
  let heroStarted = false;
  function startHeroSlideshow() {
    if (!firstHero || heroStarted) return;
    heroStarted = true;
    firstHero.classList.add('hero-slide', 'is-active');
    firstHero.removeAttribute('aria-hidden');
    // Reduced-motion visitors only download the initial hero image.
    if (reduced) return;
    const slides = heroImages.map((photo, index) => {
      if (index === 0) return firstHero;
      const image = new Image();
      image.className = 'hero-image hero-slide';
      image.alt = photo.alt;
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.width = photo.image.width;
      image.height = photo.image.height;
      image.setAttribute('aria-hidden', 'true');
      firstHero.after(image);
      return image;
    });
    let current = 0;
    let heroVisible = true;
    function prepareNextSlide() {
      if (!heroVisible || document.hidden || controller.signal.aborted) return;
      if (!firstHero?.complete || !firstHero.naturalWidth) return;
      const index = (current + 1) % slides.length;
      if (slides[index].hasAttribute('src')) return;
      const { props } = getImageProps({
        src: heroImages[index].image,
        alt: heroImages[index].alt,
        sizes: '100vw',
      });
      slides[index].sizes = props.sizes || '100vw';
      slides[index].srcset = props.srcSet || '';
      slides[index].src = props.src;
    }
    const hero = firstHero.closest('.hero');
    if (hero && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        if (heroVisible) prepareNextSlide();
      });
      observers.push(observer);
      observer.observe(hero);
    }
    if (firstHero.complete && firstHero.naturalWidth) prepareNextSlide();
    else on(firstHero, 'load', prepareNextSlide, { once: true });
    document.addEventListener('visibilitychange', prepareNextSlide, { signal: controller.signal });
    setInterval(() => {
      if (document.hidden || !heroVisible) return;
      const next = (current + 1) % slides.length;
      if (!slides[next].complete || !slides[next].naturalWidth) {
        prepareNextSlide();
        return;
      }
      const outgoing = slides[current];
      outgoing.classList.replace('is-active', 'is-leaving');
      outgoing.setAttribute('aria-hidden', 'true');
      slides[next].removeAttribute('aria-hidden');
      slides[next].classList.add('is-active');
      setTimeout(() => outgoing.classList.remove('is-leaving'), 650);
      current = next;
      prepareNextSlide();
    }, 3000);
  }
  if (intro && document.body.classList.contains('home-page')) {
    intro.classList.add('is-active');
    document.body.classList.add('locked');
    const content = Array.from(document.body.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .filter((el) => el !== intro && el.tagName !== 'SCRIPT');
    content.forEach((el) => {
      el.inert = true;
    });
    setTimeout(() => {
      document.documentElement.classList.remove('intro-pending');
      window.studioMotion?.start();
      const complete = () => {
        intro.classList.add('is-done');
        startHeroSlideshow();
        document.body.classList.remove('locked');
        content.forEach((el) => {
          el.inert = false;
        });
        window.studioMotion?.refresh();
      };
      if (!window.studioMotion?.revealIntro(intro, complete)) {
        intro.classList.add('is-revealing');
        setTimeout(complete, reduced ? 250 : 900);
      }
    }, 1500);
  }
  if (!intro || !document.body.classList.contains('home-page')) startHeroSlideshow();
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const nav = document.querySelector<HTMLElement>('#navigation');
  const header = document.querySelector('.site-header');
  const updateHeader = () => {
    if (!header) return;
    // Separate entry/exit thresholds prevent flicker when scrolling near the transition.
    const threshold = header.classList.contains('is-scrolled') ? 24 : 64;
    header.classList.toggle('is-scrolled', window.scrollY > threshold);
  };
  on(window, 'scroll', updateHeader, { passive: true });
  on(window, 'pageshow', updateHeader);
  updateHeader();
  function closeMenu() {
    if (!nav || !toggle) return;
    nav.classList.remove('open');
    header?.classList.remove('is-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  on(toggle, 'click', () => {
    if (!nav || !toggle) return;
    const open = nav.classList.toggle('open');
    header?.classList.toggle('is-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) {
      closeMenu();
      toggle?.focus();
    }
  });
  nav?.querySelectorAll('a').forEach((a) => on(a, 'click', closeMenu));
  on(window, 'resize', () => {
    if (matchMedia('(min-width: 961px)').matches) closeMenu();
  });
  on(document, 'click', (event) => {
    if (event.target instanceof Node && header && !header.contains(event.target)) closeMenu();
  });
  if (!window.studioMotion?.available && 'IntersectionObserver' in window && !reduced) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    observers.push(observer);
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }
  const whatsapp = document.querySelector<HTMLAnchorElement>('.whatsapp-float');
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
    try {
      dismissed = sessionStorage.getItem('whatsapp-message-dismissed') === 'true';
    } catch {}
    on(close, 'click', () => {
      popup.hidden = true;
      try {
        sessionStorage.setItem('whatsapp-message-dismissed', 'true');
      } catch {}
      if (document.activeElement === close) whatsapp.focus();
    });
    if (!dismissed)
      setTimeout(() => {
        popup.hidden = false;
      }, 5000);
  }
  const cards = [...document.querySelectorAll<HTMLElement>('.project-card')];
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((btn) =>
    on(btn, 'click', () => {
      document
        .querySelectorAll('[data-filter]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      cards.forEach((card) => {
        card.hidden =
          btn.dataset.filter !== 'all' &&
          !(card.dataset.category ?? '').split(' ').includes(btn.dataset.filter ?? '');
      });
      const total = document.querySelector('#project-total');
      if (total) total.textContent = cards.filter((c) => !c.hidden).length + ' projects';
      window.studioMotion?.refresh();
    }),
  );
  if (!intro || !document.body.classList.contains('home-page')) window.studioMotion?.start();
  return () => {
    controller.abort();
    timers.forEach((id) => window.clearTimeout(id));
    intervals.forEach((id) => window.clearInterval(id));
    observers.forEach((observer) => observer.disconnect());
    document.querySelector('.whatsapp-popup')?.remove();
    document.querySelectorAll('.hero-slide').forEach((image, index) => {
      if (index) image.remove();
      else image.className = 'hero-image';
    });
    document.querySelectorAll<HTMLElement>('[inert]').forEach((el) => {
      el.inert = false;
    });
    const intro = document.querySelector('.intro');
    intro?.classList.remove('is-done', 'is-active', 'is-revealing', 'gsap-intro');
  };
}
