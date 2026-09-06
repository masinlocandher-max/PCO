(function(){
  'use strict';

  /* Replace the earlier CSS-drawn placeholder cover with the current book
     campaign photography stored in the PCO repository. */
  var cover=document.querySelector('.book-cover');
  if(cover){
    cover.innerHTML='';
    cover.classList.add('real-image-cover');
    cover.style.padding='0';
    cover.style.border='0';
    cover.style.background='none';
    cover.style.aspectRatio='2 / 3';
    cover.style.width='min(430px,82vw)';
    cover.style.overflow='hidden';
    cover.style.boxShadow='0 45px 95px rgba(0,0,0,.52)';
    cover.style.transform='rotateY(-5deg) rotateX(1deg)';
    var image=document.createElement('img');
    image.src='../assets/img/book-author-portrait.webp';
    image.alt='Francine Marie Bautista with The Right Way to Live';
    image.width=360;
    image.height=540;
    image.decoding='async';
    image.fetchPriority='high';
    image.style.display='block';
    image.style.width='100%';
    image.style.height='100%';
    image.style.objectFit='cover';
    cover.appendChild(image);
  }

  /*
    Commerce hook.
    When a hosted checkout is ready, define window.FMB_BOOK_CHECKOUT_URL before
    this file loads and both purchase CTAs can be pointed to the verified flow.
    Until then the purchase card uses the explicit email purchase request.
  */
  var checkoutUrl=window.FMB_BOOK_CHECKOUT_URL||'';
  var purchase=document.getElementById('purchaseButton');
  var hero=document.getElementById('buyHero');

  if(checkoutUrl){
    [purchase,hero].forEach(function(link){
      if(!link)return;
      link.href=checkoutUrl;
      link.target='_blank';
      link.rel='noopener';
    });
  }
})();
