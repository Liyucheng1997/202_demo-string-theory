// 数值校验：画面上的每个对象都确实满足它声称的方程。
import test from 'node:test';
import assert from 'node:assert/strict';
import { ktAp, ktBp, stringPoint, cassini, pantsPoint, mass2Parts, fermatPoint } from '../src/physics.js';

const h = 1e-4;
const X = (kind, s, t, al, ph) => { const o = [0, 0, 0]; stringPoint(kind, s, t, al, ph, o); return o; };
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

test('|a′| = |b′| = 1', () => {
  const o = [0, 0, 0];
  for (let i = 0; i < 200; i++) {
    const s = i * 0.0731, al = (i % 11) / 10, ph = (i % 7) * 0.5;
    assert.ok(Math.abs(Math.hypot(...ktAp(s, al, o)) - 1) < 1e-12);
    assert.ok(Math.abs(Math.hypot(...ktBp(s, ph, o)) - 1) < 1e-12);
  }
});

for (const kind of ['open', 'closed']) {
  test(`${kind}: 波动方程 + Virasoro 约束 + 速率 ≤ c`, () => {
    const L = kind === 'open' ? Math.PI : 2 * Math.PI;
    for (let i = 0; i < 400; i++) {
      const s = 0.05 + ((i * 0.6180339) % 1) * (L - 0.1), t = i * 0.137;
      const al = ((i * 7) % 10) / 10 + 0.03, ph = ((i * 3) % 10) * 0.31;
      const x0 = X(kind, s, t, al, ph);
      const xt = sub(X(kind, s, t + h, al, ph), X(kind, s, t - h, al, ph)).map(v => v / (2 * h));
      const xs = sub(X(kind, s + h, t, al, ph), X(kind, s - h, t, al, ph)).map(v => v / (2 * h));
      const xtt = X(kind, s, t + h, al, ph).map((v, k) => (v - 2 * x0[k] + X(kind, s, t - h, al, ph)[k]) / h / h);
      const xss = X(kind, s + h, t, al, ph).map((v, k) => (v - 2 * x0[k] + X(kind, s - h, t, al, ph)[k]) / h / h);
      assert.ok(Math.hypot(...sub(xtt, xss)) < 1e-5, '波动方程');
      assert.ok(Math.abs(dot(xt, xs)) < 1e-6, 'Ẋ·X′ = 0');
      assert.ok(Math.abs(dot(xt, xt) + dot(xs, xs) - 1) < 1e-6, 'Ẋ²+X′² = 1');
      const v = stringPoint(kind, s, t, al, ph, [0, 0, 0]);
      assert.ok(Math.abs(v - Math.hypot(...xt)) < 1e-6, '解析速率');
      assert.ok(v <= 1 + 1e-12, '不超光速');
    }
  });
}

test('开弦：Neumann 边界，端点以光速运动', () => {
  for (let i = 0; i < 100; i++) {
    const t = i * 0.21, al = (i % 10) / 10;
    for (const s of [0, Math.PI]) {
      const xs = sub(X('open', s + h, t, al, 0), X('open', s - h, t, al, 0)).map(v => v / (2 * h));
      assert.ok(Math.hypot(...xs) < 1e-6);
      assert.ok(Math.abs(stringPoint('open', s, t, al, 0, [0, 0, 0]) - 1) < 1e-12);
    }
  }
});

test('闭弦：σ 周期 2π，时间周期 π', () => {
  for (let i = 0; i < 100; i++) {
    const s = i * 0.3, t = i * 0.17, al = 0.4, ph = 1.1;
    assert.ok(Math.hypot(...sub(X('closed', s, t, al, ph), X('closed', s + 2 * Math.PI, t, al, ph))) < 1e-12);
    assert.ok(Math.hypot(...sub(X('closed', s, t, al, ph), X('closed', s + Math.PI, t + Math.PI, al, ph))) < 1e-12);
  }
});

test('Cassini 卵形线：|z²−1| = c，且三片在 c=1 处吻合', () => {
  const z = [0, 0];
  for (const part of [0, 1, -1]) for (let i = 0; i < 300; i++) {
    const c = part === 0 ? 1 + (i % 17) * 0.4 : 0.03 + (i % 17) * 0.057;
    const th = part === 0 ? (i / 300) * 4 * Math.PI : -Math.PI + (i / 300) * 2 * Math.PI;
    cassini(part, c, th, z);
    const re = z[0] * z[0] - z[1] * z[1] - 1, im = 2 * z[0] * z[1];
    assert.ok(Math.abs(Math.hypot(re, im) - c) < 1e-9);
    assert.ok(Math.abs(Math.atan2(im, re) - Math.atan2(Math.sin(th), Math.cos(th))) < 1e-7 || Math.abs(Math.abs(th % (2 * Math.PI)) - Math.PI) < 1e-3);
  }
  const p = [0, 0, 0], q = [0, 0, 0];
  for (let i = 1; i < 100; i++) {
    const th = -Math.PI + (i / 100) * 2 * Math.PI;
    pantsPoint(0, 0, th, p); pantsPoint(1, 0, th, q);
    assert.ok(Math.hypot(...sub(p, q)) < 1e-9);
    pantsPoint(0, 0, th + 2 * Math.PI, p); pantsPoint(-1, 0, th, q);
    assert.ok(Math.hypot(...sub(p, q)) < 1e-9);
  }
});

test('裤子面：远处是等粗圆筒，周长比 2:1:1', () => {
  const p = [0, 0, 0], q = [0, 0, 0];
  pantsPoint(0, 4, 0, p); pantsPoint(0, 4, 2 * Math.PI, q);
  assert.ok(Math.abs(Math.hypot(p[0] - q[0], p[2] - q[2]) / 2 - 1) < 0.02);
  pantsPoint(1, -4, 0, p); pantsPoint(1, -4, Math.PI, q);
  assert.ok(Math.abs(Math.hypot(p[0] - q[0], p[2] - q[2]) / 2 - 0.5) < 0.02);
});

test('T 对偶：R→1/R, n↔w 谱不变', () => {
  for (let n = -3; n <= 3; n++) for (let w = -3; w <= 3; w++) for (const R of [0.3, 0.77, 1, 1.9]) {
    const [a, b] = mass2Parts(n, w, R), [c, d] = mass2Parts(w, n, 1 / R);
    assert.ok(Math.abs(a + b - c - d) < 1e-12);
    assert.ok(Math.abs(a - d) < 1e-12 && Math.abs(b - c) < 1e-12);
  }
});

test('Calabi–Yau 截面：z₁ⁿ + z₂ⁿ = 1', () => {
  const o = [0, 0, 0, 0];
  const cpow = (re, im, n) => { const r = Math.hypot(re, im) ** n, t = Math.atan2(im, re) * n; return [r * Math.cos(t), r * Math.sin(t)]; };
  for (const n of [3, 4, 5]) for (let k1 = 0; k1 < n; k1++) for (let k2 = 0; k2 < n; k2++) for (let i = 0; i < 30; i++) {
    fermatPoint(n, k1, k2, -1 + (i % 6) * 0.4, ((i * 0.37) % 1) * Math.PI / 2, o);
    const p = cpow(o[0], o[1], n), q = cpow(o[2], o[3], n);
    assert.ok(Math.hypot(p[0] + q[0] - 1, p[1] + q[1]) < 1e-9);
  }
});
