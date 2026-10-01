import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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
  if (name === 'index.html') {
    assert.equal((source.match(/class="author-names"/g)||[]).length,1,`${name}: author block`);
    for (const author of ['Jaewoo Lee','Jeongyeon Seo','Sihyun Cho','Gyeongrak Choe','Yutong Wang','Bavin Saravanan','Jia-Bin Huang','Furong Huang','Sebastian Scherer','Guanya Shi','H. Jin Kim','Seungjae Lee','Dongjae Lee']) {
      assert(source.includes(`${author}<sup>`),`${name}: missing author ${author}`);
    }
  }
}
let count=0;
for (const [name,source] of Object.entries(html)) {
  for (const match of source.matchAll(/\b(?:src|poster|href)="([^"]+)"/g)) {
    const url=match[1];
    if (/^(https?:|data:|mailto:)/.test(url)) continue;
    const [file,fragment]=url.split('#');
    const target=file.split('?')[0]||name;
    assert(fs.existsSync(path.join(root,target)),`${name}: missing file ${target}`);
    if (fragment && ids[target]) assert(ids[target].has(fragment),`${name}: missing anchor ${target}#${fragment}`);
    count++;
  }
}
assert(html['index.html'].includes('31.7'),'baseline missing');
assert(/<nav[^>]*>[\s\S]*?<a href="#video">Video<\/a>/.test(html['index.html']),'Video navigation missing');
assert(ids['index.html'].has('video'),'research-film section missing');
const researchVideo=html['index.html'].match(/<video\b[^>]*id="research-video"[^>]*>/)?.[0];
assert(researchVideo,'research-film player missing');
for (const attribute of ['controls','playsinline','preload="none"','width="1920"','height="1080"']) assert(researchVideo.includes(attribute),`research-film player missing ${attribute}`);
assert(!/\b(?:autoplay|loop)\b/.test(researchVideo),'full film must not autoplay or loop');
const filmPath=path.join(root,'static/videos/fly-by-code-film-v12-1080p.mp4');
assert(html['index.html'].includes('src="static/videos/fly-by-code-film-v12-1080p.mp4"') && researchVideo.includes('poster="static/images/research-film-v12.jpg"'),'research film and poster must both use v12');
assert(fs.statSync(filmPath).size>1_000_000,'research-film asset is empty or incomplete');
assert(fs.statSync(filmPath).size<100*1024*1024,'research-film asset exceeds the GitHub file limit');
assert(!html['index.html'].includes('research-film-caption'),'removed film metadata row returned');
assert(!html['index.html'].includes('Download MP4'),'removed download link returned');
assert(researchVideo.includes('aria-describedby="research-film-description"') && ids['index.html'].has('research-film-description'),'film description reference is missing');
assert(html['index.html'].includes('48.3'),'trace baseline missing');
assert(html['index.html'].includes('45 of 60'),'AF denominator missing');
assert(html['index.html'].includes('static/videos/hero-sequence-v5-1440p.mp4'),'high-resolution desktop hero missing');
assert(html['index.html'].includes('static/videos/hero-sequence-v5-1080p.mp4'),'smaller-screen hero missing');
assert(html['index.html'].includes('<p>Embodied coding agents for real-world aerial manipulation.</p>'),'hero sentence should not contain a forced line break');
assert(html['index.html'].includes('class="hero-location-title">Real-world Aerial Manipulation</span>'),'hero location capitalization is incorrect');
assert(html['index.html'].includes('At SNU’s Siheung Laboratory'),'laboratory location missing');
assert(!/Research(?: project)? \/ 2026/i.test(html['index.html']),'old research stamp remains');
assert(html['index.html'].includes('Task code made by'),'task-code attribution missing');
assert(html['index.html'].includes('Claude Code · Opus 5'),'coding-agent attribution missing');
assert(html['index.html'].includes('Onboard ego RGB-D only'),'visual-input qualification missing');
assert(!html['index.html'].includes('No hard-coded object coordinates'),'removed hero fact remains');
assert(html['index.html'].includes('id="hero-stage-label"'),'video action label missing');
assert(html['index.html'].includes('media="(max-width: 1023px)"'),'hero media breakpoint missing');
assert(html['index.html'].includes('poster="static/images/hero-sequence.jpg"'),'high-resolution poster missing');
assert(html['index.html'].includes('static/papers/fly-by-code_preprint.pdf'),'preprint link missing');
assert(!html['index.html'].includes('research.html'),'separate research-page link remains');
assert(html['research.html'].includes('static/js/research-redirect.js'),'legacy redirect missing');
for (const section of ['view-case','probe-details','method','physical-outcomes','evaluation','tasks','abstract']) {
  const tag=html['index.html'].match(new RegExp(`<details[^>]*id="${section}"[^>]*>`))?.[0];
  assert(tag,`missing inline disclosure: ${section}`);
  assert(!/\sopen(?:\s|=|>)/.test(tag),`detail should initially be collapsed: ${section}`);
}
for (const figure of ['method.png','tasks.jpg','results_success.png','results_models.png']) {
  assert(html['index.html'].includes(`static/images/${figure}`),`missing main-page figure: ${figure}`);
}
for (const video of ['k2_turn1','k2_af1','k2_turn2','align_af1','align_turn2']) {
  assert(html['index.html'].includes(`static/videos/${video}.mp4`),`missing case video: ${video}`);
}
for (const name of ['flight.css','home.css']) {
  const css=fs.readFileSync(path.join(root,'static/css',name),'utf8');
  assert(!/Georgia|Times New Roman|var\(--serif\)/.test(css),`${name}: decorative serif reintroduced`);
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert(Number(m[1])>=15,`${name}: font below 15px`);
}
const homeCss=fs.readFileSync(path.join(root,'static/css/home.css'),'utf8');
assert(/\.hero-location-title\{[^}]*text-transform:none/.test(homeCss),'hero location capitalization must not be overridden by uppercase CSS');
for (const token of ['--copy-size','--copy-compact-size']) {
  const rule=homeCss.match(new RegExp(`${token}:([^;]+)`))?.[1];
  assert(rule?.startsWith('clamp(.9375rem,') && rule.includes('vw') && rule.includes('svh'),`${token}: descriptions must scale with the viewport with a 15px-equivalent minimum`);
}
for (const selector of ['.research-film-heading>p','.feedback-heading>p','.compact-heading>p','.abstract-copy p']) {
  const rule=homeCss.slice(homeCss.indexOf(`${selector}{`)).split('}')[0];
  assert(rule.includes('font-size:var(--copy-size)'),`${selector}: fluid description size missing`);
}
for (const selector of ['.case-summary>span:last-child','.detail-body','.concise-flight .demo-caption p','.task-key dd']) {
  const rule=homeCss.slice(homeCss.indexOf(`${selector}{`)).split('}')[0];
  assert(rule.includes('font-size:var(--copy-compact-size)'),`${selector}: fluid compact description size missing`);
}
for (const token of ['--film-height:', '--demo-height:', 'calc(var(--film-height) * 16 / 9)', 'calc(var(--demo-height) * 16 / 9)']) assert(homeCss.includes(token),`viewport-fitted video layout missing: ${token}`);
assert(!/\.research-film-heading\s*,\s*\.research-film-player/.test(homeCss),'film heading must not inherit the player width limit');
assert(/--hero-title-size:\s*clamp\([^;]*min\([^;]*vw[^;]*svh/.test(homeCss),'hero title must account for viewport width AND height');
assert(/--hero-support-size:\s*clamp\([^;]*min\([^;]*vw[^;]*svh/.test(homeCss),'hero supporting text must account for viewport width AND height');
assert(/\.hero-copy h1\{font-size:var\(--hero-title-size\)/.test(homeCss),'responsive hero title token is not applied');
assert(/@media\(min-width:761px\)/.test(homeCss),'landscape hero sizing must preserve the portrait layout');
console.log(`PASS: single-page content + legacy redirect; ${count} local references; unique IDs; all 13 authors; seven closed disclosures; graphs and case videos retained; no conference/review disclosure.`);
console.log('PASS: width/height-aware hero typography with bounded sizes; portrait layout retained.');

// Exercise the actual synchronization code, including backwards seeks/looping.
const flight=fs.readFileSync(path.join(root,'static/js/flight.js'),'utf8');
const syncSource=flight.slice(flight.indexOf('const heroStages'),flight.indexOf('function safelyPlay'));
const stageFields={'#hero-stage-number':{},'#hero-stage-label':{}};
const stage={hidden:true,querySelector:selector=>stageFields[selector]};
const video={currentTime:0,addEventListener:()=>{}};
const context=vm.createContext({hero:video,document:{querySelector:()=>stage}});
vm.runInContext(syncSource,context);
for (const [time,label] of [[0,'Grasp hammer'],[8.99,'Grasp hammer'],[9,'Place hammer'],[14.99,'Place hammer'],[15,'Open left door'],[24,'Open right door'],[33,'Grasp bottle'],[40,'Carry bottle'],[45,'Place bottle'],[48.99,'Place bottle'],[0,'Grasp hammer'],[24,'Open right door']]) {
  vm.runInContext(`syncHeroStage(${time})`,context);
  assert.equal(stageFields['#hero-stage-label'].textContent,label,`wrong hero label at ${time}s`);
  assert.equal(stage.hidden,false);
}
console.log('PASS: hero stage boundaries, seek, and loop reset.');
