/* ===== MicroSlats background (vanilla port of react-bits MicroSlats, MIT) =====
   WebGL2. Renders a wall of tiny slats that rolls like a sea in perspective,
   with glinting crests and a cursor-stirred fluid. Replaces the previous
   AcidSquares port; same contract: canvas #acid, error-safe, reduced-motion
   aware, theme-aware via window.__bgSyncTheme(). */
(()=>{try{
  const cv=document.getElementById('acid');
  if(!cv)return;
  const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});
  if(!gl){cv.style.display='none';return}
  const reduce=!!(matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

  const SWELL_PRESETS={
    swell:{scale:1.5,speed:.6,direction:250,chop:.55,stretch:0,glint:.7,contrast:1.25,perspective:.55,fog:.55},
    tide:{scale:1.3,speed:.5,direction:262,chop:.2,stretch:.12,glint:.45,contrast:1.1,perspective:.5,fog:.4},
    storm:{scale:.55,speed:1.6,direction:236,chop:1,stretch:.3,glint:1.3,contrast:1.8,perspective:.8,fog:.35},
    signal:{scale:.85,speed:1.2,direction:180,chop:.6,stretch:.85,glint:.25,contrast:1.2,perspective:0,fog:0}
  };
  const PRESET='swell';
  const BASE=SWELL_PRESETS[PRESET]||SWELL_PRESETS.swell;

  const FLUID_SIZE=96,PRESSURE_STEPS=16,SPLAT_FORCE=6900,SPLASH_JETS=3,PIXEL_BUDGET=4.5e6;
  const clamp=(v,mn,mx)=>Math.min(Math.max(v,mn),mx);

  // settings tuned for a light minimal Persian teacher site (RTL-safe)
  const S={
    slatWidth:10,slatHeight:24,gap:4,roundness:.75,
    preset:BASE,
    interactive:true,cursorStrength:1,cursorSize:56,swirl:0,trail:1.4,lean:0,
    intro:!reduce,introDuration:1.5,paused:false
  };

  // ---- shaders (unchanged math from the official component) ----
  const PASS_VS=`#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;
  const FLUID_VS=`#version 300 es
in vec2 position;uniform vec2 uTexel;
out vec2 vUv,vL,vR,vT,vB;
void main(){vUv=position*.5+.5;
  vL=vUv-vec2(uTexel.x,0.);vR=vUv+vec2(uTexel.x,0.);
  vT=vUv+vec2(0.,uTexel.y);vB=vUv-vec2(0.,uTexel.y);
  gl_Position=vec4(position,0.,1.);}`;
  const HEAD=`#version 300 es
precision highp float;
in vec2 vUv;in vec2 vL;in vec2 vR;in vec2 vT;in vec2 vB;
out vec4 fragColor;
`;
  const SPLAT_FS=HEAD+`uniform sampler2D uTarget;uniform float uAspect;uniform vec2 uPoint;uniform vec3 uValue;uniform float uRadius;
void main(){vec2 offset=vUv-uPoint;offset.x*=uAspect;
  float falloff=exp(-dot(offset,offset)/uRadius);
  fragColor=vec4(texture(uTarget,vUv).xyz+uValue*falloff,1.);}`;
  const CURL_FS=HEAD+`uniform sampler2D uVelocity;
void main(){float left=texture(uVelocity,vL).y,right=texture(uVelocity,vR).y,top=texture(uVelocity,vT).x,bottom=texture(uVelocity,vB).x;
  fragColor=vec4(.5*(right-left-top+bottom),0.,0.,1.);}`;
  const VORTICITY_FS=HEAD+`uniform sampler2D uVelocity;uniform sampler2D uCurl;uniform float uSwirl;uniform float uDt;
void main(){float left=texture(uCurl,vL).x,right=texture(uCurl,vR).x,top=texture(uCurl,vT).x,bottom=texture(uCurl,vB).x,middle=texture(uCurl,vUv).x;
  vec2 force=.5*vec2(abs(top)-abs(bottom),abs(right)-abs(left));
  force=force/(length(force)+.0001)*uSwirl*middle;
  force.y=-force.y;
  vec2 velocity=texture(uVelocity,vUv).xy+force*uDt;
  fragColor=vec4(clamp(velocity,-1000.,1000.),0.,1.);}`;
  const DIVERGENCE_FS=HEAD+`uniform sampler2D uVelocity;
void main(){vec2 middle=texture(uVelocity,vUv).xy;
  float left=vL.x<0.? -middle.x:texture(uVelocity,vL).x;
  float right=vR.x>1.? -middle.x:texture(uVelocity,vR).x;
  float top=vT.y>1.? -middle.y:texture(uVelocity,vT).y;
  float bottom=vB.y<0.? -middle.y:texture(uVelocity,vB).y;
  fragColor=vec4(.5*(right-left+top-bottom),0.,0.,1.);}`;
  const PRESSURE_FS=HEAD+`uniform sampler2D uPressure;uniform sampler2D uDivergence;
void main(){float left=texture(uPressure,vL).x,right=texture(uPressure,vR).x,top=texture(uPressure,vT).x,bottom=texture(uPressure,vB).x;
  float divergence=texture(uDivergence,vUv).x;
  fragColor=vec4((left+right+top+bottom-divergence)*.25,0.,0.,1.);}`;
  const PROJECT_FS=HEAD+`uniform sampler2D uPressure;uniform sampler2D uVelocity;
void main(){float left=texture(uPressure,vL).x,right=texture(uPressure,vR).x,top=texture(uPressure,vT).x,bottom=texture(uPressure,vB).x;
  vec2 velocity=texture(uVelocity,vUv).xy-vec2(right-left,top-bottom);
  fragColor=vec4(velocity,0.,1.);}`;
  const ADVECT_FS=HEAD+`uniform sampler2D uVelocity;uniform sampler2D uSource;uniform vec2 uTexel;uniform float uDt;uniform float uFade;
void main(){vec2 from=vUv-uDt*texture(uVelocity,vUv).xy*uTexel;
  fragColor=texture(uSource,from)/(1.+uFade*uDt);}`;
  const SCALE_FS=HEAD+`uniform sampler2D uSource;uniform float uValue;
void main(){fragColor=texture(uSource,vUv)*uValue;}`;
  const FIELD_FS=`#version 300 es
precision highp float;
uniform vec2 uSize;uniform vec4 uGrid;uniform vec2 uOrigin;uniform vec2 uSlat;
uniform float uTime,uScale,uDirection,uChop,uStretch,uGlint,uContrast,uPerspective,uFog,uIntro;
uniform sampler2D tVelocity;uniform sampler2D tInk;
uniform vec2 uFluidTexel;uniform float uFluid,uInk,uLean;
out vec4 fragColor;
const float TURN[4]=float[4](0.,-.95,.78,1.62);
const float LENGTH[4]=float[4](2.6,1.7,1.12,.76);
const float HEIGHT[4]=float[4](1.,.75,.5,.3);
const float SHIFT[4]=float[4](0.,2.3,4.1,1.1);
void main(){
  vec2 cell=floor(gl_FragCoord.xy);
  float row=uGrid.y-1.-cell.y;
  vec2 center=uOrigin+vec2(cell.x,row)*uGrid.zw+uSlat*.5;
  float v=clamp(center.y/uSize.y,0.,1.);
  vec2 flow=vec2(0.);float ink=0.;
  if(uFluid>.5){
    vec2 fluidUv=clamp(vec2(center.x/uSize.x,1.-center.y/uSize.y),0.,1.);
    flow=texture(tVelocity,fluidUv).xy*uFluidTexel*uSize;
    ink=texture(tInk,fluidUv).x;
  }
  float horizon=mix(8.,.5,uPerspective);
  float depth=(1.+horizon)/(v+horizon);
  vec2 world=vec2((center.x-uSize.x*.5)/uSize.y*depth,(depth-1.)*horizon*2.2);
  world-=flow*.00018*depth;
  world/=max(uScale,.05);
  float meander=.55*sin(dot(world,vec2(.23,.41))*.9+uTime*.13)
    +.3*sin(dot(world,vec2(-.37,.19))*1.4-uTime*.09);
  float steep=uChop*.45;
  float height=0.;float total=0.;
  for(int i=0;i<4;i++){
    float angle=uDirection+TURN[i];
    vec2 heading=vec2(cos(angle),sin(angle));
    float k=6.2831853/LENGTH[i];
    float omega=sqrt(9.81*k)*.35;
    float theta=k*dot(world,heading)-omega*uTime+SHIFT[i]+meander*(.6+.3*float(i));
    height+=HEIGHT[i]*(cos(theta)+steep*cos(2.*theta));
    total+=HEIGHT[i]*(1.+steep);
  }
  float level=clamp(.5+.5*height/(total*.85),0.,1.);
  float crest=smoothstep(.6,1.,level);
  float glint=crest*crest*uGlint;
  float haze=mix(1.,1.-uFog,pow(1.-v,1.4));
  float light=(pow(level,uContrast)+glint*.8)*haze;
  float glow=1.-exp(-max(ink,0.)*uInk*1.6);
  light=1.-(1.-clamp(light,0.,1.))*(1.-glow);
  float front=uIntro*1.35;
  float reveal=1.-smoothstep(front-.35,front,v);
  float sweep=exp(-pow((v-front+.22)/.07,2.))*(1.-uIntro);
  light=(light+sweep*.8)*reveal;
  light=max(light,.045*reveal);
  float span=mix(1.-uStretch,1.,level)+glow*.3;
  span=clamp(span,.08,1.)*mix(.1,1.,reveal);
  float tint=clamp(max(glint*1.4,glow*.9)+sweep,0.,1.);
  float lean=clamp(flow.x/1400.,-1.,1.)*uLean*reveal;
  fragColor=vec4(clamp(light,0.,1.),span,tint,.5+.5*lean);
}`;
  const SLAT_FS=`#version 300 es
precision highp float;
uniform sampler2D tField;uniform vec2 uSize;uniform float uDpr;
uniform vec4 uGrid;uniform vec2 uOrigin;uniform vec2 uSlat;
uniform float uRound;uniform float uTilt;
uniform vec3 uColor;uniform vec3 uGlintColor;uniform vec4 uBackground;
out vec4 fragColor;
float pill(vec2 p,vec2 b,float r){
  vec2 q=abs(p)-b+r;
  return length(max(q,0.))+min(max(q.x,q.y),0.)-r;
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uSize.y*uDpr-gl_FragCoord.y)/uDpr;
  vec2 local=p-uOrigin;
  vec2 cell=floor(local/uGrid.zw);
  vec4 background=vec4(uBackground.rgb*uBackground.a,uBackground.a);
  vec4 slat=vec4(0.);
  int reach=uTilt>0.?1:0;
  for(int dx=-1;dx<=1;dx++){
    if(abs(dx)>reach)continue;
    vec2 neighbour=cell+vec2(float(dx),0.);
    if(neighbour.x<0.||neighbour.y<0.||neighbour.x>=uGrid.x||neighbour.y>=uGrid.y)continue;
    vec4 field=texelFetch(tField,ivec2(int(neighbour.x),int(uGrid.y-1.-neighbour.y)),0);
    vec2 offset=local-neighbour*uGrid.zw-uSlat*.5;
    float angle=(field.a-.5)*2.*uTilt;
    float c=cos(angle),s=sin(angle);
    vec2 turned=vec2(c*offset.x+s*offset.y,c*offset.y-s*offset.x);
    vec2 halfSize=vec2(uSlat.x*.5,uSlat.y*.5*field.g);
    float radius=uRound*min(halfSize.x,halfSize.y);
    float alpha=clamp(.5-pill(turned,halfSize,radius)*uDpr,0.,1.)*field.r;
    if(alpha>slat.a)slat=vec4(mix(uColor,uGlintColor,field.b)*alpha,alpha);
  }
  fragColor=slat+background*(1.-slat.a);
}`;

  // ---- tiny helpers standing in for ogl ----
  function compile(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
    if(gl.getShaderParameter(sh,gl.COMPILE_STATUS))return sh;
    console.warn('MicroSlats shader:',gl.getShaderInfoLog(sh));gl.deleteShader(sh);return null}
  function makeProgram(vs,fs,attribs){const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);
    if(!v||!f)return null;
    const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);
    if(attribs)attribs.forEach((a,i)=>gl.bindAttribLocation(p,i,a));
    gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.warn('MicroSlats link:',gl.getProgramInfoLog(p));gl.deleteProgram(p);return null}
    return p}
  class Prog{
    constructor(vs,fs,uniformNames,attribs){
      this.p=makeProgram(vs,fs,attribs);
      if(!this.p)return;
      this.u={};uniformNames.forEach(n=>this.u[n]=gl.getUniformLocation(this.p,n));
    }
    use(){gl.useProgram(this.p)}
  }
  function makeTarget(w,h,opt){opt=opt||{};
    const tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,opt.min||gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,opt.mag||gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,opt.internalFormat||gl.RGBA,w,h,0,gl.RGBA,opt.type||gl.UNSIGNED_BYTE,null);
    const fb=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return{buffer:fb,tex:tex,width:w,height:h,
      get texture(){return this.tex}}
  }
  function disposeTarget(t){if(!t)return;gl.deleteFramebuffer(t.buffer);gl.deleteTexture(t.tex)}
  function targetOK(t){
    gl.bindFramebuffer(gl.FRAMEBUFFER,t.buffer);
    const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return ok}
  const blank=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,blank);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D,null);
  const bind=(unit,tex,loc)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex||blank);gl.uniform1i(loc,unit)};

  const fieldProg=new Prog(PASS_VS,FIELD_FS,
    ['uSize','uGrid','uOrigin','uSlat','uTime','uScale','uDirection','uChop','uStretch','uGlint','uContrast','uPerspective','uFog','uIntro','tVelocity','tInk','uFluidTexel','uFluid','uInk','uLean'],['position']);
  const slatProg=new Prog(PASS_VS,SLAT_FS,
    ['tField','uSize','uDpr','uGrid','uOrigin','uSlat','uRound','uTilt','uColor','uGlintColor','uBackground'],['position']);
  const FLUID_U=['uTarget','uAspect','uPoint','uValue','uRadius','uVelocity','uCurl','uSwirl','uDt','uPressure','uDivergence','uSource','uTexel','uFade','uValue'];
  const splatProg=new Prog(FLUID_VS,SPLAT_FS,['uTexel','uTarget','uAspect','uPoint','uValue','uRadius'],['position']);
  const curlProg=new Prog(FLUID_VS,CURL_FS,['uTexel','uVelocity'],['position']);
  const vortProg=new Prog(FLUID_VS,VORTICITY_FS,['uTexel','uVelocity','uCurl','uSwirl','uDt'],['position']);
  const divProg=new Prog(FLUID_VS,DIVERGENCE_FS,['uTexel','uVelocity'],['position']);
  const pressProg=new Prog(FLUID_VS,PRESSURE_FS,['uTexel','uPressure','uDivergence'],['position']);
  const projProg=new Prog(FLUID_VS,PROJECT_FS,['uTexel','uPressure','uVelocity'],['position']);
  const advProg=new Prog(FLUID_VS,ADVECT_FS,['uTexel','uVelocity','uSource','uDt','uFade'],['position']);
  const scaleProg=new Prog(FLUID_VS,SCALE_FS,['uTexel','uSource','uValue'],['position']);
  if(!fieldProg.p||!slatProg.p||!splatProg.p||!curlProg.p||!vortProg.p||!divProg.p||!pressProg.p||!projProg.p||!advProg.p||!scaleProg.p){
    cv.style.display='none';return}

  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.bindVertexArray(null);
  const drawTriangle=()=>{gl.bindVertexArray(vao);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null)};
  function renderTo(mesh,target){
    if(target)gl.bindFramebuffer(gl.FRAMEBUFFER,target.buffer);
    else gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,target?target.width:W,target?target.height:H);
    mesh.use();drawTriangle();
  }

  // ---- theme colours ----
  const parseColor=v=>{
    try{
      const c=document.createElement('canvas').getContext('2d');
      if(!c)return[0,0,0];
      c.fillStyle='#000';c.fillStyle=v;
      const r=c.fillStyle;
      if(typeof r==='string'&&r.startsWith('#')){
        let hex=r.slice(1);if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');
        const n=parseInt(hex,16);
        return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];
      }
      const parts=(r||'').match(/[\d.]+/g);
      if(!parts||parts.length<3)return[0,0,0];
      return[Number(parts[0])/255,Number(parts[1])/255,Number(parts[2])/255];
    }catch(e){return[0,0,0]}
  };
  const SLAT_L=parseColor('#171310'),SLAT_D=parseColor('#FAF9F6'),
        GLINT_L=parseColor('#E05A4E'),GLINT_D=parseColor('#A8251C'),
        BG_L=[.988,.976,.941,0],BG_D=[.09,.075,.063,0];
  let SLAT=SLAT_L,GLINT=GLINT_L,BG=BG_L;
  const syncTheme=()=>{
    const dark=document.documentElement.dataset.theme==='dark';
    SLAT=dark?SLAT_D:SLAT_L;GLINT=dark?GLINT_D:GLINT_L;BG=dark?BG_D:BG_L;
    start();
  };
  window.__bgSyncTheme=syncTheme;

  const floatTargets=!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float'));
  const floatTarget=(w,h)=>{
    const t=makeTarget(w,h,{internalFormat:gl.RGBA16F,type:gl.HALF_FLOAT,min:gl.LINEAR,mag:gl.LINEAR});
    return targetOK(t)?t:null;
  };
  let floatOK=floatTargets;
  const pair=(w,h)=>{
    const read=floatTarget(w,h),write=floatTarget(w,h);
    if(!read||!write){disposeTarget(read);disposeTarget(write);return null}
    return{read,write,swap(){const n=this.read;this.read=this.write;this.write=n}};
  };

  let W=1,H=1,DPR=1;
  let width=1,height=1;
  let raf=0,last=performance.now(),time=0,introClock=S.intro?0:1;
  let visible=true,alive=true;
  let fluid=null,fluidUntil=0,fluidDirty=false,splashTurn=0;
  const splats=[];
  const pointer={x:0,y:0,tracked:false};
  let fieldTarget=null;
  let grid=null;

  const disposeFluid=()=>{
    if(!fluid)return;
    ['velocity','ink','pressure'].forEach(k=>{
      if(fluid[k]){disposeTarget(fluid[k].read);disposeTarget(fluid[k].write)}
    });
    disposeTarget(fluid.divergence);disposeTarget(fluid.curl);
    fluid=null;
  };
  const buildFluid=()=>{
    if(!floatOK)return;
    const aspect=width/height;
    const w=Math.max(8,Math.round(aspect>=1?FLUID_SIZE*aspect:FLUID_SIZE));
    const h=Math.max(8,Math.round(aspect>=1?FLUID_SIZE:FLUID_SIZE/aspect));
    if(fluid&&fluid.width===w&&fluid.height===h)return;
    disposeFluid();
    const vel=pair(w,h),ink=pair(w,h),press=pair(w,h);
    const div=floatTarget(w,h),curl=floatTarget(w,h);
    if(!vel||!ink||!press||!div||!curl){
      [vel,ink,press].forEach(p=>{if(p){disposeTarget(p.read);disposeTarget(p.write)}});
      disposeTarget(div);disposeTarget(curl);
      floatOK=false;return;
    }
    fluid={width:w,height:h,velocity:vel,ink,pressure:press,divergence:div,curl,
      texel:[1/w,1/h]};
  };

  const layout=()=>{
    const slatW=clamp(S.slatWidth,1,64),slatH=clamp(S.slatHeight,2,240),gapSize=clamp(S.gap,0,64);
    const pitchX=slatW+gapSize,pitchY=slatH+gapSize;
    const cols=Math.min(2048,Math.ceil((width+gapSize)/pitchX)+1);
    const rows=Math.min(2048,Math.ceil((height+gapSize)/pitchY)+1);
    const originX=(width-(cols*pitchX-gapSize))/2;
    const originY=(height-(rows*pitchY-gapSize))/2;
    if(!fieldTarget||fieldTarget.width!==cols||fieldTarget.height!==rows){
      disposeTarget(fieldTarget);
      fieldTarget=makeTarget(cols,rows,{min:gl.NEAREST,mag:gl.NEAREST});
      if(!targetOK(fieldTarget)){disposeTarget(fieldTarget);fieldTarget=null;cv.style.display='none';alive=false;return}
    }
    const tilt=Math.min(.42,Math.asin(clamp((pitchX*1.5-slatW*.5)/(slatH*.5),0,1)));
    grid={slatW,slatH,tilt,cols,rows,pitchX,pitchY,originX,originY};
  };

  const resize=()=>{
    width=Math.max(1,cv.clientWidth||document.documentElement.clientWidth);
    height=Math.max(1,cv.clientHeight||innerHeight);
    DPR=Math.min(devicePixelRatio||1,2,Math.sqrt(PIXEL_BUDGET/(width*height)));
    W=Math.max(1,Math.round(width*DPR));H=Math.max(1,Math.round(height*DPR));
    if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
    buildFluid();
    start();
  };

  const splat=(p,point,value,radius)=>{
    const u=splatProg.u;splatProg.use();
    gl.uniform2f(u.uTexel,fluid.texel[0],fluid.texel[1]);
    bind(0,p.read.tex,u.uTarget);
    gl.uniform1f(u.uAspect,width/height);
    gl.uniform2f(u.uPoint,point[0],point[1]);
    gl.uniform3f(u.uValue,value[0],value[1],value[2]);
    gl.uniform1f(u.uRadius,radius);
    renderTo(splatProg,p.write);
    p.swap();
  };

  const stepFluid=(f,dt)=>{
    if(S.swirl>0){
      curlProg.use();
      gl.uniform2f(curlProg.u.uTexel,f.texel[0],f.texel[1]);
      bind(0,f.velocity.read.tex,curlProg.u.uVelocity);
      renderTo(curlProg,f.curl);
      vortProg.use();
      gl.uniform2f(vortProg.u.uTexel,f.texel[0],f.texel[1]);
      bind(0,f.velocity.read.tex,vortProg.u.uVelocity);
      bind(1,f.curl.tex,vortProg.u.uCurl);
      gl.uniform1f(vortProg.u.uSwirl,clamp(S.swirl,0,2)*40);
      gl.uniform1f(vortProg.u.uDt,dt);
      renderTo(vortProg,f.velocity.write);
      f.velocity.swap();
    }
    divProg.use();
    gl.uniform2f(divProg.u.uTexel,f.texel[0],f.texel[1]);
    bind(0,f.velocity.read.tex,divProg.u.uVelocity);
    renderTo(divProg,f.divergence);
    scaleProg.use();
    gl.uniform2f(scaleProg.u.uTexel,f.texel[0],f.texel[1]);
    bind(0,f.pressure.read.tex,scaleProg.u.uSource);
    gl.uniform1f(scaleProg.u.uValue,.8);
    renderTo(scaleProg,f.pressure.write);f.pressure.swap();
    pressProg.use();
    gl.uniform2f(pressProg.u.uTexel,f.texel[0],f.texel[1]);
    gl.uniform1i(pressProg.u.uDivergence,2);
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,f.divergence.tex);
    for(let i=0;i<PRESSURE_STEPS;i++){
      bind(0,f.pressure.read.tex,pressProg.u.uPressure);
      renderTo(pressProg,f.pressure.write);f.pressure.swap();
    }
    projProg.use();
    gl.uniform2f(projProg.u.uTexel,f.texel[0],f.texel[1]);
    bind(0,f.pressure.read.tex,projProg.u.uPressure);
    bind(1,f.velocity.read.tex,projProg.u.uVelocity);
    renderTo(projProg,f.velocity.write);f.velocity.swap();
    const fade=1/clamp(S.trail,.1,10);
    advProg.use();
    gl.uniform2f(advProg.u.uTexel,f.texel[0],f.texel[1]);
    gl.uniform1f(advProg.u.uDt,dt);
    bind(0,f.velocity.read.tex,advProg.u.uVelocity);
    bind(1,f.velocity.read.tex,advProg.u.uSource);
    gl.uniform1f(advProg.u.uFade,fade*1.4);
    renderTo(advProg,f.velocity.write);f.velocity.swap();
    bind(0,f.velocity.read.tex,advProg.u.uVelocity);
    bind(1,f.ink.read.tex,advProg.u.uSource);
    gl.uniform1f(advProg.u.uFade,fade);
    renderTo(advProg,f.ink.write);f.ink.swap();
  };

  const clearFluid=f=>{
    scaleProg.use();gl.uniform1f(scaleProg.u.uValue,0);
    ['velocity','ink','pressure'].forEach(k=>{
      bind(0,f[k].read.tex,scaleProg.u.uSource);
      renderTo(scaleProg,f[k].write);f[k].swap();
    });
  };

  const frame=now=>{
    raf=0;
    if(!alive)return;
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(!S.paused&&!reduce)time+=dt*S.preset.speed;
    introClock=S.intro&&!reduce?introClock+dt/Math.max(.2,S.introDuration):1;
    const li=Math.min(introClock,1);
    const introEase=li<.5?4*li*li*li:1-Math.pow(-2*li+2,3)/2;

    if(fluid&&splats.length){
      const radius=Math.pow(clamp(S.cursorSize,4,600)/height,2)*.35;
      const aspect=width/height;
      for(const[u,v,du,dv,turn]of splats){
        if(turn===null){
          splat(fluid.velocity,[u,v],[du*SPLAT_FORCE,dv*SPLAT_FORCE,0],radius);
          splat(fluid.ink,[u,v],[.13,0,0],radius);
          continue;
        }
        const jet=radius*.55;
        const reach=Math.sqrt(jet*.5)*1.9;
        const push=SPLAT_FORCE*.08;
        for(let i=0;i<SPLASH_JETS;i++){
          const angle=turn+(i/SPLASH_JETS)*Math.PI*2;
          const dx=Math.cos(angle),dy=Math.sin(angle);
          const point=[u+(dx*reach)/aspect,v+dy*reach];
          const spin=[(dx-dy)*Math.SQRT1_2*push,(dy+dx)*Math.SQRT1_2*push,0];
          splat(fluid.velocity,point,spin,jet);
          splat(fluid.ink,point,[.75,0,0],jet);
        }
        splat(fluid.ink,[u,v],[.45,0,0],radius);
      }
      splats.length=0;
      fluidDirty=true;
    }
    const fluidActive=fluid!==null&&now<fluidUntil;
    if(fluid){
      if(fluidActive)stepFluid(fluid,Math.min(Math.max(dt,1/240),1/30));
      else if(fluidDirty){clearFluid(fluid);fluidDirty=false}
    }

    layout();
    if(!alive)return;
    if(!fieldTarget){cv.style.display='none';return}

    fieldProg.use();const fu=fieldProg.u;
    gl.uniform2f(fu.uSize,width,height);
    gl.uniform4f(fu.uGrid,grid.cols,grid.rows,grid.pitchX,grid.pitchY);
    gl.uniform2f(fu.uOrigin,grid.originX,grid.originY);
    gl.uniform2f(fu.uSlat,grid.slatW,grid.slatH);
    gl.uniform1f(fu.uTime,time);
    gl.uniform1f(fu.uScale,S.preset.scale);
    gl.uniform1f(fu.uDirection,S.preset.direction*Math.PI/180);
    gl.uniform1f(fu.uChop,clamp(S.preset.chop,0,1.5));
    gl.uniform1f(fu.uStretch,clamp(S.preset.stretch,0,.95));
    gl.uniform1f(fu.uGlint,Math.max(0,S.preset.glint));
    gl.uniform1f(fu.uContrast,clamp(S.preset.contrast,.2,4));
    gl.uniform1f(fu.uPerspective,clamp(S.preset.perspective,0,1));
    gl.uniform1f(fu.uFog,clamp(S.preset.fog,0,1));
    gl.uniform1f(fu.uIntro,introEase);
    gl.uniform1f(fu.uFluid,fluidActive?1:0);
    bind(0,fluid?fluid.velocity.read.tex:null,fu.tVelocity);
    bind(1,fluid?fluid.ink.read.tex:null,fu.tInk);
    gl.uniform2f(fu.uFluidTexel,fluid?fluid.texel[0]:0,fluid?fluid.texel[1]:0);
    gl.uniform1f(fu.uInk,clamp(S.cursorStrength,0,3));
    gl.uniform1f(fu.uLean,clamp(S.lean,0,1));
    renderTo(fieldProg,fieldTarget);

    slatProg.use();const su=slatProg.u;
    bind(0,fieldTarget.tex,su.tField);
    gl.uniform2f(su.uSize,width,height);
    gl.uniform1f(su.uDpr,DPR);
    gl.uniform4f(su.uGrid,grid.cols,grid.rows,grid.pitchX,grid.pitchY);
    gl.uniform2f(su.uOrigin,grid.originX,grid.originY);
    gl.uniform2f(su.uSlat,grid.slatW,grid.slatH);
    gl.uniform1f(su.uRound,clamp(S.roundness,0,1));
    gl.uniform1f(su.uTilt,fluidActive&&S.lean>0?grid.tilt:0);
    gl.uniform3f(su.uColor,SLAT[0],SLAT[1],SLAT[2]);
    gl.uniform3f(su.uGlintColor,GLINT[0],GLINT[1],GLINT[2]);
    gl.uniform4f(su.uBackground,BG[0],BG[1],BG[2],BG[3]);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,W,H);
    drawTriangle();

    const moving=(!S.paused&&!reduce&&S.preset.speed!==0)||introClock<1;
    if(visible&&(moving||fluidActive||fluidDirty))raf=requestAnimationFrame(frame);
  };

  const start=()=>{
    if(raf||!visible||!alive||document.hidden)return;
    last=performance.now();
    raf=requestAnimationFrame(frame);
  };

  const locate=e=>{
    const rect=cv.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    return{x,y,u:x/w,v:1-y/h,h,inside:x>=0&&y>=0&&x<=w&&y<=h};
  };
  const queue=(u,v,du,dv,turn)=>{
    if(splats.length>32)splats.shift();
    splats.push([u,v,du,dv,turn]);
    fluidUntil=performance.now()+Math.max(1.5,S.trail*5)*1000;
    start();
  };
  const onPointerMove=e=>{
    const spot=locate(e);
    if(!fluid||!S.interactive||reduce||!spot.inside){pointer.tracked=false;return}
    if(pointer.tracked&&(spot.x!==pointer.x||spot.y!==pointer.y)){
      queue(spot.u,spot.v,(spot.x-pointer.x)/spot.h,(pointer.y-spot.y)/spot.h,null);
    }
    pointer.x=spot.x;pointer.y=spot.y;pointer.tracked=true;
  };
  const onPointerDown=e=>{
    const spot=locate(e);
    if(!fluid||!S.interactive||reduce||!spot.inside)return;
    splashTurn+=2.39996;
    queue(spot.u,spot.v,0,0,splashTurn);
  };
  const onPointerLeave=()=>{pointer.tracked=false};
  const onPointerOut=e=>{if(!e.relatedTarget)onPointerLeave()};
  const onVisibility=()=>{if(!document.hidden)start()};

  addEventListener('pointermove',onPointerMove,{passive:true});
  addEventListener('pointerdown',onPointerDown,{passive:true});
  addEventListener('pointerout',onPointerOut,{passive:true});
  addEventListener('blur',onPointerLeave);
  document.addEventListener('visibilitychange',onVisibility);

  if(typeof ResizeObserver==='function'){
    new ResizeObserver(()=>{last=0;resize()}).observe(cv);
  }
  if(typeof IntersectionObserver==='function'){
    new IntersectionObserver(es=>{visible=es.some(x=>x.isIntersecting);last=0;start()},{threshold:0}).observe(cv);
  }
  addEventListener('resize',()=>{last=0;resize()});
  new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  cv.setAttribute('aria-hidden','true');
  resize();
  if(reduce){
    // one static frame; wake on pointer events is skipped (interactive is ignored under reduced motion)
    start();
  }
  start();
}catch(e){try{const c=document.getElementById('acid');if(c)c.style.display='none'}catch(_){}
  console.warn('MicroSlats disabled:',e);}
})();
