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
    for (const width of [1440,1024,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.goto(url);
      assert.equal(await page.locator('#routeTitle').isVisible(),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      assert.equal(await page.locator('.gold-services a').count(),5);
      assert.equal(await page.locator('.gold-shot').count(),6);
      await page.locator('.gold-track').scrollIntoViewIfNeeded();
      await page.locator('[data-next]').click();
      await page.waitForFunction(() => document.querySelector('.gold-track').scrollLeft > 0);
      await page.locator('[data-prev]').click();
      await page.waitForFunction(() => document.querySelector('.gold-track').scrollLeft === 0);
      await page.locator('.gold-work-intro a').click();
      await page.waitForURL('**/#full-portfolio');
      assert.equal(await page.locator('#full-portfolio').isVisible(),true);
      await page.goto(url + '/#service-ai');
      assert.equal(await page.locator('#service-ai').isVisible(),true);
      await page.goto(url);
      await page.locator('.gold-menu summary').click();
      assert.equal(await page.locator('.gold-menu nav').isVisible(),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.gold-menu nav').isVisible(),false);
      await page.locator('.gold-hero [data-appointment]').click();
      await page.waitForURL('**/#consult');
      assert.equal(await page.locator('#booking-panel').evaluate(el => el.open),true);
      assert.equal(await page.locator('.fmb-request').evaluate(el => el.open),true);
      assert.equal(await page.locator('.pf-slot').count(),4);
      assert.match(await page.locator('.pf-slot').last().getAttribute('href'),/calendar\.google\.com/);
      assert.match(await page.locator('.fmb-email').getAttribute('href'),/^mailto:withlovefmb@gmail\.com/);
      await page.locator('.gold-cv-nav a[href="#education"]').click();
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
      assert.match(await page.locator('#podcast a').getAttribute('href'),/^https:\/\/www\.youtube\.com\/@francinemariebautista/);
      await page.locator('#writing a').click();
      await page.waitForURL('**/book/');
      assert.equal(await page.locator('#buyEbook').count(),1);
      assert.equal(await page.locator('#buyPocketbook').count(),1);
      console.log('PASS',width,'px: no horizontal overflow, carousel, details, menu, booking links, CV sections and print, podcast link, book storefront');
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
