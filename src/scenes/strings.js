// 场景 1：弦的运动 —— Nambu–Goto 精确解
import { THREE, FatLine, gridIndex, speedColor, SPEED_GLSL } from '../util.js';
import { stringPoint, ktAp, ktBp } from '../physics.js';

const N = 400;      // 弦上的采样点
const M = 56;       // 世界面拖尾的时间层数
const SPAN = 1.25;  // 拖尾覆盖的 τ 跨度
const SCALE = 2.1;

export function createStrings() {
  const group = new THREE.Group();
  group.scale.setScalar(SCALE);
  const params = { kind: 'closed', alpha: 0.42, phi: 1.2 };
  let tau = 0, vmax = 0;

  const line = new FatLine(N + 1, { width: 3.2 });
  group.add(line.object);

  // 世界面拖尾：弦在过去一小段时间里扫过的曲面
  const tg = new THREE.BufferGeometry();
  const tPos = new Float32Array(M * (N + 1) * 3), tDat = new Float32Array(M * (N + 1) * 3);
  tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tg.setAttribute('dat', new THREE.BufferAttribute(tDat, 3)); // age, speed, σ/L
  tg.setIndex(gridIndex(M, N + 1));
  const trail = new THREE.Mesh(tg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 dat; varying vec3 vDat;
      void main(){ vDat = dat; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vDat; ${SPEED_GLSL}
      void main(){
        float fade = pow(clamp(1.-vDat.x,0.,1.), 2.2);
        // 等 σ 线 = 弦上各点的世界线
        float g = abs(fract(vDat.z*24.)-.5)*2.;
        float lineM = smoothstep(.86,.98,g);
        vec3 c = min(speedColor(vDat.y), vec3(1.2));
        gl_FragColor = vec4(c*(.03+.15*lineM)*fade, 1.);
      }`,
  }));
  trail.frustumCulled = false;
  group.add(trail);

  // 开弦端点
  const endGeo = new THREE.SphereGeometry(0.022, 16, 12);
  const endMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.6) });
  const ends = [new THREE.Mesh(endGeo, endMat), new THREE.Mesh(endGeo, endMat)];
  ends.forEach(e => group.add(e));

  // 小窗：Kibble–Turok 单位球面上的 a′ 与 −b′
  const inset = new THREE.Scene();
  inset.add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.07 })));
  const K = 256;
  const mk = (color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((K + 1) * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    inset.add(l); return l;
  };
  const curveA = mk(0x0a84ff), curveB = mk(0xf5f5f7);
  const o3 = [0, 0, 0];
  function rebuildInset() {
    const A = curveA.geometry.attributes.position, B = curveB.geometry.attributes.position;
    for (let i = 0; i <= K; i++) {
      const s = (i / K) * 2 * Math.PI;
      ktAp(s, params.alpha, o3); A.setXYZ(i, o3[0], o3[1], o3[2]);
      ktBp(s, params.phi, o3); B.setXYZ(i, -o3[0], -o3[1], -o3[2]);
    }
    A.needsUpdate = B.needsUpdate = true;
    curveB.visible = params.kind === 'closed';
  }
  rebuildInset();

  function fill() {
    const { kind, alpha, phi } = params;
    const L = kind === 'open' ? Math.PI : 2 * Math.PI;
    vmax = 0;
    for (let j = 0; j < M; j++) {
      const t = tau - (j / (M - 1)) * SPAN, age = j / (M - 1);
      for (let i = 0; i <= N; i++) {
        const k = (j * (N + 1) + i) * 3;
        const v = stringPoint(kind, (i / N) * L, t, alpha, phi, tPos, k);
        tDat[k] = age; tDat[k + 1] = v; tDat[k + 2] = i / N;
        if (j === 0) {
          line.pos[i * 3] = tPos[k]; line.pos[i * 3 + 1] = tPos[k + 1]; line.pos[i * 3 + 2] = tPos[k + 2];
          speedColor(v, line.col, i * 3);
          if (v > vmax) vmax = v;
        }
      }
    }
    line.flush();
    tg.attributes.position.needsUpdate = true;
    tg.attributes.dat.needsUpdate = true;
    const open = kind === 'open';
    ends[0].visible = ends[1].visible = open;
    if (open) {
      ends[0].position.fromArray(line.pos, 0);
      ends[1].position.fromArray(line.pos, N * 3);
    }
  }

  return {
    id: 'strings', name: '弦的运动',
    title: '相对论性的弦',
    blurb: '这是 Nambu–Goto 作用量的精确解，不是示意动画。颜色是各点的速率，半透明曲面是弦扫出的世界面。',
    equation: '<i>X</i> = ½ [ <i>a</i>(σ−τ) + <i>b</i>(σ+τ) ]，|<i>a</i>′| = |<i>b</i>′| = 1',
    legend: true,
    group, params, camera: [3.2, 2.0, 4.6], target: [0, 0, 0], bloom: 0.65,
    controls: [
      { type: 'seg', key: 'kind', options: [{ value: 'closed', label: '闭弦' }, { value: 'open', label: '开弦' }] },
      { type: 'range', key: 'alpha', label: '三次谐波 α', min: 0, max: 1, step: 0.01 },
      { type: 'range', key: 'phi', label: '左右行波夹角 φ', min: 0, max: Math.PI, step: 0.01, format: v => (v * 180 / Math.PI).toFixed(0) + '°', show: p => p.kind === 'closed' },
    ],
    inset: {
      scene: inset,
      caption: p => p.kind === 'closed'
        ? '单位球面上 <b class="c-blue">a′</b> 与 <b>−b′</b> 相交处，弦出现尖点并瞬间达到光速'
        : '单位球面上的 <b class="c-blue">a′</b>；开弦端点的速度恒等于光速',
    },
    onParam() { rebuildInset(); },
    update(dt) { tau += dt * 0.55; fill(); },
    readouts() {
      const r = [{ label: '最高速率', value: (Math.min(vmax, 1)).toFixed(3) + ' c', warn: vmax > 0.9995 }];
      if (params.kind === 'open') r.push({ label: '端点速率', value: '1.000 c' });
      else r.push({ label: '振动周期', value: 'L / 2c' });
      return r;
    },
  };
}
