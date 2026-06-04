(function () {
  const container = document.getElementById('phase-content');
  if (!container) return;

  const page = document.documentElement;
  const phaseSlug = page.dataset.phaseSlug;
  const fallbackRaw = document.getElementById('phase-fallback-data');

  function levelClass(difficulty) {
    if (difficulty === 'advanced') return 'adv';
    if (difficulty === 'intermediate') return 'int';
    return 'beg';
  }

  function render(phase, isFallback) {
    const paths = phase.learningPaths || [];
    const items = phase.items || [];
    const links = phase.links || [];

    if (isFallback) {
      container.insertAdjacentHTML(
        'beforebegin',
        '<div class="read-only-banner">Read-only fallback mode: live CMS unavailable.</div>'
      );
    }

    if (!paths.length) {
      container.innerHTML = `
        <div class="placeholder">
          <div class="icon">[ STAND BY ]</div>
          <h3>Content Under Construction</h3>
          <p>No published learning paths for this phase yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = paths
      .map((path, pathIndex) => {
        const pathItems = items
          .filter((item) => item.learningPathId === path.id)
          .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);

        const itemMarkup = pathItems.length
          ? pathItems.map((item, itemIndex) => {
            const itemLinks = links
              .filter((link) => link.itemId === item.id)
              .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);

            const linksMarkup = itemLinks.length
              ? `<ul class="resource-links">${itemLinks.map((link) => `<li><a href="${link.url}" target="_blank" rel="noopener">${link.title}</a></li>`).join('')}</ul>`
              : '';

            return `
              <a href="${item.externalUrl || '#'}" class="resource" target="_blank" rel="noopener">
                <div class="marker">REF-${String(pathIndex + 1).padStart(2, '0')}${String(itemIndex + 1).padStart(2, '0')}</div>
                <div>
                  <div class="title">${item.title}</div>
                  <div class="channel">${(item.contentType || 'resource').toUpperCase()}</div>
                  <div class="desc">${item.description || ''}</div>
                  ${linksMarkup}
                </div>
                <div class="meta">
                  <span class="duration">${item.duration || '--:--'}</span>
                  <span class="level ${levelClass(item.difficulty)}">${(item.difficulty || 'beginner').toUpperCase()}</span>
                </div>
              </a>
            `;
          }).join('')
          : '<div class="placeholder"><p>No published items in this learning path yet.</p></div>';

        return `
          <section class="block">
            <div class="section-header">
              <span class="num">[ ${pathIndex + 1} ]</span>
              <h2>${path.title}</h2>
              <span class="sub">LEARNING PATH</span>
            </div>
            <div class="resource-group">
              <p style="color: var(--text); margin-bottom: 1.5rem; max-width: 70ch;">${path.description || ''}</p>
              <div class="resource-list">${itemMarkup}</div>
            </div>
          </section>
        `;
      })
      .join('');
  }

  async function fetchAndRender() {
    try {
      const response = await fetch(`/api/public/phase/${phaseSlug}`);
      if (!response.ok) throw new Error('Live data unavailable');
      const data = await response.json();
      render(data, false);
      return;
    } catch (_err) {
      if (!fallbackRaw) {
        container.innerHTML = '<div class="placeholder"><p>Unable to load content right now.</p></div>';
        return;
      }

      try {
        const fallbackData = JSON.parse(fallbackRaw.textContent);
        render(fallbackData, true);
      } catch (_parseError) {
        container.innerHTML = '<div class="placeholder"><p>Unable to load content right now.</p></div>';
      }
    }
  }

  fetchAndRender();
})();
