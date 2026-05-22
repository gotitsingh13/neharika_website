/* ====================================================================
   SPINE 3D ENGINE — Web3D Immersive Anatomy Layer
   Canvas 2D · Perspective Projection · Scroll-Driven Camera
   Cytokine Particles · Neural Root Pulses · Hotspot Detection
   Research Card ↔ Anatomy Bridge · Section Atmospheres
   ==================================================================== */

'use strict';

/* ── Helpers ─────────────────────────────────────────────────────── */
const _lerp  = (a, b, t) => a + (b - a) * t;
const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const _ease  = (t) => 1 - Math.pow(1 - _clamp(t, 0, 1), 3);

/* ══════════════════════════════════════════════════════════════════
   SPINE 3D — Core Renderer
   ══════════════════════════════════════════════════════════════════ */
class Spine3D {
  constructor() {
    this._buildDOM();
    this.ctx        = this.canvas.getContext('2d');
    this.t          = 0;
    this.active     = true;
    this.scrollPct  = 0;
    this.highlight  = null;   // 'disc' | 'vert' | 'root' | 'all' | null
    this.mouse      = { x: -9999, y: -9999 };

    // Camera — current and target
    this.cam  = { ry: 0.35, rx: -0.05, dist: 420, py: 0, px: 0 };
    this.camT = { ...this.cam };

    this.particles = this._mkParticles();

    // Zone label sequence
    this.ZONES = [
      { p: 0,    name: 'Lumbar Overview',       sub: 'T12 – Sacrum' },
      { p: 0.15, name: 'Disc Microenvironment', sub: 'IVD Biology · L3–L4' },
      { p: 0.30, name: 'Inflammatory Zone',     sub: 'Cytokine Signaling · SerpinA1' },
      { p: 0.50, name: 'Neural Interface',      sub: 'Nociceptor Pathway · Root Compression' },
      { p: 0.65, name: 'Regenerative Zone',     sub: 'Estrogen Signaling · Bone Remodeling' },
      { p: 0.85, name: 'Systems View',          sub: 'Translational Research Targets' },
    ];
    this._zoneName = '';

    window.addEventListener('resize',    () => this._resize(),    { passive: true });
    window.addEventListener('scroll',    () => this._scroll(),    { passive: true });
    this.canvas.addEventListener('mousemove',  e  => this._mouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this._mouseLeave());

    this._resize();
    this._animate();
  }

  /* ── DOM ───────────────────────────────────────────────────────── */
  _buildDOM() {
    this.wrap = document.createElement('div');
    this.wrap.className = 'spine3d-wrap';
    this.wrap.setAttribute('aria-hidden', 'true');

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'spine3d-canvas';

    // Zone label
    this.zoneEl = document.createElement('div');
    this.zoneEl.className = 'spine3d-zone';
    this.zoneEl.innerHTML =
      '<div class="s3z-eye">Anatomical Zone</div>' +
      '<div class="s3z-name">Lumbar Overview</div>' +
      '<div class="s3z-sub">T12 – Sacrum</div>';

    // Molecule legend
    this.legendEl = document.createElement('div');
    this.legendEl.className = 'spine3d-legend';
    this.legendEl.innerHTML = [
      ['#00C9A7',              'Neural'],
      ['#C9A84C',              'Bone'],
      ['rgba(255,90,90,0.9)',  'Cytokine'],
      ['#8B6BCE',              'Regen'],
    ].map(([c, l]) =>
      `<div class="s3l-item"><span class="s3l-dot" style="background:${c}"></span>${l}</div>`
    ).join('');

    // Hotspot info panel
    this.hpEl = document.createElement('div');
    this.hpEl.className = 'spine3d-hp';
    this.hpEl.innerHTML = '<div class="s3hp-label"></div><div class="s3hp-desc"></div>';

    this.wrap.append(this.canvas, this.zoneEl, this.legendEl, this.hpEl);
    document.body.appendChild(this.wrap);
  }

  /* ── Particles (cytokines / molecular signals) ─────────────────── */
  _mkParticles() {
    const TYPES = [
      { col: '255,90,90',   r: 2.2, sp: 0.22 },   // IL-6 / inflammatory
      { col: '0,201,167',   r: 2.8, sp: 0.15 },   // SerpinA1 / protective
      { col: '201,168,76',  r: 2.0, sp: 0.25 },   // TNF-α / signal
      { col: '139,108,206', r: 2.4, sp: 0.18 },   // BMP-2 / regen
      { col: '74,143,212',  r: 2.0, sp: 0.20 },   // Wnt / structural
    ];
    return Array.from({ length: 70 }, (_, i) => {
      const T = TYPES[i % TYPES.length];
      const a = Math.random() * Math.PI * 2;
      return {
        x:  (Math.random() - .5) * 160,
        y:  (Math.random() - .5) * 360,
        z:  (Math.random() - .5) * 90,
        vx: Math.cos(a) * T.sp * (.5 + Math.random() * .5),
        vy: (Math.random() - .5) * T.sp * .5,
        vz: Math.sin(a) * T.sp * (.5 + Math.random() * .5),
        r:  T.r, col: T.col,
        ph: Math.random() * Math.PI * 2,
      };
    });
  }

  /* ── Spine geometry ────────────────────────────────────────────── */
  get VERTS() {
    return [
      { y: -155, lb: 'T12', w: 48, h: 20 },
      { y:  -95, lb: 'L1',  w: 52, h: 22 },
      { y:  -35, lb: 'L2',  w: 56, h: 24 },
      { y:   25, lb: 'L3',  w: 60, h: 26, focus: true },
      { y:   85, lb: 'L4',  w: 62, h: 27 },
      { y:  145, lb: 'L5',  w: 65, h: 29 },
    ];
  }
  get DISCS() {
    return [
      { y: -125, w: 44 },
      { y:  -65, w: 49 },
      { y:   -5, w: 53 },
      { y:   55, w: 56, focus: true },
      { y:  115, w: 59 },
    ];
  }
  get ROOTS() {
    return [-105, -45, 15, 75, 135].flatMap(y => [-1, 1].map(side => ({ y, side })));
  }

  /* ── Resize ────────────────────────────────────────────────────── */
  _resize() {
    const r = this.wrap.getBoundingClientRect();
    this.canvas.width  = r.width  || 200;
    this.canvas.height = r.height || 600;
    this.W  = this.canvas.width;
    this.H  = this.canvas.height;
    this.cx = this.W / 2;
    this.cy = this.H / 2;
  }

  /* ── Scroll ────────────────────────────────────────────────────── */
  _scroll() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollPct = scrollable > 0 ? _clamp(window.scrollY / scrollable, 0, 1) : 0;

    const heroH = document.getElementById('hero')?.offsetHeight || window.innerHeight;
    this.wrap.classList.toggle('s3-visible', window.scrollY > heroH * 0.55);

    this._updateCamTarget();
    this._updateZone();
  }

  _updateCamTarget() {
    const p = this.scrollPct;
    const KF = [
      { p: 0,    ry:  0.35, dist: 420, py:   0, px:   0 },
      { p: 0.15, ry:  0.75, dist: 350, py:  22, px:   0 },
      { p: 0.30, ry:  1.10, dist: 295, py:  38, px:  12 },
      { p: 0.50, ry:  0.20, dist: 330, py: -12, px: -10 },
      { p: 0.65, ry: -0.30, dist: 365, py: -28, px:   0 },
      { p: 0.85, ry:  0.35, dist: 420, py:   0, px:   0 },
      { p: 1.00, ry:  0.35, dist: 420, py:   0, px:   0 },
    ];
    let from = KF[0], to = KF[KF.length - 1];
    for (let i = 0; i < KF.length - 1; i++) {
      if (p >= KF[i].p && p <= KF[i + 1].p) { from = KF[i]; to = KF[i + 1]; break; }
    }
    const span = to.p - from.p;
    const t = span > 0 ? _ease((p - from.p) / span) : 0;
    this.camT.ry   = _lerp(from.ry,   to.ry,   t);
    this.camT.dist = _lerp(from.dist, to.dist, t);
    this.camT.py   = _lerp(from.py,   to.py,   t);
    this.camT.px   = _lerp(from.px,   to.px,   t);
  }

  _updateZone() {
    const p = this.scrollPct;
    let zone = this.ZONES[0];
    for (const z of this.ZONES) if (p >= z.p) zone = z;
    if (zone.name === this._zoneName) return;
    this._zoneName = zone.name;

    const nameEl = this.zoneEl.querySelector('.s3z-name');
    const subEl  = this.zoneEl.querySelector('.s3z-sub');
    if (!nameEl) return;

    this.zoneEl.classList.add('s3z-fade');
    setTimeout(() => {
      nameEl.textContent = zone.name;
      subEl.textContent  = zone.sub;
      this.zoneEl.classList.remove('s3z-fade');
    }, 220);
  }

  /* ── Mouse / Hotspot ───────────────────────────────────────────── */
  _mouseMove(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  _mouseLeave() {
    this.mouse = { x: -9999, y: -9999 };
    this.hpEl.classList.remove('s3hp-on');
  }

  /* ── Public: set anatomy highlight from research cards ─────────── */
  setHighlight(mode) {
    this.highlight = mode;
  }

  /* ── 3D Projection ─────────────────────────────────────────────── */
  _proj(wx, wy, wz) {
    // Y rotation
    const cry = Math.cos(this.cam.ry), sry = Math.sin(this.cam.ry);
    const rx  =  wx * cry + wz * sry;
    const ry  =  wy;
    const rz  = -wx * sry + wz * cry;
    // X tilt
    const crx = Math.cos(this.cam.rx), srx = Math.sin(this.cam.rx);
    const fy  = ry * crx - rz * srx;
    const fz  = ry * srx + rz * crx;

    const z = fz + this.cam.dist;
    if (z <= 5) return null;
    const fov = 500;
    return {
      x:  this.cx + this.cam.px + (rx  * fov) / z,
      y:  this.cy + this.cam.py + (fy  * fov) / z,
      z:  fz,
      sc: fov / z,    // perspective scale factor
    };
  }

  /* ── Animate loop ──────────────────────────────────────────────── */
  _animate() {
    if (!this.active) return;
    requestAnimationFrame(() => this._animate());

    // Don't render if sidebar is hidden (saves CPU on small screens)
    if (window.innerWidth < 1520) return;

    this.t += 0.012;

    // Smooth camera interpolation
    const s = 0.028;
    this.cam.ry   += (this.camT.ry   - this.cam.ry)   * s;
    this.cam.dist += (this.camT.dist - this.cam.dist)  * s;
    this.cam.py   += (this.camT.py   - this.cam.py)    * s;
    this.cam.px   += (this.camT.px   - this.cam.px)    * s;

    // Gentle sinusoidal drift
    this.cam.ry += Math.sin(this.t * 0.07) * 0.00065;

    this._render();
  }

  /* ── Render ────────────────────────────────────────────────────── */
  _render() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // Advance particles
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.z += p.vz;
      if (Math.abs(p.x) > 105) p.vx *= -1;
      if (Math.abs(p.y) > 210) p.vy *= -1;
      if (Math.abs(p.z) >  75) p.vz *= -1;
    }

    // Collect projected objects for painter's algorithm
    const objs = [];

    for (const d of this.DISCS) {
      const p = this._proj(0, d.y, 0);
      if (p) objs.push({ kind: 'disc', g: d, p, sz: p.z });
    }
    for (const v of this.VERTS) {
      const p = this._proj(0, v.y, 0);
      if (p) objs.push({ kind: 'vert', g: v, p, sz: p.z });
    }
    for (const r of this.ROOTS) {
      const p = this._proj(r.side * 38, r.y, 0);
      if (p) objs.push({ kind: 'root', g: r, p, sz: p.z });
    }
    for (const part of this.particles) {
      const p = this._proj(part.x, part.y, part.z);
      if (p) objs.push({ kind: 'ptcl', g: part, p, sz: p.z });
    }

    // Back-to-front
    objs.sort((a, b) => a.sz - b.sz);

    this._drawCord();

    for (const o of objs) {
      switch (o.kind) {
        case 'disc': this._disc(o.g, o.p); break;
        case 'vert': this._vert(o.g, o.p); break;
        case 'root': this._root(o.g, o.p); break;
        case 'ptcl': this._ptcl(o.g, o.p); break;
      }
    }

    this._hotspot(objs);
  }

  /* ── Draw: spinal cord ─────────────────────────────────────────── */
  _drawCord() {
    const { ctx } = this;
    ctx.beginPath();
    let first = true;
    for (let y = -175; y <= 175; y += 8) {
      const p = this._proj(0, y, 0);
      if (!p) continue;
      if (first) { ctx.moveTo(p.x, p.y); first = false; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(74,143,212,0.18)';
    ctx.lineWidth   = 3.5;
    ctx.stroke();
  }

  /* ── Draw: intervertebral disc ─────────────────────────────────── */
  _disc(g, p) {
    const { ctx, t, highlight } = this;
    const w = g.w * p.sc;
    const h = 8  * p.sc;

    const isFocus = g.focus || highlight === 'disc' || highlight === 'all';
    const pulse   = isFocus ? (Math.sin(t * 1.2) + 1) * .5 : 0;

    if (isFocus) {
      ctx.shadowBlur  = 20 + pulse * 18;
      ctx.shadowColor = 'rgba(0,201,167,.55)';
    }
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w, h, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,201,167,${0.13 + pulse * 0.24})`;
    ctx.fill();
    if (isFocus) {
      ctx.strokeStyle = `rgba(0,201,167,${0.38 + pulse * 0.42})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  /* ── Draw: vertebral body ──────────────────────────────────────── */
  _vert(g, p) {
    const { ctx, highlight } = this;
    const hw = (g.w / 2) * p.sc;
    const hh = (g.h / 2) * p.sc;
    const r  = 3 * p.sc;

    const isFocus = g.focus || highlight === 'vert' || highlight === 'all';

    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(p.x - hw, p.y - hh, hw * 2, hh * 2, r);
    else               ctx.rect(p.x - hw, p.y - hh, hw * 2, hh * 2);

    ctx.fillStyle   = `rgba(201,168,76,${isFocus ? 0.26 : 0.12})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(201,168,76,${isFocus ? 0.80 : 0.30})`;
    ctx.lineWidth   = isFocus ? 1.6 : 0.8;
    ctx.stroke();

    if (isFocus || p.sc > 0.92) {
      ctx.fillStyle = 'rgba(201,168,76,.55)';
      ctx.font = `${Math.max(7, Math.round(8 * p.sc))}px 'Space Mono',monospace`;
      ctx.fillText(g.lb, p.x + hw + 3 * p.sc, p.y + 3);
    }
  }

  /* ── Draw: neural root ─────────────────────────────────────────── */
  _root(g, p) {
    const { ctx, t, highlight } = this;
    const ep = this._proj(g.side * 90, g.y + 14, -18);
    const mp = this._proj(g.side * 64, g.y +  7, -10);
    if (!ep || !mp) return;

    const isActive = highlight === 'root' || highlight === 'all';
    const pulse    = (Math.sin(t * 1.9 + g.y * 0.035) + 1) * .5;
    const baseA    = isActive ? 0.45 : 0.22;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(mp.x, mp.y, ep.x, ep.y);
    ctx.strokeStyle = `rgba(0,201,167,${baseA + pulse * 0.40})`;
    ctx.lineWidth   = isActive ? 1.5 : 1.0;
    ctx.stroke();

    // Pulsing terminus dot
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, (isActive ? 3 : 2.5) + pulse, 0, Math.PI * 2);
    ctx.fillStyle   = `rgba(0,201,167,${0.38 + pulse * 0.55})`;
    ctx.shadowBlur  = (isActive ? 14 : 10) + pulse * 8;
    ctx.shadowColor = 'rgba(0,201,167,.7)';
    ctx.fill();
    ctx.shadowBlur  = 0;
  }

  /* ── Draw: cytokine / molecule particle ────────────────────────── */
  _ptcl(g, p) {
    const { ctx, t } = this;
    const pulse = (Math.sin(t * 2.4 + g.ph) + 1) * .32;
    const r     = g.r * p.sc;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = `rgba(${g.col},${0.28 + pulse})`;
    ctx.shadowBlur  = 5;
    ctx.shadowColor = `rgba(${g.col},.45)`;
    ctx.fill();
    ctx.shadowBlur  = 0;
  }

  /* ── Hotspot hit-test ──────────────────────────────────────────── */
  _hotspot(objs) {
    if (this.mouse.x < 0) return;

    const SPOTS = [
      { kind: 'disc', y:   55, lb: 'Focus IVD — L3 / L4', dc: 'SerpinA1 & inflammatory cascade site' },
      { kind: 'vert', y:   25, lb: 'L3 Vertebra',          dc: 'Bone–disc crosstalk · osteoclastogenesis' },
      { kind: 'root', y:   15, lb: 'Neural Root — L3',     dc: 'Nociceptive signaling · compression model' },
      { kind: 'disc', y:  -65, lb: 'IVD — L1 / L2',        dc: 'Estrogen receptor signaling zone' },
      { kind: 'vert', y: -155, lb: 'T12 Vertebra',          dc: 'Thoracolumbar junction · upper segment' },
    ];

    let hit = null;
    for (const sp of SPOTS) {
      const o = objs.find(
        o => o.kind === sp.kind && o.g.y !== undefined && Math.abs(o.g.y - sp.y) < 20
      );
      if (!o) continue;
      const dx = this.mouse.x - o.p.x;
      const dy = this.mouse.y - o.p.y;
      if (dx * dx + dy * dy < 28 * 28) { hit = sp; break; }
    }

    if (hit) {
      this.hpEl.querySelector('.s3hp-label').textContent = hit.lb;
      this.hpEl.querySelector('.s3hp-desc').textContent  = hit.dc;
      this.hpEl.classList.add('s3hp-on');
      this.canvas.style.cursor = 'crosshair';
    } else {
      this.hpEl.classList.remove('s3hp-on');
      this.canvas.style.cursor = 'default';
    }
  }

  destroy() { this.active = false; }
}

/* ══════════════════════════════════════════════════════════════════
   RESEARCH CARD ↔ SPINE BRIDGE
   Hovering a research card highlights the relevant anatomy
   ══════════════════════════════════════════════════════════════════ */
class ResearchSpineBridge {
  constructor(spine) {
    // Map card index → anatomy highlight mode + camera nudge
    const CARD_CFG = [
      { mode: 'all',  dRy:  0.0  },   // Translational Spine Research
      { mode: 'disc', dRy: +0.15 },   // Discogenic Pain & IVD
      { mode: 'all',  dRy: -0.10 },   // Bone–Disc–Immune Crosstalk
      { mode: 'vert', dRy: +0.20 },   // Spine Biomechanics
      { mode: 'disc', dRy: -0.15 },   // Bone Anti-Resorptive
      { mode: 'root', dRy: +0.10 },   // Scientific Leadership
    ];

    document.querySelectorAll('.research-card').forEach((card, i) => {
      const cfg = CARD_CFG[i] || { mode: 'all', dRy: 0 };

      card.addEventListener('mouseenter', () => {
        spine.setHighlight(cfg.mode);
        // Nudge camera to face relevant area
        spine.camT.ry += cfg.dRy;
      });

      card.addEventListener('mouseleave', () => {
        spine.setHighlight(null);
        spine._updateCamTarget();   // restore scroll-based target
      });
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   DATA CAPSULE ENHANCER
   Publications become floating data artifacts with scan-line hover
   ══════════════════════════════════════════════════════════════════ */
class DataCapsuleEnhancer {
  constructor() {
    document.querySelectorAll('.pub-item').forEach((el, i) => {
      el.classList.add('dc-capsule');
      el.style.setProperty('--ci', i);
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   SECTION ATMOSPHERE
   Subtle radial gradient environments per section
   ══════════════════════════════════════════════════════════════════ */
class SectionAtmosphere {
  constructor() {
    const ENV = {
      'research':        'env-mol',
      'scientific-work': 'env-data',
      'leadership':      'env-sig',
      'mentorship':      'env-regen',
    };

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const cls = ENV[e.target.id];
        if (cls) e.target.classList.toggle(cls, e.isIntersecting);
      });
    }, { threshold: 0.08 });

    Object.keys(ENV).forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   NEURAL SIGNAL TRAILS
   Vertical bioluminescent signal pulses that drift across the page
   ══════════════════════════════════════════════════════════════════ */
class NeuralSignalTrails {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'neural-trails-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.canvas);

    this.ctx     = this.canvas.getContext('2d');
    this.signals = [];
    this.active  = true;
    this.t       = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize(), { passive: true });

    // Spawn a signal every ~2.5 s
    setInterval(() => this._spawn(), 2600);
    // Seed a few immediately
    for (let i = 0; i < 3; i++) setTimeout(() => this._spawn(), i * 700);

    this._animate();
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _spawn() {
    if (window.scrollY < 200) return;
    this.signals.push({
      x:        Math.random() * window.innerWidth,
      y:        Math.random() * window.innerHeight * 0.25,
      targetY:  window.innerHeight * 0.7 + Math.random() * window.innerHeight * 0.25,
      progress: 0,
      speed:    0.006 + Math.random() * 0.006,
      color:    Math.random() > 0.5 ? '0,201,167' : '201,168,76',
    });
  }

  _animate() {
    if (!this.active) return;
    requestAnimationFrame(() => this._animate());

    this.t++;
    // Only draw every other frame
    if (this.t % 2 !== 0) return;

    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.signals = this.signals.filter(s => s.progress < 1);

    for (const s of this.signals) {
      s.progress += s.speed;
      const currY = s.y + (s.targetY - s.y) * s.progress;
      const alpha = Math.sin(s.progress * Math.PI) * 0.35;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, currY);
      ctx.strokeStyle = `rgba(${s.color},${alpha})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      // Leading glow dot
      ctx.beginPath();
      ctx.arc(s.x, currY, 2, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(${s.color},${alpha * 1.6})`;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = `rgba(${s.color},.6)`;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
  }

  destroy() { this.active = false; }
}

/* ══════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const spine = new Spine3D();
  new ResearchSpineBridge(spine);
  new DataCapsuleEnhancer();
  new SectionAtmosphere();

  // Signal trails only on wide, capable screens
  if (window.innerWidth > 960) {
    new NeuralSignalTrails();
  }
});
