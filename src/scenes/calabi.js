// 场景 4：Calabi–Yau 截面
import { THREE, gridIndex } from '../util.js';
import { fermatPoint } from '../physics.js';

const G = 30; // 每片网格分辨率

function build(n) {
  const cnt = n * n * G * G;
  const z = new Float32Array(cnt * 4), dat = new Float32Array(cnt * 4), idx = [];
  let v = 0;
  for (let k1 = 0; k1 < n; k1++) for (let k2 = 0; k2 < n; k2++) {
    gridIndex(G, G, v, idx);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++, v++) {
      const a = -1 + (2 * i) / (G - 1), b = (Math.PI / 2) * (j / (G - 1));
      fermatPoint(n, k1, k2, a, b, z, v * 4);
      dat[v * 4] = i / (G - 1); dat[v * 4 + 1] = j / (G - 1);
      dat[v * 4 + 2] = k1 / n; dat[v * 4 + 3] = k2 / n;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cnt * 3), 3)); // 占位，真实位置在着色器里算
  g.setAttribute('zz', new THREE.BufferAttribute(z, 4));
  g.setAttribute('dat', new THREE.BufferAttribute(dat, 4));
  g.setIndex(idx);
  return g;
}

export function createCalabi() {
  const group = new THREE.Group();
  group.scale.setScalar(1.0);
  const params = { n: 5, angle: 0.6 };
  const uni = { uA: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 zz; attribute vec4 dat; uniform float uA; varying vec4 vDat; varying vec3 vV; varying float vW;
      void main(){
        vDat = dat;
        // (Re z₁, Re z₂) 加上虚部平面里转过角度 uA 的一个方向：四维旋转后的三维投影
        vec3 p = vec3(zz.x, zz.z, cos(uA)*zz.y + sin(uA)*zz.w);
        vW = -sin(uA)*zz.y + cos(uA)*zz.w; // 被投影掉的第四个坐标
        vec4 mv = modelViewMatrix*vec4(p,1.); vV = -mv.xyz;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `varying vec4 vDat; varying vec3 vV; varying float vW;
      void main(){
        vec3 nrm = normalize(cross(dFdx(vV), dFdy(vV)));
        vec3 view = normalize(vV);
        float ndv = abs(dot(nrm, view));
        float fres = pow(clamp(1.-ndv,0.,1.), 3.);
        // 颜色 = 被投影掉的第四维坐标（深蓝 ↔ 浅青）
        float h = clamp(.5+.42*vW, 0., 1.);
        vec3 base = mix(vec3(.01,.04,.32), vec3(.12,.55,1.), h);
        float ga = smoothstep(.86,.98,abs(fract(vDat.x*6.)-.5)*2.);
        float gb = smoothstep(.86,.98,abs(fract(vDat.y*6.)-.5)*2.);
        float edge = max(smoothstep(.97,1.,max(vDat.x,1.-vDat.x)), smoothstep(.97,1.,max(vDat.y,1.-vDat.y)));
        vec3 c = base*(.1+.55*ndv) + vec3(.3,.6,1.)*fres*.3 + base*max(ga,gb)*.3 + vec3(.6,.85,1.2)*edge*.45;
        gl_FragColor = vec4(c,1.);
      }`,
  });
  let mesh = null;
  function rebuild() {
    if (mesh) { group.remove(mesh); mesh.geometry.dispose(); }
    mesh = new THREE.Mesh(build(params.n), mat);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  rebuild();

  const NAMES = { 3: ['环面 T²', '1'], 4: ['K3 曲面', '2'], 5: ['五次三维流形', '3'] };
  return {
    id: 'calabi', name: 'Calabi–Yau',
    title: '藏起来的六个维度',
    blurb: '超弦需要十维时空，多出的六维卷成 Calabi–Yau 流形。这里是费马超曲面的二维截面，在四维中转动后投影到三维；颜色是被投影掉的那一维。',
    equation: '<i>z</i>₁<sup><i>n</i></sup> + <i>z</i>₂<sup><i>n</i></sup> = 1　(<i>z</i>₁, <i>z</i>₂ ∈ ℂ)',
    group, params, camera: [2.6, 1.9, 4.6], target: [0, 0, 0], bloom: 0.22,
    controls: [
      { type: 'seg', key: 'n', options: [{ value: 3, label: 'n = 3' }, { value: 4, label: 'n = 4' }, { value: 5, label: 'n = 5' }] },
      { type: 'range', key: 'angle', label: '四维转角', min: 0, max: Math.PI * 2, step: 0.01, live: true, format: v => (v * 180 / Math.PI).toFixed(0) + '°' },
    ],
    onParam(key) { if (key === 'n') rebuild(); },
    update(dt, ctx) {
      if (ctx.playing) params.angle = (params.angle + dt * 0.28) % (Math.PI * 2);
      uni.uA.value = params.angle;
    },
    readouts() {
      const [name, d] = NAMES[params.n];
      return [{ label: '所属流形', value: name }, { label: '复维数', value: d }, { label: '拼成它的曲面片', value: params.n + ' × ' + params.n }];
    },
  };
}
