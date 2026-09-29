'use strict';
// Native scrolling and controls; the page never waits on video downloads.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.site-header');
const progress = document.querySelector('.reading-progress');
const hero = document.querySelector('#hero-video');
const heroButton = document.querySelector('#hero-toggle');
let heroUserPaused = false;
let heroVisible = true;
let activeCase = 'view';
function safelyPlay(video) {
  if (!video) return;
  const result = video.play();
  if (result) result.catch(() => {}); // Keep the poster and manual controls.
}
function syncHeroControl() {
  if (!heroButton || !hero) return;
  heroButton.setAttribute('aria-label', hero.paused ? 'Play background video' : 'Pause background video');
  heroButton.innerHTML = hero.paused
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3l11 7-11 7Z"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h3v14H5zM12 3h3v14h-3z"/></svg>';
}
if (hero && heroButton) {
  ['play','pause','error'].forEach(event => hero.addEventListener(event, syncHeroControl));
  heroButton.addEventListener('click', () => {
    heroUserPaused = !hero.paused;
    if (hero.paused) safelyPlay(hero); else hero.pause();
  });
  if (!reducedMotion.matches) safelyPlay(hero);
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (!heroVisible) hero.pause();
    else if (!heroUserPaused && !reducedMotion.matches && !document.hidden) safelyPlay(hero);
  }, {threshold:0.1}).observe(hero);
}
let scrollTick = false;
function updateScroll() {
  header?.classList.toggle('scrolled', window.scrollY > 70);
  const total = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = `${total > 0 ? Math.min(100, window.scrollY / total * 100) : 0}%`;
  if (chapters.length) {
    const trigger = window.innerHeight * (window.innerWidth <= 760 ? 0.7 : 0.52);
    const current = [...chapters].reverse().find(chapter => chapter.getBoundingClientRect().top <= trigger) || chapters[0];
    if (current.dataset.chapter !== activeCase) showCase(current.dataset.chapter);
  }
  scrollTick = false;
}
window.addEventListener('scroll', () => {
  if (!scrollTick) {requestAnimationFrame(updateScroll); scrollTick = true;}
}, {passive:true});
window.addEventListener('resize', updateScroll);
const caseButtons = [...document.querySelectorAll('[data-case]')];
const caseFilms = [...document.querySelectorAll('.evidence-film')];
let storyVisible = false;
function showCase(name) {
  activeCase = name;
  caseButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === name)));
  caseFilms.forEach(video => {
    const selected = video.id === `${name}-film`;
    video.hidden = !selected;
    video.classList.toggle('active', selected);
    if (!selected) video.pause();
    else if (storyVisible && !reducedMotion.matches && !document.hidden && !video.dataset.userPaused) safelyPlay(video);
  });
  const label = document.querySelector('#evidence-name');
  if (label) label.textContent = name === 'view' ? 'View / Diagnostic flight' : 'Probe / Contact experiments';
}
caseFilms.forEach(video => {
  video.addEventListener('pause', () => {
    if (!video.hidden && storyVisible && !document.hidden && !reducedMotion.matches) video.dataset.userPaused = 'true';
  });
  video.addEventListener('play', () => {delete video.dataset.userPaused;});
});
caseButtons.forEach(button => button.addEventListener('click', () => {
  showCase(button.dataset.case);
  document.querySelector(`#${button.dataset.case}-case`)?.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'});
}));
const story = document.querySelector('.evidence-screen');
if (story) new IntersectionObserver(([entry]) => {
  storyVisible = entry.isIntersecting;
  if (storyVisible) showCase(activeCase); else caseFilms.forEach(video => video.pause());
}, {threshold:0.2}).observe(story);
const chapters = [...document.querySelectorAll('[data-chapter]')];
const demoTabs = [...document.querySelectorAll('[data-demo]')];
function selectDemo(tab, focus=false) {
  demoTabs.forEach(button => {
    const selected = button === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (panel) {
      panel.hidden = !selected;
      if (!selected) panel.querySelectorAll('video').forEach(video=>video.pause());
    }
  });
  if (focus) tab.focus();
}
demoTabs.forEach((tab,index) => {
  tab.addEventListener('click',()=>selectDemo(tab));
  tab.addEventListener('keydown',event => {
    let target;
    if (event.key==='ArrowRight') target=(index+1)%demoTabs.length;
    if (event.key==='ArrowLeft') target=(index-1+demoTabs.length)%demoTabs.length;
    if (event.key==='Home') target=0;
    if (event.key==='End') target=demoTabs.length-1;
    if (target!==undefined) {event.preventDefault();selectDemo(demoTabs[target],true);}
  });
});
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) document.querySelectorAll('video').forEach(video=>video.pause());
  else {
    if (heroVisible && !heroUserPaused && !reducedMotion.matches) safelyPlay(hero);
    showCase(activeCase);
  }
});
reducedMotion.addEventListener('change',()=>{
  if (reducedMotion.matches) [hero,...caseFilms].filter(Boolean).forEach(video=>video.pause());
});
const navLinks=[...document.querySelectorAll('.site-header nav a')];
const sectionObserver=new IntersectionObserver(entries=>{
  for (const entry of entries) if (entry.isIntersecting) navLinks.forEach(link=>{
    if (link.hash===`#${entry.target.id}`) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
},{rootMargin:'-20% 0px -60% 0px'});
navLinks.forEach(link=>{
  const section=document.getElementById(link.hash.slice(1));
  if(section) sectionObserver.observe(section);
});
updateScroll();
