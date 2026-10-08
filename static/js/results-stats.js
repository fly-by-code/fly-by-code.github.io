// Results: scroll-linked success-rate cards. As the cards scroll into view, each bar fills and its
// number counts up to the reported value (staggered left to right); scrolling back reverses it.
// The markup already holds the final numbers, so without JS or with reduced motion nothing changes.
(() => {
  const box = document.getElementById('success-stats');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = [...box.children].map(el => ({
    el, value: parseFloat(el.dataset.value), num: el.querySelector('.ax-num'), bar: el.querySelector('.ax-bar > i')
  }));
  const clamp = x => Math.min(1, Math.max(0, x));
  const ease = x => 1 - Math.pow(1 - x, 3);
  box.classList.add('ax-live');
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = box.getBoundingClientRect(), vh = innerHeight;
    // 0 when the cards' top reaches the bottom 5% of the screen, 1 when it reaches 45% from the top
    const p = clamp((vh * 0.95 - r.top) / (vh * 0.5));
    cards.forEach((c, i) => {
      const q = ease(clamp((p - i * 0.18) / 0.64));
      c.num.textContent = (c.value * q).toFixed(1) + '%';
      c.bar.style.width = (c.value * q).toFixed(2) + '%';
      c.el.style.opacity = (0.25 + 0.75 * clamp(q * 1.6)).toFixed(3);
      c.el.style.transform = `translateY(${((1 - clamp(q * 1.6)) * 18).toFixed(1)}px)`;
    });
    box.classList.toggle('ax-done', p >= 1);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, {passive: true});
  addEventListener('resize', onScroll);
  update();
})();
