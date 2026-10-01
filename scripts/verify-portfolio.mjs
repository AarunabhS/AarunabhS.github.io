// Static portfolio regression checks. Public apps remain opt-in and unrequested.
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-portfolio.mjs http://127.0.0.1:4310
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2] || 'http://127.0.0.1:4310';
const manifest=JSON.parse(await readFile(join(root,'data/projects.json'),'utf8'));
const stories=JSON.parse(await readFile(join(root,'data/case-studies.json'),'utf8'));
const url=path=>new URL(path,`${base.replace(/\/$/,'')}/`).href;
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];
const localFailures=[];
let backendRequests=0;
const observe=target=>{
  target.on('pageerror',error=>errors.push(error.message));
  target.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)localFailures.push(`${response.status()} ${response.url()}`);});
  target.on('request',request=>{if(/\/v1\/(health|predict)/.test(request.url()))backendRequests++;});
};
context.on('page',observe);
observe(page);
await context.route('https://api.github.com/**',route=>route.fulfill({status:403,contentType:'application/json',body:'{"message":"Rate limit exceeded"}'}));
await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
const ready=async target=>target.locator('#lab-panel[aria-busy="false"]').waitFor();
const selectDemo=async (target,id)=>{await target.locator(`#tab-${id}`).click();await ready(target);};
const noOverflow=async (target,label)=>{
  const dimensions=await target.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(dimensions.content<=dimensions.viewport,`${label}: ${dimensions.content}px content exceeds ${dimensions.viewport}px viewport`);
};
try {
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.project-card').last().waitFor();
  assert.equal(await page.locator('.project-card').count(),9);
  assert.equal(await page.locator('.lab-tabs [role="tab"]').count(),9);
  assert.equal(await page.locator('.activity-row').count(),9);
  assert.equal(await page.locator('iframe').count(),0,'Public apps must load only on request');
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  for(const [filter,count] of [['interactive',3],['ai',5],['analytics',1],['all',9]]) {
    await page.locator(`[data-filter="${filter}"]`).click();
    assert.equal(await page.locator('.project-card').count(),count);
  }
  for(const project of manifest.projects) {
    assert.equal(await page.locator(`.project-card[data-id="${project.id}"] a[href^="case-study.html"]`).getAttribute('href'),`case-study.html?project=${project.id}`);
    await page.locator(`.project-card[data-id="${project.id}"] .project-visual`).click();
    assert.equal(await page.locator('#dialog-title').innerText(),project.title);
    assert.equal(await page.locator('.dialog-gallery img').count(),project.images.length);
    await page.locator('.dialog-gallery img').evaluateAll(async images=>{for(const image of images){image.loading='eager';await image.decode();}});
    if(project.private) assert.equal(await page.locator('#project-dialog a[href*="github.com"]').count(),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#project-dialog').evaluate(dialog=>dialog.open),false);
  }
  // Frozen policy outputs are checked against the independently published counts.
  await page.locator('#tab-fraud').click();
  await page.locator('#review-budget').waitFor();
  assert.deepEqual(await page.locator('#policy-metrics strong').allTextContents(),['56','13','18']);
  await page.locator('#review-budget').fill('6');
  assert.deepEqual(await page.locator('#policy-metrics strong').allTextContents(),['66','5,963','8']);
  await page.locator('#tab-churn').click();
  await page.locator('#review-budget').waitFor();
  assert.deepEqual(await page.locator('#policy-metrics strong').allTextContents(),['376','94','22']);
  // Human-labelled class counts and real saved language predictions.
  await selectDemo(page,'sentiment');
  assert.deepEqual(await page.locator('#sentiment-metrics strong').allTextContents(),['39.1%','1,553','2,419']);
  await page.locator('#sentiment-class').selectOption('neutral');
  assert.deepEqual(await page.locator('#sentiment-metrics strong').allTextContents(),['70.0%','4,158','1,779']);
  await page.locator('#sentiment-class').selectOption('positive');
  assert.deepEqual(await page.locator('#sentiment-metrics strong').allTextContents(),['60.4%','1,435','940']);
  await page.locator('#sentiment-example').selectOption('5');
  assert.equal(await page.locator('#sentiment-sentence').innerText(),'I love how this stopped working after one day.');
  assert.deepEqual(await page.locator('#sentiment-scores strong').allTextContents(),['7.2%','5.6%','87.2%']);
  assert.match(await page.locator('#sentiment-example-note').innerText(),/confident class score can still be wrong/);
  await selectDemo(page,'ctr');
  assert.deepEqual(await page.locator('#ctr-metrics strong').allTextContents(),['1.93×','269','799']);
  await page.locator('#ctr-selection').fill('0');
  assert.deepEqual(await page.locator('#ctr-metrics strong').allTextContents(),['3.52×','49','80']);
  await page.locator('#ctr-selection').fill('5');
  assert.deepEqual(await page.locator('#ctr-metrics strong').allTextContents(),['1.00×','1,391','7,984']);
  assert.equal(await page.locator('#ctr-chart-point').getAttribute('cx'),'508');
  // City aggregates agree with the CSV exported by the original Python analysis.
  await page.locator('#tab-agoda').click();
  await page.locator('#booking-city').waitFor();
  assert.equal(await page.locator('#booking-metrics strong').first().innerText(),'1,000');
  const csv=(await readFile(join(root,'data/agoda-cities.csv'),'utf8')).trim().split('\n');
  const cityA=csv.find(line=>line.startsWith('City_A,')).split(',');
  await page.locator('#booking-city').selectOption('City_A');
  assert.equal(await page.locator('#booking-metrics strong').first().innerText(),cityA[1]);
  assert.equal(await page.locator('#booking-metrics strong').nth(1).innerText(),`$${Number(cityA[2]).toFixed(2)}`);
  await page.locator('#booking-group').selectOption('lead_time_bucket');
  assert.equal(await page.locator('#booking-chart .bar-chart-row').count(),6);
  await page.locator('#booking-measure').selectOption('adr');
  assert.match(await page.locator('#booking-chart-title').innerText(),/USD/);
  await page.locator('#tab-talent').click();
  await page.locator('#talent-company').waitFor();
  assert.equal(await page.locator('#talent-metrics strong').first().innerText(),'60');
  await page.locator('#talent-company').selectOption('Northstar Analytics');
  assert.equal(await page.locator('#talent-metrics strong').first().innerText(),'15');
  await page.locator('#talent-market').selectOption('Canada');
  assert.equal(await page.locator('#talent-metrics strong').first().innerText(),'5');
  // Match the original PlayerPulse age-24 comparison, including unavailable ages.
  await page.locator('#tab-playerpulse').click();
  await page.locator('#player-age').waitFor();
  assert.equal(await page.locator('#player-first option').count(),5);
  assert.deepEqual(await page.locator('#player-metrics strong').allTextContents(),['1.38','0.26','24']);
  await page.locator('#player-measure').selectOption('goals');
  assert.deepEqual(await page.locator('#player-metrics strong').allTextContents(),['50','9','24']);
  await page.locator('#player-measure').selectOption('minutes');
  assert.deepEqual(await page.locator('#player-metrics strong').allTextContents(),['3,270','3,071','24']);
  await page.locator('#player-age').fill('37');
  assert.deepEqual(await page.locator('#player-metrics strong').allTextContents(),['N/A','N/A','37']);
  await page.locator('#player-age').fill('24');
  await page.locator('#player-measure').selectOption('goals90');
  // Check embed destinations without starting external apps or room services.
  for(const id of ['watch','country']) {
    await selectDemo(page,id);
    const project=manifest.projects.find(item=>item.id===id);
    assert.equal(await page.locator('#live-preview img').count(),1);
    assert.equal(await page.locator('#live-preview iframe').count(),0);
    assert.equal(await page.locator('.live-link-row a').getAttribute('href'),project.liveUrl);
  }
  await page.locator('#tab-country').focus();
  await page.keyboard.press('ArrowRight');await ready(page);
  assert.equal(await page.locator('#tab-fraud').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');await ready(page);
  assert.equal(await page.locator('#tab-country').getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');await ready(page);
  assert.equal(await page.locator('#tab-fraud').getAttribute('aria-selected'),'true');
  assert.ok(await page.locator('#resume a[href="resume.html"]').count()>0);
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:844});
    for(const id of ['fraud','sentiment','ctr']) {
      await selectDemo(page,id);
      await noOverflow(page,`Homepage/${id}/${width}`);
    }
    if(width===390) {
      await page.evaluate(()=>scrollTo(0,0));
      await page.locator('.menu-toggle').click();
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
    }
  }
  const detail=await context.newPage();
  for(const project of manifest.projects) {
    const response=await detail.goto(url(`lab.html?project=${project.id}`),{waitUntil:'networkidle'});
    assert.equal(response.status(),200);await ready(detail);
    await detail.waitForFunction(()=>{
      const top=document.getElementById('playground').getBoundingClientRect().top;
      return scrollY>0 && top>=0 && top<=150;
    });
    assert.equal(await detail.locator(`#tab-${project.demo}`).getAttribute('aria-selected'),'true');
    assert.equal(await detail.locator('#lab-current-project').innerText(),project.title);
    assert.equal(await detail.locator('.lab-context-links a[href^="case-study"]').getAttribute('href'),`case-study.html?project=${project.id}`);
    assert.equal(await detail.locator('#activity-feed').count(),0);
    assert.equal(await detail.locator('iframe').count(),0);
  }
  for(const width of [1440,768,390,320]) {
    await detail.setViewportSize({width,height:844});
    for(const id of ['fraud','sentiment','ctr']) {
      await selectDemo(detail,id);await noOverflow(detail,`Full lab/${id}/${width}`);
    }
  }
  await detail.setViewportSize({width:1440,height:1000});
  for(const project of manifest.projects) {
    const response=await detail.goto(url(`case-study.html?project=${project.id}`),{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    await detail.locator('#case-content[aria-busy="false"]').waitFor();
    assert.equal(await detail.locator('.case-hero h1').innerText(),stories.cases[project.id].title);
    assert.equal(await detail.locator('.case-lab-button').getAttribute('href'),`lab.html?project=${project.demo}`);
    assert.ok(await detail.locator('.case-gallery img').count()>=project.images.length);
    await noOverflow(detail,`Case/${project.id}/1440`);
  }
  for(const width of [768,390,320]) {
    await detail.setViewportSize({width,height:844});await noOverflow(detail,`Case/${width}`);
  }
  const resumeResponse=await detail.goto(url('resume.html'),{waitUntil:'networkidle'});
  assert.equal(resumeResponse.status(),200);
  assert.match(await detail.locator('#resume-name').innerText(),/Arunabho\s+Kanti Som/);
  assert.equal(await detail.locator('#print-resume').count(),1);
  assert.equal(await detail.locator('.resume-page').count(),2);
  for(const width of [1440,768,390,320]) {
    await detail.setViewportSize({width,height:844});await noOverflow(detail,`Résumé/${width}`);
  }
  assert.equal(backendRequests,0,'Static explorers must not call unavailable inference services');
  assert.deepEqual(localFailures,[],'All local scripts, content and image requests must succeed');
  assert.deepEqual(errors,[],'No browser runtime errors');
  // GitHub failures retain source snapshots without calling the private repo.
  const offline=await browser.newContext({viewport:{width:1280,height:800}});
  const offlinePage=await offline.newPage();
  let privateRequests=0;
  offlinePage.on('request',request=>{if(request.url().includes('api.github.com')&&request.url().includes('PlayerPulse'))privateRequests++;});
  await offlinePage.route('https://api.github.com/**',route=>route.fulfill({status:403,contentType:'application/json',body:'{"message":"Rate limit exceeded"}'}));
  await offlinePage.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
  await offlinePage.goto(base,{waitUntil:'networkidle'});
  await offlinePage.getByText('GitHub unavailable · showing last known source versions',{exact:true}).waitFor();
  assert.equal(await offlinePage.locator('.activity-row').count(),9);
  assert.equal(privateRequests,0);
  await offline.close();
  console.log('PASS: nine projects/tabs/activity rows; filters; galleries; frozen fraud/churn counts; booking/talent/player controls; sentiment class/error evidence; CTR gains; keyboard/menu; all nine lab deep links and case studies; résumé; reduced motion; no overflow at 1440/768/390/320px; GitHub fallback; no private or inference calls.');
} finally {await context.close();await browser.close();}
