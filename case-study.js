/* Source-linked case studies: every claim is paired with reviewed context. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  const external = link => `<a class="text-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} <span aria-hidden="true">↗</span></a>`;
  const read = async url => {
    const response = await fetch(url, {signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error(`Could not read ${url}`);
    return response.json();
  };
  let images = [];
  let imageIndex = 0;
  let lightboxOpener;
  const lightbox = $('#case-lightbox');

  function showImage(index) {
    imageIndex = (index + images.length) % images.length;
    const item = images[imageIndex];
    $('#lightbox-image').src = item.src;
    $('#lightbox-image').alt = item.alt;
    $('#lightbox-title').textContent = `${String(imageIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')} · ${item.alt}`;
    $('#lightbox-caption').textContent = item.caption;
  }
  $('#lightbox-close').addEventListener('click', () => lightbox.close());
  $('#lightbox-previous').addEventListener('click', () => showImage(imageIndex - 1));
  $('#lightbox-next').addEventListener('click', () => showImage(imageIndex + 1));
  lightbox.addEventListener('close', () => {document.body.style.overflow = ''; lightboxOpener?.focus({preventScroll:true});});
  lightbox.addEventListener('click', event => {if (event.target === lightbox) lightbox.close();});
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {event.preventDefault(); showImage(imageIndex - 1);}
    if (event.key === 'ArrowRight') {event.preventDefault(); showImage(imageIndex + 1);}
  });

  function attachMotion() {
    const sections = [...document.querySelectorAll('.case-section[id]')];
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {entry.target.classList.add('case-revealed'); observer.unobserve(entry.target);}
        });
      }, {threshold:0.08});
      document.querySelectorAll('[data-case-reveal]').forEach(element => {element.classList.add('case-will-reveal'); observer.observe(element);});
      const navigation = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          document.querySelectorAll('.case-nav a').forEach(link => {
            const active = link.hash === `#${entry.target.id}`;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
          });
        });
      }, {rootMargin:'-20% 0px -60% 0px'});
      sections.forEach(section => navigation.observe(section));
    }
    let frame = 0;
    function update() {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      $('#reading-progress').style.transform = `scaleX(${range > 0 ? Math.min(1,window.scrollY/range) : 1})`;
    }
    window.addEventListener('scroll', () => {if (!frame) frame = requestAnimationFrame(update);}, {passive:true});
    window.addEventListener('resize', update);
    update();
  }

  function render(project, story, projects) {
    images = [...project.images, ...(story.additionalImages || [])];
    const index = projects.findIndex(item => item.id === project.id);
    const next = projects[(index + 1) % projects.length];
    const image = images[0];
    const source = project.private ? '<span class="case-private-note">Source repository private · local showcase</span>' : external({url:project.sourceUrl,label:'View the code'});
    const lab = `lab.html?project=${encodeURIComponent(project.demo)}`;
    document.title = `${project.title} — Case study | Arunabho Som`;
    document.querySelector('meta[name="description"]').content = `${story.question} ${story.lede}`;
    $('#case-content').innerHTML = `
      <section class="wrap case-hero">
        <div class="case-hero-top"><a class="text-link" href="index.html#projects"><span aria-hidden="true">←</span> All selected work</a><span class="case-index">Case ${String(index + 1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}</span></div>
        <p class="eyebrow case-project-label">${esc(project.title)} <span aria-hidden="true">/</span> ${esc(story.evidenceType)}</p>
        <h1>${esc(story.title)}</h1>
        <div class="case-hero-copy"><p class="case-lede">${esc(story.lede)}</p><div class="case-hero-actions"><a class="button button-dark case-lab-button" href="${lab}">Explore the interactive lab <span aria-hidden="true">↗</span></a>${source}</div></div>
        <div class="case-role"><span class="eyebrow">The work</span><p>${esc(story.role)}</p></div>
      </section>
      <section class="wrap case-opening" aria-label="Project at a glance">
        <button class="case-cover" type="button" data-case-image="0" aria-label="Open full-size ${esc(image.alt)}"><span class="case-cover-top"><span>${esc(project.title)} / The output</span><span aria-hidden="true">↗</span></span><img src="${esc(image.preview || image.src)}" alt="${esc(image.alt)}" width="${image.width || 1440}" height="${image.height || 1000}" fetchpriority="high"><span class="case-cover-caption">${esc(image.caption)}</span></button>
        <div class="case-metric-grid">${story.metrics.map(metric => `<div class="case-metric"><strong>${esc(metric.value)}</strong><span>${esc(metric.label)}</span><p>${esc(metric.context)}</p></div>`).join('')}</div>
      </section>
      <div class="case-nav-shell"><nav class="case-nav wrap" aria-label="Case study sections"><span class="case-nav-title">Inside the work</span><a href="#question" class="active" aria-current="location">01 / Question</a><a href="#approach">02 / Approach</a><a href="#evidence">03 / Evidence</a><a href="#results">04 / Results</a><a href="#context">05 / Context</a></nav></div>
      <div class="wrap case-story">
        <section class="case-section case-question" id="question" data-case-reveal><div class="case-section-label"><p class="eyebrow">01 / The starting point</p><span class="case-section-mark" aria-hidden="true">↗</span></div><div class="case-section-body"><h2>${esc(story.question)}</h2><p class="case-large-copy">${esc(story.purpose)}</p><div class="case-data-note"><p class="eyebrow">What the evidence contains</p><p>${esc(story.data)}</p></div></div></section>
        <section class="case-section" id="approach" data-case-reveal><div class="case-section-label"><p class="eyebrow">02 / The approach</p><span class="case-section-mark" aria-hidden="true">✳</span></div><div class="case-section-body"><h2>Make the process<br><em>part of the story.</em></h2><p class="case-large-copy">${esc(story.approach)}</p><div class="case-pipeline" aria-label="Project workflow">${project.pipeline.map((step,i) => `<div><span>0${i+1}</span><p>${esc(step)}</p><b aria-hidden="true">${i === project.pipeline.length-1 ? '✓' : '→'}</b></div>`).join('')}</div><div class="case-decisions">${story.decisions.map((decision,i) => `<article><span class="case-decision-index">Decision 0${i+1}</span><h3>${esc(decision.title)}</h3><p>${esc(decision.body)}</p></article>`).join('')}</div></div></section>
        <section class="case-section case-evidence" id="evidence" data-case-reveal><div class="case-section-label"><p class="eyebrow">03 / The visual evidence</p></div><div class="case-section-body"><h2>See the work.<br><em>Read the details.</em></h2><p class="case-large-copy">${esc(project.change)}</p><p class="case-gallery-hint">Open any output for the full-resolution view. Use the arrow keys to move through the gallery.</p></div><div class="case-gallery">${images.map((item,i) => `<figure class="case-gallery-item" data-case-reveal><button type="button" data-case-image="${i}" aria-label="Open full-size ${esc(item.alt)}"><img src="${esc(item.preview || item.src)}" alt="${esc(item.alt)}" width="${item.width || 1440}" height="${item.height || 1000}" loading="lazy"><span class="case-image-expand" aria-hidden="true">↗</span></button><figcaption><span class="case-gallery-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(item.alt)}</h3><p>${esc(item.caption)}</p></div></figcaption></figure>`).join('')}</div></section>
        <section class="case-section" id="results" data-case-reveal><div class="case-section-label"><p class="eyebrow">04 / What it shows</p></div><div class="case-section-body"><h2>The result.<br><em>With its context.</em></h2><div class="case-findings">${story.findings.map((finding,i) => `<div><span>0${i+1}</span><p>${esc(finding)}</p></div>`).join('')}</div><div class="case-skills" aria-label="Skills demonstrated">${story.skills.map(skill => `<span>${esc(skill)}</span>`).join('')}</div></div></section>
      </div>
      <section class="case-lab-callout" data-case-reveal><div class="wrap case-lab-callout-inner"><div><p class="eyebrow">Now make it your question</p><h2>Go ahead.<br><em>Change something.</em></h2></div><div><p>Move a control, explore a different selection, and see how the output responds. The lab keeps the data source and the meaning of each result in view.</p><a class="button button-dark" href="${lab}">Open this project in the lab <span aria-hidden="true">↗</span></a></div><span class="case-lab-orbit" aria-hidden="true">✳</span></div></section>
      <section class="wrap case-section case-context" id="context" data-case-reveal><div class="case-section-label"><p class="eyebrow">05 / Keep the context</p></div><div class="case-section-body"><h2>What this evidence<br><em>can tell us.</em></h2><div class="case-limitations">${story.limitations.map(limit => `<p>${esc(limit)}</p>`).join('')}</div><div class="case-next-step"><p class="eyebrow">A meaningful next step</p><p>${esc(story.next)}</p></div><div class="case-source-list"><p class="eyebrow">Explore the evidence trail</p>${story.sourceLinks.map(external).join('')}${project.private ? '<p class="case-private-note">The source project is private. The gallery and lab preserve the reviewed local showcase.</p>' : ''}</div><p class="case-provenance">Reviewed revision <span>${esc(project.snapshotCommit.slice(0,7))}</span>${project.workingTreeChanges ? ' + local working-tree changes' : ''} · captured ${esc(project.capturedOn)}.${story.rights ? ` ${esc(story.rights)}` : ''}</p></div></section>
      <section class="wrap case-next-project"><p class="eyebrow">Keep exploring / next case study</p><a href="case-study.html?project=${encodeURIComponent(next.id)}"><h2>${esc(next.title)}</h2><span aria-hidden="true">↗</span></a></section>`;
    $('#case-content').setAttribute('aria-busy','false');
    document.querySelectorAll('[data-case-image]').forEach(button => button.addEventListener('click', () => {
      lightboxOpener = button;
      showImage(Number(button.dataset.caseImage));
      lightbox.showModal();
      document.body.style.overflow = 'hidden';
    }));
    attachMotion();
  }

  async function init() {
    try {
      const [manifest, content] = await Promise.all([read('data/projects.json'),read('data/case-studies.json')]);
      const id = new URLSearchParams(window.location.search).get('project') || 'fraud';
      const project = manifest.projects.find(item => item.id === id);
      if (!project || !content.cases[id]) {
        $('#case-content').innerHTML = `<section class="wrap case-fallback"><p class="eyebrow">The project collection</p><h1>Find your next<br><em>question.</em></h1><p>This case study is unavailable. Choose one of the reviewed projects below.</p><div class="case-directory">${manifest.projects.map(item => `<a href="case-study.html?project=${encodeURIComponent(item.id)}"><span>${esc(item.title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
        $('#case-content').setAttribute('aria-busy','false');
        return;
      }
      render(project, content.cases[id], manifest.projects);
    } catch {
      $('#case-content').innerHTML = '<section class="wrap case-fallback"><p class="eyebrow">Inside the work</p><h1>The evidence is<br>taking a moment.</h1><p>This case study could not load. Refresh the page, or return to the project collection.</p><a class="button button-dark" href="index.html#projects">Explore the selected work ↗</a></section>';
      $('#case-content').setAttribute('aria-busy','false');
    }
  }
  init();
})();
