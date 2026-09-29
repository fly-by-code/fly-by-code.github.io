// Page behaviour for the anonymous project page.
// Adapted from the Academic Project Page Template's index.js: jQuery, the "More Works" dropdown,
// the BibTeX copy button and the slider are removed; nothing here makes a network request.

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
  const btn = document.querySelector('.scroll-to-top');
  if (!btn) return;
  btn.classList.toggle('visible', window.pageYOffset > 300);
});

// Play carousel videos only while they are on screen.
function setupVideoCarouselAutoplay() {
  const videos = document.querySelectorAll('.results-carousel video');
  if (videos.length === 0) return;
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.play().catch(function () {});
      } else {
        entry.target.pause();
      }
    });
  }, { threshold: 0.5 });
  videos.forEach(function (v) { observer.observe(v); });
}


// Demo videos: play (muted) while at least a third is on screen, pause when scrolled away.
// Skipped when the viewer asks for reduced motion; the controls are always available.
function setupDemoAutoplay() {
  const videos = document.querySelectorAll('video.demo-video');
  if (videos.length === 0 || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const v = entry.target;
      if (entry.isIntersecting) {
        v.muted = true;
        v.play().catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.35 });
  videos.forEach(function (v) { observer.observe(v); });
}

document.addEventListener('DOMContentLoaded', function () {
  if (window.bulmaCarousel && document.querySelector('.carousel')) {
    bulmaCarousel.attach('.carousel', {
      slidesToScroll: 1,
      slidesToShow: 1,
      loop: true,
      infinite: true,
      autoplay: true,
      autoplaySpeed: 5000,
    });
  }
  setupVideoCarouselAutoplay();
  setupDemoAutoplay();
});
