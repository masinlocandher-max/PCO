/* CV temporarily private while the portfolio is being redesigned.
   The previous public CV implementation is preserved on the archive branch:
   archive/cv-before-lock-2026-09-09
*/
(function () {
  'use strict';
  if (window.location.hash === '#cv') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
})();
