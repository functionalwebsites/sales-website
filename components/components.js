(function() {
  const fallbackStyles = `/* ===== SHARED STYLESHEET FOR FUNCTIONAL WEBSITES ===== */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/styles/fonts/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}

:host {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

.site-component {
  --bg: #f5efe0;
  --bg2: #ebe2ce;
  --bg3: #dfd2b8;
  --border: #10100d;
  --accent2: #244d67;
  --rust: #b9482e;
  --green: #7cff6b;
  --text: #10100d;
  --text2: #625d50;
  --radius: 4px;
  --shadow-color: #10100d;
  --line: 3px solid var(--border);
  --shadow-sm: 4px 4px 0 var(--shadow-color);
  --button-motion: transform 0.22s ease, box-shadow 0.22s ease, background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  --hero-gradient:
    radial-gradient(circle at top left, rgba(74, 222, 128, 0.16), transparent 30%),
    radial-gradient(circle at bottom right, rgba(129, 129, 143, 0.16), transparent 34%),
    linear-gradient(180deg, #161a1a 0%, #101313 100%);
  color: var(--text);
  font-family: 'JetBrains Mono', monospace;
}

:host-context(html[data-theme="dark"]) .site-component {
  --bg: #151717;
  --bg2: #20231f;
  --bg3: #2b2e27;
  --border: #f3ecd9;
  --green: #7cff6b;
  --rust: #ff8a66;
  --text: #f3ecd9;
  --text2: #d1c7b2;
  --shadow-color: #050505;
  --line: 3px solid var(--border);
  --shadow-sm: 4px 4px 0 var(--shadow-color);
}

.site-component a {
  color: inherit;
  text-decoration: none;
}

.site-component button {
  font: inherit;
  cursor: pointer;
}

.site-component ::selection {
  background: var(--rust);
  color: #ffffff;
}

.header {
  background: transparent;
  border-bottom: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
}

.header::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  background: var(--bg);
  border-bottom: var(--line);
  box-shadow: 0 4px 0 var(--shadow-color);
  pointer-events: none;
}

.header-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  line-height: 1;
  min-height: 72px;
}

.header-wrapper > :not(.header-nav) {
  position: relative;
  z-index: 3;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  color: inherit;
}

.logo-link:hover .logo {
  color: var(--text);
}

.logo-link:focus-visible,
.nav-links a:focus-visible,
.nav-actions a:focus-visible,
.mobile-builder-link:focus-visible,
.menu-toggle:focus-visible {
  border-radius: 12px;
}

.logo {
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}

.logo-mark {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-mark svg {
  width: 100%;
  height: 100%;
  fill: var(--text);
}

.logo-gear {
  transform-box: view-box;
  transform-origin: center;
}

.logo-mark[data-spin="true"] .logo-gear {
  animation: logoGearSpin 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes logoGearSpin {
  to {
    transform: rotate(720deg);
  }
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
  font-size: 16px;
  white-space: nowrap;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: var(--text);
}

.nav-links a[aria-current="page"] {
  color: var(--green);
}

.nav-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.nav-actions a {
  font-size: 16px;
}

.mobile-builder-link {
  display: none;
}

.theme-toggle {
  width: 76px;
  min-width: 76px;
  height: 42px;
  padding: 0;
  font-size: 0 !important;
  flex: 0 0 76px;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  border: var(--line) !important;
  box-shadow:
    inset 4px 4px 0 rgba(16, 16, 13, 0.24),
    inset -2px -2px 0 rgba(255, 255, 255, 0.34) !important;
}

.theme-toggle::before {
  content: "☾";
  position: absolute;
  top: 11px;
  left: 13px;
  display: block;
  padding: 0;
  color: var(--text);
  font-size: 16px;
  line-height: 1;
  text-shadow: 42px 0 0 currentColor;
}

.theme-toggle::after {
  content: "";
  position: absolute;
  top: 5px;
  left: 5px;
  width: 26px;
  height: 26px;
  background: var(--green);
  border: var(--line);
  box-shadow: none;
  transition: transform 0.22s ease;
}

.site-component[data-theme="dark"] .theme-toggle,
:host-context(html[data-theme="dark"]) .theme-toggle {
  background: var(--bg);
  box-shadow:
    inset 4px 4px 0 rgba(0, 0, 0, 0.58),
    inset -2px -2px 0 rgba(255, 255, 255, 0.08) !important;
}

.site-component[data-theme="dark"] .theme-toggle::after,
:host-context(html[data-theme="dark"]) .theme-toggle::after,
.theme-toggle.is-dark::after,
.theme-toggle[aria-pressed="true"]::after,
.theme-toggle[data-theme-state="dark"]::after {
  transform: translateX(35px);
}

.desktop-theme-toggle {
  position: static;
}

.mobile-theme-toggle {
  display: none !important;
}

.menu-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: var(--bg);
  border: var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  color: var(--text);
  font-size: 16px;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  transition: var(--button-motion);
}

.menu-toggle:hover {
  background: var(--rust);
  color: var(--bg);
  border-color: var(--border);
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.theme-toggle:hover {
  transform: none !important;
  background: var(--bg) !important;
  color: var(--text) !important;
  border: var(--line) !important;
  box-shadow:
    inset 4px 4px 0 rgba(16, 16, 13, 0.24),
    inset -2px -2px 0 rgba(255, 255, 255, 0.34) !important;
}

.site-component[data-theme="dark"] .theme-toggle:hover,
:host-context(html[data-theme="dark"]) .theme-toggle:hover {
  box-shadow:
    inset 4px 4px 0 rgba(0, 0, 0, 0.58),
    inset -2px -2px 0 rgba(255, 255, 255, 0.08) !important;
}

.menu-toggle-bar {
  display: block;
  width: 24px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  position: relative;
  flex-shrink: 0;
}

.menu-toggle-bar::before,
.menu-toggle-bar::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 24px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  transform: translateX(-50%);
  transform-origin: center;
}

.menu-toggle-bar::before {
  top: -8px;
}

.menu-toggle-bar::after {
  top: 8px;
}

.header-nav[data-open="true"] ~ .menu-toggle .menu-toggle-bar {
  background: transparent;
}

.menu-toggle[aria-expanded="true"] .menu-toggle-bar {
  background: transparent;
}

.header-nav[data-open="true"] ~ .menu-toggle .menu-toggle-bar::before {
  top: 0;
  transform: translateX(-50%) rotate(45deg);
}

.menu-toggle[aria-expanded="true"] .menu-toggle-bar::before {
  top: 0;
  transform: translateX(-50%) rotate(45deg);
}

.header-nav[data-open="true"] ~ .menu-toggle .menu-toggle-bar::after {
  top: 0;
  transform: translateX(-50%) rotate(-45deg);
}

.menu-toggle[aria-expanded="true"] .menu-toggle-bar::after {
  top: 0;
  transform: translateX(-50%) rotate(-45deg);
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 900;
  transition: var(--button-motion);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}

.btn-primary {
  background: var(--green);
  color: #000;
  border: var(--line);
}

.site-component .btn-primary {
  color: #000;
}

.btn-primary:hover {
  background: #a7ff9d;
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.btn-secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--rust) !important;
  border-color: var(--border);
  color: var(--bg) !important;
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--shadow-color);
}

.theme-toggle.btn-secondary:hover {
  transform: none !important;
  background: var(--bg) !important;
  color: var(--text) !important;
  border: var(--line) !important;
  box-shadow:
    inset 4px 4px 0 rgba(16, 16, 13, 0.24),
    inset -2px -2px 0 rgba(255, 255, 255, 0.34) !important;
}

.theme-toggle::before,
.theme-toggle::after {
  content: none !important;
}

.theme-toggle .toggle-icon {
  position: absolute;
  top: 50%;
  z-index: 1;
  color: var(--text);
  font-size: 16px;
  line-height: 1;
  transform: translateY(-50%);
  pointer-events: none;
}

.theme-toggle .toggle-icon-moon {
  left: 13px;
}

.theme-toggle .toggle-icon-sun {
  right: 11px;
}

.theme-toggle .toggle-ball {
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 2;
  width: 26px;
  height: 26px;
  background: var(--green);
  border: var(--line);
  box-shadow: none;
  transition: transform 0.22s ease;
  pointer-events: none;
}

.theme-toggle.is-dark .toggle-ball,
.theme-toggle[aria-pressed="true"] .toggle-ball,
.theme-toggle[data-theme-state="dark"] .toggle-ball {
  transform: translateX(35px);
}

footer {
  background: var(--bg2);
  border-top: 1px solid var(--border);
  padding: 40px 24px;
  margin-top: 100px;
}

.footer-brand {
  max-width: 1200px;
  margin: 0 auto 28px;
  display: block;
  color: var(--text);
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 800;
  line-height: 1;
  text-decoration: none;
}

.footer-brand strong {
  color: var(--fw-rust, var(--red));
  font-weight: 800;
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

.site-component[data-theme="dark"] footer,
.site-component[data-theme="dark"] .footer-section a,
.site-component[data-theme="dark"] .footer-bottom {
  color: var(--text2);
}

.site-component[data-theme="dark"] .footer-section h4 {
  color: var(--text);
}

@media (max-width: 768px) {
  .header-wrapper {
    padding: 6px 16px;
    min-height: 72px;
    gap: 8px;
    justify-content: space-between;
  }

  .logo-link {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }


  .logo-mark {
    width: 46px;
    height: 46px;
  }

  .header-nav {
    display: flex;
    position: absolute;
    top: calc(100% + 7px);
    left: 0;
    background: var(--bg);
    border-radius: 12px;
    box-shadow: 0 16px 50px rgba(0, 0, 0, 0.24);
    padding: 14px;
    flex-direction: column;
    gap: 16px;
    z-index: 101;
    width: 100%;
    height: calc(100vh - 75px);
    height: calc(100dvh - 75px);
    overflow-y: auto;
    overscroll-behavior: contain;
    opacity: 0;
    pointer-events: none;
    transform: translateX(-100%);
    transition: transform 0.24s ease, opacity 0.18s ease;
  }

  .header-nav[data-open="true"] {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
  }

  .nav-links,
  .nav-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .desktop-builder-action {
    display: flex;
  }

  .desktop-builder-action .build-shortcut {
    display: none;
  }

  .desktop-theme-toggle {
    display: none;
  }

  .nav-links a {
    padding: 8px 0;
  }

  .menu-toggle {
    display: flex;
    order: 1;
  }

  .mobile-builder-link {
    display: inline-flex;
    order: 3;
    align-items: center;
    min-height: 36px;
    margin-left: auto;
    padding: 8px 14px;
    font-size: 16px;
  }

  .mobile-theme-toggle {
    display: inline-flex !important;
    width: 76px;
    min-width: 76px;
    height: 42px;
    position: absolute;
    right: 14px;
    z-index: 2;
    padding: 0;
  }

  footer {
    padding: 24px;
    margin-top: 60px;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-nav {
    transition: none;
  }

  .logo-mark[data-spin="true"] .logo-gear {
    animation: none;
  }
}

/* Always-collapsed public nav experiment. */
.header-wrapper {
  height: 72px;
  min-height: 72px;
  padding: 6px 16px;
  justify-content: space-between;
}

.menu-toggle {
  display: flex !important;
  order: 1;
}

.logo-link {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-nav {
  display: flex !important;
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  width: 100%;
  height: calc(100vh - 75px);
  height: calc(100dvh - 75px);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--bg);
  border: var(--line);
  border-radius: var(--radius);
  box-shadow: 8px 8px 0 var(--shadow-color);
  padding: 14px;
  flex-direction: column;
  gap: 16px;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-100%);
  transition: transform 0.24s ease, opacity 0.18s ease;
}

.header-nav[data-open="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
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

.desktop-builder-action {
  display: flex !important;
}

.desktop-builder-action .build-shortcut,
.desktop-theme-toggle {
  display: none !important;
}

.mobile-builder-link {
  display: inline-flex !important;
  order: 2;
  align-items: center;
  min-height: 36px;
  margin-left: auto;
  padding: 8px 14px;
  font-size: 16px;
}

.topbar-theme-toggle {
  display: none !important;
  order: 3;
  margin-left: 8px;
}

.mobile-theme-toggle {
  display: inline-flex !important;
  width: 76px;
  min-width: 76px;
  height: 42px;
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  margin-left: 0;
  padding: 0;
}

@media (min-width: 769px) {
  .header-nav {
    --header-nav-inset: max(16px, calc((100vw - 1200px) / 2 + 16px));
    position: fixed;
    top: 80px;
    left: var(--header-nav-inset);
    width: calc(100vw - (var(--header-nav-inset) * 2));
    height: 64px;
    min-height: 64px;
    margin-left: 0;
    padding: 0 24px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transform: translateY(-84px);
  }

  .header-nav[data-open="true"] {
    transform: translateY(0);
  }

  .nav-links {
    width: auto;
    flex-direction: row;
    align-items: center;
    gap: 24px;
  }

  .nav-actions {
    width: auto;
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .nav-links a {
    padding: 0;
  }

  .mobile-theme-toggle {
    position: absolute;
    top: 11px;
    right: 24px;
    margin-left: 0;
    margin-top: 0 !important;
    overflow: hidden !important;
  }

  .mobile-theme-toggle .toggle-icon,
  .mobile-theme-toggle .toggle-ball {
    position: absolute;
  }
}`;

  const fallbackMarkup = {
    header: `<header class="header">
  <div class="header-wrapper">
    <a class="logo-link" href="https://functionalwebsites.com/" aria-label="Functional Websites home">
      <div class="logo">
        <div class="logo-mark">
          <svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 250"><path class="logo-globe" d="M124.99998,63.77464c-33.75761,0-61.22533,27.46775-61.22533,61.22522,0,33.76176,27.46772,61.2255,61.22533,61.2255,33.76173,0,61.22536-27.46374,61.22536-61.2255,0-33.75747-27.46363-61.22522-61.22536-61.22522ZM113.19576,73.70539c-5.24093,3.38575-9.97977,7.57761-14.00227,12.45118-1.12043,1.35914-2.1796,2.76325-3.1735,4.21026-2.09593-1.39595-4.09805-2.94908-5.99805-4.65523,6.49394-5.7858,14.41656-9.99191,23.17382-12.0062ZM84.08719,91.93213c2.38774,2.16525,4.9184,4.11838,7.56944,5.85111-3.63878,7.32246-5.80005,15.34712-6.29394,23.56563h-12.86755c.76532-11.09812,4.98783-21.26146,11.59205-29.41674ZM72.60331,129.94289h12.85126c.63467,7.76121,2.75509,15.33495,6.20207,22.27373-2.65104,1.73881-5.18171,3.69195-7.56944,5.85305-6.34911-7.8387-10.49403-17.53285-11.48388-28.12678ZM90.02395,164.29228c1.90007-1.7081,3.9042-3.2633,5.99809-4.65717.83267,1.21234,1.71021,2.3959,2.63471,3.54708,4.12458,5.1449,9.0593,9.56935,14.54922,13.1185-8.75729-2.01236-16.69008-6.22054-23.18202-12.00842ZM120.70401,170.84337c-6.86334-3.81025-12.70424-9.07553-17.1676-15.35321,5.37559-2.41236,11.15935-3.90005,17.1676-4.37768v19.73089ZM120.70401,142.49411c-7.57768.52038-14.85939,2.41015-21.57991,5.55723-2.70618-5.57563-4.45309-11.68797-5.04701-18.10844h26.62692v12.55121ZM120.70401,121.34887h-26.73097c.47756-6.85521,2.30001-13.40838,5.21844-19.36353,6.70011,3.12452,13.95733,5.00419,21.51252,5.52056v13.84298ZM120.70401,98.89139c-5.97155-.47763-11.72671-1.94899-17.07577-4.33672,4.46741-6.26551,10.28586-11.53895,17.07577-15.35335v19.69007ZM159.97595,85.70952c-1.9449,1.74905-4.00206,3.34092-6.15513,4.76136-1.01023-1.48367-2.09396-2.92445-3.24293-4.31638-4.04906-4.90623-8.83277-9.12465-14.11859-12.52672,8.89202,1.98164,16.94107,6.2204,23.51665,12.08175ZM129.29596,79.33194c6.72051,3.82035,12.4757,9.07152,16.90433,15.29814-5.30008,2.34498-10.992,3.78783-16.90433,4.26131v-19.55946ZM129.29596,107.50589c7.48172-.51028,14.67983-2.35937,21.32888-5.43284,2.8939,5.93067,4.69595,12.45325,5.17358,19.27581h-26.50246v-13.84298ZM129.29596,129.94289h26.3963c-.60614,6.34894-2.3592,12.42461-5.07762,17.98391-6.64497-3.07153-13.83696-4.9184-21.31868-5.43284v-12.55108ZM129.29596,151.11248c5.90825.46947,11.59606,1.9144,16.89209,4.25315-4.42251,6.22455-10.17773,11.47572-16.89209,15.29814v-19.55129ZM136.46138,176.37417c5.32457-3.42657,10.13076-7.67972,14.20016-12.63077,1.11638-1.35928,2.17147-2.76547,3.16537-4.21233,2.14902,1.42044,4.20621,3.01231,6.15112,4.76122-6.57765,5.86135-14.62473,10.09817-23.51665,12.08189ZM165.91278,158.06967c-2.43879-2.21022-5.0266-4.19988-7.74088-5.96526,3.41633-6.9082,5.51634-14.43697,6.147-22.16152h13.08184c-.99386,10.59393-5.13881,20.28808-11.48796,28.12678ZM164.4107,121.34887c-.48974-8.17976-2.63063-16.1636-6.2388-23.45342,2.71434-1.7633,5.30208-3.75311,7.74088-5.96332,6.6083,8.15527,10.82672,18.32069,11.59208,29.41674h-13.09415Z"/><path class="logo-gear" d="M222.17682,134.82829l23.41662-12.14607-3.19748-25.03112-25.74334-6.40991c-1.9816-5.36282-4.42368-10.50373-7.27356-15.37863l11.8203-23.62087-17.29971-18.37109-24.63473,9.96199c-4.69123-3.14666-9.67007-5.89485-14.88628-8.2023l-4.31793-26.03796-24.79403-4.69386-14.05755,22.51225c-5.77186.22145-11.41635.94546-16.89186,2.13073l-18.7873-18.51651-22.8179,10.77607,1.86267,26.51771c-4.44631,3.51122-8.57799,7.40256-12.35252,11.62022l-26.14687-3.94686-12.12606,22.12996,17.05413,20.31136c-1.52977,5.40507-2.60469,10.99906-3.18078,16.73784l-23.41608,12.14607,3.19748,25.03112,25.74277,6.40976c1.98164,5.36313,4.42376,10.50389,7.27376,15.37909l-11.82034,23.62102,17.29971,18.37124,24.63503-9.9623c4.69112,3.14666,9.6698,5.89469,14.88589,8.20199l4.31801,26.03827,24.79403,4.69401,14.05759-22.51256c5.77186-.2216,11.41631-.94562,16.89182-2.13073l18.7873,18.51635,22.8179-10.77591-1.86271-26.51771c4.44619-3.51122,8.57788-7.40241,12.35241-11.62006l26.14722,3.94686,12.1261-22.12996-17.05436-20.31151c1.52969-5.40507,2.60461-10.9989,3.18067-16.738ZM124.99975,199.17443c-40.90011,0-74.17462-33.27444-74.17462-74.17459S84.09964,50.82511,124.99975,50.82511s74.17466,33.2746,74.17466,74.17474-33.27452,74.17459-74.17466,74.17459Z"/></svg>
        </div>
        <span class="logo-text">functional(Websites)</span>
      </div>
    </a>
    <nav class="header-nav" id="site-nav" data-open="false">
      <div class="nav-links">
        <a href="https://functionalwebsites.com/">Home</a>
        <a href="https://functionalwebsites.com/pricing">Pricing</a>
        <a href="https://functionalwebsites.com/services">Services</a>
        <a href="https://functionalwebsites.com/hosting">Hosting</a>
        <a href="https://functionalwebsites.com/marketplace">Marketplace</a>
        <a href="https://docs.functionalwebsites.com/">Docs</a>
      </div>
      <div class="nav-actions desktop-builder-action">
        <a href="https://build.functionalwebsites.com/" class="btn btn-primary build-shortcut" aria-label="Open builder. Shortcut: B">Build</a>
        <button class="btn btn-secondary theme-toggle desktop-theme-toggle" type="button" aria-label="Toggle light and dark mode" title="Toggle theme">Dark</button>
        <button class="btn btn-secondary theme-toggle mobile-theme-toggle" type="button" aria-label="Toggle light and dark mode" title="Toggle theme">Dark</button>
      </div>
    </nav>
    <a href="https://build.functionalwebsites.com/" class="mobile-builder-link btn btn-primary build-shortcut" aria-label="Open builder. Shortcut: B">Build</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation">
      <span class="menu-toggle-bar"></span>
    </button>
  </div>
</header>`,
    footer: `<footer>
  <a class="footer-brand" href="https://functionalwebsites.com/" aria-label="Functional Websites home">
    <span>functional</span> <strong>(Websites)</strong>
  </a>
  <div class="footer-content">
    <div class="footer-section">
      <h4>Product</h4>
      <a href="https://build.functionalwebsites.com/">Builder</a>
      <a href="https://functionalwebsites.com/marketplace">Marketplace</a>
    </div>
    <div class="footer-section">
      <h4>Services</h4>
      <a href="https://functionalwebsites.com/services">Custom Sites</a>
      <a href="https://functionalwebsites.com/services#website-cloning">Website Cloning</a>
      <a href="https://functionalwebsites.com/hosting">Hosting</a>
      <a href="https://functionalwebsites.com/pricing">Pricing</a>
      <a href="mailto:cooper@functionalwebsites.com">Contact</a>
    </div>
    <div class="footer-section">
      <h4>Resources</h4>
      <a href="https://docs.functionalwebsites.com/getting-started/">Getting Started</a>
      <a href="https://functionalwebsites.com/pricing#faq">FAQ</a>
      <a href="https://docs.functionalwebsites.com/">Docs</a>
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

  function renderComponent(placeholder, name, markup) {
    let root = placeholder.shadowRoot;
    if (!root) {
      root = placeholder.attachShadow({ mode: 'open' });
    }

    root.innerHTML = `<style>${fallbackStyles}</style><link rel="stylesheet" href="/styles/shared.css"><div class="site-component" data-theme="${getSiteTheme()}">${markup}</div>`;

    if (name === 'header') {
      markActiveNav(root);
      bindHeaderInteractions(root);
    }
  }

  function markActiveNav(root) {
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    const hostname = window.location.hostname;
    const links = root.querySelectorAll('.nav-links a');

    links.forEach((link) => {
      const rawHref = link.getAttribute('href') || '';
      let hrefUrl;
      try {
        hrefUrl = new URL(rawHref, window.location.origin);
      } catch (e) {
        hrefUrl = new URL('/', window.location.origin);
      }
      const hrefPath = hrefUrl.pathname.replace(/\/$/, '') || '/';
      const isDocsLink = hrefUrl.hostname === 'docs.functionalwebsites.com' || hrefPath === '/docs';
      const isDocsPage = hostname === 'docs.functionalwebsites.com' || pathname.startsWith('/docs');
      const isDocsMatch = isDocsLink && isDocsPage;
      const isExactMatch = hrefUrl.hostname === hostname && hrefPath === pathname;
      link.toggleAttribute('aria-current', isDocsMatch || isExactMatch);
    });
  }

  function getSiteTheme() {
    try {
      return localStorage.getItem('fw_site_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function applySiteTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextTheme === 'dark' ? '#101211' : '#f5efe0');
    document.querySelectorAll('#header-placeholder, #footer-placeholder').forEach((placeholder) => {
      const root = placeholder.shadowRoot;
      root?.querySelector('.site-component')?.setAttribute('data-theme', nextTheme);
      root?.querySelectorAll('.theme-toggle').forEach((button) => {
        if (!button.querySelector('.toggle-ball')) {
          button.innerHTML = '<span class="toggle-icon toggle-icon-moon" aria-hidden="true">☾</span><span class="toggle-icon toggle-icon-sun" aria-hidden="true">☀</span><span class="toggle-ball" aria-hidden="true"></span>';
        }
        button.setAttribute('aria-pressed', nextTheme === 'dark' ? 'true' : 'false');
        button.dataset.themeState = nextTheme;
        button.classList.toggle('is-dark', nextTheme === 'dark');
        button.setAttribute('aria-label', nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        button.title = nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      });
    });
  }

  function setSiteTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    try {
      localStorage.setItem('fw_site_theme', nextTheme);
    } catch (e) {}
    applySiteTheme(nextTheme);
  }

  function bindHeaderInteractions(root) {
    const nav = root.getElementById('site-nav');
    const button = root.querySelector('.menu-toggle');
    const logoMark = root.querySelector('.logo-mark');
    const themeButtons = root.querySelectorAll('.theme-toggle');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const breakpointQueries = [
      window.matchMedia('(max-width: 768px)')
    ];

    const spinLogoGear = () => {
      if (!logoMark || reduceMotion.matches) {
        return;
      }

      logoMark.dataset.spin = 'false';
      void logoMark.offsetWidth;
      logoMark.dataset.spin = 'true';
    };
    const onMediaQueryChange = (query, handler) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handler);
      } else {
        query.addListener(handler);
      }
    };

    if (!nav || !button) {
      return;
    }

    let previousBodyStyles = null;
    let previousHtmlStyles = null;

    const setPageScrollLocked = (locked) => {
      if (locked) {
        if (previousBodyStyles) {
          return;
        }

        previousBodyStyles = {
          overflow: document.body.style.overflow,
          overscrollBehavior: document.body.style.overscrollBehavior,
        };
        previousHtmlStyles = {
          overflow: document.documentElement.style.overflow,
          overscrollBehavior: document.documentElement.style.overscrollBehavior,
        };

        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        return;
      }

      if (!previousBodyStyles) {
        return;
      }

      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      document.documentElement.style.overflow = previousHtmlStyles.overflow;
      document.documentElement.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior;
      previousBodyStyles = null;
      previousHtmlStyles = null;
    };

    const toggleMenu = (forceOpen) => {
      const nextState = typeof forceOpen === 'boolean' ? forceOpen : nav.dataset.open !== 'true';
      nav.dataset.open = nextState ? 'true' : 'false';
      button.setAttribute('aria-expanded', nextState ? 'true' : 'false');
      setPageScrollLocked(nextState && window.innerWidth <= 768);

      nav.style.removeProperty('--nav-scroll-offset');
    };

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu();
    });
    themeButtons.forEach((themeButton) => {
      themeButton.addEventListener('click', () => {
        setSiteTheme(getSiteTheme() === 'dark' ? 'light' : 'dark');
      });
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => toggleMenu(false));
    });
    logoMark?.addEventListener('animationend', () => {
      logoMark.dataset.spin = 'false';
    });

    requestAnimationFrame(spinLogoGear);
    applySiteTheme(getSiteTheme());

    breakpointQueries.forEach((query) => onMediaQueryChange(query, spinLogoGear));

    root.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !button.contains(event.target)) {
        toggleMenu(false);
      }
    });

    window.addEventListener('resize', () => {
      toggleMenu(false);
    });

    window.addEventListener('scroll', () => {
      if (window.innerWidth > 768 && nav.dataset.open === 'true') {
        toggleMenu(false);
      }
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        toggleMenu(false);
      }
    });
  }

  async function loadComponent(name, selector) {
    const placeholder = document.querySelector(selector);
    if (!placeholder) {
      return;
    }

    renderComponent(placeholder, name, fallbackMarkup[name]);
  }

  async function initComponents() {
    applySiteTheme(getSiteTheme());
    await Promise.all([
      loadComponent('header', '#header-placeholder'),
      loadComponent('footer', '#footer-placeholder')
    ]);
    bindGlobalBuilderShortcut();
  }

  function bindGlobalBuilderShortcut() {
    if (window.__fwBuilderShortcutBound) {
      return;
    }

    window.__fwBuilderShortcutBound = true;
    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      if (event.key.toLowerCase() !== 'b') {
        return;
      }

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
      if (isTyping || window.location.hostname === 'build.functionalwebsites.com') {
        return;
      }

      event.preventDefault();
      window.location.href = 'https://build.functionalwebsites.com/';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
  } else {
    initComponents();
  }
})();
