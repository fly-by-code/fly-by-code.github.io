// Left rail on wide screens, horizontally scrollable touch bar on smaller screens.
(() => {
  const rail = document.querySelector('.ax-rail');
  if (!rail) return;
  const links = [...rail.querySelectorAll('a')];
  const sections = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const hero = document.getElementById('top');
  const update = () => {
    const y = window.scrollY + window.innerHeight * 0.5;
    let k = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= y) k = i; });
    links.forEach((a, i) => {
      a.classList.toggle('active', i === k);
      if (i === k) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    rail.classList.toggle('dark', !!sections[k]?.classList.contains('ax-dark'));   // readable over dark sections
    rail.classList.toggle('shown', !hero || window.scrollY > hero.offsetHeight * 0.6);
  };
  addEventListener('scroll', update, {passive: true});
  addEventListener('resize', update);
  update();
})();
