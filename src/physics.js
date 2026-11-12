// 纯物理/数学函数：不依赖渲染，可在 Node 里直接做数值校验（见 test/）。
// 单位：c = 1；开弦 σ∈[0,π]，闭弦 σ∈[0,2π]。

// ───────── 1. Nambu–Goto 弦在平直时空中的精确解 ─────────
// 共形规范 + 静态规范 (X⁰ = τ) 下，运动方程是波动方程，Virasoro 约束变为
//   Ẋ·X′ = 0,  Ẋ² + X′² = 1
// 通解 X = ½[a(σ−τ) + b(σ+τ)]，其中 |a′| = |b′| = 1。
// 这里取 Kibble–Turok 曲线族作为 a、b。

/** a(s)：|a′| ≡ 1，周期 2π，质心静止 */
export function ktA(s, alpha, o) {
  const k = 2 * Math.sqrt(alpha * (1 - alpha));
  o[0] = (1 - alpha) * Math.sin(s) + (alpha / 3) * Math.sin(3 * s);
  o[1] = -(1 - alpha) * Math.cos(s) - (alpha / 3) * Math.cos(3 * s);
  o[2] = -k * Math.cos(s);
  return o;
}
export function ktAp(s, alpha, o) {
  const k = 2 * Math.sqrt(alpha * (1 - alpha));
  o[0] = (1 - alpha) * Math.cos(s) + alpha * Math.cos(3 * s);
  o[1] = (1 - alpha) * Math.sin(s) + alpha * Math.sin(3 * s);
  o[2] = k * Math.sin(s);
  return o;
}
/** b(s)：|b′| ≡ 1 */
export function ktB(s, phi, o) {
  o[0] = Math.sin(s);
  o[1] = -Math.cos(phi) * Math.cos(s);
  o[2] = -Math.sin(phi) * Math.cos(s);
  return o;
}
export function ktBp(s, phi, o) {
  o[0] = Math.cos(s);
  o[1] = Math.cos(phi) * Math.sin(s);
  o[2] = Math.sin(phi) * Math.sin(s);
  return o;
}

const _p = [0, 0, 0], _q = [0, 0, 0];

/**
 * 弦上一点的位置与速率。
 * 开弦（Neumann 边界）：X = ½[a(τ+σ) + a(τ−σ)]，端点速率恒为 1（光速）。
 * 闭弦：X = ½[a(σ−τ) + b(σ+τ)]，a′ = −b′ 处出现尖点，瞬时达到光速。
 * 返回速率 |Ẋ|，位置写入 out[off..off+2]。
 */
export function stringPoint(kind, sigma, tau, alpha, phi, out, off = 0) {
  if (kind === 'open') {
    const u = tau + sigma, v = tau - sigma;
    ktA(u, alpha, _p); ktA(v, alpha, _q);
    out[off] = 0.5 * (_p[0] + _q[0]);
    out[off + 1] = 0.5 * (_p[1] + _q[1]);
    out[off + 2] = 0.5 * (_p[2] + _q[2]);
    ktAp(u, alpha, _p); ktAp(v, alpha, _q);
    const d = _p[0] * _q[0] + _p[1] * _q[1] + _p[2] * _q[2];
    return Math.sqrt(Math.max(0, 0.5 * (1 + d)));
  }
  const u = sigma - tau, v = sigma + tau;
  ktA(u, alpha, _p); ktB(v, phi, _q);
  out[off] = 0.5 * (_p[0] + _q[0]);
  out[off + 1] = 0.5 * (_p[1] + _q[1]);
  out[off + 2] = 0.5 * (_p[2] + _q[2]);
  ktAp(u, alpha, _p); ktBp(v, phi, _q);
  const d = _p[0] * _q[0] + _p[1] * _q[1] + _p[2] * _q[2];
  return Math.sqrt(Math.max(0, 0.5 * (1 - d)));
}

// ───────── 2. 世界面：闭弦一分为二（光锥图 / Mandelstam 映射）─────────
// ρ = ln(z² − 1)，世界面时间 t = Re ρ = ln|z² − 1|。
// 等时线 |z² − 1| = c 是 Cassini 卵形线：c > 1 一条闭曲线，c < 1 两条，c = 1 为双纽线。
// 嵌入三维时对每个等时线做与 θ 无关的缩放/平移，使三条"腿"在远处成为等粗圆筒
//（周长比 2:1:1，对应光锥动量 p⁺ 守恒）。拓扑与等时线形状保持不变。

/** Cassini 卵形线上的点 z（复数），满足 z² − 1 = c·e^{iθ}。
 *  part = 0：c ≥ 1，θ∈[0,4π] 绕一整圈；part = ±1：c ≤ 1 的右/左分支，θ∈[−π,π]。 */
export function cassini(part, c, theta, o) {
  let arg, mod;
  const re = 1 + c * Math.cos(theta), im = c * Math.sin(theta);
  mod = Math.sqrt(Math.hypot(re, im));
  if (part === 0) {
    // 1 + c e^{iθ} = e^{iθ}(c + e^{−iθ})，c>1 时辐角连续
    arg = 0.5 * (theta + Math.atan2(-Math.sin(theta), c + Math.cos(theta)));
    o[0] = mod * Math.cos(arg); o[1] = mod * Math.sin(arg);
  } else {
    arg = 0.5 * Math.atan2(im, re);
    o[0] = part * mod * Math.cos(arg); o[1] = part * mod * Math.sin(arg);
  }
  return o;
}

const _z = [0, 0];
export const PANTS_H = 1.15; // 每单位共形时间对应的高度

/** 裤子面上的点 (x, y=时间向上, z)。t = ln c，时间向未来 = t 减小 = y 增大。 */
export function pantsPoint(part, t, theta, o) {
  const c = Math.exp(t);
  cassini(part, c, theta, _z);
  const B = t >= 0 ? Math.exp(-t / 2) : Math.exp(-t / 2 - (t / 2) * (1 - Math.exp(t)));
  const D = t >= 0 ? B : 1 - t / 2; // 腿的中心位置（t≥0 时无平移）
  const s = part === 0 ? 0 : part;
  o[0] = _z[0] * B + s * (D - B);
  o[1] = -t * PANTS_H;
  o[2] = _z[1] * B;
  return o;
}

// ───────── 3. T 对偶 ─────────
// 闭弦在半径 R 的圆上：M² = (n/R)² + (wR/α′)² + (2/α′)(N + Ñ − 2)，N − Ñ = n·w。
// 取 α′ = 1。R → 1/R 且 n ↔ w 时谱不变。
export function mass2Parts(n, w, R) {
  return [(n / R) ** 2, (w * R) ** 2];
}

// ───────── 4. Calabi–Yau 截面 ─────────
// 费马超曲面 z₁ⁿ + z₂ⁿ = 1 (Hanson 参数化)：
//   z₁ = e^{2πi k₁/n} cosh(a+ib)^{2/n},  z₂ = e^{2πi k₂/n} (−i sinh(a+ib))^{2/n}
// a∈ℝ, b∈[0,π/2], k₁,k₂ = 0..n−1。输出 [Re z₁, Im z₁, Re z₂, Im z₂]。
export function fermatPoint(n, k1, k2, a, b, o, off = 0) {
  const ch = Math.cosh(a), sh = Math.sinh(a), cb = Math.cos(b), sb = Math.sin(b);
  // cosh(a+ib)
  const c_re = ch * cb, c_im = sh * sb;
  // −i·sinh(a+ib) = cosh a sin b − i sinh a cos b
  const s_re = ch * sb, s_im = -sh * cb;
  const p = 2 / n;
  const r1 = Math.pow(Math.hypot(c_re, c_im), p), t1 = p * Math.atan2(c_im, c_re) + (2 * Math.PI * k1) / n;
  const r2 = Math.pow(Math.hypot(s_re, s_im), p), t2 = p * Math.atan2(s_im, s_re) + (2 * Math.PI * k2) / n;
  o[off] = r1 * Math.cos(t1); o[off + 1] = r1 * Math.sin(t1);
  o[off + 2] = r2 * Math.cos(t2); o[off + 3] = r2 * Math.sin(t2);
  return o;
}
