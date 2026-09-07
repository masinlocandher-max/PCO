(function(){
  'use strict';

  var SUPABASE_URL='https://wjnavdpppnhxbuydkrkd.supabase.co';
  var SUPABASE_KEY='sb_publishable_bpdFntTHbHmxsG4L0PtcCw_5dJ8gpr8';
  var PAYMONGO_API=SUPABASE_URL+'/functions/v1/book-paymongo-api';
  var AUTH_STORE='trwtl.auth';
  var busy=false;

  function readSession(){try{return JSON.parse(localStorage.getItem(AUTH_STORE)||'null')}catch(e){return null}}
  function writeSession(v){try{localStorage.setItem(AUTH_STORE,JSON.stringify(v))}catch(e){}}
  function clearSession(){try{localStorage.removeItem(AUTH_STORE)}catch(e){}}

  async function refreshSession(s){
    if(!s||!s.refresh_token)return null;
    try{
      var r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SUPABASE_KEY,'content-type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token}),cache:'no-store'});
      if(!r.ok)throw new Error('refresh_failed');
      var d=await r.json(),next={access_token:d.access_token,refresh_token:d.refresh_token||s.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(d.expires_in||3600)};
      writeSession(next);return next;
    }catch(e){clearSession();return null}
  }

  async function session(){
    var s=readSession();if(!s)return null;
    if(!s.expires_at||Number(s.expires_at)<Math.floor(Date.now()/1000)+90)s=await refreshSession(s);
    return s;
  }

  async function api(action,input){
    var s=await session();if(!s)throw new Error('sign_in_required');
    var r=await fetch(PAYMONGO_API,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'content-type':'application/json',Accept:'application/json'},body:JSON.stringify(Object.assign({action:action},input||{})),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'}),d={};
    try{d=await r.json()}catch(e){}
    if(r.status===401||r.status===403){if(d.error==='forbidden')clearSession();throw new Error(d.error||'sign_in_required')}
    if(!r.ok)throw new Error(d.error||'paymongo_unavailable');
    return d;
  }

  function orderId(card){
    var node=card&&card.querySelector('.book-order-number'),m=node&&node.textContent.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return m?m[0]:'';
  }

  function statusNode(card){
    var n=card.querySelector('[data-paymongo-status]');
    if(n)return n;
    n=document.createElement('p');n.className='book-order-status';n.setAttribute('data-paymongo-status','');n.setAttribute('role','status');n.setAttribute('aria-live','polite');
    var actions=card.querySelector('.book-order-actions');if(actions)actions.insertAdjacentElement('afterend',n);else card.appendChild(n);
    return n;
  }

  function style(){
    if(document.getElementById('paymongoBookStyle'))return;
    var s=document.createElement('style');s.id='paymongoBookStyle';
    s.textContent='.paymongo-note{margin:10px 0 0!important;font:11px/1.5 system-ui,-apple-system,sans-serif!important;color:#756554!important}.paymongo-fallback{display:none!important}.paymongo-fallback[data-show]{display:inline-flex!important}.book-order-actions a[data-paymongo]{display:inline-flex;align-items:center;justify-content:center;gap:6px}.book-order-actions a[data-paymongo][aria-busy="true"]{opacity:.62;pointer-events:none}';
    document.head.appendChild(s);
  }

  function enhance(){
    style();
    document.querySelectorAll('#bookOrderModal .book-order-card').forEach(function(card){
      var link=Array.prototype.find.call(card.querySelectorAll('.book-order-actions a.book-order-primary'),function(a){return /Payment\s*\/\s*proof instructions/i.test(a.textContent||'')||a.hasAttribute('data-paymongo')});
      if(!link||link.hasAttribute('data-paymongo'))return;
      var fallback=link.getAttribute('href')||'';
      link.setAttribute('data-paymongo','');link.setAttribute('data-fallback',fallback);link.setAttribute('href','#paymongo');link.textContent='Pay securely with PayMongo';
      var note=document.createElement('p');note.className='paymongo-note';note.textContent='Secure hosted checkout. QR Ph is available first; GCash, Maya and cards appear when enabled on the PayMongo account.';
      var actions=card.querySelector('.book-order-actions');if(actions)actions.insertAdjacentElement('afterend',note);
      if(fallback.indexOf('mailto:')===0){var manual=document.createElement('a');manual.className='book-order-secondary paymongo-fallback';manual.href=fallback;manual.textContent='Manual payment help';manual.setAttribute('data-manual-pay','');actions&&actions.appendChild(manual)}
    });
  }

  async function start(link){
    if(busy)return;var card=link.closest('.book-order-card'),id=orderId(card),status=statusNode(card);if(!id){status.textContent='This order could not be identified. Please close this window and open the order again.';return}
    busy=true;link.setAttribute('aria-busy','true');status.textContent='Opening secure PayMongo checkout…';
    try{
      var d=await api('create_checkout',{order_id:id});
      if(!d.checkout_url||!/^https:\/\/checkout\.paymongo\.com\//.test(d.checkout_url))throw new Error('paymongo_unavailable');
      status.textContent='Redirecting to PayMongo…';location.assign(d.checkout_url);
    }catch(err){
      var map={paymongo_not_configured:'PayMongo is prepared but the merchant API key has not been connected yet.',paymongo_unavailable:'PayMongo checkout is temporarily unavailable. You can use manual payment help instead.',sign_in_required:'Your secure order session expired. Close this window and reopen the order.',forbidden:'Your secure order session expired. Close this window and reopen the order.'};
      status.textContent=map[err.message]||'Secure checkout could not be opened. Please try again.';
      var fallback=card.querySelector('.paymongo-fallback');if(fallback)fallback.setAttribute('data-show','');
      busy=false;link.removeAttribute('aria-busy');
    }
  }

  document.addEventListener('click',function(e){var link=e.target.closest('a[data-paymongo]');if(!link)return;e.preventDefault();start(link)});
  enhance();
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
})();
