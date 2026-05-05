// Site builder dashboard-import. Loaded by build/index.html in dependency order.
function showView(v) {
  document.querySelectorAll('#view-dashboard,#view-editor,#view-settings').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
}
function showDashboard() {
  document.body.classList.remove('editor-mode');
  renderDashboard();
  showView('dashboard');
}
function showSettings() {
  console.log('Showing settings page');
  document.body.classList.remove('editor-mode');
  loadSettingsForm();
  updateStorageInfo();
  // Clear deployment history cache and force refresh
  document.getElementById('deployment-history').innerHTML = '<div class="text-muted text-sm">Loading deployment history...</div>';
  setTimeout(() => loadDeploymentHistory(true), 100); // Small delay to ensure DOM is ready
  showView('settings');
}
function exitEditor() {
  if (_saveState === 'dirty') {
    openModal('modal-unsaved-exit');
    return;
  }
  saveProject(true);
  showDashboard();
}

function saveAndExitEditor() {
  closeModal('modal-unsaved-exit');
  saveProject(true);
  showDashboard();
}

function continueWithoutSaving() {
  closeModal('modal-unsaved-exit');
  setSaveStatus('saved');
  showDashboard();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  loadProjects();
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '';

  // New project card
  const newCard = document.createElement('button');
  newCard.className = 'new-project-card';
  newCard.innerHTML = '<span class="new-project-icon">＋</span><span>Create New Website</span>';
  newCard.onclick = openNewProjectModal;
  grid.appendChild(newCard);

  const uploadCard = document.createElement('button');
  uploadCard.className = 'new-project-card';
  uploadCard.innerHTML = '<span class="new-project-icon">⇪</span><span>Upload Existing Site</span><span class="text-sm text-muted" style="text-align:center;max-width:190px;">Use a ZIP exported from this sitebuilder with the included builder manifest.</span>';
  uploadCard.onclick = triggerExistingSiteUpload;
  grid.appendChild(uploadCard);

  const githubCard = document.createElement('button');
  githubCard.className = 'new-project-card';
  githubCard.innerHTML = '<span class="new-project-icon">⌘</span><span>Import from GitHub</span><span class="text-sm text-muted" style="text-align:center;max-width:190px;">Import a GitHub repository as a new project.</span>';
  githubCard.onclick = openGithubImportModal;
  grid.appendChild(githubCard);

  STATE.projects.slice().reverse().forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';
    const modified = new Date(p.modified).toLocaleDateString();

    // Thumbnail preview
    const pd = getProjectData(p.id);
    let thumbHTML = '';
    try {
      thumbHTML = compilePageHTML(pd, 0, true);
    } catch(e) { console.warn('Thumbnail failed for', p.id, e); }

    card.innerHTML = `
      <div class="project-thumb">
      </div>
      <div class="project-info">
        <div class="project-name">${p.name}</div>
        <div class="project-meta">${pd.pages.length} page${pd.pages.length!==1?'s':''} · Modified ${modified}</div>
      </div>
      <div class="project-actions">
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openEditor('${p.id}')">✏ Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openRenameModal('${p.id}')">Rename</button>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();duplicateProject('${p.id}')">Copy</button>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();downloadProjectZip('${p.id}')">⬇</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();openDeleteModal('${p.id}')">✕</button>
      </div>`;
    const thumb = card.querySelector('.project-thumb');
    if (thumb && thumbHTML) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('scrolling', 'no');
      iframe.style.cssText = 'width:400px;height:150px;transform-origin:left top;pointer-events:none;border:medium;background:rgb(255, 255, 255);';
      iframe.srcdoc = thumbHTML;
      thumb.appendChild(iframe);
    } else if (thumb) {
      thumb.textContent = 'Preview unavailable';
    }
    card.ondblclick = () => openEditor(p.id);
    grid.appendChild(card);
  });
}

// ============================================================
// PROJECT CRUD
// ============================================================
function openNewProjectModal() {
  document.getElementById('new-project-name').value = '';
  document.getElementById('new-project-brand-name').value = '';
  document.getElementById('new-project-author').value = '';
  document.getElementById('new-project-description').value = '';
  document.getElementById('new-project-accent').value = '#7c6af7';
  document.getElementById('new-project-page-bg').value = '#ffffff';
  document.getElementById('new-project-section-bg').value = '#f8f8f8';
  document.getElementById('new-project-text-dark').value = '#111111';
  renderNewProjectTemplateOptions();
  document.getElementById('new-project-template').value = 'blank';
  openModal('modal-new-project');
  setTimeout(()=>document.getElementById('new-project-name').focus(),100);
}

function openGithubImportModal() {
  document.getElementById('github-import-url').value = '';
  document.getElementById('github-import-branch').value = 'main';
  openModal('modal-github-import');
  setTimeout(()=>document.getElementById('github-import-url').focus(),100);
}

function triggerExistingSiteUpload() {
  const input = document.getElementById('existing-site-upload');
  if (!input) return;
  input.value = '';
  input.click();
}

function createProject() {
  const name = document.getElementById('new-project-name').value.trim() || 'Untitled Site';
  const brandName = document.getElementById('new-project-brand-name').value.trim() || name;
  const author = document.getElementById('new-project-author').value.trim();
  const description = document.getElementById('new-project-description').value.trim();
  const template = document.getElementById('new-project-template').value;
  const id = uid();
  const brandSetup = {
    accent: document.getElementById('new-project-accent').value,
    pageBg: document.getElementById('new-project-page-bg').value,
    sectionBg: document.getElementById('new-project-section-bg').value,
    textDark: document.getElementById('new-project-text-dark').value,
    btnPrimary: document.getElementById('new-project-accent').value
  };
  let data = createBlankProjectData(name, { brandName, author, description, brand: brandSetup });
  if (template.startsWith('library:')) {
    const libraryId = template.slice('library:'.length);
    const templateEntry = getLibraryData().pageTemplates.find(item => item.id === libraryId);
    if (!templateEntry) {
      toast('That custom template is no longer installed.', 'error');
      return;
    }
    data = applyLibraryProjectTemplate(data, templateEntry);
  } else {
    _brandContext = data.brand;
    _projectNameContext = data.brandName;
    data = applyTemplate(data, template);
    _brandContext = null;
    _projectNameContext = '';
  }

  const meta = { id, name, created: Date.now(), modified: Date.now() };
  STATE.projects.push(meta);
  saveProjectsMeta();
  saveProjectData(id, data);

  closeModal('modal-new-project');
  toast('Website created!', 'success');
  openEditor(id);
}

function renderNewProjectTemplateOptions() {
  const select = document.getElementById('new-project-template');
  const note = document.getElementById('new-project-template-note');
  const library = getLibraryData();
  const builtInValue = select.value || 'blank';

  let html = `
    <option value="blank">Blank</option>
    <option value="landing">Landing Page</option>
    <option value="blog">Blog / Article</option>
    <option value="portfolio">Portfolio</option>
    <option value="docs">Documentation</option>`;

  if (library.pageTemplates.length) {
    html += `<optgroup label="Custom Website Templates">`;
    library.pageTemplates.forEach(item => {
      const meta = item.priceLabel ? ` - ${item.priceLabel}` : '';
      html += `<option value="library:${item.id}">${item.name}${meta}</option>`;
    });
    html += `</optgroup>`;
    note.textContent = 'Installed premium or imported templates appear here and can be used like built-in starters.';
  } else {
    note.textContent = 'Install custom website templates from the Custom Library to offer premium starter sites.';
  }

  select.innerHTML = html;
  if (select.querySelector(`option[value="${builtInValue}"]`)) select.value = builtInValue;
}

async function uploadExistingSite(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  try {
    await importProjectZip(file);
  } catch (e) {
    toast(e.message || 'Import failed', 'error');
  }
}

function getZipFolderPrefix(path) {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx + 1) : '';
}

function joinZipPath(basePath, relativePath) {
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return basePath ? basePath + clean : clean;
}

async function rehydrateProjectImagesFromZip(projectData, zip, basePath) {
  const images = projectData.images || [];
  for (const img of images) {
    if (img.dataURL) continue;
    const imgPath = img.path || img.file || img.src;
    if (!imgPath) continue;
    const entry = zip.file(joinZipPath(basePath, imgPath)) || zip.file(String(imgPath).replace(/^\/+/, ''));
    if (!entry) continue;
    const b64 = await entry.async('base64');
    const type = img.type || mimeFromFilename(imgPath);
    img.dataURL = `data:${type};base64,${b64}`;
    if (!img.name) img.name = String(imgPath).split('/').pop() || img.id || 'image';
  }
}

async function importProjectZip(file) {
  toast('Importing site...', 'info');
  const zip = await JSZip.loadAsync(file);
  const manifestPath = Object.keys(zip.files).find(path => path.endsWith(BUILDER_MANIFEST_FILE));
  if (!manifestPath) {
    return importWebsiteZip(file, zip);
  }

  const manifestRaw = await zip.file(manifestPath).async('string');
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (e) {
    throw new Error('The builder manifest could not be read from this ZIP.');
  }

  const basePath = getZipFolderPrefix(manifestPath);
  const projectFileName = manifest.projectDataFile || BUILDER_PROJECT_FILE;
  const projectPath = basePath + projectFileName;
  const projectEntry = zip.file(projectPath);
  if (!projectEntry) {
    throw new Error('This ZIP is missing the builder project data needed to continue editing.');
  }

  let importedData;
  try {
    importedData = JSON.parse(await projectEntry.async('string'));
  } catch (e) {
    throw new Error('The builder project data file is invalid.');
  }

  if (!importedData || !Array.isArray(importedData.pages)) {
    throw new Error('The uploaded project data is incomplete and cannot be imported.');
  }

  const id = uid();
  const importedName = importedData.name || manifest.siteName || file.name.replace(/\.zip$/i, '') || 'Imported Site';
  const now = Date.now();
  const normalizedData = JSON.parse(JSON.stringify(importedData));
  normalizedData.name = importedName;
  await rehydrateProjectImagesFromZip(normalizedData, zip, basePath);
  if (!normalizedData.brandName) normalizedData.brandName = normalizedData.name;
  if (!normalizedData.brand) normalizedData.brand = {};
  if (!normalizedData.meta) normalizedData.meta = {};
  if (!normalizedData.images) normalizedData.images = [];
  if (!normalizedData.templates) normalizedData.templates = [];
  if (!normalizedData.navbars) normalizedData.navbars = {};

  STATE.projects.push({ id, name: importedName, created: now, modified: now });
  saveProjectsMeta();
  saveProjectData(id, normalizedData);
  renderDashboard();
  toast(`Imported "${importedName}"`, 'success');
  openEditor(id);
}

function extractBodyHtml(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  const htmlMatch = html.match(/<html[^>]*>[\s\S]*<body[^>]*>([\s\S]*)<\/body>/i);
  if (htmlMatch) return htmlMatch[1].trim();
  return html.trim();
}

function getZipRootPrefix(paths) {
  const tops = paths
    .filter(p => p && p.indexOf('/') >= 0)
    .map(p => p.split('/')[0]);
  if (!tops.length) return '';
  const unique = [...new Set(tops)];
  return unique.length === 1 ? unique[0] + '/' : '';
}

function pathWithoutRoot(path, root) {
  return root && path.startsWith(root) ? path.slice(root.length) : path;
}

function findZipEntry(zip, root, relativePath) {
  return zip.file(root + relativePath) || zip.file(relativePath);
}

async function importWebsiteZip(file, zip) {
  console.log('Starting website ZIP import for file:', file.name);
  const filenames = Object.keys(zip.files).filter(path => !zip.files[path].dir);
  console.log('ZIP contains files:', filenames);
  const root = getZipRootPrefix(filenames);
  console.log('Detected root prefix:', root);

  // Look for HTML files, preferring index.html at root level
  const allHtmlFiles = filenames.filter(path => ['.html', '.htm'].some(ext => path.toLowerCase().endsWith(ext)));
  console.log('All HTML files in ZIP:', allHtmlFiles);

  // Try to find index.html first
  let indexFile = allHtmlFiles.find(path => pathWithoutRoot(path, root).toLowerCase() === 'index.html');
  if (!indexFile) {
    // Look for any index file
    indexFile = allHtmlFiles.find(path => pathWithoutRoot(path, root).toLowerCase().startsWith('index'));
  }

  const htmlFiles = [];
  if (indexFile) {
    htmlFiles.push(pathWithoutRoot(indexFile, root));
  }
  // Add other HTML files, excluding index files we've already added
  allHtmlFiles.forEach(path => {
    const relative = pathWithoutRoot(path, root);
    if (relative.toLowerCase() !== 'index.html' && !relative.toLowerCase().startsWith('index')) {
      htmlFiles.push(relative);
    }
  });

  console.log('Selected HTML files for import:', htmlFiles);
  if (!htmlFiles.length) {
    throw new Error('No HTML files were found in this ZIP. Import requires at least one HTML page.');
  }

  // Look for CSS and JS files more broadly
  const cssFiles = filenames
    .map(path => ({ full: path, relative: pathWithoutRoot(path, root) }))
    .filter(entry => entry.relative.toLowerCase().endsWith('.css') && !entry.relative.includes('/'));
  const jsFiles = filenames
    .map(path => ({ full: path, relative: pathWithoutRoot(path, root) }))
    .filter(entry => entry.relative.toLowerCase().endsWith('.js') && !entry.relative.includes('/'));
  console.log('Found CSS files:', cssFiles.map(f => f.relative));
  console.log('Found JS files:', jsFiles.map(f => f.relative));
  const imageFiles = filenames
    .map(path => ({ full: path, relative: pathWithoutRoot(path, root) }))
    .filter(entry => /\.(png|jpe?g|gif|svg|webp)$/i.test(entry.relative));

  const imageMap = [];
  for (const imgEntry of imageFiles) {
    const entry = zip.file(imgEntry.full);
    if (!entry) continue;
    const data = await entry.async('base64');
    imageMap.push({ name: imgEntry.relative.split('/').pop(), dataURL: `data:image/${imgEntry.relative.split('.').pop().toLowerCase()};base64,${data}` });
  }

  let globalCSS = '';
  if (cssFiles.length) {
    try {
      console.log('Reading CSS from:', cssFiles[0].full);
      globalCSS = await zip.file(cssFiles[0].full).async('string');
      console.log('CSS content length:', globalCSS.length);
    } catch (e) {
      console.error('Error reading CSS:', e);
      globalCSS = '';
    }
  }

  let globalJS = '';
  if (jsFiles.length) {
    try {
      console.log('Reading JS from:', jsFiles[0].full);
      globalJS = await zip.file(jsFiles[0].full).async('string');
      console.log('JS content length:', globalJS.length);
    } catch (e) {
      console.error('Error reading JS:', e);
      globalJS = '';
    }
  }

  const pages = [];
  for (const htmlPath of htmlFiles) {
    const fullPath = root + htmlPath;
    console.log('Processing HTML file:', htmlPath, 'full path:', fullPath);
    const entry = findZipEntry(zip, root, htmlPath);
    if (!entry) {
      console.warn('Could not find entry for path:', fullPath, 'or relative path:', htmlPath);
      continue;
    }
    let html = await entry.async('string');
    console.log('Read HTML content, length:', html.length);
    const pageName = htmlPath.toLowerCase() === 'index.html'
      ? 'Home'
      : htmlPath.replace(/\.[^.]+$/, '').replace(/\//g, ' ').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const slug = htmlPath.toLowerCase() === 'index.html'
      ? 'index'
      : htmlPath.replace(/\.html?$/i, '').replace(/[\/\s]+/g, '-').toLowerCase();
    const content = extractBodyHtml(html);
    console.log('Extracted content length:', content.length);
    pages.push({ id: uid(), name: pageName, slug: slug || 'page-' + (pages.length + 1), blocks: [{ id: uid(), type: 'text', props: { content } }], meta: {} });
  }

  if (!pages.length) {
    throw new Error('No importable HTML pages could be read from this ZIP.');
  }

  const importedName = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
  const now = Date.now();
  const data = {
    name: importedName,
    brandName: importedName,
    globalCSS: globalCSS || `/* Imported site global CSS */`,
    globalJS: globalJS || `// Imported site global JS`,
    meta: { description: '', keywords: '', author: '', favicon: '', ogType: 'website', ogImage: '', twitterCard: 'summary_large_image' },
    brand: {},
    images: imageMap,
    templates: [],
    navbars: {},
    pages
  };

  console.log('Created project data:', {
    name: importedName,
    pagesCount: pages.length,
    imagesCount: imageMap.length,
    hasCSS: !!globalCSS,
    hasJS: !!globalJS
  });

  const id = uid();
  STATE.projects.push({ id, name: importedName, created: now, modified: now });
  saveProjectsMeta();
  saveProjectData(id, data);
  renderDashboard();
  toast(`Imported "${importedName}" from GitHub`, 'success');
  openEditor(id);
}

async function startGithubImport() {
  const url = document.getElementById('github-import-url').value.trim();
  const branch = document.getElementById('github-import-branch').value.trim() || 'main';
  if (!url) return;

  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    toast('Invalid GitHub URL', 'error');
    return;
  }
  const owner = match[1];
  const repo = match[2];

  closeModal('modal-github-import');
  toast('Importing from GitHub...', 'info');

  // Clear any cached data
  console.clear();
  console.log('=== GITHUB IMPORT START ===');
  console.log('Importing from:', `${owner}/${repo}/${branch}`);

  try {
    const gh = LS.get('github') || {};
    console.log('GitHub auth status:', {
      verified: gh.verified,
      hasToken: !!gh.token,
      login: gh.login,
      owner: gh.owner
    });

    // First check if the repo exists and is accessible
    const repoCheckUrl = `https://api.github.com/repos/${owner}/${repo}`;
    console.log('Checking repo accessibility:', repoCheckUrl);
    const repoCheck = gh.token ? await ghFetch(repoCheckUrl, gh.token) : await fetch(repoCheckUrl);
    if (!repoCheck.ok) {
      const errorBody = await repoCheck.text();
      console.error('Repo check failed:', errorBody);
      throw new Error(`Repository not found or not accessible: ${repoCheck.status} ${repoCheck.statusText}`);
    }
    const repoData = await repoCheck.json();
    console.log('Repo data:', { private: repoData.private, default_branch: repoData.default_branch });

    const blob = await downloadGithubRepoZip(owner, repo, branch, gh.token);
    console.log('Blob received, size:', blob.size);

    const file = new File([blob], `${owner}-${repo}-${branch}.zip`, { type: 'application/zip' });
    await importProjectZip(file);
    console.log('=== GITHUB IMPORT SUCCESS ===');
  } catch (e) {
    console.error('=== GITHUB IMPORT FAILED ===');
    console.error('Error:', e.message);
    toast(`GitHub import failed: ${e.message}`, 'error');
  }
}

async function downloadGithubRepoZip(owner, repo, branch, token) {
  const headers = token ? githubHeaders(token) : { 'Accept': 'application/vnd.github.v3+json' };
  const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`, { headers });
  if (!branchRes.ok) {
    throw new Error(await githubErrorMessage(branchRes, `Could not load branch "${branch}"`));
  }
  const branchData = await branchRes.json();
  const treeSha = branchData.commit?.commit?.tree?.sha || branchData.commit?.sha;
  if (!treeSha) throw new Error(`Could not find a tree for branch "${branch}"`);

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, { headers });
  if (!treeRes.ok) {
    throw new Error(await githubErrorMessage(treeRes, 'Could not load repository file tree'));
  }
  const treeData = await treeRes.json();
  if (treeData.truncated) {
    toast('GitHub returned a truncated file tree; very large repos may import incompletely.', 'error');
  }

  const zip = new JSZip();
  const rootFolder = zip.folder(`${owner}-${repo}-${branch}`);
  const files = (treeData.tree || []).filter(item => item.type === 'blob' && item.path);
  if (!files.length) throw new Error('No files found in this repository branch.');

  for (const item of files) {
    const blobRes = await fetch(item.url, { headers });
    if (!blobRes.ok) {
      throw new Error(await githubErrorMessage(blobRes, `Could not download ${item.path}`));
    }
    const blobData = await blobRes.json();
    if (blobData.encoding === 'base64' && blobData.content) {
      rootFolder.file(item.path, blobData.content.replace(/\s/g, ''), { base64: true });
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

let _renameId = null;
function openRenameModal(id) {
  _renameId = id;
  const p = STATE.projects.find(p=>p.id===id);
  document.getElementById('rename-input').value = p ? p.name : '';
  openModal('modal-rename');
  setTimeout(()=>document.getElementById('rename-input').select(),100);
}
function confirmRename() {
  const name = document.getElementById('rename-input').value.trim();
  if (!name) return;
  const p = STATE.projects.find(p=>p.id===_renameId);
  if (p) {
    p.name = name;
    p.modified = Date.now();
    saveProjectsMeta();
    const data = getProjectData(_renameId);
    data.name = name;
    saveProjectData(_renameId, data);
  }
  closeModal('modal-rename');
  renderDashboard();
  toast('Renamed!', 'success');
}

let _deleteId = null;
function openDeleteModal(id) {
  _deleteId = id;
  const p = STATE.projects.find(p=>p.id===id);
  document.getElementById('delete-project-name').textContent = p ? p.name : 'this website';
  openModal('modal-delete');
}
function confirmDelete() {
  STATE.projects = STATE.projects.filter(p=>p.id!==_deleteId);
  saveProjectsMeta();
  LS.del('proj_'+_deleteId);
  closeModal('modal-delete');
  renderDashboard();
  toast('Deleted', 'info');
}

function duplicateProject(id) {
  const src = getProjectData(id);
  const srcMeta = STATE.projects.find(p=>p.id===id);
  const newId = uid();
  const newData = JSON.parse(JSON.stringify(src));
  newData.name = (srcMeta ? srcMeta.name : 'Copy') + ' (copy)';
  const meta = { id: newId, name: newData.name, created: Date.now(), modified: Date.now() };
  STATE.projects.push(meta);
  saveProjectsMeta();
  saveProjectData(newId, newData);
  renderDashboard();
  toast('Duplicated!', 'success');
}

// ============================================================
// EDITOR
// ============================================================
