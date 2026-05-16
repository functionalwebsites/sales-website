// Site builder editor-canvas. Loaded by build/index.html in dependency order.
let _projectData = null;

function openEditor(id, options = {}) {
  document.body.classList.add('editor-mode');
  STATE.currentProjectId = id;
  clearBuilderSelection();
  _projectData = getProjectData(id);
  const maxPageIndex = Math.max((_projectData.pages || []).length - 1, 0);
  STATE.currentPageIndex = Math.min(Math.max(Number(options.pageIndex) || 0, 0), maxPageIndex);
  applyBuilderSelectionFromUrl(options.selection);
  setProjectIdInUrl(id, STATE.currentPageIndex);
  _resetUndo();
  setSaveStatus('saved');

  document.getElementById('editor-project-name').textContent = _projectData.name;

  // Start in visual mode
  switchEditorMode('visual');
  applyBuilderPanelState();
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
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  clearBuilderSelection();
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
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
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

async function deletePage(i) {
  if (_projectData.pages.length <= 1) { toast('Cannot delete the only page', 'error'); return; }
  const page = _projectData.pages[i];
  const confirmed = await showBuilderDialog({
    title: 'Delete Page',
    message: `Delete "${page?.name || 'this page'}"? This cannot be undone.`,
    confirmText: 'Delete Page',
    destructive: true
  });
  if (!confirmed) return;
  _projectData.pages.splice(i, 1);
  if (STATE.currentPageIndex >= _projectData.pages.length) STATE.currentPageIndex = _projectData.pages.length - 1;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
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
    const selected = STATE.selectedBlockId === block.id || STATE.selectedColumn?.parentId === block.id;
    return `<div class="layout-item${selected ? ' selected' : ''}" data-block-id="${block.id}" draggable="false" onclick="selectBlock('${block.id}', true)">
      <div class="layout-item-icon">${getBlockIcon(block.type)}</div>
      <div class="layout-item-info">
        <div class="layout-item-type">${index + 1}. ${block.type}</div>
        <div class="layout-item-slug">${slug}</div>
      </div>
      <div class="layout-item-actions">
        <button class="btn btn-ghost btn-sm layout-block-action" onclick="event.stopPropagation();moveBlock('${block.id}',-1)" title="Move up" aria-label="Move up">↑</button>
        <button class="btn btn-ghost btn-sm layout-block-action" onclick="event.stopPropagation();moveBlock('${block.id}',1)" title="Move down" aria-label="Move down">↓</button>
        <button class="btn btn-danger btn-sm layout-block-action" onclick="event.stopPropagation();removeBlock('${block.id}')" title="Delete" aria-label="Delete">×</button>
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
    return renderBlock(b, true);
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; cursor: default; }
.block-wrapper { position: relative; }
.block-wrapper:hover { outline: 3px dashed #b9482e; outline-offset: -3px; }
.block-wrapper.selected { outline: 3px solid #b9482e !important; outline-offset: -3px; }
.command-drag .block-wrapper:hover { cursor: grab !important; }
.command-drag .block-wrapper:active { cursor: grabbing !important; }
.block-wrapper.dragging { opacity: .45; }
.block-wrapper.drop-before { box-shadow: inset 0 4px 0 #b9482e; }
.block-wrapper.drop-after { box-shadow: inset 0 -4px 0 #b9482e; }
.fw-builder-column { min-height: 44px; position: relative; }
.fw-builder-column:hover { outline: 2px dashed #b9482e; outline-offset: -2px; }
.fw-builder-column.selected-column { outline: 3px solid #b9482e; outline-offset: -3px; }
.column-controls { position: absolute; top: 8px; left: 8px; display: none; gap: 6px; z-index: 998; padding: 5px; background: #f5efe0; border: 3px solid #10100d; box-shadow: 4px 4px 0 #10100d; }
.fw-builder-column.selected-column > .column-controls { display: flex; }
.block-controls { position: absolute; top: 8px; right: 8px; display: none; gap: 6px; z-index: 999; padding: 5px; background: #f5efe0; border: 3px solid #10100d; box-shadow: 4px 4px 0 #10100d; }
.block-wrapper:hover > .block-controls { display: flex; }
.block-ctrl-btn { width: 28px; height: 28px; border-radius: 4px; background: #f5efe0; color: #10100d; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace; font-size: 14px; font-weight: 900; cursor: pointer; border: 3px solid #10100d; box-shadow: 2px 2px 0 #10100d; line-height: 1; transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease, color .15s ease; }
.block-ctrl-btn:hover { background: #b9482e; color: #f5efe0; transform: translate(1px, 1px); box-shadow: 1px 1px 0 #10100d; }
.block-ctrl-danger { background: #b9482e; color: #f5efe0; }
[data-inline-edit] { cursor: text; }
[data-inline-edit]:hover { box-shadow: inset 0 -3px 0 rgba(185,72,46,.45); }
[data-inline-edit][contenteditable="true"] { outline: 3px solid #4b7f52; outline-offset: 3px; box-shadow: 4px 4px 0 rgba(16,16,13,.25); }
.block-resize-handle { position: absolute; z-index: 1000; background: #7cff6b; border: 2px solid #10100d; box-shadow: 2px 2px 0 #10100d; opacity: 0; transition: opacity .12s ease, transform .12s ease; }
.block-wrapper:hover > .block-resize-handle,
.block-wrapper.selected > .block-resize-handle,
.block-wrapper.resizing > .block-resize-handle { opacity: 1; }
.block-resize-y { left: 50%; bottom: 8px; width: 42px; height: 8px; transform: translateX(-50%); cursor: ns-resize; }
.block-resize-x { right: 8px; top: 50%; width: 8px; height: 42px; transform: translateY(-50%); cursor: ew-resize; }
.column-width-handle { position: absolute; top: 0; bottom: 0; width: 8px; transform: translateX(-50%); cursor: ew-resize; z-index: 997; }
.column-width-handle::after { content: ""; position: absolute; top: 14px; bottom: 14px; left: 2px; width: 4px; background: #7cff6b; border: 1px solid #10100d; box-shadow: 1px 1px 0 #10100d; opacity: 0; transition: opacity .12s ease; }
.fw-grid:hover > .column-width-handle::after,
.column-width-handle.resizing::after { opacity: 1; }
body.canvas-resizing, body.canvas-resizing * { user-select: none !important; }
.micro-props {
  position: absolute;
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: min(560px, calc(100vw - 16px));
  padding: 6px;
  background: #f5efe0;
  border: 3px solid #10100d;
  box-shadow: 5px 5px 0 #10100d;
  border-radius: 4px;
  flex-wrap: wrap;
}
.micro-props button,
.micro-props select {
  height: 30px;
  min-width: 30px;
  padding: 0 8px;
  background: #f5efe0;
  color: #10100d;
  border: 2px solid #10100d;
  border-radius: 3px;
  font: 900 12px/1 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  cursor: pointer;
}
.micro-props select { min-width: 70px; }
.micro-props input[type="color"] {
  width: 30px;
  height: 30px;
  padding: 2px;
  background: #f5efe0;
  border: 2px solid #10100d;
  border-radius: 3px;
  cursor: pointer;
}
.micro-props button:hover,
.micro-props select:hover,
.micro-props input[type="color"]:hover,
.micro-props .active {
  background: #7cff6b;
}
.micro-props-divider {
  width: 2px;
  align-self: stretch;
  background: #10100d;
  margin: 0 2px;
}
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

function microEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function microApply(blockId, key, value) {
  if (window.parent && typeof window.parent.applyCanvasMicroProp === 'function') {
    window.parent.applyCanvasMicroProp(blockId, key, value);
  }
}

function microButton(blockId, label, key, value, active, title) {
  return '<button type="button" class="' + (active ? 'active' : '') + '" title="' + microEscape(title || label) + '" data-micro-block="' + microEscape(blockId) + '" data-micro-key="' + microEscape(key) + '" data-micro-value="' + microEscape(value) + '">' + microEscape(label) + '</button>';
}

function microSelect(blockId, key, value, options, title) {
  return '<select title="' + microEscape(title || key) + '" data-micro-block="' + microEscape(blockId) + '" data-micro-key="' + microEscape(key) + '">' +
    options.map(function(option) {
      return '<option value="' + microEscape(option.value) + '"' + (String(value || '') === String(option.value) ? ' selected' : '') + '>' + microEscape(option.label) + '</option>';
    }).join('') +
    '</select>';
}

function microColor(blockId, key, value, title) {
  return '<input type="color" title="' + microEscape(title || 'Background color') + '" value="' + microEscape(value || '#ffffff') + '" data-micro-block="' + microEscape(blockId) + '" data-micro-key="' + microEscape(key) + '">';
}

function microDivider() {
  return '<span class="micro-props-divider" aria-hidden="true"></span>';
}

function buildMicroPropsHTML(blockId, config) {
  if (!config || !config.type) return '';
  var html = '';
  if (config.levels) {
    html += microSelect(blockId, 'level', config.level, config.levels, 'Heading level');
    html += microDivider();
  }
  if (config.textStyle) {
    html += microButton(blockId, 'B', 'fontWeight', config.fontWeight === '700' ? '400' : '700', config.fontWeight === '700', 'Bold');
    html += microButton(blockId, 'I', 'fontStyle', config.fontStyle === 'italic' ? 'normal' : 'italic', config.fontStyle === 'italic', 'Italic');
    html += microDivider();
  }
  if (config.align) {
    ['left', 'center', 'right'].forEach(function(align) {
      html += microButton(blockId, align === 'left' ? '←' : align === 'center' ? '↔' : '→', 'align', align, config.align === align, 'Align ' + align);
    });
    html += microDivider();
  }
  if (config.fitOptions) {
    html += microSelect(blockId, 'fit', config.fit, config.fitOptions, 'Image fit');
  }
  if (config.ratioOptions) {
    html += microSelect(blockId, 'aspectRatio', config.aspectRatio, config.ratioOptions, 'Aspect ratio');
  }
  if (typeof config.rounded === 'boolean') {
    html += microButton(blockId, '◱', 'rounded', !config.rounded, config.rounded, 'Rounded corners');
  }
  if (config.sizeOptions) {
    html += microSelect(blockId, 'size', config.size, config.sizeOptions, 'Button size');
  }
  if (config.bgSizeOptions) {
    html += microSelect(blockId, 'bgSize', config.bgSize, config.bgSizeOptions, 'Background size');
  }
  if (config.bgColorKey) {
    html += microColor(blockId, config.bgColorKey, config.bgColor, 'Background color');
  }
  return html.replace(new RegExp(microDivider() + '$'), '');
}

window.microApply = microApply;

window.hideMicroProps = function() {
  var existing = document.getElementById('micro-props');
  if (existing) existing.remove();
};

window.showMicroProps = function(blockId, config) {
  window.hideMicroProps();
  var wrapper = Array.from(document.querySelectorAll('[data-block-id]')).find(function(el) {
    return el.getAttribute('data-block-id') === String(blockId);
  });
  var html = buildMicroPropsHTML(blockId, config);
  if (!wrapper || !html) return;
  var toolbar = document.createElement('div');
  toolbar.id = 'micro-props';
  toolbar.className = 'micro-props';
  toolbar.innerHTML = html;
  toolbar.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    var button = event.target.closest('button[data-micro-key]');
    if (!button) return;
    window.microApply(button.dataset.microBlock, button.dataset.microKey, button.dataset.microValue);
  });
  toolbar.addEventListener('change', function(event) {
    event.preventDefault();
    event.stopPropagation();
    var control = event.target.closest('select[data-micro-key], input[data-micro-key]');
    if (!control) return;
    window.microApply(control.dataset.microBlock, control.dataset.microKey, control.value);
  });
  toolbar.addEventListener('input', function(event) {
    event.preventDefault();
    event.stopPropagation();
    var control = event.target.closest('input[type="color"][data-micro-key]');
    if (!control) return;
    window.microApply(control.dataset.microBlock, control.dataset.microKey, control.value);
  });
  toolbar.addEventListener('dblclick', function(event) { event.stopPropagation(); });
  document.body.appendChild(toolbar);
  var rect = wrapper.getBoundingClientRect();
  var toolbarRect = toolbar.getBoundingClientRect();
  var top = Math.max(8, rect.top + window.scrollY - toolbarRect.height - 10);
  var left = Math.min(Math.max(8, rect.left + window.scrollX + 8), Math.max(8, window.innerWidth - toolbarRect.width - 8));
  toolbar.style.top = top + 'px';
  toolbar.style.left = left + 'px';
};

function isCommandDragEvent(event) {
  return Boolean(event.metaKey || event.ctrlKey || commandDragActive);
}

function isEditableShortcutTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toLowerCase();
  return target.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
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
  if (isEditableShortcutTarget(event.target)) return;
  const key = String(event.key || '').toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === 's') {
    event.preventDefault();
    if (window.parent && typeof window.parent.saveProject === 'function') window.parent.saveProject();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey && key === 'z') {
    event.preventDefault();
    if (window.parent && typeof window.parent.undo === 'function') window.parent.undo();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && ((event.shiftKey && key === 'z') || key === 'y')) {
    event.preventDefault();
    if (window.parent && typeof window.parent.redo === 'function') window.parent.redo();
    return;
  }
  if (window.parent && typeof window.parent.handleBuilderShortcut === 'function' && window.parent.handleBuilderShortcut({
    key: event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey
  })) {
    event.preventDefault();
    return;
  }
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

let activeCanvasResize = null;

function px(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitPadding(value) {
  const parts = String(value || '').trim().split(/\\s+/).filter(Boolean);
  return {
    y: px(parts[0], 72),
    x: px(parts[1] || parts[0], 20),
  };
}

function getResizeTarget(wrapper) {
  return wrapper ? wrapper.querySelector('[data-fw-block]') : null;
}

function getInnerMaxWidthTarget(blockEl) {
  if (!blockEl) return null;
  return blockEl.querySelector('div[style*="max-width"]') || blockEl;
}

function applyCanvasResizePreview(active, next) {
  const blockEl = getResizeTarget(active.wrapper);
  if (!blockEl) return;
  const type = active.type;
  if (active.axis === 'y') {
    if (type === 'spacer') {
      blockEl.style.height = next.value;
      return;
    }
    if (type === 'hero') {
      blockEl.style.minHeight = next.value;
      return;
    }
    if (type === 'image') {
      const img = blockEl.querySelector('img');
      if (img) img.style.height = next.value;
      return;
    }
    blockEl.style.padding = next.value;
    return;
  }
  if (active.axis === 'x') {
    if (type === 'image') {
      const img = blockEl.querySelector('img');
      if (img) img.style.width = next.value;
      return;
    }
    const inner = getInnerMaxWidthTarget(blockEl);
    inner.style.maxWidth = next.value;
  }
}

function calculateCanvasResize(active, event) {
  const minHeight = active.type === 'spacer' ? 8 : 60;
  if (active.axis === 'y') {
    if (['section', 'columns2', 'columns3', 'cards', 'features', 'testimonialWall', 'cta', 'form', 'youtubeEmbed'].includes(active.type)) {
      const nextY = Math.max(16, Math.min(220, Math.round(active.startPaddingY + event.clientY - active.startY)));
      return { prop: 'padding', value: nextY + 'px ' + active.startPaddingX + 'px' };
    }
    const nextHeight = Math.max(minHeight, Math.min(1200, Math.round(active.startHeight + event.clientY - active.startY)));
    return { prop: active.type === 'hero' ? 'minHeight' : 'height', value: nextHeight + 'px' };
  }

  const nextWidth = Math.max(120, Math.min(1600, Math.round(active.startWidth + event.clientX - active.startX)));
  const prop = active.type === 'hero' ? 'contentWidth' : active.type === 'image' ? 'width' : 'maxWidth';
  return { prop, value: nextWidth + 'px' };
}

document.addEventListener('mousedown', function(event) {
  const handle = event.target.closest('.block-resize-handle');
  if (!handle) return;
  const wrapper = handle.closest('.block-wrapper');
  const blockEl = getResizeTarget(wrapper);
  if (!wrapper || !blockEl) return;
  event.preventDefault();
  event.stopPropagation();
  const type = wrapper.dataset.blockType || '';
  const axis = handle.dataset.resizeAxis || 'y';
  const rect = blockEl.getBoundingClientRect();
  const padding = splitPadding(blockEl.style.padding);
  activeCanvasResize = {
    wrapper,
    type,
    axis,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: axis === 'x' && type !== 'image' ? getInnerMaxWidthTarget(blockEl).getBoundingClientRect().width : rect.width,
    startHeight: rect.height,
    startPaddingY: padding.y,
    startPaddingX: padding.x
  };
  wrapper.classList.add('resizing');
  document.body.classList.add('canvas-resizing');
  if (window.parent && typeof window.parent.selectBlock === 'function') {
    window.parent.selectBlock(wrapper.getAttribute('data-block-id'), false, true);
  }
}, true);

document.addEventListener('mousemove', function(event) {
  if (!activeCanvasResize) return;
  event.preventDefault();
  const next = calculateCanvasResize(activeCanvasResize, event);
  applyCanvasResizePreview(activeCanvasResize, next);
  if (window.parent && typeof window.parent.updateCanvasResize === 'function') {
    window.parent.updateCanvasResize(activeCanvasResize.wrapper.getAttribute('data-block-id'), next);
  }
}, true);

document.addEventListener('mouseup', function() {
  if (!activeCanvasResize) return;
  activeCanvasResize.wrapper.classList.remove('resizing');
  activeCanvasResize = null;
  document.body.classList.remove('canvas-resizing');
  if (window.parent && typeof window.parent.finishCanvasResize === 'function') window.parent.finishCanvasResize();
}, true);

let activeColumnResize = null;

function parseRatios(value) {
  return String(value || '').split(',').map(part => Number.parseFloat(part)).filter(value => Number.isFinite(value) && value > 0);
}

function ratiosToTemplate(ratios) {
  return ratios.map(value => Math.max(0.5, value).toFixed(2) + 'fr').join(' ');
}

function positionColumnHandles(grid, ratios) {
  const total = ratios.reduce((sum, value) => sum + value, 0) || ratios.length;
  let running = 0;
  grid.querySelectorAll('.column-width-handle').forEach((handle, index) => {
    running += ratios[index] || 1;
    handle.style.left = ((running / total) * 100) + '%';
    handle.dataset.columnRatios = ratios.join(',');
  });
}

document.addEventListener('mousedown', function(event) {
  const handle = event.target.closest('.column-width-handle');
  if (!handle) return;
  const wrapper = handle.closest('.block-wrapper');
  const grid = handle.closest('.fw-grid');
  if (!wrapper || !grid) return;
  event.preventDefault();
  event.stopPropagation();
  const ratios = parseRatios(handle.dataset.columnRatios);
  const index = Number(handle.dataset.columnResizeIndex);
  if (!ratios.length || index < 0 || index >= ratios.length - 1) return;
  activeColumnResize = {
    wrapper,
    grid,
    handle,
    index,
    ratios,
    startX: event.clientX,
    width: grid.getBoundingClientRect().width,
  };
  handle.classList.add('resizing');
  document.body.classList.add('canvas-resizing');
  if (window.parent && typeof window.parent.selectBlock === 'function') {
    window.parent.selectBlock(wrapper.getAttribute('data-block-id'), false, true);
  }
}, true);

document.addEventListener('mousemove', function(event) {
  if (!activeColumnResize) return;
  event.preventDefault();
  const total = activeColumnResize.ratios.reduce((sum, value) => sum + value, 0) || activeColumnResize.ratios.length;
  const deltaRatio = ((event.clientX - activeColumnResize.startX) / Math.max(1, activeColumnResize.width)) * total;
  const ratios = activeColumnResize.ratios.slice();
  const left = Math.max(0.5, activeColumnResize.ratios[activeColumnResize.index] + deltaRatio);
  const right = Math.max(0.5, activeColumnResize.ratios[activeColumnResize.index + 1] - deltaRatio);
  ratios[activeColumnResize.index] = left;
  ratios[activeColumnResize.index + 1] = right;
  const template = ratiosToTemplate(ratios);
  activeColumnResize.grid.style.gridTemplateColumns = template;
  positionColumnHandles(activeColumnResize.grid, ratios);
  if (window.parent && typeof window.parent.updateColumnWidths === 'function') {
    window.parent.updateColumnWidths(activeColumnResize.wrapper.getAttribute('data-block-id'), template);
  }
}, true);

document.addEventListener('mouseup', function() {
  if (!activeColumnResize) return;
  activeColumnResize.handle.classList.remove('resizing');
  activeColumnResize = null;
  document.body.classList.remove('canvas-resizing');
  if (window.parent && typeof window.parent.finishCanvasResize === 'function') window.parent.finishCanvasResize();
}, true);

function selectEditableText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function getInlineEditValue(el) {
  return el.dataset.inlineMode === 'html' ? el.innerHTML : el.textContent;
}

function commitInlineEdit(el) {
  const wrapper = el.closest('[data-block-id]');
  if (!wrapper || !window.parent || typeof window.parent.updateInlineText !== 'function') return;
  let value = getInlineEditValue(el);
  if (el.dataset.inlineList === 'testimonials' && el.dataset.inlineKey === 'quote') {
    value = value.replace(/^[\\s"“”'‘’]+|[\\s"“”'‘’]+$/g, '');
  }
  window.parent.updateInlineText(wrapper.getAttribute('data-block-id'), {
    prop: el.dataset.inlineProp || '',
    list: el.dataset.inlineList || '',
    index: el.dataset.inlineIndex || '',
    key: el.dataset.inlineKey || '',
    mode: el.dataset.inlineMode || 'text',
    value
  });
}

document.addEventListener('dblclick', function(event) {
  const editable = event.target.closest('[data-inline-edit]');
  if (!editable) return;
  event.preventDefault();
  event.stopPropagation();
  const wrapper = editable.closest('[data-block-id]');
  if (wrapper && window.parent && typeof window.parent.selectBlock === 'function') {
    window.parent.selectBlock(wrapper.getAttribute('data-block-id'), false, true);
  }
  editable.setAttribute('contenteditable', 'true');
  editable.focus();
  selectEditableText(editable);
}, true);

document.addEventListener('input', function(event) {
  const editable = event.target.closest('[data-inline-edit][contenteditable="true"]');
  if (!editable) return;
  commitInlineEdit(editable);
}, true);

document.addEventListener('keydown', function(event) {
  const editable = event.target.closest('[data-inline-edit][contenteditable="true"]');
  if (!editable) return;
  if (event.key === 'Escape') {
    editable.blur();
    return;
  }
  if (event.key === 'Enter' && editable.dataset.inlineMode !== 'html') {
    event.preventDefault();
    editable.blur();
  }
}, true);

document.addEventListener('blur', function(event) {
  const editable = event.target.closest('[data-inline-edit][contenteditable="true"]');
  if (!editable) return;
  commitInlineEdit(editable);
  editable.removeAttribute('contenteditable');
  if (window.parent && typeof window.parent.finishInlineTextEdit === 'function') {
    window.parent.finishInlineTextEdit();
  }
}, true);

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
        doc.querySelectorAll('.fw-builder-column').forEach(el => el.classList.remove('selected-column'));
        const sel = doc.querySelector(`[data-block-id="${STATE.selectedBlockId}"]`);
        if (sel) sel.classList.add('selected');
        iframe.contentWindow?.showMicroProps?.(STATE.selectedBlockId, getCanvasMicroPropsConfig(STATE.selectedBlockId));
      } catch(e) {}
    }
    if (STATE.selectedColumn) {
      try {
        const doc = iframe.contentDocument;
        const col = doc.querySelector(`[data-column-parent="${STATE.selectedColumn.parentId}"][data-column-index="${STATE.selectedColumn.index}"]`);
        if (col) col.classList.add('selected-column');
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
    if (STATE.pendingScrollColumn) {
      const column = STATE.pendingScrollColumn;
      STATE.pendingScrollColumn = null;
      setTimeout(() => scrollCanvasToColumn(column.parentId, column.index), 50);
    }
  };
}

function scrollCanvasToBlock(id) {
  const wrap = document.querySelector('.canvas-wrap');
  const iframe = document.getElementById('canvas-iframe');
  const doc = iframe?.contentDocument;
  const target = doc?.querySelector(`[data-block-id="${id}"]`);
  if (!wrap || !iframe || !target) return;
  const wrapRect = wrap.getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop = iframeRect.top + targetRect.top;
  const targetBottom = targetTop + targetRect.height;
  if (targetTop >= wrapRect.top + 16 && targetBottom <= wrapRect.bottom - 16) return;
  const top = wrap.scrollTop + (iframeRect.top - wrapRect.top) + targetRect.top - 24;
  wrap.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function scrollCanvasToColumn(parentId, index) {
  const wrap = document.querySelector('.canvas-wrap');
  const iframe = document.getElementById('canvas-iframe');
  const doc = iframe?.contentDocument;
  const target = doc?.querySelector(`[data-column-parent="${parentId}"][data-column-index="${index}"]`);
  if (!wrap || !iframe || !target) return;
  const wrapRect = wrap.getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop = iframeRect.top + targetRect.top;
  const targetBottom = targetTop + targetRect.height;
  if (targetTop >= wrapRect.top + 16 && targetBottom <= wrapRect.bottom - 16) return;
  const top = wrap.scrollTop + (iframeRect.top - wrapRect.top) + targetRect.top - 24;
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
  STATE.selectedColumn = null;
  STATE.pendingScrollBlockId = id;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
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
  clearBuilderSelection();
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  try {
    const doc = document.getElementById('canvas-iframe').contentDocument;
    doc.querySelectorAll('.block-wrapper').forEach(el => el.classList.remove('selected'));
    doc.querySelectorAll('.fw-builder-column').forEach(el => el.classList.remove('selected-column'));
    document.getElementById('canvas-iframe').contentWindow?.hideMicroProps?.();
  } catch(e) {}
  renderProps();
  renderLayoutList();
  // On mobile return to canvas tab after deselecting
  if (isMobile() && STATE.mobileTab === 'props') switchMobileTab('canvas');
};

window.selectBlock = function(id, scrollToBlock = false, stayOnCanvas = false) {
  STATE.selectedBlockId = id;
  STATE.selectedColumn = null;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  // Highlight in iframe
  try {
    const iframe = document.getElementById('canvas-iframe');
    const doc = iframe.contentDocument;
    doc.querySelectorAll('.block-wrapper').forEach(el => el.classList.remove('selected'));
    doc.querySelectorAll('.fw-builder-column').forEach(el => el.classList.remove('selected-column'));
    const sel = doc.querySelector(`[data-block-id="${id}"]`);
    if (sel) sel.classList.add('selected');
    iframe.contentWindow?.showMicroProps?.(id, getCanvasMicroPropsConfig(id));
  } catch(e) {}
  renderProps();
  renderLayoutList();
  if (scrollToBlock) scrollCanvasToBlock(id);
  // On mobile, automatically jump to the props panel
  if (isMobile() && !stayOnCanvas) switchMobileTab('props');
};

window.updateInlineText = function(blockId, edit) {
  const block = findBlockById(blockId);
  if (!block || !edit) return;
  pushUndoDebounced();
  if (!block.props) block.props = {};

  if (edit.list) {
    const list = block.props[edit.list];
    const index = Number(edit.index);
    if (!Array.isArray(list) || !list[index] || !edit.key) return;
    list[index][edit.key] = edit.value;
    if (block.brandLinks && block.brandLinks[edit.list]) delete block.brandLinks[edit.list];
  } else if (edit.prop) {
    block.props[edit.prop] = edit.value;
    if (block.brandLinks && block.brandLinks[edit.prop]) delete block.brandLinks[edit.prop];
  }

  STATE.selectedBlockId = blockId;
  STATE.selectedColumn = null;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderProps();
  renderLayoutList();
};

window.finishInlineTextEdit = function() {
  renderCanvas();
  renderLayoutList();
  renderProps();
};

window.updateCanvasResize = function(blockId, next) {
  const block = findBlockById(blockId);
  if (!block || !next?.prop) return;
  pushUndoDebounced();
  if (!block.props) block.props = {};
  block.props[next.prop] = next.value;
  if (block.brandLinks && block.brandLinks[next.prop]) delete block.brandLinks[next.prop];
  STATE.selectedBlockId = blockId;
  STATE.selectedColumn = null;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderProps();
  renderLayoutList();
};

window.updateColumnWidths = function(blockId, template) {
  const block = findBlockById(blockId);
  if (!block || !['columns2', 'columns3'].includes(block.type)) return;
  pushUndoDebounced();
  if (!block.props) block.props = {};
  block.props.columnTemplate = template;
  STATE.selectedBlockId = blockId;
  STATE.selectedColumn = null;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderProps();
  renderLayoutList();
};

window.finishCanvasResize = function() {
  renderCanvas();
  renderLayoutList();
  renderProps();
};

function getCanvasMicroPropsConfig(blockId) {
  const block = findBlockById(blockId);
  if (!block) return null;
  const p = block.props || {};
  const align = p.align || (block.type === 'hero' ? 'center' : 'left');
  const headingLevels = ['h1', 'h2', 'h3', 'h4'].map(value => ({ value, label: value.toUpperCase() }));
  const imageFits = ['contain', 'cover', 'fill', 'scale-down', 'none'].map(value => ({ value, label: value }));
  const ratios = [
    { value: '', label: 'free' },
    { value: '16 / 9', label: '16:9' },
    { value: '4 / 3', label: '4:3' },
    { value: '1 / 1', label: '1:1' },
    { value: '9 / 16', label: '9:16' },
  ];
  const buttonSizes = ['small', 'medium', 'large'].map(value => ({ value, label: value }));
  const bgSizes = ['cover', 'contain', 'auto', '100% auto', 'auto 100%'].map(value => ({ value, label: value }));

  if (block.type === 'heading') {
    return {
      type: block.type,
      levels: headingLevels,
      level: p.level || 'h2',
      textStyle: true,
      fontWeight: p.fontWeight || '700',
      fontStyle: p.fontStyle || 'normal',
      align,
    };
  }
  if (block.type === 'text') {
    return {
      type: block.type,
      textStyle: true,
      fontWeight: p.fontWeight || '400',
      fontStyle: p.fontStyle || 'normal',
      align,
    };
  }
  if (block.type === 'button') {
    return {
      type: block.type,
      textStyle: true,
      fontWeight: p.fontWeight || '600',
      fontStyle: p.fontStyle || 'normal',
      align: p.align || 'center',
      sizeOptions: buttonSizes,
      size: p.size || 'medium',
    };
  }
  if (block.type === 'image') {
    return {
      type: block.type,
      align: p.align || 'center',
      fitOptions: imageFits,
      fit: p.fit || 'contain',
      ratioOptions: ratios,
      aspectRatio: p.aspectRatio || '',
      rounded: Boolean(p.rounded),
    };
  }
  if (block.type === 'hero') {
    return {
      type: block.type,
      align: p.align || 'center',
      bgSizeOptions: bgSizes,
      bgSize: p.bgSize || 'cover',
      bgColorKey: 'bgColor',
      bgColor: p.bgColor || '#7c6af7',
    };
  }
  if (block.type === 'cta') {
    return {
      type: block.type,
      textStyle: true,
      fontWeight: p.fontWeight || '700',
      fontStyle: p.fontStyle || 'normal',
      align: p.align || 'center',
      bgColorKey: 'bgColor',
      bgColor: p.bgColor || '#7c6af7',
    };
  }
  if (block.type === 'cards' || block.type === 'features' || block.type === 'testimonialWall') {
    return {
      type: block.type,
      align: p.align || 'center',
      bgColorKey: 'bgColor',
      bgColor: p.bgColor || (block.type === 'testimonialWall' ? '#f5f8fc' : block.type === 'cards' ? '#f8f8f8' : '#ffffff'),
    };
  }
  if (block.type === 'columns2' || block.type === 'columns3' || block.type === 'section') {
    return {
      type: block.type,
      align: p.align || 'left',
      bgColorKey: 'bgColor',
      bgColor: p.bgColor || '#ffffff',
    };
  }
  if (block.type === 'form') {
    return {
      type: block.type,
      bgColorKey: 'bgColor',
      bgColor: p.bgColor || '#f8f8f8',
    };
  }
  if (block.type === 'youtubeEmbed') {
    return {
      type: block.type,
      bgColorKey: 'sectionBg',
      bgColor: p.sectionBg || '#ffffff',
    };
  }
  return null;
}

window.applyCanvasMicroProp = function(blockId, key, value) {
  const block = findBlockById(blockId);
  if (!block || !key) return;
  pushUndoDebounced();
  if (!block.props) block.props = {};
  block.props[key] = value;
  if (block.brandLinks && block.brandLinks[key]) delete block.brandLinks[key];
  STATE.selectedBlockId = blockId;
  STATE.selectedColumn = null;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderCanvas();
  renderLayoutList();
  renderProps();
};

window.selectColumn = function(parentId, index, scrollToColumn = false) {
  const parent = findBlockById(parentId);
  const columnIndex = Number(index);
  if (!parent || !Array.isArray(parent.props?.columns) || !Array.isArray(parent.props.columns[columnIndex])) return;
  STATE.selectedBlockId = null;
  STATE.selectedColumn = { parentId, index: columnIndex };
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  try {
    const iframe = document.getElementById('canvas-iframe');
    const doc = iframe.contentDocument;
    doc.querySelectorAll('.block-wrapper').forEach(el => el.classList.remove('selected'));
    doc.querySelectorAll('.fw-builder-column').forEach(el => el.classList.remove('selected-column'));
    const sel = doc.querySelector(`[data-column-parent="${parentId}"][data-column-index="${columnIndex}"]`);
    if (sel) {
      sel.classList.add('selected-column');
      if (scrollToColumn) sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch(e) {}
  renderProps();
  renderLayoutList();
  if (isMobile()) switchMobileTab('props');
};

window.moveBlock = function(id, dir) {
  const ctx = findBlockContext(id);
  if (!ctx) return;
  const blocks = ctx.blocks;
  const idx = ctx.index;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= blocks.length) return;
  pushUndo();
  const tmp = blocks[idx];
  blocks[idx] = blocks[newIdx];
  blocks[newIdx] = tmp;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderCanvas();
  renderLayoutList();
  renderProps();
};

window.removeBlock = function(id) {
  const ctx = findBlockContext(id);
  if (!ctx) return;
  pushUndo();
  ctx.blocks.splice(ctx.index, 1);
  if (STATE.selectedBlockId === id) STATE.selectedBlockId = null;
  if (STATE.selectedColumn?.parentId === id) STATE.selectedColumn = null;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderCanvas();
  renderLayoutList();
  renderProps();
};
