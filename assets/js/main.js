/* DCS UPT - site JS */
(function () {
  'use strict';

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      const expanded = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.textContent = expanded ? '[ X ]' : '[ MENU ]';
    });
  }

  // Live status strip Zulu time
  const zulu = document.querySelector('[data-zulu]');
  if (zulu) {
    const tick = () => {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const ss = String(now.getUTCSeconds()).padStart(2, '0');
      const dd = String(now.getUTCDate()).padStart(2, '0');
      const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
      zulu.textContent = `${dd}${month} ${hh}:${mm}:${ss}Z`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // Mark active nav link from current path
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const last = href.split('/').pop();
    if (last === path || (path === 'index.html' && (href === './' || href === 'index.html' || href === '/'))) {
      a.classList.add('active');
    }
    // Also handle relative paths from subpages
    if (a.dataset.section) {
      const section = a.dataset.section;
      if (window.location.pathname.includes(`/${section}/`) || window.location.pathname.includes(`${section}.html`)) {
        a.classList.add('active');
      }
    }
  });
})();
