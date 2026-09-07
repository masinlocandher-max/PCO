(function(){
  'use strict';

  var SUPABASE_URL='https://wjnavdpppnhxbuydkrkd.supabase.co';
  var SUPABASE_KEY='sb_publishable_bpdFntTHbHmxsG4L0PtcCw_5dJ8gpr8';
  var BOOK_API=SUPABASE_URL+'/functions/v1/book-api';
  var AUTH_STORE='trwtl.auth';
  var CHECKOUT_STORE='trwtl.checkout';

  function readJson(key){try{return JSON.parse(localStorage.getItem(key))||null;}catch(e){return null;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function removeKey(key){try{localStorage.removeItem(key);}catch(e){}}
  function parseJwt(token){
    try{
      var raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      raw=raw.padEnd(Math.ceil(raw.length/4)*4,'=');
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(raw),function(c){return '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join('')));
    }catch(e){return {};}
  }
  function currentSession(){return readJson(AUTH_STORE);}
  async function refreshSession(session){
    if(!session||!session.refresh_token)return null;
    try{
      var r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},
        body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store'
      });
      if(!r.ok)throw new Error('refresh_failed');
      var data=await r.json();
      var next={access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
      writeJson(AUTH_STORE,next);return next;
    }catch(e){removeKey(AUTH_STORE);return null;}
  }
  async function usableSession(){
    var s=currentSession();
    if(!s)return null;
    if(!s.expires_at||Number(s.expires_at)<Math.floor(Date.now()/1000)+90)s=await refreshSession(s);
    return s;
  }
  async function api(action,input,allowAnon){
    var headers={apikey:SUPABASE_KEY,'content-type':'application/json',Accept:'application/json'};
    if(!allowAnon){
      var s=await usableSession();
      if(!s)throw new Error('sign_in_required');
      headers.Authorization='Bearer '+s.access_token;
    }
    var r=await fetch(BOOK_API,{method:'POST',headers:headers,body:JSON.stringify(Object.assign({action:action},input||{})),cache:'no-store'});
    var data={};try{data=await r.json();}catch(e){}
    if(r.status===401){removeKey(AUTH_STORE);throw new Error(data.error||'sign_in_required');}
    if(!r.ok)throw new Error(data.error||'service_unavailable');
    return data;
  }
  function uuid(){
    if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
    var b=new Uint8Array(16);window.crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    return Array.prototype.map.call(b,function(x,i){return ([4,6,8,10].indexOf(i)>=0?'-':'')+x.toString(16).padStart(2,'0');}).join('');
  }
  function sessionEmail(){var s=currentSession();return s&&s.access_token?(parseJwt(s.access_token).email||''):'';}

  /* Pocketbook can still be overridden by a hosted checkout. Ebook intentionally
     stays on the protected Supabase order flow below. */
  function initCheckoutOverrides(){
    var config=window.FMB_BOOK_CHECKOUT;
    if(!config&&window.FMB_BOOK_CHECKOUT_URL)config={};
    if(!config)return;
    document.querySelectorAll('[data-edition]').forEach(function(link){
      var edition=link.getAttribute('data-edition');
      if(edition==='ebook')return;
      var url=config[edition];if(!url)return;
      link.href=url;link.target='_blank';link.rel='noopener';
    });
  }

  function initEbookCheckout(){
    var buy=document.getElementById('buyEbook')||document.querySelector('[data-edition="ebook"]');
    if(!buy)return;
    buy.removeAttribute('target');buy.removeAttribute('rel');
    buy.href='#ebook-checkout';

    var style=document.createElement('style');
    style.textContent='\
.ebook-checkout{position:fixed;inset:0;z-index:140;display:none;place-items:center;padding:18px;background:rgba(29,21,14,.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}\
.ebook-checkout[data-open]{display:grid}.ebook-checkout-card{width:min(460px,100%);max-height:min(760px,calc(100dvh - 36px));overflow:auto;background:#fbf5e8;color:#2a211a;border:1px solid rgba(93,66,38,.18);border-radius:24px;padding:26px;box-shadow:0 28px 90px rgba(17,11,7,.34)}\
.ebook-checkout-card small{display:block;margin-bottom:8px;font:700 10px/1.2 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a6339}.ebook-checkout-card h2{margin:0;font:600 clamp(28px,7vw,38px)/1.05 Georgia,serif}.ebook-checkout-price{margin:8px 0 16px;font:600 22px/1.1 Georgia,serif}.ebook-checkout-copy,.ebook-checkout-status,.ebook-order-note{font:14px/1.55 system-ui,sans-serif;color:#695747}.ebook-checkout-card label{display:block;margin:16px 0 6px;font:700 10px/1.2 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}.ebook-checkout-card input{width:100%;box-sizing:border-box;border:1px solid #cdbca5;border-radius:12px;padding:13px 14px;background:#fffdf8;color:#2a211a;font:16px/1.2 system-ui,sans-serif}.ebook-checkout-card input:disabled{background:#eee6da;color:#66594e}.ebook-checkout-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.ebook-checkout-actions button,.ebook-checkout-actions a{appearance:none;border:0;border-radius:999px;padding:12px 16px;text-decoration:none;font:700 12px/1 system-ui,sans-serif;cursor:pointer}.ebook-primary{background:#2a211a;color:#fff}.ebook-secondary{background:#eee2d1;color:#2a211a}.ebook-checkout-status{min-height:22px;margin:11px 0 0}.ebook-order-box{margin-top:18px;padding:16px;border:1px solid #d7c6ae;border-radius:16px;background:#fffaf1}.ebook-order-box strong{display:block;font:600 22px/1.15 Georgia,serif}.ebook-order-ref{margin:8px 0 0;font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;word-break:break-all}.ebook-checkout-close{float:right;margin:-6px -4px 0 12px;border:0;background:transparent;font:24px/1 system-ui,sans-serif;color:#6a5a4c;cursor:pointer}.ebook-checkout [hidden]{display:none!important}@media(max-width:520px){.ebook-checkout{align-items:end;padding:0}.ebook-checkout-card{width:100%;max-height:88dvh;border-radius:24px 24px 0 0;padding:24px 20px calc(24px + env(safe-area-inset-bottom))}}';
    document.head.appendChild(style);

    var modal=document.createElement('div');
    modal.className='ebook-checkout';modal.id='ebookCheckout';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<section class="ebook-checkout-card" role="dialog" aria-modal="true" aria-labelledby="ebookCheckoutTitle"><button class="ebook-checkout-close" id="ebookCheckoutClose" type="button" aria-label="Close">×</button><small>Protected Ebook</small><h2 id="ebookCheckoutTitle">The Right Way to Live</h2><p class="ebook-checkout-price">₱499</p><p class="ebook-checkout-copy" id="ebookCheckoutCopy">Create your secure reader order. Your manuscript access is activated only after payment is verified.</p><form id="ebookCheckoutForm"><label for="ebookBuyerName">Name</label><input id="ebookBuyerName" name="name" autocomplete="name" maxlength="120" required><label for="ebookBuyerEmail">Email for reader access</label><input id="ebookBuyerEmail" name="email" type="email" autocomplete="email" required><div class="ebook-checkout-actions"><button class="ebook-primary" id="ebookCheckoutSubmit" type="submit">Continue securely</button><button class="ebook-secondary" id="ebookCheckoutCancel" type="button">Cancel</button></div><p class="ebook-checkout-status" id="ebookCheckoutStatus" role="status" aria-live="polite"></p></form><div class="ebook-order-box" id="ebookOrderBox" hidden><small>Order secured</small><strong>Payment verification pending</strong><p class="ebook-order-ref" id="ebookOrderRef"></p><p class="ebook-order-note">Your order is now recorded in the protected backend. Payment is verified manually before reader access is activated.</p><div class="ebook-checkout-actions"><a class="ebook-primary" id="ebookPaymentEmail" href="#">Payment / proof instructions</a><a class="ebook-secondary" href="reader.html">Open reader</a></div></div></section>';
    document.body.appendChild(modal);

    var form=document.getElementById('ebookCheckoutForm');
    var nameField=document.getElementById('ebookBuyerName');
    var emailField=document.getElementById('ebookBuyerEmail');
    var submit=document.getElementById('ebookCheckoutSubmit');
    var status=document.getElementById('ebookCheckoutStatus');
    var orderBox=document.getElementById('ebookOrderBox');
    var pending=readJson(CHECKOUT_STORE)||{};

    function close(){modal.removeAttribute('data-open');modal.setAttribute('aria-hidden','true');}
    function open(){
      pending=readJson(CHECKOUT_STORE)||{};
      if(pending.name)nameField.value=pending.name;
      var email=sessionEmail()||pending.email||'';if(email)emailField.value=email;
      emailField.disabled=Boolean(sessionEmail());
      status.textContent='';orderBox.hidden=true;form.hidden=false;
      modal.setAttribute('data-open','');modal.setAttribute('aria-hidden','false');
      updateButton();
      api('catalog',{},true).then(function(data){if(data.content_ready!==true){submit.disabled=true;status.textContent='The ebook is temporarily unavailable while the protected reader is being prepared.';}})['catch'](function(){status.textContent='Secure checkout is temporarily unavailable. Please try again shortly.';});
    }
    function updateButton(){submit.textContent=sessionEmail()?'Secure my order':'Email me a secure sign-in link';}
    document.getElementById('ebookCheckoutClose').addEventListener('click',close);
    document.getElementById('ebookCheckoutCancel').addEventListener('click',close);
    modal.addEventListener('click',function(e){if(e.target===modal)close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.hasAttribute('data-open'))close();});
    buy.addEventListener('click',function(e){e.preventDefault();open();});

    async function findPendingOrder(){
      try{
        var data=await api('orders');
        return (data.orders||[]).find(function(o){return o.edition==='ebook'&&o.status==='pending_payment';})||null;
      }catch(e){return null;}
    }
    function showOrder(order){
      if(!order)return;
      form.hidden=true;orderBox.hidden=false;
      var ref=String(order.id||'');document.getElementById('ebookOrderRef').textContent='ORDER '+ref.toUpperCase();
      var subject='Ebook payment — The Right Way to Live — '+ref;
      var body='Hello FMB,\n\nI am completing payment for my ebook order.\n\nOrder ID: '+ref+'\nAmount: PHP 499\nReader email: '+(order.customer_email||sessionEmail()||'')+'\n\nPlease send/confirm the payment instructions. If I have already paid, I will attach my payment proof/reference here.\n\nThank you.';
      document.getElementById('ebookPaymentEmail').href='mailto:withlovefmb@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      pending.order_id=ref;pending.stage='pending_payment';writeJson(CHECKOUT_STORE,pending);
    }

    form.addEventListener('submit',async function(e){
      e.preventDefault();
      var name=nameField.value.trim();var email=(emailField.value||sessionEmail()).trim().toLowerCase();
      if(name.length<2){status.textContent='Please enter the name for this order.';nameField.focus();return;}
      if(!email||email.indexOf('@')<1){status.textContent='Please enter a valid email address.';emailField.focus();return;}
      pending=readJson(CHECKOUT_STORE)||{};
      pending.name=name;pending.email=email;pending.idempotency_key=pending.idempotency_key||uuid();writeJson(CHECKOUT_STORE,pending);
      submit.disabled=true;
      try{
        var session=await usableSession();
        if(!session){
          status.textContent='Sending your secure sign-in link…';
          pending.stage='awaiting_signin';writeJson(CHECKOUT_STORE,pending);
          var r=await fetch(SUPABASE_URL+'/auth/v1/otp',{
            method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},
            body:JSON.stringify({email:email,create_user:true,email_redirect_to:location.origin+'/book/auth-callback.html'})
          });
          if(!r.ok)throw new Error('signin_link_failed');
          status.textContent='Check your email. Open the secure link on this device and checkout will continue automatically.';
          submit.textContent='Sign-in link sent';
          return;
        }

        var claims=parseJwt(session.access_token);
        if(claims.email&&String(claims.email).toLowerCase()!==email){
          throw new Error('email_mismatch');
        }
        status.textContent='Securing your order…';
        try{
          var access=await api('access');
          if(access.has_access){removeKey(CHECKOUT_STORE);form.hidden=true;orderBox.hidden=false;orderBox.querySelector('small').textContent='Already activated';orderBox.querySelector('strong').textContent='Your ebook is ready';document.getElementById('ebookOrderRef').textContent='';document.querySelector('#ebookOrderBox .ebook-order-note').textContent='This account already has active ebook access.';document.getElementById('ebookPaymentEmail').textContent='Open reader';document.getElementById('ebookPaymentEmail').href='reader.html';return;}
        }catch(ignore){}

        var result;
        try{
          result=await api('create_order',{edition:'ebook',quantity:1,customer_name:name,idempotency_key:pending.idempotency_key});
        }catch(err){
          if(err.message==='pending_order_exists'){
            var existing=await findPendingOrder();if(existing){showOrder(existing);return;}
          }
          if(err.message==='already_owned'){
            removeKey(CHECKOUT_STORE);location.href='reader.html';return;
          }
          throw err;
        }
        showOrder(result.order);
      }catch(err){
        var messages={email_mismatch:'This browser is signed in with a different email. Open the reader and sign out first, then try again.',rate_limited:'Too many checkout attempts were made. Please wait before trying again.',content_not_ready:'The protected ebook reader is temporarily unavailable.',sign_in_required:'Please use the secure sign-in link again.'};
        status.textContent=messages[err.message]||'Secure checkout could not be completed right now. Please try again.';
      }finally{
        submit.disabled=false;updateButton();
      }
    });

    if(new URLSearchParams(location.search).get('ebook')==='checkout'){
      var clean=location.pathname+location.hash;history.replaceState(null,'',clean);
      window.setTimeout(open,120);
      if(sessionEmail()&&pending.name){
        window.setTimeout(function(){form.requestSubmit();},260);
      }
    }
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
    function sync(){if(desktop.matches)setOpen(false);}if(desktop.addEventListener)desktop.addEventListener('change',sync);else if(desktop.addListener)desktop.addListener(sync);sync();
  }

  function initOffline(){if(!('serviceWorker' in navigator))return;window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js')['catch'](function(){});});}
  function initReveal(){
    var passages=document.querySelectorAll('.passage');if(!passages.length||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    passages.forEach(function(el){el.setAttribute('data-reveal','');});
    var watcher=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;entry.target.setAttribute('data-reveal','in');watcher.unobserve(entry.target);});},{rootMargin:'0px 0px -12% 0px',threshold:.15});
    passages.forEach(function(el){watcher.observe(el);});
  }
  function alignReaderCopy(){
    var buy=document.querySelector('[data-edition="ebook"]');var card=buy&&buy.closest('.edition');if(!card)return;
    var note=card.querySelector('.edition-note');if(note)note.textContent='Protected reader access';
    card.querySelectorAll('li').forEach(function(li){var t=li.textContent.trim().toLowerCase();if(t.indexOf('without a signal')>=0)replaceListCopy(li,'Chapter-by-chapter secure reading');if(t.indexOf('yours, and yours alone')>=0)replaceListCopy(li,'Access checked before every protected chapter');});
    if(!card.querySelector('.reader-existing-access')){var link=document.createElement('a');link.className='text-link reader-existing-access';link.href='reader.html';link.textContent='Already have access? Open reader';card.appendChild(link);}
    var fine=document.querySelector('.purchase-fineprint');if(fine)fine.textContent='Ebook orders are recorded securely. Reader access activates after payment is verified. Pocketbook orders continue to be handled directly, with nationwide Philippine shipping included.';
  }
  function replaceListCopy(li,text){var svg=li.querySelector('svg');while(li.firstChild)li.removeChild(li.firstChild);if(svg)li.appendChild(svg);li.appendChild(document.createTextNode(text));}

  initCheckoutOverrides();
  initNav();
  initOffline();
  initReveal();
  alignReaderCopy();
  initEbookCheckout();
})();
