'use strict';
// One page, native disclosures, accessible tab groups, and opt-in detail videos.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.site-header');
const progress = document.querySelector('.reading-progress');
const hero = document.querySelector('#hero-video');
const heroButton = document.querySelector('#hero-toggle');
let heroUserPaused = false;
let heroVisible = true;

// Boundaries are seconds in the 49 s edited video, not robot wall-clock time.
const heroStages = [
  [0, 'Grasp hammer'], [9, 'Place hammer'], [15, 'Open left door'],
  [24, 'Open right door'], [33, 'Grasp bottle'], [40, 'Carry bottle'],
  [45, 'Place bottle']
];
const heroStage = document.querySelector('#hero-stage');
let lastHeroStage = -1;
function syncHeroStage(seconds = hero?.currentTime || 0) {
  if (!heroStage) return;
  let index = 0;
  for (let i = 1; i < heroStages.length; i++) if (seconds >= heroStages[i][0]) index = i;
  if (index === lastHeroStage) return;
  heroStage.querySelector('#hero-stage-number').textContent = `${String(index + 1).padStart(2, '0')} / 07`;
  heroStage.querySelector('#hero-stage-label').textContent = heroStages[index][1];
  heroStage.hidden = false;
  lastHeroStage = index;
}
if (hero) {
  ['loadedmetadata', 'timeupdate', 'seeked', 'emptied'].forEach(event => hero.addEventListener(event, () => syncHeroStage()));
  if ('requestVideoFrameCallback' in hero) {
    const onFrame = (_now, metadata) => {
      syncHeroStage(metadata.mediaTime);
      hero.requestVideoFrameCallback(onFrame);
    };
    hero.requestVideoFrameCallback(onFrame);
  }
  syncHeroStage();
}

function safelyPlay(video) {
  if (!video) return;
  const result = video.play();
  if (result) result.catch(() => {}); // The poster and manual control remain usable.
}
function syncHeroControl() {
  if (!heroButton || !hero) return;
  heroButton.setAttribute('aria-label', hero.paused ? 'Play background video' : 'Pause background video');
  heroButton.innerHTML = hero.paused
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3l11 7-11 7Z"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h3v14H5zM12 3h3v14h-3z"/></svg>';
}
if (hero && heroButton) {
  ['play', 'pause', 'error'].forEach(event => hero.addEventListener(event, syncHeroControl));
  heroButton.addEventListener('click', () => {
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

function selectTab(tab, focus = false) {
  const group = tab.closest('[role="tablist"]');
  if (!group) return;
  group.querySelectorAll('[role="tab"]').forEach(button => {
    const selected = button === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (panel) {
      panel.hidden = !selected;
      if (!selected) panel.querySelectorAll('video').forEach(video => video.pause());
    }
  });
  if (focus) tab.focus();
}
document.querySelectorAll('[role="tablist"]').forEach(group => {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) {
        event.preventDefault();
        selectTab(tabs[target], true);
      }
    });
  });
});

// Closing a case must also stop its media; reopening never autoplays the record.
document.querySelectorAll('details').forEach(disclosure => {
  disclosure.addEventListener('toggle', () => {
    if (!disclosure.open) disclosure.querySelectorAll('video').forEach(video => video.pause());
    updateScroll();
  });
});
const mediaObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) entry.target.pause();
  });
}, {threshold: 0});
document.querySelectorAll('video:not(#hero-video)').forEach(video => mediaObserver.observe(video));

function revealHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  const panel = target.closest('[role="tabpanel"]');
  if (panel) {
    const tab = document.getElementById(panel.getAttribute('aria-labelledby'));
    if (tab) selectTab(tab);
  }
  for (let node = target; node; node = node.parentElement) {
    if (node.tagName === 'DETAILS') node.open = true;
  }
  requestAnimationFrame(() => target.scrollIntoView({behavior: 'instant', block: 'start'}));
}
window.addEventListener('hashchange', revealHash);
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!document.getElementById(link.hash.slice(1))) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    revealHash();
  });
});

let scrollTick = false;
function updateScroll() {
  header?.classList.toggle('scrolled', window.scrollY > 70);
  const total = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = `${total > 0 ? Math.min(100, window.scrollY / total * 100) : 0}%`;
  scrollTick = false;
}
window.addEventListener('scroll', () => {
  if (!scrollTick) { requestAnimationFrame(updateScroll); scrollTick = true; }
}, {passive: true});
window.addEventListener('resize', updateScroll);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
  else if (heroVisible && !heroUserPaused && !reducedMotion.matches) safelyPlay(hero);
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) document.querySelectorAll('video').forEach(video => video.pause());
});
const navLinks = [...document.querySelectorAll('.site-header nav a')];
const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) navLinks.forEach(link => {
    if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}, {rootMargin: '-20% 0px -60% 0px'});
navLinks.forEach(link => {
  const section = document.getElementById(link.hash.slice(1));
  if (section) sectionObserver.observe(section);
});
updateScroll();
if (location.hash) revealHash();
