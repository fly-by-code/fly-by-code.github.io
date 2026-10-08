import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {legacyAnchors, resolveAnchor} from '../static/js/anchors.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = Object.fromEntries(['index.html', 'research.html'].map(name => [name, read(name)]));
const index = html['index.html'];
const ids = {};
for (const [name, source] of Object.entries(html)) {
  const found = [...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(found.length, new Set(found).size, name + ': duplicate IDs');
  ids[name] = new Set(found);
  assert(!/ICLR|double.blind|under.{0,15}review|Anonymous Authors/i.test(source), name + ': conference/review disclosure');
}
let count = 0;
for (const [name, source] of Object.entries(html)) {
  for (const [, url] of source.matchAll(/\b(?:src|poster|href)="([^"]+)"/g)) {
    if (/^(https?:|data:|mailto:)/.test(url)) continue;
    const [file, fragment] = url.split('#');
    const target = file.split('?')[0] || name;
    assert(fs.existsSync(path.join(root, target)), name + ': missing file ' + target);
    if (fragment && ids[target]) assert(ids[target].has(fragment), name + ': missing anchor ' + fragment);
    count++;
  }
  for (const [, names] of source.matchAll(/\baria-(?:controls|labelledby|describedby)="([^"]+)"/g)) {
    for (const id of names.split(/\s+/)) assert(ids[name].has(id), name + ': missing ARIA target ' + id);
  }
}
for (const [old, target] of Object.entries(legacyAnchors)) {
  assert(ids['index.html'].has(target), 'legacy destination missing: ' + old);
  assert.equal(resolveAnchor('#' + old), target);
}
for (const id of ['top','method','real-world','results','case-studies','abstract','cabinet-demo','tools-demo','task-success','completion','generality','evaluation','tasks','view-case','probe-details','physical-outcomes']) {
  assert(ids['index.html'].has(id), 'current/public destination missing: ' + id);
  assert.equal(resolveAnchor('#' + id), id);
}
assert.equal(resolveAnchor('#%69dea'), 'method');
assert.equal(resolveAnchor('#%E0%A4%A'), '');
assert.equal(resolveAnchor(''), '');
assert.equal(resolveAnchor('#not-a-section'), 'not-a-section');
assert.equal(resolveAnchor('#constructor'), 'constructor');
assert(index.includes('static/js/flight.js?v=20261008-feedback6" type="module"'));
assert(html['research.html'].includes('static/js/research-redirect.js?v=20261008" type="module"'));
assert(read('static/js/research-redirect.js').includes("resolveAnchor(window.location.hash) || 'method'"));

const authors = index.match(/<p class="ax-author-list">([\s\S]*?)<\/p>/)?.[1];
assert(authors, 'missing current author block');
for (const name of ['Jaewoo Lee','Jeongyeon Seo','Sihyun Cho','Gyeongrak Choe','Yutong Wang','Bavin Saravanan','Jia-Bin Huang','Furong Huang','Sebastian Scherer','Guanya Shi','H. Jin Kim','Seungjae Lee','Dongjae Lee']) {
  assert(authors.includes('<span>' + name) || new RegExp('<span><a class="ax-author-link" href="https://[^"]+" target="_blank" rel="noopener">' + name + '</a>').test(authors), 'missing author: ' + name);
}
// Preserve collaborators' author links; new links use exactly the same markup/style.
const expectedAuthorLinks = new Map([
  ['Jaewoo Lee', 'https://jwleesnu.github.io/'],
  ['Jeongyeon Seo', 'https://jeong-yeon-seo.github.io/'],
  ['Gyeongrak Choe', 'https://gyeong-rak.github.io/'],
  ['Yutong Wang', 'https://ywang760.github.io/'],
  ['Jia-Bin Huang', 'https://jbhuang0604.github.io/'],
  ['Furong Huang', 'https://furong-huang.com/'],
  ['Sebastian Scherer', 'https://theairlab.org/'],
  ['Guanya Shi', 'https://www.gshi.me/'],
  ['H. Jin Kim', 'https://scholar.google.co.kr/citations?user=TLQUwIMAAAAJ&hl=ko&oi=ao'],
  ['Seungjae Lee', 'https://sjlee.cc/'],
  ['Dongjae Lee', 'https://dongjaelee95.github.io/'],
]);
const authorLinks = [...authors.matchAll(/<a class="ax-author-link" href="([^"]+)" target="_blank" rel="noopener">([^<]+)<\/a>/g)];
assert.equal(authorLinks.length, expectedAuthorLinks.size, 'all existing and requested author links must remain');
for (const [name, url] of expectedAuthorLinks) {
  assert.equal(authorLinks.find(([, , label]) => label === name)?.[1].replaceAll('&amp;', '&'), url, 'author homepage mismatch: ' + name);
}
assert(index.includes('Equal contribution; order determined by coin flip.'));
assert(index.includes('&dagger; Project leads') && !index.includes('Corresponding authors'));
const releaseButtons = [...index.matchAll(/<button class="publication-link"([^>]*)>([\s\S]*?)<\/button>/g)];
assert.equal(releaseButtons.length, 2);
for (const [, attributes, content] of releaseButtons) {
  assert(attributes.includes('aria-disabled="true"') && !/\sdisabled(?:\s|=|$)|\bhref=/.test(attributes));
  assert(!/coming soon/i.test(content), 'release label must not add a second button line');
}
assert(releaseButtons[0][2].includes('arXiv') && releaseButtons[1][2].includes('Code'));
assert.equal([...index.matchAll(/role="tooltip" hidden>coming soon<\/span>/g)].length, 2);
assert(index.includes('class="publication-layout"') && index.includes('class="publication-info"'));
assert(!index.includes('class="publication-footer"'), 'release controls must not share the author footnote row');
assert(index.includes('Furong Huang</a><sup>3,4</sup>') && index.includes('All Purpose AI'));
assert(index.includes('Dongjae Lee</a><sup>5&dagger;</sup>'));
const hero = index.match(/<section class="hero-film"[\s\S]*?<\/section>/)?.[0];
assert(hero?.includes('<h1>Fly-by-Code'));
assert(!hero.includes('hero-paper-title') && !hero.includes('Embodied Coding Agents'));
const titleAt = index.indexOf('<h2 class="publication-title">');
const authorAt = index.indexOf('<p class="ax-author-list">');
assert(titleAt > index.indexOf('<section class="ax-authors"') && titleAt < authorAt);
for (const size of ['1080p', '1440p']) assert(hero.includes('static/videos/hero-sequence-v6-' + size + '.mp4'));
assert(hero.includes('static/images/hero-sequence-v6.jpg'));
assert(hero.includes('Edited excerpts at five times speed.'));
assert(hero.includes('media="(max-width: 1023px)"') && hero.includes('muted loop playsinline'));
assert(!/hero-task|stage-number/.test(hero), 'hero task badge must stay removed');
assert(!/heroTask|heroStages|syncHeroStage|selectTab|\.site-header/.test(read('static/js/flight.js')), 'retired UI behavior remains');

// Check current .ax-* rules, not the unused styles of the former site layout.
// These are smoke checks; computed layout and interactions still need browser QA.
const responsive = read('static/css/responsive.css');
assert(index.includes('static/css/responsive.css?v=20261008-feedback6'));
assert(responsive.includes('grid-template-columns: minmax(0, 1fr) auto'), 'publication side controls missing');
assert(responsive.includes('@media (max-width: 1023px)'), 'narrow-screen publication layout missing');
assert(!responsive.includes('.hero-task'), 'unused hero task styling remains');
assert(responsive.includes('background: #f8f3e9') && responsive.includes('color: #655039'), 'demo instruction must use its own warm-neutral palette');
for (const token of ['--ax-copy: clamp(', '--ax-small: clamp(', 'svh', 'vw', '.ax-wrap { max-width: 1120px',
  '.ax-card .ax-media { width: 100%', '.ax-card .ax-media video { width: 100%; height: auto; max-height: none;', '.ov-canvas { min-width: 880px',
  '@media (max-width: 1439px)', 'position: sticky', 'overflow-x: auto',
  '@media (max-width: 760px)', '.ax-author-list { font-size: .875rem',
  '.ax-affil, .ax-author-note { font-size: .8125rem', 'aspect-ratio: 16 / 9; object-fit: contain']) {
  assert(responsive.includes(token), 'responsive rule missing: ' + token);
}
const nav = index.match(/<nav class="ax-rail"[\s\S]*?<\/nav>/)?.[0];
for (const section of ['top','method','real-world','tasks','results','case-studies']) assert(nav.includes('href="#' + section + '"'));
const tasks = index.match(/<section class="ax-section" id="tasks"[\s\S]*?<\/section>/)?.[0];
assert(tasks?.includes('static/images/tasks.jpg') && tasks.includes('<figcaption>'), 'Tasks image and explanation must stay together');
assert(index.indexOf(tasks) < index.indexOf('id="results"'), 'Tasks must precede Results');
assert(!/ov-(?:inset-)?pulse/.test(responsive + read('static/css/aspire.css')), 'recurring Method block pulse returned');
assert(responsive.includes('.ax-page .hero-copy { bottom: clamp(2.75rem, 6.5svh, 6rem)'), 'lower desktop title position missing');
assert(responsive.includes('font-size: 1.0625rem; min-height: 44px'), 'larger section rail text missing');
assert(index.includes('class="ov-scroll" tabindex="0" role="region"'));
assert(read('static/js/side-nav.js').includes("setAttribute('aria-current', 'location')"));

const overview = read('static/js/overview.js');
const timing = overview.match(/const FIRST = (\d+), HOLD = (\d+), RATE = ([\d.]+)/);
assert(timing, 'animation timing missing');
const seconds = (+timing[1] + +timing[2]) / 1000 + (8.0 - 4) / +timing[3];
assert(seconds > 1.5 && seconds < 4, 'diagram should build quickly but remain readable (1 s on screens 1 and 2)');
assert(overview.includes("querySelectorAll('.ov-hot')"));
assert(index.includes('Click a highlighted block for more details'));
// The diagram blocks themselves are the controls (the separate demo buttons were removed).
assert(!index.includes('class="ov-choices"'), 'separate demo buttons returned');
assert.equal([...index.matchAll(/class="ov-node [^"]*ov-hot/g)].length, 4);
const methodIntro = index.match(/<h2 id="method-title">([\s\S]*?)<div class="ov-figure/)?.[1];
assert(methodIntro && (methodIntro.match(/<p\b/g) || []).length <= 1, 'keep Method introduction concise (currently none)');
assert(methodIntro.replace(/<[^>]+>/g, '').trim().split(/\s+/).length < 40, 'keep the Method title and its two-sentence problem statement short');

// Method film: task instruction above the clip; the caption explains what an attempt is.
assert(index.includes('<p class="ov-task"><b>Task</b>') && index.includes('the final attempt (4 of 4) completes the task.</figcaption>'));
// View and Probe use matching ATTEMPT labels.
for (const video of ['method_loop','method_view_attempt_20261008','method_probe_attempt_20261008','k2_turn1','k2_af1','k2_turn2','align_af1','align_turn2']) {
  assert(index.includes('static/videos/' + video + '.mp4'), 'missing method/case video: ' + video);
}
assert(!index.includes('src="static/videos/method_probe.mp4"'), 'retired Probe clip returned');
assert(index.includes('using the door-opening portion of a successful task program.'));
assert.equal((index.match(/Cabinet door opening<\/figcaption>/g) || []).length, 2);
assert(!index.includes('task-program replay'));
assert(index.includes('poster="static/images/poster_method_probe_attempt_20261008.jpg"'));
for (const [id, basename] of [['cabinet-demo', 'real_cabinet_compact_20261008'], ['tools-demo', 'real_2objects_compact_20261008']]) {
  const card = index.match(new RegExp('<article[^>]+id="' + id + '"[\\s\\S]*?<\\/article>'))?.[0];
  assert(card?.includes('static/videos/' + basename + '.mp4'), 'long-film excerpt missing: ' + id);
  assert(card.includes('static/images/poster_' + basename + '.jpg'), 'excerpt poster mismatch: ' + id);
  assert(card.includes('eight times speed') && card.includes('ego camera, semantic map and task-program panels'), 'excerpt description mismatch: ' + id);
  assert(card.includes('width="1920" height="900"'), 'compact native aspect ratio missing: ' + id);
}
for (const section of ['view-case','probe-details','physical-outcomes']) {
  const tag = index.match(new RegExp('<details[^>]*id="' + section + '"[^>]*>'))?.[0];
  assert(tag && !/\sopen(?:\s|=|>)/.test(tag), 'disclosure should start closed: ' + section);
}
for (const figure of ['tasks.jpg','results_success.png','results_models.png']) assert(index.includes('static/images/' + figure));
for (const text of ['31.7%', '48.3%', '45 of 60']) assert(index.includes(text));
// The full abstract was replaced by a short TL;DR under the author list (it keeps the #abstract anchor).
assert(!index.includes('class="ax-abstract"'), 'abstract section returned');
const tldr = index.match(/<div class="ax-tldr" id="abstract">([\s\S]*?)<\/div>/)?.[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
assert(tldr?.startsWith('TL;DR'), 'TL;DR missing under the author list');
for (const text of ['diagnostic program', 'new viewpoints ( View ) and targeted physical tests ( Probe )', 'task outcomes and failure causes', 'task-program refinement']) assert(tldr.includes(text));
assert(index.includes('name="robots" content="noindex'));
assert(!index.includes('static/papers/') && !index.includes('Download MP4'));
assert(!index.includes('research-film-caption'));

// If the music-bearing SNS film is re-embedded, attribution must return as well.
if (index.includes('fly-by-code-sns-v11-1080p.mp4')) {
  const footer = index.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0] || '';
  for (const text of ['Royalty Free Music:', 'https://www.bensound.com', 'Artist: Benjamin Tissot', 'License code: 7XCGZP26MIZMBQZA']) {
    assert(footer.includes(text), 'missing music attribution: ' + text);
  }
}
// Parse each loaded local script and check its relative module dependencies.
for (const source of Object.values(html)) for (const [, script] of source.matchAll(/<script[^>]+src="([^"]+)"/g)) {
  const name = script.split('?')[0], js = read(name);
  const parsed = spawnSync(process.execPath, ['--input-type=module', '--check'], {input: js, encoding: 'utf8'});
  assert.equal(parsed.status, 0, name + ': ' + parsed.stderr);
  for (const [, specifier] of js.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    assert(fs.existsSync(path.resolve(root, path.dirname(name), specifier)), 'missing module: ' + specifier);
  }
}
console.log('PASS: ' + count + ' local references; unique IDs and ARIA targets; all public/legacy anchors.');
console.log('PASS: current responsive-layout smoke checks; quick diagram; hero v6; 13 authors, 11 homepages + coin-flip note.');
console.log('PASS: collaborator TL;DR/layout preserved; matching View/Probe labels + compact 8x real-world excerpts; closed disclosures; loaded scripts parse.');
console.log('Browser QA remains required for viewport geometry, navigation, diagram interactions and media playback.');
// Release buttons sit centred under the author note so the whole author block shares the page's centre axis.
assert(read('static/css/aspire.css').includes('.ax-authors .publication-layout{grid-template-columns:minmax(0,1fr)'), 'author block must stay single-column and centred');
