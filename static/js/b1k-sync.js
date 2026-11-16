// BEHAVIOR-1K pairs play as one: the agent's-view video carries the controls and the
// third-person video follows it. Clicking the third-person video plays or pauses both.
document.querySelectorAll('[data-sync]').forEach(pair => {
  const [a, b] = pair.querySelectorAll('video');
  if (!a || !b) return;
  const sync = () => { if (Math.abs(b.currentTime - a.currentTime) > 0.15) b.currentTime = a.currentTime; };
  a.addEventListener('play', () => { sync(); b.play().catch(() => {}); });
  a.addEventListener('pause', () => { b.pause(); sync(); });
  a.addEventListener('seeked', sync);
  a.addEventListener('timeupdate', sync);
  a.addEventListener('ratechange', () => { b.playbackRate = a.playbackRate; });
  b.addEventListener('click', () => { if (a.paused) a.play(); else a.pause(); });
});
