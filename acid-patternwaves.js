/* ===== PatternWaves background (vanilla port of react-bits PatternWaves, MIT) =====
   Ported from https://reactbits.dev (PatternWaves-JS-TW) to plain JS, no React/ogl.
   Renders a lit halftone surface (dots / lines / crosses / glyphs) as a full-viewport
   background on canvas#acid. Theme-aware, reduced-motion aware, error-safe. */
(()=>{
  const cv=document.getElementById('acid');
  if(!cv)return;
  try{
    const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});
    if(!gl){cv.style.display='none';return}
    const reduce=(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)||false;

    /* ---------- constants from the original component ---------- */
    const PATTERNS={dot:0,square:1,plus:2,line:3,glyph:4};
    const WAVES={silk:0,swell:1,ripple:2};
    const FADES={none:0,edges:1,center:2,bottom:3,top:4};
    const DEFAULT_CHARACTERS='.:-=+*#%@';
    const GLYPH_FONT='ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    const ATLAS_TILE=128;
    const WAVE_UNIT=520;
    const RIPPLE_CELL=8;
    const RIPPLE_RATE=60;
    const PIXEL_BUDGET=4.5e6;
    const INTRO_SECONDS=2;
    const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
    const lum=c=>0.2126*c[0]+0.7152*c[1]+0.0722*c[2];

    /* ---------- settings (silk preset, tuned for a light minimal RTL site) ---------- */
    const S={
      pattern:'dot',wave:'silk',spacing:9,markSize:.95,depth:.95,light:0,
      shine:.8,contrast:1.2,speed:.35,scale:1,direction:20,
      opacity:.5,fade:'edges',fadeSize:.55,
      characters:DEFAULT_CHARACTERS,
      interactive:true,cursorSize:50,cursorStrength:.6,
      intro:true,paused:false
    };

    /* ---------- color parsing (probe canvas, never throws) ---------- */
    const probe=document.createElement('canvas');probe.width=1;probe.height=1;
    const pc=probe.getContext('2d',{willReadFrequently:true});
    const toRgb=v=>{
      try{
        if(!pc)return[0,0,0,0];
        pc.fillStyle='#000';pc.fillStyle=v;
        const r=pc.fillStyle;
        if(typeof r==='string'&&r.startsWith('#')){
          const n=parseInt(r.slice(1),16);
          return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,1];
        }
        const m=(r.match(/[\d.]+/g)||[]).map(Number);
        if(m.length<3)return[0,0,0,0];
        return[m[0]/255,m[1]/255,m[2]/255,m.length>3?m[3]:1];
      }catch(e){return[0,0,0,0]}
    };
    /* site palette: ink #171310 on #FAF9F6 (light), warm gray + #E05A4E (dark) */
    const INK_L=toRgb('#171310'),INK_D=toRgb('#9A9184');
    const ACC_L=toRgb('#A8251C'),ACC_D=toRgb('#E05A4E');
    const BG=[0,0,0,0]; /* transparent: page background shows through */
    let COLOR=INK_L,ACCENT=ACC_L;
    const syncTheme=()=>{
      const dark=document.documentElement.dataset.theme==='dark';
      COLOR=dark?INK_D:INK_L;ACCENT=dark?ACC_D:ACC_L;
      dirty=true;start();
    };

    /* ---------- shaders (verbatim ports from the component) ---------- */
    const passVertex=`#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;

    const fieldFragment=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uSize;
uniform float uDpr;
uniform vec2 uOrigin;
uniform vec2 uPitch;
uniform int uWave;
uniform float uTime;
uniform float uUnit;
uniform vec2 uHeading;
uniform float uAmp;
uniform float uDepth;
uniform vec3 uLight;
uniform float uShine;
uniform float uContrast;
uniform float uInk;
uniform float uOpacity;
uniform int uFade;
uniform float uFadeSize;
uniform float uAppear;
uniform sampler2D tRipple;
uniform float uRipple;
out vec4 fragColor;
const float FOLDS=5.5;
uvec3 scramble(uvec3 v){
  v=v*1664525u+1013904223u;
  v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;
  v^=v>>16u;
  v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;
  return v;
}
vec3 lattice(vec3 corner){
  uvec3 h=scramble(uvec3(ivec3(corner)+4096));
  return vec3(h&65535u)/32767.5-1.0;
}
float gradientNoise(vec3 p){
  vec3 i=floor(p);vec3 f=p-i;
  vec3 u=f*f*f*(f*(f*6.0-15.0)+10.0);
  float n000=dot(lattice(i),f);
  float n100=dot(lattice(i+vec3(1.,0.,0.)),f-vec3(1.,0.,0.));
  float n010=dot(lattice(i+vec3(0.,1.,0.)),f-vec3(0.,1.,0.));
  float n110=dot(lattice(i+vec3(1.,1.,0.)),f-vec3(1.,1.,0.));
  float n001=dot(lattice(i+vec3(0.,0.,1.)),f-vec3(0.,0.,1.));
  float n101=dot(lattice(i+vec3(1.,0.,1.)),f-vec3(1.,0.,1.));
  float n011=dot(lattice(i+vec3(0.,1.,1.)),f-vec3(0.,1.,1.));
  float n111=dot(lattice(i+vec3(1.,1.,1.)),f-vec3(1.,1.,1.));
  return mix(mix(mix(n000,n100,u.x),mix(n010,n110,u.x),u.y),mix(mix(n001,n101,u.x),mix(n011,n111,u.x),u.y),u.z);
}
float surface(vec2 p,float t){
  if(uWave==0){
    vec2 side=vec2(-uHeading.y,uHeading.x);
    float u=dot(p,uHeading);float v=dot(p,side);
    float bend=gradientNoise(vec3(v*0.85,u*0.3,t*0.05))*1.7+0.4*sin(v*1.6+t*0.2);
    float phase=u*FOLDS+bend-t*0.45;
    float swell=0.6+0.4*gradientNoise(vec3(u*0.55+3.0,v*0.45,t*0.04));
    float fold=sin(phase)+0.32*sin(2.0*phase+1.3);
    float ripple=0.16*sin(u*FOLDS*2.5+bend*1.9-t*0.9+2.1);
    return (fold+ripple)*swell;
  }
  if(uWave==1){
    float bend=gradientNoise(vec3(p*0.6,t*0.05))*0.6;
    float phase=dot(p,uHeading)*15.0+bend*2.2-t*1.4;
    float swell=sin(phase)+0.3*sin(2.0*phase-0.8);
    float roll=0.75+0.25*gradientNoise(vec3(p*0.9+11.0,t*0.05));
    return 0.8*swell*roll;
  }
  float r=length(p+uHeading*1.2);
  float bend=gradientNoise(vec3(p*1.2,t*0.05))*0.1;
  return sin((r+bend)*9.0-t*1.8)*(0.45+0.55*exp(-(r-0.6)*0.8));
}
float heightAt(vec2 css){
  float h=surface((css-0.5*uSize)/uUnit,uTime)*uAmp;
  if(uRipple>0.0)h+=texture(tRipple,css/uSize).r*uRipple;
  return h;
}
void main(){
  vec2 cell=floor(gl_FragCoord.xy);
  vec2 center=uOrigin+(cell+0.5)*uPitch;
  vec2 css=center/uDpr;
  vec2 uv=css/uSize;
  float e=max(uPitch.y/uDpr,4.0);
  float h=heightAt(css);
  float hx=(heightAt(css+vec2(e,0.))-heightAt(css-vec2(e,0.)))/(2.0*e);
  float hy=(heightAt(css+vec2(0.,e))-heightAt(css-vec2(0.,e)))/(2.0*e);
  vec2 grad=vec2(hx,hy)*uUnit*uDepth*0.4;
  vec3 n=normalize(vec3(-grad,1.0));
  float diffuse=clamp(dot(n,uLight),0.,1.);
  vec3 halfway=normalize(uLight+vec3(0.,0.,1.));
  float spec=pow(clamp(dot(n,halfway),0.,1.),160.0)*uShine*1.15;
  float hollow=0.7+0.3*clamp(h*0.5+0.5,0.,1.);
  float tone=clamp(diffuse*hollow*0.78+spec,0.,1.);
  tone=clamp((tone-0.42)*uContrast+0.42,0.,1.);
  float level=uInk>0.5?pow(clamp(1.0-tone/0.46,0.,1.),2.4)*0.72:pow(tone,2.2);
  float emphasis=uInk>0.5?smoothstep(0.55,0.95,level):clamp(spec*1.6,0.,1.);
  float fade=1.0;
  vec2 c=uv*2.0-1.0;
  if(uFade==1){fade=1.0-smoothstep(1.0-uFadeSize,1.18,length(c));}
  else if(uFade==2){fade=mix(0.05,1.0,smoothstep(0.08,0.08+uFadeSize,length(c*vec2(1.,1.35))));}
  else if(uFade==3){fade=smoothstep(0.0,uFadeSize,uv.y);}
  else if(uFade==4){fade=smoothstep(0.0,uFadeSize,1.0-uv.y);}
  float reach=length(css-0.5*uSize)/max(0.5*length(uSize),1.0);
  float appear=smoothstep(reach-0.05,reach+0.3,uAppear*1.35);
  float alpha=uOpacity*fade*appear*(0.22+0.78*level);
  float lift=clamp(h*uDepth*0.42,-0.48,0.48);
  fragColor=vec4(level,alpha,emphasis,lift+0.5);
}`;

    const rippleFragment=`#version 300 es
precision highp float;
uniform sampler2D tState;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uImpulse;
uniform float uDamping;
out vec4 fragColor;
void main(){
  vec2 uv=gl_FragCoord.xy*uTexel;
  vec2 state=texture(tState,uv).rg;
  float left=texture(tState,uv-vec2(uTexel.x,0.)).r;
  float right=texture(tState,uv+vec2(uTexel.x,0.)).r;
  float below=texture(tState,uv-vec2(0.,uTexel.y)).r;
  float above=texture(tState,uv+vec2(0.,uTexel.y)).r;
  float next=((left+right+below+above)*0.5-state.g)*uDamping;
  vec2 p=uv*uSize;
  vec2 segment=uTo-uFrom;
  float along=clamp(dot(p-uFrom,segment)/max(dot(segment,segment),1e-4),0.,1.);
  float d=length(p-uFrom-segment*along)/uRadius;
  next-=uImpulse*exp(-d*d*2.0);
  fragColor=vec4(next,state.r,0.,1.);
}`;

    const markFragment=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D tField;
uniform sampler2D tAtlas;
uniform vec2 uOrigin;
uniform vec2 uPitch;
uniform vec2 uGrid;
uniform int uPattern;
uniform float uMarkSize;
uniform float uStroke;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec4 uBackground;
uniform vec3 uAtlas;
out vec4 fragColor;
float box(vec2 p,vec2 b,float r){
  vec2 q=abs(p)-b+r;
  return length(max(q,0.))+min(max(q.x,q.y),0.)-r;
}
float coverage(vec2 local,float level){
  float span=uPitch.y*uMarkSize;
  float area=max(sqrt(level),0.14);
  if(uPattern==0){return clamp(0.5-(length(local)-0.5*span*area),0.,1.);}
  if(uPattern==1){
    float extent=0.5*span*area;
    return clamp(0.5-box(local,vec2(extent),extent*0.3),0.,1.);
  }
  if(uPattern==2){
    float arm=0.5*span*mix(0.3,1.0,level);
    float width=0.5*uStroke;
    return clamp(0.5-min(box(local,vec2(arm,width),width),box(local,vec2(width,arm),width)),0.,1.);
  }
  if(uAtlas.z<1.0)return 0.0;
  vec2 g=local/span+0.5;
  if(g.x<0.||g.y<0.||g.x>1.0||g.y>1.0)return 0.0;
  float index=min(floor(level*uAtlas.z),uAtlas.z-1.0);
  vec2 tile=vec2(mod(index,uAtlas.x),floor(index/uAtlas.x));
  vec2 atlasUv=(tile+vec2(g.x,1.0-g.y))/uAtlas.xy;
  vec2 texel=1.0/(span*uAtlas.xy);
  return textureGrad(tAtlas,atlasUv,vec2(texel.x,0.),vec2(0.,texel.y)).a;
}
vec4 lineInk(vec2 rel){
  float fx=rel.x/uPitch.x-0.5;
  float c0=clamp(floor(fx),0.0,uGrid.x-1.0);
  float c1=min(c0+1.0,uGrid.x-1.0);
  float t=clamp(fx-c0,0.,1.);
  float row=floor(rel.y/uPitch.y);
  vec4 ink=vec4(0.0);
  for(int k=-1;k<=1;k++){
    float cy=row+float(k);
    if(cy<0.0||cy>=uGrid.y)continue;
    vec4 a=texelFetch(tField,ivec2(int(c0),int(cy)),0);
    vec4 b=texelFetch(tField,ivec2(int(c1),int(cy)),0);
    vec4 f=mix(a,b,t);
    if(f.g<0.002)continue;
    float y=(cy+0.5+f.a-0.5)*uPitch.y;
    float slope=(b.a-a.a)*uPitch.y/uPitch.x;
    float thickness=max(uStroke,uPitch.y*uMarkSize*f.r);
    float d=abs(rel.y-y)/sqrt(1.0+slope*slope)-0.5*thickness;
    float alpha=clamp(0.5-d,0.,1.)*f.g;
    if(alpha>ink.a)ink=vec4(mix(uColor,uAccent,f.b)*alpha,alpha);
  }
  return ink;
}
void main(){
  vec2 rel=gl_FragCoord.xy-uOrigin;
  vec4 background=vec4(uBackground.rgb*uBackground.a,uBackground.a);
  vec4 ink=vec4(0.0);
  if(uPattern==3){
    ink=lineInk(rel);
  }else{
    float cx=floor(rel.x/uPitch.x);
    float row=floor(rel.y/uPitch.y);
    if(cx>=0.0&&cx<uGrid.x){
      for(int k=-1;k<=1;k++){
        float cy=row+float(k);
        if(cy<0.0||cy>=uGrid.y)continue;
        vec4 f=texelFetch(tField,ivec2(int(cx),int(cy)),0);
        if(f.g<0.002)continue;
        vec2 center=(vec2(cx,cy)+0.5)*uPitch+vec2(0.0,(f.a-0.5)*uPitch.y);
        float alpha=coverage(rel-center,f.r)*f.g;
        if(alpha>ink.a)ink=vec4(mix(uColor,uAccent,f.b)*alpha,alpha);
      }
    }
  }
  fragColor=ink+background*(1.0-ink.a);
}`;

    /* ---------- tiny GL helpers (replace ogl) ---------- */
    function compile(type,src){
      const sh=gl.createShader(type);
      gl.shaderSource(sh,src);gl.compileShader(sh);
      if(gl.getShaderParameter(sh,gl.COMPILE_STATUS))return sh;
      console.warn('[PatternWaves]',gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);return null;
    }
    function programOf(vsSrc,fsSrc){
      const v=compile(gl.VERTEX_SHADER,vsSrc),f=compile(gl.FRAGMENT_SHADER,fsSrc);
      if(!v||!f)return null;
      const p=gl.createProgram();
      gl.attachShader(p,v);gl.attachShader(p,f);
      gl.bindAttribLocation(p,0,'position');
      gl.linkProgram(p);
      gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
        console.warn('[PatternWaves]',gl.getProgramInfoLog(p));return null;
      }
      const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
      for(let i=0;i<n;i++){
        const info=gl.getActiveUniform(p,i);
        u[info.name]=gl.getUniformLocation(p,info.name);
      }
      return{p,u};
    }
    function target(w,h,half){
      const tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      if(half)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
      else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      const filt=half?gl.LINEAR:gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filt);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filt);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const fbo=gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      return{tex,fbo,width:w,height:h};
    }
    const dispose=t=>{gl.deleteFramebuffer(t.fbo);gl.deleteTexture(t.tex)};

    const fieldProg=programOf(passVertex,fieldFragment);
    const rippleProg=programOf(passVertex,rippleFragment);
    const markProg=programOf(passVertex,markFragment);
    if(!fieldProg||!rippleProg||!markProg){cv.style.display='none';return}

    /* fullscreen triangle */
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);

    gl.clearColor(0,0,0,0);
    const floatTargets=!!gl.getExtension('EXT_color_buffer_float');

    /* blank + glyph-atlas textures */
    const blankTex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,blankTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const atlasTex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,atlasTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    let atlasGrid=[1,1,0],atlasKey='';

    /* sampler bindings (fixed units) */
    gl.useProgram(fieldProg.p);gl.uniform1i(fieldProg.u.tRipple,0);
    gl.useProgram(rippleProg.p);gl.uniform1i(rippleProg.u.tState,0);gl.uniform1f(rippleProg.u.uDamping,0.975);
    gl.useProgram(markProg.p);gl.uniform1i(markProg.u.tField,0);gl.uniform1i(markProg.u.tAtlas,1);

    let fieldTarget=target(1,1,false);
    let ripple=null;

    function buildAtlas(characters){
      const glyphs=Array.from(characters&&characters.length?characters:DEFAULT_CHARACTERS);
      const columns=Math.ceil(Math.sqrt(glyphs.length));
      const lines=Math.ceil(glyphs.length/columns);
      const c=document.createElement('canvas');
      c.width=columns*ATLAS_TILE;c.height=lines*ATLAS_TILE;
      const ctx=c.getContext('2d');
      if(!ctx)return null;
      ctx.fillStyle='#ffffff';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`500 ${Math.round(ATLAS_TILE*0.86)}px ${GLYPH_FONT}`;
      glyphs.forEach((glyph,index)=>{
        const x=(index%columns)*ATLAS_TILE+ATLAS_TILE/2;
        const y=Math.floor(index/columns)*ATLAS_TILE+ATLAS_TILE/2;
        ctx.fillText(glyph,x,y);
      });
      return{canvas:c,columns,lines,count:glyphs.length};
    }
    function refreshAtlas(){
      if(S.characters===atlasKey)return;
      atlasKey=S.characters;
      const built=buildAtlas(S.characters);
      if(!built)return;
      gl.bindTexture(gl.TEXTURE_2D,atlasTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,built.canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      atlasGrid=[built.columns,built.lines,built.count];
    }

    function buildRipple(){
      if(!floatTargets)return;
      const w=clamp(Math.ceil(width/RIPPLE_CELL),4,512);
      const h=clamp(Math.ceil(height/RIPPLE_CELL),4,512);
      if(ripple&&ripple.width===w&&ripple.height===h)return;
      if(ripple){dispose(ripple.read);dispose(ripple.write)}
      ripple={width:w,height:h,read:target(w,h,true),write:target(w,h,true)};
      rippleLive=false;
    }
    function clearRipple(){
      if(!ripple)return;
      [ripple.read,ripple.write].forEach(t=>{
        gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);
        gl.viewport(0,0,t.width,t.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }

    /* ---------- state ---------- */
    let width=1,height=1,raf=0,last=performance.now();
    let time=0,introClock=0,visible=true,alive=true,dirty=true;
    let rippleUntil=0,rippleLive=false,rippleClock=0;
    const pointer={x:0,y:0,inside:false,placed:false,lastX:0,lastY:0,burst:0};

    function resize(){
      width=Math.max(1,document.documentElement.clientWidth);
      height=Math.max(1,innerHeight);
      const dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(PIXEL_BUDGET/(width*height)));
      cv.width=Math.round(width*dpr);cv.height=Math.round(height*dpr);
      cv.style.width=width+'px';cv.style.height=height+'px';
      buildRipple();dirty=true;start();
    }

    function stepRipple(dt){
      rippleClock=Math.min(rippleClock+dt*RIPPLE_RATE,4);
      const strength=clamp(S.cursorStrength,0,1);
      const moved=Math.hypot(pointer.x-pointer.lastX,pointer.y-pointer.lastY);
      let impulse=(pointer.inside?Math.min(moved/14,1)*0.35*strength:0)+pointer.burst*strength;
      pointer.burst=0;
      gl.useProgram(rippleProg.p);
      gl.uniform2f(rippleProg.u.uTexel,1/ripple.width,1/ripple.height);
      gl.uniform2f(rippleProg.u.uSize,width,height);
      gl.uniform2f(rippleProg.u.uFrom,pointer.lastX,height-pointer.lastY);
      gl.uniform2f(rippleProg.u.uTo,pointer.x,height-pointer.y);
      gl.uniform1f(rippleProg.u.uRadius,clamp(S.cursorSize,8,400));
      while(rippleClock>=1){
        rippleClock-=1;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,ripple.read.tex);
        gl.uniform1f(rippleProg.u.uImpulse,impulse);
        gl.bindFramebuffer(gl.FRAMEBUFFER,ripple.write.fbo);
        gl.viewport(0,0,ripple.width,ripple.height);
        gl.drawArrays(gl.TRIANGLES,0,3);
        const next=ripple.read;ripple.read=ripple.write;ripple.write=next;
        impulse=0;
      }
      pointer.lastX=pointer.x;pointer.lastY=pointer.y;
    }

    function frame(now){
      raf=0;
      if(!alive)return;
      const dt=Math.min(0.05,Math.max(1/240,(now-last)/1000));
      last=now;

      const moving=!S.paused&&!reduce&&S.speed!==0;
      if(moving)time+=dt*S.speed;
      introClock=S.intro&&!reduce?Math.min(1,introClock+dt/INTRO_SECONDS):1;
      const appear=1-Math.pow(1-clamp(introClock/0.75,0,1),3);
      const rise=clamp((introClock-0.1)/0.9,0,1);
      const amp=rise*rise*(3-2*rise);

      const rippling=S.interactive&&!reduce&&!!ripple&&S.cursorStrength>0;
      if(rippling&&pointer.inside&&!pointer.placed){
        pointer.lastX=pointer.x;pointer.lastY=pointer.y;pointer.placed=true;
      }
      if(rippling&&(pointer.inside||pointer.burst>0))rippleUntil=now+5000;
      const rippleActive=rippling&&now<rippleUntil;
      if(rippleActive&&ripple){stepRipple(dt);rippleLive=true}
      else if(rippleLive){clearRipple();rippleLive=false}

      const patternIndex=PATTERNS[S.pattern]??0;
      if(patternIndex===4)refreshAtlas();

      const canvasW=cv.width,canvasH=cv.height;
      const dpr=canvasW/width;
      const pitchY=Math.max(4,Math.round(clamp(S.spacing,4,120)*dpr));
      const pitchX=patternIndex===3?Math.max(2,Math.round(pitchY/4)):pitchY;
      const cols=Math.min(4096,Math.ceil(canvasW/pitchX)+1);
      const rows=Math.min(4096,Math.ceil(canvasH/pitchY)+2);
      const ox=Math.floor((canvasW-cols*pitchX)/2),oy=Math.floor((canvasH-rows*pitchY)/2);
      if(fieldTarget.width!==cols||fieldTarget.height!==rows){
        dispose(fieldTarget);
        fieldTarget=target(cols,rows,false);
      }
      const heading=(S.direction*Math.PI)/180;
      const lightAngle=((S.direction+180+clamp(S.light,-90,90))*Math.PI)/180;
      const ink=BG[3]>0.02?lum(COLOR)<lum(BG):lum(COLOR)<0.5;

      /* pass 1: height-field */
      gl.useProgram(fieldProg.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fieldTarget.fbo);
      gl.viewport(0,0,cols,rows);
      gl.uniform2f(fieldProg.u.uSize,width,height);
      gl.uniform1f(fieldProg.u.uDpr,dpr);
      gl.uniform2f(fieldProg.u.uOrigin,ox,oy);
      gl.uniform2f(fieldProg.u.uPitch,pitchX,pitchY);
      gl.uniform1i(fieldProg.u.uWave,WAVES[S.wave]??0);
      gl.uniform1f(fieldProg.u.uTime,time);
      gl.uniform1f(fieldProg.u.uUnit,WAVE_UNIT*clamp(S.scale,0.2,5));
      gl.uniform2f(fieldProg.u.uHeading,Math.cos(heading),Math.sin(heading));
      gl.uniform1f(fieldProg.u.uAmp,amp);
      gl.uniform1f(fieldProg.u.uDepth,clamp(S.depth,0,1.5));
      gl.uniform3f(fieldProg.u.uLight,Math.cos(lightAngle)*0.78,Math.sin(lightAngle)*0.78,0.62);
      gl.uniform1f(fieldProg.u.uShine,clamp(S.shine,0,2));
      gl.uniform1f(fieldProg.u.uContrast,clamp(S.contrast,0.3,3));
      gl.uniform1f(fieldProg.u.uInk,ink?1:0);
      gl.uniform1f(fieldProg.u.uOpacity,clamp(S.opacity,0,1));
      gl.uniform1i(fieldProg.u.uFade,FADES[S.fade]??0);
      gl.uniform1f(fieldProg.u.uFadeSize,clamp(S.fadeSize,0.05,1));
      gl.uniform1f(fieldProg.u.uAppear,appear);
      gl.uniform1f(fieldProg.u.uRipple,rippleLive?0.32:0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,ripple&&rippleLive?ripple.read.tex:blankTex);
      gl.drawArrays(gl.TRIANGLES,0,3);

      /* pass 2: marks */
      gl.useProgram(markProg.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,canvasW,canvasH);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(markProg.u.uOrigin,ox,oy);
      gl.uniform2f(markProg.u.uPitch,pitchX,pitchY);
      gl.uniform2f(markProg.u.uGrid,cols,rows);
      gl.uniform1i(markProg.u.uPattern,patternIndex);
      gl.uniform1f(markProg.u.uMarkSize,clamp(S.markSize,0.05,1));
      gl.uniform1f(markProg.u.uStroke,patternIndex===3?0.9*dpr:Math.max(1.1*dpr,pitchY*0.08));
      gl.uniform3f(markProg.u.uColor,COLOR[0],COLOR[1],COLOR[2]);
      gl.uniform3f(markProg.u.uAccent,ACCENT[0],ACCENT[1],ACCENT[2]);
      gl.uniform4f(markProg.u.uBackground,BG[0],BG[1],BG[2],BG[3]);
      gl.uniform3f(markProg.u.uAtlas,atlasGrid[0],atlasGrid[1],atlasGrid[2]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,fieldTarget.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D,atlasTex);
      gl.drawArrays(gl.TRIANGLES,0,3);
      dirty=false;

      if(visible&&!document.hidden&&(moving||introClock<1||rippleActive||dirty))raf=requestAnimationFrame(frame);
    }

    const start=()=>{
      if(raf||!visible||!alive||document.hidden)return;
      last=performance.now();
      raf=requestAnimationFrame(frame);
    };

    const locate=e=>{
      const r=cv.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      return{x,y,inside:x>=0&&y>=0&&x<=r.width&&y<=r.height};
    };
    const onPointerMove=e=>{
      const spot=locate(e);
      pointer.x=spot.x;pointer.y=spot.y;
      if(spot.inside!==pointer.inside)pointer.placed=false;
      pointer.inside=spot.inside;
      if(spot.inside)start();
    };
    const onPointerDown=e=>{
      const spot=locate(e);
      if(!spot.inside)return;
      pointer.x=spot.x;pointer.y=spot.y;
      if(!pointer.inside){pointer.lastX=spot.x;pointer.lastY=spot.y}
      pointer.burst=1.2;
      start();
    };
    const onPointerLeave=()=>{pointer.inside=false;pointer.placed=false;start()};
    const onPointerOut=e=>{if(!e.relatedTarget)onPointerLeave()};
    const onPointerUp=e=>{if(e.pointerType==='touch')onPointerLeave()};
    const onVisibility=()=>{if(!document.hidden)start()};

    addEventListener('pointermove',onPointerMove,{passive:true});
    addEventListener('pointerdown',onPointerDown,{passive:true});
    addEventListener('pointerout',onPointerOut,{passive:true});
    addEventListener('pointerup',onPointerUp,{passive:true});
    addEventListener('blur',onPointerLeave);
    document.addEventListener('visibilitychange',onVisibility);
    addEventListener('resize',resize);
    if('IntersectionObserver' in window){
      new IntersectionObserver(es=>{
        visible=es.some(x=>x.isIntersecting);
        start();
      },{threshold:0}).observe(cv);
    }
    if('MutationObserver' in window){
      new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    }

    resize();
    syncTheme();
  }catch(err){
    console.warn('[PatternWaves] disabled:',err);
    try{cv.style.display='none'}catch(e2){}
  }
})();
