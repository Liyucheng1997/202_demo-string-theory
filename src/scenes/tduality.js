// 场景 3：T 对偶 —— 半径 R 与 1/R 的卷曲维度无法区分
import { THREE, FatLine } from '../util.js';
import { mass2Parts } from '../physics.js';

const N = 480, H = 3.0, GAP = 2.4;

function makeSide() {
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, H, 96, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float fres = pow(clamp(1.-abs(dot(normalize(vN),normalize(vV))),0.,1.),2.5);
        float ga = smoothstep(.9,.99,abs(fract(vUv.x*24.)-.5)*2.);
        float gb = smoothstep(.92,.99,abs(fract(vUv.y*8.)-.5)*2.);
        float edge = smoothstep(.0,.5,vUv.y)*smoothstep(1.,.5,vUv.y);
        gl_FragColor = vec4(vec3(.35,.4,.5)*(.05+.35*fres+.12*max(ga,gb))*edge,1.);
      }`,
  }));
  const line = new FatLine(N + 1, { width: 3, vertexColors: false, color: 0xffffff });
  line.material.color.setRGB(0.5, 1.1, 2.2);
  g.add(cyl, line.object);
  return { g, cyl, line, theta0: 0 };
}

/** 把弦画到半径 R 的圆柱面上（圆柱是平直的，平直空间的解在其上依然是解） */
function drawString(side, R, n, w, tau, dt) {
  const { line } = side;
  side.theta0 += dt * 0.9 * n / (R * R); // 绕圈的动量 p = n/R
  const aw = Math.abs(w);
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * 2 * Math.PI;
    let th, y, rho = R * 1.012;
    if (w === 0) {
      // 不缠绕：圆柱面上一个脉动的小闭弦，整体沿圆周漂移
      const r = 0.3 * Math.cos(tau * 1.6);
      th = side.theta0 + (r * Math.sin(s)) / R;
      y = r * Math.cos(s);
    } else {
      // 缠绕 w 圈；若同时有动量，能级匹配 N−Ñ = n·w 要求弦上必须有行波
      th = w * s + side.theta0;
      // 取 |nw| 个最低模（模数 1）的量子：左行或右行由 nw 的符号决定
      y = n !== 0 ? 0.2 * Math.sqrt(Math.abs(n * w)) * Math.cos(s - Math.sign(n * w) * tau * 2.2) : 0;
      if (aw > 1) rho += 0.08 * Math.cos(s); // 仅为把重叠的几圈分开显示
    }
    line.pos[i * 3] = rho * Math.cos(th);
    line.pos[i * 3 + 1] = y;
    line.pos[i * 3 + 2] = rho * Math.sin(th);
  }
  line.flush();
}

export function createTDuality() {
  const group = new THREE.Group();
  const params = { logR: 0.45, n: 1, w: 2 };
  const A = makeSide(), B = makeSide();
  group.add(A.g, B.g);
  group.position.y = 0.7;
  let tau = 0;
  const wp = new THREE.Vector3();

  return {
    id: 'tduality', name: 'T 对偶',
    title: '大与小是同一回事',
    blurb: '弦既能沿卷曲维度运动（动量 n），也能缠住它（缠绕数 w）。把半径 R 换成 α′/R、再交换 n 和 w，质量谱一模一样——点粒子做不到这一点。',
    equation: '<i>M</i>² = (<i>n</i>/<i>R</i>)² + (<i>wR</i>/α′)² + 振子项',
    group, params, camera: [0, 2.4, 12.5], target: [0, 0, 0], bloom: 0.75,
    controls: [
      { type: 'range', key: 'logR', label: '半径 R', min: -0.7, max: 0.7, step: 0.005, format: v => Math.exp(v).toFixed(2) + ' √α′' },
      { type: 'range', key: 'n', label: '动量 n', min: -2, max: 2, step: 1, format: v => String(v) },
      { type: 'range', key: 'w', label: '缠绕 w', min: 0, max: 3, step: 1, format: v => String(v) },
    ],
    labels: [{ id: 'tA', text: '' }, { id: 'tB', text: '' }],
    update(dt, ctx) {
      tau += dt;
      const R = Math.exp(params.logR), { n, w } = params;
      A.cyl.scale.set(R, 1, R); B.cyl.scale.set(1 / R, 1, 1 / R);
      A.g.position.x = -GAP; B.g.position.x = GAP;
      drawString(A, R, n, w, tau, dt);
      drawString(B, 1 / R, w, n, tau, dt);
      ctx.placeLabel('tA', wp.set(-GAP, H / 2 + 0.75, 0), -44, `半径 ${R.toFixed(2)}<span>n = ${n}，w = ${w}</span>`);
      ctx.placeLabel('tB', wp.set(GAP, H / 2 + 0.75, 0), -44, `半径 ${(1 / R).toFixed(2)}<span>n = ${w}，w = ${n}</span>`);
    },
    bars() {
      const R = Math.exp(params.logR), [p, q] = mass2Parts(params.n, params.w, R);
      const tot = Math.max(p + q, 1e-9);
      return {
        legend: ['动量贡献', '缠绕贡献'],
        rows: [
          { label: `R = ${R.toFixed(2)}`, parts: [p / tot, q / tot] },
          { label: `R = ${(1 / R).toFixed(2)}`, parts: [q / tot, p / tot], swap: true },
        ],
      };
    },
    readouts() {
      const R = Math.exp(params.logR), [p, q] = mass2Parts(params.n, params.w, R);
      return [
        { label: '两侧的 M²（除振子项）', value: (p + q).toFixed(3) + ' / α′' },
        { label: '自对偶半径', value: 'R = √α′' },
      ];
    },
  };
}
