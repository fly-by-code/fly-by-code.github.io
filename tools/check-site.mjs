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
  assert(authors.includes('<span>' + name), 'missing author: ' + name);
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
assert(index.includes('Furong Huang<sup>3,4</sup>') && index.includes('All Purpose AI'));
assert(index.includes('Dongjae Lee<sup>5&dagger;</sup>'));
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
for (const section of ['top','method','real-world','tasks','results','case-studies','abstract']) assert(nav.includes('href="#' + section + '"'));
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
const seconds = (+timing[1] + +timing[2]) / 1000 + (7.4 - 4) / +timing[3];
assert(seconds > 1.5 && seconds < 3, 'diagram should build quickly but remain readable');
assert(overview.includes("querySelectorAll('.ov-hot, .ov-choice')"));
assert(index.includes('Click a highlighted block to view details'));
assert.equal([...index.matchAll(/class="ov-choice(?: view| probe)?"/g)].length, 3);
const methodIntro = index.match(/<h2 id="method-title">([\s\S]*?)<div class="ov-figure/)?.[1];
assert(methodIntro && (methodIntro.match(/<p\b/g) || []).length === 1, 'keep Method introduction concise');
assert(methodIntro.replace(/<[^>]+>/g, '').trim().split(/\s+/).length < 25);

// Method film text is deliberately unchanged per the current user instruction.
assert(index.includes('One simulated Cabinet trial: attempt, View, attempt, Probe, refine, success</figcaption>'));
for (const video of ['method_loop','method_view','method_probe','k2_turn1','k2_af1','k2_turn2','align_af1','align_turn2']) {
  assert(index.includes('static/videos/' + video + '.mp4'), 'missing method/case video: ' + video);
}
for (const section of ['view-case','probe-details','physical-outcomes']) {
  const tag = index.match(new RegExp('<details[^>]*id="' + section + '"[^>]*>'))?.[0];
  assert(tag && !/\sopen(?:\s|=|>)/.test(tag), 'disclosure should start closed: ' + section);
}
for (const figure of ['tasks.jpg','results_success.png','results_models.png']) assert(index.includes('static/images/' + figure));
for (const text of ['31.7%', '48.3%', '45 of 60', '25 to 5', '60 trials per condition']) assert(index.includes(text));
const abstract = index.match(/<div class="ax-abstract"><p>([\s\S]*?)<\/p>/)?.[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
assert(abstract?.startsWith('Embodied coding agents construct robot policies'));
for (const text of ['When execution feedback leaves unresolved questions', 'restrict onboard camera coverage',
  'test hypotheses about failure causes', 'without task-program source-code modification']) assert(abstract.includes(text));
assert(!abstract.includes('physically demanding settings'));
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
console.log('PASS: current responsive-layout smoke checks; quick diagram; hero v6; 13 authors + coin-flip note.');
console.log('PASS: latest abstract markers; captions/media preserved; closed disclosures; loaded scripts parse.');
console.log('Browser QA remains required for viewport geometry, navigation, diagram interactions and media playback.');
