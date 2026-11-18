// One local film, chapter seeking, and a quiet reading guide tied to actual edit times.
(() => {
  const section = document.getElementById('real-world-feedback');
  const video = document.getElementById('rwf-video');
  if (!section || !video) return;
  const play = section.querySelector('.rwf-play');
  const chapters = [...section.querySelectorAll('[data-rwf-chapter]')];
  const turns = [...section.querySelectorAll('[data-rwf-turn]')];
  const cues = [
    [0, 0, 'initial'], [17.5, 1, 'inspect'], [23, 1, 'revise'], [27.5, 1, 'execute'],
    [45, 2, 'inspect'], [50, 2, 'revise'], [55.5, 2, 'execute'],
    [61.5, 3, 'inspect'], [67.5, 3, 'revise'], [73, 3, 'execute'], [90, 3, 'result']
  ];
  let previous = '';
  function update() {
    const time = video.currentTime;
    const cue = cues.filter(item => item[0] <= time + .01).at(-1) || cues[0];
    const key = `${cue[1]}-${cue[2]}`;
    if (key === previous) return;
    previous = key;
    chapters.forEach(button => {
      if (Number(button.dataset.rwfChapter) === cue[1]) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    turns.forEach(turn => {
      const active = Number(turn.dataset.rwfTurn) === cue[1];
      turn.classList.toggle('is-current', active);
      turn.querySelectorAll('[data-rwf-phase]').forEach(step => step.classList.toggle('is-current', active && step.dataset.rwfPhase === cue[2]));
    });
  }
  async function start(time, scroll) {
    try {
      if (video.readyState === 0) {
        const loaded = new Promise((resolve, reject) => {
          video.addEventListener('loadedmetadata', resolve, {once: true});
          video.addEventListener('error', reject, {once: true});
        });
        video.load();
        await loaded;
      }
      if (Number.isFinite(time)) video.currentTime = Math.min(time, video.duration || 95);
      update();
      await video.play();
      if (scroll) section.querySelector('.rwf-film').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
    } catch (_) {
      // Native controls remain available if autoplay policy blocks programmatic play.
      play.hidden = true;
      video.focus();
    }
  }
  section.querySelector('.rwf-chapters').hidden = false;
  section.querySelectorAll('[data-rwf-seek]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => start(Number(button.dataset.rwfSeek), !button.hasAttribute('data-rwf-chapter')));
  });
  play.hidden = false;
  play.addEventListener('click', () => start(video.ended ? 0 : video.currentTime, false));
  video.addEventListener('play', () => { play.hidden = true; });
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', update);
  video.addEventListener('ended', update);
  video.addEventListener('error', () => { play.hidden = true; });
  update();
})();
