// Site builder app. Loaded by site-builder/index.html in dependency order.
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
function openHelpDocs() {
  openModal('modal-help-docs');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// Enter key in modals
document.getElementById('new-project-name').addEventListener('keydown', e => { if (e.key==='Enter') createProject(); });
document.getElementById('rename-input').addEventListener('keydown', e => { if (e.key==='Enter') confirmRename(); });
document.getElementById('new-page-name').addEventListener('keydown', e => { if (e.key==='Enter') confirmAddPage(); });

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'•'}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ============================================================
// UTILS
// ============================================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function init() {
  console.log('DOM loaded, initializing app');
  applyBuilderTheme(getBuilderTheme());
  initProFeatures();
  loadProjects();
  renderDashboard();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key==='s') {
      e.preventDefault();
      if (STATE.currentProjectId) saveProject();
    }
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='z') {
      e.preventDefault();
      if (STATE.currentProjectId) undo();
    }
    if ((e.ctrlKey||e.metaKey) && (e.shiftKey && e.key==='z' || e.key==='y')) {
      e.preventDefault();
      if (STATE.currentProjectId) redo();
    }
    if (e.key==='Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });

  document.addEventListener('click', e => {
    if (!STATE.currentProjectId || !document.body.classList.contains('editor-mode')) return;
    const link = e.target.closest('a[href]');
    if (!link || link.hasAttribute('download')) return;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    e.preventDefault();
    window.open(link.href, '_blank', 'noopener');
  });

  window.addEventListener('beforeunload', e => {
    if (_saveState !== 'dirty') return;
    e.preventDefault();
    e.returnValue = '';
  });

  // Update back button when window resizes (mobile/desktop toggle)
  window.addEventListener('resize', debounce(updateBackButton, 150));

  // Canvas resize is managed from iframe load/content observers.
});
