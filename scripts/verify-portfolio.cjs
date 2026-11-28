// Requires Playwright. PORTFOLIO_CHROMIUM_PATH optionally points to a local browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const url = 'http://127.0.0.1:8766';
const server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1', '--directory', resolve(__dirname, '..')], {stdio:'ignore'});

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ executablePath:process.env.PORTFOLIO_CHROMIUM_PATH || undefined, args:['--no-sandbox', '--no-proxy-server'] });
    const context = await browser.newContext({reducedMotion:'reduce'});
    await context.addInitScript(() => {
      window.__portfolioPrintCalls = 0;
      window.print = () => { window.__portfolioPrintCalls += 1; };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(url) && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    for (const width of [1440,1024,820,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.goto(url);
      assert.equal(await page.locator('#routeTitle').isVisible(),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      assert.equal(await page.locator('.gold-wordmark').innerText(),'FMB');
      assert.equal(await page.locator('.gold-editorial-rows article').count(),2);
      assert.equal(await page.locator('.gold-shot').count(),6);
      assert.deepEqual(await page.locator('#main-content > :is(section,details)').evaluateAll(nodes => nodes.map(node => node.id || node.getAttribute('aria-labelledby'))),
        ['practice','selected-work','about','publishing-title','ecosystemTitle','more-work','consult']);
      assert.equal(await page.locator('#about h2').isVisible(),true);
      assert.equal(await page.locator('.gold-case-grid a').count(),2);
      const ecosystemLogos = page.locator('section[aria-labelledby="ecosystemTitle"] .gold-brand-row');
      assert.equal(await ecosystemLogos.locator(':scope > a').count(), 5);
      assert.equal(await ecosystemLogos.locator('img').count(), 4);
      assert.equal(await ecosystemLogos.isVisible(), true);
      for (const logo of await ecosystemLogos.locator('img').all()) {
        assert.ok(await logo.evaluate(img => img.decode().then(() => img.naturalWidth > 0)));
      }
      assert.equal(await page.locator('#more-work').evaluate(el => el.open),false);
      await page.locator('.gold-case-grid a').first().click();
      await page.waitForURL('**/portfolio/#social-branding');
      await page.goto(url + '/#ecosystem');
      assert.equal(await page.locator('#more-work').evaluate(el => el.open),true);
      assert.equal(await page.locator('#ecosystem').isVisible(),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      await page.locator('.gold-track').scrollIntoViewIfNeeded();
      await page.locator('[data-next]').click();
      await page.waitForFunction(() => document.querySelector('.gold-track').scrollLeft > 0);
      await page.locator('[data-prev]').click();
      await page.waitForFunction(() => document.querySelector('.gold-track').scrollLeft === 0);
      await page.locator('.gold-work-intro a').click();
      await page.waitForURL('**/portfolio/');
      assert.equal(await page.locator('#social-branding').isVisible(),true);
      assert.equal(await page.locator('#media-communications').isVisible(),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      await page.goto(url + '/#service-ai');
      assert.equal(await page.locator('#service-ai').isVisible(),true);
      await page.goto(url);
      await page.locator('.gold-menu summary').click();
      assert.equal(await page.locator('.gold-menu nav').isVisible(),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.gold-menu nav').isVisible(),false);
      await page.locator('.gold-hero a[href="/book-a-call/"]').click();
      await page.waitForURL('**/book-a-call/');
      assert.equal(await page.locator('#call-picker').isVisible(),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      await page.locator('#call-days button:not([disabled])').first().click();
      assert.match(await page.locator('#call-email').getAttribute('href'),/^mailto:withlovefmb@gmail\.com.*body=/);
      await page.goto(url);
      await page.locator('#about a[href="#cv"]').first().click();
      await page.waitForURL('**/#cv');
      await page.locator('.topbar a[href="#education"]').click();
      await page.waitForURL('**/#education');
      assert.equal(await page.locator('#education').isVisible(),true);
      assert.equal(await page.locator('#routeGate').evaluate(el => el.hidden),true);
      await page.locator('.topbar .mark').click();
      await page.waitForURL('**/#portfolio');
      assert.equal(await page.locator('.gold-home').isVisible(),true);
      await page.locator('[data-print-cv]').click();
      await page.waitForURL('**/#cv');
      await page.waitForFunction(() => window.__portfolioPrintCalls === 1);
      assert.equal(await page.locator('#heroTitle').isVisible(),true);
      await page.locator('.topbar .mark').click();
      await page.waitForURL('**/#portfolio');
      assert.equal(await page.locator('#podcast a').getAttribute('href'),'https://www.youtube.com/@madebyfmb');
      await page.locator('#writing a').click();
      await page.waitForURL('**/book/');
      assert.equal(await page.locator('#buyEbook').count(),1);
      assert.equal(await page.locator('#buyPocketbook').count(),1);
      console.log('PASS',width,'px: no horizontal overflow, homepage order, work links, archive, menu, calendar, CV and print, podcast, book');
    }
    if (process.env.FMB_QA_SCREENSHOTS) {
      for (const width of [390,820,1440]) {
        await page.setViewportSize({width,height:900});
        await page.goto(url);
        await page.screenshot({ path: process.env.FMB_QA_SCREENSHOTS + '/home-' + width + '.png', fullPage:true });
      }
    }
    await page.goto(url + '/cv.html');
    await page.waitForURL('**/#cv');
    assert.equal(await page.locator('#heroTitle').isVisible(),true);
    await page.goto(url);
    await page.locator('.gold-footer').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.gold-hero-photo img').evaluate(img => img.decode().then(() => img.naturalWidth)),626);
    assert.deepEqual(errors,[]);
    console.log('PASS: compatibility CV route, portrait decode and no browser errors');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
