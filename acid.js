/* ===== Acid Squares background (vanilla port of react-bits AcidSquares, MIT) ===== */
(()=>{
  const cv=document.getElementById('acid');
  const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});
  if(!gl){cv.style.display='none';return}
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // settings tuned for a light minimal site
  const S={
    shape:1, lightMode:0, twistOn:0,
    steps:40, depth:12, edges:.6, zoom:1.25,
    speed:.85, breathe:1.2, pulse:1.35, pulseSpeed:.55, pulseSpacing:.85, pulseWidth:1.3,
    sparkle:.09, brightness:1.25,
    color:'#5E564A', accent:'#B32015',
    grain:.04, opacity:1,
    mouseStrength:1.2, mouseRadius:.4,
  };
  const VERT=`#version 300 es
in vec2 aPosition;
void main(){gl_Position=vec4(aPosition,0.,1.);}`;
  const FRAG=`#version 300 es
#define SQUARE ${S.shape}
#define LIGHT ${S.lightMode}
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;uniform float uTime,uSteps,uDepth,uSpread,uLine,uZoom,uTravel,uTwist,uRoll,uBrightness,uGrain,uFade,uOpacity;
uniform vec4 uPulse,uTorch;uniform vec2 uSparkle,uLook;uniform vec3 uColor,uAccent;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
mat2 rotate(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sstep(float e,float x){float t=clamp(x/max(e,.0001),0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
void main(){
  vec2 ndc=(2.*gl_FragCoord.xy-uResolution)/uResolution.y;
  vec2 dir=rotate(uRoll)*ndc*(0.5/max(uZoom,.05))+uLook;
  vec3 offset=vec3(0.,0.,uTravel);
  vec3 p=vec3(0.);float s=0.,glow=0.,edgeLine=0.,pulse=0.,crest=0.,peak=0.;vec3 home=vec3(0.);
  for(int i=0;i<64;i++){
    if(float(i)>=uSteps)break;
    p+=vec3(dir*s,s);
    vec3 q=p+offset;
    vec2 cell=ceil(q.xy);
#if SQUARE
    float tube=max(abs(q.x),abs(q.z));
    float ring=max(abs(cell.x),abs(cell.y));
#else
    float tube=length(q.xz);float ring=length(cell);
#endif
    s+=uDepth-tube+length(cell);
    s=.002+abs(s)*uSpread;
    float g=1./s;glow+=g;
    vec2 seam=abs(fract(q.xy)-.5);
    float gap=.5-max(seam.x,seam.y);gap*=gap;
    float line=max(1.-gap*156.25,0.);line*=line;
    edgeLine+=g*line*line;
    float wave=fract(ring*uPulse.y-uPulse.w)-.5;
    float band=g*exp(wave>0.?-wave*wave/(uPulse.z*uPulse.z):wave/(uPulse.z*2.5))*smoothstep(.6,1.8,ring);
    pulse+=band;crest+=wave>-uPulse.z?band:0.;
    if(g>peak){peak=g;home=vec3(cell,floor(q.z*.5));}
  }
  float h=hash(home.xy*7.13+home.z);
  float flicker=step(1.-uSparkle.x,h)*(.5+.5*sin(uSparkle.y+h*31.));
  float base=tanh(glow/2700.*uBrightness);
  float lines=tanh(edgeLine/2700.*uBrightness*2.);
  float lit=tanh(pulse/2700.*uBrightness*1.6);
  float front=tanh(crest/2700.*uBrightness*1.6);
  float twinkle=tanh(glow*flicker/2700.*uBrightness*1.6);
  vec2 toTorch=ndc-uTorch.xy;
  float torch=exp(-dot(toTorch,toTorch)/max(uTorch.z*uTorch.z,.0001))*uTorch.w;
  float spark=clamp(front*uPulse.x+twinkle+base*torch*1.4,0.,1.);
  float haze=max(lit-front,0.)*uPulse.x;
  vec2 uv=gl_FragCoord.xy/uResolution;
  float edge=uFade*.5;
  float mask=sstep(edge,uv.x)*sstep(edge,1.-uv.x)*sstep(edge,uv.y)*sstep(edge,1.-uv.y);
  float grain=(hash(gl_FragCoord.xy+fract(uTime*7.31)*113.)-.5)*uGrain;
  mask*=uOpacity;
  float lift=smoothstep(0.,.6,base);
  vec3 structure=mix(uColor,vec3(1.),.22+.13*lift)*mix(.45,1.,lift);
  structure=mix(structure,mix(uColor,vec3(1.),.55),smoothstep(.65,1.,base));
  float accent=clamp(spark+haze*.6,0.,1.);
  vec3 color=structure*base+mix(uColor,vec3(1.),.7)*lines*uLine+uAccent*accent*(.6+.4*base);
  color=max(color+grain*max(color.r,max(color.g,color.b)),0.)*mask;
  outColor=vec4(color,max(color.r,max(color.g,color.b)));
}`;

  function compile(t,src){const sh=gl.createShader(t);gl.shaderSource(sh,src);gl.compileShader(sh);
    if(gl.getShaderParameter(sh,gl.COMPILE_STATUS))return sh;console.warn(gl.getShaderInfoLog(sh));gl.deleteShader(sh);return null}
  const v=compile(gl.VERTEX_SHADER,VERT),f=compile(gl.FRAGMENT_SHADER,FRAG);
  if(!v||!f){cv.style.display='none';return}
  const prog=gl.createProgram();
  gl.attachShader(prog,v);gl.attachShader(prog,f);
  gl.bindAttribLocation(prog,0,'aPosition');
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){cv.style.display='none';return}
  gl.deleteShader(v);gl.deleteShader(f);
  const U={};['uResolution','uTime','uSteps','uDepth','uSpread','uLine','uZoom','uTravel','uRoll','uPulse','uSparkle','uColor','uAccent','uBrightness','uTorch','uLook','uGrain','uFade','uOpacity']
    .forEach(n=>U[n]=gl.getUniformLocation(prog,n));

  const vao=gl.createVertexArray(),buf=gl.createBuffer();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.bindVertexArray(null);

  // color parse
  const probe=document.createElement('canvas');probe.width=1;probe.height=1;
  const pc=probe.getContext('2d',{willReadFrequently:true});
  const toRgb=v=>{pc.fillStyle='#000';pc.fillStyle=v;pc.fillRect(0,0,1,1);
    const d=pc.getImageData(0,0,1,1).data;return[d[0]/255,d[1]/255,d[2]/255]};
  const COL0=toRgb(S.color),ACC0=toRgb(S.accent),
        COLD=toRgb('#8A8073'),ACCD=toRgb('#E05A4E');
  let COL=COL0,ACC=ACC0;
  const syncTheme=()=>{
    const dark=document.documentElement.dataset.theme==='dark';
    COL=dark?COLD:COL0;ACC=dark?ACCD:ACC0;
    render();
  };

  let W,H,state={time:0,pulsePhase:0,sparklePhase:0,roll:0,
    torch:{x:0,y:0,vx:0,vy:0,presence:0,placed:false},
    look:{x:0,y:0,vx:0,vy:0},
    ptr:{x:0,y:0,inside:false}};
  function resize(){
    const w=document.documentElement.clientWidth,h=innerHeight;
    const dpr=Math.min(devicePixelRatio||1,2);
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
    cv.style.width=w+'px';cv.style.height=h+'px';
    W=cv.width;H=cv.height;render();
  }
  function render(){
    gl.viewport(0,0,W,H);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const aspect=(W/H)/(W/H);
    gl.useProgram(prog);
    gl.uniform2f(U.uResolution,W,H);
    gl.uniform1f(U.uTime,state.time%1000);
    gl.uniform1f(U.uSteps,S.steps);
    gl.uniform1f(U.uDepth,S.depth);
    gl.uniform1f(U.uSpread,.2+S.edges*.22);
    gl.uniform1f(U.uLine,.15+S.edges*.35);
    gl.uniform1f(U.uZoom,S.zoom);
    gl.uniform1f(U.uTravel,Math.sin(state.time)*S.breathe);
    gl.uniform1f(U.uRoll,state.roll);
    gl.uniform4f(U.uPulse,S.pulse,.16/S.pulseSpacing,.05*S.pulseWidth,state.pulsePhase);
    gl.uniform2f(U.uSparkle,S.sparkle,state.sparklePhase);
    gl.uniform3f(U.uColor,COL[0],COL[1],COL[2]);
    gl.uniform3f(U.uAccent,ACC[0],ACC[1],ACC[2]);
    gl.uniform1f(U.uBrightness,S.brightness);
    const asp=W/H;
    gl.uniform4f(U.uTorch,(state.torch.x/W-.5)*2*asp,(0.5-state.torch.y/H)*2,S.mouseRadius,S.mouseStrength*state.torch.presence);
    gl.uniform2f(U.uLook,state.look.x,state.look.y);
    gl.uniform1f(U.uGrain,S.grain);
    gl.uniform1f(U.uFade,0);
    gl.uniform1f(U.uOpacity,S.opacity);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindVertexArray(null);
  }
  let raf=0,last=0,visible=true;
  function frame(now){
    raf=0;
    if(!visible||document.hidden){last=0;return}
    const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
    if(!reduce){
      state.time+=dt*S.speed;
      state.pulsePhase=(state.pulsePhase+dt*S.pulseSpeed)%1;
      state.sparklePhase=(state.sparklePhase+dt*2)%(Math.PI*2);
    }
    const T=state.torch,L=state.look;
    const active=state.ptr.inside&&!reduce;
    if(active&&!T.placed){T.x=state.ptr.x;T.y=state.ptr.y;T.vx=T.vy=0;T.placed=true}
    T.vx+=(110*(state.ptr.x-T.x)-19*T.vx)*dt;T.vy+=(110*(state.ptr.y-T.y)-19*T.vy)*dt;
    T.x+=T.vx*dt;T.y+=T.vy*dt;
    const goal=active?1:0;
    T.presence+=(goal-T.presence)*(1-Math.exp(-dt/(goal>T.presence?.3:.6)));
    if(!active&&T.presence<.001)T.placed=false;
    const lookX=active?(state.ptr.x/W-.5)*.06:0, lookY=active?(.5-state.ptr.y/H)*.06:0;
    L.vx+=(40*(lookX-L.x)-12*L.vx)*dt;L.vy+=(40*(lookY-L.y)-12*L.vy)*dt;
    L.x+=L.vx*dt;L.y+=L.vy*dt;
    render();
    const settling=Math.abs(goal-T.presence)>.002||Math.hypot(T.vx,T.vy)>.5||Math.abs(lookX-L.x)>.0002||Math.abs(lookY-L.y)>.0002;
    if(!reduce||settling||state.ptr.inside)raf=requestAnimationFrame(frame);
    else last=0;
  }
  const wake=()=>{if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame)};
  addEventListener('pointermove',e=>{
    const r=cv.getBoundingClientRect();
    state.ptr.x=(e.clientX-r.left)*(W/r.width);
    state.ptr.y=(e.clientY-r.top)*(H/r.height);
    state.ptr.inside=state.ptr.x>=0&&state.ptr.y>=0;wake();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{state.ptr.inside=false;wake()});
  document.addEventListener('visibilitychange',()=>{last=0;wake()});
  new IntersectionObserver(es=>{visible=es.some(x=>x.isIntersecting);if(visible){last=0;wake()}},{threshold:0}).observe(cv);
  addEventListener('resize',resize);
  // react to theme changes
  new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  resize();
  if(reduce)render();
  wake();
})();
