/* ====================================================================
   DR. NEHARIKA BHADOURIA — WEBSITE INTERACTIONS
   Neural canvas, scroll animations, counters, cursor, nav
   ==================================================================== */

'use strict';

/* ─── NEURAL CANVAS ─────────────────────────────────────────────── */
class NeuralCanvas {
  constructor(canvasId, opts = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.opts = Object.assign({
      count:      72,
      maxDist:    160,
      baseSpeed:  0.38,
      nodeColor:  '0,201,167',      // teal
      lineColor:  '0,201,167',
      accentColor:'201,168,76',     // gold
      mouseInfluence: true,
    }, opts);

    this.particles = [];
    this.mouse     = { x: -999, y: -999 };
    this.pulses    = [];
    this.raf       = null;
    this.active    = true;

    this._resize = this._onResize.bind(this);
    this._mousemove = this._onMouse.bind(this);

    window.addEventListener('resize', this._resize);
    if (this.opts.mouseInfluence) {
      window.addEventListener('mousemove', this._mousemove);
    }

    this._init();
    this._animate();
  }

  _init() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    this.particles = [];
    for (let i = 0; i < this.opts.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.5 + 0.5) * this.opts.baseSpeed;
      this.particles.push({
        x:    Math.random() * this.canvas.width,
        y:    Math.random() * this.canvas.height,
        vx:   Math.cos(angle) * speed,
        vy:   Math.sin(angle) * speed,
        r:    Math.random() * 1.8 + 0.8,
        glow: Math.random() > 0.82,     // some nodes glow brighter
        gold: Math.random() > 0.88,     // some are gold
      });
    }
  }

  _onResize() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    if (this.particles.length > 0) {
      // Re-clamp positions
      this.particles.forEach(p => {
        p.x = Math.min(p.x, this.canvas.width);
        p.y = Math.min(p.y, this.canvas.height);
      });
    }
  }

  _onMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  _spawnPulse() {
    // Find a random connected pair and shoot a pulse along it
    if (Math.random() > 0.015) return; // throttle
    const i = Math.floor(Math.random() * this.particles.length);
    const a = this.particles[i];
    // Find closest neighbor
    let best = null, bestDist = Infinity;
    this.particles.forEach((b, j) => {
      if (j === i) return;
      const dx = a.x - b.x, dy = a.y - b.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < this.opts.maxDist && d < bestDist) {
        bestDist = d; best = b;
      }
    });
    if (best) {
      this.pulses.push({ x: a.x, y: a.y, tx: best.x, ty: best.y, t: 0 });
    }
  }

  _animate() {
    if (!this.active) return;
    this.raf = requestAnimationFrame(() => this._animate());

    const { ctx, canvas, opts, particles, mouse } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update particles
    particles.forEach(p => {
      // Mouse gentle repulsion
      if (opts.mouseInfluence) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100 * 0.018;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // Speed cap
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > opts.baseSpeed * 2) {
        p.vx = (p.vx / speed) * opts.baseSpeed * 2;
        p.vy = (p.vy / speed) * opts.baseSpeed * 2;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Soft bounce at edges
      if (p.x < 0)            { p.x = 0;            p.vx *= -1; }
      if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
      if (p.y < 0)            { p.y = 0;            p.vy *= -1; }
      if (p.y > canvas.height){ p.y = canvas.height; p.vy *= -1; }
    });

    // Draw connections
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < opts.maxDist) {
          const alpha = (1 - dist / opts.maxDist) * 0.28;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${opts.lineColor}, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Draw particles
    particles.forEach(p => {
      const color = p.gold ? opts.accentColor : opts.nodeColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, ${p.glow ? 0.85 : 0.5})`;
      if (p.glow) {
        ctx.shadowBlur  = 10;
        ctx.shadowColor = `rgba(${color}, 0.7)`;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Pulses
    this._spawnPulse();
    this.pulses = this.pulses.filter(pulse => pulse.t <= 1);
    this.pulses.forEach(pulse => {
      pulse.t += 0.022;
      const x = pulse.x + (pulse.tx - pulse.x) * pulse.t;
      const y = pulse.y + (pulse.ty - pulse.y) * pulse.t;
      const alpha = Math.sin(pulse.t * Math.PI) * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${opts.accentColor}, ${alpha})`;
      ctx.shadowBlur  = 14;
      ctx.shadowColor = `rgba(${opts.accentColor}, 0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  destroy() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('mousemove', this._mousemove);
  }
}

/* ─── SCROLL REVEAL ─────────────────────────────────────────────── */
class ScrollReveal {
  constructor() {
    this.els = document.querySelectorAll('.reveal');
    this.obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            this.obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    this.els.forEach(el => this.obs.observe(el));
  }
}

/* ─── STAT COUNTERS ─────────────────────────────────────────────── */
class StatCounters {
  constructor() {
    this.nums = document.querySelectorAll('.stat-num[data-target]');
    this.fills = document.querySelectorAll('.stat-fill[data-pct]');
    this.triggered = false;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !this.triggered) {
          this.triggered = true;
          this._runCounters();
          this._runBars();
          obs.disconnect();
        }
      });
    }, { threshold: 0.4 });

    const grid = document.querySelector('.stats-grid');
    if (grid) obs.observe(grid);
  }

  _runCounters() {
    this.nums.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    });
  }

  _runBars() {
    this.fills.forEach(el => {
      const pct = parseInt(el.dataset.pct, 10);
      // Small delay so CSS transition picks up
      requestAnimationFrame(() => {
        el.style.width = pct + '%';
      });
    });
  }
}

/* ─── NAVBAR SCROLL BEHAVIOR ────────────────────────────────────── */
class NavBehavior {
  constructor() {
    this.nav = document.getElementById('navbar');
    if (!this.nav) return;
    this.links = document.querySelectorAll('.nav-link');
    this.sections = Array.from(document.querySelectorAll('section[id]'));

    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 60) this.nav.classList.add('scrolled');
      else        this.nav.classList.remove('scrolled');
      this._updateActive(y);
      last = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  _updateActive(y) {
    let current = '';
    this.sections.forEach(s => {
      const top = s.offsetTop - 120;
      if (y >= top) current = s.id;
    });
    this.links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
  }
}

/* ─── CUSTOM CURSOR ─────────────────────────────────────────────── */
class CustomCursor {
  constructor() {
    this.dot  = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');
    if (!this.dot || !this.ring) return;

    // Only on non-touch devices
    if (window.matchMedia('(hover: none)').matches) {
      this.dot.style.display  = 'none';
      this.ring.style.display = 'none';
      document.body.style.cursor = 'auto';
      return;
    }

    this.dx = this.dy = 0;
    this.rx = this.ry = 0;

    window.addEventListener('mousemove', (e) => {
      this.dx = e.clientX;
      this.dy = e.clientY;
    });

    // Hover effect on interactive elements
    document.querySelectorAll('a, button, .research-card, .project-card, .pub-item, .lc-card, .cp-item')
      .forEach(el => {
        el.addEventListener('mouseenter', () => this.ring.classList.add('hovered'));
        el.addEventListener('mouseleave', () => this.ring.classList.remove('hovered'));
      });

    this._loop();
  }

  _loop() {
    this.dot.style.left = this.dx + 'px';
    this.dot.style.top  = this.dy + 'px';

    // Lag for ring
    this.rx += (this.dx - this.rx) * 0.14;
    this.ry += (this.dy - this.ry) * 0.14;
    this.ring.style.left = this.rx + 'px';
    this.ring.style.top  = this.ry + 'px';

    requestAnimationFrame(() => this._loop());
  }
}

/* ─── MOBILE NAV ────────────────────────────────────────────────── */
class MobileNav {
  constructor() {
    this.toggle = document.getElementById('nav-toggle');
    this.links  = document.getElementById('nav-links');
    if (!this.toggle || !this.links) return;

    this.open = false;
    this.toggle.addEventListener('click', () => this._toggle());

    // Close on link click
    this.links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => this._close());
    });
  }

  _toggle() {
    this.open = !this.open;
    this.links.classList.toggle('open', this.open);
    this._updateToggle();
  }

  _close() {
    this.open = false;
    this.links.classList.remove('open');
    this._updateToggle();
  }

  _updateToggle() {
    const spans = this.toggle.querySelectorAll('span');
    if (this.open) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  }
}

/* ─── PARALLAX HERO ─────────────────────────────────────────────── */
class HeroParallax {
  constructor() {
    this.spine = document.querySelector('.hero-spine-wrap');
    if (!this.spine) return;

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        this.spine.style.transform = `translateY(calc(-50% + ${y * 0.25}px))`;
      }
    }, { passive: true });
  }
}

/* ─── PROJECT CARD BAR ANIMATION ────────────────────────────────── */
class ProjectBars {
  constructor() {
    const cards = document.querySelectorAll('.project-card');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    cards.forEach(c => obs.observe(c));
  }
}

/* ─── TIMELINE DOT HIGHLIGHT ────────────────────────────────────── */
class TimelineDots {
  constructor() {
    const items = document.querySelectorAll('.tl-item');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const dot = e.target.querySelector('.tl-dot');
          if (dot && !dot.classList.contains('tl-dot-bright') && !dot.classList.contains('tl-dot-future')) {
            dot.style.borderColor = 'var(--teal)';
            dot.style.boxShadow = '0 0 12px rgba(0,201,167,.4)';
          }
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    items.forEach(i => obs.observe(i));
  }
}

/* ─── SMOOTH SCROLL FOR ANCHOR LINKS ────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const offset = 80; // nav height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ─── PAGE LOADER ───────────────────────────────────────────────── */
function initLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 800);
  });
}

/* ─── ACTIVE NAV LINK STYLE ─────────────────────────────────────── */
function injectActiveNavStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .nav-link.active {
      color: var(--gold) !important;
    }
    .nav-link.active::after {
      width: 100% !important;
      background: var(--gold) !important;
    }
  `;
  document.head.appendChild(style);
}

/* ─── RESEARCH CARD STAGGER ─────────────────────────────────────── */
function initResearchCardStagger() {
  const cards = document.querySelectorAll('.research-card');
  const rows  = {};
  cards.forEach((card, i) => {
    const row = Math.floor(i / 3);
    if (!rows[row]) rows[row] = [];
    rows[row].push(card);
  });
  Object.values(rows).forEach((row) => {
    row.forEach((card, j) => {
      if (!card.style.getPropertyValue('--delay')) {
        card.style.setProperty('--delay', `${j * 0.07}s`);
      }
    });
  });
}

/* ─── CTA CANVAS (mini neural) ──────────────────────────────────── */
function initCtaCanvas() {
  const c = document.getElementById('cta-canvas');
  if (!c) return;
  new NeuralCanvas('cta-canvas', {
    count: 40,
    maxDist: 120,
    baseSpeed: 0.25,
    nodeColor: '201,168,76',
    lineColor: '201,168,76',
    accentColor: '0,201,167',
    mouseInfluence: false,
  });
}

/* ─── FLOAT NAV ─────────────────────────────────────────────── */
class FloatNav {
  constructor() {
    this.nav = document.getElementById('float-nav');
    if (!this.nav) return;
    this.dots = this.nav.querySelectorAll('.fn-dot');
    this.sections = Array.from(document.querySelectorAll('section[id]'));
    window.addEventListener('scroll', () => this._update(), { passive: true });
    this._update();
  }
  _update() {
    const y = window.scrollY + window.innerHeight * 0.4;
    let current = '';
    this.sections.forEach(s => { if (s.offsetTop <= y) current = s.id; });
    this.dots.forEach(d => {
      const matches = d.getAttribute('href') === '#' + current;
      d.classList.toggle('active', matches);
    });
  }
}

/* ─── RESEARCH CARD EXPAND ───────────────────────────────────── */
class ResearchExpand {
  constructor() {
    document.querySelectorAll('.rc-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.research-card');
        const detail = card.querySelector('.rc-detail');
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        btn.querySelector('.rc-expand-label').textContent = expanded ? 'Explore' : 'Close';
        detail.classList.toggle('open', !expanded);
        card.classList.toggle('expanded', !expanded);
      });
    });
  }
}

/* ─── TAB SYSTEM ─────────────────────────────────────────────── */
class TabSystem {
  constructor() {
    document.querySelectorAll('.sw-tab-bar').forEach(bar => {
      const container = bar.closest('.sw-tabs');
      bar.querySelectorAll('.sw-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const name = tab.dataset.tab;
          bar.querySelectorAll('.sw-tab').forEach(t => {
            t.classList.toggle('active', t === tab);
            t.setAttribute('aria-selected', String(t === tab));
          });
          container.querySelectorAll('.sw-panel').forEach(p => {
            const active = p.dataset.panel === name;
            p.classList.toggle('active', active);
            if (active) {
              p.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
              p.querySelectorAll('.project-card').forEach(c => c.classList.add('visible'));
            }
          });
        });
      });
    });
    // Activate reveals in initially-active panels
    document.querySelectorAll('.sw-panel.active').forEach(p => {
      p.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      p.querySelectorAll('.project-card').forEach(c => c.classList.add('visible'));
    });
  }
}

/* ─── ACCORDION ──────────────────────────────────────────────── */
class AccordionSystem {
  constructor() {
    document.querySelectorAll('.acc-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.acc-item');
        const body = item.querySelector('.acc-body');
        const expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!expanded));
        body.setAttribute('aria-hidden', String(expanded));
      });
    });
  }
}

/* ─── HORIZONTAL TIMELINE DRAG SCROLL ───────────────────────── */
class HorizontalTimelineDrag {
  constructor() {
    const wrapper = document.querySelector('.tl-h-wrapper');
    if (!wrapper) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    wrapper.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - wrapper.offsetLeft;
      scrollLeft = wrapper.scrollLeft;
    });
    window.addEventListener('mouseup', () => { isDown = false; });
    wrapper.addEventListener('mouseleave', () => { isDown = false; });
    wrapper.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - wrapper.offsetLeft;
      wrapper.scrollLeft = scrollLeft - (x - startX) * 1.2;
    });
  }
}

/* ─── INIT ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  injectActiveNavStyle();
  initSmoothScroll();
  initResearchCardStagger();

  new NeuralCanvas('neural-canvas', {
    count: 68,
    maxDist: 155,
    baseSpeed: 0.35,
    nodeColor: '0,201,167',
    lineColor: '0,201,167',
    accentColor: '201,168,76',
    mouseInfluence: true,
  });

  initCtaCanvas();

  new ScrollReveal();
  new StatCounters();
  new NavBehavior();
  new CustomCursor();
  new MobileNav();
  new HeroParallax();
  new ProjectBars();
  new TimelineDots();
  new FloatNav();
  new ResearchExpand();
  new TabSystem();
  new AccordionSystem();
  new HorizontalTimelineDrag();
});
