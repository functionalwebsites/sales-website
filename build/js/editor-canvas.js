// Site builder editor-canvas. Loaded by build/index.html in dependency order.
let _projectData = null;

function openEditor(id) {
  document.body.classList.add('editor-mode');
  STATE.currentProjectId = id;
  STATE.currentPageIndex = 0;
  STATE.selectedBlockId = null;
  _projectData = getProjectData(id);
  _resetUndo();
  setSaveStatus('saved');

  document.getElementById('editor-project-name').textContent = _projectData.name;

  // Start in visual mode
  switchEditorMode('visual');
  renderPagesList();
  renderLayoutList();
  renderCanvas();
  renderProps();
  renderTemplatesSection();
  showView('editor');
}

function saveProject(silent = false) {
  if (!STATE.currentProjectId) return;
  setSaveStatus('saving');
  if (STATE.currentMode === 'code') applyCode();
  saveProjectData(STATE.currentProjectId, _projectData);
  const p = STATE.projects.find(p=>p.id===STATE.currentProjectId);
  if (p) {
    p.modified = Date.now();
    p.name = _projectData.name;
    saveProjectsMeta();
  }
  setSaveStatus('saved');
  if (!silent) toast('Saved!', 'success');
}

// ============================================================
// PAGES
// ============================================================
function renderPagesList() {
  const list = document.getElementById('pages-list');
  list.innerHTML = '';
  (_projectData.pages||[]).forEach((page, i) => {
    const item = document.createElement('div');
    item.className = 'page-item' + (i === STATE.currentPageIndex ? ' active' : '');
    item.innerHTML = `<span style="font-size:14px;color:var(--green);line-height:1;">▤</span><span class="page-item-name">${page.name}</span>`;
    item.onclick = () => switchPage(i);
    const ren = document.createElement('button');
    ren.className = 'btn-icon page-item-action';
    ren.innerHTML = '✎';
    ren.title = 'Rename page';
    ren.onclick = (e) => { e.stopPropagation(); renamePage(i); };
    item.appendChild(ren);
    if (i > 0) {
      const del = document.createElement('button');
      del.className = 'btn-icon page-item-action';
      del.innerHTML = '×';
      del.title = 'Delete page';
      del.onclick = (e) => { e.stopPropagation(); deletePage(i); };
      item.appendChild(del);
    }
    list.appendChild(item);
  });
  document.getElementById('page-url-display').textContent = _projectData.pages[STATE.currentPageIndex]?.slug + '.html';
}

function switchPage(i) {
  if (STATE.currentMode === 'code') applyCode();
  STATE.currentPageIndex = i;
  STATE.selectedBlockId = null;
  renderPagesList();
  renderLayoutList();
  renderCanvas();
  renderProps();
  if (STATE.currentMode === 'code') refreshCodeEditor();
}

function addPage() {
  document.getElementById('new-page-name').value = '';
  openModal('modal-add-page');
  setTimeout(()=>document.getElementById('new-page-name').focus(),100);
}

function confirmAddPage() {
  const name = document.getElementById('new-page-name').value.trim() || 'Page';
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-');
  _projectData.pages.push({ id: uid(), name, slug, blocks: [] });
  STATE.currentPageIndex = _projectData.pages.length - 1;
  closeModal('modal-add-page');
  renderPagesList();
  renderCanvas();
}

function renamePage(i) {
  const page = _projectData.pages[i];
  const name = prompt('Page name:', page.name);
  if (!name || name.trim() === page.name) return;
  page.name = name.trim();
  page.slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-') || 'page';
  pushUndoDebounced();
  renderPagesList();
  renderCanvas();
}

function deletePage(i) {
  if (_projectData.pages.length <= 1) { toast('Cannot delete the only page', 'error'); return; }
  _projectData.pages.splice(i, 1);
  if (STATE.currentPageIndex >= _projectData.pages.length) STATE.currentPageIndex = _projectData.pages.length - 1;
  renderPagesList();
  renderLayoutList();
  renderCanvas();
}

function switchLeftTab(tab) {
  document.getElementById('left-tab-add').classList.toggle('active', tab === 'add');
  document.getElementById('left-tab-layout').classList.toggle('active', tab === 'layout');
  document.getElementById('left-add-panel').classList.toggle('active', tab === 'add');
  document.getElementById('left-layout-panel').classList.toggle('active', tab === 'layout');
  if (tab === 'layout') renderLayoutList();
}

function getBlockIcon(type) {
  return {
    nav: '☰',
    hero: '★',
    heading: 'H',
    text: '¶',
    image: '▧',
    button: '□',
    section: '▭',
    columns2: '⊞',
    columns3: '⊟',
    divider: '─',
    spacer: '↕',
    cards: '▦',
    features: '✦',
    cta: 'ϟ',
    footer: '▬',
    form: '✉',
    youtubeEmbed: '▶',
    testimonialWall: '★',
    html: '</>'
  }[type] || '•';
}

function renderLayoutList() {
  const list = document.getElementById('layout-list');
  if (!list || !_projectData) return;
  const page = _projectData.pages[STATE.currentPageIndex];
  const blocks = page?.blocks || [];

  if (!blocks.length) {
    list.innerHTML = `<div class="text-muted text-sm" style="padding:10px 12px;">No blocks on this page yet.</div>`;
    return;
  }

  list.innerHTML = blocks.map((block, index) => {
    const slug = block.props?.anchor ? `#${block.props.anchor}` : 'No anchor';
    return `<div class="layout-item${STATE.selectedBlockId === block.id ? ' selected' : ''}" data-block-id="${block.id}" draggable="false" onclick="selectBlock('${block.id}', true)">
      <div class="layout-item-icon">${getBlockIcon(block.type)}</div>
      <div class="layout-item-info">
        <div class="layout-item-type">${index + 1}. ${block.type}</div>
        <div class="layout-item-slug">${slug}</div>
      </div>
      <div class="layout-item-actions">
        <button class="btn-icon" onclick="event.stopPropagation();moveBlock('${block.id}',-1)" title="Move up">↑</button>
        <button class="btn-icon" onclick="event.stopPropagation();moveBlock('${block.id}',1)" title="Move down">↓</button>
        <button class="btn-icon" onclick="event.stopPropagation();removeBlock('${block.id}')" title="Delete">×</button>
      </div>
    </div>`;
  }).join('');
  setupLayoutDrag();
  setCommandDragMode(_commandDragActive);
}

// ============================================================
// CANVAS
// ============================================================
function getCanvasHTML() {
  const page = _projectData.pages[STATE.currentPageIndex];
  const blocksHTML = (page.blocks||[]).map(b => {
    const html = renderBlock(b, true);
    return `<div data-block-id="${b.id}" class="block-wrapper" draggable="false" style="position:relative;cursor:pointer;" onclick="event.stopPropagation();window.parent.selectBlock('${b.id}')">${html}<div class="block-controls"><button class="block-ctrl-btn" onclick="event.stopPropagation();window.parent.moveBlock('${b.id}',-1)" title="Move up">↑</button><button class="block-ctrl-btn" onclick="event.stopPropagation();window.parent.moveBlock('${b.id}',1)" title="Move down">↓</button><button class="block-ctrl-btn" style="background:#e74c3c;" onclick="event.stopPropagation();window.parent.removeBlock('${b.id}')" title="Delete">✕</button></div></div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; cursor: default; }
.block-wrapper { position: relative; }
.block-wrapper:hover { outline: 2px dashed #7c6af7; outline-offset: -2px; }
.block-wrapper.selected { outline: 2px solid #7c6af7 !important; outline-offset: -2px; }
.command-drag .block-wrapper:hover { cursor: grab !important; }
.command-drag .block-wrapper:active { cursor: grabbing !important; }
.block-wrapper.dragging { opacity: .45; }
.block-wrapper.drop-before { box-shadow: inset 0 4px 0 #4ade80; }
.block-wrapper.drop-after { box-shadow: inset 0 -4px 0 #4ade80; }
.block-controls { position: absolute; top: 4px; right: 4px; display: none; gap: 4px; z-index: 999; }
.block-wrapper:hover .block-controls { display: flex; }
.block-ctrl-btn { width: 26px; height: 26px; border-radius: 4px; background: #7c6af7; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; border: none; }
${buildBrandCSS(_projectData)}
${buildStyleSystemCSS(_projectData)}
${buildSiteThemeCSS(_projectData)}
${buildGeneratedComponentCSS()}
${_projectData.globalCSS||''}
</style>
</head>
<body class="site-theme-${_projectData.siteTheme || 'light'}" onclick="window.parent.deselectBlock(event)">
${blocksHTML}
<script>
let commandDragActive = false;
let dragSourceId = null;

function isCommandDragEvent(event) {
  return Boolean(event.metaKey || event.ctrlKey || commandDragActive);
}

function setCommandDragActive(active) {
  commandDragActive = Boolean(active);
  document.body.classList.toggle('command-drag', commandDragActive);
  document.querySelectorAll('.block-wrapper').forEach(function(el) {
    el.draggable = commandDragActive;
  });
}

function clearDropMarkers() {
  document.querySelectorAll('.block-wrapper.drop-before,.block-wrapper.drop-after').forEach(function(el) {
    el.classList.remove('drop-before', 'drop-after');
  });
}

function getDropPlacement(event, target) {
  const rect = target.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

document.addEventListener('keydown', function(event) {
  if (event.metaKey || event.ctrlKey) setCommandDragActive(true);
});

document.addEventListener('keyup', function(event) {
  if (!event.metaKey && !event.ctrlKey) setCommandDragActive(false);
});

document.addEventListener('mousemove', function(event) {
  const active = Boolean(event.metaKey || event.ctrlKey);
  if (active !== commandDragActive) setCommandDragActive(active);
});

window.addEventListener('blur', function() {
  setCommandDragActive(false);
  clearDropMarkers();
});

document.addEventListener('dragstart', function(event) {
  const wrapper = event.target.closest('.block-wrapper');
  if (!wrapper || !isCommandDragEvent(event)) {
    event.preventDefault();
    return;
  }
  dragSourceId = wrapper.getAttribute('data-block-id');
  wrapper.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', dragSourceId);
});

document.addEventListener('dragover', function(event) {
  if (!dragSourceId) return;
  const target = event.target.closest('.block-wrapper');
  if (!target || target.getAttribute('data-block-id') === dragSourceId) return;
  event.preventDefault();
  clearDropMarkers();
  target.classList.add(getDropPlacement(event, target) === 'before' ? 'drop-before' : 'drop-after');
  event.dataTransfer.dropEffect = 'move';
});

document.addEventListener('drop', function(event) {
  if (!dragSourceId) return;
  const target = event.target.closest('.block-wrapper');
  if (!target) return;
  event.preventDefault();
  const targetId = target.getAttribute('data-block-id');
  const placement = getDropPlacement(event, target);
  clearDropMarkers();
  if (targetId && targetId !== dragSourceId && window.parent && typeof window.parent.reorderBlock === 'function') {
    window.parent.reorderBlock(dragSourceId, targetId, placement);
  }
});

document.addEventListener('dragend', function() {
  document.querySelectorAll('.block-wrapper.dragging').forEach(function(el) {
    el.classList.remove('dragging');
  });
  dragSourceId = null;
  clearDropMarkers();
});

document.addEventListener('click', function(event) {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const wrapper = link.closest('[data-block-id]');
  if (wrapper && window.parent && typeof window.parent.selectBlock === 'function') {
    window.parent.selectBlock(wrapper.getAttribute('data-block-id'));
  }
}, true);
document.addEventListener('submit', function(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}, true);
window.addEventListener('beforeunload', function(event) {
  event.preventDefault();
  event.returnValue = '';
});
<\/script>
<script>
${_projectData.globalJS||''}
<\/script>
</body>
</html>`;
}

function renderCanvas() {
  const iframe = document.getElementById('canvas-iframe');
  const html = getCanvasHTML();
  iframe.srcdoc = html;

  // Restore selected state after load
  iframe.onload = () => {
    if (STATE.selectedBlockId) {
      try {
        const doc = iframe.contentDocument;
        doc.querySelectorAll('.block-wrapper').forEach(el => el.classList.remove('selected'));
        const sel = doc.querySelector(`[data-block-id="${STATE.selectedBlockId}"]`);
        if (sel) sel.classList.add('selected');
      } catch(e) {}
    }
    setupCanvasAutoResize();
    updateCanvasIframeHeight();
    setCommandDragMode(_commandDragActive);
    if (STATE.pendingScrollBlockId) {
      const id = STATE.pendingScrollBlockId;
      STATE.pendingScrollBlockId = null;
      setTimeout(() => scrollCanvasToBlock(id), 50);
    }
  };
}

function scrollCanvasToBlock(id) {
  const wrap = document.querySelector('.canvas-wrap');
  const frame = document.getElementById('canvas-frame');
  const iframe = document.getElementById('canvas-iframe');
  const doc = iframe?.contentDocument;
  const target = doc?.querySelector(`[data-block-id="${id}"]`);
  if (!wrap || !frame || !target) return;
  const top = frame.offsetTop + target.offsetTop - 24;
  wrap.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function getCanvasContentHeight() {
  const iframe = document.getElementById('canvas-iframe');
  const doc = iframe?.contentDocument;
  if (!doc) return CANVAS_MIN_HEIGHT;
  const body = doc.body;
  const html = doc.documentElement;
  return Math.max(
    body?.scrollHeight || 0,
    body?.offsetHeight || 0,
    html?.scrollHeight || 0,
    html?.offsetHeight || 0,
    CANVAS_MIN_HEIGHT
  );
}

function updateCanvasIframeHeight() {
  const iframe = document.getElementById('canvas-iframe');
  if (!iframe) return;
  const nextHeight = getCanvasContentHeight();
  if (Math.abs(nextHeight - _lastCanvasHeight) < 1) return;
  _lastCanvasHeight = nextHeight;
  iframe.style.height = nextHeight + 'px';
}

function setupCanvasAutoResize() {
  const iframe = document.getElementById('canvas-iframe');
  const doc = iframe?.contentDocument;
  const body = doc?.body;
  if (!iframe || !doc || !body) return;

  if (_canvasBodyResizeObserver) _canvasBodyResizeObserver.disconnect();

  _canvasBodyResizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(updateCanvasIframeHeight);
  });

  _canvasBodyResizeObserver.observe(body);
  if (doc.documentElement) _canvasBodyResizeObserver.observe(doc.documentElement);
}

// ============================================================
// COMMAND-GATED DRAG REORDERING
// ============================================================
let _commandDragActive = false;
let _layoutDragSourceId = null;

function isCommandDragEvent(event) {
  return Boolean(event.metaKey || event.ctrlKey || _commandDragActive);
}

function setCommandDragMode(active) {
  _commandDragActive = Boolean(active);
  document.body.classList.toggle('command-drag', _commandDragActive);
  document.querySelectorAll('.layout-item[data-block-id]').forEach(item => {
    item.draggable = _commandDragActive;
  });
  try {
    const doc = document.getElementById('canvas-iframe')?.contentDocument;
    doc?.body?.classList.toggle('command-drag', _commandDragActive);
    doc?.querySelectorAll('.block-wrapper').forEach(item => {
      item.draggable = _commandDragActive;
    });
  } catch(e) {}
}

function clearLayoutDropMarkers() {
  document.querySelectorAll('.layout-item.drop-before,.layout-item.drop-after').forEach(item => {
    item.classList.remove('drop-before', 'drop-after');
  });
}

function getDropPlacement(event, target) {
  const rect = target.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

function setupLayoutDrag() {
  const list = document.getElementById('layout-list');
  if (!list || list.dataset.dragReady === 'true') return;
  list.dataset.dragReady = 'true';

  list.addEventListener('dragstart', event => {
    const item = event.target.closest('.layout-item[data-block-id]');
    if (!item || !isCommandDragEvent(event)) {
      event.preventDefault();
      return;
    }
    _layoutDragSourceId = item.dataset.blockId;
    item.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', _layoutDragSourceId);
  });

  list.addEventListener('dragover', event => {
    if (!_layoutDragSourceId) return;
    const item = event.target.closest('.layout-item[data-block-id]');
    if (!item || item.dataset.blockId === _layoutDragSourceId) return;
    event.preventDefault();
    clearLayoutDropMarkers();
    item.classList.add(getDropPlacement(event, item) === 'before' ? 'drop-before' : 'drop-after');
    event.dataTransfer.dropEffect = 'move';
  });

  list.addEventListener('drop', event => {
    if (!_layoutDragSourceId) return;
    const item = event.target.closest('.layout-item[data-block-id]');
    if (!item) return;
    event.preventDefault();
    const placement = getDropPlacement(event, item);
    const targetId = item.dataset.blockId;
    clearLayoutDropMarkers();
    reorderBlock(_layoutDragSourceId, targetId, placement);
  });

  list.addEventListener('dragend', () => {
    list.querySelectorAll('.layout-item.dragging').forEach(item => item.classList.remove('dragging'));
    _layoutDragSourceId = null;
    clearLayoutDropMarkers();
  });
}

function moveBlockToIndex(id, toIndex) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const fromIndex = page.blocks.findIndex(block => block.id === id);
  if (fromIndex < 0) return false;
  const boundedIndex = Math.max(0, Math.min(toIndex, page.blocks.length - 1));
  if (fromIndex === boundedIndex) return false;
  pushUndo();
  const [block] = page.blocks.splice(fromIndex, 1);
  page.blocks.splice(boundedIndex, 0, block);
  STATE.selectedBlockId = id;
  STATE.pendingScrollBlockId = id;
  renderCanvas();
  renderLayoutList();
  renderProps();
  return true;
}

window.reorderBlock = function(sourceId, targetId, placement = 'before') {
  if (!sourceId || !targetId || sourceId === targetId) return false;
  const page = _projectData.pages[STATE.currentPageIndex];
  const fromIndex = page.blocks.findIndex(block => block.id === sourceId);
  const targetIndex = page.blocks.findIndex(block => block.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return false;

  let insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
  if (fromIndex < insertIndex) insertIndex -= 1;
  return moveBlockToIndex(sourceId, insertIndex);
};

document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey) setCommandDragMode(true);
});

document.addEventListener('keyup', event => {
  if (!event.metaKey && !event.ctrlKey) setCommandDragMode(false);
});

document.addEventListener('mousemove', event => {
  const active = Boolean(event.metaKey || event.ctrlKey);
  if (active !== _commandDragActive) setCommandDragMode(active);
});

window.addEventListener('blur', () => {
  setCommandDragMode(false);
  clearLayoutDropMarkers();
});

// Called from iframe
// ============================================================
// MOBILE NAV
// ============================================================
function isMobile() { return window.innerWidth <= 767; }

function updateBackButton() {
  const backBtn = document.getElementById('editor-back-btn');
  if (!backBtn || !STATE.currentProjectId) return;

  const isMob = isMobile();
  const inNonCanvasTab = isMob && STATE.mobileTab && STATE.mobileTab !== 'canvas';

  if (inNonCanvasTab) {
    backBtn.innerHTML = '← Canvas';
    backBtn.onclick = () => switchMobileTab('canvas');
    backBtn.title = 'Back to Canvas';
  } else {
    backBtn.innerHTML = '← <span class="d-only">Dashboard</span>';
    backBtn.onclick = exitEditor;
    backBtn.title = 'Back to Dashboard';
  }
}

function switchMobileTab(tab) {
  STATE.mobileTab = tab;
  const left   = document.querySelector('.editor-left');
  const center = document.querySelector('.editor-center');
  const right  = document.querySelector('.editor-right');

  left.classList.remove('mob-active');
  right.classList.remove('mob-active');
  center.classList.remove('mob-hidden');

  if (tab === 'add')   { left.classList.add('mob-active');  center.classList.add('mob-hidden'); }
  if (tab === 'props') { right.classList.add('mob-active'); center.classList.add('mob-hidden'); }

  document.querySelectorAll('.mob-tab').forEach(b => b.classList.toggle('active', b.dataset.mob === tab));
  updateBackButton();
}

function toggleMobileOverflow(e) {
  e && e.stopPropagation();
  document.getElementById('mob-overflow-menu').classList.toggle('hidden');
}

function closeMobileOverflow() {
  document.getElementById('mob-overflow-menu').classList.add('hidden');
}

// Close overflow when clicking elsewhere
document.addEventListener('click', () => closeMobileOverflow());

window.deselectBlock = function(e) {
  STATE.selectedBlockId = null;
  try {
    const doc = document.getElementById('canvas-iframe').contentDocument;
    doc.querySelectorAll('.block-wrapper').forEach(el => el.classList.remove('selected'));
  } catch(e) {}
  renderProps();
  renderLayoutList();
  // On mobile return to canvas tab after deselecting
  if (isMobile() && STATE.mobileTab === 'props') switchMobileTab('canvas');
};

window.selectBlock = function(id, scrollToBlock = false) {
  STATE.selectedBlockId = id;
  // Highlight in iframe
  try {
    const iframe = document.getElementById('canvas-iframe');
    const doc = iframe.contentDocument;
    doc.querySelectorAll('.block-wrapper').forEach(el => el.classList.remove('selected'));
    const sel = doc.querySelector(`[data-block-id="${id}"]`);
    if (sel) sel.classList.add('selected');
  } catch(e) {}
  renderProps();
  renderLayoutList();
  if (scrollToBlock) scrollCanvasToBlock(id);
  // On mobile, automatically jump to the props panel
  if (isMobile()) switchMobileTab('props');
};

window.moveBlock = function(id, dir) {
  pushUndo();
  const page = _projectData.pages[STATE.currentPageIndex];
  const idx = page.blocks.findIndex(b=>b.id===id);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= page.blocks.length) return;
  const tmp = page.blocks[idx];
  page.blocks[idx] = page.blocks[newIdx];
  page.blocks[newIdx] = tmp;
  renderCanvas();
  renderLayoutList();
  renderProps();
};

window.removeBlock = function(id) {
  pushUndo();
  const page = _projectData.pages[STATE.currentPageIndex];
  page.blocks = page.blocks.filter(b=>b.id!==id);
  if (STATE.selectedBlockId === id) STATE.selectedBlockId = null;
  renderCanvas();
  renderLayoutList();
  renderProps();
};
