// How-it-works diagram: a brief plain-loop view -> Active Feedback -> View / Probe.
// The complete build takes about 3.6 s; Replay restarts it. It then stays
// on screen 3, where View / Probe / Active Feedback are clickable.
// render(t) draws the figure at a timeline position; screen k is the state at STEP_END[k].
// The static markup is the final layout, so without JS (or with reduced motion) the finished diagram shows.
(() => {
  const root = document.getElementById('ov-ours');
  if (!root) return;
  const W = 1100, H = 515;
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const clamp = x => Math.min(1, Math.max(0, x));
  const ease = x => { x = clamp(x); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  const win = (t, a, b) => ease((t - a) / (b - a));
  const lerp = (a, b, s) => a + (b - a) * s;
  // [x, y, w, h] in diagram units; BASE is the plain loop (no Active Feedback), centred
  const FINAL = {task: [0, 330, 125, 90], policy: [165, 330, 150, 90], exec: [355, 330, 135, 90], af: [530, 330, 210, 90],
                 verdict: [780, 320, 150, 110], finish: [970, 330, 130, 90], refine: [515, 455, 240, 50]};
  const BASE = {task: 125, policy: 290, exec: 480, verdict: 655, finish: 845, refine: 450};
  const LIFT = 160;
  const STEP_END = [4.0, 5.4, 8.0];          // timeline position at the end of each step
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = (el, x, y, w, h) => Object.assign(el.style, {left: `${x / W * 100}%`, top: `${y / H * 100}%`, width: `${w / W * 100}%`, height: `${h / H * 100}%`});
  const u = n => `${(n / W * 100).toFixed(3)}cqw`;   // diagram units -> container width units
  const show = (el, o, rise = 14) => { el.style.opacity = o; el.style.transform = o < 1 ? `translateY(${u((1 - o) * rise)})` : ''; el.style.pointerEvents = o < .6 ? 'none' : ''; };
  const pathEl = id => root.querySelector('#ov-p-' + id);
  // draw a polyline up to fraction f of its length (the arrowhead travels with the tip)
  const draw = (id, pts, f) => {
    const el = pathEl(id);
    if (f <= 0) { el.setAttribute('d', ''); return; }
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let left = total * Math.min(1, f), d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length && left > 0; i++) {
      const k = Math.min(1, left / seg[i - 1]);
      d += `L${pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k} ${pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k}`;
      left -= seg[i - 1];
    }
    el.setAttribute('d', d);
  };
  const conn = root.querySelector('#ov-connect');
  const cap0 = root.querySelector('.ov-cap .k0'), cap1 = root.querySelector('.ov-cap .k1');

  const render = t => {
    const s = win(t, 4.2, 5.2), v = win(t, 5.4, 6.2), dy = -LIFT * (1 - v);
    const g = {};
    for (const k of ['task', 'policy', 'exec', 'verdict', 'finish', 'refine']) {
      const [x, y, w, h] = FINAL[k];
      g[k] = [lerp(BASE[k], x, s), y + dy, w, h];
    }
    const execR = g.exec[0] + g.exec[2], verL = g.verdict[0];
    g.af = [(execR + verL) / 2 - 105, 330 + dy, 210, 90];
    for (const k in g) place($(k), ...g[k]);
    // step 1: the plain loop in program order; each arrow is drawn after its source block
    const blocks = {task: 0, policy: .6, exec: 1.2, verdict: 1.8, finish: 2.4, refine: 2.4};
    for (const k in blocks) show($(k), win(t, blocks[k], blocks[k] + .4));
    const cy = 375 + dy, R = k => g[k][0] + g[k][2], L = k => g[k][0], C = k => g[k][0] + g[k][2] / 2;
    const ry = g.refine[1] + 25;
    draw('tp', [[R('task'), cy], [L('policy') - 1, cy]], win(t, .35, .65));
    draw('pe', [[R('policy'), cy], [L('exec') - 1, cy]], win(t, .95, 1.25));
    draw('ev', [[R('exec'), cy], [L('verdict') - 1, cy]], win(t, 1.55, 1.85));
    draw('vf', [[R('verdict'), cy], [L('finish') - 1, cy]], win(t, 2.15, 2.45));
    draw('vr', [[C('verdict'), g.verdict[1] + 110], [C('verdict'), ry], [R('refine') + 1, ry]], win(t, 2.15, 2.5));
    draw('rp', [[L('refine'), ry], [C('policy'), ry], [C('policy'), g.policy[1] + 91]], win(t, 2.75, 3.15));
    // step 2: Active Feedback slides into the loop
    const af = $('af'), ao = win(t, 4.4, 5.2);
    af.style.opacity = ao; af.style.transform = `scale(${(.6 + .4 * ao).toFixed(3)})`; af.style.pointerEvents = ao < .6 ? 'none' : '';
    draw('af', [[L('af') - 14, cy], [L('af') - 1, cy]], ao > .05 ? 1 : 0);
    pathEl('af').style.opacity = ao;
    // step 3: View and Probe come out of the Active Feedback block, then the diagnostic-program panel
    const p = win(t, 6.0, 7.0), ax = C('af'), ay = cy;
    for (const k of ['view', 'probe']) {
      const el = $(k), [x, y, w, h] = k === 'view' ? [215, 0, 435, 262] : [665, 0, 435, 262];
      const dx = (ax - (x + w / 2)) * (1 - p), dyy = (ay - (y + h / 2)) * (1 - p);
      el.style.opacity = p; el.style.pointerEvents = p < .6 ? 'none' : '';
      el.style.transform = p < 1 ? `translate(${u(dx)}, ${u(dyy)}) scale(${(.2 + .8 * p).toFixed(3)})` : '';
    }
    // Active Feedback "opens up": a beam spreads from its block into the panel that holds View, Probe
    // and the diagnostic program (as in the paper figure); both follow the block while the loop settles
    const beam = conn.querySelector('.ov-beam'), panel = conn.querySelector('.ov-afpanel');
    const bl = L('af'), br = R('af');
    beam.setAttribute('d', `M${C('af') - 195} 270L${C('af') + 195} 270L${br} ${g.af[1]}L${bl} ${g.af[1]}Z`);
    beam.style.opacity = win(t, 5.8, 6.3);
    panel.style.opacity = win(t, 5.9, 6.5);
    const dp = win(t, 7.1, 7.7), diag = $('diag');
    diag.style.opacity = dp; diag.style.pointerEvents = dp < .6 ? 'none' : '';
    diag.style.transform = dp < 1 ? `translateX(${u(-24 * (1 - dp))})` : '';
    // caption follows the screen: plain loop, then ours
    // the plain-loop caption slides up and out as the loop opens; ours slides up into its place
    const c0 = win(t, 4.0, 4.35), c1 = win(t, 4.25, 4.7);
    // On screens 1 and 2 each caption sits large and centred about a quarter of the way down the box;
    // just before View / Probe appear it glides to its resting place at the top left.
    const rootBox = root.getBoundingClientRect();
    const m = rootBox.width > 760 ? 1 - win(t, 5.4, 6.0) : 0;   // phones: captions stay in place and wrap
    const placeCaption = (el, fade, slide) => {
      el.style.transform = '';
      const r = el.getBoundingClientRect();
      const dx = (rootBox.left + rootBox.width / 2) - (r.left + r.width / 2);
      const dy = (rootBox.top + rootBox.height * 0.25) - (r.top + r.height / 2);
      el.style.opacity = fade.toFixed(3);
      el.style.transform = `translate(${(dx * m).toFixed(1)}px, calc(${(dy * m).toFixed(1)}px + ${slide.toFixed(3)}em)) scale(${(1 + 0.22 * m).toFixed(3)})`;
    };
    placeCaption(cap0, 1 - c0, -0.45 * c0);
    placeCaption(cap1, c1, 0.45 * (1 - c1));
  };
  window.__ovRender = render;

  // ---- play once: hold each screen, then move continuously to the next one
  const FIRST = 1000, HOLD = 1000, RATE = 2.5; // 1 s on screens 1 and 2; ~3.6 s in total
  let pos = STEP_END[0], raf = 0;
  const moveTo = (target, done) => {
    let last = performance.now();
    const tick = now => {
      pos = Math.min(target, pos + (now - last) / 1000 * RATE); last = now;
      render(pos);
      if (pos < target) raf = requestAnimationFrame(tick); else done && done();
    };
    raf = requestAnimationFrame(tick);
  };
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const play = () => {
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf);
    if (current) close();
    pos = STEP_END[0]; render(pos); root.classList.remove('ready');
    later(() => moveTo(STEP_END[1], () =>
      later(() => moveTo(STEP_END[2], () => root.classList.add('ready')), HOLD)), FIRST);
  };

  // ---- View / Probe / Active Feedback open a detail panel
  const detail = root.querySelector('#ov-detail');
  const hots = [...root.querySelectorAll('.ov-hot')];
  const pages = [...detail.querySelectorAll('article')];
  let current = null;
  const stopVideos = () => detail.querySelectorAll('video').forEach(v => v.pause());
  function close() {
    current = null; stopVideos(); detail.hidden = true;
    hots.forEach(h => { h.classList.remove('on'); h.setAttribute('aria-expanded', 'false'); });
  }
  const open = key => {
    // A click takes priority over the initial reveal; keep the selected demo open.
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf);
    pos = STEP_END[2]; render(pos); root.classList.add('ready');
    root.classList.add('touched');
    if (current === key) return close();
    current = key; stopVideos();
    pages.forEach(a => { a.hidden = a.dataset.ov !== key; });
    hots.forEach(h => { const on = h.dataset.ov === key; h.classList.toggle('on', on); h.setAttribute('aria-expanded', on); });
    detail.hidden = false;
    const v = detail.querySelector(`article[data-ov="${key}"] video`);
    if (v && !reduced) v.play().catch(() => {});
    if (detail.getBoundingClientRect().bottom > innerHeight) detail.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  };
  hots.forEach(h => h.addEventListener('click', () => open(h.dataset.ov)));
  detail.querySelector('.ov-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });
  root.querySelector('.ov-replay').addEventListener('click', () => (reduced ? null : play()));

  // ---- start once the figure is on screen
  root.classList.add('armed');
  if (reduced || !('IntersectionObserver' in window)) { render(STEP_END[2]); root.classList.add('ready'); return; }
  // play when the diagram comes into view; once it has left the screen completely, rewind to
  // screen 1 so that coming back replays it from the start
  let playing = false;
  const rewind = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf);
                         if (current) close(); pos = STEP_END[0]; render(pos); root.classList.remove('ready'); playing = false; };
  render(STEP_END[0]);
  const io = new IntersectionObserver(es => {
    const e = es[es.length - 1];
    if (e.intersectionRatio >= .3 && !playing) { playing = true; play(); }
    else if (!e.isIntersecting && playing) rewind();
  }, {threshold: [0, .3]});
  io.observe(root);
})();
