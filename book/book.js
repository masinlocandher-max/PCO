(function(){
  'use strict';

  var SUPABASE_URL='https://wjnavdpppnhxbuydkrkd.supabase.co';
  var SUPABASE_KEY='sb_publishable_bpdFntTHbHmxsG4L0PtcCw_5dJ8gpr8';
  var BOOK_API=SUPABASE_URL+'/functions/v1/book-api';
  var AUTH_STORE='trwtl.auth';
  var ORDER_DRAFT='trwtl.order-draft';
  var AUTH_RETURN_STORE='trwtl.auth-return';
  var SUPPORT_EMAIL='withlovefmb@gmail.com';
  var secureEditions={};
  var orderModal=null;

  function readJson(key){try{return JSON.parse(localStorage.getItem(key))||null;}catch(e){return null;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function removeKey(key){try{localStorage.removeItem(key);}catch(e){}}
  function uid(){return (window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});}
  function parseJwt(token){
    try{var raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');raw=raw.padEnd(Math.ceil(raw.length/4)*4,'=');return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(raw),function(c){return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join('')));}catch(e){return {};}
  }
  function currentSession(){return readJson(AUTH_STORE);}
  async function refreshSession(session){
    if(!session||!session.refresh_token)return null;
    try{
      var r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store'});
      if(!r.ok)throw new Error('refresh_failed');
      var data=await r.json();
      var next={access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
      writeJson(AUTH_STORE,next);return next;
    }catch(e){removeKey(AUTH_STORE);return null;}
  }
  async function usableSession(){
    var s=currentSession();if(!s)return null;
    if(!s.expires_at||Number(s.expires_at)<Math.floor(Date.now()/1000)+90)s=await refreshSession(s);
    return s;
  }
  async function api(action,input){
    var s=await usableSession();if(!s)throw new Error('sign_in_required');
    var r=await fetch(BOOK_API,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'content-type':'application/json',Accept:'application/json'},body:JSON.stringify(Object.assign({action:action},input||{})),cache:'no-store'});
    var data={};try{data=await r.json();}catch(e){}
    if(r.status===401){removeKey(AUTH_STORE);throw new Error('sign_in_required');}
    if(!r.ok)throw new Error(data.error||'order_unavailable');
    return data;
  }

  /* Ebook always uses the protected order backend. Pocketbook may later be
     replaced with a hosted checkout URL without weakening ebook entitlement. */
  function initCheckout(){
    var config=window.FMB_BOOK_CHECKOUT;
    if(!config&&window.FMB_BOOK_CHECKOUT_URL)config={};
    document.querySelectorAll('[data-edition]').forEach(function(link){
      var edition=link.getAttribute('data-edition');
      var url=edition==='pocketbook'&&config&&config[edition];
      if(url){link.href=url;link.target='_blank';link.rel='noopener';return;}
      secureEditions[edition]=true;
      link.removeAttribute('target');link.removeAttribute('rel');
      link.addEventListener('click',function(e){e.preventDefault();openOrder(edition);});
    });
  }

  function initNav(){
    var bar=document.getElementById('bookNav'),toggle=document.getElementById('navToggle'),panel=document.getElementById('bookNavLinks');
    if(!bar||!toggle||!panel)return;
    var desktop=window.matchMedia('(min-width:861px)');
    function isOpen(){return bar.hasAttribute('data-nav-open');}
    function setOpen(open){if(open)bar.setAttribute('data-nav-open','');else bar.removeAttribute('data-nav-open');toggle.setAttribute('aria-expanded',open?'true':'false');toggle.setAttribute('aria-label',open?'Close menu':'Open menu');}
    toggle.addEventListener('click',function(e){e.stopPropagation();setOpen(!isOpen());});
    panel.addEventListener('click',function(e){if(e.target.closest('a'))setOpen(false);});
    document.addEventListener('click',function(e){if(isOpen()&&!bar.contains(e.target))setOpen(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen()){setOpen(false);toggle.focus();}});
    function sync(){if(desktop.matches)setOpen(false);} if(desktop.addEventListener)desktop.addEventListener('change',sync);else if(desktop.addListener)desktop.addListener(sync);sync();
  }

  function initOffline(){if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});}
  /*
    initLaunchMotion() used to live here. It set data-motion on <body> for a
    second opening sequence in a stylesheet that no longer exists — and because
    the reveal system selects [data-motion], <body> itself was being picked up as
    a reveal target: opacity 0 and a transform on the root element, which also
    makes it the containing block for every position:fixed layer on the page.
    The opening sequence is now the [data-ready] one in landing.css alone.
  */
  /*
    Motion.

    One rAF per scroll, all reads batched before all writes, and nothing
    animated except transform and opacity — those are the only two properties
    the compositor can handle without touching layout or paint. Expensive is
    not more movement; it is movement that never stutters.

    JavaScript writes a single number per element, --p, roughly -1 to 1 for how
    far past the viewport centre it sits. CSS decides what to do with it, so the
    choreography lives with the design rather than in here.

    Everything degrades to a still page: elements are only hidden once script
    confirms it can reveal them, and prefers-reduced-motion opts out entirely.
  */
  function initMotion(){
    var body=document.body;
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');

    // The opening sequence. Marked on the next frame so the first paint is the
    // page at rest, never a flash of the finished state.
    requestAnimationFrame(function(){body.setAttribute('data-ready','');});

    // The bar earns a background only once it is over content.
    var bar=document.getElementById('bookNav');
    if(bar){
      var lastState=null;
      var markBar=function(){
        var over=window.scrollY>24;
        if(over===lastState)return;
        lastState=over;
        bar.toggleAttribute('data-over',over);
      };
      window.addEventListener('scroll',markBar,{passive:true});
      markBar();
    }

    if(reduce.matches||!('IntersectionObserver' in window))return;

    // ---- reveals: one shot, staggered by CSS ----
    var reveals=document.querySelectorAll('[data-motion]');
    if(reveals.length){
      Array.prototype.forEach.call(reveals,function(el){el.setAttribute('data-motion-state','wait');});
      var revealer=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting)return;
          entry.target.setAttribute('data-motion-state','in');
          revealer.unobserve(entry.target);
        });
      },{rootMargin:'0px 0px -10% 0px',threshold:.12});
      Array.prototype.forEach.call(reveals,function(el){revealer.observe(el);});
    }

    // ---- continuous parallax ----
    var tracked=document.querySelectorAll('[data-parallax]');
    if(!tracked.length)return;
    var live=[];

    // Only elements near the viewport are measured, so the cost per frame stays
    // flat however long the page grows.
    var watcher=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var el=entry.target;
        var at=live.indexOf(el);
        if(entry.isIntersecting&&at===-1)live.push(el);
        else if(!entry.isIntersecting&&at!==-1)live.splice(at,1);
      });
      schedule();
    },{rootMargin:'25% 0px'});
    Array.prototype.forEach.call(tracked,function(el){watcher.observe(el);});

    var queued=false;
    function frame(){
      queued=false;
      var height=window.innerHeight||1;
      var middle=height/2;
      var i,box,measured=[];
      for(i=0;i<live.length;i++){                    // read
        box=live[i].getBoundingClientRect();
        measured.push((box.top+box.height/2-middle)/height);
      }
      for(i=0;i<live.length;i++){                    // write
        live[i].style.setProperty('--p',measured[i].toFixed(4));
      }
    }
    function schedule(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(frame);
    }

    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    schedule();
  }

  function replaceListCopy(li,text){var svg=li.querySelector('svg');while(li.firstChild)li.removeChild(li.firstChild);if(svg)li.appendChild(svg);li.appendChild(document.createTextNode(text));}
  function alignReaderCopy(){
    var buy=document.querySelector('[data-edition="ebook"]'),card=buy&&buy.closest('.edition');if(!card)return;
    var note=card.querySelector('.edition-note');if(note)note.textContent='Protected reader access';
    card.querySelectorAll('li').forEach(function(li){var t=li.textContent.trim().toLowerCase();if(t.indexOf('without a signal')>=0)replaceListCopy(li,'Chapter-by-chapter secure reading');if(t.indexOf('yours, and yours alone')>=0)replaceListCopy(li,'Access checked before every protected chapter');});
    if(!card.querySelector('.reader-existing-access')){var link=document.createElement('a');link.className='text-link reader-existing-access';link.href='../ebook/';link.textContent='Already have access? Open ebook app';card.appendChild(link);}
    var fine=document.querySelector('.purchase-fineprint');if(fine)fine.textContent='Orders are recorded securely. Ebook reader access activates only after payment is verified. Pocketbook orders move to fulfillment after payment verification, with nationwide Philippine shipping included.';
  }

  function addOrderUI(){
    var style=document.createElement('style');
    style.textContent='.book-order-modal{position:fixed;inset:0;z-index:150;display:none;place-items:center;padding:18px;background:rgba(27,18,10,.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.book-order-modal[data-open]{display:grid}.book-order-card{width:min(520px,100%);max-height:min(86vh,760px);overflow:auto;box-sizing:border-box;border:1px solid rgba(93,66,38,.18);border-radius:22px;padding:24px;background:#fbf5e8;color:#2d2118;box-shadow:0 26px 90px rgba(0,0,0,.32)}.book-order-card h2{margin:0 0 8px;font:400 34px/1.05 Georgia,serif}.book-order-card p{font:14px/1.55 system-ui,sans-serif;color:#655546}.book-order-card label{display:block;margin:14px 0 6px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}.book-order-card input,.book-order-card select{width:100%;box-sizing:border-box;border:1px solid #cdbda8;border-radius:11px;padding:12px 13px;background:#fff;color:#2d2118;font:15px/1.2 system-ui,sans-serif}.book-order-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.book-order-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:17px}.book-order-actions button,.book-order-actions a{border:0;border-radius:999px;padding:11px 15px;text-decoration:none;cursor:pointer;font:700 12px/1 system-ui,sans-serif}.book-order-primary{background:#2d2118;color:#fff}.book-order-secondary{background:#eee2d2;color:#2d2118}.book-order-status{min-height:22px;margin-top:10px}.book-order-number{overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.book-order-summary{margin:15px 0;padding:14px;border:1px solid rgba(92,64,34,.2);border-radius:14px;background:rgba(255,255,255,.45)}@media(max-width:560px){.book-order-modal{align-items:end;padding:0}.book-order-grid{grid-template-columns:1fr}.book-order-card{width:100%;max-height:90dvh;border-radius:22px 22px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom))}}';
    document.head.appendChild(style);
    orderModal=document.createElement('div');orderModal.className='book-order-modal';orderModal.id='bookOrderModal';orderModal.setAttribute('aria-hidden','true');document.body.appendChild(orderModal);
    orderModal.addEventListener('click',function(e){if(e.target===orderModal)closeOrder();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&orderModal&&orderModal.hasAttribute('data-open'))closeOrder();});
  }
  function openModal(){orderModal.setAttribute('data-open','');orderModal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeOrder(){if(!orderModal)return;orderModal.removeAttribute('data-open');orderModal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  function modalShell(title,copy,body){orderModal.innerHTML='<div class="book-order-card" role="dialog" aria-modal="true" aria-labelledby="bookOrderTitle"><h2 id="bookOrderTitle">'+title+'</h2><p>'+copy+'</p>'+body+'</div>';openModal();}
  function editionLabel(edition){return edition==='pocketbook'?'Pocketbook':'Ebook';}
  function peso(centavos){return '₱'+(Number(centavos||0)/100).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:2});}
  function draftFor(edition){var d=readJson(ORDER_DRAFT);if(!d||d.edition!==edition||!d.idempotency_key)d={edition:edition,idempotency_key:uid(),started_at:Date.now()};writeJson(ORDER_DRAFT,d);return d;}
  function claimsEmail(){var s=currentSession();return s&&s.access_token?(parseJwt(s.access_token).email||''):'';}
  async function sendMagicLink(email,edition){
    writeJson(AUTH_RETURN_STORE,{path:'./?order='+encodeURIComponent(edition),created_at:Date.now()});
    var redirect=location.origin+'/book/auth-callback.html';
    var r=await fetch(SUPABASE_URL+'/auth/v1/otp',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({email:email,create_user:true,email_redirect_to:redirect}),cache:'no-store'});
    if(!r.ok)throw new Error('send_failed');
  }
  function renderSignIn(edition){
    modalShell('Secure '+editionLabel(edition)+' order','Use your email so this order and any ebook access are tied to the correct verified account.','<form id="bookOrderAuth"><label for="bookOrderEmail">Email</label><input id="bookOrderEmail" type="email" autocomplete="email" required placeholder="you@example.com"><div class="book-order-actions"><button class="book-order-primary" type="submit">Send secure sign-in link</button><button class="book-order-secondary" type="button" data-order-close>Close</button></div><p class="book-order-status" id="bookOrderStatus" role="status" aria-live="polite"></p></form>');
    orderModal.querySelector('[data-order-close]').addEventListener('click',closeOrder);
    orderModal.querySelector('#bookOrderAuth').addEventListener('submit',async function(e){e.preventDefault();var status=orderModal.querySelector('#bookOrderStatus'),email=orderModal.querySelector('#bookOrderEmail').value.trim();status.textContent='Sending your secure link…';try{draftFor(edition);await sendMagicLink(email,edition);status.textContent='Check your email. Open the secure link on this device to continue the order.';}catch(err){status.textContent='The sign-in link could not be sent right now. Please try again.';}});
  }
  function paymentMail(order){
    var subject='Payment verification — The Right Way to Live — '+order.id;
    var body='Hello FMB,\n\nI created an order for The Right Way to Live.\n\nOrder number: '+order.id+'\nEdition: '+editionLabel(order.edition)+'\nTotal: '+peso(order.total_centavos)+'\nReader/order email: '+(order.customer_email||claimsEmail()||'')+'\n\nPlease send or confirm the payment instructions for this order. If I have already paid, I will attach the payment proof/reference here.\n\nThank you.';
    return 'mailto:'+SUPPORT_EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }
  function cleanOrderQuery(){var p=new URLSearchParams(location.search);if(!p.has('order'))return;p.delete('order');var q=p.toString();history.replaceState(null,'',location.pathname+(q?'?'+q:'')+location.hash);}
  function showOrderSummary(order,existing){
    var copy=existing?'You already have an order waiting for payment verification.':'Your order is recorded securely.';
    var extra=order.edition==='ebook'?'<p>Your ebook access activates only after payment is verified.</p>':'<p>Your pocketbook will move to fulfillment after payment is verified.</p>';
    modalShell(existing?'Order already open':'Order created',copy,'<div class="book-order-summary"><strong>'+editionLabel(order.edition)+'</strong><p>'+peso(order.total_centavos)+' · '+String(order.status||'pending_payment').replace(/_/g,' ')+'</p><p class="book-order-number">Order '+order.id+'</p></div>'+extra+'<div class="book-order-actions"><a class="book-order-primary" href="'+paymentMail(order)+'">Payment / proof instructions</a>'+(order.edition==='ebook'?'<a class="book-order-secondary" href="../ebook/">Open ebook app</a>':'')+'<button class="book-order-secondary" type="button" data-order-close>Close</button></div>');
    orderModal.querySelector('[data-order-close]').addEventListener('click',closeOrder);removeKey(ORDER_DRAFT);cleanOrderQuery();
  }
  function renderOrderForm(edition,email){
    var pocket=edition==='pocketbook';
    var fields='<form id="bookSecureOrder"><label for="bookCustomerName">Full name</label><input id="bookCustomerName" name="customer_name" autocomplete="name" required minlength="2" maxlength="120"><div class="book-order-grid">'+(pocket?'<div><label for="bookQuantity">Quantity</label><select id="bookQuantity" name="quantity">'+Array.from({length:10},function(_,i){return '<option value="'+(i+1)+'">'+(i+1)+'</option>';}).join('')+'</select></div><div><label for="bookPhone">Mobile number</label><input id="bookPhone" name="phone" autocomplete="tel" required placeholder="09xx xxx xxxx"></div>':'<input type="hidden" name="quantity" value="1">')+'</div>';
    if(pocket)fields+='<label for="bookLine1">Street and barangay</label><input id="bookLine1" autocomplete="street-address" required maxlength="250"><div class="book-order-grid"><div><label for="bookCity">City or municipality</label><input id="bookCity" autocomplete="address-level2" required maxlength="100"></div><div><label for="bookProvince">Province</label><input id="bookProvince" autocomplete="address-level1" required maxlength="100"></div></div><label for="bookPostal">Postal code</label><input id="bookPostal" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{4}" required maxlength="4">';
    fields+='<p>Signed in as <strong>'+String(email||'your verified email')+'</strong>.</p><div class="book-order-actions"><button class="book-order-primary" type="submit">Create '+editionLabel(edition)+' order</button><button class="book-order-secondary" type="button" data-order-close>Close</button></div><p class="book-order-status" id="bookOrderStatus" role="status" aria-live="polite"></p></form>';
    modalShell('Order the '+editionLabel(edition),pocket?'Shipping within the Philippines is included in the listed price.':'The ebook is delivered through the protected reader after payment verification.',fields);
    orderModal.querySelector('[data-order-close]').addEventListener('click',closeOrder);
    orderModal.querySelector('#bookSecureOrder').addEventListener('submit',async function(e){
      e.preventDefault();var f=e.currentTarget,status=orderModal.querySelector('#bookOrderStatus'),draft=draftFor(edition);var payload={edition:edition,quantity:Number(f.elements.quantity.value),idempotency_key:draft.idempotency_key,customer_name:f.elements.customer_name.value.trim()};
      if(pocket){payload.phone=f.elements.phone.value.trim();payload.shipping_address={line1:document.getElementById('bookLine1').value.trim(),city:document.getElementById('bookCity').value.trim(),province:document.getElementById('bookProvince').value.trim(),postal_code:document.getElementById('bookPostal').value.trim(),country:'PH'};}
      status.textContent='Creating your order…';
      try{var data=await api('create_order',payload);showOrderSummary(data.order,false);}catch(err){var map={already_owned:'This email already has ebook access. Open the ebook app instead.',pending_order_exists:'You already have an unpaid order for this edition.',rate_limited:'Too many order attempts were made recently. Please use your existing order.',content_not_ready:'The ebook is not available for ordering yet.',invalid_order:'Please check the order details and try again.',idempotency_conflict:'This order draft changed. Close this window and start again.'};status.textContent=map[err.message]||'The order could not be created right now. Please try again.';if(err.message==='idempotency_conflict')removeKey(ORDER_DRAFT);}
    });
  }
  async function openOrder(edition){
    if(!secureEditions[edition])return;draftFor(edition);
    var s=await usableSession();if(!s){renderSignIn(edition);return;}
    modalShell('Checking your account','We are checking for an existing order or ebook access.','<p class="book-order-status">One moment…</p>');
    try{
      if(edition==='ebook'){
        var access=await api('access');
        if(access.has_access===true){modalShell('Your ebook is active','This account already owns the ebook. Open it in the ebook app.','<div class="book-order-actions"><a class="book-order-primary" href="../ebook/">Open ebook app</a><button class="book-order-secondary" type="button" data-order-close>Close</button></div>');orderModal.querySelector('[data-order-close]').addEventListener('click',closeOrder);removeKey(ORDER_DRAFT);cleanOrderQuery();return;}
      }
      var data=await api('orders'),orders=Array.isArray(data.orders)?data.orders:[],pending=orders.find(function(o){return o.edition===edition&&o.status==='pending_payment';});
      if(pending){showOrderSummary(pending,true);return;}
      renderOrderForm(edition,claimsEmail());
    }catch(err){if(err.message==='sign_in_required')renderSignIn(edition);else{modalShell('Order unavailable','Your account could not be checked right now.','<div class="book-order-actions"><button class="book-order-secondary" type="button" data-order-close>Close</button></div>');orderModal.querySelector('[data-order-close]').addEventListener('click',closeOrder);}}
  }
  function resumeOrder(){var p=new URLSearchParams(location.search),edition=p.get('order'),draft=readJson(ORDER_DRAFT);edition=edition||(draft&&draft.edition);if(edition&&secureEditions[edition])openOrder(edition);}

  initCheckout();
  initNav();
  initOffline();
  initMotion();
  alignReaderCopy();
  addOrderUI();
  resumeOrder();
})();