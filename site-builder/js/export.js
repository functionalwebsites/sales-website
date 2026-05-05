// Site builder export. Loaded by site-builder/index.html in dependency order.
function setDevice(d) {
  STATE.currentDevice = d;
  document.querySelectorAll('.device-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.device === d);
  });
  const frame = document.getElementById('canvas-frame');
  frame.className = 'canvas-frame' + (d !== 'desktop' ? ' device-'+d : '');
}

function switchEditorMode(mode) {
  STATE.currentMode = mode;
  document.querySelectorAll('.editor-mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

  if (mode === 'visual') {
    document.getElementById('mode-visual').style.display = 'flex';
    document.getElementById('mode-code').classList.add('hidden');
    renderCanvas();
    renderProps(); // reflect any CSS/JS changes made in code editor
  } else {
    document.getElementById('mode-visual').style.display = 'none';
    document.getElementById('mode-code').classList.remove('hidden');
    refreshCodeEditor();
  }
}

// ============================================================
// CODE EDITOR
// ============================================================
function refreshCodeEditor() {
  const tab = STATE.currentCodeTab;
  const page = _projectData.pages[STATE.currentPageIndex];
  const ta = document.getElementById('code-editor');

  if (tab === 'html') {
    ta.value = compilePageHTML(_projectData, STATE.currentPageIndex, false, buildImageAssetMap(_projectData));
  } else if (tab === 'css') {
    ta.value = _projectData.globalCSS || '';
  } else if (tab === 'js') {
    ta.value = _projectData.globalJS || '';
  }
}

function switchCodeTab(tab) {
  STATE.currentCodeTab = tab;
  document.querySelectorAll('.code-tab').forEach(t => t.classList.toggle('active', t.dataset.file === tab));
  const isHTML = tab === 'html';
  document.getElementById('code-editor').readOnly = isHTML;
  document.getElementById('code-editor').style.opacity = isHTML ? '0.6' : '1';
  document.getElementById('html-tab-note').style.display = isHTML ? '' : 'none';
  document.getElementById('btn-apply-code').style.display = isHTML ? 'none' : '';
  refreshCodeEditor();
}

function applyCode() {
  const tab = STATE.currentCodeTab;
  if (tab === 'html') return; // read-only — editing HTML directly is disabled
  pushUndo();
  const val = document.getElementById('code-editor').value;
  if (tab === 'css') {
    _projectData.globalCSS = val;
    renderCanvas();
    toast('CSS applied', 'success');
  } else if (tab === 'js') {
    _projectData.globalJS = val;
    toast('JS applied', 'success');
  }
}

function extractBodyContent(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : html;
}

// ============================================================
// PREVIEW
// ============================================================
function previewProject() {
  const html = compilePageHTML(_projectData, STATE.currentPageIndex, false);
  const blob = new Blob([html], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function getImageIssues(projectData) {
  const issues = [];
  const images = projectData.images || [];
  const imageIds = new Set(images.map(img => img.id));
  const totalBytes = images.reduce((sum, img) => sum + dataUrlBytes(img.dataURL), 0);
  images.forEach(img => {
    const size = dataUrlBytes(img.dataURL);
    if (size > 2.5 * 1024 * 1024) issues.push(`Large image: ${img.name} is ${formatBytes(size)}.`);
  });
  if (totalBytes > 12 * 1024 * 1024) issues.push(`Image library is ${formatBytes(totalBytes)} total; export/deploy may be slower.`);

  (projectData.pages || []).forEach(page => {
    (page.blocks || []).forEach(block => {
      const p = block.props || {};
      const refs = [
        ['image', p.src],
        ['hero background', p.bgImage],
        ...((p.cards || []).map((card, index) => [`card ${index + 1} image`, card.img]))
      ];
      refs.forEach(([label, value]) => {
        if (isImageRef(value) && !imageIds.has(imageIdFromRef(value))) {
          issues.push(`${page.name}: missing ${label} from the image library.`);
        }
      });
      if (block.type === 'image' && p.src && !String(p.alt || '').trim()) {
        issues.push(`${page.name}: image block is missing alt text.`);
      }
    });
  });
  return issues;
}

function confirmPreflight(actionLabel) {
  const issues = getImageIssues(_projectData);
  if (!issues.length) return true;
  const shown = issues.slice(0, 8).map(item => `- ${item}`).join('\n');
  const extra = issues.length > 8 ? `\n- ${issues.length - 8} more issue(s).` : '';
  return confirm(`Before ${actionLabel}, check these items:\n\n${shown}${extra}\n\nContinue anyway?`);
}

// ============================================================
// DOWNLOAD ZIP
// ============================================================
async function downloadZip() {
  if (!confirmPreflight('downloading')) return;
  await downloadProjectZip(STATE.currentProjectId);
}

async function downloadProjectZip(id) {
  const data = id === STATE.currentProjectId ? _projectData : getProjectData(id);
  const meta = STATE.projects.find(p=>p.id===id);
  const name = (meta?.name || 'website').toLowerCase().replace(/[^a-z0-9]/g,'-');

  const zip = new JSZip();
  const folder = zip.folder(name);

  // Build image map and write images/ folder. Blocks use short image refs while
  // editing; exports get normal relative files such as images/photo.jpg.
  const imageMap = buildImageAssetMap(data);
  const libImages = data.images || [];
  if (libImages.length > 0) {
    const imgFolder = folder.folder('images');
    libImages.forEach(img => {
      const fname = imageMap[imageRef(img.id)] || imageMap[img.dataURL] || sanitizeAssetFilename(img.name);
      const b64 = img.dataURL.split(',')[1];
      if (b64) imgFolder.file(fname, b64, { base64: true });
    });
  }

  // Each page — resolve data URL image srcs to relative images/ paths
  data.pages.forEach((page, i) => {
    const html = compilePageHTML(data, i, false, imageMap);
    const filename = (page.slug || (i===0?'index':'page'+i)) + '.html';
    folder.file(filename, html);
  });

  // Standalone CSS + JS
  folder.file('style.css', data.globalCSS || '');
  folder.file('script.js', data.globalJS || '');

  folder.file(BUILDER_MANIFEST_FILE, JSON.stringify({
    format: 'functional-websites-project',
    version: 2,
    exportedAt: new Date().toISOString(),
    siteName: data.name || meta?.name || 'website',
    projectDataFile: BUILDER_PROJECT_FILE,
    imageStorage: 'images-folder'
  }, null, 2));
  folder.file(BUILDER_PROJECT_FILE, JSON.stringify(createPortableProjectData(data, imageMap), null, 2));

  // README
  folder.file('README.md', `# ${data.name}\n\nBuilt with Functional Websites builder.\n\nTo continue editing later:\n1. Keep this ZIP intact, including the images folder\n2. On the builder home page choose "Upload Existing Site"\n3. Upload this ZIP with the included builder manifest\n\nThe builder project JSON stores image metadata and paths. The image files live in the images folder so the JSON stays small.\n\nTo host on GitHub Pages:\n1. Create a new GitHub repository\n2. Upload these files\n3. Go to Settings → Pages → select the main branch\n`);

  const blob = await zip.generateAsync({type: 'blob'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.zip';
  a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded!', 'success');
}

// ============================================================
// SETTINGS
// ============================================================
