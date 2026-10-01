/* Static portfolio: source-linked snapshots, browser demos, anonymous GitHub reads. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const integer = value => Number(value).toLocaleString('en-US');
  const percent = value => `${(Number(value) * 100).toFixed(1)}%`;
  const dollars = value => Number.isFinite(value) ? `$${value.toFixed(2)}` : 'N/A';
  const dateLabel = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Reviewed snapshot' : date.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric', timeZone:'Asia/Kolkata'});
  };
  const dataCache = new Map();
  const TIMEOUT = 10000;
  let projects = [];
  let activeDemo = 'fraud';
  let demoRevision = 0;
  let activity = {};
  let lastActivityCheck = 0;
  let refreshing = false;
  let dialogOpener;
  const panel = $('#lab-panel');
  const dialog = $('#project-dialog');

  async function getJSON(path) {
    if (!dataCache.has(path)) {
      const request = fetch(path, {signal:AbortSignal.timeout(TIMEOUT)})
        .then(response => {
          if (!response.ok) throw new Error(`Unable to load ${path}`);
          return response.json();
        }).catch(error => {dataCache.delete(path); throw error;});
      dataCache.set(path, request);
    }
    return dataCache.get(path);
  }
  const external = (url, label, className = 'text-link') => `<a class="${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
  const sourceLink = project => project.private ? '<span class="project-source-note">Source private</span>' : external(project.sourceUrl, 'Source');
  const titleRow = (title, description, badge, synthetic = false) => `<div class="lab-title-row"><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div><span class="data-badge ${synthetic ? 'synthetic' : ''}">${esc(badge)}</span></div>`;
  const metric = (label, value, note, extra = '') => `<div class="demo-metric ${extra}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></div>`;
  const backgrounds = {watch:'#e1ddcf',playerpulse:'#dce6d7',intelligence:'#dbe5e0',country:'#e3e9d2',fraud:'#e8e4d7',churn:'#e1e6dc',agoda:'#e4e8df',sentiment:'#e8e0f0',ctr:'#dce8e0'};
  const caseLink = project => `<a class="text-link" href="case-study.html?project=${encodeURIComponent(project.id)}">Read case study <span aria-hidden="true">↗</span></a>`;

  function renderProjects(filter = 'all') {
    if (!$('#project-grid')) return;
    const visible = projects.filter(project => filter === 'all' || project.category === filter);
    $('#project-grid').innerHTML = visible.map(project => {
      const n = projects.indexOf(project) + 1;
      const model = ['churn', 'fraud', 'agoda', 'sentiment', 'ctr'].includes(project.id);
      const status = project.liveUrl ? 'Public live app' : project.id === 'intelligence' ? 'Illustrative walkthrough' : project.id === 'agoda' ? 'Synthetic analysis' : model ? 'Recorded benchmark' : project.id === 'playerpulse' ? 'Recorded player archive' : 'Local project capture';
      return `<article class="project-card" data-id="${esc(project.id)}" style="--project-bg:${backgrounds[project.id]}">
        <button type="button" class="project-visual ${model ? 'model-visual' : ''}" data-project="${esc(project.id)}" aria-label="See ${esc(project.title)} screenshots and details"><img src="${esc(project.images[0].preview || project.images[0].src)}" alt="${esc(project.images[0].alt)}" loading="lazy" width="1440" height="1000"><span class="zoom-icon" aria-hidden="true">↗</span></button>
        <div class="project-body"><div class="project-card-top"><span class="project-number">${String(n).padStart(2,'0')} / ${esc(project.eyebrow)}</span><span class="project-status ${project.liveUrl ? '' : 'snapshot'}"><span class="small-dot" aria-hidden="true"></span>${status}</span></div>
          <h3>${esc(project.title)}</h3><p class="project-description">${esc(project.description)}</p><div class="project-tags">${project.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
          <div class="project-bottom"><div class="project-metric"><strong>${esc(project.metric)}</strong><span>${esc(project.metricLabel)}</span></div><div class="project-links">${caseLink(project)}<button type="button" data-project="${esc(project.id)}">Gallery ↗</button>${project.demo ? `<button type="button" data-open-demo="${esc(project.demo)}">${project.liveUrl ? 'Open app' : 'Try it'} ↘</button>` : ''}</div></div>
          ${project.private ? '<p class="project-source-note">Local showcase · source repository private</p>' : ''}
        </div></article>`;
    }).join('');
    $('#project-grid').setAttribute('aria-busy','false');
    if ($('#project-count')) $('#project-count').textContent = `${String(visible.length).padStart(2,'0')} selected project${visible.length === 1 ? '' : 's'}`;
    document.dispatchEvent(new CustomEvent('portfolio:projects-rendered'));
  }

  function openProject(id, opener) {
    const project = projects.find(item => item.id === id);
    if (!project || !dialog) return;
    dialogOpener = opener;
    $('#dialog-content').innerHTML = `<p class="eyebrow">${esc(project.eyebrow)}</p><div class="dialog-title-row"><h2 id="dialog-title">${esc(project.title)}</h2><span class="data-badge">Reviewed ${esc(dateLabel(project.capturedOn))}</span></div><p class="dialog-intro">${esc(project.description)}</p>
      <div class="dialog-change"><h3>What’s changed</h3><p>${esc(project.change)}</p></div>
      <div class="dialog-gallery">${project.images.map((image, i) => `<figure><a href="${esc(image.src)}" target="_blank" rel="noopener" aria-label="Open full-size ${esc(image.alt)}"><img src="${esc(image.src)}" alt="${esc(image.alt)}" loading="${i === 0 ? 'eager' : 'lazy'}"></a><figcaption><span>${esc(image.alt)}</span><span>${esc(image.caption)}</span></figcaption></figure>`).join('')}</div>
      <div class="dialog-pipeline">${project.pipeline.map((step,i) => `<div><span>0${i+1}</span>${esc(step)}</div>`).join('')}</div><div class="dialog-limits"><h3>How to read this output</h3><p>${esc(project.limitation)}</p></div><p class="dialog-source">${project.private ? 'Private local source' : esc(project.repo)} · revision ${esc(project.snapshotCommit.slice(0,7))}${project.workingTreeChanges ? ' + local working-tree changes' : ''} · captured ${esc(project.capturedOn)}</p>
      <div class="dialog-actions">${project.demo ? `<button type="button" class="button button-dark" data-open-demo="${esc(project.demo)}">${project.liveUrl ? 'Explore the live app' : 'Try the interactive output'} <span aria-hidden="true">↘</span></button>` : ''}${caseLink(project)}${sourceLink(project)}${project.report ? external(`${project.sourceUrl}/blob/main/${project.report}`, 'Read the results report') : ''}</div>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function closeDialog() { if(dialog?.open) dialog.close(); }
  dialog?.addEventListener('close', () => {document.body.style.overflow = ''; dialogOpener?.focus({preventScroll:true});});
  $('.dialog-close')?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
  });

  async function showDemo(id) {
    if (!panel || !$('.lab-tabs [role=tab][data-demo="' + id + '"]')) return;
    activeDemo = id;
    const revision = ++demoRevision;
    $$('.lab-tabs [role=tab]').forEach(tab => {
      const selected = tab.dataset.demo === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby',`tab-${id}`);
    panel.setAttribute('aria-busy','true');
    panel.innerHTML = '<p class="loading-note">Preparing the interactive output…</p>';
    try {
      if (id === 'watch' || id === 'country') renderLiveApp(id);
      else {
        const file = id === 'agoda' ? 'bookings' : id === 'talent' ? 'talent-demo' : id === 'playerpulse' ? 'playerpulse' : `${id}-evaluation`;
        const data = await getJSON(`data/${file}.json`);
        if (revision !== demoRevision) return;
        if(id === 'agoda') renderBookings(data);
        else if(id === 'talent') renderTalent(data);
        else if(id === 'playerpulse') renderPlayers(data);
        else if (id === 'sentiment' || id === 'ctr') {
          const {renderModelExplorer} = await import('./model-lab.js');
          if (revision !== demoRevision) return;
          renderModelExplorer(id, data, projects.find(project => project.id === id), panel);
        }
        else renderPolicy(id, data);
      }
      if (revision === demoRevision) {
        const project = projects.find(project => project.demo === id);
        if (project) {
          panel.insertAdjacentHTML('beforeend', `<div class="lab-context-links">${caseLink(project)}${sourceLink(project)}${document.body.dataset.page === 'lab' ? '' : `<a class="text-link" href="lab.html?project=${encodeURIComponent(project.id)}">Open full lab <span aria-hidden="true">↗</span></a>`}</div>`);
          if ($('#lab-current-project')) $('#lab-current-project').textContent = project.title;
          if (document.body.dataset.page === 'lab') {
            const url = new URL(location.href);
            url.searchParams.set('project', project.id);
            history.replaceState(null, '', url);
            document.title = `${project.title} · Interactive lab | Arunabho Som`;
          }
        }
        document.dispatchEvent(new CustomEvent('portfolio:demo-rendered', {detail:{id}}));
      }
    } catch {
      if (revision === demoRevision) panel.innerHTML = '<p class="loading-note">This preview could not load. The project screenshots and source links are still available above. <button class="button button-outline" type="button" data-retry-demo>Retry preview</button></p>';
    } finally {if (revision === demoRevision) panel.setAttribute('aria-busy','false');}
  }

  function renderPolicy(id, data) {
    const isFraud = id === 'fraud';
    const noun = isFraud ? 'fraud cases' : 'departures';
    const units = isFraud ? 'transactions' : 'benchmark rows';
    const project = projects.find(item => item.id === id);
    const policies = data.policies.filter(row => row.split === 'test').sort((a,b) => a.validation_budget_fraction - b.validation_budget_fraction);
    panel.innerHTML = titleRow(isFraud ? 'What can a review team catch?' : 'How does review capacity change the result?', 'Choose a budget set on validation data. See that frozen policy applied to the untouched test partition.', 'Recorded benchmark · phase two') +
      `<div class="demo-layout"><div class="demo-controls"><div class="range-header"><label for="review-budget">Validation review budget</label><output id="budget-value" for="review-budget"></output></div><input type="range" id="review-budget" min="0" max="${policies.length-1}" value="${isFraud ? 0 : policies.length-1}" step="1"><div class="range-limits"><span>0.1% of validation rows</span><span>20%</span></div><p class="control-explainer">A larger budget usually catches more ${noun}, and also brings more false flags. The actual test workload can differ from the validation budget.</p><p class="control-explainer">Selected model: calibrated random forest.<br>Test average precision: <strong>${data.test.average_precision.toFixed(4)}</strong>.</p></div><div class="demo-viz"><div class="metric-grid" id="policy-metrics" role="status" aria-live="polite"></div><h4 id="capture-heading"></h4><div class="policy-bar" id="capture-bar" role="img"></div><div class="chart-legend"><span><i></i>Captured</span><span><i class="missed"></i>Missed</span></div><p class="result-explanation" id="policy-explanation"></p></div></div>
      <p class="demo-provenance">${isFraud ? 'Worldline/ULB public transaction benchmark; chronological test partition, 56,746 transactions and 74 fraud cases. Two days of historical data do not establish production performance.' : 'Public HR teaching benchmark; 2,399 test rows and 398 departure labels. Observation dates and a prediction horizon are absent. This walkthrough evaluates retrospective labels.'} Policies and thresholds are selected on validation data, never on these test outcomes. ${external(`${project.sourceUrl}/blob/main/results/phase2/operating_policies.csv`, 'Inspect the recorded policies')}</p>`;
    const slider = $('#review-budget', panel);
    function update() {
      const row = policies[Number(slider.value)];
      const total = row.tp + row.fn;
      $('#budget-value', panel).textContent = `${(row.validation_budget_fraction * 100).toLocaleString('en-US',{maximumFractionDigits:1})}%`;
      slider.setAttribute('aria-valuetext',`${row.validation_budget_fraction * 100}% validation budget`);
      $('#policy-metrics', panel).innerHTML = metric(`Captured ${noun}`, integer(row.tp), `${percent(row.recall)} recall`) + metric('False flags', integer(row.fp), `${percent(row.precision)} precision`) + metric(`Missed ${noun}`, integer(row.fn), `out of ${integer(total)} positive labels`, 'metric-missed');
      $('#capture-heading', panel).textContent = `Among ${integer(total)} ${noun} in the test partition`;
      $('#capture-bar', panel).innerHTML = `<div style="width:${row.tp / total * 100}%"></div><div class="missed" style="width:${row.fn / total * 100}%"></div>`;
      $('#capture-bar', panel).setAttribute('aria-label',`${row.tp} captured and ${row.fn} missed ${noun}`);
      $('#policy-explanation', panel).textContent = `${integer(row.alerts)} of ${integer(row.rows)} held-out ${units} are flagged for review. ${integer(row.tp)} are true positives and ${integer(row.fp)} are false flags. The score threshold is ${row.threshold.toFixed(5)}.`;
    }
    slider.addEventListener('input', update);
    update();
  }

  function drawBars(container, groups, valueLabel) {
    const largest = Math.max(1, ...groups.map(item => item.value ?? 0));
    container.innerHTML = groups.map(item => `<div class="bar-chart-row"><span>${esc(item.label)}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${(item.value ?? 0) / largest * 100}%"></div></div><strong>${esc(item.value === null ? 'N/A' : valueLabel(item.value))}</strong></div>`).join('');
  }
  function renderBookings(data) {
    const project = projects.find(item => item.id === 'agoda');
    panel.innerHTML = titleRow('When do people book?', 'Change the city, grouping or measure. The chart and summary recalculate from the same 1,000 exported bookings.', 'Synthetic demo · seed 42', true) +
      `<div class="demo-layout"><div class="demo-controls"><label for="booking-city">City</label><select id="booking-city"><option value="all">All five cities</option>${['A','B','C','D','E'].map(city => `<option value="City_${city}">City ${city}</option>`).join('')}</select><label for="booking-group">Compare by</label><select id="booking-group"><option value="city_id">City</option><option value="lead_time_bucket">Booking lead time</option><option value="accommodation_type_name">Accommodation type</option><option value="month">Booking month</option></select><label for="booking-measure">Measure</label><select id="booking-measure"><option value="count">Booking count</option><option value="adr">Mean booked daily rate (USD)</option></select><p class="control-explainer">Booked rates describe these records. They don’t predict a specific room’s future price or prove an urgency message will improve conversion.</p></div><div class="demo-viz"><div class="metric-grid" id="booking-metrics" role="status" aria-live="polite"></div><h4 id="booking-chart-title">Booking count by city</h4><div class="bar-chart" id="booking-chart" aria-label="Grouped booking summary"></div><p class="result-explanation" id="booking-explanation"></p></div></div><p class="demo-provenance">Generated by the updated repository’s <code>analysis.py</code> using its fixed demo seed. ${data.audit.valid_rows} rows passed validation; ${data.audit.excluded_rows} were excluded. The original workbook is not included. These are synthetic examples, not Agoda business findings. ${external(`${project.sourceUrl}/blob/main/README.md`, 'Read the methodology')}</p>`;
    const fields = ['#booking-city','#booking-group','#booking-measure'];
    const buckets = ['Same day','1–2 days','3–4 days','5–14 days','15–29 days','30+ days'];
    function update() {
      const city = $('#booking-city', panel).value;
      const group = $('#booking-group', panel).value;
      const measure = $('#booking-measure', panel).value;
      const rows = data.rows.filter(row => city === 'all' || row.city_id === city);
      const grouped = new Map();
      if (group === 'lead_time_bucket') buckets.forEach(label => grouped.set(label, []));
      rows.forEach(row => {const key = group === 'month' ? row.booking_date.slice(0,7) : row[group]; if(!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(row);});
      const mean = (items, key) => items.length ? items.reduce((sum,row) => sum + row[key],0) / items.length : null;
      let entries = [...grouped.entries()];
      if(group !== 'lead_time_bucket') entries.sort(([a],[b]) => a.localeCompare(b));
      const groups = entries.map(([key,items]) => ({label:group === 'city_id' ? key.replace('_',' ') : key, value:measure === 'count' ? items.length : mean(items,'ADR_USD')}));
      $('#booking-metrics', panel).innerHTML = metric('Bookings', integer(rows.length), 'in the current selection') + metric('Mean daily rate', dollars(mean(rows,'ADR_USD')), 'booked ADR · USD') + metric('Mean lead time', `${mean(rows,'lead_time').toFixed(1)} d`, 'booking to check-in');
      const groupNames = {city_id:'city',lead_time_bucket:'lead time',accommodation_type_name:'accommodation type',month:'booking month'};
      $('#booking-chart-title', panel).textContent = `${measure === 'count' ? 'Booking count' : 'Mean booked daily rate (USD)'} by ${groupNames[group]}`;
      drawBars($('#booking-chart', panel), groups, measure === 'count' ? integer : dollars);
      const leader = [...groups].sort((a,b) => (b.value ?? -1) - (a.value ?? -1))[0];
      $('#booking-explanation', panel).textContent = `${leader.label} has the highest ${measure === 'count' ? 'booking count' : 'mean booked rate'} in this synthetic selection. Change a filter to inspect how the comparison changes.`;
    }
    fields.forEach(field => $(field,panel).addEventListener('change', update));
    update();
  }

  function renderTalent(data) {
    const names = [...new Set(data.jobs.map(job => job.company_name))].sort();
    const markets = [...new Set(data.jobs.map(job => job.location_group))].sort();
    panel.innerHTML = titleRow('Where are companies building capability?', 'Filter the hiring sample to see its role mix and underlying job cards change together.', 'Fictional companies & jobs', true) +
      `<div class="demo-layout"><div class="demo-controls"><label for="talent-company">Company</label><select id="talent-company"><option value="all">All four companies</option>${names.map(name => `<option>${esc(name)}</option>`).join('')}</select><label for="talent-market">Hiring market</label><select id="talent-market"><option value="all">All three markets</option>${markets.map(market => `<option>${esc(market)}</option>`).join('')}</select><p class="control-explainer">A small public walkthrough of Talent Radar’s filtering logic. Every company and role here is fictional; the production app connects to backend hiring data.</p></div><div class="demo-viz"><div class="metric-grid" id="talent-metrics" role="status" aria-live="polite"></div><h4>Capability lanes in the selection</h4><div class="bar-chart" id="talent-chart"></div><div class="talent-list" id="talent-list"></div></div></div><p class="demo-provenance">These 60 illustrative rows are the same fixtures used to capture the original project interface. This is a product walkthrough, not a live jobs feed. ${external('https://github.com/AarunabhS/Threat_scoring_app', 'Explore the project')}</p>`;
    function update() {
      const company = $('#talent-company',panel).value;
      const market = $('#talent-market',panel).value;
      const jobs = data.jobs.filter(job => (company === 'all' || job.company_name === company) && (market === 'all' || job.location_group === market));
      const groups = new Map();
      jobs.forEach(job => groups.set(job.strategic_category, (groups.get(job.strategic_category) || 0) + 1));
      $('#talent-metrics',panel).innerHTML = metric('Visible roles',integer(jobs.length),'illustrative sample') + metric('Hiring markets',new Set(jobs.map(job => job.location_group)).size,'in this selection') + metric('Capability lanes',groups.size,'role families');
      drawBars($('#talent-chart',panel),[...groups].map(([label,value]) => ({label:label.replace('AI & Machine Learning','AI / ML').replace('Product & Delivery','Product'),value})),integer);
      $('#talent-list',panel).innerHTML = jobs.slice(0,4).map(job => `<div class="talent-role"><strong>${esc(job.title)}</strong><span>${esc(job.company_name)} · ${esc(job.location_group)}</span><small>Fictional sample role</small></div>`).join('') || '<p>No sample roles match these filters.</p>';
    }
    $('#talent-company',panel).addEventListener('change',update);
    $('#talent-market',panel).addEventListener('change',update);
    update();
  }

  function renderPlayers(data) {
    const options = data.players.map(player => `<option value="${esc(player.id)}">${esc(player.name)}</option>`).join('');
    const ages = data.players.flatMap(player => player.ages.map(row => row.age));
    const minAge = Math.min(...ages), maxAge = Math.max(...ages);
    const measures = {
      goals90:{label:'Goals per 90', key:'goals', rate:true},
      assists90:{label:'Assists per 90', key:'assists', rate:true},
      contributions90:{label:'Goals + assists per 90', key:'contributions', rate:true},
      goals:{label:'Goals', key:'goals', rate:false},
      minutes:{label:'Minutes played', key:'minutes', rate:false}
    };
    panel.innerHTML = titleRow('Same age. Different football stories.', 'Pick two players and move the age slider. Compare the recorded club-league season at that age, with the underlying totals in view.', 'Recorded archive · five players') +
      `<div class="demo-layout"><div class="demo-controls"><label for="player-first">First player</label><select id="player-first">${options}</select><label for="player-second">Second player</label><select id="player-second">${options}</select><div class="range-header"><label for="player-age">Comparison age</label><output id="player-age-value" for="player-age">24</output></div><input type="range" id="player-age" min="${minAge}" max="${maxAge}" value="24" step="1"><div class="range-limits"><span>${minAge} years</span><span>${maxAge} years</span></div><label class="player-measure-label" for="player-measure">Compare</label><select id="player-measure">${Object.entries(measures).map(([key,measure]) => `<option value="${key}">${measure.label}</option>`).join('')}</select><p class="control-explainer">Per 90 divides a season’s total by its recorded full-match equivalents. It helps account for playing time; era, league and team context still matter.</p></div><div class="demo-viz"><div class="metric-grid" id="player-metrics" role="status" aria-live="polite"></div><h4 id="player-chart-title"></h4><div class="bar-chart player-bars" id="player-chart"></div><div class="player-records" id="player-records"></div><p class="result-explanation" id="player-explanation"></p></div></div><p class="demo-provenance">A small export of the local PlayerPulse archive, captured ${esc(data.capturedOn)}. Uses the source’s season age and club-league totals; cups and international matches are excluded. Coverage varies, and unavailable ages or metrics stay unavailable. These are archived statistics, not a live match feed. <button class="text-link" type="button" data-project="playerpulse">See the full project interface ↗</button></p>`;
    $('#player-first', panel).value = data.players[0].id;
    $('#player-second', panel).value = data.players[1].id;
    function update() {
      const age = Number($('#player-age', panel).value);
      const measure = measures[$('#player-measure', panel).value];
      const selected = ['#player-first','#player-second'].map(field => {
        const player = data.players.find(item => item.id === $(field,panel).value);
        const row = player.ages.find(item => item.age === age);
        let value = row ? measure.key === 'contributions' ? row.goals === null || row.assists === null ? null : row.goals + row.assists : row[measure.key] : null;
        if(measure.rate) value = value === null || !row?.nineties || row.nineties <= 0 ? null : value / row.nineties;
        return {player,row,value};
      });
      const format = value => value === null ? 'N/A' : measure.rate ? value.toFixed(2) : integer(value);
      $('#player-age-value',panel).textContent = String(age);
      $('#player-age',panel).setAttribute('aria-valuetext',`${age} years old`);
      $('#player-metrics',panel).innerHTML = selected.map(({player,value}) => metric(player.name,format(value),measure.label)).join('') + metric('Comparison age',age,'season age in the source');
      $('#player-chart-title',panel).textContent = `${measure.label} at age ${age}`;
      drawBars($('#player-chart',panel),selected.map(({player,value}) => ({label:player.name,value})),format);
      $('#player-records',panel).innerHTML = selected.map(({player,row}) => `<article><h4>${esc(player.name)}</h4>${row ? `<p>Season ending ${esc(row.seasonEnds.join(', '))} · ${esc(row.clubs.join(', '))}</p><dl><div><dt>Goals</dt><dd>${esc(row.goals === null ? 'N/A' : integer(row.goals))}</dd></div><div><dt>Assists</dt><dd>${esc(row.assists === null ? 'N/A' : integer(row.assists))}</dd></div><div><dt>Minutes</dt><dd>${esc(row.minutes === null ? 'N/A' : integer(row.minutes))}</dd></div></dl><small>${esc(row.nineties === null ? 'No recorded 90s' : `${row.nineties.toFixed(1)} full-match equivalents`)} · ${esc(row.competitions.join(', '))}</small>` : `<p>No saved club-league season at age ${age}.</p>`}</article>`).join('');
      $('#player-explanation',panel).textContent = selected.some(item => item.value === null) ? 'One or more selected values are unavailable in the saved archive. Choose another age or player to compare covered seasons.' : 'Both values come from recorded seasons at the same age. The cards show the playing time and totals behind the comparison; they do not establish an overall player ranking.';
    }
    ['#player-first','#player-second','#player-measure'].forEach(field => $(field,panel).addEventListener('change',update));
    $('#player-age',panel).addEventListener('input',update);
    update();
  }
  function renderLiveApp(id) {
    const project = projects.find(item => item.id === id);
    panel.innerHTML = titleRow(project.title, id === 'watch' ? 'Explore the collection, change a watchmaker, and follow a chart into the catalog.' : 'Name a country, practise a capital, or start a solo geography challenge.', 'Public live app') + `<div class="live-preview" id="live-preview"><img src="${esc(project.images[0].preview || project.images[0].src)}" alt="${esc(project.images[0].alt)}"><div class="live-preview-overlay"><h4>${esc(project.title)}</h4><p>${id === 'watch' ? 'A live interface using the archived 2023–2024 watch collection.' : 'The geography arcade, running from its public deployment.'}</p><button class="button" type="button" id="load-live-app">Load the live app <span aria-hidden="true">↗</span></button></div></div><div class="live-link-row"><span id="live-app-status" role="status">Loads only when you choose.</span>${external(project.liveUrl, 'Open full screen')}</div><p class="demo-provenance">${esc(project.limitation)} If embedding is unavailable in your browser, the full-screen link opens the same app.</p>`;
    $('#load-live-app',panel).addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.title = `${project.title} public live application`;
      iframe.src = project.liveUrl;
      iframe.loading = 'eager';
      iframe.allow = 'fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      $('#live-preview',panel).replaceChildren(iframe);
      const status = $('#live-app-status',panel);
      status.textContent = 'Loading the public application…';
      iframe.addEventListener('load', () => {status.textContent = 'Live app loaded. Use the full-screen link for more room.';});
    });
  }

  function renderActivity() {
    if (!$('#activity-feed')) return;
    $('#activity-feed').innerHTML = projects.map(project => {
      const latest = activity[project.id];
      const newer = latest && latest.sha !== project.snapshotCommit;
      const message = latest?.message || (project.private ? 'Local working-tree preview · source repository private' : project.snapshotMessage);
      const date = latest?.date || (project.private && project.workingTreeChanges ? project.capturedOn : project.snapshotDate);
      const sha = latest?.sha || project.snapshotCommit;
      const link = `${project.sourceUrl}/commit/${sha}`;
      return `<div class="activity-row"><div><strong>${esc(project.title)}</strong><span>${project.private ? 'Private source · local snapshot' : latest ? 'GitHub · ' : 'Reviewed source · '}${project.private ? '' : esc(sha.slice(0,7))}</span></div><div class="activity-message">${project.private ? esc(message) : `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(message)} ↗</a>`}${newer ? '<br><span class="activity-new">Newer code available · previews show the reviewed version</span>' : ''}</div><div class="activity-date">${esc(dateLabel(date))}</div></div>`;
    }).join('');
    $('#activity-feed').setAttribute('aria-busy','false');
  }
  async function refreshActivity(force = false) {
    if(refreshing || !projects.length || !$('#activity-feed') || !$('#activity-status')) return;
    const now = Date.now();
    if(!force && now - lastActivityCheck < 600000) return;
    if(force && now - lastActivityCheck < 30000) {
      $('#activity-status').textContent = 'Just checked. Please wait a moment before refreshing.';
      return;
    }
    refreshing = true;
    const button = $('#refresh-activity');
    if (button) button.disabled = true;
    $('#activity-status').textContent = 'Checking public repository activity…';
    const publicProjects = projects.filter(project => !project.private);
    const results = await Promise.allSettled(publicProjects.map(async project => {
      const response = await fetch(`https://api.github.com/repos/AarunabhS/${encodeURIComponent(project.repo)}/commits?per_page=1`, {headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(8000)});
      if(!response.ok) throw new Error('Public repository unavailable');
      const [commit] = await response.json();
      if(!commit || !/^[a-f0-9]{40}$/.test(commit.sha) || !commit.commit?.message || !commit.commit?.committer?.date) throw new Error('Invalid commit response');
      return [project.id,{sha:commit.sha,message:commit.commit.message.split('\n')[0],date:commit.commit.committer.date}];
    }));
    let successes = 0;
    results.forEach(result => {if(result.status === 'fulfilled') {activity[result.value[0]] = result.value[1]; successes++;}});
    lastActivityCheck = Date.now();
    const time = new Date(lastActivityCheck).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    $('#activity-status').textContent = successes === publicProjects.length ? `Public sources checked at ${time}` : successes ? `${successes}/${publicProjects.length} sources checked · other rows retain their last known version` : 'GitHub unavailable · showing last known source versions';
    try {sessionStorage.setItem('portfolio-activity-v1',JSON.stringify({activity,checkedAt:lastActivityCheck,allSucceeded:successes === publicProjects.length}));} catch {}
    renderActivity();
    refreshing = false;
    if (button) button.disabled = false;
  }

  document.addEventListener('click', event => {
    const projectButton = event.target.closest('[data-project]');
    if(projectButton) openProject(projectButton.dataset.project,projectButton);
    const demoButton = event.target.closest('[data-open-demo]');
    if(demoButton) {
      const targetTab = $(`#tab-${demoButton.dataset.openDemo}`);
      if(dialog?.open) dialogOpener = targetTab;
      closeDialog();
      showDemo(demoButton.dataset.openDemo);
      targetTab?.focus({preventScroll:true});
      $('#playground')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
    if(event.target.closest('[data-retry-demo]')) showDemo(activeDemo);
  });
  $$('.filter').forEach(button => button.addEventListener('click', () => {
    $$('.filter').forEach(filter => {const selected = filter === button;filter.classList.toggle('active',selected);filter.setAttribute('aria-pressed',String(selected));});
    renderProjects(button.dataset.filter);
  }));
  $$('.lab-tabs [role=tab]').forEach(tab => {
    tab.addEventListener('click', () => showDemo(tab.dataset.demo));
    tab.addEventListener('keydown', event => {
      const tabs = $$('.lab-tabs [role=tab]');
      const index = tabs.indexOf(tab);
      const next = event.key === 'ArrowRight' ? (index+1)%tabs.length : event.key === 'ArrowLeft' ? (index+tabs.length-1)%tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : -1;
      if(next !== -1) {event.preventDefault();tabs[next].focus();showDemo(tabs[next].dataset.demo);}
    });
  });
  $('.menu-toggle')?.addEventListener('click', () => {
    const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true';
    $('.menu-toggle').setAttribute('aria-expanded',String(open));
    $('#site-nav')?.classList.toggle('is-open',open);
  });
  $$('#site-nav a').forEach(link => link.addEventListener('click', () => {$('#site-nav')?.classList.remove('is-open');$('.menu-toggle')?.setAttribute('aria-expanded','false');}));
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && $('#site-nav')?.classList.contains('is-open')) {
      $('#site-nav').classList.remove('is-open');
      $('.menu-toggle')?.setAttribute('aria-expanded','false');
      $('.menu-toggle')?.focus();
    }
  });
  $('#refresh-activity')?.addEventListener('click', () => refreshActivity(true));
  if ($('#year')) $('#year').textContent = String(new Date().getFullYear());

  (async () => {
    try {
      const manifest = await getJSON('data/projects.json');
      projects = manifest.projects;
      renderProjects();
      try {
        const cached = JSON.parse(sessionStorage.getItem('portfolio-activity-v1'));
        if(cached?.activity && cached.checkedAt && Date.now() - cached.checkedAt < 600000) {
          activity = cached.activity;lastActivityCheck = cached.checkedAt;
          if ($('#activity-status')) $('#activity-status').textContent = cached.allSucceeded ? `Last checked at ${new Date(cached.checkedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Last known source activity · some sources were unavailable';
        }
      } catch {}
      renderActivity();
      const requested = new URLSearchParams(location.search).get('project');
      const initialProject = projects.find(project => project.id === requested || project.demo === requested);
      await showDemo(initialProject?.demo || 'fraud');
      if (document.body.dataset.page === 'lab' && initialProject) {
        await document.fonts?.ready;
        $('#playground')?.scrollIntoView({behavior:'instant',block:'start'});
      }
      if ($('#activity-feed')) {
        refreshActivity();
        setInterval(() => {if(!document.hidden) refreshActivity();},600000);
        document.addEventListener('visibilitychange', () => {if(!document.hidden) refreshActivity();});
      }
    } catch {
      if ($('#project-grid')) {
        $('#project-grid').innerHTML = '<p class="loading-note">The project collection could not load. Please reload the page or explore <a href="https://github.com/AarunabhS" target="_blank" rel="noopener noreferrer">the GitHub profile</a>.</p>';
        $('#project-grid').setAttribute('aria-busy','false');
      }
      $('#activity-feed')?.setAttribute('aria-busy','false');
      if (panel) {
        panel.setAttribute('aria-busy','false');
        panel.innerHTML = '<p class="loading-note">Interactive previews are unavailable. The <a href="https://www.arunabhosom.com/watch-atlas/" target="_blank" rel="noopener noreferrer">Watch Atlas</a> and <a href="https://www.arunabhosom.com/country-memory-map/" target="_blank" rel="noopener noreferrer">Country Memory Map</a> public apps can still be opened directly.</p>';
      }
    }
  })();
})();
