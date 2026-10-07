import {resolveAnchor} from './anchors.mjs';

// Current single-page layout: background video, native disclosures, and deep links.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('#hero-video');
const heroButton = document.querySelector('#hero-toggle');
let heroUserPaused = false;
let heroVisible = true;

function safelyPlay(video) {
  video?.play()?.catch(() => {}); // Autoplay restrictions leave the poster intact.
}
function syncHeroControl() {
  if (!heroButton || !hero) return;
  heroButton.setAttribute('aria-label', hero.paused ? 'Play background video' : 'Pause background video');
  heroButton.innerHTML = hero.paused
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3l11 7-11 7Z"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h3v14H5zM12 3h3v14h-3z"/></svg>';
}
if (hero) {
  ['play', 'pause', 'error'].forEach(event => hero.addEventListener(event, syncHeroControl));
  heroButton?.addEventListener('click', () => {
    heroUserPaused = !hero.paused;
    if (hero.paused) safelyPlay(hero); else hero.pause();
  });
  if (!reducedMotion.matches) safelyPlay(hero);
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (!heroVisible) hero.pause();
    else if (!heroUserPaused && !reducedMotion.matches && !document.hidden) safelyPlay(hero);
  }, {threshold: 0.1}).observe(hero);
}

// These release links have no destination yet. Keep them focusable so hover,
// keyboard focus, and touch/click can explain the unavailable action.
const releaseControls = [...document.querySelectorAll('.publication-control')];
const hideReleaseHints = () => releaseControls.forEach(control => {
  control.querySelector('[role="tooltip"]').hidden = true;
});
releaseControls.forEach(control => {
  const button = control.querySelector('button');
  const hint = control.querySelector('[role="tooltip"]');
  const show = () => { hideReleaseHints(); hint.hidden = false; };
  control.addEventListener('pointerenter', show);
  control.addEventListener('pointerleave', () => {
    if (document.activeElement !== button) hint.hidden = true;
  });
  button.addEventListener('focus', show);
  button.addEventListener('blur', () => { hint.hidden = true; });
  button.addEventListener('click', show);
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.publication-control')) hideReleaseHints();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') hideReleaseHints();
});

// Closing a case stops its media; reopening does not autoplay the record.
document.querySelectorAll('details').forEach(disclosure => {
  disclosure.addEventListener('toggle', () => {
    if (!disclosure.open) disclosure.querySelectorAll('video').forEach(video => video.pause());
  });
});
const mediaObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); });
}, {threshold: 0});
document.querySelectorAll('video:not(#hero-video)').forEach(video => mediaObserver.observe(video));

function revealHash() {
  const id = resolveAnchor(location.hash);
  const target = document.getElementById(id);
  if (!target) return;
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  for (let node = target; node; node = node.parentElement) {
    if (node.tagName === 'DETAILS') node.open = true;
  }
  requestAnimationFrame(() => target.scrollIntoView({behavior: 'instant', block: 'start'}));
}
window.addEventListener('hashchange', revealHash);
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const id = resolveAnchor(link.hash);
    if (!document.getElementById(id)) return;
    event.preventDefault();
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    revealHash();
  });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
  else if (heroVisible && !heroUserPaused && !reducedMotion.matches) safelyPlay(hero);
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) document.querySelectorAll('video').forEach(video => video.pause());
  else if (heroVisible && !heroUserPaused && !document.hidden) safelyPlay(hero);
});
if (location.hash) revealHash();
