// FIDENZA EMBED — sphere illusion + preset lerp system
// ?edit=true  → painel completo de edição
// (sem parâmetro) → slider flutuante de cenas para o usuário
const EDIT_MODE = new URLSearchParams(window.location.search).get('edit') === 'true';

let CANVAS_W=800,CANVAS_H=800,FIELD_SCALE=0.0018,FIELD_ANGLE=3.14159,FIELD_EVOLUTION=0.0003;
let REPULSION_RADIUS=30,REPULSION_STRENGTH=0.8,NUM_PARTICLES=800,TRAIL_LENGTH=10;
let MIN_WIDTH=4,MAX_WIDTH=18,SPEED=4.0,WRAP_EDGES=true;
let ATTRACTOR_RADIUS=180,ATTRACTOR_STRENGTH=2.5,ATTRACTOR_DECAY=0.015,ORBIT_DISTANCE=60;
let DRAW_STYLE="solid",SOFT_LINES=8,FADE_TAIL=true;
let PALETTE=[[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]];
const PALETTES_PRESET={'clássico':[[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]],'pastel':[[255,180,180,0.25],[180,220,255,0.25],[180,255,200,0.20],[255,240,180,0.20],[220,180,255,0.10]],'monocromático':[[30,30,30,0.30],[80,80,80,0.25],[140,140,140,0.25],[200,200,200,0.15],[240,240,240,0.05]],'vibrante':[[255,50,50,0.25],[50,200,100,0.25],[50,100,255,0.20],[255,200,0,0.20],[200,0,200,0.10]],'terra':[[180,100,40,0.30],[140,80,30,0.25],[200,160,80,0.20],[100,70,40,0.15],[230,200,140,0.10]],'oceano':[[20,80,140,0.30],[40,140,180,0.25],[80,200,200,0.20],[20,40,80,0.15],[160,220,230,0.10]]};
let SAT_MULT=1.0,LIGHT_MULT=1.0,BG_COLOR=[245,240,228],BG_FADE=false,BG_FADE_ALPHA=20;
let USE_FIXED_SEED=false,FIXED_SEED=42;
let attractor={x:0,y:0,strength:0,active:false};
let particles=[],spatialGrid={cells:{},cell:30},panel;

// ── ESFERA ─────────────────────────────────────────────────────────────────────
let SPHERE_R_PCT=0.38,SPHERE_R_MIN=120,SPHERE_R_MAX=500,SPHERE_R=260;
let ROT_SPEED=0.0013,rotY=0;
function calcSphereR(){ return constrain(min(CANVAS_W,CANVAS_H)*SPHERE_R_PCT,SPHERE_R_MIN,SPHERE_R_MAX); }
function toSphere(x,y){
  let u=x/CANVAS_W,v=y/CANVAS_H;
  let theta=u*TWO_PI+rotY,phi=v*PI;
  let sx=SPHERE_R*sin(phi)*cos(theta),sy=SPHERE_R*cos(phi),sz=SPHERE_R*sin(phi)*sin(theta);
  return {px:CANVAS_W/2+sx,py:CANVAS_H/2+sy,depth:sz/SPHERE_R};
}

// ── PRESETS HARDCODED ──────────────────────────────────────────────────────────
// Edite esses valores usando ?edit=true e depois exporte via botão "Exportar JSON"
const SCENE_DEFAULTS = [
  // Preset 1 — default
  {FIELD_SCALE:0.0018,FIELD_ANGLE:3.14159,FIELD_EVOLUTION:0.0003,REPULSION_RADIUS:30,REPULSION_STRENGTH:0.8,NUM_PARTICLES:800,TRAIL_LENGTH:10,MIN_WIDTH:4,MAX_WIDTH:18,SPEED:4.0,WRAP_EDGES:true,ATTRACTOR_RADIUS:180,ATTRACTOR_STRENGTH:2.5,ATTRACTOR_DECAY:0.015,ORBIT_DISTANCE:60,FADE_TAIL:true,BG_FADE:false,BG_FADE_ALPHA:20,SAT_MULT:1.0,LIGHT_MULT:1.0,BG_COLOR:[245,240,228],PALETTE:[[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]],SPHERE_R_PCT:0.38,SPHERE_R_MIN:120,SPHERE_R_MAX:500,ROT_SPEED:0.0013},
  // Preset 2
  {FIELD_SCALE:0.0035,FIELD_ANGLE:6.28,FIELD_EVOLUTION:0.0006,REPULSION_RADIUS:15,REPULSION_STRENGTH:0.3,NUM_PARTICLES:400,TRAIL_LENGTH:25,MIN_WIDTH:2,MAX_WIDTH:8,SPEED:2.0,WRAP_EDGES:true,ATTRACTOR_RADIUS:250,ATTRACTOR_STRENGTH:5.0,ATTRACTOR_DECAY:0.01,ORBIT_DISTANCE:40,FADE_TAIL:true,BG_FADE:true,BG_FADE_ALPHA:12,SAT_MULT:0.7,LIGHT_MULT:1.3,BG_COLOR:[20,20,40],PALETTE:[[20,80,140,0.30],[40,140,180,0.25],[80,200,200,0.20],[20,40,80,0.15],[160,220,230,0.10]],SPHERE_R_PCT:0.32,SPHERE_R_MIN:100,SPHERE_R_MAX:400,ROT_SPEED:0.0025},
  // Preset 3
  {FIELD_SCALE:0.001,FIELD_ANGLE:1.5,FIELD_EVOLUTION:0.0001,REPULSION_RADIUS:50,REPULSION_STRENGTH:1.5,NUM_PARTICLES:1200,TRAIL_LENGTH:6,MIN_WIDTH:6,MAX_WIDTH:30,SPEED:7.0,WRAP_EDGES:true,ATTRACTOR_RADIUS:120,ATTRACTOR_STRENGTH:1.5,ATTRACTOR_DECAY:0.02,ORBIT_DISTANCE:80,FADE_TAIL:false,BG_FADE:false,BG_FADE_ALPHA:20,SAT_MULT:1.5,LIGHT_MULT:0.9,BG_COLOR:[245,240,228],PALETTE:[[255,50,50,0.25],[50,200,100,0.25],[50,100,255,0.20],[255,200,0,0.20],[200,0,200,0.10]],SPHERE_R_PCT:0.45,SPHERE_R_MIN:150,SPHERE_R_MAX:600,ROT_SPEED:0.0005},
  // Preset 4
  {FIELD_SCALE:0.005,FIELD_ANGLE:9.0,FIELD_EVOLUTION:0.001,REPULSION_RADIUS:8,REPULSION_STRENGTH:0.1,NUM_PARTICLES:600,TRAIL_LENGTH:40,MIN_WIDTH:1,MAX_WIDTH:5,SPEED:3.0,WRAP_EDGES:true,ATTRACTOR_RADIUS:300,ATTRACTOR_STRENGTH:8.0,ATTRACTOR_DECAY:0.008,ORBIT_DISTANCE:30,FADE_TAIL:true,BG_FADE:true,BG_FADE_ALPHA:8,SAT_MULT:0.3,LIGHT_MULT:1.5,BG_COLOR:[10,10,10],PALETTE:[[200,200,200,0.35],[150,150,150,0.30],[100,100,100,0.20],[60,60,60,0.10],[240,240,240,0.05]],SPHERE_R_PCT:0.42,SPHERE_R_MIN:130,SPHERE_R_MAX:550,ROT_SPEED:0.002},
  // Preset 5
  {FIELD_SCALE:0.0025,FIELD_ANGLE:4.7,FIELD_EVOLUTION:0.0005,REPULSION_RADIUS:20,REPULSION_STRENGTH:0.5,NUM_PARTICLES:900,TRAIL_LENGTH:15,MIN_WIDTH:3,MAX_WIDTH:14,SPEED:5.0,WRAP_EDGES:true,ATTRACTOR_RADIUS:200,ATTRACTOR_STRENGTH:3.5,ATTRACTOR_DECAY:0.012,ORBIT_DISTANCE:55,FADE_TAIL:true,BG_FADE:false,BG_FADE_ALPHA:20,SAT_MULT:1.2,LIGHT_MULT:1.0,BG_COLOR:[245,240,228],PALETTE:[[180,100,40,0.30],[140,80,30,0.25],[200,160,80,0.20],[100,70,40,0.15],[230,200,140,0.10]],SPHERE_R_PCT:0.35,SPHERE_R_MIN:110,SPHERE_R_MAX:450,ROT_SPEED:0.0018}
];

// Presets editáveis em runtime (inicializados com os defaults hardcoded)
let SCENE_PRESETS = SCENE_DEFAULTS.map(p=>JSON.parse(JSON.stringify(p)));
let SCENE_POS = 0;

// ── PRESET FUNCTIONS ───────────────────────────────────────────────────────────
function captureState(){
  return {
    FIELD_SCALE,FIELD_ANGLE,FIELD_EVOLUTION,
    REPULSION_RADIUS,REPULSION_STRENGTH,
    NUM_PARTICLES,TRAIL_LENGTH,MIN_WIDTH,MAX_WIDTH,SPEED,WRAP_EDGES,
    ATTRACTOR_RADIUS,ATTRACTOR_STRENGTH,ATTRACTOR_DECAY,ORBIT_DISTANCE,
    FADE_TAIL,BG_FADE,BG_FADE_ALPHA,SAT_MULT,LIGHT_MULT,
    BG_COLOR:[...BG_COLOR],
    PALETTE:PALETTE.map(c=>[...c]),
    SPHERE_R_PCT,SPHERE_R_MIN,SPHERE_R_MAX,ROT_SPEED
  };
}
function applyState(s,doInit){
  FIELD_SCALE=s.FIELD_SCALE; FIELD_ANGLE=s.FIELD_ANGLE; FIELD_EVOLUTION=s.FIELD_EVOLUTION;
  REPULSION_RADIUS=s.REPULSION_RADIUS; REPULSION_STRENGTH=s.REPULSION_STRENGTH;
  NUM_PARTICLES=s.NUM_PARTICLES; TRAIL_LENGTH=s.TRAIL_LENGTH;
  MIN_WIDTH=s.MIN_WIDTH; MAX_WIDTH=s.MAX_WIDTH; SPEED=s.SPEED; WRAP_EDGES=s.WRAP_EDGES;
  ATTRACTOR_RADIUS=s.ATTRACTOR_RADIUS; ATTRACTOR_STRENGTH=s.ATTRACTOR_STRENGTH;
  ATTRACTOR_DECAY=s.ATTRACTOR_DECAY; ORBIT_DISTANCE=s.ORBIT_DISTANCE;
  FADE_TAIL=s.FADE_TAIL; BG_FADE=s.BG_FADE; BG_FADE_ALPHA=s.BG_FADE_ALPHA;
  SAT_MULT=s.SAT_MULT; LIGHT_MULT=s.LIGHT_MULT;
  BG_COLOR=[...s.BG_COLOR]; PALETTE=s.PALETTE.map(c=>[...c]);
  SPHERE_R_PCT=s.SPHERE_R_PCT; SPHERE_R_MIN=s.SPHERE_R_MIN; SPHERE_R_MAX=s.SPHERE_R_MAX;
  ROT_SPEED=s.ROT_SPEED; SPHERE_R=calcSphereR();
  if(doInit) init();
}
function lerpN(a,b,t){ return a+(b-a)*t; }
function lerpState(a,b,t){
  return {
    FIELD_SCALE:lerpN(a.FIELD_SCALE,b.FIELD_SCALE,t),
    FIELD_ANGLE:lerpN(a.FIELD_ANGLE,b.FIELD_ANGLE,t),
    FIELD_EVOLUTION:lerpN(a.FIELD_EVOLUTION,b.FIELD_EVOLUTION,t),
    REPULSION_RADIUS:lerpN(a.REPULSION_RADIUS,b.REPULSION_RADIUS,t),
    REPULSION_STRENGTH:lerpN(a.REPULSION_STRENGTH,b.REPULSION_STRENGTH,t),
    NUM_PARTICLES:Math.round(lerpN(a.NUM_PARTICLES,b.NUM_PARTICLES,t)),
    TRAIL_LENGTH:Math.round(lerpN(a.TRAIL_LENGTH,b.TRAIL_LENGTH,t)),
    MIN_WIDTH:lerpN(a.MIN_WIDTH,b.MIN_WIDTH,t),
    MAX_WIDTH:lerpN(a.MAX_WIDTH,b.MAX_WIDTH,t),
    SPEED:lerpN(a.SPEED,b.SPEED,t),
    WRAP_EDGES:t<0.5?a.WRAP_EDGES:b.WRAP_EDGES,
    ATTRACTOR_RADIUS:lerpN(a.ATTRACTOR_RADIUS,b.ATTRACTOR_RADIUS,t),
    ATTRACTOR_STRENGTH:lerpN(a.ATTRACTOR_STRENGTH,b.ATTRACTOR_STRENGTH,t),
    ATTRACTOR_DECAY:lerpN(a.ATTRACTOR_DECAY,b.ATTRACTOR_DECAY,t),
    ORBIT_DISTANCE:lerpN(a.ORBIT_DISTANCE,b.ORBIT_DISTANCE,t),
    FADE_TAIL:t<0.5?a.FADE_TAIL:b.FADE_TAIL,
    BG_FADE:t<0.5?a.BG_FADE:b.BG_FADE,
    BG_FADE_ALPHA:lerpN(a.BG_FADE_ALPHA,b.BG_FADE_ALPHA,t),
    SAT_MULT:lerpN(a.SAT_MULT,b.SAT_MULT,t),
    LIGHT_MULT:lerpN(a.LIGHT_MULT,b.LIGHT_MULT,t),
    BG_COLOR:a.BG_COLOR.map((v,i)=>Math.round(lerpN(v,b.BG_COLOR[i],t))),
    PALETTE:a.PALETTE.map((c,i)=>c.map((v,j)=>j<3?Math.round(lerpN(v,b.PALETTE[i][j],t)):lerpN(v,b.PALETTE[i][j],t))),
    SPHERE_R_PCT:lerpN(a.SPHERE_R_PCT,b.SPHERE_R_PCT,t),
    SPHERE_R_MIN:lerpN(a.SPHERE_R_MIN,b.SPHERE_R_MIN,t),
    SPHERE_R_MAX:lerpN(a.SPHERE_R_MAX,b.SPHERE_R_MAX,t),
    ROT_SPEED:lerpN(a.ROT_SPEED,b.ROT_SPEED,t)
  };
}
function applyScenePos(pos,doInit){
  let i=Math.floor(pos), t=pos-i;
  let a=SCENE_PRESETS[Math.min(i,4)];
  let b=SCENE_PRESETS[Math.min(i+1,4)];
  if(i>=4||t===0){ applyState(a,doInit); return; }
  applyState(lerpState(a,b,t),doInit);
}

// ── SETUP / DRAW ───────────────────────────────────────────────────────────────
function emitTheme(){ var lum=0.299*BG_COLOR[0]+0.587*BG_COLOR[1]+0.114*BG_COLOR[2]; try{window.parent.postMessage({fidenzaTheme:lum>128?'light':'dark'},'*');}catch(e){} }
function setup(){
  CANVAS_W=window.innerWidth; CANVAS_H=window.innerHeight; SPHERE_R=calcSphereR();
  // Aplica preset 1 por padrão
  applyState(SCENE_PRESETS[0], false);
  let cnv=createCanvas(CANVAS_W,CANVAS_H);
  cnv.elt.style.cssText='display:block;position:absolute;top:0;left:0;pointer-events:none;';
  document.addEventListener('mousemove',function(e){
    let r=cnv.elt.getBoundingClientRect();
    attractor.x=e.clientX-r.left; attractor.y=e.clientY-r.top;
    attractor.strength=1.0; attractor.active=true;
  });
  if(EDIT_MODE) buildEditUI();
  buildUserSlider();
  setTimeout(function(){
    CANVAS_W=window.innerWidth; CANVAS_H=window.innerHeight;
    SPHERE_R=calcSphereR(); resizeCanvas(CANVAS_W,CANVAS_H); init();
  },200);
  emitTheme();
  new ResizeObserver(function(es){
    for(let e of es){
      let nw=Math.floor(e.contentRect.width),nh=Math.floor(e.contentRect.height);
      if(nw>0&&nh>0&&(nw!==CANVAS_W||nh!==CANVAS_H)){
        CANVAS_W=nw;CANVAS_H=nh;SPHERE_R=calcSphereR();resizeCanvas(CANVAS_W,CANVAS_H);init();
      }
    }
  }).observe(document.body);
}
let _firstFrame=true;
function draw(){
  if(_firstFrame){
    let nw=Math.floor(window.innerWidth),nh=Math.floor(window.innerHeight);
    if(nw>0&&nh>0&&(nw!==CANVAS_W||nh!==CANVAS_H)){CANVAS_W=nw;CANVAS_H=nh;SPHERE_R=calcSphereR();resizeCanvas(CANVAS_W,CANVAS_H);init();}
    _firstFrame=false;
  }
  if(BG_FADE){fill(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2],BG_FADE_ALPHA);noStroke();rect(0,0,width,height);}
  else{background(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);}
  if(attractor.strength>0){attractor.strength=max(0,attractor.strength-ATTRACTOR_DECAY);if(attractor.strength===0)attractor.active=false;}
  rotY+=ROT_SPEED;
  buildSpatialGrid();
  for(let p of particles){p.update();p.draw();}
}
function init(){ let s=USE_FIXED_SEED?FIXED_SEED:floor(random(999999)); randomSeed(s);noiseSeed(s);particles=[]; for(let i=0;i<NUM_PARTICLES;i++)particles.push(new Particle()); }
function buildSpatialGrid(){ spatialGrid.cell=max(1,REPULSION_RADIUS);spatialGrid.cells={}; for(let p of particles){let cx=floor(p.x/spatialGrid.cell),cy=floor(p.y/spatialGrid.cell),k=cx+','+cy;if(!spatialGrid.cells[k])spatialGrid.cells[k]=[];spatialGrid.cells[k].push(p);} }
function fieldAngle(x,y){return noise(x*FIELD_SCALE,y*FIELD_SCALE,frameCount*FIELD_EVOLUTION)*FIELD_ANGLE;}
function windowResized(){CANVAS_W=document.body.clientWidth||window.innerWidth;CANVAS_H=document.body.clientHeight||window.innerHeight;resizeCanvas(CANVAS_W,CANVAS_H);}

class Particle{
  constructor(){this.x=random(CANVAS_W);this.y=random(CANVAS_H);this.wNorm=random();this.colNorm=random();this.trail=[];this.vel={x:0,y:0};}
  update(){
    this.trail.push({x:this.x,y:this.y});
    while(this.trail.length>TRAIL_LENGTH)this.trail.shift();
    let fa=fieldAngle(this.x,this.y),fx=cos(fa),fy=sin(fa);
    if(attractor.active&&attractor.strength>0){
      let proj=toSphere(this.x,this.y);
      let dx=attractor.x-proj.px,dy=attractor.y-proj.py,d=sqrt(dx*dx+dy*dy);
      if(d<ATTRACTOR_RADIUS){let inf=(1-d/ATTRACTOR_RADIUS)*attractor.strength;
        if(d>0.1){let rf=(d-ORBIT_DISTANCE)/ATTRACTOR_RADIUS,nx=dx/d,ny=dy/d,tx=-ny,ty=nx;
          let ax=(nx*rf+tx*0.8)*inf*ATTRACTOR_STRENGTH,ay=(ny*rf+ty*0.8)*inf*ATTRACTOR_STRENGTH;
          fx=lerp(fx,ax,inf);fy=lerp(fy,ay,inf);}
      }
    }
    if(REPULSION_STRENGTH>0){
      let rx=0,ry=0,cx=floor(this.x/spatialGrid.cell),cy=floor(this.y/spatialGrid.cell);
      for(let ddx=-1;ddx<=1;ddx++)for(let ddy=-1;ddy<=1;ddy++){
        let nb=spatialGrid.cells[(cx+ddx)+','+(cy+ddy)];if(!nb)continue;
        for(let o of nb){if(o===this)continue;let ox=this.x-o.x,oy=this.y-o.y,od=sqrt(ox*ox+oy*oy);
          if(od>0&&od<REPULSION_RADIUS){let f=(1-od/REPULSION_RADIUS)*REPULSION_STRENGTH;rx+=ox/od*f;ry+=oy/od*f;}}
      }
      fx+=rx;fy+=ry;
    }
    this.vel.x=lerp(this.vel.x,fx*SPEED,0.25);this.vel.y=lerp(this.vel.y,fy*SPEED,0.25);
    this.x+=this.vel.x;this.y+=this.vel.y;
    if(WRAP_EDGES){
      let ox=0,oy=0;
      if(this.x<0){ox=CANVAS_W;this.x+=CANVAS_W;}if(this.x>CANVAS_W){ox=-CANVAS_W;this.x-=CANVAS_W;}
      if(this.y<0){oy=CANVAS_H;this.y+=CANVAS_H;}if(this.y>CANVAS_H){oy=-CANVAS_H;this.y-=CANVAS_H;}
      if(ox||oy)for(let pt of this.trail){pt.x+=ox;pt.y+=oy;}
    }else{this.x=constrain(this.x,0,CANVAS_W);this.y=constrain(this.y,0,CANVAS_H);}
  }
  draw(){
    if(this.trail.length<2)return;
    let pts=this.trail.map(p=>toSphere(p.x,p.y));
    let avgDepth=pts.reduce((s,p)=>s+p.depth,0)/pts.length;
    let alpha=map(avgDepth,-1,1,0.06,1.0);
    let col=pickColorFromNorm(this.colNorm),r=col[0],g=col[1],b=col[2];
    let left=[],right=[],n=pts.length;
    for(let i=0;i<n;i++){
      let a=i<n-1?atan2(pts[i+1].py-pts[i].py,pts[i+1].px-pts[i].px):atan2(pts[i].py-pts[i-1].py,pts[i].px-pts[i-1].px);
      let perp=a+1.5708,t=FADE_TAIL?i/(n-1):1,hw=lerp(MIN_WIDTH,MAX_WIDTH,this.wNorm)*t/2;
      left.push({x:pts[i].px+cos(perp)*hw,y:pts[i].py+sin(perp)*hw});
      right.push({x:pts[i].px-cos(perp)*hw,y:pts[i].py-sin(perp)*hw});
    }
    noStroke();fill(r,g,b,255*alpha);beginShape();
    for(let p of left)curveVertex(p.x,p.y);
    for(let p of right.reverse())curveVertex(p.x,p.y);
    endShape(CLOSE);
  }
}
function pickColorFromNorm(norm){ let total=PALETTE.reduce((s,c)=>s+c[3],0),acc=0; for(let c of PALETTE){acc+=c[3]/total;if(norm<=acc)return applyColorMods(c);} return applyColorMods(PALETTE[PALETTE.length-1]); }
function applyColorMods(c){ let r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0,s=0,l=(mx+mn)/2; if(d>0){s=d/(1-Math.abs(2*l-1));if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;} s=Math.min(1,s*SAT_MULT);l=Math.min(1,Math.max(0,l*LIGHT_MULT)); let q=l<0.5?l*(1+s):l+s-l*s,p2=2*l-q; function hue(t){t=(t+1)%1;if(t<1/6)return p2+(q-p2)*6*t;if(t<1/2)return q;if(t<2/3)return p2+(q-p2)*(2/3-t)*6;return p2;} return[Math.round(hue(h+1/3)*255),Math.round(hue(h)*255),Math.round(hue(h-1/3)*255),c[3]]; }
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function hexToRgb(h){return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};}

// ── SLIDER DO USUÁRIO (sempre visível) ─────────────────────────────────────────
function buildUserSlider(){
  let style=document.createElement('style');
  style.textContent=`
    #user-slider-wrap{
      position:fixed;right:18px;top:50%;transform:translateY(-50%);
      z-index:300;display:flex;flex-direction:column;align-items:center;gap:0;
      pointer-events:auto;touch-action:none;
    }
    #user-slider-track{
      position:relative;width:24px;height:200px;
      display:flex;flex-direction:column;align-items:center;
      justify-content:space-between;
    }
    #user-slider-line{
      position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);
      width:2px;background:rgba(0,0,0,0.15);border-radius:1px;
    }
    .user-dot{
      width:10px;height:10px;border-radius:50%;
      background:rgba(0,0,0,0.25);border:2px solid rgba(0,0,0,0.2);
      position:relative;z-index:2;flex-shrink:0;cursor:pointer;
      transition:background .2s,transform .2s;
    }
    .user-dot.active{background:rgba(0,0,0,0.7);transform:scale(1.3);}
    #user-thumb{
      position:absolute;left:50%;transform:translate(-50%,-50%);
      width:16px;height:16px;border-radius:50%;
      background:#fff;border:2px solid rgba(0,0,0,0.5);
      box-shadow:0 1px 4px rgba(0,0,0,0.25);
      pointer-events:none;z-index:4;
    }
    #user-inp{
      position:absolute;top:0;left:50%;transform:translateX(-50%);
      width:40px;height:200px;opacity:0;cursor:pointer;z-index:5;
      writing-mode:vertical-lr;direction:rtl;
      -webkit-appearance:slider-vertical;
    }
  `;
  document.head.appendChild(style);

  let wrap=document.createElement('div');wrap.id='user-slider-wrap';document.body.appendChild(wrap);
  let track=document.createElement('div');track.id='user-slider-track';wrap.appendChild(track);
  let line=document.createElement('div');line.id='user-slider-line';track.appendChild(line);
  let thumb=document.createElement('div');thumb.id='user-thumb';track.appendChild(thumb);

  // 5 dots
  let dotEls=[];
  for(let i=0;i<5;i++){
    let dot=document.createElement('div');dot.className='user-dot';
    dot.onclick=()=>{ inp.value=i; inp.dispatchEvent(new Event('input')); };
    track.appendChild(dot);dotEls.push(dot);
  }

  // Slider invisível vertical
  let inp=document.createElement('input');inp.type='range';inp.id='user-inp';
  inp.min=0;inp.max=4;inp.step=0.001;inp.value=0;
  // suporte vertical cross-browser
  inp.setAttribute('orient','vertical');
  track.appendChild(inp);

  function update(){
    let pos=parseFloat(inp.value);
    SCENE_POS=pos;
    // posição do thumb: 0=topo, 4=baixo → invertido
    let pct=pos/4; // 0..1
    thumb.style.top=(pct*100)+'%';
    dotEls.forEach((d,i)=>d.classList.toggle('active',Math.abs(pos-i)<0.06));
    applyScenePos(pos, false);
    if(window._refreshAllSliders) window._refreshAllSliders();
  }

  inp.oninput=update;

  // Touch drag direto na track
  let dragging=false,startY=0,startVal=0;
  track.addEventListener('pointerdown',e=>{
    dragging=true; startY=e.clientY; startVal=parseFloat(inp.value);
    track.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  track.addEventListener('pointermove',e=>{
    if(!dragging)return;
    let dy=e.clientY-startY;
    let trackH=track.getBoundingClientRect().height;
    let delta=(dy/trackH)*4;
    inp.value=Math.max(0,Math.min(4,startVal+delta));
    update();
  });
  track.addEventListener('pointerup',()=>dragging=false);
}

// ── PAINEL DE EDIÇÃO (?edit=true) ──────────────────────────────────────────────
function buildEditUI(){
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
    .save-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:4px;}
    .save-btn{padding:5px 2px;background:#2a2a2a;color:#888;border:1px solid #444;cursor:pointer;font-family:monospace;font-size:10px;border-radius:3px;text-align:center;}
    .save-btn:hover{background:#f0a040;color:#111;border-color:#f0a040;}
    .save-btn.saved{color:#f0a040;border-color:#f0a040;}
    #export-btn{width:100%;padding:7px;margin-top:6px;background:#1a3a1a;color:#4f4;border:1px solid #4f4;cursor:pointer;font-family:monospace;font-size:11px;border-radius:3px;letter-spacing:1px;}
    #export-btn:hover{background:#4f4;color:#111;}
  `;
  document.head.appendChild(style);

  let sidebar=document.createElement('div');sidebar.id='ui-sidebar';document.body.appendChild(sidebar);
  panel=document.createElement('div');panel.id='ui-panel';sidebar.appendChild(panel);
  let btn=document.createElement('button');btn.id='toggle-btn';btn.textContent='☰ EDIT';
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
  function sel(label,opts,get,set){
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent=label;
    let s=document.createElement('select');
    opts.forEach(o=>{let op=document.createElement('option');op.value=o;op.textContent=o;if(o===get())op.selected=true;s.appendChild(op);});
    s.onchange=()=>set(s.value);div.appendChild(lbl);div.appendChild(s);panel.appendChild(div);
  }
  function chk(label,get,set){
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent=label;
    let inp=document.createElement('input');inp.type='checkbox';inp.checked=get();
    inp.onchange=()=>set(inp.checked);div.appendChild(lbl);div.appendChild(inp);panel.appendChild(div);
  }

  // ── Seção de presets de cena ──
  sec('Cenas — salvar preset atual');
  let saveGrid=document.createElement('div');saveGrid.className='save-grid';panel.appendChild(saveGrid);
  let saveBtns=[];
  for(let i=0;i<5;i++){
    let sb=document.createElement('button');sb.className='save-btn';sb.textContent=`P${i+1}`;
    sb.title=`Salvar estado atual como preset ${i+1}`;
    sb.onclick=()=>{
      SCENE_PRESETS[i]=captureState();
      sb.classList.add('saved');sb.textContent=`P${i+1} ✓`;
    };
    saveGrid.appendChild(sb);saveBtns.push(sb);
  }

  // Botão exportar JSON
  let expBtn=document.createElement('button');expBtn.id='export-btn';expBtn.textContent='📋 Exportar JSON dos presets';
  expBtn.onclick=()=>{
    let json=JSON.stringify(SCENE_PRESETS,null,2);
    navigator.clipboard.writeText(json).then(()=>{
      expBtn.textContent='✓ Copiado!';
      setTimeout(()=>expBtn.textContent='📋 Exportar JSON dos presets',2000);
    }).catch(()=>{
      // fallback: abre janela com o JSON
      let w=window.open('','_blank');
      w.document.write('<pre style="font-family:monospace;font-size:12px;padding:20px">'+json+'</pre>');
    });
  };
  panel.appendChild(expBtn);

  let _refs={};
  sec('Esfera');
  _refs.SPHERE_R_PCT=sliderRef('raio %',()=>SPHERE_R_PCT,v=>{SPHERE_R_PCT=v;SPHERE_R=calcSphereR();},0.1,0.8,0.01);
  _refs.SPHERE_R_MIN=sliderRef('raio min px',()=>SPHERE_R_MIN,v=>{SPHERE_R_MIN=v;SPHERE_R=calcSphereR();},50,400,5);
  _refs.SPHERE_R_MAX=sliderRef('raio max px',()=>SPHERE_R_MAX,v=>{SPHERE_R_MAX=v;SPHERE_R=calcSphereR();},100,800,5);
  _refs.ROT_SPEED=sliderRef('rotação',()=>ROT_SPEED,v=>ROT_SPEED=v,0,0.02,0.0001);
  sec('Flow Field');
  _refs.FIELD_SCALE=sliderRef('field scale',()=>FIELD_SCALE,v=>FIELD_SCALE=v,0.0001,0.008,0.0001);
  _refs.FIELD_ANGLE=sliderRef('field angle',()=>FIELD_ANGLE,v=>FIELD_ANGLE=v,0.1,9.0,0.01);
  _refs.FIELD_EVOLUTION=sliderRef('field evolution',()=>FIELD_EVOLUTION,v=>FIELD_EVOLUTION=v,0,0.01,0.0001);
  sec('Repulsão');
  _refs.REPULSION_RADIUS=sliderRef('raio',()=>REPULSION_RADIUS,v=>REPULSION_RADIUS=v,1,100,1);
  _refs.REPULSION_STRENGTH=sliderRef('força',()=>REPULSION_STRENGTH,v=>REPULSION_STRENGTH=v,0,3.0,0.05);
  sec('Partículas');
  _refs.NUM_PARTICLES=sliderRef('quantidade',()=>NUM_PARTICLES,v=>{NUM_PARTICLES=Math.round(v);init();},10,2000,10);
  _refs.TRAIL_LENGTH=sliderRef('cauda',()=>TRAIL_LENGTH,v=>TRAIL_LENGTH=Math.round(v),5,150,1);
  _refs.MIN_WIDTH=sliderRef('min width',()=>MIN_WIDTH,v=>MIN_WIDTH=v,1,50,0.5);
  _refs.MAX_WIDTH=sliderRef('max width',()=>MAX_WIDTH,v=>MAX_WIDTH=v,1,100,0.5);
  _refs.SPEED=sliderRef('speed',()=>SPEED,v=>SPEED=v,0.1,18,0.1);
  chk('wrap edges',()=>WRAP_EDGES,v=>WRAP_EDGES=v);
  sec('Atrator');
  _refs.ATTRACTOR_RADIUS=sliderRef('raio',()=>ATTRACTOR_RADIUS,v=>ATTRACTOR_RADIUS=v,10,500,5);
  _refs.ATTRACTOR_STRENGTH=sliderRef('força',()=>ATTRACTOR_STRENGTH,v=>ATTRACTOR_STRENGTH=v,0.1,16.0,0.1);
  _refs.ATTRACTOR_DECAY=sliderRef('decaimento',()=>ATTRACTOR_DECAY,v=>ATTRACTOR_DECAY=v,0.001,0.05,0.001);
  _refs.ORBIT_DISTANCE=sliderRef('raio órbita',()=>ORBIT_DISTANCE,v=>ORBIT_DISTANCE=v,5,300,5);
  sec('Estilo');
  sel('draw style',['solid','soft','outlined'],()=>DRAW_STYLE,v=>DRAW_STYLE=v);
  chk('fade tail',()=>FADE_TAIL,v=>FADE_TAIL=v);
  chk('bg fade',()=>BG_FADE,v=>BG_FADE=v);
  _refs.BG_FADE_ALPHA=sliderRef('bg fade alpha',()=>BG_FADE_ALPHA,v=>BG_FADE_ALPHA=v,2,60,1);
  sec('Cores');
  let satRef,lightRef;
  {
    let div=document.createElement('div');div.className='ctrl';
    let lbl=document.createElement('label');lbl.textContent='paleta preset';
    let s=document.createElement('select');
    s.style.cssText='background:#333;color:#eee;border:1px solid #555;padding:2px 4px;font-family:monospace;font-size:11px;width:100%;';
    ['— custom —',...Object.keys(PALETTES_PRESET)].forEach(o=>{let op=document.createElement('option');op.value=o;op.textContent=o;s.appendChild(op);});
    s.onchange=()=>{if(s.value==='— custom —')return;PALETTE=PALETTES_PRESET[s.value].map(c=>[...c]);SAT_MULT=1.0;LIGHT_MULT=1.0;if(satRef){satRef.inp.value=1.0;satRef.val.textContent='1.00';}if(lightRef){lightRef.inp.value=1.0;lightRef.val.textContent='1.00';}rebuildColorEditor();};
    window._paletteSelect=s;div.appendChild(lbl);div.appendChild(s);panel.appendChild(div);
  }
  satRef=_refs.SAT_MULT=sliderRef('saturação',()=>SAT_MULT,v=>{SAT_MULT=v;if(window._paletteSelect)window._paletteSelect.value='— custom —';},0,2.0,0.05);
  lightRef=_refs.LIGHT_MULT=sliderRef('brilho',()=>LIGHT_MULT,v=>{LIGHT_MULT=v;if(window._paletteSelect)window._paletteSelect.value='— custom —';},0,2.0,0.05);
  {
    let div=document.createElement('div');div.className='ctrl';let lbl=document.createElement('label');lbl.textContent='cor do fundo';
    let cp=document.createElement('input');cp.type='color';cp.value=rgbToHex(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);
    cp.style.cssText='width:100%;height:24px;border:none;background:none;cursor:pointer;padding:0;';
    cp.oninput=()=>{let rgb=hexToRgb(cp.value);BG_COLOR=[rgb.r,rgb.g,rgb.b];emitTheme();};
    _refs.BG_COLOR_PICKER=cp;div.appendChild(lbl);div.appendChild(cp);panel.appendChild(div);
  }
  let colorEditorEl=document.createElement('div');colorEditorEl.id='color-editor';panel.appendChild(colorEditorEl);
  function rebuildColorEditor(){
    colorEditorEl.innerHTML='';
    let total=PALETTE.reduce((s,c)=>s+c[3],0);if(total>0)PALETTE.forEach(c=>c[3]=c[3]/total);
    PALETTE.forEach((c,i)=>{
      let row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;';
      let cp=document.createElement('input');cp.type='color';cp.value=rgbToHex(c[0],c[1],c[2]);
      cp.style.cssText='width:36px;height:24px;border:none;background:none;cursor:pointer;padding:0;flex-shrink:0;';
      cp.oninput=()=>{let rgb=hexToRgb(cp.value);PALETTE[i][0]=rgb.r;PALETTE[i][1]=rgb.g;PALETTE[i][2]=rgb.b;if(window._paletteSelect)window._paletteSelect.value='— custom —';};
      let probWrap=document.createElement('div');probWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:1px;';
      let probLbl=document.createElement('label');probLbl.style.cssText='color:#aaa;font-size:10px;display:flex;justify-content:space-between;';
      probLbl.appendChild(document.createTextNode('prob '));
      let probVal=document.createElement('span');probVal.style.color='#f0a040';probVal.textContent=c[3].toFixed(2);probLbl.appendChild(probVal);
      let probInp=document.createElement('input');probInp.type='range';probInp.min=0;probInp.max=1;probInp.step=0.01;probInp.value=c[3];
      probInp.style.cssText='width:100%;accent-color:#f0a040;';
      probInp.oninput=()=>{
        if(window._paletteSelect)window._paletteSelect.value='— custom —';
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
  window._rebuildColorEditor=rebuildColorEditor;
  sec('Seed');
  chk('fixed seed',()=>USE_FIXED_SEED,v=>{USE_FIXED_SEED=v;init();});
  slider('seed',()=>FIXED_SEED,v=>{FIXED_SEED=v;if(USE_FIXED_SEED)init();},1,9999,1);
  let row=document.createElement('div');row.className='btn-row';
  let rb=document.createElement('button');rb.textContent='⟳ REINICIAR';rb.onclick=init;
  row.appendChild(rb);panel.appendChild(row);

  function refreshAllSliders(){
    let map={FIELD_SCALE,FIELD_ANGLE,FIELD_EVOLUTION,REPULSION_RADIUS,REPULSION_STRENGTH,NUM_PARTICLES,TRAIL_LENGTH,MIN_WIDTH,MAX_WIDTH,SPEED,ATTRACTOR_RADIUS,ATTRACTOR_STRENGTH,ATTRACTOR_DECAY,ORBIT_DISTANCE,BG_FADE_ALPHA,SAT_MULT,LIGHT_MULT,SPHERE_R_PCT,SPHERE_R_MIN,SPHERE_R_MAX,ROT_SPEED};
    for(let k in map){if(_refs[k]){let r=_refs[k];r.inp.value=map[k];let step=parseFloat(r.inp.step);r.val.textContent=map[k].toFixed(step<0.01?4:step<1?2:0);}}
    if(_refs.BG_COLOR_PICKER)_refs.BG_COLOR_PICKER.value=rgbToHex(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);
    if(window._rebuildColorEditor)window._rebuildColorEditor();
    emitTheme();
  }
  window._refreshAllSliders=refreshAllSliders;
}
