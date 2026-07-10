(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animationPaused = reduceMotion;

  function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height, dpr };
  }

  const universe = document.getElementById('universeCanvas');
  const uctx = universe.getContext('2d');
  const stars = Array.from({ length: 170 }, (_, i) => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + .2,
    phase: Math.random() * Math.PI * 2, speed: .08 + Math.random() * .2,
    depth: .2 + Math.random() * .8, seed: i
  }));

  function drawUniverse(now = 0) {
    const { width: w, height: h, dpr } = fitCanvas(universe);
    const t = now * .001;
    uctx.clearRect(0, 0, w, h);
    const bg = uctx.createRadialGradient(w * .73, h * .43, 0, w * .73, h * .43, w * .46);
    bg.addColorStop(0, 'rgba(32,61,142,.34)'); bg.addColorStop(.38, 'rgba(25,34,89,.16)'); bg.addColorStop(1, 'rgba(5,8,18,0)');
    uctx.fillStyle = bg; uctx.fillRect(0, 0, w, h);
    stars.forEach(s => {
      const alpha = .18 + .52 * (.5 + .5 * Math.sin(t * s.speed + s.phase));
      uctx.beginPath(); uctx.fillStyle = `rgba(184,217,255,${alpha})`;
      uctx.arc(s.x * w, s.y * h, s.r * dpr * s.depth, 0, Math.PI * 2); uctx.fill();
    });
    const cx = w * .71, cy = h * .43, radius = Math.min(w, h) * .27;
    uctx.save(); uctx.translate(cx, cy); uctx.rotate(-.14 + Math.sin(t * .14) * .03);
    for (let layer = 10; layer >= 0; layer--) {
      uctx.beginPath();
      const count = 220;
      for (let i = 0; i <= count; i++) {
        const a = i / count * Math.PI * 2;
        const wobble = Math.sin(a * 3 + t * .8) * radius * .16 + Math.sin(a * 7 - t * .55) * radius * .035;
        const x = Math.cos(a) * (radius + wobble) * 1.42;
        const y = Math.sin(a) * (radius * .33 + wobble * .18);
        i ? uctx.lineTo(x, y) : uctx.moveTo(x, y);
      }
      uctx.closePath();
      uctx.strokeStyle = layer === 0 ? 'rgba(154,244,255,.95)' : `rgba(82,168,255,${.025 + (10-layer)*.006})`;
      uctx.lineWidth = (layer === 0 ? 1.5 : 3 + layer * 2.8) * dpr;
      uctx.shadowColor = 'rgba(86,218,255,.8)'; uctx.shadowBlur = layer === 0 ? 18 * dpr : 0;
      uctx.stroke();
    }
    uctx.restore();
    if (!animationPaused) requestAnimationFrame(drawUniverse);
  }

  const motionToggle = document.getElementById('motionToggle');
  const motionLabel = document.getElementById('motionLabel');
  motionToggle.setAttribute('aria-pressed', String(animationPaused));
  motionLabel.textContent = animationPaused ? '启动宇宙' : '暂停宇宙';
  motionToggle.addEventListener('click', () => {
    animationPaused = !animationPaused;
    motionToggle.setAttribute('aria-pressed', String(animationPaused));
    motionLabel.textContent = animationPaused ? '启动宇宙' : '暂停宇宙';
    if (!animationPaused) requestAnimationFrame(drawUniverse);
  });
  drawUniverse();

  const modeCanvas = document.getElementById('stringCanvas');
  const mctx = modeCanvas.getContext('2d');
  const modes = {
    photon: { index:'01', name:'光子态', desc:'开放弦的一种无质量自旋 1 振动，可呈现规范场的量子。', type:'开放弦', spin:'1', force:'电磁相互作用', freq:'ν₁', harmonic:2, closed:false, color:[105,231,255] },
    graviton: { index:'02', name:'引力子态', desc:'闭弦谱中必然出现的无质量自旋 2 态，是弦理论包含量子引力的关键。', type:'闭合弦', spin:'2', force:'引力', freq:'ν₂', harmonic:3, closed:true, color:[170,120,255] },
    matter: { index:'03', name:'物质态', desc:'超弦的费米激发可给出半整数自旋态；具体物质谱取决于紧致化与膜的配置。', type:'开放弦', spin:'½', force:'物质 / 费米子', freq:'ν₃', harmonic:5, closed:false, color:[185,255,102] }
  };
  let currentMode = modes.photon;
  let modePaused = reduceMotion;

  function drawMode(now = 0) {
    const { width: w, height: h, dpr } = fitCanvas(modeCanvas);
    const t = now * .001;
    mctx.clearRect(0,0,w,h); mctx.save();
    const [r,g,b] = currentMode.color;
    if (currentMode.closed) {
      mctx.translate(w/2,h/2); mctx.rotate(t*.12);
      for(let glow=9;glow>=0;glow--){
        mctx.beginPath();
        for(let i=0;i<=260;i++){
          const a=i/260*Math.PI*2;
          const radial=Math.min(w,h)*(.225 + .035*Math.sin(currentMode.harmonic*a-t*2));
          const x=Math.cos(a)*radial*1.45, y=Math.sin(a)*radial;
          i?mctx.lineTo(x,y):mctx.moveTo(x,y);
        }
        mctx.closePath();mctx.strokeStyle=`rgba(${r},${g},${b},${glow?0.025:0.96})`;mctx.lineWidth=(glow?glow*3:2)*dpr;mctx.stroke();
      }
    } else {
      const margin=w*.12, center=h/2, amp=Math.min(h*.23,130*dpr);
      for(let glow=9;glow>=0;glow--){
        mctx.beginPath();
        for(let i=0;i<=220;i++){
          const p=i/220, x=margin+p*(w-margin*2);
          const envelope=Math.sin(Math.PI*p);
          const y=center+Math.sin(p*Math.PI*currentMode.harmonic*2-t*2.2)*amp*envelope*.62 + Math.sin(p*Math.PI*2+t)*amp*.08*envelope;
          i?mctx.lineTo(x,y):mctx.moveTo(x,y);
        }
        mctx.strokeStyle=`rgba(${r},${g},${b},${glow?0.025:0.96})`;mctx.lineWidth=(glow?glow*3:2)*dpr;mctx.stroke();
      }
      [[margin,center],[w-margin,center]].forEach(([x,y])=>{mctx.beginPath();mctx.fillStyle=`rgb(${r},${g},${b})`;mctx.arc(x,y,4*dpr,0,Math.PI*2);mctx.fill()});
    }
    mctx.restore();
    if(!modePaused) requestAnimationFrame(drawMode);
  }
  drawMode();

  document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
    currentMode = modes[button.dataset.mode];
    document.querySelectorAll('.mode-button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.getElementById('modeIndex').textContent=currentMode.index;
    document.getElementById('modeName').textContent=currentMode.name;
    document.getElementById('modeDesc').textContent=currentMode.desc;
    document.getElementById('modeType').textContent=currentMode.type;
    document.getElementById('modeSpin').textContent=currentMode.spin;
    document.getElementById('modeForce').textContent=currentMode.force;
    document.getElementById('frequencyValue').textContent=currentMode.freq;
    if (reduceMotion) drawMode();
  }));

  const scaleSlider = document.getElementById('scaleSlider');
  const scaleData = [
    {max:3,category:'宏观世界',name:'1 米',desc:'你熟悉的日常尺度'},
    {max:11,category:'细胞世界',name:'10⁻⁶ 米',desc:'典型细菌与细胞器的尺度'},
    {max:13,category:'分子世界',name:'10⁻¹⁰ 米',desc:'原子大小约为埃的量级'},
    {max:17,category:'原子核内部',name:'10⁻¹⁵ 米',desc:'质子与中子的尺度'},
    {max:28,category:'未知疆域',name:'10⁻²⁰ 米以下',desc:'远超当前直接分辨能力'},
    {max:35,category:'量子引力尺度',name:'≈ 1.6 × 10⁻³⁵ 米',desc:'普朗克长度；典型弦长的自然参照'}
  ];
  function updateScale(){
    const v=Number(scaleSlider.value), datum=scaleData.find(d=>v<=d.max)||scaleData.at(-1);
    const superscript=String(v).split('').map(n=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)]).join('');
    document.getElementById('scaleOutput').textContent=v===0?'10⁰ m':`10⁻${superscript} m`;
    document.getElementById('scaleCategory').textContent=datum.category;document.getElementById('scaleName').textContent=datum.name;document.getElementById('scaleDescription').textContent=datum.desc;
    const object=document.getElementById('scaleObject');object.style.transform=`scale(${Math.max(.16,1-v/42)})`;
    object.querySelector('span').style.boxShadow=`0 0 ${25+v}px rgba(105,231,255,.85),0 0 ${70+v*3}px ${10+v/2}px rgba(105,231,255,${.22+v/250})`;
  }
  scaleSlider.addEventListener('input',updateScale);updateScale();

  const dimensionToggle=document.getElementById('dimensionToggle'), dimensionViz=document.getElementById('dimensionViz');
  dimensionToggle.addEventListener('click',()=>{
    const expanded=dimensionViz.classList.toggle('expanded');dimensionToggle.setAttribute('aria-pressed',String(expanded));
    dimensionToggle.innerHTML=expanded?'收起隐藏维度 <span>−</span>':'展开隐藏维度 <span>+</span>';
    document.getElementById('dimensionCount').textContent=expanded?'10':'04';
    document.getElementById('dimensionTitle').textContent=expanded?'超弦的十维时空':'熟悉的时空';
    document.getElementById('dimensionText').textContent=expanded?'六个额外空间维在每个时空点紧致化；它们的几何性质参与决定低能物理。':'三个延展的空间维，加上一个时间维，构成我们日常经验中的四维时空。';
  });

  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target)}}),{threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(el=>revealObserver.observe(el));
  window.addEventListener('resize',()=>{ if(reduceMotion){drawUniverse();drawMode()} });
})();
