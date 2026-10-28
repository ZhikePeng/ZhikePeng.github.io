(() => {
  const previousSections = {
    '#research': '/research/',
    '#background': '/#about',
  };
  if (location.pathname === '/' && previousSections[location.hash]) {
    location.replace(previousSections[location.hash]);
    return;
  }
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : system.matches;
  function updateThemeButton() {
    if (!toggle) return;
    toggle.textContent = isDark() ? 'Light' : 'Dark';
    toggle.setAttribute('aria-label', `Switch to ${isDark() ? 'light' : 'dark'} theme`);
  }
  if (toggle) {
    toggle.hidden = false;
    updateThemeButton();
    toggle.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('zp-theme', root.dataset.theme); } catch {}
      updateThemeButton();
    });
    system.addEventListener('change', updateThemeButton);
  }
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
