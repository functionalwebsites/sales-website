// Site builder export. Loaded by build/index.html in dependency order.
function setDevice(d) {
  STATE.currentDevice = d;
  document.querySelectorAll('.device-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.device === d);
  });
  const frame = document.getElementById('canvas-frame');
  const widths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px'
  };
  frame.className = 'canvas-frame';
  frame.style.width = widths[d] || widths.desktop;
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

function exportTimestampForFilename(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join('-');
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
  const issues = getDesignHealthIssues(_projectData).filter(issue => issue.level !== 'info').map(issue => issue.message);
  if (!issues.length) return true;
  if (actionLabel === 'deploying' && getDesignHealthIssues(_projectData).some(issue => issue.level === 'error')) { openDesignHealthModal(); return false; }
  const shown = issues.slice(0, 8).map(item => `- ${item}`).join('\n');
  const extra = issues.length > 8 ? `\n- ${issues.length - 8} more issue(s).` : '';
  return confirm(`Before ${actionLabel}, check these items:\n\n${shown}${extra}\n\nContinue anyway?`);
}

function getDesignHealthIssues(projectData) {
  const issues = siteMetadataIssues(projectData);
  const bytes = (projectData.images || []).reduce((sum,img)=>sum+dataUrlBytes(img.dataURL),0);
  if(bytes>12*1024*1024)issues.push({level:'warning',message:`Image library totals ${formatBytes(bytes)}. Consider smaller images for a faster site.`});
  return issues;
}

function renderDesignHealthReport() {
  const body = document.getElementById('design-health-body');
  if (!body) return;
  const issues = getDesignHealthIssues(_projectData);
  const counts = {
    error: issues.filter(issue => issue.level === 'error').length,
    warning: issues.filter(issue => issue.level === 'warning').length,
    info: issues.filter(issue => issue.level === 'info').length,
  };
  if (!issues.length) {
    body.innerHTML = '<div style="color:var(--green);font-weight:700;margin-bottom:8px;">No issues found.</div><p>Still preview every page and check your links before publishing.</p>';
    return;
  }
  const groups = [
    ['error', 'Fix Before Launch'],
    ['warning', 'Review Before Export'],
    ['info', 'Helpful Improvements']
  ].map(([level, title]) => {
    const items = issues.filter(issue => issue.level === level);
    if (!items.length) return '';
    const color = level === 'error' ? 'var(--red)' : level === 'warning' ? 'var(--yellow)' : 'var(--text)';
    return `<div style="margin-bottom:14px;"><strong style="display:block;color:${color};margin-bottom:6px;">${title}</strong><ul style="padding-left:18px;margin:0;">${items.map(issue => `<li>${escapeHtmlForTextarea(issue.message)} <button class="btn btn-ghost btn-sm" onclick="focusHealthIssue(${issues.indexOf(issue)})">Review</button></li>`).join('')}</ul></div>`;
  }).join('');
  body.innerHTML = `<div style="margin-bottom:12px;color:var(--text);">Found ${counts.error} error(s), ${counts.warning} warning(s), and ${counts.info} suggestion(s).</div>${groups}`;
}

function openDesignHealthModal() {
  openModal('modal-design-health');
  renderDesignHealthReport();
}

function designerTokensCSS(data) {
  return [
    '/* Design tokens generated by Functional Websites. Edit these first. */',
    buildBrandCSS(data),
    buildStyleSystemCSS(data),
    buildSiteThemeCSS(data),
    ''
  ].join('\n');
}

function designerBaseCSS() {
  return `/* Base reset and accessibility defaults. */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: var(--site-font-family, system-ui, sans-serif); font-size: var(--site-body-size, 16px); line-height: var(--site-line-height, 1.6); background: var(--color-page-bg, #fff); color: var(--color-text-dark, #111); }
img, svg, video, canvas { max-width: 100%; height: auto; }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--color-accent, #7c6af7); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }`;
}

function designerComponentsCSS() {
  return `/* Component helpers for generated sections. Edit these to change repeated export styling. */
${buildGeneratedComponentCSS()}
main { min-height: 60vh; }
section { position: relative; }
button, input, textarea, select { font: inherit; }
nav [data-nav-link="true"] { min-height: 40px; }`;
}

function compileDesignerPageHTML(projectData, pageIndex, imageMap) {
  const page = projectData.pages[pageIndex];
  const faviconMap = buildFaviconAssetMap(projectData);
  const renderCtx = Object.assign({}, projectData, { _imageMap: imageMap, _faviconMap: faviconMap });
  let blocksHTML = (page.blocks || []).map(b => renderBlock(b, false, renderCtx)).join('\n');
  blocksHTML = resolveImageSrcs(blocksHTML, imageMap);
  blocksHTML = resolveCompiledImageRefs(blocksHTML, projectData, imageMap);
  const title = pageTitle(projectData, page);
  return `<!DOCTYPE html>
<html lang="${escAttr(projectData.meta?.language || 'en')}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(title)}</title>
${buildMetaTags(renderCtx, page)}
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/pages.css">
</head>
<body class="site-theme-${projectData.siteTheme || 'light'}">
<main>
${blocksHTML}
</main>
<script src="js/main.js"><\/script>
</body>
</html>`;
}

function designerSiteJson(data) {
  return JSON.stringify({
    format: 'functional-websites-designer-handoff',
    version: 1,
    exportedAt: new Date().toISOString(),
    name: data.name,
    brandName: data.brandName,
    meta: data.meta,
    brand: data.brand,
    logo: data.logo,
    favicons: (data.favicons || []).map(asset => ({ name: asset.name, rel: asset.rel, sizes: asset.sizes, type: asset.type })),
    styleSystem: normalizeStyleSystem(data.styleSystem),
    pages: (data.pages || []).map(page => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      meta: page.meta || {},
      blocks: (page.blocks || []).map(block => ({ id: block.id, type: block.type, props: block.props || {} }))
    }))
  }, null, 2);
}

function designerReadme(data) {
  return `# ${data.name}

Exported from Functional Websites.

## File Map
- HTML pages live at the project root.
- \`css/tokens.css\` contains brand colors and design tokens.
- \`css/base.css\` contains reset, accessibility, and base element styles.
- \`css/components.css\` contains reusable generated component helpers.
- \`css/pages.css\` contains custom site CSS from the builder.
- \`js/main.js\` contains custom site JavaScript from the builder.
- \`site.json\` is a designer-readable snapshot of pages, metadata, tokens, and blocks.
- \`${BUILDER_PROJECT_FILE}\` is for importing back into the builder.

## Designer Notes
Start edits in \`css/tokens.css\`, then move to \`css/pages.css\`. Most generated block styles are inline so the site remains portable and easy to host anywhere. For a larger handoff, move repeated inline styles into \`css/components.css\`.

## Continue Editing In The Builder
Keep this ZIP intact. From the builder dashboard, choose "Upload Existing Site" and upload the ZIP.`;
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
  const faviconMap = buildFaviconAssetMap(data);
  const libImages = data.images || [];
  if (libImages.length > 0) {
    const imgFolder = folder.folder('images');
    libImages.forEach(img => {
      const fname = imageMap[imageRef(img.id)] || imageMap[img.dataURL] || sanitizeAssetFilename(img.name);
      const b64 = img.dataURL.split(',')[1];
      if (b64) imgFolder.file(fname, b64, { base64: true });
    });
  }

  (data.favicons || []).forEach(asset => {
    const filename = faviconMap[asset.name] || asset.name;
    if (!filename) return;
    if (asset.content) {
      folder.file(filename, faviconContent(asset, data));
      return;
    }
    const b64 = String(asset.dataURL || '').split(',')[1];
    if (b64) folder.file(filename, b64, { base64: true });
  });

  // Each page — designer-friendly HTML references external CSS/JS.
  data.pages.forEach((page, i) => {
    const html = compileDesignerPageHTML(data, i, imageMap);
    const filename = (page.slug || (i===0?'index':'page'+i)) + '.html';
    folder.file(filename, html);
  });

  const cssFolder = folder.folder('css');
  cssFolder.file('tokens.css', designerTokensCSS(data));
  cssFolder.file('base.css', designerBaseCSS());
  cssFolder.file('components.css', designerComponentsCSS());
  cssFolder.file('pages.css', data.globalCSS || '');

  const jsFolder = folder.folder('js');
  jsFolder.file('main.js', data.globalJS || '');
  folder.file('site.json', designerSiteJson(data));

  folder.file(BUILDER_MANIFEST_FILE, JSON.stringify({
    format: 'functional-websites-project',
    version: 2,
    exportedAt: new Date().toISOString(),
    siteName: data.name || meta?.name || 'website',
    projectDataFile: BUILDER_PROJECT_FILE,
    imageStorage: 'images-folder'
  }, null, 2));
  folder.file(BUILDER_PROJECT_FILE, JSON.stringify(createPortableProjectData(data, imageMap), null, 2));

  Object.entries(siteDiscoveryFiles(data)).forEach(([name, content]) => folder.file(name, content));
  folder.file('README.md', designerReadme(data));

  const blob = await zip.generateAsync({type: 'blob'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_backup_${exportTimestampForFilename()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof recordZipBackupDownload === 'function') recordZipBackupDownload(id);
  toast('Downloaded!', 'success');
}

// ============================================================
// SETTINGS
// ============================================================
