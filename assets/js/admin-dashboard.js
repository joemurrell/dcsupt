(function () {
  const sectionSelect = document.getElementById('section-select');
  const pathSelect = document.getElementById('path-select');
  const itemList = document.getElementById('item-list');
  const linkList = document.getElementById('link-list');
  const itemForm = document.getElementById('item-form');
  const linkForm = document.getElementById('link-form');
  const itemSectionSelect = document.getElementById('item-section-select');
  const itemPathSelect = document.getElementById('item-path-select');
  const message = document.getElementById('admin-message');

  if (!sectionSelect || !pathSelect || !itemList || !itemForm) return;

  const state = {
    model: null,
    selectedItemId: null,
    selectedLinkId: null,
    draggingId: null
  };

  const api = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
      window.location.href = '/admin/login.html';
      return null;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  };

  const setMessage = (text) => {
    message.textContent = text;
  };

  const selectedSectionId = () => Number(sectionSelect.value || 0);
  const selectedPathId = () => {
    const value = pathSelect.value;
    return value ? Number(value) : null;
  };

  const pathsForSection = (sectionId) =>
    (state.model.learningPaths || []).filter((path) => path.sectionId === sectionId);

  const itemsForSelection = () => {
    const sectionId = selectedSectionId();
    const pathId = selectedPathId();
    return (state.model.contentItems || [])
      .filter((item) => item.sectionId === sectionId)
      .filter((item) => (pathId === null ? item.learningPathId === null : item.learningPathId === pathId))
      .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
  };

  const linksForItem = (itemId) =>
    (state.model.contentLinks || [])
      .filter((link) => link.itemId === itemId)
      .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);

  const fillSectionDropdowns = () => {
    const sections = state.model.sections || [];
    const renderOptions = sections
      .map((section) => `<option value="${section.id}">${section.title} (${section.slug})</option>`)
      .join('');

    sectionSelect.innerHTML = renderOptions;
    itemSectionSelect.innerHTML = renderOptions;
  };

  const fillPathDropdowns = () => {
    const sectionId = selectedSectionId();
    const paths = pathsForSection(sectionId);

    pathSelect.innerHTML = '<option value="">No Path</option>' + paths
      .map((path) => `<option value="${path.id}">${path.title}</option>`)
      .join('');

    itemPathSelect.innerHTML = '<option value="">No Path</option>' + paths
      .map((path) => `<option value="${path.id}">${path.title}</option>`)
      .join('');
  };

  const renderItems = () => {
    const items = itemsForSelection();
    itemList.innerHTML = '';

    for (const item of items) {
      const li = document.createElement('li');
      li.className = 'admin-list-item';
      li.draggable = true;
      li.dataset.id = String(item.id);
      li.innerHTML = `
        <div>
          <strong>${item.title}</strong>
          <div class="small">${item.contentType} • ${item.difficulty} • ${item.status}</div>
        </div>
      `;

      li.addEventListener('click', () => selectItem(item.id));
      li.addEventListener('dragstart', () => {
        state.draggingId = item.id;
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => {
        state.draggingId = null;
        li.classList.remove('dragging');
      });
      li.addEventListener('dragover', (event) => event.preventDefault());
      li.addEventListener('drop', (event) => {
        event.preventDefault();
        if (!state.draggingId || state.draggingId === item.id) return;

        const current = itemsForSelection();
        const fromIndex = current.findIndex((entry) => entry.id === state.draggingId);
        const toIndex = current.findIndex((entry) => entry.id === item.id);
        if (fromIndex < 0 || toIndex < 0) return;

        const [moved] = current.splice(fromIndex, 1);
        current.splice(toIndex, 0, moved);
        current.forEach((entry, index) => { entry.orderIndex = index; });
        renderItems();
      });

      if (item.id === state.selectedItemId) li.classList.add('selected');
      itemList.appendChild(li);
    }
  };

  const renderLinks = () => {
    linkList.innerHTML = '';
    if (!state.selectedItemId) return;

    for (const link of linksForItem(state.selectedItemId)) {
      const li = document.createElement('li');
      li.className = 'admin-list-item';
      li.innerHTML = `<div><strong>${link.title}</strong><div class="small">${link.url}</div></div>`;
      li.addEventListener('click', () => {
        state.selectedLinkId = link.id;
        linkForm.id.value = String(link.id);
        linkForm.title.value = link.title;
        linkForm.url.value = link.url;
      });
      linkList.appendChild(li);
    }
  };

  const clearItemForm = () => {
    itemForm.reset();
    itemForm.id.value = '';
    itemForm.sectionId.value = String(selectedSectionId());
    itemForm.learningPathId.value = pathSelect.value;
    state.selectedItemId = null;
    state.selectedLinkId = null;
    linkForm.reset();
    linkForm.id.value = '';
    renderItems();
    renderLinks();
  };

  const selectItem = (itemId) => {
    const item = (state.model.contentItems || []).find((entry) => entry.id === itemId);
    if (!item) return;

    state.selectedItemId = item.id;
    itemForm.id.value = String(item.id);
    itemForm.title.value = item.title;
    itemForm.description.value = item.description || '';
    itemForm.contentType.value = item.contentType || 'video';
    itemForm.difficulty.value = item.difficulty || 'beginner';
    itemForm.duration.value = item.duration || '';
    itemForm.externalUrl.value = item.externalUrl || '';
    itemForm.status.value = item.status || 'published';
    itemForm.sectionId.value = String(item.sectionId);

    const paths = pathsForSection(item.sectionId);
    itemPathSelect.innerHTML = '<option value="">No Path</option>' + paths
      .map((path) => `<option value="${path.id}">${path.title}</option>`)
      .join('');
    itemForm.learningPathId.value = item.learningPathId ? String(item.learningPathId) : '';

    renderItems();
    renderLinks();
  };

  const fetchModel = async () => {
    state.model = await api('/api/admin/model');
    fillSectionDropdowns();
    if (state.model.sections[0]) {
      sectionSelect.value = String(state.model.sections[0].id);
      itemSectionSelect.value = String(state.model.sections[0].id);
    }
    fillPathDropdowns();
    clearItemForm();
  };

  sectionSelect.addEventListener('change', () => {
    fillPathDropdowns();
    clearItemForm();
  });

  pathSelect.addEventListener('change', () => {
    clearItemForm();
  });

  itemSectionSelect.addEventListener('change', () => {
    const sectionId = Number(itemSectionSelect.value || 0);
    const paths = pathsForSection(sectionId);
    itemPathSelect.innerHTML = '<option value="">No Path</option>' + paths
      .map((path) => `<option value="${path.id}">${path.title}</option>`)
      .join('');
  });

  document.getElementById('new-section-btn').addEventListener('click', async () => {
    const title = window.prompt('Section title');
    if (!title) return;
    await api('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, orderIndex: state.model.sections.length, status: 'published' })
    });
    await fetchModel();
    setMessage('Section created.');
  });

  document.getElementById('new-path-btn').addEventListener('click', async () => {
    const title = window.prompt('Learning path title');
    if (!title) return;
    await api('/api/admin/learning-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        sectionId: selectedSectionId(),
        orderIndex: pathsForSection(selectedSectionId()).length,
        status: 'published'
      })
    });
    await fetchModel();
    setMessage('Learning path created.');
  });

  document.getElementById('new-item-btn').addEventListener('click', () => {
    clearItemForm();
    itemForm.title.focus();
  });

  itemForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      title: itemForm.title.value.trim(),
      description: itemForm.description.value.trim(),
      contentType: itemForm.contentType.value.trim() || 'video',
      difficulty: itemForm.difficulty.value,
      duration: itemForm.duration.value.trim(),
      externalUrl: itemForm.externalUrl.value.trim(),
      status: itemForm.status.value,
      sectionId: Number(itemForm.sectionId.value),
      learningPathId: itemForm.learningPathId.value ? Number(itemForm.learningPathId.value) : null,
      orderIndex: itemsForSelection().length
    };

    const id = itemForm.id.value;
    if (id) {
      await api(`/api/admin/content-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setMessage('Item updated.');
    } else {
      await api('/api/admin/content-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setMessage('Item created.');
    }

    await fetchModel();
  });

  document.getElementById('delete-item-btn').addEventListener('click', async () => {
    if (!itemForm.id.value) return;
    if (!window.confirm('Delete this item?')) return;

    await api(`/api/admin/content-items/${itemForm.id.value}`, { method: 'DELETE' });
    await fetchModel();
    setMessage('Item deleted.');
  });

  document.getElementById('save-order-btn').addEventListener('click', async () => {
    const items = itemsForSelection();
    await api('/api/admin/content-items/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId: selectedSectionId(),
        learningPathId: selectedPathId(),
        orderedIds: items.map((item) => item.id)
      })
    });
    await fetchModel();
    setMessage('Order saved.');
  });

  linkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.selectedItemId) {
      setMessage('Select an item first.');
      return;
    }

    const payload = {
      itemId: state.selectedItemId,
      title: linkForm.title.value.trim(),
      url: linkForm.url.value.trim(),
      orderIndex: linksForItem(state.selectedItemId).length
    };

    const id = linkForm.id.value;
    if (id) {
      await api(`/api/admin/content-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setMessage('Link updated.');
    } else {
      await api('/api/admin/content-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setMessage('Link created.');
    }

    linkForm.reset();
    linkForm.id.value = '';
    await fetchModel();
    if (state.selectedItemId) selectItem(state.selectedItemId);
  });

  document.getElementById('delete-link-btn').addEventListener('click', async () => {
    const id = linkForm.id.value;
    if (!id) return;
    await api(`/api/admin/content-links/${id}`, { method: 'DELETE' });
    linkForm.reset();
    linkForm.id.value = '';
    await fetchModel();
    if (state.selectedItemId) selectItem(state.selectedItemId);
    setMessage('Link deleted.');
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  fetchModel().catch((error) => {
    setMessage(error.message);
  });
})();
