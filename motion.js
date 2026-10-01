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
  const points=[];
  const count=1200;
  for(let i=0;i<count;i++) {
    const y=1-(i/(count-1))*2;
    const r=Math.sqrt(1-y*y);
    const angle=i*2.399963229728653;
    points.push({x:Math.cos(angle)*r,y,z:Math.sin(angle)*r,seed:(i*13.71)%1});
  }
  function size() {
    const rect=art.getBoundingClientRect();width=rect.width;height=rect.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    draw(0);
  }
  function draw(timestamp) {
    if (timestamp && timestamp-lastFrame<32 && !reduced.matches) {frame=requestAnimationFrame(draw);return;}
    if (timestamp) {rotation+=.0035;lastFrame=timestamp;}
    const small=width<450;
    const radius=Math.min(width*.32,height*.34);
    const cx=width*.52,cy=height*.5;
    px+=(tx-px)*.035;py+=(ty-py)*.035;
    const angle=rotation+px*.25;
    const ca=Math.cos(angle),sa=Math.sin(angle),tilt=-.33+py*.14,ct=Math.cos(tilt),st=Math.sin(tilt);
    ctx.clearRect(0,0,width,height);
    const glow=ctx.createRadialGradient(cx,cy,5,cx,cy,radius*1.65);glow.addColorStop(0,'rgba(154,200,66,.065)');glow.addColorStop(1,'rgba(154,200,66,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='rgba(166,208,108,.20)';ctx.lineWidth=.6;
    for(let orbit=0;orbit<3;orbit++) {
      ctx.beginPath();
      for(let n=0;n<=100;n++) {
        const a=n/100*Math.PI*2;
        const ox=Math.cos(a)*radius*(1.13+orbit*.08),oy=Math.sin(a)*radius*(.36+orbit*.12);
        const rot=-.6+orbit*.65;
        const x=ox*Math.cos(rot)-oy*Math.sin(rot),y=ox*Math.sin(rot)+oy*Math.cos(rot);
        if(n===0)ctx.moveTo(cx+x,cy+y);else ctx.lineTo(cx+x,cy+y);
      }
      ctx.stroke();
    }
    const morph = reduced.matches ? 0 : Math.min(1,Math.max(0,scrollY/(height*1.7)))*.28;
    const drawn=points.map((point,i) => {
      const distortion=1+.08*Math.sin(point.y*7+rotation*2);
      const x=(point.x*ca-point.z*sa)*distortion;
      const z=point.x*sa+point.z*ca;
      const y=point.y*ct-z*st;
      const depth=point.y*st+z*ct;
      const perspective=2.6/(2.6-depth*.55);
      const waveY=Math.sin(i/count*Math.PI*7+rotation)*.5;
      return {x:cx+(x*(1-morph)+(i/count*2-1)*morph)*radius*perspective,y:cy+(y*(1-morph)+waveY*morph)*radius*perspective,z:depth,s:point.seed};
    }).sort((a,b)=>a.z-b.z);
    drawn.forEach(p => {
      const alpha=.15+(p.z+1)*.35;
      ctx.fillStyle=p.s>.965?`rgba(177,163,242,${alpha})`:`rgba(208,242,141,${alpha})`;
      ctx.beginPath();ctx.arc(p.x,p.y,(small?.55:.7)+(p.z+1)*.42,0,Math.PI*2);ctx.fill();
    });
    if (!reduced.matches && !paused && visible && !document.hidden) {
      frame=requestAnimationFrame(draw);
    } else frame=0;
  }
  function start() {if(!frame && visible && !document.hidden && !paused) frame=requestAnimationFrame(draw);}
  const visibilityObserver=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible) start();else {cancelAnimationFrame(frame);frame=0;}
  });visibilityObserver.observe(art);
  new ResizeObserver(() => {cancelAnimationFrame(frame);frame=0;size();}).observe(art);
  art.addEventListener('pointermove',event=>{if(reduced.matches||!fine.matches)return;const rect=art.getBoundingClientRect();tx=(event.clientX-rect.left)/rect.width-.5;ty=(event.clientY-rect.top)/rect.height-.5;});
  art.addEventListener('pointerleave',()=>{tx=0;ty=0;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});
  document.addEventListener('portfolio:motion-preference',()=>{cancelAnimationFrame(frame);frame=0;if(!paused)start();});
  reduced.addEventListener('change',()=>{root.classList.toggle('motion-ready',!reduced.matches);syncPause();cancelAnimationFrame(frame);frame=0;draw(0);});
})();
