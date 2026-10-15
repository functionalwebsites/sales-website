// Presets stay ordinary editable blocks; no special template runtime is required.
const DESIGN_RECIPES = [
  "split",
  "bento",
  "editorial",
  "faq",
  "tabs",
  "gallery",
  "comparison",
];
function refreshDesignRecipes() {
  const el = document.getElementById("design-recipes");
  if (!el) return;
  // Use the same row and icon treatment as every other left-panel block.
  const presets = {
    split: { label: 'Split Hero', icon: '◧' },
    bento: { label: 'Bento Grid', icon: '⊞' },
    editorial: { label: 'Editorial Story', icon: '¶' },
    faq: { label: 'FAQ Accordion', icon: '≡' },
    tabs: { label: 'Content Tabs', icon: '▤' },
    gallery: { label: 'Gallery', icon: '▧' },
    comparison: { label: 'Comparison Table', icon: '▦' },
  };
  el.innerHTML = DESIGN_RECIPES.map(name => {
    const preset = presets[name];
    return `<button class="block-btn" type="button" onclick="insertDesignRecipe('${name}')"><span class="block-icon" aria-hidden="true">${preset.icon}</span> ${preset.label}</button>`;
  }).join('');
}
function insertDesignRecipe(kind) {
  let block;
  if (kind === "split" || kind === "editorial") {
    block = mkBlock("columns2", {
      columnTemplate: kind === "editorial" ? "1.5fr 1fr" : "1fr 1fr",
      columns: [
        [
          mkBlock("heading", {
            text:
              kind === "split"
                ? "Make your next move"
                : "A story worth telling",
            level: kind === "split" ? "h1" : "h2",
          }),
          mkBlock("text", {
            content:
              "<p>Explain what makes your work valuable, in your own words.</p>",
          }),
          mkBlock("button", {
            text: "Get in touch",
            href: getPrimaryActionHref(),
          }),
        ],
        [
          mkBlock("image", {
            src: "",
            alt: "Describe your featured image",
            aspectRatio: "4 / 3",
            fit: "cover",
          }),
        ],
      ],
    });
  } else if (kind === "bento") {
    block = mkBlock("columns2", {
      columnTemplate: "1.6fr 1fr",
      columns: [
        [
          mkBlock("section", {
            blocks: [
              mkBlock("heading", { text: "Your big idea" }),
              mkBlock("text", {
                content: "<p>Give your strongest benefit room to breathe.</p>",
              }),
            ],
            bgColor: "#e9ede8",
            padding: "48px 24px",
          }),
        ],
        [
          mkBlock("section", {
            blocks: [mkBlock("heading", { text: "Made for you", level: "h3" })],
            bgColor: "#f1f1f1",
            padding: "24px",
          }),
          mkBlock("section", {
            blocks: [
              mkBlock("heading", { text: "Built to last", level: "h3" }),
            ],
            bgColor: "#eef1f8",
            padding: "24px",
          }),
        ],
      ],
    });
  } else {
    block = {
      id: uid(),
      type: kind,
      props: {
        title: {
          faq: "Frequently asked questions",
          tabs: "Explore the details",
          gallery: "Selected work",
          comparison: "Compare your options",
        }[kind],
        items:
          kind === "gallery"
            ? []
            : [
                {
                  title: "Getting started",
                  text: "Add a helpful explanation here.",
                },
                {
                  title: "What is included?",
                  text: "Explain the details your visitors need.",
                },
              ],
        table:
          "Feature | Essential | Complete\nSupport | Email | Priority\nSetup | Self-service | Guided",
      },
    };
  }
  pushUndo();
  getCurrentPageBlocks().push(block);
  refreshDesignEditor();
  selectBlock(block.id);
}
function refreshDesignEditor() {
  renderCanvas();
  renderLayoutList();
  renderProps();
}
function buildDesignPresetPicker() {
  return `<div class="props-section"><div class="props-section-title">Typography presets</div><div class="settings-actions">${["clean", "editorial", "bold"].map((n) => `<button class="btn btn-secondary btn-sm" onclick="applyDesignPreset('${n}')">${n}</button>`).join("")}</div><p class="text-muted text-sm">Updates global type, spacing, and corners. Block overrides remain editable.</p><button class="btn btn-secondary btn-sm" onclick="openProjectRevisions()">Restore a saved revision</button></div>`;
}
function applyDesignPreset(name) {
  pushUndo();
  const presets = {
    clean: {
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "inherit",
      headingScale: "1",
      bodySize: "clamp(16px, 1.1vw, 18px)",
      sectionPadding: "72px 24px",
      cardRadius: "12px",
      buttonRadius: "8px",
    },
    editorial: {
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "Georgia, serif",
      headingScale: "1.15",
      bodySize: "clamp(16px, 1.2vw, 19px)",
      sectionPadding: "96px 24px",
      cardRadius: "2px",
      buttonRadius: "2px",
    },
    bold: {
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "Arial, sans-serif",
      headingScale: "1.25",
      bodySize: "clamp(16px, 1.1vw, 18px)",
      sectionPadding: "88px 24px",
      cardRadius: "20px",
      buttonRadius: "24px",
    },
  };
  Object.assign(_projectData.styleSystem, presets[name]);
  refreshDesignEditor();
}
let copiedBlockStyle = null;
const VISUAL_STYLE_KEYS = [
  "fontSize",
  "fontWeight",
  "fontStyle",
  "minHeight",
  "width",
  "height",
  "btnBg",
  "btnColor",
  "borderRadius",
  "bgColor",
  "textColor",
  "color",
  "padding",
  "maxWidth",
  "contentWidth",
  "gap",
  "align",
  "rounded",
  "gradientColor",
  "gradientAngle",
  "motion",
  "hoverEffect",
  "bgPosition",
  "mobilePadding",
  "mobileTextAlign",
  "mobileGrid",
  "mobileMinHeight",
  "mobileBreakpoint",
  "hideOnMobile",
];
function buildSelectionTools(block) {
  const parents = [];
  let ctx = findBlockContext(block.id);
  while (ctx?.parentBlock) {
    parents.unshift(ctx.parentBlock);
    ctx = findBlockContext(ctx.parentBlock.id);
  }
  return `<div class="selection-tools"><button class="btn btn-ghost btn-sm" onclick="openSiteSettings('page')">Page</button>${parents.map((p) => ` › <button class="btn btn-ghost btn-sm" onclick="selectBlock('${p.id}')">${escAttr(p.type)}</button>`).join("")} › ${escAttr(block.type)}<div><button class="btn btn-secondary btn-sm" onclick="duplicateDesignBlock('${block.id}')">Duplicate</button><button class="btn btn-secondary btn-sm" onclick="copyDesignStyle('${block.id}')">Copy style</button><button class="btn btn-secondary btn-sm" ${copiedBlockStyle ? "" : "disabled"} onclick="pasteDesignStyle('${block.id}')">Paste style</button></div><details><summary>Reuse across pages</summary><p class="text-muted text-sm">Link copies of this section across pages. Publish edits to linked copies explicitly.</p><button class="btn btn-secondary btn-sm" onclick="linkBlockAcrossPages('${block.id}')">Add linked copies to other pages</button>${block.linkedSection ? `<button class="btn btn-secondary btn-sm" onclick="syncLinkedSection('${block.id}')">Update all linked copies</button><button class="btn btn-ghost btn-sm" onclick="unlinkSection('${block.id}')">Unlink this copy</button>` : ""}</details></div>`;
}
function cloneDesignBlock(block) {
  const copy = JSON.parse(JSON.stringify(block));
  walkBuilderBlocks([copy], (b) => {
    b.id = uid();
  });
  return copy;
}
function duplicateDesignBlock(id) {
  const ctx = findBlockContext(id);
  if (!ctx) return;
  pushUndo();
  const copy = cloneDesignBlock(ctx.block);
  delete copy.linkedSection;
  walkBuilderBlocks([copy], (b) => {
    delete b.props.anchor;
  });
  ctx.blocks.splice(ctx.index + 1, 0, copy);
  refreshDesignEditor();
  selectBlock(copy.id);
}
function copyDesignStyle(id) {
  const b = findBlockById(id);
  copiedBlockStyle = Object.fromEntries(
    VISUAL_STYLE_KEYS.filter((k) => k in b.props).map((k) => [k, b.props[k]]),
  );
  renderProps();
}
function pasteDesignStyle(id) {
  if (!copiedBlockStyle) return;
  pushUndo();
  const b = findBlockById(id);
  Object.assign(b.props, copiedBlockStyle);
  Object.keys(copiedBlockStyle).forEach((k) => {
    if (b.brandLinks) delete b.brandLinks[k];
  });
  refreshDesignEditor();
}
function linkBlockAcrossPages(id) {
  const b = findBlockById(id);
  pushUndo();
  b.linkedSection ||= uid();
  _projectData.pages.forEach((p, i) => {
    if (i === STATE.currentPageIndex) return;
    let exists = false;
    walkBuilderBlocks(p.blocks, (c) => {
      if (c.linkedSection === b.linkedSection) exists = true;
    });
    if (!exists) p.blocks.push(cloneDesignBlock(b));
  });
  refreshDesignEditor();
  toast(
    "Linked copies added. Use Update all linked copies after editing.",
    "success",
  );
}
function syncLinkedSection(id) {
  const b = findBlockById(id);
  if (!b.linkedSection) return;
  pushUndo();
  _projectData.pages.forEach((p) =>
    walkBuilderBlocks(p.blocks, (c) => {
      if (c.id !== b.id && c.linkedSection === b.linkedSection) {
        const copy = cloneDesignBlock(b);
        c.type = copy.type;
        c.props = copy.props;
        c.brandLinks = copy.brandLinks;
      }
    }),
  );
  refreshDesignEditor();
  toast("Linked sections updated.", "success");
}
function unlinkSection(id) {
  pushUndo();
  delete findBlockById(id).linkedSection;
  renderProps();
}
function walkBuilderBlocks(blocks, visit) {
  (blocks || []).forEach((block) => {
    visit(block);
    getBlockChildGroups(block).forEach((children) =>
      walkBuilderBlocks(children, visit),
    );
  });
}
function buildVisualEffectsControls(block) {
  const p = block.props,
    select = (key, label, values) =>
      `<label class="label">${label}<select class="input" onchange="updateProp('${block.id}','${key}',this.value)">${values.map((v) => `<option value="${v}" ${(p[key] || "none") === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`;
  return `<details><summary>Style & effects</summary>${select("motion", "Entrance motion", ["none", "fade", "rise", "stagger"])}${select("hoverEffect", "Hover effect", ["none", "lift", "shadow"])}<label class="label">Gradient end color<input class="input" placeholder="Optional #123456" value="${escAttr(p.gradientColor || "")}" oninput="updateProp('${block.id}','gradientColor',this.value)"></label><label class="label">Gradient angle<input class="input" type="number" value="${Number(p.gradientAngle) || 135}" oninput="updateProp('${block.id}','gradientAngle',this.value)"></label><p class="text-muted text-sm">Motion plays in preview/export and respects reduced motion. Gradient applies to this block’s background.</p></details>`;
}
function buildVisualEffectsCSS(block, editing) {
  const p = block.props,
    s = `[data-fw-block="${block.id}"]`;
  let css = "";
  if (
    /^#[0-9a-f]{6}$/i.test(p.gradientColor || "") &&
    /^#[0-9a-f]{6}$/i.test(p.bgColor || "")
  )
    css += `${s}{background-image:linear-gradient(${Number(p.gradientAngle) || 135}deg,${p.bgColor},${p.gradientColor})!important}`;
  if (!editing && ["fade", "rise", "stagger"].includes(p.motion)) {
    css += `@keyframes fw-enter-${block.id}{from{opacity:.2;${p.motion !== "fade" ? "transform:translateY(16px)" : ""}}to{opacity:1;transform:none}}@media(prefers-reduced-motion:no-preference){${s}{animation:fw-enter-${block.id} .65s ease both;}`;
    if (p.motion === "stagger")
      css += `${s} .fw-grid>*{animation:fw-enter-${block.id} .65s ease both}${s} .fw-grid>*:nth-child(2){animation-delay:.1s}${s} .fw-grid>*:nth-child(3){animation-delay:.2s}`;
    css += "}";
    css += `@supports(animation-timeline:view()){ @media(prefers-reduced-motion:no-preference){${s}{animation-timeline:view();animation-range:entry 0% entry 100%;}}}`;
  }
  if (["lift", "shadow"].includes(p.hoverEffect))
    css += `@media(hover:hover) and (prefers-reduced-motion:no-preference){${s}{transition:transform .2s,box-shadow .2s}${s}:hover,${s}:focus-within{${p.hoverEffect === "lift" ? "transform:translateY(-4px);" : "box-shadow:0 12px 32px #0002;"}}}`;
  return css;
}
function buildEnhancedProps(block) {
  const p = block.props;
  return `<div class="field"><label class="label">Section title</label><input class="input" value="${escAttr(p.title || "")}" oninput="updateProp('${block.id}','title',this.value)"></div>${block.type === "comparison" ? `<label class="label">Table rows (separate cells with |)</label><textarea class="input" rows="8" oninput="updateProp('${block.id}','table',this.value)">${escapeHtmlForTextarea(p.table || "")}</textarea>` : (p.items || []).map((item, i) => `<div class="props-section"><label class="label">${block.type === "gallery" ? "Caption / alt text" : "Title"}</label><input class="input" value="${escAttr(item.title || "")}" oninput="updateItem('${block.id}','items',${i},'title',this.value)">${block.type === "gallery" ? `<button class="btn btn-secondary btn-sm" onclick="openImageLibrary(null,ref=>{updateItem('${block.id}','items',${i},'src',ref);renderProps();})">Choose image</button>` : `<label class="label">Text</label><textarea class="input" oninput="updateItem('${block.id}','items',${i},'text',this.value)">${escapeHtmlForTextarea(item.text || "")}</textarea>`}<button class="btn btn-ghost btn-sm" onclick="removeItem('${block.id}','items',${i})">Remove</button></div>`).join("") + `<button class="btn btn-secondary btn-sm" onclick="addItem('${block.id}','items',{title:'New item',text:'Add your text',src:''})">Add item</button>`}`;
}
function renderEnhancedBlock(block, editing, ctx) {
  if (!["faq", "tabs", "gallery", "comparison"].includes(block.type))
    return null;
  const p = block.props,
    id = block.id,
    items = p.items || [],
    e = escAttr;
  let content = "";
  if (block.type === "faq")
    content = items
      .map(
        (i) =>
          `<details style="border-bottom:1px solid #ddd;padding:16px 0"><summary style="cursor:pointer;font-weight:600">${e(i.title)}</summary><p style="white-space:pre-wrap">${e(i.text)}</p></details>`,
      )
      .join("");
  if (block.type === "tabs") {
    content = `<div role="tablist" aria-label="${e(p.title || "Content")}" style="display:flex;gap:8px;flex-wrap:wrap">${items.map((i, n) => `<button type="button" id="${id}-tab-${n}" role="tab" aria-controls="${id}-panel-${n}" aria-selected="${n === 0}" tabindex="${n === 0 ? 0 : -1}" style="padding:12px;cursor:pointer" onclick="const s=this.closest('section');s.querySelectorAll('[role=tab]').forEach((t,j)=>{t.setAttribute('aria-selected',String(j===${n}));t.tabIndex=j===${n}?0:-1});s.querySelectorAll('[role=tabpanel]').forEach((p,j)=>p.hidden=j!==${n})" onkeydown="const t=Array.from(this.parentElement.children);let n=t.indexOf(this);if(event.key==='ArrowRight')n=(n+1)%t.length;else if(event.key==='ArrowLeft')n=(n+t.length-1)%t.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=t.length-1;else return;event.preventDefault();t[n].click();t[n].focus()">${e(i.title)}</button>`).join("")}</div>${items.map((i, n) => `<div id="${id}-panel-${n}" role="tabpanel" aria-labelledby="${id}-tab-${n}" tabindex="0" ${n ? "hidden" : ""}><p style="white-space:pre-wrap">${e(i.text)}</p></div>`).join("")}`;
  }
  if (block.type === "gallery")
    content = `<div class="fw-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">${items
      .map((i, n) => {
        const src = resolveImageAsset(i.src, ctx || _projectData);
        return `<figure style="margin:0"><button style="border:0;background:none;padding:0;cursor:zoom-in;width:100%" aria-label="Enlarge ${e(i.title)}" onclick="document.getElementById('${id}-lightbox-${n}').showModal()"><img src="${e(src)}" alt="${e(i.title)}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover"></button><figcaption>${e(i.title)}</figcaption><dialog id="${id}-lightbox-${n}" style="max-width:90vw;border:0;border-radius:12px" onclick="if(event.target===this)this.close()"><form method="dialog"><button autofocus aria-label="Close image" style="float:right">Close ×</button></form><img src="${e(src)}" alt="${e(i.title)}" style="max-width:80vw;max-height:75vh"></dialog></figure>`;
      })
      .join(
        "",
      )}</div>${!items.length && editing ? "<p>Add gallery images in the properties panel.</p>" : ""}`;
  if (block.type === "comparison") {
    const rows = String(p.table || "")
      .split("\n")
      .filter(Boolean)
      .map((r) => r.split("|"));
    content = `<div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><caption>${e(p.title)}</caption><thead><tr>${(rows[0] || []).map((c) => `<th scope="col" style="padding:16px;text-align:left;border-bottom:2px solid #bbb">${e(c.trim())}</th>`).join("")}</tr></thead><tbody>${rows
      .slice(1)
      .map(
        (r) =>
          `<tr>${r.map((c, i) => `<${i ? "td" : 'th scope="row"'} style="padding:16px;text-align:left;border-bottom:1px solid #ddd">${e(c.trim())}</${i ? "td" : "th"}>`).join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;
  }
  return `<section data-fw-block="${id}" ${p.anchor ? `id="${e(p.anchor)}"` : ""} class="fw-block fw-${block.type}" style="padding:var(--site-section-padding,72px 24px);background:${e(p.bgColor || "#ffffff")}"><div style="max-width:var(--site-section-width,1100px);margin:auto"><h2>${e(p.title || "")}</h2>${content}</div></section>`;
}

function resetResponsiveOverrides(id) {
  const block = findBlockById(id);
  if (!block) return;
  pushUndo();
  [
    "mobilePadding",
    "mobileTextAlign",
    "mobileMinHeight",
    "hideOnMobile",
    "mobileBreakpoint",
    "mobileGrid",
  ].forEach((key) => delete block.props[key]);
  refreshDesignEditor();
}
