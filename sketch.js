// FIDENZA SPHERE — partículas na superfície de uma esfera, projeção 2D
// Flow field em coordenadas esféricas (θ,φ), sem WebGL

let SPHERE_R = 260;           // raio da esfera
let NUM_PARTICLES = 600;
let TRAIL_LENGTH = 14;
let MIN_WIDTH = 2, MAX_WIDTH = 12;
let SPEED = 0.012;             // velocidade em radianos/frame
let FIELD_SCALE = 1.8;         // escala do ruído no espaço esférico
let FIELD_EVOLUTION = 0.0004;  // quanto o campo muda por frame
let WRAP_SPHERE = true;        // partículas sempre na esfera
let FADE_TAIL = true;

// Rotação automática da esfera
let AUTO_ROTATE = true;
let ROT_SPEED_X = 0.0007;
let ROT_SPEED_Y = 0.0013;
let rotX = 0.3, rotY = 0;

// Interação mouse → rotação
let isDragging = false;
let lastMX = 0, lastMY = 0;

let PALETTE = [[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]];
const PALETTES_PRESET = {
  'clássico': [[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]],
  'pastel':   [[255,180,180,0.25],[180,220,255,0.25],[180,255,200,0.20],[255,240,180,0.20],[220,180,255,0.10]],
  'mono':     [[30,30,30,0.30],[80,80,80,0.25],[140,140,140,0.25],[200,200,200,0.15],[240,240,240,0.05]],
  'vibrante': [[255,50,50,0.25],[50,200,100,0.25],[50,100,255,0.20],[255,200,0,0.20],[200,0,200,0.10]],
  'terra':    [[180,100,40,0.30],[140,80,30,0.25],[200,160,80,0.20],[100,70,40,0.15],[230,200,140,0.10]],
  'oceano':   [[20,80,140,0.30],[40,140,180,0.25],[80,200,200,0.20],[20,40,80,0.15],[160,220,230,0.10]]
};
let SAT_MULT = 1.0, LIGHT_MULT = 1.0;
let BG_COLOR = [245, 240, 228];
let BG_FADE = false, BG_FADE_ALPHA = 18;

let USE_FIXED_SEED = false, FIXED_SEED = 42;
let SHOW_SPHERE_OUTLINE = true;
let BACKFACE_CULL = 0.12; // partículas atrás ficam até esse alpha

let particles = [], panel;
let cx, cy; // centro da tela

function emitTheme(){
  var lum = 0.299*BG_COLOR[0] + 0.587*BG_COLOR[1] + 0.114*BG_COLOR[2];
  window.parent && window.parent.postMessage({fidenzaTheme: lum>128?'light':'dark'}, '*');
}

function setup(){
  cx = (document.body.clientWidth||window.innerWidth)/2;
  cy = (document.body.clientHeight||window.innerHeight)/2;
  let cnv = createCanvas(cx*2, cy*2);
  cnv.elt.style.cssText = 'display:block;position:absolute;top:0;left:0;pointer-events:none;';

  // Mouse drag para rotacionar esfera
  document.addEventListener('mousedown', e => { isDragging=true; lastMX=e.clientX; lastMY=e.clientY; AUTO_ROTATE=false; });
  document.addEventListener('mouseup',   () => isDragging=false);
  document.addEventListener('mousemove', e => {
    if(!isDragging) return;
    let dx = (e.clientX-lastMX)*0.006, dy = (e.clientY-lastMY)*0.006;
    rotY += dx; rotX += dy;
    lastMX=e.clientX; lastMY=e.clientY;
  });
  // Touch
  document.addEventListener('touchstart', e => { isDragging=true; lastMX=e.touches[0].clientX; lastMY=e.touches[0].clientY; AUTO_ROTATE=false; }, {passive:true});
  document.addEventListener('touchend',   () => isDragging=false);
  document.addEventListener('touchmove',  e => {
    if(!isDragging) return;
    let dx = (e.touches[0].clientX-lastMX)*0.006, dy = (e.touches[0].clientY-lastMY)*0.006;
    rotY += dx; rotX += dy;
    lastMX=e.touches[0].clientX; lastMY=e.touches[0].clientY;
  }, {passive:true});

  buildUI();
  init();
  emitTheme();

  new ResizeObserver(es => {
    for(let e of es){
      let nw=Math.floor(e.contentRect.width), nh=Math.floor(e.contentRect.height);
      if(nw>0&&nh>0&&(nw!==width||nh!==height)){ resizeCanvas(nw,nh); cx=nw/2; cy=nh/2; }
    }
  }).observe(document.body);
}

function draw(){
  if(BG_FADE){ fill(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2],BG_FADE_ALPHA); noStroke(); rect(0,0,width,height); }
  else { background(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]); }

  if(AUTO_ROTATE){ rotY += ROT_SPEED_Y; rotX += ROT_SPEED_X*0.5; }

  // Desenha contorno da esfera
  if(SHOW_SPHERE_OUTLINE){
    noFill();
    let lum = 0.299*BG_COLOR[0]+0.587*BG_COLOR[1]+0.114*BG_COLOR[2];
    stroke(lum>128 ? color(0,0,0,18) : color(255,255,255,18));
    strokeWeight(0.8);
    circle(cx, cy, SPHERE_R*2);
  }

  // Atualiza e desenha partículas
  for(let p of particles){ p.update(); p.draw(); }
}

function init(){
  let s = USE_FIXED_SEED ? FIXED_SEED : floor(random(999999));
  randomSeed(s); noiseSeed(s);
  particles = [];
  for(let i=0; i<NUM_PARTICLES; i++) particles.push(new Particle());
}

// Projeta ponto esférico (theta, phi) para 2D com rotação e perspectiva
function project(theta, phi){
  // Converte esférico → cartesiano
  let x0 = SPHERE_R * sin(phi) * cos(theta);
  let y0 = SPHERE_R * cos(phi);
  let z0 = SPHERE_R * sin(phi) * sin(theta);

  // Rotação em X
  let cosX = cos(rotX), sinX = sin(rotX);
  let y1 = y0*cosX - z0*sinX;
  let z1 = y0*sinX + z0*cosX;

  // Rotação em Y
  let cosY = cos(rotY), sinY = sin(rotY);
  let x2 = x0*cosY + z1*sinY;
  let z2 = -x0*sinY + z1*cosY;

  // Profundidade normalizada: -1 (atrás) a +1 (frente)
  let depth = z2 / SPHERE_R;

  // Perspectiva suave
  let persp = 1 + depth * 0.18;

  return { sx: cx + x2*persp, sy: cy + y1*persp, depth: depth };
}

// Campo de fluxo em coordenadas esféricas
function fieldDelta(theta, phi){
  let t = frameCount * FIELD_EVOLUTION;
  let dTheta = (noise(cos(theta)*FIELD_SCALE, sin(phi)*FIELD_SCALE, t) - 0.5) * SPEED * 2;
  let dPhi   = (noise(sin(theta)*FIELD_SCALE + 5.3, cos(phi)*FIELD_SCALE + 2.1, t) - 0.5) * SPEED * 2;
  return { dTheta, dPhi };
}

class Particle {
  constructor(){
    this.theta = random(TWO_PI);
    this.phi   = acos(random(-1, 1));  // distribuição uniforme na esfera
    this.wNorm  = random();
    this.colNorm = random();
    this.trail  = [];
  }

  update(){
    // Guarda posição atual (θ,φ) na trilha
    this.trail.push({ theta: this.theta, phi: this.phi });
    while(this.trail.length > TRAIL_LENGTH) this.trail.shift();

    // Aplica campo de fluxo
    let { dTheta, dPhi } = fieldDelta(this.theta, this.phi);
    this.theta += dTheta;
    this.phi   += dPhi;

    // Mantém phi em [0, PI]
    if(this.phi < 0){ this.phi = -this.phi; this.theta += PI; }
    if(this.phi > PI){ this.phi = TWO_PI - this.phi; this.theta += PI; }
    // Normaliza theta
    this.theta = ((this.theta % TWO_PI) + TWO_PI) % TWO_PI;
  }

  draw(){
    let n = this.trail.length;
    if(n < 2) return;

    // Projeta todos os pontos da trilha
    let pts = this.trail.map(p => project(p.theta, p.phi));

    // Visibilidade baseada na profundidade média
    let avgDepth = pts.reduce((s,p)=>s+p.depth,0)/n;
    // Alpha: 0.0 na parte de trás, 1.0 na frente
    let visibility = map(avgDepth, -1, 1, BACKFACE_CULL, 1.0);

    let col = pickColorFromNorm(this.colNorm);
    let r=col[0], g=col[1], b=col[2];

    // Largura escalada pela profundidade
    let wScale = map(avgDepth, -1, 1, 0.3, 1.0);

    noStroke();
    fill(r, g, b, 255*visibility*col[3]*6);

    beginShape();
    let left=[], right=[];
    for(let i=0; i<n; i++){
      let a = i<n-1
        ? atan2(pts[i+1].sy-pts[i].sy, pts[i+1].sx-pts[i].sx)
        : atan2(pts[i].sy-pts[i-1].sy, pts[i].sx-pts[i-1].sx);
      let perp = a + HALF_PI;
      let t = FADE_TAIL ? i/(n-1) : 1;
      let hw = lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm) * t * wScale / 2;
      left.push ({ x: pts[i].sx + cos(perp)*hw, y: pts[i].sy + sin(perp)*hw });
      right.push({ x: pts[i].sx - cos(perp)*hw, y: pts[i].sy - sin(perp)*hw });
    }
    for(let p of left)  curveVertex(p.x, p.y);
    for(let p of right.reverse()) curveVertex(p.x, p.y);
    endShape(CLOSE);
  }
}

// ── Cores ─────────────────────────────────────────────────────────────────────
function pickColorFromNorm(norm){
  let total = PALETTE.reduce((s,c)=>s+c[3],0), acc=0;
  for(let c of PALETTE){ acc+=c[3]/total; if(norm<=acc) return applyColorMods(c); }
  return applyColorMods(PALETTE[PALETTE.length-1]);
}
function applyColorMods(c){
  let r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0,s=0,l=(mx+mn)/2;
  if(d>0){s=d/(1-Math.abs(2*l-1));if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;}
  s=Math.min(1,s*SAT_MULT);l=Math.min(1,Math.max(0,l*LIGHT_MULT));
  let q=l<0.5?l*(1+s):l+s-l*s,p2=2*l-q;
  function hue(t){t=(t+1)%1;if(t<1/6)return p2+(q-p2)*6*t;if(t<1/2)return q;if(t<2/3)return p2+(q-p2)*(2/3-t)*6;return p2;}
  return[Math.round(hue(h+1/3)*255),Math.round(hue(h)*255),Math.round(hue(h-1/3)*255),c[3]];
}
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function hexToRgb(h){ return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)}; }

// ── UI ─────────────────────────────────────────────────────────────────────────
function buildUI(){
  let style = document.createElement('style');
  style.textContent = `
    #toggle-btn{position:fixed;left:10px;top:50%;transform:translateY(-50%);z-index:200;background:rgba(30,30,30,0.85);color:#eee;border:1px solid #555;padding:6px 12px;cursor:pointer;font-family:monospace;font-size:12px;border-radius:4px;backdrop-filter:blur(4px);writing-mode:vertical-rl;letter-spacing:2px;pointer-events:auto;touch-action:manipulation;}
    #toggle-btn:hover{background:rgba(60,60,60,0.95);}
    #ui-sidebar{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:199;width:0;max-height:90vh;overflow:hidden;transition:width 0.2s ease;background:rgba(20,20,20,0.92);border-right:1px solid #444;backdrop-filter:blur(8px);border-radius:0 8px 8px 0;pointer-events:auto;touch-action:auto;}
    #ui-sidebar.open{width:270px;}
    #ui-panel{display:flex;flex-direction:column;gap:6px;padding:16px 12px;min-width:260px;max-height:90vh;overflow-y:auto;}
    .sec{color:#aaa;font-size:10px;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #444;padding-bottom:3px;margin-top:6px;}
    .ctrl{display:flex;flex-direction:column;gap:2px;}
    .ctrl label{color:#ccc;font-size:11px;display:flex;justify-content:space-between;}
    .ctrl label span{color:#f0a040;min-width:36px;text-align:right;}
    .ctrl input[type=range]{width:100%;accent-color:#f0a040;cursor:pointer;}
    .ctrl select,.ctrl input[type=checkbox]{background:#333;color:#eee;border:1px solid #555;padding:2px 4px;font-family:monospace;font-size:11px;cursor:pointer;}
    .btn-row{display:flex;gap:8px;margin-top:4px;}
    .btn-row button{flex:1;padding:6px;background:#333;color:#eee;border:1px solid #555;cursor:pointer;font-family:monospace;font-size:12px;border-radius:3px;}
    .btn-row button:hover{background:#f0a040;color:#111;}
  `;
  document.head.appendChild(style);

  let sidebar = document.createElement('div'); sidebar.id='ui-sidebar'; document.body.appendChild(sidebar);
  panel = document.createElement('div'); panel.id='ui-panel'; sidebar.appendChild(panel);
  let btn = document.createElement('button'); btn.id='toggle-btn'; btn.textContent='☰ PARAMS';
  btn.onclick = () => sidebar.classList.toggle('open');
  document.body.appendChild(btn);

  function sec(t){ let d=document.createElement('div');d.className='sec';d.textContent=t;panel.appendChild(d); }
  function sliderRef(label,get,set,mn,mx,step){
    let div=document.createElement('div');div.className='ctrl';
    let lbl=document.createElement('label'),txt=document.createTextNode(label+' '),val=document.createElement('span');
    val.textContent=get().toFixed(step<0.01?4:step<1?2:0);lbl.appendChild(txt);lbl.appendChild(val);
    let inp=document.createElement('input');inp.type='range';inp.min=mn;inp.max=mx;inp.step=step;inp.value=get();
    inp.oninput=()=>{let v=parseFloat(inp.value);set(v);val.textContent=v.toFixed(step<0.01?4:step<1?2:0);};
    div.appendChild(lbl);div.appendChild(inp);panel.appendChild(div);return{inp,val};
  }
  function slider(l,g,s,mn,mx,st){ sliderRef(l,g,s,mn,mx,st); }
  function chk(label,get,set){
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent=label;
    let inp=document.createElement('input');inp.type='checkbox';inp.checked=get();
    inp.onchange=()=>set(inp.checked);div.appendChild(lbl);div.appendChild(inp);panel.appendChild(div);
  }

  sec('Esfera');
  slider('raio', ()=>SPHERE_R, v=>{SPHERE_R=v;}, 60, 500, 5);
  chk('contorno', ()=>SHOW_SPHERE_OUTLINE, v=>SHOW_SPHERE_OUTLINE=v);
  chk('auto-rotação', ()=>AUTO_ROTATE, v=>AUTO_ROTATE=v);
  slider('vel. rotação Y', ()=>ROT_SPEED_Y, v=>ROT_SPEED_Y=v, 0, 0.005, 0.0001);
  slider('backface alpha', ()=>BACKFACE_CULL, v=>BACKFACE_CULL=v, 0, 0.5, 0.01);

  sec('Flow Field');
  slider('escala', ()=>FIELD_SCALE, v=>FIELD_SCALE=v, 0.1, 6.0, 0.05);
  slider('evolução', ()=>FIELD_EVOLUTION, v=>FIELD_EVOLUTION=v, 0, 0.002, 0.00005);

  sec('Partículas');
  slider('quantidade', ()=>NUM_PARTICLES, v=>{NUM_PARTICLES=Math.round(v);init();}, 50, 1500, 10);
  slider('cauda', ()=>TRAIL_LENGTH, v=>TRAIL_LENGTH=Math.round(v), 4, 80, 1);
  slider('min width', ()=>MIN_WIDTH, v=>MIN_WIDTH=v, 0.5, 30, 0.5);
  slider('max width', ()=>MAX_WIDTH, v=>MAX_WIDTH=v, 1, 60, 0.5);
  slider('speed', ()=>SPEED, v=>SPEED=v, 0.001, 0.06, 0.001);
  chk('fade tail', ()=>FADE_TAIL, v=>FADE_TAIL=v);

  sec('Cores');
  let satRef, lightRef;
  {
    let div=document.createElement('div');div.className='ctrl';
    let lbl=document.createElement('label');lbl.textContent='paleta preset';
    let s=document.createElement('select');
    s.style.cssText='background:#333;color:#eee;border:1px solid #555;padding:2px 4px;font-family:monospace;font-size:11px;width:100%;';
    ['— custom —',...Object.keys(PALETTES_PRESET)].forEach(o=>{let op=document.createElement('option');op.value=o;op.textContent=o;s.appendChild(op);});
    s.onchange=()=>{ if(s.value==='— custom —')return; PALETTE=PALETTES_PRESET[s.value].map(c=>[...c]); SAT_MULT=1.0; LIGHT_MULT=1.0; if(satRef){satRef.inp.value=1.0;satRef.val.textContent='1.00';} if(lightRef){lightRef.inp.value=1.0;lightRef.val.textContent='1.00';} rebuildColorEditor(); };
    window._paletteSelect=s; div.appendChild(lbl); div.appendChild(s); panel.appendChild(div);
  }
  satRef   = sliderRef('saturação', ()=>SAT_MULT,   v=>{SAT_MULT=v;   if(window._paletteSelect)window._paletteSelect.value='— custom —';}, 0, 2.0, 0.05);
  lightRef = sliderRef('brilho',    ()=>LIGHT_MULT, v=>{LIGHT_MULT=v; if(window._paletteSelect)window._paletteSelect.value='— custom —';}, 0, 2.0, 0.05);
  {
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent='cor do fundo';
    let cp=document.createElement('input');cp.type='color';cp.value=rgbToHex(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);
    cp.style.cssText='width:100%;height:24px;border:none;background:none;cursor:pointer;padding:0;';
    cp.oninput=()=>{ let rgb=hexToRgb(cp.value); BG_COLOR=[rgb.r,rgb.g,rgb.b]; emitTheme(); };
    div.appendChild(lbl); div.appendChild(cp); panel.appendChild(div);
  }

  chk('bg fade', ()=>BG_FADE, v=>BG_FADE=v);
  slider('bg fade alpha', ()=>BG_FADE_ALPHA, v=>BG_FADE_ALPHA=v, 2, 60, 1);

  let colorEditorEl = document.createElement('div'); colorEditorEl.id='color-editor'; panel.appendChild(colorEditorEl);
  function rebuildColorEditor(){
    colorEditorEl.innerHTML='';
    let total=PALETTE.reduce((s,c)=>s+c[3],0); if(total>0)PALETTE.forEach(c=>c[3]=c[3]/total);
    PALETTE.forEach((c,i)=>{
      let row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;';
      let cp=document.createElement('input');cp.type='color';cp.value=rgbToHex(c[0],c[1],c[2]);
      cp.style.cssText='width:36px;height:24px;border:none;background:none;cursor:pointer;padding:0;flex-shrink:0;';
      cp.oninput=()=>{ let rgb=hexToRgb(cp.value);PALETTE[i][0]=rgb.r;PALETTE[i][1]=rgb.g;PALETTE[i][2]=rgb.b; if(window._paletteSelect)window._paletteSelect.value='— custom —'; };
      let probWrap=document.createElement('div');probWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:1px;';
      let probLbl=document.createElement('label');probLbl.style.cssText='color:#aaa;font-size:10px;display:flex;justify-content:space-between;';
      probLbl.appendChild(document.createTextNode('prob '));
      let probVal=document.createElement('span');probVal.style.color='#f0a040';probVal.textContent=c[3].toFixed(2);probLbl.appendChild(probVal);
      let probInp=document.createElement('input');probInp.type='range';probInp.min=0;probInp.max=1;probInp.step=0.01;probInp.value=c[3];
      probInp.style.cssText='width:100%;accent-color:#f0a040;';
      probInp.oninput=()=>{
        if(window._paletteSelect)window._paletteSelect.value='— custom —';
        let nv=parseFloat(probInp.value),ov=PALETTE[i][3],delta=nv-ov,os=1-ov;
        if(os<0.001)return; PALETTE[i][3]=nv;
        PALETTE.forEach((cc,j)=>{ if(j===i)return; cc[3]=Math.max(0,cc[3]-delta*(cc[3]/os)); });
        let t=PALETTE.reduce((s,cc)=>s+cc[3],0); PALETTE.forEach(cc=>cc[3]=cc[3]/t);
        colorEditorEl.querySelectorAll('input[type=range]').forEach((inp,j)=>{ if(j!==i)inp.value=PALETTE[j][3]; });
        colorEditorEl.querySelectorAll('span').forEach((sp,j)=>{ sp.textContent=PALETTE[j][3].toFixed(2); });
        probVal.textContent=PALETTE[i][3].toFixed(2); probInp.value=PALETTE[i][3];
      };
      probWrap.appendChild(probLbl); probWrap.appendChild(probInp);
      row.appendChild(cp); row.appendChild(probWrap); colorEditorEl.appendChild(row);
    });
  }
  rebuildColorEditor();

  sec('Seed');
  chk('fixed seed', ()=>USE_FIXED_SEED, v=>{ USE_FIXED_SEED=v; init(); });
  slider('seed', ()=>FIXED_SEED, v=>{ FIXED_SEED=v; if(USE_FIXED_SEED)init(); }, 1, 9999, 1);

  let row=document.createElement('div'); row.className='btn-row';
  let rb=document.createElement('button'); rb.textContent='⟳ REINICIAR'; rb.onclick=init;
  row.appendChild(rb); panel.appendChild(row);
}
