import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/** 速率 → 颜色（数据编码）：静止 深蓝 → 青 → 白 → 光速 金色（HDR，会被辉光放大） */
const STOPS = [
  [0.0, 0.04, 0.12, 0.55],
  [0.5, 0.0, 0.35, 1.0],
  [0.82, 0.3, 0.8, 1.0],
  [0.96, 1.2, 1.2, 1.2],
  [1.0, 2.6, 1.7, 0.6],
];
export function speedColor(v, out, off = 0) {
  v = Math.min(1, Math.max(0, v));
  let i = 1;
  while (i < STOPS.length - 1 && v > STOPS[i][0]) i++;
  const a = STOPS[i - 1], b = STOPS[i], f = (v - a[0]) / (b[0] - a[0]);
  out[off] = a[1] + (b[1] - a[1]) * f;
  out[off + 1] = a[2] + (b[2] - a[2]) * f;
  out[off + 2] = a[3] + (b[3] - a[3]) * f;
}
/** 同一映射的 GLSL 版本 */
export const SPEED_GLSL = `
vec3 speedColor(float v){
  v = clamp(v,0.,1.);
  vec3 c0=vec3(.04,.12,.55), c1=vec3(0.,.35,1.), c2=vec3(.3,.8,1.), c3=vec3(1.2), c4=vec3(2.6,1.7,.6);
  if(v<.5) return mix(c0,c1,v/.5);
  if(v<.82) return mix(c1,c2,(v-.5)/.32);
  if(v<.96) return mix(c2,c3,(v-.82)/.14);
  return mix(c3,c4,(v-.96)/.04);
}`;

/** 可逐帧原地更新的粗线（n 个顶点 → n−1 段），避免每帧重建 GPU 缓冲 */
export class FatLine {
  constructor(n, { width = 3, color = 0xffffff, vertexColors = true } = {}) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3).fill(1);
    const g = new LineGeometry();
    g.setPositions(new Float32Array((n - 1) * 6));
    g.setColors(new Float32Array((n - 1) * 6));
    this.material = new LineMaterial({ linewidth: width, color, vertexColors, worldUnits: false, transparent: true });
    this.object = new Line2(g, this.material);
    this.object.frustumCulled = false;
    this.geometry = g;
  }
  /** 把 pos/col 写入实例缓冲 */
  flush() {
    const g = this.geometry, n = this.n;
    const P = g.attributes.instanceStart.data.array, C = g.attributes.instanceColorStart.data.array;
    for (let i = 0; i < n - 1; i++) {
      const s = i * 3, d = i * 6;
      P[d] = this.pos[s]; P[d + 1] = this.pos[s + 1]; P[d + 2] = this.pos[s + 2];
      P[d + 3] = this.pos[s + 3]; P[d + 4] = this.pos[s + 4]; P[d + 5] = this.pos[s + 5];
      C[d] = this.col[s]; C[d + 1] = this.col[s + 1]; C[d + 2] = this.col[s + 2];
      C[d + 3] = this.col[s + 3]; C[d + 4] = this.col[s + 4]; C[d + 5] = this.col[s + 5];
    }
    g.attributes.instanceStart.data.needsUpdate = true;
    g.attributes.instanceColorStart.data.needsUpdate = true;
  }
}

/** (rows × cols) 网格的三角形索引 */
export function gridIndex(rows, cols, base = 0, out = []) {
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = base + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    out.push(a, c, b, b, c, d);
  }
  return out;
}

export { THREE };
