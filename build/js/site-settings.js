// Shared metadata model for preview, ZIP export, and deployment.
function publicSiteURL(value, base = "") {
  if (!String(value || "").trim()) return "";
  try {
    const url = base ? new URL(value, base) : new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch (_) {
    return "";
  }
}
function siteBaseURL(data) {
  const url = publicSiteURL(data.meta?.siteUrl || "");
  if (!url) return "";
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.href.replace(/\/?$/, "/");
}
function pagePublicURL(data, page) {
  const base = siteBaseURL(data);
  return (
    publicSiteURL(page.meta?.canonical || "") ||
    (base
      ? publicSiteURL(page.slug === "index" ? "./" : `${page.slug}.html`, base)
      : "")
  );
}
function pageTitle(data, page) {
  return (
    page.meta?.titleOverride ||
    (data.meta?.titleFormat || "{page} — {site}")
      .replaceAll("{page}", page.name || "")
      .replaceAll("{site}", data.brandName || data.name || "")
  );
}
function effectiveMetadata(data, page) {
  const sm = data.meta || {},
    pm = page.meta || {};
  const rawImage = pm.ogImage || sm.ogImage || "";
  const imageMeta = pm.ogImage ? pm : sm;
  const mapped = resolveImageAsset(rawImage, {
    ...data,
    _imageMap: buildImageAssetMap(data),
  });
  return {
    title: pageTitle(data, page),
    description: pm.description || sm.description || "",
    socialTitle: pm.ogTitle || pageTitle(data, page),
    socialDescription:
      pm.ogDescription || pm.description || sm.description || "",
    image: publicSiteURL(mapped, siteBaseURL(data)),
    rawImage,
    imageAlt: imageMeta.ogImageAlt || "",
    width: imageMeta.ogImageWidth,
    height: imageMeta.ogImageHeight,
    url: pagePublicURL(data, page),
    noindex: pm.noindex ?? sm.noindex ?? false,
  };
}
function buildSiteMetaTags(data, page) {
  const sm = data.meta || {},
    m = effectiveMetadata(data, page),
    tags = [];
  const tag = (name, value, property = false) => {
    if (value !== "" && value != null)
      tags.push(
        `<meta ${property ? "property" : "name"}="${name}" content="${escAttr(String(value))}">`,
      );
  };
  tag("description", m.description);
  tag("author", sm.author);
  if (m.url) tags.push(`<link rel="canonical" href="${escAttr(m.url)}">`);
  if (m.noindex) tag("robots", "noindex, follow");
  if (/^#[0-9a-f]{6}$/i.test(sm.themeColor || ""))
    tag("theme-color", sm.themeColor);
  if (/^#[0-9a-f]{6}$/i.test(sm.themeColorDark || ""))
    tags.push(
      `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${sm.themeColorDark}">`,
    );
  if (
    /^#[0-9a-f]{6}$/i.test(sm.themeColor || "") &&
    /^#[0-9a-f]{6}$/i.test(sm.themeColorDark || "")
  )
    tags[tags.findIndex((t) => t.includes('name="theme-color"'))] =
      `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${escAttr(sm.themeColor)}">`;
  tag("og:type", page.meta?.ogType || sm.ogType || "website", true);
  tag("og:site_name", data.brandName || data.name, true);
  tag("og:title", m.socialTitle, true);
  tag("og:description", m.socialDescription, true);
  tag("og:url", m.url, true);
  tag("og:image", m.image, true);
  if (m.image) {
    tag("og:image:alt", m.imageAlt, true);
    if (Number(m.width) > 0) tag("og:image:width", Number(m.width), true);
    if (Number(m.height) > 0) tag("og:image:height", Number(m.height), true);
  }
  tag(
    "twitter:card",
    sm.twitterCard === "summary" ? "summary" : "summary_large_image",
  );
  tag("twitter:title", m.socialTitle);
  tag("twitter:description", m.socialDescription);
  tag("twitter:image", m.image);
  tag("twitter:image:alt", m.imageAlt);
  tag("twitter:site", sm.twitterSite);
  (data.favicons || []).forEach((asset) => {
    const href = data._faviconMap
      ? resolveFaviconHref(asset, data)
      : asset.content
        ? `data:${asset.type},${encodeURIComponent(faviconContent(asset, data))}`
        : resolveFaviconHref(asset, data);
    tags.push(
      `<link rel="${escAttr(asset.rel || "icon")}" href="${escAttr(href)}"${asset.sizes ? ` sizes="${escAttr(asset.sizes)}"` : ""}>`,
    );
  });
  if (!data.favicons?.length && sm.favicon)
    tags.push(
      `<link rel="icon" href="${escAttr(resolveImageAsset(sm.favicon, data))}">`,
    );
  const structured = page.meta?.structuredData || sm.structuredData;
  if (structured) {
    try {
      tags.push(
        `<script type="application/ld+json">${JSON.stringify(JSON.parse(structured)).replace(/</g, "\\u003c")}<\/script>`,
      );
    } catch (_) {}
  }
  return tags.join("\n");
}
function faviconContent(asset, data) {
  if (asset.rel !== "manifest") return asset.content;
  try {
    const manifest = JSON.parse(asset.content);
    manifest.theme_color = data.meta?.themeColor || "#ffffff";
    manifest.background_color = data.brand?.pageBg || "#ffffff";
    return JSON.stringify(manifest, null, 2);
  } catch (_) {
    return asset.content;
  }
}
function siteDiscoveryFiles(data) {
  const base = siteBaseURL(data);
  const urls = data.pages
    .filter((p) => !effectiveMetadata(data, p).noindex)
    .map((p) => pagePublicURL(data, p))
    .filter(Boolean);
  return {
    ...(base
      ? {
          "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map((url) => `<url><loc>${escAttr(url)}</loc></url>`).join("")}</urlset>`,
        }
      : {}),
    "robots.txt": `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}sitemap.xml\n` : ""}`,
  };
}
function openSiteSettings(tab = "sharing") {
  clearBuilderSelection();
  STATE.propsTab = tab;
  renderCanvas();
  renderLayoutList();
  renderProps();
  if (typeof switchMobileTab === "function" && window.innerWidth < 768)
    switchMobileTab("props");
}
function metadataField(scope, key, label, multiline = false, placeholder = "") {
  const data =
    scope === "site"
      ? _projectData.meta || {}
      : _projectData.pages[STATE.currentPageIndex].meta || {};
  const value = String(data[key] ?? "");
  if (key === "ogImage" && isImageRef(value)) {
    const image = (_projectData.images || []).find(
      (img) => img.id === imageIdFromRef(value),
    );
    return `<div class="field"><label class="label">${label}</label><p class="text-muted text-sm">${escAttr(image ? `Selected: ${image.name}` : "Image missing. Choose another image.")}</p><button class="btn btn-ghost btn-sm" onclick="editMetadata('${scope}','ogImage','');renderProps()">${scope === "page" ? "Use site default" : "Remove image"}</button></div>`;
  }
  const handler = `editMetadata('${scope}','${key}',this.value)`;
  return `<div class="field"><label class="label" for="meta-${scope}-${key}">${label}</label>${multiline ? `<textarea id="meta-${scope}-${key}" class="input" rows="3" placeholder="${escAttr(placeholder)}" oninput="${handler}">${escapeHtmlForTextarea(value)}</textarea>` : `<input id="meta-${scope}-${key}" class="input" value="${escAttr(value)}" placeholder="${escAttr(placeholder)}" oninput="${handler}">`}</div>`;
}
function buildSharingSettings(scope = "site") {
  const page = _projectData.pages[STATE.currentPageIndex],
    data = scope === "site" ? _projectData.meta || {} : page.meta || {};
  const field = (key, label, multi = false, hint = "") =>
    metadataField(scope, key, label, multi, hint);
  return `<div class="props-section"><div class="props-section-title">${scope === "site" ? "Site & Sharing" : "Page appearance"}</div>
    <p class="text-muted text-sm">${scope === "site" ? "Defaults apply across your site. Individual pages can override them." : "Empty fields inherit site defaults. Previews are approximate; platforms may crop or cache cards."}</p>
    ${scope === "site" ? field("siteUrl", "Published site address", false, "https://example.com/") + field("titleFormat", "Title format", false, "{page} — {site}") : field("titleOverride", "Page title", false, pageTitle(_projectData, page))}
    ${field("description", "Search description", true, scope === "page" ? _projectData.meta?.description || "Using site default" : "")}
    ${scope === "page" ? field("ogTitle", "Social title", false, "Use page title") + field("ogDescription", "Social description", true, "Use search description") : ""}
    ${field("ogImage", "Social image", false, scope === "page" ? "Using site default" : "https://…")}
    <div class="settings-actions"><button class="btn btn-secondary btn-sm" onclick="chooseSocialImage('${scope}')">Choose / upload image</button><button class="btn btn-secondary btn-sm" onclick="openSocialCrop('${scope}')">Crop image</button><button class="btn btn-secondary btn-sm" onclick="generateSocialCard('${scope}')">Generate branded card</button></div>
    ${field("ogImageAlt", "Social image description")}
    ${scope === "page" ? `<button class="btn btn-ghost btn-sm" onclick="resetPageMetadata()">Reset page metadata to defaults</button>` : ""}
    <div id="metadata-preview"></div>
    <details><summary>Search visibility & advanced</summary>
    <label class="label">Search visibility <select class="input" onchange="editMetadata('${scope}','noindex',this.value === 'inherit' ? null : this.value === 'hidden')">${scope === "page" ? `<option value="inherit" ${data.noindex == null ? "selected" : ""}>Use site default</option>` : ""}<option value="visible" ${data.noindex === false || (scope === "site" && !data.noindex) ? "selected" : ""}>Visible to search engines</option><option value="hidden" ${data.noindex === true ? "selected" : ""}>Request no indexing</option></select></label>
    <p class="text-muted text-sm">No indexing is not password protection.</p>
    <label class="label">Social content type<select class="input" onchange="editMetadata('${scope}','ogType',this.value)">${(scope === "page" ? ["", "website", "article"] : ["website", "article"]).map((value) => `<option value="${value}" ${(data.ogType || (scope === "site" ? "website" : "")) === value ? "selected" : ""}>${value || "Use site default"}</option>`).join("")}</select></label>
    ${scope === "site" ? `<label class="label">Social card layout<select class="input" onchange="editMetadata('site','twitterCard',this.value)"><option value="summary_large_image" ${data.twitterCard !== "summary" ? "selected" : ""}>Large image</option><option value="summary" ${data.twitterCard === "summary" ? "selected" : ""}>Compact</option></select></label>` : ""}
    ${scope === "site" ? field("language", "Page language", false, "en") + field("twitterSite", "X / Twitter account", false, "@yourbrand") + field("author", "Author") + field("favicon", "Fallback favicon URL") : field("canonical", "Canonical URL override", false, pagePublicURL(_projectData, page))}
    <div class="settings-actions"><button class="btn btn-secondary btn-sm" onclick="addStructuredDataStarter('${scope}')">Create ${scope === "site" ? "business" : "article"} data</button></div>${field("structuredData", "Structured data (JSON-LD)", true, "Optional JSON object")}
    </details>
    ${scope === "site" ? `<div class="props-section-title" style="margin-top:20px">Browser appearance</div>${themeColorField("themeColor", "Browser theme color")}${themeColorField("themeColorDark", "Dark-mode browser theme color")}${buildSiteLogoHTML()}` : ""}
    </div>`;
}
function editMetadata(scope, key, value) {
  pushUndoDebounced();
  const target =
    scope === "site"
      ? _projectData
      : _projectData.pages[STATE.currentPageIndex];
  target.meta ||= {};
  if (value == null) delete target.meta[key];
  else target.meta[key] = value;
  if (key === "ogImage") {
    delete target.meta.ogImageWidth;
    delete target.meta.ogImageHeight;
  }
  refreshMetadataPreview();
}
function refreshMetadataPreview() {
  const el = document.getElementById("metadata-preview");
  if (!el) return;
  const page = _projectData.pages[STATE.currentPageIndex],
    m = effectiveMetadata(_projectData, page);
  const src = resolveImageAsset(m.rawImage, _projectData);
  const safeSrc = /^(data:image\/|https?:\/\/)/i.test(src) ? src : "";
  el.innerHTML = `<div class="search-preview"><small>${escAttr(m.url || "Set your published site address")}</small><div>${escAttr(m.title)}</div><p>${escAttr(m.description || "Add a search description")}</p></div><div class="social-preview">${safeSrc ? `<img src="${escAttr(safeSrc)}" alt="${escAttr(m.imageAlt)}">` : '<div class="social-placeholder">Social image preview</div>'}<div><strong>${escAttr(m.socialTitle)}</strong><p>${escAttr(m.socialDescription)}</p></div></div>`;
}
function resetPageMetadata() {
  pushUndo();
  _projectData.pages[STATE.currentPageIndex].meta = {};
  renderProps();
}
function chooseSocialImage(scope) {
  const page = _projectData.pages[STATE.currentPageIndex];
  openImageLibrary(null, (ref) => {
    pushUndo();
    const target = scope === "site" ? _projectData : page;
    target.meta ||= {};
    target.meta.ogImage = ref;
    delete target.meta.ogImageWidth;
    delete target.meta.ogImageHeight;
    loadSocialImage(resolveImageAsset(ref))
      .then((img) => {
        target.meta.ogImageWidth = img.naturalWidth;
        target.meta.ogImageHeight = img.naturalHeight;
        markDirty();
      })
      .catch(() => {});
  });
}
function loadSocialImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error("Image could not be loaded. Upload it to the library first."),
      );
    img.src = src;
  });
}
function saveSocialCanvas(
  scope,
  canvas,
  targetPage = _projectData.pages[STATE.currentPageIndex],
) {
  const url = canvas.toDataURL("image/png");
  pushUndo();
  const id = uid();
  _projectData.images.push({
    id,
    name: `social-${id}.png`,
    type: "image/png",
    dataURL: url,
  });
  const target = scope === "site" ? _projectData : targetPage;
  target.meta ||= {};
  Object.assign(target.meta, {
    ogImage: imageRef(id),
    ogImageWidth: 1200,
    ogImageHeight: 630,
  });
  renderProps();
}
async function openSocialCrop(scope) {
  try {
    const page = _projectData.pages[STATE.currentPageIndex];
    const raw =
      scope === "site"
        ? _projectData.meta?.ogImage
        : page.meta?.ogImage || _projectData.meta?.ogImage;
    if (!raw) return toast("Choose an image first.", "info");
    const img = await loadSocialImage(resolveImageAsset(raw));
    let overlay = document.getElementById("social-crop-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "social-crop-modal";
      overlay.className = "modal-overlay";
      document.body.append(overlay);
    }
    overlay.classList.remove("hidden");
    overlay.innerHTML = `<div class="modal"><div class="modal-title">Social image crop · 1200 × 630</div><canvas width="1200" height="630" style="width:100%;border-radius:8px"></canvas><label class="label">Horizontal focal point<input type="range" min="0" max="100" value="50" data-axis="x"></label><label class="label">Vertical focal point<input type="range" min="0" max="100" value="50" data-axis="y"></label><label class="label">Zoom<input type="range" min="1" max="3" step=".05" value="1" data-axis="zoom"></label><div class="modal-actions"><button class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save crop</button></div></div>`;
    const canvas = overlay.querySelector("canvas"),
      ctx = canvas.getContext("2d");
    const draw = () => {
      const zoom = +overlay.querySelector('[data-axis="zoom"]').value,
        scale = Math.max(1200 / img.width, 630 / img.height) * zoom;
      const x = +overlay.querySelector('[data-axis="x"]').value / 100,
        y = +overlay.querySelector('[data-axis="y"]').value / 100;
      ctx.clearRect(0, 0, 1200, 630);
      ctx.drawImage(
        img,
        (1200 - img.width * scale) * x,
        (630 - img.height * scale) * y,
        img.width * scale,
        img.height * scale,
      );
    };
    overlay.querySelectorAll("input").forEach((i) => (i.oninput = draw));
    draw();
    overlay.querySelector("[data-cancel]").onclick = () =>
      overlay.classList.add("hidden");
    overlay.querySelector("[data-save]").onclick = () => {
      try {
        saveSocialCanvas(scope, canvas, page);
        overlay.classList.add("hidden");
      } catch (e) {
        toast(e.message, "error");
      }
    };
  } catch (e) {
    toast(e.message, "error");
  }
}
async function generateSocialCard(scope) {
  const page = _projectData.pages[STATE.currentPageIndex],
    canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = _projectData.brand?.accent || "#234839";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#fff";
  ctx.font = "600 28px sans-serif";
  ctx.fillText(
    (_projectData.brandName || _projectData.name).slice(0, 60),
    70,
    90,
  );
  const title =
    scope === "site"
      ? _projectData.brandName || _projectData.name
      : page.meta?.ogTitle || page.name;
  ctx.font = "bold 70px sans-serif";
  let line = "",
    y = 240,
    lines = 0;
  for (const word of title.split(/\s+/)) {
    if (ctx.measureText(line + word).width > 1060 && line) {
      ctx.fillText(line, 70, y);
      y += 88;
      line = "";
      if (++lines === 3) break;
    }
    line += word + " ";
  }
  if (lines < 3) ctx.fillText(line, 70, y);
  ctx.font = "24px sans-serif";
  ctx.fillText(siteBaseURL(_projectData).slice(0, 80), 70, 560);
  if (_projectData.logo?.src) {
    try {
      const img = await loadSocialImage(
        resolveImageAsset(_projectData.logo.src),
      );
      const ratio = Math.min(160 / img.width, 64 / img.height);
      ctx.drawImage(img, 960, 40, img.width * ratio, img.height * ratio);
    } catch (_) {}
  }
  saveSocialCanvas(scope, canvas, page);
}
function siteMetadataIssues(data) {
  const issues = [];
  const add = (message, pageIndex = null, blockId = null, level = "warning") =>
    issues.push({ message, pageIndex, blockId, level });
  if (!siteBaseURL(data))
    add(
      "Set a valid published site address for canonical URLs, social images, and sitemap generation.",
    );
  for (const key of ["themeColor", "themeColorDark"])
    if (data.meta?.[key] && !/^#[0-9a-f]{6}$/i.test(data.meta[key]))
      add(`${key}: use a six-digit hex color such as #234839.`);
  if (!data.pages?.length) add("Site has no pages.", null, null, "error");
  const slugs = new Set();
  data.pages.forEach((page, pageIndex) => {
    const m = effectiveMetadata(data, page);
    if (slugs.has(page.slug))
      add(
        `${page.name}: duplicate page address will overwrite another exported page.`,
        pageIndex,
        null,
        "error",
      );
    slugs.add(page.slug);
    if (!/^[a-zA-Z0-9_-]+$/.test(page.slug || ""))
      add(
        `${page.name}: use letters, numbers, hyphens, or underscores in the page address.`,
        pageIndex,
        null,
        "error",
      );
    if (!m.description)
      add(`${page.name}: add a search description.`, pageIndex);
    if (!m.rawImage)
      add(`${page.name}: add a social sharing image.`, pageIndex);
    else if (!m.image)
      add(
        `${page.name}: social image needs a public URL and a valid site address.`,
        pageIndex,
      );
    if (m.image && !m.imageAlt)
      add(`${page.name}: add a social image description.`, pageIndex);
    if (page.meta?.canonical && !publicSiteURL(page.meta.canonical))
      add(
        `${page.name}: canonical override must be an absolute HTTP(S) URL.`,
        pageIndex,
      );
    const structured = page.meta?.structuredData || data.meta?.structuredData;
    if (structured) {
      try {
        const parsed = JSON.parse(structured);
        if (!parsed || typeof parsed !== "object") throw new Error();
      } catch (_) {
        add(
          `${page.name}: structured data must be a JSON object or array.`,
          pageIndex,
          null,
          "error",
        );
      }
    }
    const blocks = [];
    walkBuilderBlocks(page.blocks, (b) => blocks.push(b));
    if (!blocks.length)
      add(`${page.name}: page has no content.`, pageIndex, null, "error");
    if (pageIndex === 0 && !blocks.some((b) => b.type === "nav"))
      add(`${page.name}: consider adding navigation.`, pageIndex, null, "info");
    if (!blocks.some((b) => b.type === "footer"))
      add(`${page.name}: consider adding a footer.`, pageIndex, null, "info");
    if (!blocks.some((b) => ["button", "cta", "form", "hero"].includes(b.type)))
      add(
        `${page.name}: add a clear next action for visitors.`,
        pageIndex,
        null,
        "info",
      );
    const heads = blocks.filter(
      (b) =>
        b.type === "hero" || (b.type === "heading" && b.props.level === "h1"),
    );
    if (heads.length !== 1)
      add(
        `${page.name}: ${heads.length ? "multiple primary headings; review their hierarchy" : "add a primary heading"}.`,
        pageIndex,
        heads[0]?.id,
      );
    const anchors = new Set(blocks.map((b) => b.props.anchor).filter(Boolean));
    const anchorList = blocks.map((b) => b.props.anchor).filter(Boolean);
    if (anchors.size !== anchorList.length)
      add(`${page.name}: duplicate section anchors.`, pageIndex);
    blocks.forEach((block) => {
      const p = block.props;
      if (block.type === "hero" && (!p.heading || !p.subheading))
        add(
          `${page.name}: hero needs a heading and supporting text.`,
          pageIndex,
          block.id,
        );
      if (block.type === "form" && !p.action && !p.mailtoEmail)
        add(
          `${page.name}: connect the form to an endpoint or email recipient.`,
          pageIndex,
          block.id,
        );
      if (block.type === "image" && !p.src)
        add(
          `${page.name}: choose an image for the empty image block.`,
          pageIndex,
          block.id,
        );

      const refs = [
        p.src,
        p.bgImage,
        ...(p.cards || []).map((c) => c.img),
        ...(block.type === "gallery" ? (p.items || []).map((c) => c.src) : []),
      ].filter(Boolean);
      refs.forEach((ref) => {
        if (
          isImageRef(ref) &&
          !data.images.some((i) => i.id === imageIdFromRef(ref))
        )
          add(
            `${page.name}: ${block.type} references a missing library image.`,
            pageIndex,
            block.id,
            "error",
          );
      });
      if (block.type === "image" && p.src && !String(p.alt || "").trim())
        add(`${page.name}: image needs alt text.`, pageIndex, block.id);
      if (block.type === "gallery" && (p.items || []).some((i) => !i.title))
        add(
          `${page.name}: gallery images need descriptions.`,
          pageIndex,
          block.id,
        );
      const links = [
        p.href,
        p.buttonHref,
        ...(p.cards || []).map((c) => c.href),
      ].filter((v) => v != null);
      if (block.type === "text" || block.type === "html") {
        const raw = p.content || p.code || "";
        for (const match of raw.matchAll(/href=["']([^"']*)["']/g))
          links.push(match[1]);
      }
      if (block.type === "nav")
        (data.navbars?.[p.navbarId]?.customLinks || []).forEach((l) =>
          links.push(l.href),
        );
      links.forEach((href) => {
        href = String(href || "");
        if (!href || href === "#")
          return add(
            `${page.name}: ${block.type} has a placeholder link.`,
            pageIndex,
            block.id,
          );
        if (href.startsWith("#")) {
          if (!anchors.has(href.slice(1)))
            add(
              `${page.name}: section link ${href} has no matching anchor.`,
              pageIndex,
              block.id,
            );
          return;
        }
        if (/^[\w+.-]+:|^\/\//.test(href)) return;
        const path = href
          .split(/[?#]/)[0]
          .replace(/^\.\//, "")
          .replace(/^\//, "");
        if (
          path.endsWith(".html") &&
          !data.pages.some((p) => p.slug + ".html" === path)
        )
          add(
            `${page.name}: page link ${href} does not match an exported page.`,
            pageIndex,
            block.id,
          );
      });
    });
  });
  return issues;
}
function focusHealthIssue(index) {
  const issue = getDesignHealthIssues(_projectData)[index];
  if (!issue) return;
  closeModal("modal-design-health");
  if (issue.pageIndex != null) STATE.currentPageIndex = issue.pageIndex;
  clearBuilderSelection();
  renderPagesList();
  renderCanvas();
  renderLayoutList();
  if (issue.blockId) selectBlock(issue.blockId);
  else openSiteSettings(issue.pageIndex == null ? "sharing" : "page");
}
function deploymentSupportFiles(data) {
  const files = Object.entries(siteDiscoveryFiles(data)).map(
    ([name, content]) => ({
      name,
      content,
      type: name.endsWith(".xml") ? "application/xml" : "text/plain",
    }),
  );
  (data.favicons || []).forEach((asset) => {
    if (asset.content)
      files.push({
        name: asset.name,
        content: faviconContent(asset, data),
        type: asset.type,
      });
    else if (asset.dataURL)
      files.push({
        name: asset.name,
        content: asset.dataURL.split(",")[1],
        type: asset.type,
        binary: true,
      });
  });
  return files;
}

function themeColorField(key, label) {
  const value = _projectData.meta?.[key] || "";
  return `<div class="field"><label class="label" for="meta-site-${key}">${label}</label><div class="settings-actions"><input aria-label="Pick ${label}" type="color" value="${/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}" oninput="editMetadata('site','${key}',this.value);document.getElementById('meta-site-${key}').value=this.value"><input class="input" style="flex:1;min-width:100px" id="meta-site-${key}" value="${escAttr(value)}" placeholder="Optional #ffffff" oninput="editMetadata('site','${key}',this.value)"></div></div>`;
}
async function addStructuredDataStarter(scope) {
  const page = _projectData.pages[STATE.currentPageIndex];
  const target = scope === "site" ? _projectData : page;
  if (
    target.meta?.structuredData &&
    !(await showBuilderDialog({
      title: "Replace structured data?",
      message: "Replace this JSON with an editable starter?",
      confirmText: "Replace",
    }))
  )
    return;
  const data =
    scope === "site"
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: _projectData.brandName || _projectData.name,
          url: siteBaseURL(_projectData),
        }
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: pageTitle(_projectData, page),
          description: effectiveMetadata(_projectData, page).description,
          mainEntityOfPage: pagePublicURL(_projectData, page),
        };
  editMetadata(scope, "structuredData", JSON.stringify(data, null, 2));
  renderProps();
}
