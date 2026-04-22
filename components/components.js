(function() {
  const componentPaths = {
    header: '/components/header.html',
    footer: '/components/footer.html',
    styles: '/styles/shared.css'
  };

  const fallbackStyles = `/* ===== SHARED STYLESHEET FOR FUNCTIONAL WEBSITES ===== */
:host {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

.site-component {
  --bg: #0f0f13;
  --bg2: #16161e;
  --bg3: #1e1e2e;
  --border: #2a2a3e;
  --accent2: #81818f;
  --green: #4ade80;
  --text: #e2e2f0;
  --text2: #8888aa;
  --radius: 8px;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.site-component a {
  color: inherit;
  text-decoration: none;
}

.site-component button {
  font: inherit;
  cursor: pointer;
}

.header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  line-height: 1;
  min-height: 80px;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  color: inherit;
}

.logo-link:hover .logo {
  color: var(--green);
}

.logo-link:focus-visible,
.nav-links a:focus-visible,
.nav-actions a:focus-visible,
.menu-toggle:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 4px;
  border-radius: 12px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}

.logo-mark {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-mark svg {
  width: 100%;
  height: 100%;
  fill: var(--green);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-links a {
  color: var(--text2);
  font-size: 14px;
  white-space: nowrap;
  transition: color 0.2s;
}

.nav-links a:hover,
.nav-links a[aria-current="page"] {
  color: var(--text);
}

.nav-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.menu-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 18px;
  flex-shrink: 0;
}

.menu-toggle:hover {
  border-color: var(--accent2);
  background: var(--bg3);
}

.menu-toggle-bar {
  display: block;
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  position: relative;
}

.menu-toggle-bar::before,
.menu-toggle-bar::after {
  content: "";
  position: absolute;
  left: 0;
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.menu-toggle-bar::before {
  top: -5px;
}

.menu-toggle-bar::after {
  top: 5px;
}

.header-nav[data-open="true"] + .menu-toggle .menu-toggle-bar {
  background: transparent;
}

.header-nav[data-open="true"] + .menu-toggle .menu-toggle-bar::before {
  top: 0;
  transform: rotate(45deg);
}

.header-nav[data-open="true"] + .menu-toggle .menu-toggle-bar::after {
  top: 0;
  transform: rotate(-45deg);
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: var(--green);
  color: #000;
}

.btn-primary:hover {
  background: #3dc76e;
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  border-color: var(--text);
  color: var(--text);
}

footer {
  background: var(--bg2);
  border-top: 1px solid var(--border);
  padding: 40px 24px;
  margin-top: 100px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
}

.footer-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px;
}

.footer-section a {
  display: block;
  color: var(--text2);
  font-size: 13px;
  margin-bottom: 8px;
  transition: color 0.2s;
}

.footer-section a:hover {
  color: var(--text);
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  border-top: 1px solid var(--border);
  padding-top: 24px;
  text-align: center;
  color: var(--text2);
  font-size: 13px;
}

@media (max-width: 768px) {
  .header-wrapper {
    padding: 12px 16px;
    min-height: 64px;
    gap: 8px;
  }

  .header-nav {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    left: 16px;
    right: 16px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 16px 50px rgba(0, 0, 0, 0.24);
    padding: 14px;
    flex-direction: column;
    gap: 16px;
    z-index: 101;
  }

  .header-nav[data-open="true"] {
    display: flex;
  }

  .nav-links,
  .nav-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .nav-links a {
    padding: 8px 0;
  }

  .menu-toggle {
    display: flex;
  }

  footer {
    padding: 24px 16px;
    margin-top: 60px;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .header-wrapper {
    padding: 12px;
    min-height: 56px;
  }

  .logo {
    font-size: 16px;
  }

  .logo-mark {
    width: 24px;
    height: 24px;
  }

  .menu-toggle {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
}`;

  const fallbackMarkup = {
    header: `<header class="header">
  <div class="header-wrapper">
    <a class="logo-link" href="/" aria-label="Functional Websites home">
      <div class="logo">
        <div class="logo-mark">
          <svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 250"><path d="M124.99998,63.77464c-33.75761,0-61.22533,27.46775-61.22533,61.22522,0,33.76176,27.46772,61.2255,61.22533,61.2255,33.76173,0,61.22536-27.46374,61.22536-61.2255,0-33.75747-27.46363-61.22522-61.22536-61.22522ZM113.19576,73.70539c-5.24093,3.38575-9.97977,7.57761-14.00227,12.45118-1.12043,1.35914-2.1796,2.76325-3.1735,4.21026-2.09593-1.39595-4.09805-2.94908-5.99805-4.65523,6.49394-5.7858,14.41656-9.99191,23.17382-12.0062ZM84.08719,91.93213c2.38774,2.16525,4.9184,4.11838,7.56944,5.85111-3.63878,7.32246-5.80005,15.34712-6.29394,23.56563h-12.86755c.76532-11.09812,4.98783-21.26146,11.59205-29.41674ZM72.60331,129.94289h12.85126c.63467,7.76121,2.75509,15.33495,6.20207,22.27373-2.65104,1.73881-5.18171,3.69195-7.56944,5.85305-6.34911-7.8387-10.49403-17.53285-11.48388-28.12678ZM90.02395,164.29228c1.90007-1.7081,3.9042-3.2633,5.99809-4.65717.83267,1.21234,1.71021,2.3959,2.63471,3.54708,4.12458,5.1449,9.0593,9.56935,14.54922,13.1185-8.75729-2.01236-16.69008-6.22054-23.18202-12.00842ZM120.70401,170.84337c-6.86334-3.81025-12.70424-9.07553-17.1676-15.35321,5.37559-2.41236,11.15935-3.90005,17.1676-4.37768v19.73089ZM120.70401,142.49411c-7.57768.52038-14.85939,2.41015-21.57991,5.55723-2.70618-5.57563-4.45309-11.68797-5.04701-18.10844h26.62692v12.55121ZM120.70401,121.34887h-26.73097c.47756-6.85521,2.30001-13.40838,5.21844-19.36353,6.70011,3.12452,13.95733,5.00419,21.51252,5.52056v13.84298ZM120.70401,98.89139c-5.97155-.47763-11.72671-1.94899-17.07577-4.33672,4.46741-6.26551,10.28586-11.53895,17.07577-15.35335v19.69007ZM159.97595,85.70952c-1.9449,1.74905-4.00206,3.34092-6.15513,4.76136-1.01023-1.48367-2.09396-2.92445-3.24293-4.31638-4.04906-4.90623-8.83277-9.12465-14.11859-12.52672,8.89202,1.98164,16.94107,6.2204,23.51665,12.08175ZM129.29596,79.33194c6.72051,3.82035,12.4757,9.07152,16.90433,15.29814-5.30008,2.34498-10.992,3.78783-16.90433,4.26131v-19.55946ZM129.29596,107.50589c7.48172-.51028,14.67983-2.35937,21.32888-5.43284,2.8939,5.93067,4.69595,12.45325,5.17358,19.27581h-26.50246v-13.84298ZM129.29596,129.94289h26.3963c-.60614,6.34894-2.3592,12.42461-5.07762,17.98391-6.64497-3.07153-13.83696-4.9184-21.31868-5.43284v-12.55108ZM129.29596,151.11248c5.90825.46947,11.59606,1.9144,16.89209,4.25315-4.42251,6.22455-10.17773,11.47572-16.89209,15.29814v-19.55129ZM136.46138,176.37417c5.32457-3.42657,10.13076-7.67972,14.20016-12.63077,1.11638-1.35928,2.17147-2.76547,3.16537-4.21233,2.14902,1.42044,4.20621,3.01231,6.15112,4.76122-6.57765,5.86135-14.62473,10.09817-23.51665,12.08189ZM165.91278,158.06967c-2.43879-2.21022-5.0266-4.19988-7.74088-5.96526,3.41633-6.9082,5.51634-14.43697,6.147-22.16152h13.08184c-.99386,10.59393-5.13881,20.28808-11.48796,28.12678ZM164.4107,121.34887c-.48974-8.17976-2.63063-16.1636-6.2388-23.45342,2.71434-1.7633,5.30208-3.75311,7.74088-5.96332,6.6083,8.15527,10.82672,18.32069,11.59208,29.41674h-13.09415Z"/><path d="M222.17682,134.82829l23.41662-12.14607-3.19748-25.03112-25.74334-6.40991c-1.9816-5.36282-4.42368-10.50373-7.27356-15.37863l11.8203-23.62087-17.29971-18.37109-24.63473,9.96199c-4.69123-3.14666-9.67007-5.89485-14.88628-8.2023l-4.31793-26.03796-24.79403-4.69386-14.05755,22.51225c-5.77186.22145-11.41635.94546-16.89186,2.13073l-18.7873-18.51651-22.8179,10.77607,1.86267,26.51771c-4.44631,3.51122-8.57799,7.40256-12.35252,11.62022l-26.14687-3.94686-12.12606,22.12996,17.05413,20.31136c-1.52977,5.40507-2.60469,10.99906-3.18078,16.73784l-23.41608,12.14607,3.19748,25.03112,25.74277,6.40976c1.98164,5.36313,4.42376,10.50389,7.27376,15.37909l-11.82034,23.62102,17.29971,18.37124,24.63503-9.9623c4.69112,3.14666,9.6698,5.89469,14.88589,8.20199l4.31801,26.03827,24.79403,4.69401,14.05759-22.51256c5.77186-.2216,11.41631-.94562,16.89182-2.13073l18.7873,18.51635,22.8179-10.77591-1.86271-26.51771c4.44619-3.51122,8.57788-7.40241,12.35241-11.62006l26.14722,3.94686,12.1261-22.12996-17.05436-20.31151c1.52969-5.40507,2.60461-10.9989,3.18067-16.738ZM124.99975,199.17443c-40.90011,0-74.17462-33.27444-74.17462-74.17459S84.09964,50.82511,124.99975,50.82511s74.17466,33.2746,74.17466,74.17474-33.27452,74.17459-74.17466,74.17459Z"/></svg>
        </div>
        Functional Websites
      </div>
    </a>
    <nav class="header-nav" id="site-nav" data-open="false">
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/marketplace">Marketplace</a>
        <a href="/docs">Docs</a>
        <a href="/services">Services</a>
      </div>
      <div class="nav-actions">
        <a href="/site-builder" class="btn btn-primary">Open Builder</a>
      </div>
    </nav>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation">
      <span class="menu-toggle-bar"></span>
    </button>
  </div>
</header>`,
    footer: `<footer>
  <div class="footer-content">
    <div class="footer-section">
      <h4>Product</h4>
      <a href="/site-builder">Builder</a>
      <a href="/marketplace">Marketplace</a>
      <a href="/docs">Docs</a>
    </div>
    <div class="footer-section">
      <h4>Services</h4>
      <a href="/services">Custom Sites</a>
      <a href="/pricing">Pricing</a>
      <a href="mailto:cooper@functionalwebsites.com">Contact</a>
    </div>
    <div class="footer-section">
      <h4>Resources</h4>
      <a href="/docs/getting-started">Getting Started</a>
      <a href="/pricing#faq">FAQ</a>
    </div>
    <div class="footer-section">
      <h4>Company</h4>
      <a href="mailto:cooper@functionalwebsites.com">Email</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2026 Functional Websites. Built static. All rights reserved.</p>
  </div>
</footer>`
  };

  let sharedStylesPromise;

  async function fetchText(path, fallbackValue) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.warn(`Component loader fallback for ${path}`, error);
      return fallbackValue;
    }
  }

  function getSharedStyles() {
    if (!sharedStylesPromise) {
      sharedStylesPromise = fetchText(componentPaths.styles, fallbackStyles);
    }
    return sharedStylesPromise;
  }

  function markActiveNav(root) {
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    const links = root.querySelectorAll('.nav-links a');

    links.forEach((link) => {
      const href = (link.getAttribute('href') || '').replace(/\/$/, '') || '/';
      const isDocsMatch = href === '/docs' && pathname.startsWith('/docs');
      const isExactMatch = href === pathname;
      link.toggleAttribute('aria-current', isDocsMatch || isExactMatch);
    });
  }

  function bindHeaderInteractions(root) {
    const nav = root.getElementById('site-nav');
    const button = root.querySelector('.menu-toggle');

    if (!nav || !button) {
      return;
    }

    const toggleMenu = (forceOpen) => {
      const nextState = typeof forceOpen === 'boolean' ? forceOpen : nav.dataset.open !== 'true';
      nav.dataset.open = nextState ? 'true' : 'false';
      button.setAttribute('aria-expanded', nextState ? 'true' : 'false');
    };

    button.addEventListener('click', () => toggleMenu());

    root.addEventListener('click', (event) => {
      if (window.innerWidth > 768) {
        return;
      }

      if (!nav.contains(event.target) && !button.contains(event.target)) {
        toggleMenu(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        toggleMenu(false);
      }
    });
  }

  async function loadComponent(name, selector) {
    const placeholder = document.querySelector(selector);
    if (!placeholder) {
      return;
    }

    const [styles, markup] = await Promise.all([
      getSharedStyles(),
      fetchText(componentPaths[name], fallbackMarkup[name])
    ]);

    const root = placeholder.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${styles}</style><div class="site-component">${markup}</div>`;

    if (name === 'header') {
      markActiveNav(root);
      bindHeaderInteractions(root);
    }
  }

  async function initComponents() {
    await Promise.all([
      loadComponent('header', '#header-placeholder'),
      loadComponent('footer', '#footer-placeholder')
    ]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
  } else {
    initComponents();
  }
})();
