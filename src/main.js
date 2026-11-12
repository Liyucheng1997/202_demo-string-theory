import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createStrings } from './scenes/strings.js';
import { createWorldsheet } from './scenes/worldsheet.js';
import { createTDuality } from './scenes/tduality.js';
import { createCalabi } from './scenes/calabi.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// ───────── 渲染器 ─────────
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.dampingFactor = 0.06;
orbit.enablePan = false; orbit.minDistance = 2.5; orbit.maxDistance = 32;
orbit.autoRotate = true; orbit.autoRotateSpeed = 0.5;

const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.55, 0.12);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const insetCam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return; // 页面在后台以 0 尺寸加载时，等真正可见再初始化
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  // 窄屏时拉远，保证主体不被裁掉
  camera.fov = w / h < 1 ? 52 : 38;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ───────── 场景 ─────────
const scenes = [createStrings(), createWorldsheet(), createTDuality(), createCalabi()];
scenes.forEach(s => { s.group.visible = false; scene.add(s.group); });
let current = null;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { playing: !reduce, speed: 1 };

// 标签（投影到屏幕的 DOM）
const labelBox = $('#labels');
const labels = {};
const v3 = new THREE.Vector3();
const ctx = {
  get playing() { return state.playing; },
  placeLabel(id, world, dy = 0, html) {
    const e = labels[id]; if (!e) return;
    v3.copy(world).project(camera);
    e.style.transform = `translate(-50%,0) translate(${((v3.x + 1) / 2 * window.innerWidth).toFixed(1)}px,${((1 - v3.y) / 2 * window.innerHeight + dy).toFixed(1)}px)`;
    e.style.opacity = v3.z < 1 ? 1 : 0;
    if (html != null && e._h !== html) { e.innerHTML = html; e._h = html; }
  },
};

// 相机过渡
const camFrom = new THREE.Vector3(), camTo = new THREE.Vector3();
let camT = 1;

const nav = $('#nav');
scenes.forEach((s, i) => {
  const b = el('button', 'seg-btn', s.name);
  b.type = 'button';
  b.addEventListener('click', () => show(i));
  nav.appendChild(b);
});

const liveInputs = [];
let readoutEls = [], barEls = null;

function show(i) {
  if (current) current.group.visible = false;
  current = scenes[i];
  current.group.visible = true;
  [...nav.children].forEach((b, k) => b.classList.toggle('active', k === i));
  history.replaceState(null, '', '#' + current.id);
  bloom.strength = current.bloom;
  camFrom.copy(camera.position); camTo.fromArray(current.camera).multiplyScalar(camera.aspect < 1 ? 1.6 : 1); camT = 0; // 竖屏拉远
  orbit.target.fromArray(current.target);

  $('#title').textContent = current.title;
  $('#blurb').textContent = current.blurb;
  $('#eq').innerHTML = current.equation;
  $('#legend').hidden = !current.legend;

  labelBox.innerHTML = '';
  for (const k in labels) delete labels[k];
  (current.labels || []).forEach(l => { labels[l.id] = labelBox.appendChild(el('div', 'label', l.text)); });

  buildControls();
  buildReadouts();
  updateInsetCaption();
}

function buildControls() {
  const box = $('#ctrl-body');
  box.innerHTML = '';
  liveInputs.length = 0;
  const p = current.params;
  const rows = [];
  for (const c of current.controls) {
    const row = el('div', 'row');
    if (c.type === 'seg') {
      const seg = el('div', 'seg full');
      c.options.forEach(o => {
        const b = el('button', 'seg-btn' + (p[c.key] === o.value ? ' active' : ''), o.label);
        b.type = 'button';
        b.addEventListener('click', () => {
          p[c.key] = o.value;
          [...seg.children].forEach(x => x.classList.toggle('active', x === b));
          changed(c.key);
        });
        seg.appendChild(b);
      });
      row.appendChild(seg);
    } else {
      const fmt = c.format || (v => v.toFixed(2));
      const head = el('label', 'row-head'), out = el('output', '', fmt(p[c.key]));
      head.append(el('span', '', c.label), out);
      const input = el('input');
      Object.assign(input, { type: 'range', min: c.min, max: c.max, step: c.step, value: p[c.key] });
      input.setAttribute('aria-label', c.label);
      const paint = () => input.style.setProperty('--f', ((input.value - c.min) / (c.max - c.min) * 100) + '%');
      paint();
      input.addEventListener('input', () => { p[c.key] = Number(input.value); out.textContent = fmt(p[c.key]); paint(); changed(c.key); });
      row.append(head, input);
      if (c.live) liveInputs.push({ c, input, out, fmt, paint });
    }
    rows.push({ c, row });
    box.appendChild(row);
  }
  const vis = () => rows.forEach(({ c, row }) => { row.hidden = c.show ? !c.show(p) : false; });
  vis();
  function changed(key) { current.onParam && current.onParam(key); vis(); buildReadouts(); updateInsetCaption(); }
}

function buildReadouts() {
  const box = $('#readouts');
  box.innerHTML = '';
  readoutEls = current.readouts().map(r => {
    const d = el('div', 'ro'), v = el('strong', '', r.value);
    d.append(el('span', '', r.label), v);
    box.appendChild(d);
    return v;
  });
  const bb = $('#bars');
  bb.innerHTML = ''; barEls = null;
  bb.hidden = !current.bars;
  if (current.bars) {
    const b = current.bars();
    barEls = b.rows.map(r => {
      const row = el('div', 'bar-row'), lab = el('span', 'bar-label'), track = el('div', 'bar');
      const s1 = el('i', r.swap ? 'b' : 'a'), s2 = el('i', r.swap ? 'a' : 'b');
      track.append(s1, s2); row.append(lab, track); bb.appendChild(row);
      return { lab, s1, s2 };
    });
    bb.appendChild(el('div', 'bar-legend', `<span><i class="a"></i>${b.legend[0]}</span><span><i class="b"></i>${b.legend[1]}</span>`));
  }
}

function refreshReadouts() {
  const rs = current.readouts();
  if (rs.length !== readoutEls.length) return buildReadouts();
  rs.forEach((r, i) => {
    if (readoutEls[i].textContent !== r.value) readoutEls[i].textContent = r.value;
    readoutEls[i].classList.toggle('warn', !!r.warn);
  });
  if (barEls) current.bars().rows.forEach((r, i) => {
    barEls[i].lab.textContent = r.label;
    barEls[i].s1.style.flexGrow = r.parts[0]; barEls[i].s2.style.flexGrow = r.parts[1];
  });
  for (const l of liveInputs) {
    const v = current.params[l.c.key];
    if (document.activeElement !== l.input || state.playing) { l.input.value = v; l.paint(); }
    l.out.textContent = l.fmt(Math.min(l.c.max, Math.max(l.c.min, v)));
  }
}

const insetBox = $('#inset'), insetView = $('#inset-view');
function updateInsetCaption() {
  insetBox.hidden = !current.inset;
  if (current.inset) $('#inset-cap').innerHTML = current.inset.caption(current.params);
}

// ───────── 播放控制 ─────────
const playBtn = $('#play');
function setPlaying(p) {
  state.playing = p;
  orbit.autoRotate = p;
  playBtn.setAttribute('aria-pressed', String(!p));
  playBtn.setAttribute('aria-label', p ? '暂停' : '播放');
  playBtn.classList.toggle('paused', !p);
}
playBtn.addEventListener('click', () => setPlaying(!state.playing));
const speed = $('#speed');
speed.addEventListener('input', () => {
  state.speed = Number(speed.value);
  $('#speed-out').textContent = state.speed.toFixed(1) + '×';
  speed.style.setProperty('--f', ((speed.value - speed.min) / (speed.max - speed.min) * 100) + '%');
});
speed.dispatchEvent(new Event('input'));
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!state.playing); }
  const k = Number(e.key);
  if (k >= 1 && k <= scenes.length) show(k - 1);
});
if (window.innerWidth < 760) document.body.classList.add('compact'); // 窄屏默认收起说明，把画面让出来
$('#info-toggle').addEventListener('click', () => document.body.classList.toggle('compact'));
canvas.addEventListener('pointerdown', () => { orbit.autoRotate = false; });

// ───────── 主循环 ─────────
let last = performance.now(), roT = 0;
function frame(now) {
  tick(now);
  requestAnimationFrame(frame);
}
function tick(now) {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dt = state.playing ? raw * state.speed : 0;

  if (camT < 1) {
    camT = Math.min(1, camT + raw / 0.9);
    const e = 1 - Math.pow(1 - camT, 3);
    camera.position.lerpVectors(camFrom, camTo, e);
  }
  orbit.update();
  current.update(dt, ctx);
  composer.render();

  if (current.inset && !insetBox.hidden) {
    const r = insetView.getBoundingClientRect(), H = window.innerHeight;
    if (r.width > 0) {
    insetCam.position.copy(camera.position).sub(orbit.target).setLength(4.2);
    insetCam.quaternion.copy(camera.quaternion);
    renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
    renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(current.inset.scene, insetCam);
    renderer.autoClear = ac;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, H);
    }
  }

  roT += raw;
  if (roT > 0.1) { roT = 0; refreshReadouts(); }
}
// 调试/截图用：不依赖 requestAnimationFrame 手动推进若干帧
window.__viz = { renderer, composer, scene, camera, bloom, orbit, get current() { return current; }, step(n = 1, ms = 16) { for (let i = 0; i < n; i++) { last = performance.now() - ms; tick(performance.now()); } } };

resize();
camera.position.set(3, 2, 9);
setPlaying(state.playing);
const start = Math.max(0, scenes.findIndex(s => '#' + s.id === location.hash));
show(start);
requestAnimationFrame(frame);
