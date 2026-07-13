/* ==========================================================================
   CÚSPIDES · script.js
   - Navegación tipo SPA entre Home y Detalle del Curso (sin recarga)
   - Carrusel de programas custom (desktop + móvil con swipe)
   - Animaciones de revelado con IntersectionObserver nativo
   - Contadores animados, header dinámico, menú móvil y progreso de scroll
   ========================================================================== */

(function () {
  'use strict';

  /* Respeta la preferencia de movimiento reducido del sistema */
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------- */
  /* 1. NAVEGACIÓN SPA: Home <-> Detalle del curso                          */
  /* ---------------------------------------------------------------------- */
  const homeView   = document.getElementById('home-view');
  const detailView = document.getElementById('detail-view');

  const DETAIL_HASH = '#detalle';

  /**
   * Muestra una vista y oculta la otra, con scroll suave al inicio.
   * @param {'home'|'detail'} target
   * @param {boolean} updateHash Si actualiza la URL (false al reaccionar a hashchange)
   */
  function switchView(target, updateHash = true) {
    const showHome = target === 'home';

    // Alterna clases y accesibilidad
    homeView.classList.toggle('is-active', showHome);
    homeView.classList.toggle('is-hidden', !showHome);
    homeView.setAttribute('aria-hidden', String(!showHome));

    detailView.classList.toggle('is-active', !showHome);
    detailView.classList.toggle('is-hidden', showHome);
    detailView.setAttribute('aria-hidden', String(showHome));

    // Scroll al inicio de forma limpia
    window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });

    // Re-dispara las animaciones de revelado de la vista activa
    requestAnimationFrame(() => initReveals(showHome ? homeView : detailView));

    // Refleja la vista en la URL para que sea linkeable (ej. index.html#detalle)
    if (updateHash) {
      const url = target === 'detail' ? DETAIL_HASH : window.location.pathname + window.location.search;
      history.pushState({ view: target }, '', url);
    }
  }

  // Cualquier elemento con data-open-course abre la ficha del curso
  document.querySelectorAll('[data-open-course]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('detail');
    });
    // Accesibilidad: activar con Enter / Espacio en tarjetas tipo botón
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchView('detail');
      }
    });
  });

  // Links marcados con data-nav="home" (footer, logo) vuelven a la Home antes de saltar
  document.querySelectorAll('[data-nav="home"]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!homeView.classList.contains('is-active')) switchView('home');
    });
  });

  // Entrar directo con #detalle en la URL abre la ficha del curso al cargar
  if (window.location.hash === DETAIL_HASH) {
    switchView('detail', false);
  }

  // Soporta los botones atrás/adelante del navegador
  window.addEventListener('popstate', () => {
    switchView(window.location.hash === DETAIL_HASH ? 'detail' : 'home', false);
  });

  /* ---------------------------------------------------------------------- */
  /* 2. CARRUSEL DE TERRITORIO: loop automático vía CSS (ver .carousel__track) */
  /*    Pausa al pasar el mouse por encima (:hover) — sin JS necesario.      */
  /* ---------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------- */
  /* 3. ANIMACIONES DE REVELADO (IntersectionObserver)                      */
  /* ---------------------------------------------------------------------- */
  let revealObserver = null;

  function getObserver() {
    if (revealObserver) return revealObserver;
    revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target); // anima una sola vez
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    return revealObserver;
  }

  /** Observa todos los elementos .reveal / .reveal-line de un contenedor */
  function initReveals(scope = document) {
    const targets = scope.querySelectorAll('.reveal, .reveal-line');
    if (REDUCED_MOTION) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = getObserver();
    targets.forEach((el) => {
      if (!el.classList.contains('is-visible')) obs.observe(el);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 3b. MANIFIESTO: el texto se "escribe" (palabra a palabra) al scrollear */
  /* ---------------------------------------------------------------------- */
  const manifestSection = document.querySelector('.manifest');
  if (manifestSection) {
    const manifestWords = manifestSection.querySelectorAll('.manifest__word');

    if (REDUCED_MOTION) {
      manifestWords.forEach((w) => w.classList.add('is-active'));
    } else {
      let manifestTicking = false;

      function updateManifest() {
        const rect = manifestSection.getBoundingClientRect();
        const scrollable = manifestSection.offsetHeight - window.innerHeight;
        const progress = scrollable > 0
          ? Math.min(1, Math.max(0, -rect.top / scrollable))
          : 1;
        const activeCount = Math.round(progress * manifestWords.length);

        manifestWords.forEach((w, i) => w.classList.toggle('is-active', i < activeCount));
        manifestTicking = false;
      }

      window.addEventListener('scroll', () => {
        if (!manifestTicking) {
          requestAnimationFrame(updateManifest);
          manifestTicking = true;
        }
      }, { passive: true });

      updateManifest();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 4. CONTADORES ANIMADOS (barra de stats)                                */
  /* ---------------------------------------------------------------------- */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (REDUCED_MOTION || target === 0) { el.textContent = prefix + target + suffix; return; }

    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { animateCount(entry.target); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.stats__num[data-count]').forEach((el) => countObserver.observe(el));

  /* ---------------------------------------------------------------------- */
  /* 4b. ACCORDIONS DE IMÁGENES (Home "¿Cómo te preparamos?" y Detalle       */
  /*     "Proceso de formación"). Cada instancia se maneja de forma          */
  /*     independiente para que no se crucen entre sí. Solo la que está      */
  /*     dentro de #method-scroll avanza sola al scrollear.                  */
  /* ---------------------------------------------------------------------- */
  const methodScroll = document.getElementById('method-scroll');

  document.querySelectorAll('.accordion').forEach((accordion) => {
    const items = accordion.querySelectorAll('.accordion__item');
    if (!items.length) return;

    function activateStep(target) {
      items.forEach((item) => {
        const isActive = item.dataset.step === target;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', String(isActive));
      });
    }

    items.forEach((item) => {
      item.addEventListener('click', () => activateStep(item.dataset.step));
    });

    if (methodScroll && methodScroll.contains(accordion)) {
      const totalSteps = items.length;

      function onMethodScroll() {
        const rect = methodScroll.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) return;

        const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
        const step = Math.min(totalSteps, Math.floor(progress * totalSteps) + 1);
        activateStep(String(step));
      }

      window.addEventListener('scroll', onMethodScroll, { passive: true });
      onMethodScroll();
    }
  });

  /* ---------------------------------------------------------------------- */
  /* 4c. SLIDER COMPARATIVO "ANTES Y DESPUÉS" (sección #comparacion)        */
  /* ---------------------------------------------------------------------- */
  const compareSlider = document.getElementById('compare-slider');
  const compareRange  = document.getElementById('compare-range');

  if (compareSlider && compareRange) {
    const setPos = (value) => compareSlider.style.setProperty('--pos', value + '%');
    setPos(compareRange.value);
    compareRange.addEventListener('input', () => setPos(compareRange.value));
  }

  /* ---------------------------------------------------------------------- */
  /* 4c-2. ACORDEÓN "PREGUNTAS FRECUENTES" (animación suave con grid-rows)   */
  /* ---------------------------------------------------------------------- */
  document.querySelectorAll('.faq-item__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const willOpen = !item.classList.contains('is-open');
      item.classList.toggle('is-open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  /* ---------------------------------------------------------------------- */
  /* 4d. PUNTERO DE MOUSE PERSONALIZADO (círculo azul)                       */
  /* ---------------------------------------------------------------------- */
  const cursorDot = document.getElementById('cursor-dot');
  if (cursorDot && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
      cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      cursorDot.classList.add('is-active');
    });
    document.addEventListener('mouseleave', () => cursorDot.classList.remove('is-active'));
  }

  /* ---------------------------------------------------------------------- */
  /* 4e. PARALLAX DE TODA LA SECCIÓN HERO (viewport + "hombre-hero")        */
  /* ---------------------------------------------------------------------- */
  const heroSection  = document.getElementById('hero');
  const heroViewport = document.querySelector('.hero__viewport');
  const heroFigure   = document.querySelector('.hero__figure');

  if (heroSection && heroViewport && !REDUCED_MOTION) {
    let heroTicking = false;

    function onHeroParallax() {
      const top = heroSection.getBoundingClientRect().top;
      heroViewport.style.transform = `translate3d(0, ${Math.round(top * -0.2)}px, 0)`;
      if (heroFigure) heroFigure.style.transform = `translate3d(0, ${Math.round(top * -0.35)}px, 0)`;
      heroTicking = false;
    }

    window.addEventListener('scroll', () => {
      if (!heroTicking) {
        requestAnimationFrame(onHeroParallax);
        heroTicking = true;
      }
    }, { passive: true });

    onHeroParallax();
  }

  /* ---------------------------------------------------------------------- */
  /* 5. HEADER DINÁMICO + PROGRESO DE SCROLL                                */
  /* ---------------------------------------------------------------------- */
  const header   = document.getElementById('site-header');
  const progress = document.getElementById('scroll-progress');

  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------------- */
  /* 6. MENÚ MÓVIL                                                          */
  /* ---------------------------------------------------------------------- */
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuToggle && mobileMenu) {
    function toggleMenu(open) {
      const willOpen = open ?? !mobileMenu.classList.contains('is-open');
      mobileMenu.classList.toggle('is-open', willOpen);
      menuToggle.classList.toggle('is-open', willOpen);
      menuToggle.setAttribute('aria-expanded', String(willOpen));
      mobileMenu.setAttribute('aria-hidden', String(!willOpen));
      document.body.style.overflow = willOpen ? 'hidden' : '';
    }
    menuToggle.addEventListener('click', () => toggleMenu());
    mobileMenu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => toggleMenu(false))
    );
  }

  /* ---------------------------------------------------------------------- */
  /* 7. CTA de inscripción (demo)                                           */
  /* ---------------------------------------------------------------------- */
  const enrollBtn = document.getElementById('enroll-btn');
  if (enrollBtn) {
    enrollBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Aquí conectarías el formulario real / pasarela de pago.
      enrollBtn.textContent = 'RESERVA INICIADA →';
      enrollBtn.style.pointerEvents = 'none';
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 8. ARRANQUE                                                            */
  /* ---------------------------------------------------------------------- */
  initReveals(document);

})();
