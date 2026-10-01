/* Apply the saved palette before first paint, then wire the visible switch. */
(() => {
  'use strict';
  const root = document.documentElement;
  let mode = 'green';
  try { mode = localStorage.getItem('portfolio-colour-mode') === 'white' ? 'white' : 'green'; } catch {}
  root.dataset.theme = mode;
  function sync() {
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.setAttribute('aria-checked', String(mode === 'white'));
      button.title = mode === 'white' ? 'Switch to dark green' : 'Switch to all white';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'white' ? '#ffffff' : (document.body?.classList.contains('resume-page-view') ? '#f3f3e9' : '#111713');
  }
  function apply(next) {
    mode = next;
    root.dataset.theme = mode;
    sync();
    document.dispatchEvent(new Event('portfolio:theme-change'));
  }
  document.addEventListener('DOMContentLoaded', () => {
    sync();
    document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click', () => {
      apply(mode === 'white' ? 'green' : 'white');
      try { localStorage.setItem('portfolio-colour-mode', mode); } catch {}
    }));
  }, { once: true });
  addEventListener('storage', event => {
    if (event.key === 'portfolio-colour-mode') apply(event.newValue === 'white' ? 'white' : 'green');
  });
})();
