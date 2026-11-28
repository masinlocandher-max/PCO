const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
(async () => {
  const port = 8767;
  const url = "http://127.0.0.1:" + port;
  const server = spawn("python3", ["-u", "-m", "http.server", String(port), "--bind", "127.0.0.1"], {stdio:["ignore","pipe","ignore"]});
  let browser;
  try {
    await once(server.stdout, "data");
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH, args:["--no-sandbox"]});
    for (const width of [320,390,1440]) {
      const context = await browser.newContext({viewport:{width,height:850}, reducedMotion:"reduce"});
      const page = await context.newPage();
      const errors = [], requests = [];
      let rejectLastOnce = true;
      page.on("pageerror", e => errors.push(e.message));
      await page.route("**/functions/v1/book-public-reader", async route => {
        const body = route.request().postDataJSON();
        requests.push(body);
        if (body.action === "contents") return route.fulfill({json:{chapters:[{sequence:1,title:"First sample"},{sequence:3,title:"Final sample"}]}});
        if (body.sequence === 3 && rejectLastOnce) {rejectLastOnce = false; return route.fulfill({status:503,json:{}});}
        await route.fulfill({json:{chapter:{sequence:body.sequence,body: body.sequence === 1 ? "First story.\n\nSecond paragraph." : "<img src=x onerror=alert(1)> Final story."}}});
      });
      await page.goto(url + "/book/");
      assert.match(await page.locator("#buyPocketbook").getAttribute("href"),/^mailto:/);
      const heroRead = page.locator(".hero-buy");
      assert.equal(await heroRead.getAttribute("href"),"/book/read/");
      await page.locator(".hero-preview").click();
      await page.waitForURL("**/book/reader.html");
      const preview = page.locator(".unlock-card");
      assert.match(await preview.innerText(),/No account or payment needed/);
      assert.doesNotMatch(await preview.innerText(),/499|activated/i);
      assert.equal(await preview.getByRole("link",{name:"access support"}).getAttribute("href"),"/ebook-access/");
      await preview.getByRole("link",{name:"Read the Ebook Free"}).click();
      await page.getByRole("heading", {name:"First sample"}).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      assert.equal(await page.evaluate(() => {
        const selection = getSelection();
        selection.selectAllChildren(document.querySelector("#prose"));
        return document.dispatchEvent(new ClipboardEvent("copy",{bubbles:true,cancelable:true}));
      }), false);
      assert.equal(await page.evaluate(() => {
        getSelection().removeAllRanges();
        return document.querySelector(".mast").dispatchEvent(new ClipboardEvent("copy",{bubbles:true,cancelable:true}));
      }), true);
      await page.getByRole("button",{name:"Next"}).click();
      await page.getByRole("button",{name:"Try again"}).click();
      await page.getByRole("heading",{name:"Final sample"}).waitFor();
      assert.match(await page.locator("#prose").innerText(), /<img src=x/);
      assert.equal(await page.locator("#prose img").count(),0);
      assert.equal(await page.locator("#prose").getByText("First story.").count(),0);
      assert.equal(await page.evaluate(() => document.activeElement.id),"heading");
      assert.deepEqual(await page.evaluate(() => Object.entries(localStorage)),[["trwtl.public.sequence","3"]]);
      await page.reload();
      await page.getByRole("heading",{name:"Final sample"}).waitFor();
      await page.emulateMedia({media:"print"});
      assert.equal(await page.locator("#chapter").isVisible(),false);
      assert.ok(requests.every(x => Object.keys(x).every(k => k==="action"||k==="sequence")));
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log("Reader passed at 320, 390 and 1440px (synthetic data, signed out).");
  } finally { await browser?.close();server.kill(); }
})().catch(e=>{console.error(e);process.exitCode=1});
