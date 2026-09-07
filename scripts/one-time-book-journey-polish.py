from pathlib import Path
import re


def append_once(path, marker, block):
    p = Path(path)
    text = p.read_text()
    if marker not in text:
        text = text.rstrip() + "\n\n" + block.strip() + "\n"
        p.write_text(text)


# LANDING: modern iOS-like entrance + broader section reveal.
book_js = Path("book/book.js")
text = book_js.read_text()
old_reveal = """  function initOffline(){if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});}\n  function initReveal(){\n    var passages=document.querySelectorAll('.passage');\n    if(!passages.length||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;\n    passages.forEach(function(el){el.setAttribute('data-reveal','');});\n    var watcher=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;entry.target.setAttribute('data-reveal','in');watcher.unobserve(entry.target);});},{rootMargin:'0px 0px -12% 0px',threshold:.15});\n    passages.forEach(function(el){watcher.observe(el);});\n  }\n"""
new_reveal = """  function initOffline(){if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});}\n  function initLaunchMotion(){\n    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.setAttribute('data-motion','ready');return;}\n    document.body.setAttribute('data-motion','boot');\n    requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.setAttribute('data-motion','ready');});});\n  }\n  function initReveal(){\n    var items=document.querySelectorAll('.book-intro .intro-copy,.product-stage,.strip-inner,.passage,.quote-inner,.purchase-main,.edition,.campaign-footer');\n    if(!items.length||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;\n    items.forEach(function(el,index){el.setAttribute('data-reveal','');el.style.setProperty('--reveal-delay',String((index%3)*55)+'ms');});\n    var watcher=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;entry.target.setAttribute('data-reveal','in');watcher.unobserve(entry.target);});},{rootMargin:'0px 0px -10% 0px',threshold:.12});\n    items.forEach(function(el){watcher.observe(el);});\n  }\n"""
if old_reveal not in text:
    raise SystemExit("book.js reveal block changed unexpectedly")
text = text.replace(old_reveal, new_reveal, 1)
old_init = """  initCheckout();\n  initNav();\n  initOffline();\n  initReveal();\n"""
new_init = """  initCheckout();\n  initNav();\n  initOffline();\n  initLaunchMotion();\n  initReveal();\n"""
if old_init not in text:
    raise SystemExit("book.js init block changed unexpectedly")
text = text.replace(old_init, new_init, 1)
book_js.write_text(text)


# LANDING COPY: remove generic self-help language without revealing the ending.
index = Path("book/index.html")
text = index.read_text()
changes = {
    "A book for a more intentional life. Ebook ₱499, printed pocketbook ₱999 with nationwide Philippine shipping.": "A candid book about choices, ambition, boundaries, money, beauty, work, service, and becoming capable. Ebook ₱499, printed pocketbook ₱999 with nationwide Philippine shipping.",
    "A gentler, stronger, more meaningful life. Ebook ₱499, printed pocketbook ₱999 with nationwide Philippine shipping.": "Not a formula. A way of thinking about the choices that build a life. Ebook ₱499, printed pocketbook ₱999 with nationwide Philippine shipping.",
    '<p class="hero-promise">A gentler, stronger,<br>more meaningful life.</p>': '<p class="hero-promise">For the things nobody<br>teaches you properly.</p>',
    "<p>Practical principles to help you live with more clarity, peace, purpose, and direction.</p>": "<p>Not a formula. A way of thinking about ambition, boundaries, money, beauty, work, service, and the choices that build a life.</p>",
    "<h2>Begin Your Journey</h2>": "<h2>Choose Your Edition</h2>",
    '<p class="purchase-kicker">Choose your edition.</p>': '<p class="purchase-kicker">Ebook or printed pocketbook.</p>',
    '<p class="edition-note">Read on your phone, offline</p>': '<p class="edition-note">Protected mobile reader access</p>',
    ">Reads without a signal</li>": ">Chapter-by-chapter secure reading</li>",
    ">Yours, and yours alone</li>": ">Access checked before every protected chapter</li>",
    "<span>A book for a more intentional you.</span>": "<span>The Right Way to Live by Francine Marie Bautista.</span>",
    '<span class="footer-motto">Live with Clarity. Live with Purpose.</span>': '<span class="footer-motto">francinemariebautista.com</span>',
}
for old, new in changes.items():
    if old in text:
        text = text.replace(old, new)
index.write_text(text)


# LANDING CSS OVERRIDES: frosted mobile chrome, dark CTAs, spring motion.
append_once(
    "book/scroll-fix.css",
    "FMB iOS-motion polish v1",
    r"""
/* FMB iOS-motion polish v1 */
.gold-button{
  background:#211a15 !important;
  color:#fffaf1 !important;
  box-shadow:0 10px 28px rgba(29,20,15,.16),inset 0 1px rgba(255,255,255,.12) !important;
  -webkit-tap-highlight-color:transparent;
}
.gold-button:hover{box-shadow:0 14px 34px rgba(29,20,15,.22),inset 0 1px rgba(255,255,255,.14) !important}
.gold-button:active,.nav-toggle:active,.book-order-actions button:active,.book-order-actions a:active{transform:scale(.972) !important}
.gold-button,.nav-toggle,.book-order-actions button,.book-order-actions a{touch-action:manipulation}

@media(max-width:860px){
  .book-nav{
    position:sticky !important;top:0;z-index:40;
    padding-top:max(12px,env(safe-area-inset-top)) !important;
    background:rgba(251,245,232,.82);
    -webkit-backdrop-filter:blur(24px) saturate(1.35);backdrop-filter:blur(24px) saturate(1.35);
    border-bottom:1px solid rgba(52,38,27,.1);
  }
}

@media(prefers-reduced-motion:no-preference){
  body[data-motion="boot"] .book-nav{opacity:0;transform:translate3d(0,-12px,0)}
  body[data-motion="boot"] .hero-portrait{opacity:0;filter:blur(10px);transform:translate3d(18px,16px,0) scale(1.035)}
  body[data-motion="boot"] .hero-copy h1 em,
  body[data-motion="boot"] .hero-copy h1>span{opacity:0;transform:translate3d(0,26px,0)}
  body[data-motion="boot"] .hero-rule,
  body[data-motion="boot"] .hero-hook,
  body[data-motion="boot"] .hero-promise,
  body[data-motion="boot"] .hero-buy{opacity:0;transform:translate3d(0,18px,0)}

  body[data-motion="ready"] .book-nav{transition:opacity .55s ease,transform .75s cubic-bezier(.16,1,.3,1)}
  body[data-motion="ready"] .hero-portrait{transition:opacity .85s ease,filter .9s ease,transform 1.05s cubic-bezier(.16,1,.3,1)}
  body[data-motion="ready"] .hero-copy h1 em,
  body[data-motion="ready"] .hero-copy h1>span,
  body[data-motion="ready"] .hero-rule,
  body[data-motion="ready"] .hero-hook,
  body[data-motion="ready"] .hero-promise,
  body[data-motion="ready"] .hero-buy{transition:opacity .6s ease,transform .9s cubic-bezier(.16,1,.3,1)}
  body[data-motion="ready"] .hero-copy h1 em{transition-delay:.08s}
  body[data-motion="ready"] .hero-copy h1>span:nth-of-type(1){transition-delay:.14s}
  body[data-motion="ready"] .hero-copy h1>span:nth-of-type(2){transition-delay:.20s}
  body[data-motion="ready"] .hero-rule{transition-delay:.28s}
  body[data-motion="ready"] .hero-hook{transition-delay:.34s}
  body[data-motion="ready"] .hero-promise{transition-delay:.40s}
  body[data-motion="ready"] .hero-buy{transition-delay:.47s}

  body.book-campaign [data-reveal]:not(.passage){opacity:0;transform:translate3d(0,20px,0) scale(.992);filter:blur(3px);transition:opacity .62s ease var(--reveal-delay,0ms),transform .82s cubic-bezier(.16,1,.3,1) var(--reveal-delay,0ms),filter .7s ease var(--reveal-delay,0ms)}
  body.book-campaign [data-reveal="in"]:not(.passage){opacity:1;transform:none;filter:none}

  .book-order-modal[data-open]{animation:fmb-backdrop-in .28s ease both}
  .book-order-modal[data-open] .book-order-card{animation:fmb-sheet-in .52s cubic-bezier(.16,1,.3,1) both}
  @keyframes fmb-backdrop-in{from{opacity:0}to{opacity:1}}
  @keyframes fmb-sheet-in{from{opacity:0;transform:translate3d(0,26px,0) scale(.985)}to{opacity:1;transform:none}}
}
""",
)


# READER: activation-neutral preview copy, chapter navigation and final FMB note.
reader_js = Path("book/reader.js")
text = reader_js.read_text()
marker = "  function markActive(sequence){document.querySelectorAll('.toc-item').forEach(function(x){x.classList.toggle('is-active',Number(x.dataset.readerSequence)===Number(sequence));});}\n"
if marker not in text:
    raise SystemExit("reader.js markActive block changed unexpectedly")
helpers = marker + r'''  function readableRows(){return manifest.filter(function(row){return row&&row.kind!=='part';});}
  function appendReaderEndNote(sequence){
    var rows=readableRows();if(!rows.length||Number(rows[rows.length-1].sequence)!==Number(sequence))return;
    var note=document.createElement('section');note.className='reader-end-note';note.setAttribute('aria-label','A note from FMB');
    note.innerHTML='<span class="reader-end-kicker">A note from FMB</span><h2>Thank you for staying until the last page.</h2><p>I wrote this book from the life I have lived so far, including the decisions I am proud of and the ones that taught me the hard way. Keep what helps you. Question what does not. Change your mind when life gives you a better answer.</p><p>Whatever you build from here, I hope it feels true to you even when nobody is watching.</p><p class="reader-end-signoff">With love,<br><strong>FMB</strong></p>';
    readerDoc.appendChild(note);
  }
  function appendChapterNavigation(sequence){
    var rows=readableRows(),index=rows.findIndex(function(row){return Number(row.sequence)===Number(sequence);});if(index<0)return;
    var nav=document.createElement('nav');nav.className='reader-chapter-nav';nav.setAttribute('aria-label','Chapter navigation');
    if(index>0){var prev=document.createElement('button');prev.type='button';prev.className='reader-nav-button reader-nav-secondary';prev.innerHTML='<span>Previous</span><strong>'+cleanTitle(String(rows[index-1].title||'').replace(/^\d{2}\.\s*/,''))+'</strong>';prev.addEventListener('click',function(){openChapter(rows[index-1].sequence,0);});nav.appendChild(prev);}
    if(index<rows.length-1){var next=document.createElement('button');next.type='button';next.className='reader-nav-button reader-nav-primary';next.innerHTML='<span>Next</span><strong>'+cleanTitle(String(rows[index+1].title||'').replace(/^\d{2}\.\s*/,''))+'</strong>';next.addEventListener('click',function(){openChapter(rows[index+1].sequence,0);});nav.appendChild(next);}else{var contents=document.createElement('button');contents.type='button';contents.className='reader-nav-button reader-nav-primary';contents.innerHTML='<span>Finished</span><strong>Return to contents</strong>';contents.addEventListener('click',function(){var button=document.getElementById('tocBtn');if(button)button.click();});nav.appendChild(contents);}
    readerDoc.appendChild(nav);
  }
'''
text = text.replace(marker, helpers, 1)

start = text.find("  function renderChapter(chapter,wm,restorePercent){")
end = text.find("  async function openChapter(sequence,restorePercent){", start)
if start < 0 or end < 0:
    raise SystemExit("reader.js renderChapter block not found")
new_render = r'''  function renderChapter(chapter,wm,restorePercent){
    if(!readerDoc||!chapter)return;
    readerDoc.classList.remove('reader-enter');readerDoc.innerHTML='';
    var meta=document.createElement('span');meta.className='chapter-meta';meta.textContent=chapter.kind==='chapter'?'Chapter':'The Right Way to Live';
    var h=document.createElement('h1');h.id='chapterTitle';h.textContent=cleanTitle(String(chapter.title||'').replace(/^\d{2}\.\s*/,''));
    var rule=document.createElement('span');rule.className='chapter-rule';rule.setAttribute('aria-hidden','true');
    var prose=document.createElement('div');prose.className='reader-prose';
    String(chapter.body||'').split(/\n{2,}/).forEach(function(para){if(!para.trim())return;var p=document.createElement('p');p.textContent=para.trim();prose.appendChild(p);});
    readerDoc.appendChild(meta);readerDoc.appendChild(h);readerDoc.appendChild(rule);readerDoc.appendChild(prose);
    activeSequence=Number(chapter.sequence);prefs.sequence=activeSequence;prefs.percent=Number(restorePercent)||0;writeJson(PREF_STORE,prefs);markActive(activeSequence);
    var barTitle=document.getElementById('barTitle');if(barTitle)barTitle.textContent=h.textContent;
    if(wm&&wm.email)buildWatermark(('PERSONAL COPY · '+wm.email).toUpperCase());
    appendReaderEndNote(activeSequence);appendChapterNavigation(activeSequence);
    requestAnimationFrame(function(){readerDoc.classList.add('reader-enter');});
    restoreScroll(restorePercent||0);scheduleProgressSave();
  }
'''
text = text[:start] + new_render + text[end:]

old_install_tail = "  initInstall();\n\n  function scrollPercent(){"
new_install_tail = r'''  initInstall();

  function normalizePreviewCopy(){
    var card=document.querySelector('.unlock-card');if(!card)return;
    var heading=card.querySelector('h2');if(heading)heading.textContent='The rest of the book is waiting for you.';
    var paragraphs=card.querySelectorAll('p');if(paragraphs[0])paragraphs[0].textContent='Your full reader opens once your copy is activated. Paid and complimentary copies use the same protected reader, tied to the verified email for that copy.';
    var note=card.querySelector('.unlock-note');if(note)note.innerHTML='Already have access? Open <b>Reader access</b> and use the email attached to your copy.';
  }
  normalizePreviewCopy();

  function scrollPercent(){'''
if old_install_tail not in text:
    raise SystemExit("reader.js install tail changed unexpectedly")
text = text.replace(old_install_tail, new_install_tail, 1)
reader_js.write_text(text)


append_once(
    "book/reader.css",
    "FMB reader iOS polish v1",
    r"""
/* FMB reader iOS polish v1 */
.unlock-primary,.install-invite button{background:#211a15;color:#fffaf1}
.reader-access-btn{-webkit-tap-highlight-color:transparent}
.reader-access-btn:active,.reader-nav-button:active{transform:scale(.975)}

.reader-end-note{margin:clamp(56px,11vh,92px) 0 12px;padding:32px 24px 30px;border:1px solid var(--rule);border-radius:26px;background:var(--raise);box-shadow:0 20px 54px rgba(48,31,16,.08)}
.reader-end-kicker{display:block;margin-bottom:12px;font-family:var(--sans);font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
.reader-end-note h2{margin:0;font-family:var(--display);font-size:calc(1.75rem * var(--step));font-weight:400;line-height:1.15;letter-spacing:-.025em}
.reader-end-note p{margin:16px 0 0;font-size:calc(1rem * var(--step));line-height:1.72;color:var(--ink-soft)}
.reader-end-signoff{margin-top:24px!important;font-family:var(--display);font-style:italic;color:var(--ink)!important}
.reader-end-signoff strong{font-size:1.25em;font-weight:500}

.reader-chapter-nav{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:30px 0 10px;padding-top:24px;border-top:1px solid var(--rule)}
.reader-nav-button{min-height:62px;padding:11px 14px;border-radius:18px;border:1px solid var(--rule);text-align:left;cursor:pointer;font-family:var(--sans);transition:transform .18s ease,background-color .18s ease}
.reader-nav-button span{display:block;margin-bottom:4px;font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.68}
.reader-nav-button strong{display:block;font-family:var(--display);font-size:14px;font-weight:500;line-height:1.25}
.reader-nav-primary{background:#211a15;color:#fffaf1;border-color:#211a15}
.reader-nav-secondary{background:var(--raise);color:var(--ink)}

.install-invite[data-platform="ios"]{left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom) + 8px);z-index:80;flex-direction:column;align-items:flex-start;gap:10px;padding:24px 48px calc(22px + env(safe-area-inset-bottom)) 20px;border-radius:28px;background:color-mix(in srgb,var(--paper) 92%,transparent);-webkit-backdrop-filter:blur(28px) saturate(1.3);backdrop-filter:blur(28px) saturate(1.3);box-shadow:0 24px 70px rgba(24,16,10,.24)}
.install-invite[data-platform="ios"]:before{content:"";position:absolute;top:8px;left:50%;width:36px;height:5px;border-radius:999px;background:var(--ink-soft);opacity:.25;transform:translateX(-50%)}
.install-invite[data-platform="ios"] p{font-size:14px;line-height:1.5}
.install-invite[data-platform="ios"] strong{font-size:20px;line-height:1.15;margin-bottom:6px}
.install-invite[data-platform="ios"] .install-dismiss{position:absolute;right:12px;top:12px;background:var(--raise);color:var(--ink)}

@media(max-width:600px){
  .reader-auth{place-items:end stretch!important;align-items:end!important;padding:0!important}
  .reader-auth-card{width:100%!important;max-height:88dvh;overflow:auto;border-radius:28px 28px 0 0!important;padding:26px 20px calc(22px + env(safe-area-inset-bottom))!important}
}

@media(prefers-reduced-motion:no-preference){
  .reader-doc.reader-enter{animation:fmb-reader-enter .52s cubic-bezier(.16,1,.3,1) both}
  .install-invite[data-show][data-platform="ios"]{animation:fmb-ios-sheet .52s cubic-bezier(.16,1,.3,1) both}
  .reader-auth[data-open]{animation:fmb-reader-backdrop .26s ease both}
  .reader-auth[data-open] .reader-auth-card{animation:fmb-reader-sheet .5s cubic-bezier(.16,1,.3,1) both}
  @keyframes fmb-reader-enter{from{opacity:0;transform:translate3d(0,12px,0);filter:blur(2px)}to{opacity:1;transform:none;filter:none}}
  @keyframes fmb-ios-sheet{from{opacity:0;transform:translate3d(0,34px,0) scale(.985)}to{opacity:1;transform:none}}
  @keyframes fmb-reader-backdrop{from{opacity:0}to{opacity:1}}
  @keyframes fmb-reader-sheet{from{opacity:0;transform:translate3d(0,28px,0) scale(.985)}to{opacity:1;transform:none}}
}
""",
)


# READER HTML: keep source copy accurate before JS enhancement runs.
reader_html = Path("book/reader.html")
text = reader_html.read_text()
text = text.replace(
    "Your reader opens once your payment is confirmed. Every copy is activated by hand, so please allow a little time &mdash; you will receive an email the moment yours is ready.",
    "Your full reader opens once your copy is activated. Paid and complimentary access use the same protected reader, tied to the verified email for that copy.",
)
text = text.replace(
    'Already paid? Your access arrives by email. If it has not reached you yet, write to <a href="mailto:withlovefmb@gmail.com">withlovefmb@gmail.com</a> and it will be sorted out.',
    "Already have access? Open Reader access and use the email attached to your copy.",
)
text = text.replace(
    '<p><strong>Keep it on your home screen</strong>Open the book in one tap, and read it anywhere &mdash; signal or none.</p>',
    '<p><strong>Keep it on your Home Screen</strong>Open the reader in one tap. Protected chapters still require your verified access.</p>',
)
reader_html.write_text(text)


# AUTH CALLBACK: make the transitional page feel like a native iOS sheet.
callback = Path("book/auth-callback.html")
text = callback.read_text()
style = r'''<style>
  *{box-sizing:border-box}html,body{min-height:100%;margin:0}body{display:grid;place-items:end center;padding:0;background:linear-gradient(180deg,#f7efdf,#fbf6ec);color:#241c16;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif;overflow:hidden}.card{position:relative;width:min(460px,100%);padding:34px 22px calc(28px + env(safe-area-inset-bottom));border:1px solid rgba(68,49,31,.12);border-bottom:0;border-radius:30px 30px 0 0;background:rgba(255,252,246,.92);-webkit-backdrop-filter:blur(26px) saturate(1.25);backdrop-filter:blur(26px) saturate(1.25);box-shadow:0 -16px 70px rgba(45,29,16,.12);text-align:center}.card:before{content:"";position:absolute;top:9px;left:50%;width:38px;height:5px;border-radius:999px;background:#43372d;opacity:.18;transform:translateX(-50%)}.auth-icon{display:grid;place-items:center;width:54px;height:54px;margin:0 auto 18px;border-radius:18px;background:#211a15;color:#fffaf1;box-shadow:0 12px 28px rgba(33,26,21,.18)}.auth-icon:before{content:"";width:20px;height:20px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .8s linear infinite}body.is-success .auth-icon:before{width:17px;height:9px;border:0;border-left:2px solid currentColor;border-bottom:2px solid currentColor;border-radius:0;transform:rotate(-45deg);animation:none}body.is-error .auth-icon{background:#6f312b}.card small{display:block;margin-bottom:9px;color:#776352;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}.card h1{margin:0 0 10px;font:500 30px/1.08 Georgia,serif;letter-spacing:-.02em}.card p{margin:0;color:#6b5a4a;font-size:14px;line-height:1.55}.card a{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:20px;padding:0 18px;border-radius:999px;background:#211a15;color:#fffaf1;text-decoration:none;font-size:13px;font-weight:700}.card a[hidden]{display:none}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:680px){body{place-items:center}.card{border-bottom:1px solid rgba(68,49,31,.12);border-radius:30px;padding-bottom:30px}}@media(prefers-reduced-motion:reduce){.auth-icon:before{animation:none}}
</style>'''
text = re.sub(r"<style>.*?</style>", style, text, count=1, flags=re.S)
text = text.replace(
    '<main class="card">\n    <small>Protected Book Order</small>',
    '<main class="card">\n    <span class="auth-icon" aria-hidden="true"></span>\n    <small>Protected Book Order</small>',
)
text = text.replace(
    "function fail(text){title.textContent='Sign-in could not be completed';",
    "function fail(text){document.body.classList.add('is-error');title.textContent='Sign-in could not be completed';",
)
text = text.replace(
    "title.textContent='Signed in securely';",
    "document.body.classList.add('is-success');title.textContent='Signed in securely';",
)
text = text.replace(
    "setTimeout(function(){location.replace(destination);},180);",
    "setTimeout(function(){location.replace(destination);},window.matchMedia('(prefers-reduced-motion: reduce)').matches?120:650);",
)
callback.write_text(text)


# OFFLINE: accurately describe network-only protected chapters.
offline = Path("book/offline.html")
text = offline.read_text()
text = text.replace(
    "Nothing is lost. The pages you have already opened are saved on this device, and your place in the book is kept.",
    "Nothing is lost. The reader shell and your saved reading position stay available on this device.",
)
text = text.replace(
    "This page needed the internet, so it will load again the moment you are back.",
    "Protected chapters are never stored as one offline manuscript. Reconnect to verify your access and continue reading securely.",
)
offline.write_text(text)


# Rotate PWA shell cache so the polished UI replaces old cached files.
sw = Path("book/sw.js")
text = sw.read_text().replace("var VERSION='trwtl-v3';", "var VERSION='trwtl-v4';", 1)
sw.write_text(text)
