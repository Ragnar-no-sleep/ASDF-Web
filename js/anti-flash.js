// Anti-flash: restore theme before first paint
// External script (CSP-safe via 'self') replaces the inline version
(function () {
  var t = localStorage.getItem('asdf-theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
  var v = localStorage.getItem('asdf-variant-' + (document.documentElement.dataset.page || ''));
  if (v) document.documentElement.setAttribute('data-variant', v);
  var d = localStorage.getItem('asdf-density-' + (document.documentElement.dataset.page || ''));
  if (d) document.documentElement.setAttribute('data-density', d);
})();
