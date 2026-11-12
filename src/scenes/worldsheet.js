// 场景 2：世界面 —— 一根闭弦分裂为两根
import { THREE, gridIndex } from '../util.js';
import { pantsPoint, PANTS_H } from '../physics.js';

const T_IN = 2.3, T_OUT = -2.9;          // 共形时间范围（未来 = t 减小）
const Y0 = -T_IN * PANTS_H, Y1 = -T_OUT * PANTS_H;

export function createWorldsheet() {
  const group = new THREE.Group();
  group.position.y = -(Y0 + Y1) / 2;
  const params = { T: Y0, beta: 0 };

  // 三片参数曲面：腰（一根弦）+ 两条腿（两根弦）
  const pos = [], uv = [], idx = [];
  const o = [0, 0, 0];
  function patch(part, t0, t1, th0, th1, rows, cols) {
    const base = pos.length / 3;
    for (let j = 0; j < rows; j++) {
      const f = j / (rows - 1);
      // 在 t=0（分裂处）附近加密
      const t = t0 + (t1 - t0) * (t0 === 0 ? f * f : 1 - (1 - f) * (1 - f));
      for (let i = 0; i < cols; i++) {
        const th = th0 + (th1 - th0) * (i / (cols - 1));
        pantsPoint(part, t, th, o);
        pos.push(o[0], o[1], o[2]);
        uv.push(th / (2 * Math.PI), t);
      }
    }
    gridIndex(rows, cols, base, idx);
  }
  patch(0, 0, T_IN, 0, 4 * Math.PI, 70, 321);
  patch(1, 0, T_OUT, -Math.PI, Math.PI, 80, 161);
  patch(-1, 0, T_OUT, -Math.PI, Math.PI, 80, 161);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const uni = { uPlane: { value: new THREE.Vector4(0, 1, 0, 0) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `uniform vec4 uPlane; varying float vS; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vUv = uv; vS = dot(position, uPlane.xyz) - uPlane.w;
        vec4 mv = modelViewMatrix*vec4(position,1.);
        vN = normalMatrix*normal; vV = -mv.xyz;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `varying float vS; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float fres = pow(clamp(1.-abs(dot(normalize(vN), normalize(vV))),0.,1.), 2.);
        float gt = smoothstep(.9,.99, abs(fract(vUv.y*4.)-.5)*2.);
        float gs = smoothstep(.9,.99, abs(fract(vUv.x*8.)-.5)*2.);
        float grid = max(gt, gs*.6);
        // 过去：已经扫出的世界面；未来：只留淡淡的轮廓
        float past = smoothstep(.02,-.02, vS);
        vec3 base = vec3(.04,.3,.9)*(.1+.55*fres+.3*grid);
        vec3 c = base*mix(.16, 1., past);
        // 此刻的弦
        float w = fwidth(vS)*1.6+.012;
        float now = 1.-smoothstep(0., w, abs(vS));
        c += vec3(1.5,1.9,2.4)*now;
        gl_FragColor = vec4(c,1.);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // 同时面（观察者的"此刻"）
  const planeG = new THREE.Group();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }));
  const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
    [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(p => new THREE.Vector3(p[0], p[1], 0))),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
  planeG.add(quad, rim);
  group.add(planeG);

  // 分裂事件：同时面与世界面相切的那一点
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.6) }));
  group.add(marker);
  const P = geo.attributes.position, Nn = geo.attributes.normal;
  let sEvent = 0;
  function findEvent() {
    const b = params.beta, inv = 1 / Math.hypot(b, 1);
    const nx = -b * inv, ny = inv;
    let best = -1, bi = 0;
    for (let i = 0; i < P.count; i++) {
      if (Math.abs(P.getY(i)) > 2.2 || Math.abs(P.getZ(i)) > 0.35) continue;
      const d = Math.abs(Nn.getX(i) * nx + Nn.getY(i) * ny);
      if (d > best) { best = d; bi = i; }
    }
    marker.position.set(P.getX(bi), P.getY(bi), P.getZ(bi));
    sEvent = P.getY(bi) - b * P.getX(bi);
  }
  findEvent();

  const wp = new THREE.Vector3();
  return {
    id: 'worldsheet', name: '世界面',
    title: '相互作用没有"发生地点"',
    blurb: '一根闭弦分裂成两根，世界面处处光滑。换一个运动的观察者，分裂就发生在另一个地方——不存在点粒子那样的相互作用顶点，这正是弦理论没有紫外发散的原因。',
    equation: '<i>t</i> = Re ln(<i>z</i>² − 1)，等时线 |<i>z</i>² − 1| = e<sup><i>t</i></sup>',
    group, params, camera: [5.5, 2.2, 12.5], target: [0, 0, 0], bloom: 0.7,
    controls: [
      { type: 'range', key: 'T', label: '时间', min: Y0, max: Y1, step: 0.01, live: true, format: v => ((v - Y0) / (Y1 - Y0) * 100).toFixed(0) + '%' },
      { type: 'range', key: 'beta', label: '观察者速度 β', min: -0.6, max: 0.6, step: 0.01, format: v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' c' },
    ],
    onParam(key) { if (key === 'beta') findEvent(); },
    labels: [{ id: 'split', text: '分裂事件' }],
    update(dt, ctx) {
      const b = params.beta;
      if (ctx.playing) {
        params.T += dt * 0.55;
        if (params.T > Y1 + 0.6) params.T = Y0 - 0.6;
      }
      // 运动观察者的同时面：t − βx = 常数
      const inv = 1 / Math.hypot(b, 1);
      uni.uPlane.value.set(-b * inv, inv, 0, params.T * inv);
      planeG.position.set(0, params.T, 0);
      planeG.rotation.set(-Math.PI / 2, 0, 0);
      planeG.rotateY(-Math.atan(b));
      planeG.scale.set(8.4 / inv, 3.4, 1);
      ctx.placeLabel('split', marker.getWorldPosition(wp), 20);
    },
    readouts() {
      return [
        { label: '此刻弦的数目', value: params.T < sEvent ? '1' : '2' },
        { label: '分裂位置 x', value: (marker.position.x >= 0 ? '+' : '−') + Math.abs(marker.position.x).toFixed(2) },
      ];
    },
  };
}
