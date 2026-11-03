/* Progressive motion layer: page content also works without GSAP. */
export function initMotion(gsap, ScrollTrigger) {
  let media;
  let disposed = false;
  const controller = new AbortController();
  let started = false;
  window.studioMotion = {
    available: Boolean(gsap && ScrollTrigger),
    revealIntro(intro, complete) {
      if (!gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      intro.classList.add('gsap-intro');
      gsap.timeline({ onComplete: complete })
        .to(intro.querySelector('img'), { scale: 7, autoAlpha: 0, duration: .9, ease: 'power3.in' }, 0)
        .to(intro, { autoAlpha: 0, duration: .65, ease: 'power2.inOut' }, .25);
      return true;
    },
    start() {
      if (started || !gsap || !ScrollTrigger) return;
      started = true;
      gsap.registerPlugin(ScrollTrigger);
      media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        document.documentElement.classList.remove('motion-ready');
        document.body.classList.add('gsap-motion');
        const hero = document.querySelector('.hero');
        const entrance = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
        if (hero) {
          entrance
            .from('.hero-content > .eyebrow', { autoAlpha: 0, y: 16 }, .15)
            .from('.hero h1', { autoAlpha: 0, y: 45, duration: 1.25 }, .25)
            .from('.hero-bottom > *', { autoAlpha: 0, y: 22, stagger: .12 }, .65);
        }
        const selectedCards = gsap.utils.toArray('.selected .project-card');
        if (selectedCards.length) {
          gsap.set(selectedCards, { autoAlpha: 0, y: 40 });
          ScrollTrigger.batch(selectedCards, {
            start: 'top 90%',
            once: true,
            interval: .12,
            onEnter: cards => gsap.to(cards, {
              autoAlpha: 1, y: 0, duration: .9, stagger: .14,
              ease: 'power3.out', clearProps: 'opacity,visibility,transform'
            })
          });
        }
        document.querySelectorAll('.reveal').forEach(el => {
          if (el.matches('.selected .project-card')) return;
          gsap.from(el, {
            autoAlpha: 0, y: el.classList.contains('project-card') ? 36 : 26,
            duration: 1, ease: 'power3.out', clearProps: 'opacity,visibility,transform',
            scrollTrigger: { trigger: el, start: 'top 94%', once: true }
          });
        });
        const letters = document.querySelectorAll('.footer-wordmark > span');
        if (letters.length) {
          gsap.from(letters, {
            yPercent: 105, autoAlpha: 0, stagger: .1, duration: 1.25,
            ease: 'power4.out', clearProps: 'opacity,visibility,transform',
            scrollTrigger: { trigger: '.footer-wordmark', start: 'top 92%', once: true }
          });
        }
        return () => document.body.classList.remove('gsap-motion');
      });
      // Keep parallax subtle and reserve it for larger screens.
      document.fonts?.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true, signal: controller.signal });
      window.addEventListener('pageshow', () => ScrollTrigger.refresh(), { signal: controller.signal });
      ScrollTrigger.refresh();
    },
    refresh() { if (started) ScrollTrigger.refresh(); }
  };
  return () => { disposed = true; controller.abort(); media?.revert(); ScrollTrigger.getAll().forEach(trigger => trigger.kill()); delete window.studioMotion; };
}