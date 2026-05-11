// Site builder library. Loaded by build/index.html in dependency order.
function saveBlockAsTemplate() {
  if (!STATE.selectedBlockId) { toast('Select a block first', 'error'); return; }
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===STATE.selectedBlockId);
  if (!block) return;
  const name = prompt('Template name:', `${block.type} template`);
  if (!name) return;
  if (!_projectData.templates) _projectData.templates = [];
  _projectData.templates.push({ id: uid(), name, block: JSON.parse(JSON.stringify(block)) });
  pushUndoDebounced();
  toast('Template saved!', 'success');
  renderTemplatesSection();
}

function saveSelectedBlockToLibrary() {
  if (!_projectData || !STATE.selectedBlockId) {
    toast('Select a block first.', 'error');
    return;
  }
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b => b.id === STATE.selectedBlockId);
  if (!block) return;
  const name = prompt('Custom block name:', `${block.type} block`);
  if (!name || !name.trim()) return;
  const description = prompt('Short description (optional):', '') || '';
  const category = prompt('Category label (optional):', 'Custom') || 'Custom';
  const library = getLibraryData();
  library.blocks.push({
    id: uid(),
    name: name.trim(),
    description: description.trim(),
    category: category.trim() || 'Custom',
    source: _projectData.name || 'Current Project',
    block: JSON.parse(JSON.stringify(block))
  });
  saveLibraryData(library);
  renderTemplatesSection();
  renderLibraryModal();
  toast('Custom block saved to library.', 'success');
}

function saveCurrentPageAsLibraryTemplate() {
  if (!_projectData) {
    toast('Open a website first.', 'error');
    return;
  }
  const page = _projectData.pages[STATE.currentPageIndex];
  if (!page) return;
  const name = prompt('Website template name:', `${_projectData.name} template`);
  if (!name || !name.trim()) return;
  const description = prompt('Short description (optional):', '') || '';
  const projectClone = JSON.parse(JSON.stringify(_projectData));
  const pageClone = JSON.parse(JSON.stringify(page));
  projectClone.pages = [Object.assign({}, pageClone, { name: 'Home', slug: 'index' })];
  const library = getLibraryData();
  library.pageTemplates.push({
    id: uid(),
    name: name.trim(),
    description: description.trim(),
    source: _projectData.name || 'Current Project',
    projectData: projectClone
  });
  saveLibraryData(library);
  renderNewProjectTemplateOptions();
  renderLibraryModal();
  toast('Website template saved to library.', 'success');
}

function deleteTemplate(templateId) {
  if (!confirm('Delete this template?')) return;
  _projectData.templates = (_projectData.templates||[]).filter(t => t.id !== templateId);
  pushUndoDebounced();
  toast('Template deleted', 'success');
  renderTemplatesSection();
}

function addTemplateBlock(templateId) {
  const template = (_projectData.templates||[]).find(t => t.id === templateId);
  if (!template) return;
  pushUndo();
  const page = _projectData.pages[STATE.currentPageIndex];
  const newBlock = JSON.parse(JSON.stringify(template.block));
  newBlock.id = uid();
  page.blocks.push(newBlock);
  STATE.selectedBlockId = newBlock.id;
  STATE.selectedColumn = null;
  STATE.pendingScrollBlockId = newBlock.id;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderCanvas();
  renderLayoutList();
  renderProps();
  renderTemplatesSection();
  toast(`Added "${template.name}"`, 'success');
  if (isMobile()) switchMobileTab('canvas');
}

function addLibraryBlock(libraryBlockId) {
  if (!_projectData) {
    toast('Open a website first.', 'error');
    return;
  }
  const entry = getLibraryData().blocks.find(item => item.id === libraryBlockId);
  if (!entry) {
    toast('That custom block pack item is no longer installed.', 'error');
    return;
  }
  const page = _projectData.pages[STATE.currentPageIndex];
  const newBlock = JSON.parse(JSON.stringify(entry.block));
  pushUndo();
  newBlock.id = uid();
  page.blocks.push(newBlock);
  STATE.selectedBlockId = newBlock.id;
  STATE.selectedColumn = null;
  STATE.pendingScrollBlockId = newBlock.id;
  setProjectIdInUrl(STATE.currentProjectId, STATE.currentPageIndex);
  renderCanvas();
  renderLayoutList();
  renderProps();
  closeModal('modal-library');
  toast(`Added "${entry.name}"`, 'success');
  if (isMobile()) switchMobileTab('canvas');
}

function renderTemplatesSection() {
  const section = document.getElementById('templates-section');
  const templates = _projectData?.templates || [];
  const library = getLibraryData();
  let html = '';

  if (library.blocks.length) {
    html += `<div class="blocks-section">
      <div class="blocks-section-label">Custom Block Packs</div>`;
    library.blocks.forEach(item => {
      const meta = [item.category, item.priceLabel, item.source].filter(Boolean).join(' • ');
      html += `<div class="block-btn" style="padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:4px;">
        <button style="flex:1;text-align:left;background:none;border:none;color:var(--text);cursor:pointer;padding:0;font-size:13px;" onclick="addLibraryBlock('${item.id}')">
          ${item.name}
          ${meta ? `<span class="block-meta">${meta}</span>` : ''}
        </button>
      </div>`;
    });
    html += `<div class="blocks-section-tools">
      <button class="btn btn-secondary btn-sm" onclick="openLibraryModal()">Manage Library</button>
    </div></div>`;
  }

  if (templates.length) {
    html += `<div class="blocks-section">
      <div class="blocks-section-label">Saved Templates</div>`;
    templates.forEach(t => {
      html += `<div class="block-btn" style="padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:4px;">
        <button style="flex:1;text-align:left;background:none;border:none;color:var(--text);cursor:pointer;padding:0;font-size:13px;" onclick="addTemplateBlock('${t.id}')">${t.name}</button>
        <button class="btn-icon" style="padding:3px;" onclick="deleteTemplate('${t.id}')" title="Delete template">×</button>
      </div>`;
    });
    html += `</div>`;
  }

  if (!html) {
    html = `<div class="library-empty">Save your own blocks or import a downloadable pack to add premium custom blocks here.</div>`;
  }
  section.innerHTML = html;
}

function openLibraryModal() {
  renderLibraryModal();
  openModal('modal-library');
}

function renderLibraryModal() {
  const library = getLibraryData();
  document.getElementById('library-template-count').textContent = library.pageTemplates.length;
  document.getElementById('library-block-count').textContent = library.blocks.length;

  const templateList = document.getElementById('library-template-list');
  if (!library.pageTemplates.length) {
    templateList.innerHTML = `<div class="library-empty">No custom website templates installed yet.</div>`;
  } else {
    templateList.innerHTML = library.pageTemplates.map(item => `
      <div class="library-card">
        <div class="library-card-title">${item.name}</div>
        <div class="library-card-meta">${item.description || 'Reusable starter site.'}</div>
        <div class="library-card-meta">${[item.source, item.author, item.priceLabel].filter(Boolean).join(' • ') || 'Imported template'}</div>
        <div class="library-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="useLibraryTemplateForNewProject('${item.id}')">Use In New Website</button>
          <button class="btn btn-danger btn-sm" onclick="deleteLibraryItem('pageTemplates','${item.id}')">Delete</button>
        </div>
      </div>`).join('');
  }

  const blockList = document.getElementById('library-block-list');
  if (!library.blocks.length) {
    blockList.innerHTML = `<div class="library-empty">No custom block packs installed yet.</div>`;
  } else {
    blockList.innerHTML = library.blocks.map(item => `
      <div class="library-card">
        <div class="library-card-title">${item.name}</div>
        <div class="library-card-meta">${item.description || 'Reusable custom block.'}</div>
        <div class="library-card-meta">${[item.category, item.source, item.author, item.priceLabel].filter(Boolean).join(' • ') || 'Imported block'}</div>
        <div class="library-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="addLibraryBlock('${item.id}')">Add To Current Page</button>
          <button class="btn btn-danger btn-sm" onclick="deleteLibraryItem('blocks','${item.id}')">Delete</button>
        </div>
      </div>`).join('');
  }
}

function deleteLibraryItem(kind, id) {
  const library = getLibraryData();
  if (!library[kind]) return;
  library[kind] = library[kind].filter(item => item.id !== id);
  saveLibraryData(library);
  renderTemplatesSection();
  renderLibraryModal();
  renderNewProjectTemplateOptions();
  toast('Library item removed.', 'success');
}

function useLibraryTemplateForNewProject(id) {
  closeModal('modal-library');
  openNewProjectModal();
  const select = document.getElementById('new-project-template');
  const value = `library:${id}`;
  if (select.querySelector(`option[value="${value}"]`)) select.value = value;
}

function exportLibraryBundle() {
  const library = getLibraryData();
  if (!library.pageTemplates.length && !library.blocks.length) {
    toast('Add at least one template or custom block first.', 'error');
    return;
  }
  const title = prompt('Bundle name:', 'custom-library-pack');
  if (!title || !title.trim()) return;
  const pack = {
    format: 'functional-websites-library',
    version: LIBRARY_PACK_VERSION,
    title: title.trim(),
    exportedAt: new Date().toISOString(),
    pageTemplates: library.pageTemplates,
    blocks: library.blocks
  };
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom-library-pack'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Library bundle downloaded.', 'success');
}

async function importLibraryPack(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  try {
    const raw = await file.text();
    const pack = JSON.parse(raw);
    if (pack.format !== 'functional-websites-library') {
      throw new Error('This file is not a Functional Websites library pack.');
    }
    const importedTemplateCount = Array.isArray(pack.pageTemplates) ? pack.pageTemplates.length : 0;
    const importedBlockCount = Array.isArray(pack.blocks) ? pack.blocks.length : 0;
    mergeLibraryData({
      pageTemplates: pack.pageTemplates,
      blocks: pack.blocks
    });
    renderTemplatesSection();
    renderLibraryModal();
    renderNewProjectTemplateOptions();
    toast(`Imported ${importedTemplateCount} templates and ${importedBlockCount} blocks.`, 'success');
  } catch (e) {
    toast(`Library import failed: ${e.message}`, 'error');
  }
}

// ============================================================
// DEVICE / MODE
// ============================================================
