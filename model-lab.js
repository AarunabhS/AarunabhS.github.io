/* Recorded model evidence only: no service, fabricated inference, or row text. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => `${(Number(value) * 100).toFixed(1)}%`;
const integer = value => Number(value).toLocaleString('en-US');
const metric = (label, value, note) => `<div class="demo-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></div>`;
const titleRow = (title, description) => `<div class="lab-title-row"><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div><span class="data-badge">Recorded benchmark · phase two</span></div>`;
const source = (data, file, label) => `<a class="text-link" href="${esc(data.sourceUrl)}/blob/${esc(data.source_commit)}/${esc(data.sourcePath)}/${esc(file)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;

function renderSentiment(data, panel) {
  const $ = selector => panel.querySelector(selector);
  panel.innerHTML = titleRow('Same model. Different kinds of language.', 'Explore the human-labelled classes, then compare saved predictions on six authored examples.') +
    `<div class="demo-layout model-explorer"><div class="demo-controls"><label for="sentiment-class">Human-labelled class</label><select id="sentiment-class">${data.classes.map(row => `<option value="${esc(row.label)}">${esc(row.label[0].toUpperCase()+row.label.slice(1))}</option>`).join('')}</select><p class="control-explainer">How often does the model recognise this class? Every count comes from the complete 12,284-post official test set.</p><label for="sentiment-example">Try a saved language example</label><select id="sentiment-example">${['Clear praise','An ordinary statement','Clear criticism','Mixed sentiment','Negation','Sarcasm'].map((label,index) => `<option value="${index}">${label}</option>`).join('')}</select><p class="control-explainer">These authored sentences were scored with the repository’s real model. Choosing one loads its recorded output.</p></div><div class="demo-viz"><div id="sentiment-metrics" class="metric-grid" role="status" aria-live="polite"></div><h4 id="sentiment-class-heading"></h4><div id="sentiment-class-bar" class="policy-bar" role="img"></div><div class="chart-legend"><span><i></i>Correct class</span><span><i class="missed"></i>Other prediction</span></div><div class="saved-example"><div class="saved-example-header"><span class="eyebrow">A closer look at the language</span><span class="data-badge">Saved model output</span></div><blockquote id="sentiment-sentence"></blockquote><div class="sentiment-score-bars" id="sentiment-scores" role="status" aria-live="polite"></div><p class="result-explanation" id="sentiment-example-note"></p></div></div></div><p class="demo-provenance">Selected on validation macro F1; test accuracy ${percent(data.metrics.accuracy)} and macro F1 ${data.metrics.macro_f1.toFixed(4)}. Historical social posts are a general sentiment benchmark. They do not measure present-day customer opinion. Saved examples are illustrative, outside the test-set metrics. ${source(data,'REPORT.md','Read the evaluation')}</p>`;
  function updateClass() {
    const row = data.classes.find(item => item.label === $('#sentiment-class').value);
    const recall = row.correct / row.support;
    $('#sentiment-metrics').innerHTML = metric('Class recall', percent(recall), `human label: ${row.label}`) + metric('Correct classifications', integer(row.correct), `of ${integer(row.support)} ${row.label} posts`) + metric('Other predictions', integer(row.support-row.correct), 'errors remain visible');
    $('#sentiment-class-heading').textContent = `Of the ${integer(row.support)} human-labelled ${row.label} posts`;
    $('#sentiment-class-bar').innerHTML = `<div style="width:${recall*100}%"></div><div class="missed" style="width:${(1-recall)*100}%"></div>`;
    $('#sentiment-class-bar').setAttribute('aria-label',`${row.correct} correctly classified and ${row.support-row.correct} classified as another sentiment`);
  }
  function updateExample() {
    const index = Number($('#sentiment-example').value);
    const example = data.examples[index];
    $('#sentiment-sentence').textContent = example.features.text;
    $('#sentiment-scores').innerHTML = ['negative','neutral','positive'].map(label => `<div class="sentiment-score-row ${label}"><span>${label}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${example.saved.scores[label]*100}%"></div></div><strong>${percent(example.saved.scores[label])}</strong></div>`).join('');
    const notes = [
      'The strongest recorded class score is positive. Clear praise is easier to recognise than ambiguous language.',
      'The strongest recorded class score is neutral. A statement can contain information without expressing an opinion.',
      'The strongest recorded class score is negative. The model recognises explicit criticism in this authored example.',
      'Positive and negative scores are close. Mixed sentiment is not a separate human-labelled class in this benchmark.',
      'The strongest recorded class score is negative. The wording changes the meaning of “good”.',
      'The model predicts positive for a sarcastic complaint. A confident class score can still be wrong; the failure is part of the evidence.'
    ];
    $('#sentiment-example-note').textContent = notes[index];
  }
  $('#sentiment-class').addEventListener('change', updateClass);
  $('#sentiment-example').addEventListener('change', updateExample);
  updateClass();
  updateExample();
}

function renderCTR(data, panel) {
  const $ = selector => panel.querySelector(selector);
  const positiveLabels = data.metrics.tp + data.metrics.fn;
  const x = value => 42 + Number(value) * 466;
  const y = value => 210 - Number(value) * 168;
  const points = [[0,0],...data.ranking.map(row => [row.selection_fraction,row.positive_capture_fraction])];
  panel.innerHTML = titleRow('How much attention can a ranking concentrate?', 'Change the share of highest-scoring contexts you select. Watch captured click labels and enrichment move together.') +
    `<div class="demo-layout model-explorer"><div class="demo-controls"><div class="range-header"><label for="ctr-selection">Highest-scoring selection</label><output for="ctr-selection" id="ctr-selection-value"></output></div><input id="ctr-selection" type="range" min="0" max="${data.ranking.length-1}" step="1" value="2"><div class="range-limits"><span>Top 1%</span><span>All contexts</span></div><p class="control-explainer">Smaller selections concentrate more of the observed click labels. Larger selections capture more labels in total.</p><div class="benchmark-baseline"><small>Benchmark reference</small><strong>${percent(data.metrics.positive_rate)}</strong><span>observed click-label rate across ${integer(data.test_rows)} test contexts</span></div><details class="saved-contexts"><summary>Inspect saved ad contexts <span aria-hidden="true">+</span></summary><div>${data.examples.map(example => `<div class="saved-context"><span>${esc(example.title)}</span><strong>${percent(example.saved.score)}</strong><small>Position ${esc(example.features.position)} of ${esc(example.features.depth)} · recorded score</small></div>`).join('')}</div><p>Unchanged examples scored by the repository model. These scores describe the sampled benchmark.</p></details></div><div class="demo-viz"><div id="ctr-metrics" class="metric-grid" role="status" aria-live="polite"></div><div class="gains-chart"><svg viewBox="0 0 540 252" role="img" aria-labelledby="ctr-chart-title ctr-chart-desc"><title id="ctr-chart-title">Captured click labels against the fraction of contexts selected</title><desc id="ctr-chart-desc">The recorded model ranking rises above a random-ranking reference. Use the selection slider for exact observed counts.</desc><g class="gains-grid">${[0,.25,.5,.75,1].map(tick => `<line x1="42" y1="${y(tick)}" x2="508" y2="${y(tick)}"/><text x="32" y="${y(tick)+4}" text-anchor="end">${tick*100}%</text>`).join('')}</g><path class="gains-baseline" d="M42 210 L508 42"/><path class="gains-area" d="M${points.map(([a,b]) => `${x(a)} ${y(b)}`).join(' L')} L508 210 Z"/><path class="gains-curve" d="M${points.map(([a,b]) => `${x(a)} ${y(b)}`).join(' L')}"/><line class="gains-guide" id="ctr-chart-guide" x1="0" y1="0" x2="0" y2="210"/><circle class="gains-point-halo" id="ctr-chart-halo" r="12" cx="0" cy="0"/><circle class="gains-point" id="ctr-chart-point" r="5" cx="0" cy="0"/><text x="42" y="232">0%</text><text x="275" y="232" text-anchor="middle">Contexts selected</text><text x="508" y="232" text-anchor="end">100%</text></svg></div><div class="chart-legend"><span><i></i>Recorded model ranking</span><span><i class="missed"></i>Random ranking reference</span></div><p class="result-explanation" id="ctr-explanation"></p></div></div><p class="demo-provenance">The source has downsampled negatives, so neither these scores nor these observed rates estimate population CTR. The ${integer(data.test_rows)}-row test partition contains ${integer(positiveLabels)} observed click labels. Enrichment is a ranking comparison in that sampled cohort; it is not measured campaign uplift. ${source(data,'ranking_lift.csv','Inspect the recorded gains')}</p>`;
  const slider = $('#ctr-selection');
  function update() {
    const row = data.ranking[Number(slider.value)];
    $('#ctr-selection-value').textContent = `Top ${row.selection_fraction*100}%`;
    slider.setAttribute('aria-valuetext',`Top ${row.selection_fraction*100}% of benchmark contexts`);
    $('#ctr-metrics').innerHTML = metric('Enrichment', `${row.lift.toFixed(2)}×`, 'versus the full sampled test set') + metric('Click labels captured', integer(row.positives_captured), `${percent(row.positive_capture_fraction)} of observed labels`) + metric('Contexts selected', integer(row.rows), `top ${row.selection_fraction*100}% by score`);
    const cx = x(row.selection_fraction), cy = y(row.positive_capture_fraction);
    ['#ctr-chart-point','#ctr-chart-halo'].forEach(selector => {$(selector).setAttribute('cx',cx);$(selector).setAttribute('cy',cy);});
    $('#ctr-chart-guide').setAttribute('x1',cx);
    $('#ctr-chart-guide').setAttribute('x2',cx);
    $('#ctr-chart-guide').setAttribute('y1',cy);
    $('#ctr-explanation').textContent = `${integer(row.rows)} highest-scoring contexts contain ${integer(row.positives_captured)} of ${integer(positiveLabels)} observed click labels. Their ${percent(row.observed_rate)} label rate is ${row.lift.toFixed(2)} times the ${percent(data.metrics.positive_rate)} sampled baseline. ${integer(positiveLabels-row.positives_captured)} click labels remain outside this selection.`;
  }
  slider.addEventListener('input',update);
  update();
}

export function renderModelExplorer(id, data, project, panel) {
  if (!project || !panel) throw new Error('Missing model explorer context');
  if (id === 'sentiment') renderSentiment(data,panel);
  else if (id === 'ctr') renderCTR(data,panel);
  else throw new Error('Unknown model explorer');
}
