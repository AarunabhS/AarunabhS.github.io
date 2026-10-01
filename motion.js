/* A progressive motion layer. Content and controls stay usable without it. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;
  let paused = false;
  try {paused=sessionStorage.getItem('portfolio-motion-paused')==='true';} catch {}
  root.classList.toggle('motion-paused',paused);
  function syncPause() {
    document.querySelectorAll('.motion-toggle').forEach(button=>{
      button.textContent=paused?'Resume motion':'Pause motion';
      button.setAttribute('aria-pressed',String(paused));
      button.disabled=reduced.matches;
      if(reduced.matches)button.textContent='Reduced motion';
    });
  }
  syncPause();
  document.querySelectorAll('.motion-toggle').forEach(button=>button.addEventListener('click',()=>{
    paused=!paused;root.classList.toggle('motion-paused',paused);syncPause();
    try {sessionStorage.setItem('portfolio-motion-paused',String(paused));} catch {}
    document.dispatchEvent(new Event('portfolio:motion-preference'));
  }));
  if (!reduced.matches) {
    document.body.classList.add('page-arriving');
    document.body.addEventListener('animationend',event=>{if(event.target===document.body)document.body.classList.remove('page-arriving');},{once:true});
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
    const link=event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url=new URL(link.href,location.href);
    if (url.origin!==location.origin || !/\.html$/.test(url.pathname) || (url.pathname===location.pathname && url.search===location.search)) return;
    event.preventDefault();
    document.body.classList.remove('page-arriving');
    document.body.classList.add('page-leaving');
    setTimeout(()=>location.assign(url.href),160);
  });
  addEventListener('pageshow',()=>document.body.classList.remove('page-leaving'));
  const bound = new WeakSet();
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target);}
  }), {threshold:.06, rootMargin:'0px 0px -20px 0px'});
  function bindMotion() {
    if (!reduced.matches) root.classList.add('motion-ready');
    document.querySelectorAll('.reveal, .project-card').forEach(el => {
      if (bound.has(el)) return;
      bound.add(el);
      if (el.classList.contains('project-card')) el.classList.add('reveal');
      revealObserver.observe(el);
    });
    document.querySelectorAll('.magnetic').forEach(el => {
      if (el.dataset.motionBound) return;
      el.dataset.motionBound = 'true';
      el.addEventListener('pointermove', event => {
        if (reduced.matches || !fine.matches) return;
        const rect = el.getBoundingClientRect();
        el.style.translate = `${(event.clientX-rect.left-rect.width/2)*.12}px ${(event.clientY-rect.top-rect.height/2)*.16}px`;
      });
      el.addEventListener('pointerleave', () => {el.style.translate = '0 0';});
      el.addEventListener('blur', () => {el.style.translate = '0 0';});
    });
  }
  bindMotion();
  document.addEventListener('portfolio:projects-rendered', bindMotion);
  document.addEventListener('portfolio:demo-rendered', () => {
    const panel = document.querySelector('#lab-panel');
    if (!reduced.matches && panel) panel.animate([{opacity:.45,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:'ease-out'});
  });
  const chapters = [...document.querySelectorAll('.story-chapter')];
  const slides = [...document.querySelectorAll('.stage-slide')];
  const stage = document.querySelector('.story-stage');
  const labels = ['WATCH ATLAS / COLLECTION INSIGHTS','FRAUD DETECTION / REVIEW TRADE-OFFS','COMPETITIVE INTELLIGENCE / INSIGHT ENGINE'];
  const statuses = ['ARCHIVAL COLLECTION · PUBLIC APP','RECORDED HOLDOUT · BENCHMARK EVIDENCE','ORIGINAL INTERFACE · FICTIONAL SAMPLE'];
  let currentStage = 0;
  function updateStory() {
    if (!chapters.length || !stage || innerWidth <= 600) return;
    const target = innerHeight*.5;
    let next = 0;
    chapters.forEach((chapter,index) => {if (chapter.getBoundingClientRect().top < target) next=index;});
    if (next === currentStage) return;
    currentStage = next;
    slides.forEach((slide,index) => {const active=index===next; slide.classList.toggle('active',active);slide.tabIndex=active?0:-1;slide.setAttribute('aria-hidden',String(!active));});
    stage.querySelectorAll('.stage-dots i').forEach((dot,index) => dot.classList.toggle('active',index===next));
    stage.querySelector('.stage-caption').textContent=labels[next];
    stage.querySelector('.stage-status').textContent=statuses[next];
    stage.querySelector('.stage-index').innerHTML=`0${next+1}<span>/ 03</span>`;
    stage.style.transform=`rotate(${[-1.5,1,-.7][next]}deg)`;
    stage.style.borderRadius=`${[14,26,8][next]}px`;
  }
  const progress = document.querySelector('.reading-progress');
  const header = document.querySelector('.site-header');
  const heroArt = document.querySelector('.signal-art');
  let pending = false;
  function onScroll() {
    if (pending) return;
    pending=true;
    requestAnimationFrame(() => {
      const max=document.documentElement.scrollHeight-innerHeight;
      if (progress) progress.style.transform=`scaleX(${max>0?scrollY/max:0})`;
      header?.classList.toggle('is-scrolled',scrollY>120);
      if(heroArt)heroArt.style.translate=!reduced.matches && !paused && innerWidth>600 ? `0 ${Math.min(scrollY*.08,28)}px` : '0 0';
      updateStory();pending=false;
    });
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll,{passive:true});
  onScroll();
  const canvas=document.querySelector('#signal-canvas');
  if (!canvas) return;
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  const art=canvas.parentElement;
  let width=0,height=0,frame=0,lastFrame=0,visible=true,rotation=0,px=0,py=0,tx=0,ty=0;
  let hovering=false,shape=0,scatter=0,pointerX=0,pointerY=0,hasPointer=false;
  let palette;
  const count=1100,points=[],projected=[];
  const names=['Sphere','Torus','Double helix','Ribbon'];
  const state=art.querySelector('.signal-state');
  const hint=art.querySelector('.art-baseline>span:last-child');
  if(hint && !fine.matches)hint.textContent='TAP TO CHANGE FORM ↗';
  const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  for(let i=0;i<count;i++) {
    const t=i/(count-1),y=1-t*2,r=Math.sqrt(1-y*y),angle=i*2.399963229728653;
    const sphere={x:Math.cos(angle)*r,y,z:Math.sin(angle)*r};
    const u=t*Math.PI*2,v=angle;
    const torus={x:(.76+.25*Math.cos(v))*Math.cos(u),y:.25*Math.sin(v),z:(.76+.25*Math.cos(v))*Math.sin(u)};
    const strand=i%2,helixAngle=t*Math.PI*4+strand*Math.PI;
    const thickness=.065,offset=random(i+7)*Math.PI*2;
    const helix={x:.60*Math.cos(helixAngle)+thickness*Math.cos(offset),y:y*1.12,z:.60*Math.sin(helixAngle)+thickness*Math.sin(offset)};
    const across=(random(i+91)-.5)*.52;
    const ribbon={x:(t*2-1)*1.13,y:Math.sin(t*Math.PI*3)*.46+across*Math.cos(t*Math.PI*3),z:Math.cos(t*Math.PI*3)*.34+across*Math.sin(t*Math.PI*3)};
    points.push({...sphere,vx:0,vy:0,vz:0,seed:random(i+20),forms:[sphere,torus,helix,ribbon],sx:random(i+31)-.5,sy:random(i+45)-.5,sz:random(i+56)-.5});
    projected.push({x:0,y:0,z:0,ox:0,oy:0,alpha:0,size:0,seed:points[i].seed});
  }
  function readPalette() {
    const css=getComputedStyle(root);
    palette={main:css.getPropertyValue('--sculpture-main').trim()||'209, 240, 164',secondary:css.getPropertyValue('--sculpture-secondary').trim()||'178, 178, 218',glow:css.getPropertyValue('--sculpture-glow').trim()||'174, 215, 102'};
  }
  function changeShape() {
    if(reduced.matches||paused)return;
    shape=(shape+1)%names.length;scatter=1;
    points.forEach(p=>{p.vx+=p.sx*.32;p.vy+=p.sy*.32;p.vz+=p.sz*.32;});
    canvas.dataset.shape=names[shape].toLowerCase().replaceAll(' ','-');
    if(state)state.textContent=`0${shape+1} / ${names[shape].toUpperCase()} · SCATTER → REFORM`;
    start();
  }
  readPalette();
  canvas.dataset.shape='sphere';
  function size() {
    const rect=art.getBoundingClientRect();width=rect.width;height=rect.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    draw(0);
  }
  function draw(timestamp) {
    const animated=timestamp && !reduced.matches && !paused;
    if (animated && timestamp-lastFrame<32) {frame=requestAnimationFrame(draw);return;}
    const step=animated?Math.min(1.6,Math.max(.5,(timestamp-lastFrame)/33.333)):0;
    if(animated) {rotation+=.0023*step;lastFrame=timestamp;scatter*=Math.pow(.89,step);}
    const small=width<450;
    const radius=Math.min(width*.32,height*.30);
    if(animated){px+=(tx-px)*.09;py+=(ty-py)*.09;}
    const cx=width*(.52+px*.07),cy=height*(.49+py*.055);
    const angle=rotation+px*.36;
    const ca=Math.cos(angle),sa=Math.sin(angle),tilt=-.36+py*.26,ct=Math.cos(tilt),st=Math.sin(tilt);
    ctx.clearRect(0,0,width,height);
    const glow=ctx.createRadialGradient(cx,cy,5,cx,cy,radius*1.75);glow.addColorStop(0,`rgba(${palette.glow},.085)`);glow.addColorStop(1,`rgba(${palette.glow},0)`);ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.strokeStyle=`rgba(${palette.main},.10)`;ctx.lineWidth=.65;
    for(let orbit=0;orbit<2;orbit++) {
      ctx.beginPath();
      for(let n=0;n<=100;n++) {
        const a=n/100*Math.PI*2;
        const ox=Math.cos(a)*radius*(1.24+orbit*.06),oy=Math.sin(a)*radius*(.36+orbit*.20);
        const rot=-.6+orbit*1.0+px*.12;
        const x=ox*Math.cos(rot)-oy*Math.sin(rot),y=ox*Math.sin(rot)+oy*Math.cos(rot);
        if(n===0)ctx.moveTo(cx+x,cy+y);else ctx.lineTo(cx+x,cy+y);
      }
      ctx.stroke();
    }
    points.forEach((point,i) => {
      const target=point.forms[shape];
      if(animated) {
        const spread=scatter*1.4;
        point.vx=(point.vx+(target.x+point.sx*spread-point.x)*.025*step)*Math.pow(.78,step);
        point.vy=(point.vy+(target.y+point.sy*spread-point.y)*.025*step)*Math.pow(.78,step);
        point.vz=(point.vz+(target.z+point.sz*spread-point.z)*.025*step)*Math.pow(.78,step);
        point.x+=point.vx*step;point.y+=point.vy*step;point.z+=point.vz*step;
      }
      const breath=1+.012*Math.sin(rotation*3+point.forms[0].y*3);
      const x=(point.x*ca-point.z*sa)*breath;
      const z=point.x*sa+point.z*ca;
      const y=point.y*ct-z*st;
      const depth=point.y*st+z*ct;
      const perspective=2.6/(2.6-depth*.55);
      const screenX=cx+x*radius*perspective,screenY=cy+y*radius*perspective;
      let forceX=0,forceY=0;
      // A soft pocket follows the pointer, moving nearby points out of its way.
      if(hovering&&hasPointer&&!reduced.matches&&!paused) {
        const dx=screenX-pointerX,dy=screenY-pointerY,d=Math.hypot(dx,dy),reach=radius*.48;
        if(d<reach) {
          const force=Math.pow(1-d/reach,2)*radius*.21;
          forceX=dx/Math.max(1,d)*force;forceY=dy/Math.max(1,d)*force;
        }
      }
      const p=projected[i];
      if(animated){p.ox+=(forceX-p.ox)*.18*step;p.oy+=(forceY-p.oy)*.18*step;}
      p.x=screenX+p.ox;p.y=screenY+p.oy;p.z=depth;
      p.alpha=Math.max(.13,Math.min(.95,.24+(depth+1)*.31));
      p.size=(small?.65:.78)+Math.max(0,depth+1)*.42;
    });
    // Sort a shallow copy; particle identities keep their spring state and seeds.
    [...projected].sort((a,b)=>a.z-b.z).forEach(p => {
      ctx.fillStyle=`rgba(${p.seed>.945?palette.secondary:palette.main},${p.alpha})`;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
    });
    if (!reduced.matches && !paused && visible && !document.hidden) {
      frame=requestAnimationFrame(draw);
    } else frame=0;
  }
  function start() {if(!frame && visible && !document.hidden && !paused && !reduced.matches){lastFrame=performance.now();frame=requestAnimationFrame(draw);}}
  const visibilityObserver=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible) start();else {cancelAnimationFrame(frame);frame=0;}
  });visibilityObserver.observe(art);
  new ResizeObserver(() => {cancelAnimationFrame(frame);frame=0;size();}).observe(art);
  canvas.addEventListener('pointerenter',event=>{if(event.pointerType==='touch'||!fine.matches||reduced.matches||paused)return;hovering=true;changeShape();});
  canvas.addEventListener('pointermove',event=>{if(reduced.matches||paused||!fine.matches)return;const rect=art.getBoundingClientRect();pointerX=event.clientX-rect.left;pointerY=event.clientY-rect.top;tx=pointerX/rect.width-.5;ty=pointerY/rect.height-.5;hasPointer=true;});
  canvas.addEventListener('pointerleave',()=>{hovering=false;hasPointer=false;tx=0;ty=0;});
  canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')changeShape();});
  document.addEventListener('portfolio:theme-change',()=>{readPalette();if(!frame)draw(0);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});
  document.addEventListener('portfolio:motion-preference',()=>{cancelAnimationFrame(frame);frame=0;if(!paused)start();});
  reduced.addEventListener('change',()=>{root.classList.toggle('motion-ready',!reduced.matches);syncPause();cancelAnimationFrame(frame);frame=0;draw(0);});
})();
