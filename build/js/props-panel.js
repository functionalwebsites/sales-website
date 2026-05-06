// Site builder props-panel. Loaded by build/index.html in dependency order.
function addBlock(type) {
  pushUndo();
  const block = mkBlock(type);
  const page = _projectData.pages[STATE.currentPageIndex];
  page.blocks.push(block);
  STATE.selectedBlockId = block.id;
  STATE.pendingScrollBlockId = block.id;
  renderCanvas();
  renderLayoutList();
  renderProps();
  // On mobile: go to canvas to see the new block, then select it
  if (isMobile()) switchMobileTab('canvas');
}

function getPrimaryActionHref() {
  const pages = _projectData?.pages || [];
  const actionPage = pages.find(page => /contact|reserve|booking|donate|checkout|pricing/i.test(page.name || ''));
  if (!actionPage) return '#';
  return `${actionPage.slug || 'index'}.html`;
}

function sectionRecipeBlocks(kind) {
  const brand = _projectData?.brand || {};
  const actionHref = getPrimaryActionHref();
  const recipes = {
    offer: [
      mkBlock('section', {
        bgColor: brand.sectionBg || '#f8f8f8',
        content: '<h2>What you get</h2>\n<p>Use this section to make the offer concrete. Explain the outcome, who it is for, and why it is different.</p>'
      }),
      mkBlock('features', {
        title: 'Built around the result',
        features: [
          { icon: 'ϟ', title: 'Clear Outcome', desc: 'State the practical result customers can expect.' },
          { icon: '✦', title: 'Simple Process', desc: 'Explain how working with you stays easy.' },
          { icon: '◈', title: 'Reliable Support', desc: 'Show what happens after the first purchase or inquiry.' }
        ]
      })
    ],
    proof: [
      mkBlock('testimonialWall', {
        title: 'What customers notice',
        intro: 'Replace these with real quotes, reviews, metrics, or case study excerpts.',
        highlightFirst: true
      }),
      mkBlock('cards', {
        title: 'Recent results',
        cards: [
          { title: 'Result One', desc: 'Summarize a concrete win, project, or customer outcome.', img: '' },
          { title: 'Result Two', desc: 'Add numbers, time saved, revenue, bookings, or quality improvements.', img: '' },
          { title: 'Result Three', desc: 'Use a specific example that supports the main offer.', img: '' }
        ]
      })
    ],
    process: [
      mkBlock('columns3', {
        bgColor: '#ffffff',
        col1: '<h3>1. Plan</h3><p>Clarify the goal, audience, and must-have details.</p>',
        col2: '<h3>2. Build</h3><p>Create the core experience with clear copy and useful sections.</p>',
        col3: '<h3>3. Launch</h3><p>Review responsive behavior, connect forms, and publish.</p>'
      }),
      mkBlock('cta', {
        heading: 'Ready for the next step?',
        subheading: 'Point visitors to one clear action after they understand the process.',
        buttonText: 'Get Started',
        buttonHref: actionHref
      })
    ],
    contact: [
      mkBlock('section', {
        bgColor: brand.sectionBg || '#f8f8f8',
        content: '<h2>Talk to us</h2>\n<p>Add response times, service area, booking expectations, or anything visitors should know before reaching out.</p>'
      }),
      mkBlock('form', {
        title: 'Send a message',
        submitText: 'Send Message'
      })
    ]
  };
  return recipes[kind] || recipes.offer;
}

function insertSectionRecipe(kind) {
  pushUndo();
  const page = _projectData.pages[STATE.currentPageIndex];
  const blocks = sectionRecipeBlocks(kind);
  page.blocks.push(...blocks);
  const firstBlock = blocks[0];
  STATE.selectedBlockId = firstBlock?.id || null;
  STATE.pendingScrollBlockId = firstBlock?.id || null;
  renderCanvas();
  renderLayoutList();
  renderProps();
  toast('Section recipe added', 'success');
  if (isMobile()) switchMobileTab('canvas');
}

// ============================================================
// PROPERTIES PANEL
// ============================================================
function renderProps() {
  const panel = document.getElementById('props-panel');
  if (!STATE.selectedBlockId) {
    panel.innerHTML = buildSitePropsHTML();
    return;
  }
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===STATE.selectedBlockId);
  if (!block) { panel.innerHTML = '<div class="text-muted text-sm">Block not found.</div>'; return; }

  panel.innerHTML = buildPropsForm(block);
}

function switchPropsTab(tab) {
  STATE.propsTab = tab;
  renderProps();
}

function buildSitePropsHTML() {
  const tab = STATE.propsTab || 'page';
  const page = _projectData.pages[STATE.currentPageIndex];
  const pm = page.meta || {};
  const sm = _projectData.meta || {};

  let html = `<div class="props-tabs" style="position:relative;">
    <button class="props-tab-btn ${tab==='page'?'active':''}" onclick="switchPropsTab('page')">Page</button>
    <button class="props-tab-btn ${tab==='site'?'active':''}" onclick="switchPropsTab('site')">Site</button>
    <button class="props-tab-btn m-only" style="margin-left:auto;font-size:11px;" onclick="switchMobileTab('canvas')">Canvas →</button>
  </div>`;

  if (tab === 'page') {
    html += `<div class="props-section">
      <div class="props-section-title">Page Meta</div>
      <div class="field"><label class="label">Title Override</label><input class="input" type="text" value="${(pm.titleOverride||'').replace(/"/g,'&quot;')}" placeholder="Leave blank to use page name" oninput="updatePageMeta('titleOverride',this.value)"></div>
      <div class="field"><label class="label">Description</label><textarea class="input" rows="3" oninput="updatePageMeta('description',this.value)">${pm.description||''}</textarea></div>
      <div class="field"><label class="label">OG Title</label><input class="input" type="text" value="${(pm.ogTitle||'').replace(/"/g,'&quot;')}" placeholder="Defaults to page title" oninput="updatePageMeta('ogTitle',this.value)"></div>
      <div class="field"><label class="label">OG Description</label><textarea class="input" rows="2" oninput="updatePageMeta('ogDescription',this.value)">${pm.ogDescription||''}</textarea></div>
      <div class="field"><label class="label">OG Image URL</label><input class="input" type="text" value="${(pm.ogImage||'').replace(/"/g,'&quot;')}" placeholder="https://… or leave blank for site default" oninput="updatePageMeta('ogImage',this.value)"></div>
    </div>`;
  } else {
    html += `<div class="props-section">
      <div class="props-section-title">Site Meta Defaults</div>
      <div class="field"><label class="label">Description</label><textarea class="input" rows="3" oninput="updateSiteMeta('description',this.value)">${sm.description||''}</textarea></div>
      <div class="field"><label class="label">Keywords</label><input class="input" type="text" value="${(sm.keywords||'').replace(/"/g,'&quot;')}" placeholder="keyword1, keyword2" oninput="updateSiteMeta('keywords',this.value)"></div>
      <div class="field"><label class="label">Author</label><input class="input" type="text" value="${(sm.author||'').replace(/"/g,'&quot;')}" oninput="updateSiteMeta('author',this.value)"></div>
      <div class="field"><label class="label">Favicon URL</label><input class="input" type="text" value="${(sm.favicon||'').replace(/"/g,'&quot;')}" placeholder="favicon.ico" oninput="updateSiteMeta('favicon',this.value)"></div>
      <div class="field"><label class="label">Default OG Image</label><input class="input" type="text" value="${(sm.ogImage||'').replace(/"/g,'&quot;')}" placeholder="https://…" oninput="updateSiteMeta('ogImage',this.value)"></div>
      <div class="field"><label class="label">Twitter Card</label>
        <select class="input" onchange="updateSiteMeta('twitterCard',this.value)">
          ${['summary','summary_large_image','app','player'].map(v=>`<option value="${v}" ${(sm.twitterCard||'summary_large_image')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>
`;
    // Brand colors
    const br = _projectData.brand || {};
    html += `<div class="props-section">
      <div class="props-section-title" style="margin-bottom:6px;">Brand Colors</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Auto-injected as CSS variables on every page. Also appear as quick swatches in all color pickers.</div>`;
    BRAND_COLORS.forEach(c => {
      const val = br[c.key] || c.default;
      const swId  = `brnd_sw_${c.key}`;
      const cpId  = `brnd_cp_${c.key}`;
      const txtId = `brnd_txt_${c.key}`;
      html += `<div class="field">
        <label class="label">${c.label} <span style="font-size:10px;opacity:.55;">${c.cssVar}</span></label>
        <div class="color-input-wrap">
          <div style="position:relative;flex-shrink:0;">
            <div id="${swId}" class="color-swatch" style="background:${val}"></div>
            <input type="color" id="${cpId}" value="${val}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer;border:none;padding:0;"
              oninput="updateBrandColor('${c.key}',this.value);syncColor('${swId}','${txtId}',this.value)">
          </div>
          <input class="input" type="text" id="${txtId}" value="${val}"
            oninput="updateBrandColor('${c.key}',this.value);syncColor('${swId}','${cpId}',this.value)" style="flex:1;">
        </div>
      </div>`;
    });
    html += `</div>`;

    const ss = normalizeStyleSystem(_projectData.styleSystem);
    html += `<div class="props-section">
      <div class="props-section-title" style="margin-bottom:6px;">Style System</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:10px;">Global defaults for typography, spacing, section width, radius, and heading scale. New blocks inherit these defaults when their block-level fields are blank.</div>`;
    STYLE_SYSTEM_FIELDS.forEach(field => {
      const value = ss[field.key] || field.default;
      if (field.type === 'range') {
        html += `<div class="field">
          <label class="label">${field.label} <span id="style_val_${field.key}" style="color:var(--text);">${value}</span> <span style="font-size:10px;opacity:.55;">${field.cssVar}</span></label>
          <input class="input" type="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" oninput="updateStyleSystem('${field.key}',this.value);document.getElementById('style_val_${field.key}').textContent=this.value">
        </div>`;
      } else {
        html += `<div class="field">
          <label class="label">${field.label} <span style="font-size:10px;opacity:.55;">${field.cssVar}</span></label>
          <input class="input" type="text" value="${String(value).replace(/"/g,'&quot;')}" oninput="updateStyleSystem('${field.key}',this.value)">
        </div>`;
      }
    });
    html += `<button class="btn btn-secondary btn-sm" onclick="resetStyleSystem()">Reset Style System</button></div>
    <details class="props-advanced" style="margin-top:4px;border:1px solid var(--border);border-radius:6px;overflow:hidden;">
      <summary style="padding:8px 12px;cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);background:var(--bg3);user-select:none;">
        ⚙︎ Global CSS &amp; JS
      </summary>
      <div style="padding:12px;">
        <div class="field">
          <label class="label">Global CSS</label>
          <textarea class="input" rows="8" style="font-family:monospace;font-size:11px;" oninput="updateGlobalCSS(this.value)">${(_projectData.globalCSS||'').replace(/</g,'&lt;')}</textarea>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label class="label">Global JS</label>
          <textarea class="input" rows="6" style="font-family:monospace;font-size:11px;" oninput="updateGlobalJS(this.value)">${(_projectData.globalJS||'').replace(/</g,'&lt;')}</textarea>
        </div>
      </div>
    </details>`;
  }

  return html;
}

// ============================================================
// BRAND COLORS
// ============================================================
function buildBrandCSS(projectData) {
  const b = projectData.brand || {};
  const vars = BRAND_COLORS
    .filter(c => b[c.key])
    .map(c => `  ${c.cssVar}: ${b[c.key]};`)
    .join('\n');
  return vars ? `:root {\n${vars}\n}` : '';
}

function buildStyleSystemCSS(projectData) {
  const s = normalizeStyleSystem(projectData.styleSystem);
  const sectionPaddingY = String(s.sectionPadding || '72px 20px').trim().split(/\s+/)[0] || '72px';
  const vars = STYLE_SYSTEM_FIELDS
    .map(field => `  ${field.cssVar}: ${s[field.key] || field.default};`)
    .join('\n');
  return `:root {\n${vars}\n  --site-section-padding-y: ${sectionPaddingY};\n}`;
}

function updateBrandColor(key, value) {
  pushUndoDebounced();
  if (!_projectData.brand) _projectData.brand = {};
  _projectData.brand[key] = value;
  // Propagate to all blocks on all pages that are linked to this brand color
  (_projectData.pages || []).forEach(page => {
    (page.blocks || []).forEach(block => {
      if (!block.brandLinks) return;
      Object.entries(block.brandLinks).forEach(([propKey, brandKey]) => {
        if (brandKey === key) block.props[propKey] = value;
      });
    });
  });
  renderCanvas();
}

function updatePageMeta(key, value) {
  pushUndoDebounced();
  const page = _projectData.pages[STATE.currentPageIndex];
  if (!page.meta) page.meta = {};
  page.meta[key] = value;
}

function updateSiteMeta(key, value) {
  pushUndoDebounced();
  if (!_projectData.meta) _projectData.meta = {};
  _projectData.meta[key] = value;
}

function updateStyleSystem(key, value) {
  pushUndoDebounced();
  _projectData.styleSystem = normalizeStyleSystem(_projectData.styleSystem);
  _projectData.styleSystem[key] = value;
  renderCanvas();
}

function resetStyleSystem() {
  pushUndo();
  _projectData.styleSystem = defaultStyleSystem();
  renderCanvas();
  renderProps();
}

function escapeHtmlForTextarea(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getBlockRawHTML(block) {
  return renderBlock(block, false, Object.assign({}, _projectData, { _imageMap: buildImageAssetMap(_projectData) }));
}

function buildContentInsertButtons(blockId, propKey) {
  const items = [
    ['heading', 'Heading'],
    ['text', 'Text'],
    ['image', 'Image'],
    ['button', 'Button'],
    ['divider', 'Divider'],
    ['spacer', 'Spacer'],
    ['html', 'Custom HTML']
  ];
  return `<div class="field">
    <label class="label">Insert Content Block</label>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${items.map(([type, label]) => `<button class="btn btn-secondary btn-sm" onclick="insertContentIntoProp('${blockId}','${propKey}','${type}')">+ ${label}</button>`).join('')}
    </div>
  </div>`;
}

function buildPropsForm(block) {
  const p = block.props;
  const type = block.type;

  let html = `<div class="props-section"><div class="props-section-title" style="display:flex;align-items:center;justify-content:space-between;">${type.charAt(0).toUpperCase()+type.slice(1)}<button class="btn btn-ghost btn-sm d-only" style="font-size:11px;padding:2px 8px;color:var(--text2);" onclick="deselectBlock()" title="Back to Page / Site settings">← Page / Site</button></div>
    <button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:12px;" onclick="resetBlockStyle('${block.id}')">Reset Block Style</button>`;

  const field = (label, key, inputType = 'text', extra = '') => {
    if (inputType === 'color') {
      const cpId  = `cp_${key}_${block.id}`;
      const txtId = `cptxt_${key}_${block.id}`;
      const swId  = `cpsw_${key}_${block.id}`;
      const cur   = p[key] || '#ffffff';
      return `<div class="field">
        <label class="label">${label}</label>
        <div class="color-input-wrap">
          <div style="position:relative;flex-shrink:0;">
            <div id="${swId}" class="color-swatch" style="background:${cur}"></div>
            <input type="color" id="${cpId}" value="${cur}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer;border:none;padding:0;"
              oninput="updateProp('${block.id}','${key}',this.value);syncColor('${swId}','${txtId}',this.value)">
          </div>
          <input class="input" type="text" id="${txtId}" value="${cur}"
            oninput="updateProp('${block.id}','${key}',this.value);syncColor('${swId}','${cpId}',this.value)" style="flex:1;">
        </div>
      </div>`;
    }
    if (inputType === 'textarea') {
      return `<div class="field"><label class="label">${label}</label><textarea class="input" rows="4" oninput="updateProp('${block.id}','${key}',this.value)" ${extra}>${p[key]||''}</textarea></div>`;
    }
    if (inputType === 'select') {
      return `<div class="field"><label class="label">${label}</label><select class="input" onchange="updateProp('${block.id}','${key}',this.value)" ${extra}>${extra}</select></div>`;
    }
    return `<div class="field"><label class="label">${label}</label><input class="input" type="${inputType}" value="${p[key]||''}" oninput="updateProp('${block.id}','${key}',this.value)"></div>`;
  };

  switch(type) {
    case 'nav': {
      // Legacy blocks without navbarId
      if (!p.navbarId) {
        html += field('Brand Name', 'brand');
        html += field('Links (comma separated)', 'links');
        html += field('Background', 'bgColor', 'color');
        html += field('Text Color', 'textColor', 'color');
        html += field('Link Color', 'linkColor', 'color');
        break;
      }
      ensureNavbar(p.navbarId);
      const nc = _projectData.navbars[p.navbarId];
      const navId = p.navbarId;
      const allNavIds = Object.keys(_projectData.navbars || {});

      // Variant selector
      html += `<div class="field"><label class="label">Navbar Variant <span class="text-muted" style="font-size:10px;">— changes apply to all pages using this variant</span></label>
        <div style="display:flex;gap:6px;">
          <select class="input" onchange="switchNavVariant('${block.id}',this.value)" style="flex:1;">
            ${allNavIds.map(nid => `<option value="${nid}" ${nid===navId?'selected':''}>${(_projectData.navbars[nid].name||nid)}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" onclick="createNavVariant('${block.id}')">+ New</button>
        </div>
      </div>`;

      // Brand name
      html += `<div class="field"><label class="label">Brand Name</label>
        <input class="input" type="text" value="${(nc.brand||'').replace(/"/g,'&quot;')}" oninput="updateNavConfig('${navId}','brand',this.value)">
      </div>`;
      html += `<div class="field"><label class="label">Logo URL or Library Reference</label>
        <div style="display:flex;gap:6px;">
          <input class="input" type="text" value="${(nc.logoSrc||'').replace(/"/g,'&quot;')}" placeholder="Upload or choose from library" oninput="updateNavConfig('${navId}','logoSrc',this.value)" style="flex:1;">
          <button class="btn btn-secondary btn-sm" onclick="openImageLibrary(null,(url)=>{updateNavConfig('${navId}','logoSrc',url);renderProps();})"><span style="color:var(--green);">▧</span></button>
        </div>
      </div>`;
      if (imageRefLabel(nc.logoSrc)) html += `<div class="text-muted text-sm" style="margin-top:-8px;margin-bottom:12px;">${imageRefLabel(nc.logoSrc)}</div>`;
      html += `<div class="field"><label class="label">Logo Alt Text</label>
        <input class="input" type="text" value="${(nc.logoAlt||'').replace(/"/g,'&quot;')}" oninput="updateNavConfig('${navId}','logoAlt',this.value)">
      </div>`;
      html += `<div class="field"><label class="label">Logo Height</label>
        <input class="input" type="text" value="${(nc.logoHeight||'32px').replace(/"/g,'&quot;')}" placeholder="32px" oninput="updateNavConfig('${navId}','logoHeight',this.value)">
      </div>`;
      html += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0 10px;" class="label">
        <input type="checkbox" ${nc.showBrandText !== false?'checked':''} onchange="updateNavConfig('${navId}','showBrandText',this.checked)">
        Show brand text next to logo
      </label>`;
      html += `<button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:12px;" onclick="setNavLogoAsFavicon('${navId}')">Use Logo As Favicon</button>`;

      // Color fields wired to updateNavConfig
      const navColorField = (label, key) => {
        const cpId  = `ncp_${key}_${navId}`;
        const txtId = `ncptxt_${key}_${navId}`;
        const swId  = `ncpsw_${key}_${navId}`;
        const cur   = nc[key] || '#ffffff';
        return `<div class="field"><label class="label">${label}</label>
          <div class="color-input-wrap">
            <div style="position:relative;flex-shrink:0;">
              <div id="${swId}" class="color-swatch" style="background:${cur}"></div>
              <input type="color" id="${cpId}" value="${cur}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer;border:none;padding:0;"
                oninput="updateNavConfig('${navId}','${key}',this.value);syncColor('${swId}','${txtId}',this.value)">
            </div>
            <input class="input" type="text" id="${txtId}" value="${cur}"
              oninput="updateNavConfig('${navId}','${key}',this.value);syncColor('${swId}','${cpId}',this.value)" style="flex:1;">
          </div>
        </div>`;
      };
      html += navColorField('Background Color', 'bgColor');
      html += navColorField('Text Color', 'textColor');
      html += navColorField('Link Color', 'linkColor');
      html += `<div class="field"><label class="label">Content Alignment</label>
        <select class="input" onchange="updateNavConfig('${navId}','align',this.value)">
          <option value="split" ${(nc.align||'split')==='split'?'selected':''}>Brand left, links right</option>
          <option value="left" ${(nc.align||'split')==='left'?'selected':''}>Left</option>
          <option value="center" ${(nc.align||'split')==='center'?'selected':''}>Center</option>
          <option value="right" ${(nc.align||'split')==='right'?'selected':''}>Right</option>
        </select>
      </div>`;
      html += `<div class="field"><label class="label">Mobile Layout</label>
        <select class="input" onchange="updateNavConfig('${navId}','mobileLayout',this.value)">
          <option value="hamburger" ${(nc.mobileLayout||'hamburger')==='hamburger'?'selected':''}>Hamburger menu</option>
          <option value="stack" ${(nc.mobileLayout||'hamburger')==='stack'?'selected':''}>Vertical stack</option>
          <option value="center-stack" ${(nc.mobileLayout||'hamburger')==='center-stack'?'selected':''}>Centered stack</option>
          <option value="inline" ${(nc.mobileLayout||'hamburger')==='inline'?'selected':''}>Inline wrap</option>
        </select>
      </div>`;
      html += `<div class="field"><label class="label">Mobile Breakpoint (px)</label>
        <input class="input" type="number" min="320" max="1400" step="1" value="${nc.mobileBreakpoint||'768'}" oninput="updateNavConfig('${navId}','mobileBreakpoint',this.value)">
      </div>`;

      // Page links
      html += `<div class="props-section-title" style="margin-top:4px;">Page Links</div>`;
      (_projectData.pages||[]).forEach(pg => {
        const checked = nc.pageLinks === 'all' || (Array.isArray(nc.pageLinks) && nc.pageLinks.includes(pg.id));
        html += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;" class="label">
          <input type="checkbox" ${checked?'checked':''} onchange="toggleNavPage('${navId}','${pg.id}')">
          ${pg.name}
        </label>`;
      });

      // Custom links
      html += `<div class="props-section-title" style="margin-top:12px;">Custom Links</div>`;
      (nc.customLinks||[]).forEach(lnk => {
        html += `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:11px;font-weight:600;color:var(--text2);">${lnk.label||'Link'}</span>
            <button class="btn btn-danger btn-sm" style="padding:2px 8px;" onclick="removeNavCustomLink('${navId}','${lnk.id}')">× Remove</button>
          </div>
          <div class="field"><label class="label">Label</label>
            <input class="input" type="text" value="${(lnk.label||'').replace(/"/g,'&quot;')}" oninput="updateNavCustomLink('${navId}','${lnk.id}','label',this.value)">
          </div>
          <div class="field" style="margin-bottom:0;"><label class="label">URL</label>
            <input class="input" type="text" value="${(lnk.href||'').replace(/"/g,'&quot;')}" oninput="updateNavCustomLink('${navId}','${lnk.id}','href',this.value)">
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding-top:8px;" class="label">
            <input type="checkbox" ${lnk.asButton?'checked':''} onchange="updateNavCustomLink('${navId}','${lnk.id}','asButton',this.checked)">
            Style as button
          </label>
        </div>`;
      });
      html += `<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:4px;" onclick="addNavCustomLink('${navId}')">+ Add Custom Link</button>`;
      break;
    }
    case 'hero':
      html += field('Heading', 'heading');
      html += field('Subheading', 'subheading');
      html += field('Button Text', 'buttonText');
      html += field('Button Link', 'buttonHref');
      html += field('Minimum Height', 'minHeight');
      html += field('Content Width', 'contentWidth');
      html += `<div class="field"><label class="label">Content Align</label><select class="input" onchange="updateProp('${block.id}','align',this.value)">
        ${['left','center','right'].map(v=>`<option value="${v}" ${(p.align||'center')===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += field('Background Color', 'bgColor', 'color');
      html += field('Background Image URL or Library Reference', 'bgImage');
      if (imageRefLabel(p.bgImage)) html += `<div class="text-muted text-sm" style="margin-top:-8px;margin-bottom:12px;">${imageRefLabel(p.bgImage)}</div>`;
      html += `<div class="field"><button class="btn btn-secondary btn-sm" style="width:100%;" onclick="openImageLibrary(null,(url)=>{updateProp('${block.id}','bgImage',url);renderProps();})"><span style="color:var(--green);">▧</span> Use Image Library as Background</button></div>`;
      html += `<div class="field"><label class="label">Background Size</label><select class="input" onchange="updateProp('${block.id}','bgSize',this.value)">
        ${['cover','contain','auto','100% auto','auto 100%'].map(v=>`<option value="${v}" ${(p.bgSize||'cover')===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += field('Background Position', 'bgPosition');
      html += field('Overlay Color', 'overlayColor', 'color');
      html += `<div class="field"><label class="label">Overlay Opacity <span style="font-size:10px;opacity:.6;">0 to 1</span></label><input class="input" type="number" min="0" max="1" step="0.05" value="${p.overlayOpacity||'0'}" oninput="updateProp('${block.id}','overlayOpacity',this.value)"></div>`;
      html += field('Text Color', 'textColor', 'color');
      html += field('Button Background', 'btnBg', 'color');
      html += field('Button Text Color', 'btnColor', 'color');
      break;
    case 'heading':
      html += field('Text', 'text');
      html += `<div class="field"><label class="label">Level</label><select class="input" onchange="updateProp('${block.id}','level',this.value)">
        ${['h1','h2','h3','h4'].map(v=>`<option value="${v}" ${p.level===v?'selected':''}>${v.toUpperCase()}</option>`).join('')}
      </select></div>`;
      html += `<div class="field"><label class="label">Align</label><select class="input" onchange="updateProp('${block.id}','align',this.value)">
        ${['left','center','right'].map(v=>`<option value="${v}" ${p.align===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += field('Color', 'color', 'color');
      break;
    case 'text':
      html += `<div class="field"><label class="label">Content (HTML)</label><textarea class="input" rows="6" oninput="updateProp('${block.id}','content',this.value)">${(p.content||'').replace(/</g,'&lt;')}</textarea></div>`;
      html += `<div class="field"><label class="label">Align</label><select class="input" onchange="updateProp('${block.id}','align',this.value)">
        ${['left','center','right'].map(v=>`<option value="${v}" ${p.align===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += field('Color', 'color', 'color');
      break;
    case 'image':
      html += field('Image URL or Library Reference', 'src');
      if (imageRefLabel(p.src)) html += `<div class="text-muted text-sm" style="margin-top:-8px;margin-bottom:12px;">${imageRefLabel(p.src)}</div>`;
      html += `<div class="field"><button class="btn btn-secondary btn-sm" style="width:100%;" onclick="openImageLibrary('${block.id}')"><span style="color:var(--green);">▧</span> Browse Image Library</button></div>`;
      html += field('Alt Text', 'alt');
      html += field('Width', 'width');
      html += field('Height', 'height');
      html += field('Aspect Ratio', 'aspectRatio');
      html += `<div class="field"><label class="label">Object Fit</label><select class="input" onchange="updateProp('${block.id}','fit',this.value)">
        ${['contain','cover','fill','scale-down','none'].map(v=>`<option value="${v}" ${(p.fit||'contain')===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += field('Caption', 'caption');
      html += `<div class="field"><label class="label">Align</label><select class="input" onchange="updateProp('${block.id}','align',this.value)">
        ${['left','center','right'].map(v=>`<option value="${v}" ${p.align===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.rounded?'checked':''} onchange="updateProp('${block.id}','rounded',this.checked)"> Rounded corners</label></div>`;
      break;
    case 'button':
      html += field('Button Text', 'text');
      html += field('Link (href)', 'href');
      html += field('Background', 'bgColor', 'color');
      html += field('Text Color', 'textColor', 'color');
      html += `<div class="field"><label class="label">Size</label><select class="input" onchange="updateProp('${block.id}','size',this.value)">
        ${['small','medium','large'].map(v=>`<option value="${v}" ${p.size===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += `<div class="field"><label class="label">Align</label><select class="input" onchange="updateProp('${block.id}','align',this.value)">
        ${['left','center','right'].map(v=>`<option value="${v}" ${p.align===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      break;
    case 'section':
      html += field('Background Color', 'bgColor', 'color');
      html += field('Padding', 'padding');
      html += field('Max Width', 'maxWidth');
      html += buildContentInsertButtons(block.id, 'content');
      html += `<div class="field"><label class="label">Section HTML</label><textarea class="input" rows="8" oninput="updateProp('${block.id}','content',this.value)">${escapeHtmlForTextarea(p.content||'')}</textarea></div>`;
      break;
    case 'columns2':
    case 'columns3':
      html += field('Background Color', 'bgColor', 'color');
      html += field('Padding', 'padding');
      html += field('Gap', 'gap');
      html += buildContentInsertButtons(block.id, 'col1');
      html += `<div class="field"><label class="label">Column 1 HTML</label><textarea class="input" rows="5" oninput="updateProp('${block.id}','col1',this.value)">${escapeHtmlForTextarea(p.col1||'')}</textarea></div>`;
      html += buildContentInsertButtons(block.id, 'col2');
      html += `<div class="field"><label class="label">Column 2 HTML</label><textarea class="input" rows="5" oninput="updateProp('${block.id}','col2',this.value)">${escapeHtmlForTextarea(p.col2||'')}</textarea></div>`;
      if (type === 'columns3') {
        html += buildContentInsertButtons(block.id, 'col3');
        html += `<div class="field"><label class="label">Column 3 HTML</label><textarea class="input" rows="5" oninput="updateProp('${block.id}','col3',this.value)">${escapeHtmlForTextarea(p.col3||'')}</textarea></div>`;
      }
      break;
    case 'divider':
      html += field('Color', 'color', 'color');
      html += field('Thickness (e.g. 1px)', 'thickness');
      html += field('Margin (e.g. 20px 0)', 'margin');
      break;
    case 'spacer':
      html += field('Height (e.g. 40px)', 'height');
      break;
    case 'cta':
      html += field('Heading', 'heading');
      html += field('Subheading', 'subheading');
      html += field('Button Text', 'buttonText');
      html += field('Button Link', 'buttonHref');
      html += field('Background Color', 'bgColor', 'color');
      html += field('Text Color', 'textColor', 'color');
      html += field('Button Background', 'btnBg', 'color');
      html += field('Button Text Color', 'btnColor', 'color');
      break;
    case 'footer':
      html += field('Brand Name', 'brand');
      html += field('Tagline', 'tagline');
      html += field('Copyright', 'copyright');
      html += field('Background Color', 'bgColor', 'color');
      html += field('Text Color', 'textColor', 'color');
      html += field('Link Color', 'linkColor', 'color');
      break;
    case 'form':
      html += field('Title', 'title');
      html += field('Submit Button Text', 'submitText');
      html += field('Form Action URL', 'action');
      html += field('Background Color', 'bgColor', 'color');
      html += field('Button Color', 'btnBg', 'color');
      html += field('Button Text Color', 'btnColor', 'color');
      break;
    case 'youtubeEmbed':
      html += field('Title', 'title');
      html += field('Description', 'description', 'textarea');
      html += field('Video URL', 'videoUrl');
      html += field('Max Width', 'maxWidth');
      html += `<div class="field"><label class="label">Aspect Ratio</label><select class="input" onchange="updateProp('${block.id}','aspectRatio',this.value)">
        ${['16 / 9','4 / 3','1 / 1','9 / 16'].map(v=>`<option value="${v}" ${(p.aspectRatio||'16 / 9')===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
      html += field('Section Background', 'sectionBg', 'color');
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.autoplay?'checked':''} onchange="updateProp('${block.id}','autoplay',this.checked)"> Autoplay</label></div>`;
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.showControls !== false?'checked':''} onchange="updateProp('${block.id}','showControls',this.checked)"> Show player controls</label></div>`;
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.privacyMode !== false?'checked':''} onchange="updateProp('${block.id}','privacyMode',this.checked)"> Privacy-enhanced mode</label></div>`;
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.rounded?'checked':''} onchange="updateProp('${block.id}','rounded',this.checked)"> Rounded corners</label></div>`;
      break;
    case 'testimonialWall':
      html += field('Section Title', 'title');
      html += field('Intro Text', 'intro', 'textarea');
      html += field('Background Color', 'bgColor', 'color');
      html += field('Padding', 'padding');
      html += field('Max Width', 'maxWidth');
      html += `<div class="field"><label class="label">Columns</label><input class="input" type="range" min="1" max="4" step="1" value="${p.columns||'3'}" oninput="updateProp('${block.id}','columns',this.value);document.getElementById('tw_cols_${block.id}').textContent=this.value"></div><div class="text-muted text-sm" id="tw_cols_${block.id}" style="margin-top:-8px;margin-bottom:12px;">${p.columns||'3'}</div>`;
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.showStars !== false?'checked':''} onchange="updateProp('${block.id}','showStars',this.checked)"> Show star ratings</label></div>`;
      html += `<div class="field"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label"><input type="checkbox" ${p.highlightFirst?'checked':''} onchange="updateProp('${block.id}','highlightFirst',this.checked)"> Highlight first testimonial</label></div>`;
      html += `<div class="field"><label class="label">Testimonials</label>`;
      (p.testimonials||[]).forEach((t,i) => {
        html += `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:600;color:var(--text2);">Testimonial ${i+1}</span>
            <button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:11px;" onclick="removeItem('${block.id}','testimonials',${i})">× Remove</button>
          </div>
          <div class="field"><label class="label">Name</label><input class="input" type="text" value="${(t.name||'').replace(/"/g,'&quot;')}" oninput="updateItem('${block.id}','testimonials',${i},'name',this.value)"></div>
          <div class="field"><label class="label">Role</label><input class="input" type="text" value="${(t.role||'').replace(/"/g,'&quot;')}" oninput="updateItem('${block.id}','testimonials',${i},'role',this.value)"></div>
          <div class="field"><label class="label">Quote</label><textarea class="input" rows="3" oninput="updateItem('${block.id}','testimonials',${i},'quote',this.value)">${t.quote||''}</textarea></div>
          <div class="field" style="margin-bottom:0;"><label class="label">Rating</label><input class="input" type="range" min="1" max="5" step="1" value="${t.rating||'5'}" oninput="updateItem('${block.id}','testimonials',${i},'rating',this.value);document.getElementById('tw_rating_${block.id}_${i}').textContent=this.value"></div>
          <div class="text-muted text-sm" id="tw_rating_${block.id}_${i}" style="margin-top:6px;">${t.rating||'5'}</div>
        </div>`;
      });
      html += `<button class="btn btn-secondary btn-sm" style="width:100%;" onclick="addItem('${block.id}','testimonials',{name:'Customer Name',role:'Customer Role',quote:'Add a real customer quote here.',rating:'5'})">+ Add Testimonial</button></div>`;
      break;
    case 'html':
      html += `<div class="field"><label class="label">HTML Code</label><textarea class="input" rows="10" style="font-family:monospace;font-size:12px;" oninput="updateProp('${block.id}','code',this.value)">${(p.code||'').replace(/</g,'&lt;')}</textarea></div>`;
      break;
    case 'cards':
      html += field('Section Title', 'title');
      html += field('Background Color', 'bgColor', 'color');
      html += field('Padding', 'padding');
      html += `<div class="field"><label class="label">Cards</label>`;
      (p.cards||[]).forEach((c,i) => {
        html += `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:600;color:var(--text2);">Card ${i+1}</span>
            <button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:11px;" onclick="removeItem('${block.id}','cards',${i})">× Remove</button>
          </div>
          <div class="field"><label class="label">Title</label><input class="input" type="text" value="${(c.title||'').replace(/"/g,'&quot;')}" oninput="updateItem('${block.id}','cards',${i},'title',this.value)"></div>
          <div class="field"><label class="label">Description</label><textarea class="input" rows="2" oninput="updateItem('${block.id}','cards',${i},'desc',this.value)">${c.desc||''}</textarea></div>
          <div class="field"><label class="label">Image</label>
            <div style="display:flex;gap:6px;">
              <input class="input" type="text" value="${(c.img||'').replace(/"/g,'&quot;')}" placeholder="https://… or use library" oninput="updateItem('${block.id}','cards',${i},'img',this.value)" style="flex:1;">
              <button class="btn btn-secondary btn-sm" onclick="openImageLibrary(null,(url)=>{updateItem('${block.id}','cards',${i},'img',url)})"><span style="color:var(--green);">▧</span></button>
            </div>
          </div>
        </div>`;
      });
      html += `<button class="btn btn-secondary btn-sm" style="width:100%;" onclick="addItem('${block.id}','cards',{title:'Card Title',desc:'Description here.',img:''})">+ Add Card</button></div>`;
      break;
    case 'features':
      html += field('Section Title', 'title');
      html += field('Background Color', 'bgColor', 'color');
      html += `<div class="field"><label class="label">Features</label>`;
      (p.features||[]).forEach((f,i) => {
        html += `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:600;color:var(--text2);">Feature ${i+1}</span>
            <button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:11px;" onclick="removeItem('${block.id}','features',${i})">× Remove</button>
          </div>
          <div class="field"><label class="label">Icon</label><input class="input" type="text" value="${(f.icon||'').replace(/"/g,'&quot;')}" style="max-width:80px;" oninput="updateItem('${block.id}','features',${i},'icon',this.value)"></div>
          <div class="field"><label class="label">Title</label><input class="input" type="text" value="${(f.title||'').replace(/"/g,'&quot;')}" oninput="updateItem('${block.id}','features',${i},'title',this.value)"></div>
          <div class="field"><label class="label">Description</label><textarea class="input" rows="2" oninput="updateItem('${block.id}','features',${i},'desc',this.value)">${f.desc||''}</textarea></div>
        </div>`;
      });
      html += `<button class="btn btn-secondary btn-sm" style="width:100%;" onclick="addItem('${block.id}','features',{icon:'✦',title:'Feature',desc:'Describe this feature.'})">+ Add Feature</button></div>`;
      break;
    default:
      html += '<div class="text-muted text-sm">No properties available.</div>';
  }

  html += buildResponsiveControls(block);
  html += '</div>';

  // Collapsible Advanced section
  const rawBlockHtml = escapeHtmlForTextarea(getBlockRawHTML(block));

  html += `<details class="props-advanced" style="margin-top:12px;border:1px solid var(--border);border-radius:6px;overflow:hidden;">
    <summary style="padding:8px 12px;cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);background:var(--bg3);user-select:none;">
      ⚙︎ Advanced
    </summary>
    <div style="padding:12px;">
      <div class="field">
        <label class="label">Anchor / Slug <span style="font-size:10px;opacity:.6;">(HTML id attribute)</span></label>
        <input class="input" type="text" value="${(p.anchor||'').replace(/"/g,'&quot;')}" placeholder="e.g. about, contact-section"
          oninput="updateProp('${block.id}','anchor',this.value)">
      </div>

      <div class="field">
        <label class="label">Block CSS <span style="font-size:10px;opacity:.6;">(injected before this block)</span></label>
        <textarea class="input" rows="5" style="font-family:monospace;font-size:11px;"
          oninput="updateProp('${block.id}','blockCSS',this.value)">${(p.blockCSS||'').replace(/</g,'&lt;')}</textarea>
      </div>

      <div class="field">
        <label class="label">Block JS <span style="font-size:10px;opacity:.6;">(injected after this block)</span></label>
        <textarea class="input" rows="4" style="font-family:monospace;font-size:11px;"
          oninput="updateProp('${block.id}','blockJS',this.value)">${(p.blockJS||'').replace(/</g,'&lt;')}</textarea>
      </div>

      <div class="field" style="margin-bottom:0;">
        <label class="label">Raw HTML Snippet <span style="font-size:10px;opacity:.6;">(read-only rendered output)</span></label>
        <textarea
          class="input"
          rows="10"
          readonly
          spellcheck="false"
          style="font-family:monospace;font-size:11px;opacity:.9;cursor:text;resize:vertical;"
        >${rawBlockHtml}</textarea>
      </div>
    </div>
  </details>`;

  html += `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
    <button class="btn btn-secondary btn-sm" onclick="saveBlockAsTemplate()" title="Save this block's configuration as a reusable template"><span style="color:var(--green);">▣</span> Save Template</button>
    <button class="btn btn-secondary btn-sm" onclick="saveSelectedBlockToLibrary()" title="Save this block into the global custom block library">⬆ Save To Library</button>
    <button class="btn btn-danger btn-sm" onclick="window.removeBlock('${block.id}')">⌫ Delete Block</button>
  </div>`;

  return html;
}

function buildResponsiveControls(block) {
  const p = block.props || {};
  const gridTypes = ['columns2', 'columns3', 'cards', 'features', 'testimonialWall'];
  return `<details class="props-advanced" style="margin-top:12px;border:1px solid var(--border);border-radius:6px;overflow:hidden;">
    <summary style="padding:8px 12px;cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);background:var(--bg3);user-select:none;">
      Responsive
    </summary>
    <div style="padding:12px;">
      <div class="field">
        <label class="label">Mobile Breakpoint (px)</label>
        <input class="input" type="number" min="320" max="1400" step="1" value="${p.mobileBreakpoint || '760'}" oninput="updateProp('${block.id}','mobileBreakpoint',this.value)">
      </div>
      <div class="field">
        <label class="label">Mobile Padding Override</label>
        <input class="input" type="text" placeholder="e.g. 48px 18px" value="${(p.mobilePadding || '').replace(/"/g,'&quot;')}" oninput="updateProp('${block.id}','mobilePadding',this.value)">
      </div>
      <div class="field">
        <label class="label">Mobile Min Height Override</label>
        <input class="input" type="text" placeholder="e.g. 420px" value="${(p.mobileMinHeight || '').replace(/"/g,'&quot;')}" oninput="updateProp('${block.id}','mobileMinHeight',this.value)">
      </div>
      <div class="field">
        <label class="label">Mobile Text Align</label>
        <select class="input" onchange="updateProp('${block.id}','mobileTextAlign',this.value)">
          ${['inherit','left','center','right'].map(v=>`<option value="${v}" ${(p.mobileTextAlign||'inherit')===v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      ${gridTypes.includes(block.type) ? `<div class="field">
        <label class="label">Mobile Grid</label>
        <select class="input" onchange="updateProp('${block.id}','mobileGrid',this.value)">
          <option value="stack" ${(p.mobileGrid||'stack')==='stack'?'selected':''}>Stack to one column</option>
          <option value="two" ${p.mobileGrid==='two'?'selected':''}>Use two columns</option>
          <option value="keep" ${p.mobileGrid==='keep'?'selected':''}>Keep desktop columns</option>
        </select>
      </div>` : ''}
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;" class="label">
        <input type="checkbox" ${p.hideOnMobile?'checked':''} onchange="updateProp('${block.id}','hideOnMobile',this.checked)">
        Hide on mobile
      </label>
    </div>
  </details>`;
}



function updateProp(blockId, key, value) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===blockId);
  if (!block) return;
  pushUndoDebounced();
  block.props[key] = value;
  // Manual edit breaks the brand link for this prop
  if (block.brandLinks && block.brandLinks[key]) delete block.brandLinks[key];
  renderCanvas();
  renderLayoutList();
}

const BLOCK_STYLE_KEYS = [
  'bgColor', 'textColor', 'linkColor', 'btnBg', 'btnColor', 'color',
  'sectionBg', 'padding', 'maxWidth', 'contentWidth', 'gap',
  'minHeight', 'bgSize', 'bgPosition', 'overlayColor', 'overlayOpacity',
  'width', 'height', 'aspectRatio', 'fit', 'align', 'rounded', 'size',
  'columns', 'showStars', 'highlightFirst', 'mobileBreakpoint', 'mobilePadding',
  'mobileMinHeight', 'mobileTextAlign', 'mobileGrid', 'hideOnMobile'
];

function resetBlockStyle(blockId) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page?.blocks.find(b => b.id === blockId);
  if (!block) return;

  pushUndo();
  const defaults = mkBlock(block.type).props || {};
  BLOCK_STYLE_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      block.props[key] = defaults[key];
    } else {
      delete block.props[key];
    }
  });

  if (block.brandLinks) {
    Object.keys(block.brandLinks).forEach(key => {
      if (BLOCK_STYLE_KEYS.includes(key)) delete block.brandLinks[key];
    });
  }

  if (block.type === 'nav' && block.props.navbarId && _projectData.navbars?.[block.props.navbarId]) {
    const nav = _projectData.navbars[block.props.navbarId];
    const brand = _projectData.brand || {};
    nav.bgColor = brand.navBg || '#ffffff';
    nav.textColor = brand.textDark || '#333333';
    nav.linkColor = brand.textDark || '#333333';
    nav.align = 'split';
    nav.mobileLayout = 'hamburger';
    nav.mobileBreakpoint = '768';
  }

  renderCanvas();
  renderLayoutList();
  renderProps();
}

function getContentSnippetHTML(type) {
  const snippetBlock = mkBlock(type);
  return renderBlock(snippetBlock, false, _projectData);
}

function insertContentIntoProp(blockId, key, type) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===blockId);
  if (!block) return;
  pushUndo();
  const current = block.props[key] || '';
  const spacer = current.trim() ? '\n\n' : '';
  block.props[key] = current + spacer + getContentSnippetHTML(type);
  renderCanvas();
  renderProps();
  renderLayoutList();
}

// Keep color swatch + sibling input in sync without re-rendering the whole panel
function syncColor(swId, sibId, value) {
  const sw  = document.getElementById(swId);
  const sib = document.getElementById(sibId);
  if (sw)  sw.style.background = value;
  if (sib) sib.value = value;
}

function addItem(blockId, key, defaults) {
  pushUndo();
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===blockId);
  if (!block) return;
  if (!block.props[key]) block.props[key] = [];
  block.props[key].push(Object.assign({}, defaults));
  renderCanvas();
  renderProps();
}

function removeItem(blockId, key, index) {
  pushUndo();
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===blockId);
  if (!block || !block.props[key]) return;
  block.props[key].splice(index, 1);
  renderCanvas();
  renderProps();
}

function updateItem(blockId, key, index, field, value) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b=>b.id===blockId);
  if (!block || !block.props[key]) return;
  pushUndoDebounced();
  block.props[key][index][field] = value;
  renderCanvas();
}

function updateGlobalCSS(value) {
  pushUndoDebounced();
  _projectData.globalCSS = value;
  renderCanvas();
}

function updateGlobalJS(value) {
  pushUndoDebounced();
  _projectData.globalJS = value;
}

// ============================================================
// SHARED NAVBAR SYSTEM
// ============================================================
function ensureNavbar(navbarId) {
  if (!_projectData.navbars) _projectData.navbars = {};
  if (!_projectData.navbars[navbarId]) {
    _projectData.navbars[navbarId] = {
      name: navbarId === 'main' ? 'Default Nav' : navbarId,
      brand: _projectData?.brandName || _projectData?.name || 'My Site',
      logoSrc: _projectData?.logo?.src || '',
      logoAlt: _projectData?.logo?.alt || _projectData?.brandName || _projectData?.name || 'Logo',
      logoHeight: '32px',
      showBrandText: true,
      bgColor: '#ffffff',
      textColor: '#333333',
      linkColor: '#333333',
      align: 'split',
      mobileLayout: 'hamburger',
      mobileBreakpoint: '768',
      pageLinks: 'all',
      customLinks: []
    };
  }
}

function updateNavConfig(navbarId, key, value) {
  pushUndoDebounced();
  ensureNavbar(navbarId);
  _projectData.navbars[navbarId][key] = value;
  renderCanvas();
}

async function setNavLogoAsFavicon(navbarId) {
  ensureNavbar(navbarId);
  const logoSrc = _projectData.navbars[navbarId].logoSrc;
  if (!logoSrc) {
    toast('Choose a nav logo first.', 'error');
    return;
  }
  const img = isImageRef(logoSrc)
    ? (_projectData.images || []).find(item => item.id === imageIdFromRef(logoSrc))
    : null;
  const dataURL = img?.dataURL || logoSrc;
  if (!/^data:image\//.test(dataURL)) {
    toast('Use an uploaded library image to generate favicons.', 'error');
    return;
  }
  try {
    pushUndo();
    _projectData.favicons = await buildFaviconSetFromLogo(dataURL, _projectData.brandName || _projectData.name || 'Website');
    _projectData.meta = _projectData.meta || {};
    _projectData.meta.favicon = 'favicon-32x32.png';
    renderProps();
    toast('Favicons generated from logo.', 'success');
  } catch (error) {
    toast(`Favicon conversion failed: ${error.message}`, 'error');
  }
}

function createNavVariant(blockId) {
  const name = prompt('Variant name (e.g. "Dark Nav"):');
  if (!name || !name.trim()) return;
  const newId = 'nav_' + uid();
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b => b.id === blockId);
  const sourceId = block?.props?.navbarId || 'main';
  ensureNavbar(sourceId);
  pushUndo();
  _projectData.navbars[newId] = JSON.parse(JSON.stringify(_projectData.navbars[sourceId]));
  _projectData.navbars[newId].name = name.trim();
  if (block) block.props.navbarId = newId;
  renderCanvas();
  renderProps();
  toast(`Created variant "${name.trim()}"`, 'success');
}

function switchNavVariant(blockId, navbarId) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const block = page.blocks.find(b => b.id === blockId);
  if (!block) return;
  pushUndo();
  block.props.navbarId = navbarId;
  renderCanvas();
  renderProps();
}

function toggleNavPage(navbarId, pageId) {
  pushUndoDebounced();
  ensureNavbar(navbarId);
  const nc = _projectData.navbars[navbarId];
  if (nc.pageLinks === 'all') {
    // Convert to explicit list with this page removed
    nc.pageLinks = (_projectData.pages || []).map(pg => pg.id).filter(id => id !== pageId);
  } else {
    const arr = Array.isArray(nc.pageLinks) ? [...nc.pageLinks] : [];
    const idx = arr.indexOf(pageId);
    if (idx === -1) arr.push(pageId); else arr.splice(idx, 1);
    // If all pages checked, simplify back to 'all'
    nc.pageLinks = arr.length === (_projectData.pages||[]).length ? 'all' : arr;
  }
  renderCanvas();
}

function addNavCustomLink(navbarId) {
  pushUndo();
  ensureNavbar(navbarId);
  const nc = _projectData.navbars[navbarId];
  if (!nc.customLinks) nc.customLinks = [];
  nc.customLinks.push({ id: uid(), label: 'Link', href: '#', asButton: false });
  renderProps();
  renderCanvas();
}

function removeNavCustomLink(navbarId, linkId) {
  pushUndo();
  ensureNavbar(navbarId);
  _projectData.navbars[navbarId].customLinks = (_projectData.navbars[navbarId].customLinks||[]).filter(l => l.id !== linkId);
  renderCanvas();
  renderProps();
}

function updateNavCustomLink(navbarId, linkId, field, value) {
  pushUndoDebounced();
  ensureNavbar(navbarId);
  const link = (_projectData.navbars[navbarId].customLinks||[]).find(l => l.id === linkId);
  if (link) { link[field] = value; renderCanvas(); }
}

// ============================================================
// IMAGE LIBRARY
// ============================================================
