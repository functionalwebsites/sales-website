// Site builder app. Loaded by build/index.html in dependency order.
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
function openHelpDocs() {
  openModal('modal-help-docs');
}

function dialogEsc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showBuilderDialog(options = {}) {
  const fields = Array.isArray(options.fields) ? options.fields : [];
  let overlay = document.getElementById('modal-builder-dialog');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-builder-dialog';
    overlay.className = 'modal-overlay hidden';
    document.body.appendChild(overlay);
  }

  return new Promise(resolve => {
    const onKeydown = event => {
      if (event.key === 'Escape') close(null);
    };
    const close = value => {
      document.removeEventListener('keydown', onKeydown);
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      resolve(value);
    };
    overlay.onclick = event => {
      if (event.target === overlay) close(null);
    };

    const fieldsHtml = fields.map(field => `
      <div class="builder-dialog-field">
        <label class="label" for="builder-dialog-${dialogEsc(field.id)}">${dialogEsc(field.label || field.id)}</label>
        <input class="input" id="builder-dialog-${dialogEsc(field.id)}" type="${dialogEsc(field.type || 'text')}" value="${dialogEsc(field.value || '')}" placeholder="${dialogEsc(field.placeholder || '')}">
      </div>
    `).join('');

    overlay.innerHTML = `<div class="modal">
      <div class="modal-title">${dialogEsc(options.title || 'Confirm')}</div>
      ${options.message ? `<div class="builder-dialog-message">${dialogEsc(options.message)}</div>` : ''}
      ${fieldsHtml}
      <div class="modal-actions">
        <button class="btn btn-secondary" type="button" data-dialog-action="cancel">${dialogEsc(options.cancelText || 'Cancel')}</button>
        <button class="btn ${options.destructive ? 'btn-danger' : 'btn-primary'}" type="button" data-dialog-action="confirm">${dialogEsc(options.confirmText || 'OK')}</button>
      </div>
    </div>`;

    const confirm = () => {
      if (!fields.length) {
        close(true);
        return;
      }
      const values = {};
      fields.forEach(field => {
        values[field.id] = document.getElementById(`builder-dialog-${field.id}`)?.value || '';
      });
      close(values);
    };

    overlay.querySelector('[data-dialog-action="cancel"]').onclick = () => close(null);
    overlay.querySelector('[data-dialog-action="confirm"]').onclick = confirm;
    overlay.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') confirm();
      });
    });
    document.addEventListener('keydown', onKeydown);
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.querySelector('input,button[data-dialog-action="confirm"]')?.focus(), 0);
  });
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
  applyBuilderPanelState();
  initProFeatures();
  loadProjects();
  if (!restoreProjectFromUrl()) {
    renderDashboard();
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const key = String(e.key || '').toLowerCase();
    if ((e.ctrlKey||e.metaKey) && key === 's') {
      e.preventDefault();
      if (STATE.currentProjectId) saveProject();
    }
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && key === 'z') {
      e.preventDefault();
      if (STATE.currentProjectId) undo();
    }
    if ((e.ctrlKey||e.metaKey) && ((e.shiftKey && key === 'z') || key === 'y')) {
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
