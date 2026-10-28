(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : system.matches;
  const updateLabel = () => toggle?.setAttribute('aria-label', `Switch to ${isDark() ? 'light' : 'dark'} theme`);
  if (toggle) {
    toggle.hidden = false;
    updateLabel();
    toggle.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('zp-theme', root.dataset.theme); } catch {}
      updateLabel();
    });
    system.addEventListener('change', updateLabel);
  }
  document.querySelectorAll('.mobile-menu nav a').forEach(a => {
    a.addEventListener('click', () => { a.closest('details').open = false; });
  });
  const menu = document.querySelector('.mobile-menu');
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', e => {
    if (menu?.open && !menu.contains(e.target)) menu.open = false;
  });
  if (navigator.clipboard && window.isSecureContext) {
    document.querySelectorAll('.copy-citation').forEach(button => {
      button.hidden = false;
      button.setAttribute('aria-live', 'polite');
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent);
          button.textContent = 'Copied';
        } catch { button.textContent = 'Select the citation to copy'; }
        window.setTimeout(() => { button.textContent = 'Copy BibTeX'; }, 2500);
      });
    });
  }
})();
