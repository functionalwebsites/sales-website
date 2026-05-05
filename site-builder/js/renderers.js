// Site builder renderers. Loaded by site-builder/index.html in dependency order.
function renderBlock(block, editing = false, ctx = null) {
  const html = _renderBlockInner(block, editing, ctx);
  if (!editing) {
    const p = block.props;
    let out = html;
    if (p.blockCSS) out = `<style>\n${p.blockCSS}\n</style>\n` + out;
    if (p.blockJS)  out += `\n<script>\n${p.blockJS}\n<\/script>`;
    return out;
  }
  return html;
}

function _renderBlockInner(block, editing = false, ctx = null) {
  const p = block.props;
  const anchorAttr = p.anchor ? ` id="${escAttr(p.anchor)}"` : '';
  const sel = editing
    ? `data-block-id="${block.id}" class="block-wrapper"${anchorAttr}`
    : anchorAttr.trim();
  const pd = ctx || _projectData;
  const siteSectionPadding = 'var(--site-section-padding, 72px 20px)';
  const siteSectionWidth = 'var(--site-section-width, 1100px)';
  const siteContentGap = 'var(--site-content-gap, 24px)';
  const siteButtonRadius = 'var(--site-button-radius, 6px)';
  const siteCardRadius = 'var(--site-card-radius, 8px)';
  const siteHeadingFont = 'var(--site-heading-font-family, inherit)';
  const siteBodySize = 'var(--site-body-size, 16px)';

  switch(block.type) {
    case 'nav': {
      // Legacy nav blocks (no navbarId)
      if (!p.navbarId) {
        const links = (p.links||'').split(',').map(l=>l.trim()).filter(Boolean);
        const linkHtml = links.map(l=>`<a href="#" style="color:${p.linkColor||'#333'};text-decoration:none;padding:0 12px;font-weight:500;">${l}</a>`).join('');
        return `<nav ${sel} style="background:${p.bgColor||'#fff'};padding:14px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
  <div style="font-weight:700;font-size:18px;color:${p.textColor||'#333'};">${p.brand||'My Site'}</div>
  <div>${linkHtml}</div>
</nav>`;
      }
      if (!pd) return `<nav ${sel}></nav>`;
      if (!pd.navbars) pd.navbars = {};
      if (!pd.navbars[p.navbarId]) ensureNavbar(p.navbarId);
      const nc = pd.navbars[p.navbarId];
      const pages = pd.pages || [];
      const brand = pd.brand || {};
      const pageLinks = nc.pageLinks === 'all'
        ? pages
        : pages.filter(pg => Array.isArray(nc.pageLinks) && nc.pageLinks.includes(pg.id));
      const allLinks = [
        ...pageLinks.map(pg => ({ label: pg.name, href: (pg.slug||'index') + '.html' })),
        ...(nc.customLinks || [])
      ];
      const navId = `nav-${block.id}`;
      const menuId = `${navId}-menu`;
      const breakpoint = Math.max(320, Number(nc.mobileBreakpoint || 768) || 768);
      const mobileLayout = nc.mobileLayout || 'hamburger';
      const align = nc.align || 'split';
      const justify = align === 'left' ? 'flex-start' : align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'space-between';
      const textAlign = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';
      const linkHtml = allLinks.map(l => {
        const isButton = Boolean(l.asButton);
        const styles = isButton
          ? `color:${brand.btnPrimaryText || brand.accentText || '#ffffff'};background:${brand.btnPrimary || brand.accent || '#7c6af7'};border:1px solid ${brand.btnPrimary || brand.accent || '#7c6af7'};border-radius:6px;padding:10px 16px;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;justify-content:center;`
          : `color:${nc.linkColor||'#333'};text-decoration:none;font-weight:500;`;
        return `<a href="${escAttr(l.href || '#')}" data-nav-link="true" style="${styles}">${escapeHtmlForTextarea(l.label || 'Link')}</a>`;
      }).join('');
      const mobileAlignItems = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
      const mobileJustify = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
      const stackCss = mobileLayout === 'stack'
        ? `@media (max-width:${breakpoint}px){#${navId}{flex-direction:column;align-items:${mobileAlignItems};gap:12px;text-align:${textAlign};}#${navId} .nav-links{display:flex !important;flex-direction:column;align-items:${mobileAlignItems};gap:12px;width:100%;padding-top:8px;}#${navId} .nav-toggle{display:none !important;}}`
        : mobileLayout === 'center-stack'
          ? `@media (max-width:${breakpoint}px){#${navId}{flex-direction:column;align-items:center;gap:12px;text-align:center;}#${navId} .nav-links{display:flex !important;flex-direction:column;align-items:center;gap:12px;width:100%;padding-top:8px;}#${navId} .nav-toggle{display:none !important;}}`
          : mobileLayout === 'inline'
            ? `@media (max-width:${breakpoint}px){#${navId}{flex-wrap:wrap;justify-content:${justify};}#${navId} .nav-links{display:flex !important;flex-direction:row;justify-content:${mobileJustify};gap:8px;flex-wrap:wrap;width:100%;}#${navId} .nav-toggle{display:none !important;}}`
            : `@media (max-width:${breakpoint}px){#${navId}{z-index:30;}#${navId} .nav-toggle{display:inline-flex !important;}#${navId} .nav-links{display:none !important;position:absolute;z-index:9999;top:calc(100% + 10px);left:24px;right:24px;background:${nc.bgColor||'#fff'};border:1px solid rgba(0,0,0,.08);border-radius:12px;box-shadow:0 16px 50px rgba(0,0,0,.18);padding:14px;flex-direction:column;align-items:${mobileAlignItems};gap:12px;text-align:${textAlign};}#${navId}[data-open=\"true\"] .nav-links{display:flex !important;}}`;
      return `<nav ${sel} id="${navId}" data-open="false" style="background:${nc.bgColor||'#fff'};padding:14px 24px;display:flex;align-items:center;justify-content:${justify};text-align:${textAlign};gap:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);position:relative;z-index:20;">
  <style>
    #${navId} .nav-brand{font-weight:700;font-size:18px;color:${nc.textColor||'#333'};}
    #${navId} .nav-links{display:flex;align-items:center;justify-content:${mobileJustify};gap:0;flex-wrap:wrap;}
    #${navId} .nav-links a{padding:0 12px;}
    #${navId} .nav-links a[style*="inline-flex"]{padding:10px 16px;}
    #${navId} .nav-toggle{display:none;align-items:center;justify-content:center;background:transparent;border:1px solid rgba(0,0,0,.12);border-radius:8px;color:${nc.textColor||'#333'};padding:8px 10px;font-size:18px;line-height:1;}
    ${stackCss}
  </style>
  <div class="nav-brand">${nc.brand||'My Site'}</div>
  <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="${menuId}" onclick="event.stopPropagation();const nav=this.closest('nav');const open=nav.getAttribute('data-open')==='true';nav.setAttribute('data-open',open?'false':'true');this.setAttribute('aria-expanded',open?'false':'true');">☰</button>
  <div class="nav-links" id="${menuId}">${linkHtml}</div>
</nav>`;
    }
    case 'hero': {
      const heroAlign = p.align || 'center';
      const heroFlexAlign = heroAlign === 'left' ? 'flex-start' : heroAlign === 'right' ? 'flex-end' : 'center';
      const heroOverlayOpacity = Math.min(1, Math.max(0, Number(p.overlayOpacity || 0) || 0));
      const heroImage = resolveImageAsset(p.bgImage, pd);
      const heroBg = heroImage
        ? `linear-gradient(rgba(${hexToRgb(p.overlayColor||'#000000')}, ${heroOverlayOpacity}), rgba(${hexToRgb(p.overlayColor||'#000000')}, ${heroOverlayOpacity})), ${p.bgColor||'#7c6af7'} url('${escCssUrl(heroImage)}') ${p.bgPosition||'center'} / ${p.bgSize||'cover'} no-repeat`
        : (p.bgColor||'#7c6af7');
      return `<section ${sel} style="background:${heroBg};color:${p.textColor||'#fff'};padding:${p.padding || 'calc(var(--site-section-padding-y, 72px) + 28px) 24px'};min-height:${p.minHeight||'auto'};display:flex;align-items:center;justify-content:center;">
  <div style="width:100%;max-width:${p.contentWidth||siteSectionWidth};text-align:${heroAlign};display:flex;flex-direction:column;align-items:${heroFlexAlign};margin:0 auto;position:relative;z-index:1;">
    <h1 style="font-family:${siteHeadingFont};font-size:calc(clamp(28px,5vw,56px) * var(--site-heading-scale, 1));font-weight:800;margin:0 0 16px;">${p.heading||'Welcome'}</h1>
    <p style="font-size:clamp(14px,2vw,20px);margin:0 0 32px;opacity:0.85;">${p.subheading||''}</p>
    ${p.buttonText ? `<a href="${p.buttonHref||'#'}" style="background:${p.btnBg||'#fff'};color:${p.btnColor||'#7c6af7'};padding:14px 32px;border-radius:${siteButtonRadius};font-weight:600;font-size:${siteBodySize};text-decoration:none;display:inline-block;">${p.buttonText}</a>` : ''}
  </div>
</section>`;
    }
    case 'heading': {
      const tag = p.level || 'h2';
      const sizes = { h1:'2.4em', h2:'1.8em', h3:'1.4em', h4:'1.1em' };
      return `<${tag} ${sel} style="font-family:${siteHeadingFont};text-align:${p.align||'left'};color:${p.color||'#111'};font-size:calc(${sizes[tag]||'1.8em'} * var(--site-heading-scale, 1));padding:12px 24px;margin:0;">${p.text||'Title'}</${tag}>`;
    }
    case 'text': {
      return `<div ${sel} style="padding:8px 24px;color:${p.color||'#333'};text-align:${p.align||'left'};font-size:${siteBodySize};line-height:var(--site-line-height, 1.7);">${p.content||''}</div>`;
    }
    case 'image': {
      const rounded = p.rounded ? 'border-radius:8px;' : '';
      const imageAspect = p.aspectRatio ? `aspect-ratio:${p.aspectRatio};` : '';
      const src = resolveImageAsset(p.src, pd);
      return `<div ${sel} style="padding:16px 24px;text-align:${p.align||'center'};">
  ${src ? `<img src="${src}" alt="${p.alt||''}" style="width:${p.width||'100%'};height:${p.height||'auto'};object-fit:${p.fit||'contain'};${imageAspect}${rounded}display:inline-block;">` : `<div style="background:#e0e0e0;height:200px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#888;">Click to set image URL</div>`}
  ${p.caption ? `<p style="font-size:13px;color:#888;margin-top:6px;">${p.caption}</p>` : ''}
</div>`;
    }
    case 'youtubeEmbed': {
      const embedUrl = toYouTubeEmbedUrl(p.videoUrl, p.privacyMode, p.autoplay, p.showControls);
      const radius = p.rounded ? '20px' : '0';
      return `<section ${sel} style="padding:${p.padding || siteSectionPadding};background:${p.sectionBg||'#ffffff'};">
  <div style="max-width:${p.maxWidth||'960px'};margin:0 auto;">
    ${(p.title || p.description) ? `<div style="text-align:center;margin-bottom:22px;">
      ${p.title ? `<h2 style="font-family:${siteHeadingFont};margin:0 0 10px;font-size:calc(clamp(28px,4vw,42px) * var(--site-heading-scale, 1));color:#13293d;">${p.title}</h2>` : ''}
      ${p.description ? `<p style="margin:0 auto;max-width:700px;font-size:${siteBodySize};line-height:var(--site-line-height, 1.7);color:#5a6b7d;">${p.description}</p>` : ''}
    </div>` : ''}
    <div style="position:relative;width:100%;aspect-ratio:${p.aspectRatio||'16 / 9'};border-radius:${radius};overflow:hidden;box-shadow:0 28px 70px rgba(19,41,61,.18);background:#000;">
      <iframe src="${escAttr(embedUrl)}" title="${escAttr(p.title||'YouTube Video')}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
  </div>
</section>`;
    }
    case 'button': {
      const sizes = { small:'10px 20px', medium:'12px 28px', large:'16px 40px' };
      const pad = sizes[p.size||'medium'];
      const radius = p.rounded ? siteButtonRadius : '0';
      return `<div ${sel} style="padding:12px 24px;text-align:${p.align||'center'};">
  <a href="${p.href||'#'}" style="background:${p.bgColor||'#7c6af7'};color:${p.textColor||'#fff'};padding:${pad};border-radius:${radius};font-weight:600;text-decoration:none;display:inline-block;font-size:${siteBodySize};">${p.text||'Button'}</a>
</div>`;
    }
    case 'section': {
      return `<section ${sel} style="background:${p.bgColor||'#fff'};padding:${p.padding||siteSectionPadding};">
  <div style="max-width:${p.maxWidth||siteSectionWidth};margin:0 auto;">${p.content||''}</div>
</section>`;
    }
    case 'columns2': {
      return `<div ${sel} style="background:${p.bgColor||'#fff'};padding:${p.padding||siteSectionPadding};">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:${p.gap||siteContentGap};max-width:${siteSectionWidth};margin:0 auto;">
    <div>${p.col1||'<p>Column 1</p>'}</div>
    <div>${p.col2||'<p>Column 2</p>'}</div>
  </div>
</div>`;
    }
    case 'columns3': {
      return `<div ${sel} style="background:${p.bgColor||'#fff'};padding:${p.padding||siteSectionPadding};">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:${p.gap||siteContentGap};max-width:${siteSectionWidth};margin:0 auto;">
    <div>${p.col1||'<p>Col 1</p>'}</div>
    <div>${p.col2||'<p>Col 2</p>'}</div>
    <div>${p.col3||'<p>Col 3</p>'}</div>
  </div>
</div>`;
    }
    case 'divider': {
      return `<div ${sel} style="padding:10px 24px;margin:${p.margin||'20px 0'};"><hr style="border:none;border-top:${p.thickness||'1px'} solid ${p.color||'#ddd'};"></div>`;
    }
    case 'spacer': {
      return `<div ${sel} style="height:${p.height||'40px'};"></div>`;
    }
    case 'cards': {
      const cards = (p.cards||[]).map(c=>{
        const cardImage = resolveImageAsset(c.img, pd);
        return `
  <div style="background:#fff;border-radius:${siteCardRadius};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  ${cardImage ? `<img src="${cardImage}" style="width:100%;height:180px;object-fit:cover;">` : `<div style="height:180px;background:#e8e8e8;display:flex;align-items:center;justify-content:center;color:#4ade80;font-size:32px;">▧</div>`}
    <div style="padding:16px;">
      <h3 style="margin:0 0 8px;font-size:16px;">${c.title||'Card Title'}</h3>
      <p style="margin:0;color:#666;font-size:14px;">${c.desc||''}</p>
    </div>
  </div>`;
      }).join('');
      return `<section ${sel} style="background:${p.bgColor||'#f8f8f8'};padding:${p.padding||siteSectionPadding};">
  <h2 style="font-family:${siteHeadingFont};text-align:center;margin:0 0 32px;font-size:calc(2em * var(--site-heading-scale, 1));">${p.title||'Our Work'}</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:${siteContentGap};max-width:${siteSectionWidth};margin:0 auto;">${cards}</div>
</section>`;
    }
    case 'features': {
      const feats = (p.features||[]).map(f=>`
  <div style="text-align:center;padding:24px;">
    <div style="font-size:40px;margin-bottom:16px;">${f.icon||'✦'}</div>
    <h3 style="margin:0 0 8px;font-size:18px;">${f.title||'Feature'}</h3>
    <p style="margin:0;color:#666;">${f.desc||''}</p>
  </div>`).join('');
      return `<section ${sel} style="background:${p.bgColor||'#fff'};padding:${p.padding||siteSectionPadding};">
  <h2 style="font-family:${siteHeadingFont};text-align:center;margin:0 0 40px;font-size:calc(2em * var(--site-heading-scale, 1));">${p.title||'Features'}</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:${siteContentGap};max-width:${siteSectionWidth};margin:0 auto;">${feats}</div>
</section>`;
    }
    case 'testimonialWall': {
      const cols = Math.min(4, Math.max(1, Number(p.columns || 3) || 3));
      const cards = (p.testimonials||[]).map((item, index) => {
        const highlighted = p.highlightFirst && index === 0;
        const bg = highlighted ? '#13293d' : '#ffffff';
        const text = highlighted ? 'rgba(255,255,255,.84)' : '#44576a';
        const strong = highlighted ? '#ffffff' : '#13293d';
        const muted = highlighted ? 'rgba(255,255,255,.64)' : '#6b7d8f';
        const border = highlighted ? '#13293d' : '#dbe6f1';
        const stars = '★★★★★'.slice(0, Math.min(5, Math.max(0, Number(item.rating || 5) || 5)));
        return `<div style="background:${bg};border:1px solid ${border};border-radius:${siteCardRadius};padding:24px;box-shadow:0 16px 40px rgba(19,41,61,.07);">
  ${p.showStars ? `<div style="font-size:18px;margin-bottom:10px;color:${highlighted ? '#fbbf24' : '#f59e0b'};">${stars || '★★★★★'}</div>` : ''}
  <p style="margin:0 0 14px;font-size:${siteBodySize};line-height:var(--site-line-height, 1.7);color:${text};">"${item.quote||''}"</p>
  <strong style="display:block;color:${strong};">${item.name||'Customer Name'}</strong>
  <span style="color:${muted};font-size:13px;">${item.role||''}</span>
</div>`;
      }).join('');
      return `<section ${sel} style="padding:${p.padding||siteSectionPadding};background:${p.bgColor||'#f5f8fc'};">
  <div style="max-width:${p.maxWidth||siteSectionWidth};margin:0 auto;">
    <div style="text-align:center;margin-bottom:28px;">
      ${p.title ? `<h2 style="font-family:${siteHeadingFont};margin:0 0 10px;font-size:calc(clamp(28px,4vw,42px) * var(--site-heading-scale, 1));color:#13293d;">${p.title}</h2>` : ''}
      ${p.intro ? `<p style="margin:0 auto;max-width:720px;font-size:${siteBodySize};line-height:var(--site-line-height, 1.7);color:#5a6b7d;">${p.intro}</p>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:18px;">${cards}</div>
  </div>
</section>`;
    }
    case 'cta': {
      return `<section ${sel} style="background:${p.bgColor||'#7c6af7'};color:${p.textColor||'#fff'};padding:${p.padding||siteSectionPadding};text-align:center;">
  <h2 style="font-family:${siteHeadingFont};font-size:calc(2.2em * var(--site-heading-scale, 1));margin:0 0 12px;">${p.heading||'Ready to get started?'}</h2>
  <p style="font-size:1.1em;margin:0 0 32px;opacity:0.85;">${p.subheading||''}</p>
  <a href="${p.buttonHref||'#'}" style="background:${p.btnBg||'#fff'};color:${p.btnColor||'#7c6af7'};padding:14px 36px;border-radius:${siteButtonRadius};font-weight:600;font-size:${siteBodySize};text-decoration:none;display:inline-block;">${p.buttonText||'Get Started'}</a>
</section>`;
    }
    case 'footer': {
      return `<footer ${sel} style="background:${p.bgColor||'#1a1a1a'};color:${p.textColor||'#aaa'};padding:40px 24px 24px;">
  <div style="max-width:1100px;margin:0 auto;">
    <div style="font-weight:700;font-size:18px;color:${p.linkColor||'#ccc'};margin-bottom:8px;">${p.brand||'My Site'}</div>
    <p style="margin:0 0 24px;">${p.tagline||''}</p>
    <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;font-size:13px;">${p.copyright||'© 2025 My Site'}</div>
  </div>
</footer>`;
    }
    case 'form': {
      return `<section ${sel} style="background:${p.bgColor||'#f8f8f8'};padding:${p.padding||siteSectionPadding};">
  <div style="max-width:600px;margin:0 auto;">
    <h2 style="font-family:${siteHeadingFont};text-align:center;margin:0 0 32px;font-size:calc(2em * var(--site-heading-scale, 1));">${p.title||'Contact Us'}</h2>
    <form action="${p.action||'#'}" style="display:flex;flex-direction:column;gap:${siteContentGap};">
      <div><label style="display:block;margin-bottom:4px;font-weight:500;">Name</label><input type="text" placeholder="Your name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;"></div>
      <div><label style="display:block;margin-bottom:4px;font-weight:500;">Email</label><input type="email" placeholder="your@email.com" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;"></div>
      <div><label style="display:block;margin-bottom:4px;font-weight:500;">Message</label><textarea placeholder="Your message..." rows="5" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;"></textarea></div>
      <button type="submit" style="background:${p.btnBg||'#7c6af7'};color:${p.btnColor||'#fff'};padding:12px;border-radius:${siteButtonRadius};font-weight:600;font-size:15px;border:none;cursor:pointer;">${p.submitText||'Send Message'}</button>
    </form>
  </div>
</section>`;
    }
    case 'html': {
      return `<div ${sel}>${p.code||''}</div>`;
    }
    default:
      return `<div ${sel} style="padding:16px;background:#f0f0f0;color:#666;">[Unknown block: ${block.type}]</div>`;
  }
}

// ============================================================
// PROJECT COMPILATION
// ============================================================
function escAttr(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '0, 0, 0';
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function escCssUrl(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\n\r]/g, '');
}

const IMAGE_REF_PREFIX = 'fw-image:';

function imageRef(id) {
  return `${IMAGE_REF_PREFIX}${id}`;
}

function isImageRef(value) {
  return String(value || '').startsWith(IMAGE_REF_PREFIX);
}

function imageIdFromRef(value) {
  return String(value || '').slice(IMAGE_REF_PREFIX.length);
}

function sanitizeAssetFilename(name = 'image') {
  const clean = String(name || 'image')
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return clean || 'image';
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function dataUrlBytes(dataURL = '') {
  const b64 = String(dataURL).split(',')[1] || '';
  return Math.floor((b64.length * 3) / 4);
}

function mimeFromFilename(name = '') {
  const ext = String(name).split('.').pop().toLowerCase();
  return {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    ico: 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

function buildImageAssetMap(projectData) {
  const map = {};
  const used = new Set();
  (projectData?.images || []).forEach((img) => {
    let fname = sanitizeAssetFilename(img.name || `${img.id || 'image'}.jpg`);
    if (!/\.[a-z0-9]{2,5}$/i.test(fname)) {
      const typeExt = String(img.type || '').split('/')[1] || 'jpg';
      fname += `.${typeExt.replace('jpeg', 'jpg').replace('svg+xml', 'svg').replace(/[^a-z0-9]/gi, '')}`;
    }
    if (used.has(fname)) {
      const ext = fname.includes('.') ? '.' + fname.split('.').pop() : '';
      const base = ext ? fname.slice(0, -ext.length) : fname;
      fname = `${base}-${String(img.id || uid()).slice(0, 5)}${ext}`;
    }
    used.add(fname);
    if (img.id) map[imageRef(img.id)] = fname;
    if (img.dataURL) map[img.dataURL] = fname;
  });
  return map;
}

function resolveImageAsset(value, projectData = _projectData, imageMap = null) {
  const raw = String(value || '');
  if (!raw) return '';
  const map = imageMap || projectData?._imageMap || null;
  if (map && map[raw]) return `images/${map[raw]}`;
  if (isImageRef(raw)) {
    const img = (projectData?.images || []).find(item => item.id === imageIdFromRef(raw));
    if (!img) return '';
    return img.dataURL || '';
  }
  return raw;
}

function imageRefLabel(value, projectData = _projectData) {
  if (!isImageRef(value)) return '';
  const img = (projectData?.images || []).find(item => item.id === imageIdFromRef(value));
  return img ? `Using library image: ${img.name}` : 'Library image missing. Choose another image.';
}

function replaceDataUrlsWithImageRefs(value, dataUrlToRef) {
  if (typeof value === 'string') {
    if (dataUrlToRef[value]) return dataUrlToRef[value];
    let next = value;
    Object.entries(dataUrlToRef).forEach(([dataUrl, ref]) => {
      if (next.includes(dataUrl)) next = next.split(dataUrl).join(ref);
    });
    return next;
  }
  if (Array.isArray(value)) return value.map(item => replaceDataUrlsWithImageRefs(item, dataUrlToRef));
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(key => {
      value[key] = replaceDataUrlsWithImageRefs(value[key], dataUrlToRef);
    });
  }
  return value;
}

function createPortableProjectData(projectData, imageMap) {
  const portable = JSON.parse(JSON.stringify(projectData));
  const dataUrlToRef = {};
  portable.images = (projectData.images || []).map(img => {
    if (img.dataURL) dataUrlToRef[img.dataURL] = imageRef(img.id);
    const fname = imageMap[imageRef(img.id)] || imageMap[img.dataURL] || sanitizeAssetFilename(img.name);
    return {
      id: img.id,
      name: img.name || fname,
      type: img.type || mimeFromFilename(fname),
      path: `images/${fname}`,
      size: dataUrlBytes(img.dataURL)
    };
  });
  replaceDataUrlsWithImageRefs(portable.pages, dataUrlToRef);
  replaceDataUrlsWithImageRefs(portable.templates, dataUrlToRef);
  replaceDataUrlsWithImageRefs(portable.meta, dataUrlToRef);
  return portable;
}

function resolveCompiledImageRefs(html, projectData, imageMap) {
  if (!imageMap || !Object.keys(imageMap).length) return html;
  let out = html;
  Object.entries(imageMap).forEach(([key, filename]) => {
    if (!key || key.startsWith('data:image/')) return;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escapedKey, 'g'), `images/${filename}`);
  });
  return out;
}

function toYouTubeEmbedUrl(url, privacyMode = true, autoplay = false, showControls = true) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  let videoId = '';
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.replace(/\//g, '');
    } else if (parsed.searchParams.get('v')) {
      videoId = parsed.searchParams.get('v');
    } else {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = parts.findIndex(part => part === 'embed' || part === 'shorts');
      if (embedIndex >= 0 && parts[embedIndex + 1]) videoId = parts[embedIndex + 1];
    }
  } catch (e) {
    videoId = raw;
  }
  videoId = String(videoId || raw).replace(/[^a-zA-Z0-9_-]/g, '');
  const host = privacyMode ? 'https://www.youtube-nocookie.com/embed/' : 'https://www.youtube.com/embed/';
  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  if (!showControls) params.set('controls', '0');
  const qs = params.toString();
  return `${host}${videoId}${qs ? '?' + qs : ''}`;
}

function buildMetaTags(projectData, page) {
  const sm = projectData.meta || {};
  const pm = page.meta || {};
  const tags = [];
  const desc = pm.description || sm.description;
  if (desc) tags.push(`<meta name="description" content="${escAttr(desc)}">`);
  if (sm.keywords) tags.push(`<meta name="keywords" content="${escAttr(sm.keywords)}">`);
  if (sm.author) tags.push(`<meta name="author" content="${escAttr(sm.author)}">`);
  if (sm.favicon) tags.push(`<link rel="icon" href="${escAttr(sm.favicon)}">`);
  const ogTitle = pm.ogTitle || pm.titleOverride || (page.name + (projectData.name ? ' \u2014 ' + projectData.name : ''));
  const ogDesc = pm.ogDescription || desc;
  const ogImg = pm.ogImage || sm.ogImage;
  tags.push(`<meta property="og:type" content="${escAttr(sm.ogType||'website')}">`);
  tags.push(`<meta property="og:title" content="${escAttr(ogTitle)}">`);
  if (ogDesc) tags.push(`<meta property="og:description" content="${escAttr(ogDesc)}">`);
  if (ogImg) tags.push(`<meta property="og:image" content="${escAttr(ogImg)}">`);
  tags.push(`<meta name="twitter:card" content="${escAttr(sm.twitterCard||'summary_large_image')}">`);
  return tags.join('\n');
}

function buildSiteThemeCSS(projectData) {
  return `body.site-theme-light { background: var(--color-page-bg, #ffffff); color: var(--color-text-dark, #111111); color-scheme: light; }`;
}

function resolveImageSrcs(html, imageMap) {
  if (!imageMap || !Object.keys(imageMap).length) return html;
  return html.replace(/src="(data:image\/[^"]{1,2000000})"/g, (match, dataUrl) => {
    return imageMap[dataUrl] ? `src="images/${escAttr(imageMap[dataUrl])}"` : match;
  });
}

function compilePageHTML(projectData, pageIndex, minimal = false, imageMap = null) {
  const page = projectData.pages[pageIndex];
  const renderCtx = imageMap ? Object.assign({}, projectData, { _imageMap: imageMap }) : projectData;
  let blocksHTML = (page.blocks||[]).map(b => renderBlock(b, false, renderCtx)).join('\n');
  if (imageMap) {
    blocksHTML = resolveImageSrcs(blocksHTML, imageMap);
    blocksHTML = resolveCompiledImageRefs(blocksHTML, projectData, imageMap);
  }
  const titleOverride = (page.meta||{}).titleOverride;
  const title = titleOverride || (page.name + (projectData.name ? ' \u2014 ' + projectData.name : ''));
  const metaTags = buildMetaTags(projectData, page);

  const brandCSS = buildBrandCSS(projectData);
  const styleSystemCSS = buildStyleSystemCSS(projectData);
  const siteThemeCSS = buildSiteThemeCSS(projectData);

  if (minimal) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${metaTags}
<style>${brandCSS}${styleSystemCSS}${siteThemeCSS}${projectData.globalCSS||''}</style>
</head>
<body class="site-theme-${projectData.siteTheme || 'light'}">
${blocksHTML}
<script>${projectData.globalJS||''}<\/script>
</body>
</html>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${metaTags}
<style>
${brandCSS}
${styleSystemCSS}
${siteThemeCSS}
${projectData.globalCSS||''}
</style>
</head>
<body class="site-theme-${projectData.siteTheme || 'light'}">
${blocksHTML}
<script>
${projectData.globalJS||''}
<\/script>
</body>
</html>`;
}

// ============================================================
// VIEW NAVIGATION
// ============================================================
