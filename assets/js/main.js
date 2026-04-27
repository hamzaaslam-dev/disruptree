/* =========================================================
   Site-wide interactions: nav, reveal, counters, cursor, form
   ========================================================= */
(function () {
  /* ---------- Mobile nav ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.remove('open');
      })
    );
  }

  /* ---------- Nav shadow on scroll ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Intersection reveal ---------- */
  const toReveal = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');
  if ('IntersectionObserver' in window && toReveal.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    toReveal.forEach((el) => io.observe(el));
  } else {
    toReveal.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Counter animation ---------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-count'));
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = 1400;
          const start = performance.now();
          const from = 0;
          function step(now) {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const val = from + (target - from) * ease;
            el.textContent =
              (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- Custom cursor: disabled (native cursor feels instant) ---------- */

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 18;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(x / r.width) * strength}px, ${(y / r.height) * strength}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });

  /* ---------- Contact form (client-side) ---------- */
  const form = document.querySelector('form.contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      const name = form.querySelector('[name="name"]').value.trim();
      const email = form.querySelector('[name="email"]').value.trim();
      const message = form.querySelector('[name="message"]').value.trim();
      const valid =
        name.length > 1 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        message.length > 5;
      if (!valid) {
        status.className = 'form-status err';
        status.textContent = 'Please fill in your name, a valid email, and a short message.';
        return;
      }
      // Demo UX — replace with your endpoint (Formspree, Getform, your backend, etc.)
      status.className = 'form-status ok';
      status.textContent = 'Thanks! Your message is queued. We will reach out within 24 hours.';
      form.reset();
    });
  }

  /* ---------- Footer year ---------- */
  const yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Hero text reveal ---------- */
  document.querySelectorAll('.hero h1 .line > span').forEach((el, i) => {
    el.style.transform = 'translateY(100%)';
    el.style.transition = `transform 1s cubic-bezier(.2,.8,.2,1) ${0.1 + i * 0.12}s`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.transform = 'translateY(0)'; });
    });
  });
})();
