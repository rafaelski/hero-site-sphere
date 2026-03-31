// FIDENZA SPHERE — hover + painel + esfera 3D projetada

// ── Esfera ────────────────────────────────────────────────────────────────────
let SPHERE_R      = 260;
let AUTO_ROTATE   = true;
let ROT_SPEED_Y   = 0.0013;
let BACKFACE_CULL = 0.12;
let SHOW_OUTLINE  = true;
let rotX = 0.28, rotY = 0;

// ── Flow Field ────────────────────────────────────────────────────────────────
let FIELD_SCALE     = 1.8;
let FIELD_ANGLE     = 3.14159;
let FIELD_EVOLUTION = 0.0004;

// ── Repulsão ──────────────────────────────────────────────────────────────────
let REPULSION_RADIUS   = 30;
let REPULSION_STRENGTH = 0.8;

// ── Partículas ────────────────────────────────────────────────────────────────
let NUM_PARTICLES = 700;
let TRAIL_LENGTH  = 12;
let MIN_WIDTH     = 3;
let MAX_WIDTH     = 14;
let SPEED         = 0.013;
let FADE_TAIL     = true;

// ── Atrator (mouse hover) ─────────────────────────────────────────────────────
let ATTRACTOR_RADIUS   = 180;
let ATTRACTOR_STRENGTH = 2.5;
let ATTRACTOR_DECAY    = 0.015;
let ORBIT_DISTANCE     = 60;
let attractor = { x:0, y:0, strength:0, active:false };

// ── Cores / Estilo ────────────────────────────────────────────────────────────
let BG_FADE       = false;
let BG_FADE_ALPHA = 18;
let PALETTE = [[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]];
const PALETTES_PRESET = {
  'classico': [[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]],
  'pastel':   [[255,180,180,0.25],[180,220,255,0.25],[180,255,200,0.20],[255,240,180,0.20],[220,180,255,0.10]],
  'mono':     [[30,30,30,0.30],[80,80,80,0.25],[140,140,140,0.25],[200,200,200,0.15],[240,240,240,0.05]],
  'vibrante': [[255,50,50,0.25],[50,200,100,0.25],[50,100,255,0.20],[255,200,0,0.20],[200,0,200,0.10]],
  'terra':    [[180,100,40,0.30],[140,80,30,0.25],[200,160,80,0.20],[100,70,40,0.15],[230,200,140,0.10]],
  'oceano':   [[20,80,140,0.30],[40,140,180,0.25],[80,200,200,0.20],[20,40,80,0.15],[160,220,230,0.10]]
};
let SAT_MULT   = 1.0;
let LIGHT_MULT = 1.0;
let BG_COLOR   = [245,240,228];

// ── Seed ──────────────────────────────────────────────────────────────────────
let USE_FIXED_SEED = false;
let FIXED_SEED     = 42;

// ── Internos ──────────────────────────────────────────────────────────────────
let particles   = [];
let spatialGrid = { cells:{}, cell:30 };
let panel;
let cx, cy;

// ─────────────────────────────────────────────────────────────────────────────

function emitTheme(){
  var lum = 0.299*BG_COLOR[0]+0.587*BG_COLOR[1]+0.114*BG_COLOR[2];
  try{ window.parent.postMessage({fidenzaTheme:lum>128?'light':'dark'},'*'); }catch(e){}
}

function setup(){
  cx = (document.body.clientWidth||window.innerWidth)/2;
  cy = (document.body.clientHeight||window.innerHeight)/2;
  let cnv = createCanvas(cx*2, cy*2);
  cnv.elt.style.cssText = 'display:block;position:absolute;top:0;left:0;pointer-events:none;';

  // ── hover — idêntico ao original ─────────────────────────────────────────
  document.addEventListener('mousemove', function(e){
    let r = cnv.elt.getBoundingClientRect();
    attractor.x        = e.clientX - r.left;
    attractor.y        = e.clientY - r.top;
    attractor.strength = 1.0;
    attractor.active   = true;
  });

  buildUI();
  init();
  emitTheme();

  new ResizeObserver(function(es){
    for(let e of es){
      let nw=Math.floor(e.contentRect.width), nh=Math.floor(e.contentRect.height);
      if(nw>0&&nh>0&&(nw!==width||nh!==height)){ resizeCanvas(nw,nh); cx=nw/2; cy=nh/2; init(); }
    }
  }).observe(document.body);
}

function draw(){
  if(BG_FADE){ fill(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2],BG_FADE_ALPHA); noStroke(); rect(0,0,width,height); }
  else{ background(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]); }

  if(AUTO_ROTATE) rotY += ROT_SPEED_Y;

  if(attractor.strength>0){
    attractor.strength = max(0, attractor.strength-ATTRACTOR_DECAY);
    if(attractor.strength===0) attractor.active=false;
  }

  if(SHOW_OUTLINE){
    noFill();
    let lum=0.299*BG_COLOR[0]+0.587*BG_COLOR[1]+0.114*BG_COLOR[2];
    stroke(lum>128?color(0,0,0,20):color(255,255,255,20));
    strokeWeight(0.8);
    ellipse(cx, cy, SPHERE_R*2, SPHERE_R*2);
  }

  buildSpatialGrid();
  for(let p of particles){ p.update(); p.draw(); }
}

function init(){
  let s = USE_FIXED_SEED ? FIXED_SEED : floor(random(999999));
  randomSeed(s); noiseSeed(s);
  particles = [];
  for(let i=0;i<NUM_PARTICLES;i++) particles.push(new Particle());
}

function buildSpatialGrid(){
  spatialGrid.cell  = max(1,REPULSION_RADIUS);
  spatialGrid.cells = {};
  for(let p of particles){
    let proj = project(p.theta, p.phi);
    p._proj  = proj;
    let ck   = floor(proj.sx/spatialGrid.cell)+','+floor(proj.sy/spatialGrid.cell);
    if(!spatialGrid.cells[ck]) spatialGrid.cells[ck]=[];
    spatialGrid.cells[ck].push(p);
  }
}

function project(theta, phi){
  let x0 =  SPHERE_R*sin(phi)*cos(theta);
  let y0 =  SPHERE_R*cos(phi);
  let z0 =  SPHERE_R*sin(phi)*sin(theta);
  let cosX=cos(rotX), sinX=sin(rotX);
  let y1 = y0*cosX - z0*sinX;
  let z1 = y0*sinX + z0*cosX;
  let cosY=cos(rotY), sinY=sin(rotY);
  let x2 =  x0*cosY + z1*sinY;
  let z2 = -x0*sinY + z1*cosY;
  let depth = z2/SPHERE_R;
  let persp = 1+depth*0.18;
  return { sx:cx+x2*persp, sy:cy+y1*persp, depth };
}

function fieldDelta(theta, phi){
  let t  = frameCount*FIELD_EVOLUTION;
  let nx = cos(theta)*sin(phi)*FIELD_SCALE;
  let ny = sin(theta)*sin(phi)*FIELD_SCALE;
  let nz = cos(phi)           *FIELD_SCALE;
  let a1 = (noise(nx,       ny+3.7, t)-0.5)*FIELD_ANGLE;
  let a2 = (noise(nx+5.3,   nz+1.9, t)-0.5)*FIELD_ANGLE;
  return { dTheta:cos(a1)*SPEED, dPhi:sin(a2)*SPEED };
}

class Particle {
  constructor(){
    this.theta   = random(TWO_PI);
    this.phi     = acos(random(-1,1));
    this.wNorm   = random();
    this.colNorm = random();
    this.trail   = [];
    this.velT    = 0;
    this.velP    = 0;
    this._proj   = null;
  }

  update(){
    this.trail.push({theta:this.theta, phi:this.phi});
    while(this.trail.length>TRAIL_LENGTH) this.trail.shift();

    let {dTheta,dPhi} = fieldDelta(this.theta, this.phi);

    // ── Atrator — força idêntica ao original, escala corrigida ──────────────
    if(attractor.active && attractor.strength>0 && this._proj){
      let dx = attractor.x-this._proj.sx;
      let dy = attractor.y-this._proj.sy;
      let d  = sqrt(dx*dx+dy*dy);
      if(d<ATTRACTOR_RADIUS){
        let inf = (1-d/ATTRACTOR_RADIUS)*attractor.strength;
        if(d>0.1){
          // Radial + tangential (igual ao original)
          let rf  = (d-ORBIT_DISTANCE)/ATTRACTOR_RADIUS;
          let nx_ = dx/d, ny_=dy/d;
          let tx  = -ny_, ty=nx_;
          let ax  = (nx_*rf+tx*0.8)*inf*ATTRACTOR_STRENGTH;
          let ay  = (ny_*rf+ty*0.8)*inf*ATTRACTOR_STRENGTH;
          // Escala: pixels → radianos. 
          // SPHERE_R pixels = PI radianos na superfície → fator = PI/SPHERE_R
          // Modulado por SPEED para manter proporção com a velocidade atual
          let k = (PI/SPHERE_R) * SPEED * 3.0;
          let sinP = max(0.08, abs(sin(this.phi)));
          dTheta = lerp(dTheta, dTheta + ax/sinP*k, inf);
          dPhi   = lerp(dPhi,   dPhi   + ay*k,      inf);
        }
      }
    }

    // ── Repulsão — grade espacial idêntica ao original, escala corrigida ────
    if(REPULSION_STRENGTH>0 && this._proj){
      let px=this._proj.sx, py=this._proj.sy;
      let gcx=floor(px/spatialGrid.cell), gcy=floor(py/spatialGrid.cell);
      let rx=0, ry=0;
      for(let ddx=-1;ddx<=1;ddx++){
        for(let ddy=-1;ddy<=1;ddy++){
          let nb=spatialGrid.cells[(gcx+ddx)+','+(gcy+ddy)];
          if(!nb) continue;
          for(let o of nb){
            if(o===this||!o._proj) continue;
            let ox=px-o._proj.sx, oy=py-o._proj.sy;
            let od=sqrt(ox*ox+oy*oy);
            if(od>0&&od<REPULSION_RADIUS){
              let f=(1-od/REPULSION_RADIUS)*REPULSION_STRENGTH;
              rx+=ox/od*f; ry+=oy/od*f;
            }
          }
        }
      }
      // Mesma escala: proporcionada ao SPEED
      let k = (PI/SPHERE_R)*SPEED*1.2;
      let sinP = max(0.08, abs(sin(this.phi)));
      dTheta += rx/sinP*k;
      dPhi   += ry*k;
    }

    this.velT = lerp(this.velT, dTheta, 0.25);
    this.velP = lerp(this.velP, dPhi,   0.25);
    this.theta += this.velT;
    this.phi   += this.velP;

    if(this.phi<0)  { this.phi=-this.phi;        this.theta+=PI; }
    if(this.phi>PI) { this.phi=TWO_PI-this.phi;  this.theta+=PI; }
    this.theta=((this.theta%TWO_PI)+TWO_PI)%TWO_PI;
  }

  draw(){
    let n=this.trail.length;
    if(n<2) return;
    let pts      = this.trail.map(p=>project(p.theta,p.phi));
    let avgDepth = pts.reduce((s,p)=>s+p.depth,0)/n;
    let visibility = map(avgDepth,-1,1,BACKFACE_CULL,1.0);
    let wScale     = map(avgDepth,-1,1,0.35,1.0);
    let col=pickColorFromNorm(this.colNorm);
    noStroke();
    fill(col[0],col[1],col[2], 255*visibility*col[3]*6);
    let left=[],right=[];
    for(let i=0;i<n;i++){
      let a = i<n-1
        ? atan2(pts[i+1].sy-pts[i].sy, pts[i+1].sx-pts[i].sx)
        : atan2(pts[i].sy-pts[i-1].sy, pts[i].sx-pts[i-1].sx);
      let perp=a+HALF_PI;
      let t   =FADE_TAIL?i/(n-1):1;
      let hw  =lerp(MIN_WIDTH,MAX_WIDTH,this.wNorm)*t*wScale/2;
      left.push ({x:pts[i].sx+cos(perp)*hw, y:pts[i].sy+sin(perp)*hw});
      right.push({x:pts[i].sx-cos(perp)*hw, y:pts[i].sy-sin(perp)*hw});
    }
    beginShape();
    for(let p of left)            curveVertex(p.x,p.y);
    for(let p of right.reverse()) curveVertex(p.x,p.y);
    endShape(CLOSE);
  }
}

// ── Cores ─────────────────────────────────────────────────────────────────────
function pickColorFromNorm(norm){
  let total=PALETTE.reduce((s,c)=>s+c[3],0),acc=0;
  for(let c of PALETTE){acc+=c[3]/total;if(norm<=acc)return applyColorMods(c);}
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
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function hexToRgb(h){return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};}

// ── UI ─────────────────────────────────────────────────────────────────────────
function buildUI(){
  let style=document.createElement('style');
  style.textContent=`
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

  let sidebar=document.createElement('div');sidebar.id='ui-sidebar';document.body.appendChild(sidebar);
  panel=document.createElement('div');panel.id='ui-panel';sidebar.appendChild(panel);
  let btn=document.createElement('button');btn.id='toggle-btn';btn.textContent='PARAMS';
  btn.onclick=()=>sidebar.classList.toggle('open');
  document.body.appendChild(btn);

  function sec(t){let d=document.createElement('div');d.className='sec';d.textContent=t;panel.appendChild(d);}
  function sliderRef(label,get,set,mn,mx,step){
    let div=document.createElement('div');div.className='ctrl';
    let lbl=document.createElement('label'),txt=document.createTextNode(label+' '),val=document.createElement('span');
    val.textContent=get().toFixed(step<0.01?4:step<1?2:0);lbl.appendChild(txt);lbl.appendChild(val);
    let inp=document.createElement('input');inp.type='range';inp.min=mn;inp.max=mx;inp.step=step;inp.value=get();
    inp.oninput=()=>{let v=parseFloat(inp.value);set(v);val.textContent=v.toFixed(step<0.01?4:step<1?2:0);};
    div.appendChild(lbl);div.appendChild(inp);panel.appendChild(div);return{inp,val};
  }
  function slider(l,g,s,mn,mx,st){sliderRef(l,g,s,mn,mx,st);}
  function chk(label,get,set){
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent=label;
    let inp=document.createElement('input');inp.type='checkbox';inp.checked=get();
    inp.onchange=()=>set(inp.checked);div.appendChild(lbl);div.appendChild(inp);panel.appendChild(div);
  }

  sec('Esfera');
  slider('raio',           ()=>SPHERE_R,      v=>SPHERE_R=v,      60,  500,  5);
  chk(  'contorno',        ()=>SHOW_OUTLINE,  v=>SHOW_OUTLINE=v);
  chk(  'auto-rotacao',    ()=>AUTO_ROTATE,   v=>AUTO_ROTATE=v);
  slider('vel. rotacao',   ()=>ROT_SPEED_Y,   v=>ROT_SPEED_Y=v,   0,   0.006,0.0001);
  slider('backface alpha', ()=>BACKFACE_CULL, v=>BACKFACE_CULL=v, 0,   0.6,  0.01);

  sec('Flow Field');
  slider('field scale',    ()=>FIELD_SCALE,     v=>FIELD_SCALE=v,     0.1,6.0,  0.05);
  slider('field angle',    ()=>FIELD_ANGLE,     v=>FIELD_ANGLE=v,     0.1,9.0,  0.01);
  slider('field evolution',()=>FIELD_EVOLUTION, v=>FIELD_EVOLUTION=v, 0,  0.002,0.00005);

  sec('Repulsao');
  slider('raio',  ()=>REPULSION_RADIUS,   v=>REPULSION_RADIUS=v,   1,  100,1);
  slider('forca', ()=>REPULSION_STRENGTH, v=>REPULSION_STRENGTH=v, 0,  3.0,0.05);

  sec('Particulas');
  slider('quantidade', ()=>NUM_PARTICLES, v=>{NUM_PARTICLES=Math.round(v);init();},50,1500,10);
  slider('cauda',      ()=>TRAIL_LENGTH,  v=>TRAIL_LENGTH=Math.round(v),          4, 80,  1);
  slider('min width',  ()=>MIN_WIDTH,     v=>MIN_WIDTH=v,                          0.5,30,0.5);
  slider('max width',  ()=>MAX_WIDTH,     v=>MAX_WIDTH=v,                          1,  60,0.5);
  slider('speed',      ()=>SPEED,         v=>SPEED=v,                              0.001,0.06,0.001);
  chk(  'fade tail',   ()=>FADE_TAIL,     v=>FADE_TAIL=v);

  sec('Atrator (hover)');
  slider('raio',        ()=>ATTRACTOR_RADIUS,   v=>ATTRACTOR_RADIUS=v,   10, 500, 5);
  slider('forca',       ()=>ATTRACTOR_STRENGTH, v=>ATTRACTOR_STRENGTH=v, 0.1,16.0,0.1);
  slider('decaimento',  ()=>ATTRACTOR_DECAY,    v=>ATTRACTOR_DECAY=v,    0.001,0.05,0.001);
  slider('raio orbita', ()=>ORBIT_DISTANCE,     v=>ORBIT_DISTANCE=v,     5,  300, 5);

  sec('Estilo');
  chk(  'bg fade',       ()=>BG_FADE,       v=>BG_FADE=v);
  slider('bg fade alpha',()=>BG_FADE_ALPHA, v=>BG_FADE_ALPHA=v, 2,60,1);

  sec('Cores');
  let satRef,lightRef;
  {
    let div=document.createElement('div');div.className='ctrl';
    let lbl=document.createElement('label');lbl.textContent='paleta preset';
    let s=document.createElement('select');
    s.style.cssText='background:#333;color:#eee;border:1px solid #555;padding:2px 4px;font-family:monospace;font-size:11px;width:100%;';
    ['custom',...Object.keys(PALETTES_PRESET)].forEach(o=>{
      let op=document.createElement('option');op.value=o;op.textContent=o;s.appendChild(op);
    });
    s.onchange=()=>{
      if(s.value==='custom')return;
      PALETTE=PALETTES_PRESET[s.value].map(c=>[...c]);
      SAT_MULT=1.0;LIGHT_MULT=1.0;
      if(satRef){satRef.inp.value=1.0;satRef.val.textContent='1.00';}
      if(lightRef){lightRef.inp.value=1.0;lightRef.val.textContent='1.00';}
      rebuildColorEditor();
    };
    window._paletteSelect=s;div.appendChild(lbl);div.appendChild(s);panel.appendChild(div);
  }
  satRef  =sliderRef('saturacao',()=>SAT_MULT,   v=>{SAT_MULT=v;   if(window._paletteSelect)window._paletteSelect.value='custom';},0,2.0,0.05);
  lightRef=sliderRef('brilho',   ()=>LIGHT_MULT, v=>{LIGHT_MULT=v; if(window._paletteSelect)window._paletteSelect.value='custom';},0,2.0,0.05);
  {
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent='cor do fundo';
    let cp=document.createElement('input');cp.type='color';cp.value=rgbToHex(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);
    cp.style.cssText='width:100%;height:24px;border:none;background:none;cursor:pointer;padding:0;';
    cp.oninput=()=>{let rgb=hexToRgb(cp.value);BG_COLOR=[rgb.r,rgb.g,rgb.b];emitTheme();};
    div.appendChild(lbl);div.appendChild(cp);panel.appendChild(div);
  }

  let colorEditorEl=document.createElement('div');colorEditorEl.id='color-editor';panel.appendChild(colorEditorEl);
  function rebuildColorEditor(){
    colorEditorEl.innerHTML='';
    let total=PALETTE.reduce((s,c)=>s+c[3],0);if(total>0)PALETTE.forEach(c=>c[3]=c[3]/total);
    PALETTE.forEach((c,i)=>{
      let row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;';
      let cp=document.createElement('input');cp.type='color';cp.value=rgbToHex(c[0],c[1],c[2]);
      cp.style.cssText='width:36px;height:24px;border:none;background:none;cursor:pointer;padding:0;flex-shrink:0;';
      cp.oninput=()=>{let rgb=hexToRgb(cp.value);PALETTE[i][0]=rgb.r;PALETTE[i][1]=rgb.g;PALETTE[i][2]=rgb.b;if(window._paletteSelect)window._paletteSelect.value='custom';};
      let probWrap=document.createElement('div');probWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:1px;';
      let probLbl=document.createElement('label');probLbl.style.cssText='color:#aaa;font-size:10px;display:flex;justify-content:space-between;';
      probLbl.appendChild(document.createTextNode('prob '));
      let probVal=document.createElement('span');probVal.style.color='#f0a040';probVal.textContent=c[3].toFixed(2);probLbl.appendChild(probVal);
      let probInp=document.createElement('input');probInp.type='range';probInp.min=0;probInp.max=1;probInp.step=0.01;probInp.value=c[3];
      probInp.style.cssText='width:100%;accent-color:#f0a040;';
      probInp.oninput=()=>{
        if(window._paletteSelect)window._paletteSelect.value='custom';
        let nv=parseFloat(probInp.value),ov=PALETTE[i][3],delta=nv-ov,os=1-ov;
        if(os<0.001)return;PALETTE[i][3]=nv;
        PALETTE.forEach((cc,j)=>{if(j===i)return;cc[3]=Math.max(0,cc[3]-delta*(cc[3]/os));});
        let t=PALETTE.reduce((s,cc)=>s+cc[3],0);PALETTE.forEach(cc=>cc[3]=cc[3]/t);
        colorEditorEl.querySelectorAll('input[type=range]').forEach((inp,j)=>{if(j!==i)inp.value=PALETTE[j][3];});
        colorEditorEl.querySelectorAll('span').forEach((sp,j)=>{sp.textContent=PALETTE[j][3].toFixed(2);});
        probVal.textContent=PALETTE[i][3].toFixed(2);probInp.value=PALETTE[i][3];
      };
      probWrap.appendChild(probLbl);probWrap.appendChild(probInp);
      row.appendChild(cp);row.appendChild(probWrap);colorEditorEl.appendChild(row);
    });
  }
  rebuildColorEditor();

  sec('Seed');
  chk(  'fixed seed',()=>USE_FIXED_SEED,v=>{USE_FIXED_SEED=v;init();});
  slider('seed',     ()=>FIXED_SEED,    v=>{FIXED_SEED=v;if(USE_FIXED_SEED)init();},1,9999,1);

  let row=document.createElement('div');row.className='btn-row';
  let rb=document.createElement('button');rb.textContent='REINICIAR';rb.onclick=init;
  row.appendChild(rb);panel.appendChild(row);
}
