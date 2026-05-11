// Site builder image-library. Loaded by build/index.html in dependency order.
function openImageLibrary(blockId, callback) {
  STATE.imgLibTargetBlockId = blockId;
  STATE.imgLibCallback = callback || null;
  STATE.imgLibSelectedId = null;
  renderImageLibraryGrid();
  const useBtn = document.getElementById('btn-img-lib-use');
  useBtn.style.display = (blockId || callback) ? 'inline-flex' : 'none';
  openModal('modal-img-lib');
}

function renderImageLibraryGrid() {
  const images = _projectData.images || [];
  const grid = document.getElementById('img-lib-grid');
  const empty = document.getElementById('img-lib-empty');
  const stats = document.getElementById('img-lib-stats');
  if (stats) {
    const totalBytes = images.reduce((sum, img) => sum + dataUrlBytes(img.dataURL), 0);
    stats.textContent = images.length
      ? `${images.length} image${images.length > 1 ? 's' : ''} stored privately in this project (${formatBytes(totalBytes)} total).`
      : '';
  }
  if (images.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = images.map(img => `
    <div class="img-lib-item${STATE.imgLibSelectedId === img.id ? ' selected' : ''}" onclick="selectLibraryItem('${img.id}')">
      <button class="img-lib-del" onclick="event.stopPropagation();deleteLibraryImage('${img.id}')" title="Delete">×</button>
      <img src="${img.dataURL}" alt="${img.name}" loading="lazy">
      <div class="img-lib-name" title="${img.name}">${img.name}</div>
    </div>`).join('');
}

function selectLibraryItem(id) {
  STATE.imgLibSelectedId = id;
  renderImageLibraryGrid();
}

function useSelectedLibraryImage() {
  if (!STATE.imgLibSelectedId) return;
  const img = (_projectData.images||[]).find(i => i.id === STATE.imgLibSelectedId);
  if (!img) return;
  const ref = imageRef(img.id);
  if (STATE.imgLibCallback) {
    STATE.imgLibCallback(ref);
    STATE.imgLibCallback = null;
  } else if (STATE.imgLibTargetBlockId) {
    updateProp(STATE.imgLibTargetBlockId, 'src', ref);
  }
  closeModal('modal-img-lib');
  renderProps();
}

async function deleteLibraryImage(id) {
  const confirmed = await showBuilderDialog({
    title: 'Delete Image',
    message: 'Delete this image from the current website library? Blocks using it may no longer display correctly.',
    confirmText: 'Delete Image',
    destructive: true
  });
  if (!confirmed) return;
  pushUndo();
  _projectData.images = (_projectData.images||[]).filter(i => i.id !== id);
  if (STATE.imgLibSelectedId === id) STATE.imgLibSelectedId = null;
  renderImageLibraryGrid();
}

function uploadImages(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  if (!_projectData.images) _projectData.images = [];
  pushUndo();
  let done = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      _projectData.images.push({ id: uid(), name: file.name, dataURL: e.target.result, type: file.type });
      done++;
      if (done === files.length) {
        renderImageLibraryGrid();
        toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`, 'success');
      }
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function openImportUrlModal() {
  document.getElementById('import-url-input').value = '';
  document.getElementById('import-url-name').value = '';
  document.getElementById('import-url-status').style.display = 'none';
  document.getElementById('btn-import-url-go').disabled = false;
  closeModal('modal-img-lib');
  openModal('modal-import-url');
}

function cancelImportUrl() {
  closeModal('modal-import-url');
  openModal('modal-img-lib');
}

async function importImageFromUrl() {
  const url = document.getElementById('import-url-input').value.trim();
  if (!url) { toast('Enter a URL', 'error'); return; }
  let name = document.getElementById('import-url-name').value.trim() || url.split('/').pop().split('?')[0] || 'image.jpg';
  if (!/\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i.test(name)) name += '.jpg';

  const statusEl = document.getElementById('import-url-status');
  const goBtn = document.getElementById('btn-import-url-go');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Fetching image…';
  goBtn.disabled = true;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('URL did not return an image');
    const reader = new FileReader();
    reader.onload = e => {
      if (!_projectData.images) _projectData.images = [];
      pushUndo();
      _projectData.images.push({ id: uid(), name, dataURL: e.target.result, type: blob.type });
      closeModal('modal-import-url');
      openModal('modal-img-lib');
      renderImageLibraryGrid();
      toast('Image imported!', 'success');
    };
    reader.readAsDataURL(blob);
  } catch(e) {
    statusEl.textContent = 'Failed: ' + e.message;
    goBtn.disabled = false;
  }
}

// ============================================================
// BLOCK TEMPLATES
// ============================================================
