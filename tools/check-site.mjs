import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'research.html'];
const html = Object.fromEntries(pages.map(name => [name, fs.readFileSync(path.join(root,name),'utf8')]));
const ids = {};
for (const [name,source] of Object.entries(html)) {
  const found = [...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(found.length, new Set(found).size, `${name}: duplicate IDs`);
  ids[name] = new Set(found);
  assert(!/ICLR|double.blind|under.{0,15}review|Anonymous Authors/i.test(source), `${name}: conference/review disclosure`);
  assert.equal((source.match(/class="author-names"/g)||[]).length,1,`${name}: author block`);
  for (const author of ['Jaewoo Lee','Jeongyeon Seo','Sihyun Cho','Gyeongrak Choe','Yutong Wang','Bavin Saravanan','Jia-Bin Huang','Furong Huang','Sebastian Scherer','Guanya Shi','H. Jin Kim','Seungjae Lee','Dongjae Lee']) {
    assert(source.includes(`${author}<sup>`),`${name}: missing author ${author}`);
  }
}
let count=0;
for (const [name,source] of Object.entries(html)) {
  for (const match of source.matchAll(/\b(?:src|poster|href)="([^"]+)"/g)) {
    const url=match[1];
    if (/^(https?:|data:|mailto:)/.test(url)) continue;
    const [file,fragment]=url.split('#');
    const target=file||name;
    assert(fs.existsSync(path.join(root,target)),`${name}: missing file ${target}`);
    if (fragment && ids[target]) assert(ids[target].has(fragment),`${name}: missing anchor ${target}#${fragment}`);
    count++;
  }
}
assert(html['index.html'].includes('31.7'),'baseline missing');
assert(html['index.html'].includes('48.3'),'trace baseline missing');
assert(html['index.html'].includes('45 of 60'),'AF denominator missing');
assert(html['index.html'].includes('static/videos/hero-sequence-1440p.mp4'),'high-resolution desktop hero missing');
assert(html['index.html'].includes('static/videos/hero-sequence-1080p.mp4'),'smaller-screen hero missing');
assert(html['index.html'].includes('media="(max-width: 1023px)"'),'hero media breakpoint missing');
assert(html['index.html'].includes('poster="static/images/hero-sequence.jpg"'),'high-resolution poster missing');
for (const name of pages) assert(html[name].includes('static/papers/fly-by-code_preprint.pdf'),`${name}: preprint link missing`);
for (const name of ['flight.css','research.css']) {
  const css=fs.readFileSync(path.join(root,'static/css',name),'utf8');
  assert(!/Georgia|Times New Roman|var\(--serif\)/.test(css),`${name}: decorative serif reintroduced`);
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert(Number(m[1])>=15,`${name}: font below 15px`);
}
console.log(`PASS: ${pages.length} pages; ${count} local references; unique IDs; all 13 authors; no conference/review disclosure.`);
