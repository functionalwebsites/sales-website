// Site builder core. Loaded by site-builder/index.html in dependency order.
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
const STATE = {
  projects: [],        // list of {id, name, created, modified}
  currentProjectId: null,
  currentPageIndex: 0,
  currentMode: 'visual',
  currentDevice: 'desktop',
  currentCodeTab: 'html',
  selectedBlockId: null,
  deployTarget: null,
  editingBlockId: null,
  propsTab: 'page',
  mobileTab: 'canvas',
  imgLibTargetBlockId: null,
  imgLibSelectedId: null,
  imgLibCallback: null,
  pendingScrollBlockId: null,
};

const BUILDER_MANIFEST_FILE = 'functional-websites-manifest.json';
const BUILDER_PROJECT_FILE = 'functional-websites-project.json';
const LIBRARY_PACK_VERSION = 1;

// ============================================================
// UNDO / REDO  (max 50 states, snapshots everything except images)
// ============================================================
const UNDO_LIMIT = 50;
let _undoStack = [];
let _redoStack = [];
let _undoPending = false;
let _saveState = 'saved';

function setSaveStatus(state, text = '') {
  _saveState = state;
  const el = document.getElementById('save-status');
  if (!el) return;
  el.dataset.state = state;
  el.textContent = text || (state === 'dirty' ? 'Unsaved changes' : state === 'saving' ? 'Saving...' : 'Saved');
}

function markDirty() {
  if (_saveState !== 'saving') setSaveStatus('dirty');
}

function _snapshot() {
  return JSON.stringify({
    pages:     _projectData.pages,
    globalCSS: _projectData.globalCSS,
    globalJS:  _projectData.globalJS,
    meta:      _projectData.meta,
    navbars:   _projectData.navbars,
    siteTheme: _projectData.siteTheme,
    styleSystem: _projectData.styleSystem,
  });
}

function _restore(snap) {
  const s = JSON.parse(snap);
  _projectData.pages     = s.pages;
  _projectData.globalCSS = s.globalCSS;
  _projectData.globalJS  = s.globalJS;
  _projectData.meta      = s.meta;
  _projectData.navbars   = s.navbars || {};
  _projectData.siteTheme = s.siteTheme || 'light';
  _projectData.styleSystem = normalizeStyleSystem(s.styleSystem);
}

function pushUndo() {
  _undoStack.push(_snapshot());
  if (_undoStack.length > UNDO_LIMIT) _undoStack.shift();
  _redoStack = [];
  _updateUndoUI();
  markDirty();
}

// Debounced version for high-frequency inputs (typing in a field)
function pushUndoDebounced() {
  markDirty();
  if (_undoPending) return;
  _undoPending = true;
  setTimeout(() => { pushUndo(); _undoPending = false; }, 600);
}

function undo() {
  if (!_undoStack.length) return;
  _redoStack.push(_snapshot());
  _restore(_undoStack.pop());
  STATE.selectedBlockId = null;
  renderPagesList();
  renderCanvas();
  renderProps();
  renderTemplatesSection();
  _updateUndoUI();
  toast('Undone', 'info');
}

function redo() {
  if (!_redoStack.length) return;
  _undoStack.push(_snapshot());
  _restore(_redoStack.pop());
  STATE.selectedBlockId = null;
  renderPagesList();
  renderCanvas();
  renderProps();
  renderTemplatesSection();
  _updateUndoUI();
  toast('Redone', 'info');
}

function _updateUndoUI() {
  const canUndo = _undoStack.length > 0;
  const canRedo = _redoStack.length > 0;
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  const mu = document.getElementById('mob-btn-undo');
  const mr = document.getElementById('mob-btn-redo');
  if (u) u.disabled = !canUndo;
  if (r) r.disabled = !canRedo;
  if (mu) mu.style.opacity = canUndo ? '1' : '0.4';
  if (mr) mr.style.opacity = canRedo ? '1' : '0.4';
}

// Clear stacks when a new project is opened
function _resetUndo() { _undoStack = []; _redoStack = []; _updateUndoUI(); }

// ============================================================
// STORAGE
// ============================================================
const LS = {
  PREFIX: 'fw_',
  get(k) { try { return JSON.parse(localStorage.getItem(this.PREFIX+k)); } catch(e) { return null; } },
  set(k,v) { localStorage.setItem(this.PREFIX+k, JSON.stringify(v)); },
  del(k) { localStorage.removeItem(this.PREFIX+k); },
  keys() { return Object.keys(localStorage).filter(k=>k.startsWith(this.PREFIX)).map(k=>k.slice(this.PREFIX.length)); }
};

function getBuilderTheme() {
  return LS.get('builderTheme') || 'dark';
}

function applyBuilderTheme(theme) {
  document.body.classList.toggle('builder-light', theme === 'light');
}

function setBuilderTheme(theme) {
  LS.set('builderTheme', theme);
  applyBuilderTheme(theme);
  const darkBtn = document.getElementById('btn-builder-theme-dark');
  const lightBtn = document.getElementById('btn-builder-theme-light');
  if (darkBtn) darkBtn.className = `btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`;
  if (lightBtn) lightBtn.className = `btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`;
}

// ============================================================
// PRO TIER SYSTEM
// ============================================================

// Pro token validation API endpoint
const PRO_API_URL = `${window.location.origin}/api/validate-token`;

// Check if user has Pro tier unlocked
function isProUnlocked() {
  const token = localStorage.getItem('fw_pro_token');
  return token && token.length > 0;
}

// Get the stored pro token
function getProToken() {
  return localStorage.getItem('fw_pro_token') || null;
}

// Store pro token locally
function activateProToken(token) {
  if (!token || token.length < 20) {
    toast('Invalid token format', 'error');
    return false;
  }
  localStorage.setItem('fw_pro_token', token);
  localStorage.setItem('fw_pro_activated_at', new Date().toISOString());
  toast('Pro unlocked! ✓', 'success');
  location.reload();
  return true;
}

// Validate token with API (optional - for security)
async function validateProTokenWithAPI(token) {
  try {
    const response = await fetch(PRO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Token validation error:', error);
    // Fall back to local validation if API is down
    return true;
  }
}

// Show pro upsell modal for a feature
function showProUpsell(featureName, featureDescription) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="width: 420px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 16px; color: var(--green); line-height: 1;">◈</div>
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Pro Feature</h2>
        <p style="color: var(--text2); font-size: 14px; margin: 0;">${featureDescription}</p>
      </div>

      <div style="background: var(--bg3); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; color: var(--text); font-weight: 600; margin-bottom: 8px;">Get Pro Today</p>
        <p style="margin: 0; color: var(--text2); font-size: 13px;">Unlock all premium features for a one-time fee of $9.99</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn-primary" style="background: var(--green); color: #000;" onclick="window.open('/pricing/', '_blank'); this.closest('.modal-overlay').remove();">
          Buy Pro
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); showPromoCodeModal();">
          Use Promo Code
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();">
          Cancel
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Show modal for entering pro token or promo code
function showProTokenModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="width: 420px;">
      <h2 class="modal-title">Unlock Pro Features</h2>
      <p style="color: var(--text2); margin-bottom: 20px;">
        Choose how to unlock premium features.
      </p>

      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        <button class="btn btn-secondary" id="tab-token" style="flex: 1;" onclick="switchToTokenTab()">Enter Token</button>
        <button class="btn btn-secondary" id="tab-promo" style="flex: 1;" onclick="switchToPromoTab()">Use Promo Code</button>
      </div>

      <div id="token-section">
        <input
          type="text"
          id="pro-token-input"
          class="input"
          placeholder="Paste your Pro token here..."
          style="margin-bottom: 16px; font-family: monospace; font-size: 12px;"
        />

        <p style="color: var(--text2); font-size: 12px; margin-bottom: 16px;">
          Don't have a token? <a href="/pricing/" target="_blank" rel="noopener" style="color: var(--green); text-decoration: underline; cursor: pointer;">Buy Pro for $9.99</a>
        </p>
      </div>

      <div id="promo-section" style="display: none;">
        <input
          type="email"
          id="promo-email-input"
          class="input"
          placeholder="Your email address"
          style="margin-bottom: 12px;"
        />

        <input
          type="text"
          id="promo-code-input"
          class="input"
          placeholder="Promo code"
          style="margin-bottom: 16px;"
        />

        <p style="color: var(--text2); font-size: 12px; margin-bottom: 16px;">
          Don't have a promo code? <a href="/pricing/" target="_blank" rel="noopener" style="color: var(--green); text-decoration: underline; cursor: pointer;">Buy Pro for $9.99</a>
        </p>

        <div
          id="promo-result"
          style="display:none; white-space:pre-wrap; background: var(--bg3); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px; color: var(--text);"
        ></div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();">
          Cancel
        </button>
        <button class="btn btn-primary" id="unlock-btn" onclick="confirmProToken();">
          Unlock Pro
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('pro-token-input').focus();
  // Set initial state
  document.getElementById('tab-token').className = 'btn btn-primary';
  document.getElementById('tab-promo').className = 'btn btn-secondary';
  document.getElementById('unlock-btn').onclick = () => confirmProToken();
  document.getElementById('unlock-btn').textContent = 'Unlock Pro';
}

// Confirm pro token entry
async function confirmProToken() {
  const token = document.getElementById('pro-token-input').value.trim();

  if (!token || token.length < 20) {
    toast('Invalid token format', 'error');
    return;
  }

  try {
    // Validate token with API
    const isValid = await validateProTokenWithAPI(token);

    if (isValid) {
      activateProToken(token);
    } else {
      toast('Invalid or expired token', 'error');
    }
  } catch (error) {
    console.error('Error validating token:', error);
    toast('Error validating token', 'error');
  }
}

// Switch to token tab
function switchToTokenTab() {
  document.getElementById('token-section').style.display = 'block';
  document.getElementById('promo-section').style.display = 'none';
  document.getElementById('tab-token').className = 'btn btn-primary';
  document.getElementById('tab-promo').className = 'btn btn-secondary';
  document.getElementById('unlock-btn').onclick = () => confirmProToken();
  document.getElementById('unlock-btn').textContent = 'Unlock Pro';
  document.getElementById('pro-token-input').focus();
}

// Switch to promo tab
function switchToPromoTab() {
  document.getElementById('token-section').style.display = 'none';
  document.getElementById('promo-section').style.display = 'block';
  document.getElementById('tab-token').className = 'btn btn-secondary';
  document.getElementById('tab-promo').className = 'btn btn-primary';
  document.getElementById('unlock-btn').onclick = () => confirmPromoCode();
  document.getElementById('unlock-btn').textContent = 'Get Free Pro';
  document.getElementById('promo-email-input').focus();
}

// Show modal for entering promo code
function showPromoCodeModal() {
  showProTokenModal();
  setTimeout(() => switchToPromoTab(), 100);
}

function renderPromoResult(message, isError = false) {
  const el = document.getElementById('promo-result');
  if (!el) return;
  el.style.display = 'block';
  el.style.border = isError ? '1px solid #ef4444' : '1px solid #4ade80';
  el.textContent = message;
}

// Confirm promo code entry
async function confirmPromoCode() {
  const email = document.getElementById('promo-email-input').value.trim();
  const code = document.getElementById('promo-code-input').value.trim();

  if (!email || !code) {
    toast('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch('/api/free-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const result = await response.json();
    if (response.ok) {
      const lines = [
        'Promo code accepted.',
        `Email sent: ${result.emailSent ? 'yes' : 'no'}`
      ];
      if (result.emailError) lines.push(`Email error: ${result.emailError}`);
      lines.push('', result.emailSent
        ? 'Check your email for your Pro token, then paste it into "Enter Token".'
        : 'The token was not shown here. Use a valid email and try again so it can be delivered by email.');
      renderPromoResult(lines.join('\n'), !result.emailSent);

      document.getElementById('tab-token').className = 'btn btn-primary';
      document.getElementById('tab-promo').className = 'btn btn-secondary';
      toast(result.emailSent ? 'Promo code worked. Check your email for the token.' : 'Promo code worked, but email did not send.', result.emailSent ? 'success' : 'error');
    } else {
      renderPromoResult(result.error || 'Invalid promo code', true);
      toast(result.error || 'Invalid promo code', 'error');
    }
  } catch (error) {
    console.error('Promo code error:', error);
    renderPromoResult('Network error. Please try again.', true);
    toast('Network error. Please try again.', 'error');
  }
}

// ============================================================
// PRO-GATED FEATURES
// ============================================================

// Wrap upload custom blocks with pro check
const originalImportLibraryPack = window.importLibraryPack;
window.importLibraryPack = async function(input) {
  if (!isProUnlocked()) {
    showProUpsell(
      'Custom Blocks Library',
      'Import custom block packs to expand your builder capabilities.'
    );
    return;
  }
  return originalImportLibraryPack.call(this, input);
};

// Button click handler for import library (with pro check)
function clickImportLibrary() {
  if (!isProUnlocked()) {
    showProUpsell(
      'Custom Blocks & Templates Library',
      'Import and create custom blocks and templates with Pro tier.'
    );
    return;
  }
  document.getElementById('library-import-input').click();
}

// Button handler for save template (with pro check)
function checkProThenSaveTemplate() {
  if (!isProUnlocked()) {
    showProUpsell(
      'Save Custom Templates',
      'Save the current page as a reusable template with Pro tier.'
    );
    return;
  }
  saveCurrentPageAsLibraryTemplate();
}

// Button handler for save block (with pro check)
function checkProThenSaveBlock() {
  if (!isProUnlocked()) {
    showProUpsell(
      'Save Custom Blocks',
      'Save selected blocks as reusable components with Pro tier.'
    );
    return;
  }
  saveSelectedBlockToLibrary();
}

// Button handler for export bundle (with pro check)
function checkProThenExportBundle() {
  if (!isProUnlocked()) {
    showProUpsell(
      'Export Library Bundle',
      'Export your custom blocks and templates with Pro tier.'
    );
    return;
  }
  exportLibraryBundle();
}

function checkProThenDeploy() {
  if (!isProUnlocked()) {
    showProUpsell(
      'Deploy Website',
      'Deploy directly to GitHub Pages or Cloudflare Pages with Pro. ZIP export stays free for all users.'
    );
    return false;
  }
  return true;
}

// Wrap upload images with pro check (if image uploads should be pro)
// Uncomment below if you want to gate image uploads
// const originalUploadImages = window.uploadImages;
// window.uploadImages = function(input) {
//   if (!isProUnlocked()) {
//     showProUpsell('Upload Images', 'Upload and manage custom images for your sites.');
//     return;
//   }
//   return originalUploadImages.call(this, input);
// };

// Initialize pro features on load
function initProFeatures() {
  const isPro = isProUnlocked();

  // Show/hide unlock pro button
  const unlockProBtn = document.getElementById('btn-unlock-pro');
  if (unlockProBtn) {
    unlockProBtn.style.display = isPro ? 'none' : 'inline-flex';
  }

  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.style.display = isPro ? 'inline-flex' : 'none';
  }

  const deployDesktopBtn = document.getElementById('btn-deploy-desktop');
  if (deployDesktopBtn && !isPro) {
    deployDesktopBtn.style.opacity = '0.7';
    deployDesktopBtn.title = 'Pro feature. ZIP export is still free.';
    deployDesktopBtn.innerHTML = '◈ Deploy';
  }

  const deployMobileBtn = document.getElementById('btn-deploy-mobile');
  if (deployMobileBtn && !isPro) {
    deployMobileBtn.style.opacity = '0.7';
    deployMobileBtn.title = 'Pro feature. ZIP export is still free.';
    deployMobileBtn.innerHTML = '◈ &nbsp;Deploy';
  }

  // Disable pro-only buttons for free users
  document.querySelectorAll('[data-pro-only]').forEach(button => {
    if (!isPro) {
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showProUpsell(
          button.dataset.featureName || 'Pro Feature',
          button.dataset.featureDesc || 'This feature is only available in Pro tier.'
        );
      });
    }
  });

  // Update pro badge visibility
  const proBadges = document.querySelectorAll('.pro-badge');
  if (isPro) {
    proBadges.forEach(badge => badge.style.display = 'inline-block');
  }
}

function loadProjects() {
  STATE.projects = LS.get('projects') || [];
}
function saveProjectsMeta() {
  LS.set('projects', STATE.projects);
}
function getProjectData(id) {
  return normalizeProjectData(LS.get('proj_'+id) || createBlankProjectData('Untitled'));
}
function saveProjectData(id, data) {
  LS.set('proj_'+id, normalizeProjectData(data));
}

function normalizeProjectData(data) {
  if (!data) return createBlankProjectData('Untitled');
  data.siteTheme = 'light';
  data.styleSystem = normalizeStyleSystem(data.styleSystem);
  if (!Array.isArray(data.images)) data.images = [];
  data.images = data.images.map(img => {
    const next = Object.assign({}, img);
    if (!next.id) next.id = uid();
    if (!next.name) next.name = `${next.id}.jpg`;
    if (!next.type && next.dataURL) {
      const match = String(next.dataURL).match(/^data:([^;]+);/);
      next.type = match ? match[1] : 'image/jpeg';
    }
    return next;
  });
  if (!Array.isArray(data.templates)) data.templates = [];
  if (!data.navbars) data.navbars = {};
  return data;
}

function normalizeLibraryData(data = {}) {
  const library = {
    pageTemplates: Array.isArray(data.pageTemplates) ? data.pageTemplates : [],
    blocks: Array.isArray(data.blocks) ? data.blocks : []
  };

  library.pageTemplates = library.pageTemplates
    .filter(item => item && item.projectData)
    .map(item => ({
      id: item.id || uid(),
      name: item.name || 'Custom Website Template',
      description: item.description || '',
      author: item.author || '',
      priceLabel: item.priceLabel || '',
      source: item.source || 'Imported',
      projectData: JSON.parse(JSON.stringify(item.projectData))
    }));

  library.blocks = library.blocks
    .filter(item => item && item.block)
    .map(item => ({
      id: item.id || uid(),
      name: item.name || 'Custom Block',
      description: item.description || '',
      category: item.category || 'Custom',
      author: item.author || '',
      priceLabel: item.priceLabel || '',
      source: item.source || 'Imported',
      block: JSON.parse(JSON.stringify(item.block))
    }));

  return library;
}

function getLibraryData() {
  return normalizeLibraryData(LS.get('library') || {});
}

function saveLibraryData(library) {
  LS.set('library', normalizeLibraryData(library));
}

function mergeLibraryData(nextLibrary) {
  const current = getLibraryData();
  const incoming = normalizeLibraryData(nextLibrary);
  const merged = {
    pageTemplates: [...current.pageTemplates],
    blocks: [...current.blocks]
  };

  incoming.pageTemplates.forEach(item => {
    const idx = merged.pageTemplates.findIndex(existing => existing.name === item.name);
    if (idx >= 0) merged.pageTemplates[idx] = item;
    else merged.pageTemplates.push(item);
  });

  incoming.blocks.forEach(item => {
    const idx = merged.blocks.findIndex(existing => existing.name === item.name);
    if (idx >= 0) merged.blocks[idx] = item;
    else merged.blocks.push(item);
  });

  saveLibraryData(merged);
  return merged;
}

// ============================================================
// PROJECT DATA STRUCTURE
// ============================================================
const BRAND_COLORS = [
  { key: 'pageBg',           label: 'Page Background',        cssVar: '--color-page-bg',           default: '#ffffff' },
  { key: 'sectionBg',        label: 'Section Background',     cssVar: '--color-section-bg',        default: '#f8f8f8' },
  { key: 'textDark',         label: 'Text (Dark)',            cssVar: '--color-text-dark',         default: '#111111' },
  { key: 'textMuted',        label: 'Text (Muted)',           cssVar: '--color-text-muted',        default: '#666666' },
  { key: 'textLight',        label: 'Text (Light)',           cssVar: '--color-text-light',        default: '#ffffff' },
  { key: 'accent',           label: 'Brand Accent',           cssVar: '--color-accent',            default: '#7c6af7' },
  { key: 'accentText',       label: 'Accent Text',            cssVar: '--color-accent-text',       default: '#ffffff' },
  { key: 'btnPrimary',       label: 'Button Primary',         cssVar: '--color-btn-primary',       default: '#7c6af7' },
  { key: 'btnPrimaryText',   label: 'Button Primary Text',    cssVar: '--color-btn-primary-text',  default: '#ffffff' },
  { key: 'btnSecondary',     label: 'Button Secondary',       cssVar: '--color-btn-secondary',     default: '#f0f0f0' },
  { key: 'btnSecondaryText', label: 'Button Secondary Text',  cssVar: '--color-btn-secondary-text',default: '#333333' },
  { key: 'navBg',            label: 'Navbar Background',      cssVar: '--color-nav-bg',            default: '#ffffff' },
  { key: 'footerBg',         label: 'Footer Background',      cssVar: '--color-footer-bg',         default: '#1a1a1a' },
  { key: 'border',           label: 'Border',                 cssVar: '--color-border',            default: '#e0e0e0' },
];

const STYLE_SYSTEM_FIELDS = [
  { key: 'fontFamily', label: 'Body Font Family', cssVar: '--site-font-family', default: "'Segoe UI', system-ui, sans-serif", type: 'text' },
  { key: 'bodySize', label: 'Body Text Size', cssVar: '--site-body-size', default: '16px', type: 'text' },
  { key: 'lineHeight', label: 'Line Height', cssVar: '--site-line-height', default: '1.6', type: 'text' },
  { key: 'headingFontFamily', label: 'Heading Font Family', cssVar: '--site-heading-font-family', default: 'inherit', type: 'text' },
  { key: 'headingScale', label: 'Heading Scale', cssVar: '--site-heading-scale', default: '1', type: 'range', min: '0.85', max: '1.25', step: '0.05' },
  { key: 'sectionPadding', label: 'Section Padding', cssVar: '--site-section-padding', default: '72px 20px', type: 'text' },
  { key: 'sectionWidth', label: 'Section Width', cssVar: '--site-section-width', default: '1100px', type: 'text' },
  { key: 'contentGap', label: 'Content Gap', cssVar: '--site-content-gap', default: '24px', type: 'text' },
  { key: 'buttonRadius', label: 'Button Radius', cssVar: '--site-button-radius', default: '6px', type: 'text' },
  { key: 'cardRadius', label: 'Card Radius', cssVar: '--site-card-radius', default: '8px', type: 'text' }
];

function defaultStyleSystem() {
  const out = {};
  STYLE_SYSTEM_FIELDS.forEach(field => { out[field.key] = field.default; });
  return out;
}

function normalizeStyleSystem(styleSystem = {}) {
  return Object.assign(defaultStyleSystem(), styleSystem || {});
}

let _brandContext = null;
let _projectNameContext = '';
let _canvasBodyResizeObserver = null;
let _lastCanvasHeight = 0;
const CANVAS_MIN_HEIGHT = 320;

function createBlankProjectData(name, setup = {}) {
  const brand = {};
  BRAND_COLORS.forEach(c => { brand[c.key] = c.default; });
  Object.assign(brand, setup.brand || {});
  const brandName = setup.brandName || name;
  return {
    name,
    brandName,
    siteTheme: 'light',
    styleSystem: normalizeStyleSystem(setup.styleSystem),
    globalCSS: `/* Global styles */\nbody { margin: 0; font-family: var(--site-font-family, 'Segoe UI', system-ui, sans-serif); font-size: var(--site-body-size, 16px); line-height: var(--site-line-height, 1.6); background: var(--color-page-bg, #ffffff); color: var(--color-text-dark, #111111); }\n* { box-sizing: border-box; }\nh1, h2, h3, h4 { font-family: var(--site-heading-font-family, inherit); }`,
    globalJS: `// Global scripts\n`,
    meta: { description: setup.description || '', keywords: '', author: setup.author || '', favicon: '', ogType: 'website', ogImage: '', twitterCard: 'summary_large_image' },
    brand,
    images: [],
    templates: [],
    navbars: {},
    pages: [
      { id: uid(), name: 'Home', slug: 'index', blocks: [], meta: {} }
    ]
  };
}

function applyTemplate(data, template) {
  if (template === 'blank') return data;
  const p = data.pages[0];
  if (template === 'landing') {
    p.blocks = [
      mkBlock('nav', {}),
      mkBlock('hero', { heading: 'Welcome to My Website', subheading: 'Build something amazing today.', buttonText: 'Get Started', buttonHref: '#', bgColor: data.brand?.accent || '#7c6af7', textColor: '#ffffff' }),
      mkBlock('features', {}),
      mkBlock('cta', {}),
      mkBlock('footer', {}),
    ];
    data.globalCSS += `\nsection { padding: 60px 20px; }\n.container { max-width: 1100px; margin: 0 auto; }`;
  } else if (template === 'portfolio') {
    p.blocks = [
      mkBlock('nav', {}),
      mkBlock('hero', { heading: "Hi, I'm Your Name", subheading: 'Designer & Developer', buttonText: 'View Work', buttonHref: '#work', bgColor: '#1a1a2e', textColor: '#ffffff' }),
      mkBlock('cards', {}),
      mkBlock('footer', {}),
    ];
  } else if (template === 'blog') {
    p.blocks = [
      mkBlock('nav', {}),
      mkBlock('hero', { heading: 'Welcome to My Blog', subheading: 'Thoughts, stories, and ideas.', buttonText: 'Read Articles', buttonHref: '#', bgColor: '#1e1e2e', textColor: '#ffffff' }),
      mkBlock('text', { content: '<p>Start writing your blog content here. Add more text blocks, headings, and images to build your first article.</p>' }),
      mkBlock('footer', {}),
    ];
  } else if (template === 'docs') {
    p.blocks = [
      mkBlock('nav', {}),
      mkBlock('heading', { text: 'Documentation', level: 'h1' }),
      mkBlock('text', { content: '<p>Welcome to the documentation. Use the navigation to explore topics.</p>' }),
      mkBlock('footer', {}),
    ];
    data.pages.push({ id: uid(), name: 'Getting Started', slug: 'getting-started', blocks: [
      mkBlock('heading', { text: 'Getting Started', level: 'h1' }),
      mkBlock('text', { content: '<p>This is the getting started guide.</p>' }),
    ]});
  }
  return data;
}

function applyLibraryProjectTemplate(baseData, templateEntry) {
  const incoming = JSON.parse(JSON.stringify(templateEntry.projectData || {}));
  const brandName = baseData.brandName || baseData.name;
  const merged = Object.assign({}, baseData, incoming);
  const mergedMeta = Object.assign({}, incoming.meta || {});
  Object.entries(baseData.meta || {}).forEach(([key, value]) => {
    if (value !== '' && value != null) mergedMeta[key] = value;
  });
  merged.name = baseData.name;
  merged.brandName = brandName;
  merged.brand = Object.assign({}, incoming.brand || {}, baseData.brand || {});
  merged.meta = mergedMeta;
  merged.images = Array.isArray(incoming.images) ? incoming.images : [];
  merged.templates = Array.isArray(incoming.templates) ? incoming.templates : [];
  merged.navbars = incoming.navbars || {};
  merged.siteTheme = incoming.siteTheme || baseData.siteTheme || 'light';
  merged.styleSystem = normalizeStyleSystem(Object.assign({}, incoming.styleSystem || {}, baseData.styleSystem || {}));
  merged.pages = Array.isArray(incoming.pages) && incoming.pages.length
    ? incoming.pages
    : JSON.parse(JSON.stringify(baseData.pages));
  return merged;
}

// ============================================================
// BLOCK DEFINITIONS
// ============================================================
function uid() {
  return Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}

function mkBlock(type, props = {}) {
  const brand = _brandContext || _projectData?.brand || {};
  const projectBrandName = _projectData?.brandName || _projectNameContext || _projectData?.name || 'My Site';
  const defaults = {
    nav: { navbarId: 'main' },
    hero: { heading: 'Welcome', subheading: 'Your tagline here.', buttonText: 'Learn More', buttonHref: '#', bgColor: brand.accent || '#7c6af7', textColor: '#ffffff', btnBg: '#ffffff', btnColor: brand.accent || '#7c6af7', minHeight: 'auto', contentWidth: '', padding: '', align: 'center', bgImage: '', bgSize: 'cover', bgPosition: 'center', overlayColor: '#000000', overlayOpacity: '0' },
    heading: { text: 'Section Title', level: 'h2', align: 'left', color: '#111111' },
    text: { content: '<p>Add your text content here. Click to edit.</p>', align: 'left', color: '#333333' },
    image: { src: '', alt: 'Image', width: '100%', height: 'auto', aspectRatio: '', fit: 'contain', align: 'center', rounded: true, caption: '' },
    button: { text: 'Click Here', href: '#', bgColor: brand.accent || '#7c6af7', textColor: '#ffffff', align: 'center', size: 'medium', rounded: true },
    section: { bgColor: '#ffffff', padding: '', maxWidth: '', content: '<h2>Section Title</h2>\n<p>Add your section content here.</p>' },
    columns2: { bgColor: '#ffffff', padding: '', col1: '<p>Column 1 content</p>', col2: '<p>Column 2 content</p>', gap: '' },
    columns3: { bgColor: '#ffffff', padding: '', col1: '<p>Column 1</p>', col2: '<p>Column 2</p>', col3: '<p>Column 3</p>', gap: '' },
    divider: { color: '#dddddd', thickness: '1px', margin: '20px 0' },
    spacer: { height: '40px' },
    cards: { bgColor: '#f8f8f8', padding: '', title: 'Our Work', cards: [
      { title: 'Project One', desc: 'Description of this project.', img: '' },
      { title: 'Project Two', desc: 'Description of this project.', img: '' },
      { title: 'Project Three', desc: 'Description of this project.', img: '' },
    ]},
    features: { bgColor: '#ffffff', padding: '', title: 'Features', features: [
      { icon: 'ϟ', title: 'Fast', desc: 'Lightning fast performance.' },
      { icon: '✦', title: 'Beautiful', desc: 'Stunning designs out of the box.' },
      { icon: '◈', title: 'Secure', desc: 'Built with security in mind.' },
    ]},
    cta: { bgColor: brand.accent || '#7c6af7', textColor: '#ffffff', padding: '', heading: 'Ready to get started?', subheading: 'Join thousands of happy users today.', buttonText: 'Get Started Free', buttonHref: '#', btnBg: '#ffffff', btnColor: brand.accent || '#7c6af7' },
    footer: { bgColor: brand.dark || '#1a1a1a', textColor: '#aaaaaa', linkColor: '#cccccc', brand: projectBrandName, tagline: 'Building the web.', copyright: `© ${new Date().getFullYear()} ${projectBrandName}. All rights reserved.` },
    form: { bgColor: '#f8f8f8', padding: '', title: 'Contact Us', submitText: 'Send Message', action: '#', btnBg: brand.accent || '#7c6af7', btnColor: '#ffffff' },
    youtubeEmbed: { title: 'Featured Video', description: 'Use a YouTube video to explain your offer or show your work.', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', maxWidth: '960px', aspectRatio: '16 / 9', autoplay: false, showControls: true, privacyMode: true, rounded: true, sectionBg: '#ffffff' },
    testimonialWall: { title: 'What Customers Say', intro: 'Social proof helps visitors trust you faster. Add a few real reviews to show the quality of your work.', bgColor: '#f5f8fc', padding: '80px 20px', maxWidth: '1100px', columns: '3', showStars: true, highlightFirst: false, testimonials: [
      { name: 'Jordan M.', role: 'Homeowner', quote: 'Fast response, fair pricing, and clear communication from start to finish.', rating: '5' },
      { name: 'Taylor R.', role: 'Local Customer', quote: 'Professional, efficient, and respectful of our home. We would absolutely hire them again.', rating: '5' },
      { name: 'Avery S.', role: 'Repeat Client', quote: 'One of the easiest contractor experiences we have had. Everything felt organized and trustworthy.', rating: '5' }
    ]},
    html: { code: '<div style="padding:20px;background:#f0f0f0;border-radius:8px;text-align:center;">\n  <p>Custom HTML block. Click Properties to edit.</p>\n</div>' },
  };
  // Track which props are linked to brand color keys so they auto-update when brand changes
  const brandLinkDefaults = {
    hero:   { bgColor: 'accent', btnColor: 'accent' },
    button: { bgColor: 'accent' },
    cta:    { bgColor: 'accent', btnColor: 'accent' },
    footer: { bgColor: 'dark' },
    form:   { btnBg: 'accent' },
  };
  const block = { id: uid(), type, props: Object.assign({}, defaults[type] || {}, props) };
  if (brandLinkDefaults[type] && brand.accent) {
    block.brandLinks = Object.assign({}, brandLinkDefaults[type]);
  }
  return block;
}

// ============================================================
// BLOCK RENDERERS
// ============================================================
