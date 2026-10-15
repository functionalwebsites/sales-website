// Run against a local static server. Uses an isolated browser profile; never deploys.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/smoke-builder.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.BUILDER_URL || "http://127.0.0.1:8873/build/");
  await page.waitForFunction(
    () => typeof ProjectStorage !== "undefined" && ProjectStorage.db,
  );
  // Seed a legacy localStorage project and prove migration after reload.
  await page.evaluate(() => {
    const d = createBlankProjectData("QA <Studio>");
    d.meta = {
      siteUrl: "https://example.com/studio/",
      description: "Default description",
      themeColor: "#234839",
      themeColorDark: "#102020",
    };
    localStorage.setItem("fw_proj_legacy", JSON.stringify(d));
    localStorage.setItem(
      "fw_projects",
      JSON.stringify([{ id: "legacy", name: d.name, created: 1, modified: 1 }]),
    );
  });
  await page.reload();
  await page.waitForFunction(
    () =>
      typeof ProjectStorage !== "undefined" &&
      ProjectStorage.cache.has("proj_legacy"),
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("fw_proj_legacy")),
    null,
  );
  assert.equal(
    await page.evaluate(() => STATE.projects.some((p) => p.id === "legacy")),
    true,
  );
  await page.evaluate(() => {
    openEditor("legacy");
    openSiteSettings();
  });
  await page
    .getByLabel("Search description", { exact: true })
    .fill("Updated description");
  await page.waitForTimeout(650);
  await page.evaluate(() => undo());
  assert.equal(
    await page.evaluate(() => _projectData.meta.description),
    "Default description",
    "typing undo restores original text",
  );
  await page.evaluate(() => redo());
  assert.equal(
    await page.evaluate(() => _projectData.meta.description),
    "Updated description",
  );
  await page.evaluate(async () => {
    openSiteSettings();
    await generateSocialCard("site");
    _projectData.meta.ogImageAlt = "QA Studio brand card";
    await openSocialCrop("site");
  });
  await page.locator('#social-crop-modal [data-axis="zoom"]').fill("1.2");
  await page.locator("#social-crop-modal [data-save]").click();
  assert.deepEqual(
    await page.evaluate(() => [
      _projectData.meta.ogImageWidth,
      _projectData.meta.ogImageHeight,
    ]),
    [1200, 630],
  );
  await page.evaluate(async () => {
    for (const kind of DESIGN_RECIPES) insertDesignRecipe(kind);
    const gallery = _projectData.pages[0].blocks.find(
      (b) => b.type === "gallery",
    );
    gallery.id = "1gallery"; // IDs beginning with digits must work in the lightbox.
    gallery.props.items = [
      { title: "Test image", src: _projectData.meta.ogImage },
    ];
    _projectData.pages.push({
      id: uid(),
      name: "Hidden",
      slug: "hidden",
      blocks: [mkBlock("heading", { text: "Hidden", level: "h1" })],
      meta: { noindex: true },
    });
    _projectData.favicons = await buildFaviconSetFromLogo(
      resolveImageAsset(_projectData.meta.ogImage),
      "QA Studio",
      {},
    );
    await saveProject(true);
    _projectData.meta.description = "Second saved description";
    await saveProject(true);
  });
  assert.ok(
    await page.evaluate(
      async () => (await ProjectStorage.revisions("legacy")).length > 0,
    ),
  );
  await page.evaluate(() => openProjectRevisions());
  await page.locator('#project-revisions [data-revision="0"]').click();
  assert.equal(
    await page.evaluate(() => _projectData.meta.description),
    "Updated description",
  );
  await page.evaluate(() => undo());
  assert.equal(
    await page.evaluate(() => _projectData.meta.description),
    "Second saved description",
  );
  await page.evaluate(async () => {
    await saveProject(true);
    openSiteSettings();
  });
  await page.screenshot({ path: "/tmp/builder-sharing-desktop.png" });
  // Linked copies retain unique IDs and update deliberately across pages.
  assert.equal(
    await page.evaluate(() => {
      const block = _projectData.pages[0].blocks.find((b) => b.type === "faq");
      linkBlockAcrossPages(block.id);
      block.props.title = "Shared FAQ";
      syncLinkedSection(block.id);
      const linked = _projectData.pages[1].blocks.find(
        (b) => b.linkedSection === block.linkedSection,
      );
      return linked.id !== block.id && linked.props.title === "Shared FAQ";
    }),
    true,
  );
  // A failed project write must not be hidden by a successful index write.
  assert.equal(
    await page.evaluate(async () => {
      const original = ProjectStorage.transaction.bind(ProjectStorage);
      let fail = true;
      ProjectStorage.transaction = (stores, action) => {
        if (fail && stores.includes("revisions")) {
          fail = false;
          return Promise.reject(new Error("Injected quota failure"));
        }
        return original(stores, action);
      };
      const saved = await saveProject(true);
      ProjectStorage.transaction = original;
      const retry = await saveProject(true);
      return saved === false && retry === true;
    }),
    true,
  );
  // Both export renderers must produce correct, escaped metadata and public asset URLs.
  const exports = await page.evaluate(() => {
    const map = buildImageAssetMap(_projectData);
    return [
      compilePageHTML(_projectData, 0, false, map),
      compileDesignerPageHTML(_projectData, 0, map),
    ];
  });
  for (const html of exports) {
    assert.match(html, /<title>Home — QA &lt;Studio&gt;<\/title>/);
    assert.match(
      html,
      /property="og:image" content="https:\/\/example.com\/studio\/images\/social-/,
    );
    assert.match(html, /property="og:image:width" content="1200"/);
    assert.match(
      html,
      /rel="canonical" href="https:\/\/example.com\/studio\/"/,
    );
    assert.match(
      html,
      /name="theme-color" media="\(prefers-color-scheme: dark\)" content="#102020"/,
    );
    assert.match(html, /href="favicon-32x32.png"/);
  }
  const discovery = await page.evaluate(() => siteDiscoveryFiles(_projectData));
  assert.ok(!discovery["sitemap.xml"].includes("hidden.html"));
  assert.ok(
    discovery["robots.txt"].includes(
      "Sitemap: https://example.com/studio/sitemap.xml",
    ),
  );
  // Render an exported page and exercise keyboard tabs, accordion, and lightbox.
  const preview = await context.newPage();
  preview.on("pageerror", (e) => errors.push(e.message));
  await preview.setContent(
    await page.evaluate(() => compilePageHTML(_projectData, 0, false)),
    { waitUntil: "load" },
  );
  await preview.getByRole("tab").first().focus();
  await preview.keyboard.press("ArrowRight");
  assert.equal(
    await preview.getByRole("tab").nth(1).getAttribute("aria-selected"),
    "true",
  );
  await preview.locator(".fw-faq summary").first().click();
  assert.equal(
    await preview.locator(".fw-faq details").first().getAttribute("open"),
    "",
  );
  await preview.getByRole("button", { name: "Enlarge Test image" }).click();
  assert.equal(await preview.locator("dialog").evaluate((el) => el.open), true);
  await preview.keyboard.press("Escape");
  await preview.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await preview.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "export has no horizontal overflow on mobile",
  );
  await preview.screenshot({ path: "/tmp/builder-export-mobile.png" });
  // Nested health checks provide the exact affected element.
  assert.equal(
    await page.evaluate(() => {
      const b = _projectData.pages[0].blocks[0].props.columns[0].find(
        (b) => b.type === "button",
      );
      b.props.href = "missing.html";
      return getDesignHealthIssues(_projectData).some(
        (i) => i.blockId === b.id && i.message.includes("missing.html"),
      );
    }),
    true,
  );
  // Real ZIP generation and re-import retain new metadata and assets.
  const downloadPromise = page.waitForEvent("download");
  await page.evaluate(() => downloadProjectZip(STATE.currentProjectId));
  const download = await downloadPromise;
  const zipBytes = await readFile(await download.path());
  const result = await page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)]);
    const zip = await JSZip.loadAsync(blob);
    const base = Object.keys(zip.files)
      .find((p) => p.endsWith(BUILDER_MANIFEST_FILE))
      .replace(BUILDER_MANIFEST_FILE, "");
    const manifest = JSON.parse(
      await zip.file(base + "site.webmanifest").async("string"),
    );
    const hasSitemap = !!zip.file(base + "sitemap.xml");
    await importProjectZip(blob);
    await ProjectStorage.flush();
    return {
      theme: manifest.theme_color,
      hasSitemap,
      width: _projectData.meta.ogImageWidth,
      image: resolveImageAsset(_projectData.meta.ogImage).startsWith(
        "data:image/",
      ),
      blocks: _projectData.pages[0].blocks.map((b) => b.type),
    };
  }, Array.from(zipBytes));
  assert.equal(result.theme, "#234839");
  assert.equal(result.hasSitemap, true);
  assert.equal(result.width, 1200);
  assert.equal(result.image, true);
  assert.ok(result.blocks.includes("tabs"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => openSiteSettings());
  await page.screenshot({ path: "/tmp/builder-settings-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "builder has no mobile overflow",
  );
  await page.reload();
  await page.waitForFunction(
    () =>
      typeof _projectData !== "undefined" &&
      _projectData?.meta?.ogImageWidth === 1200,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS migration, typing undo/redo, social card/crop, revisions, escaped metadata, public asset URLs, both exporters, sitemap/noindex, manifest theme, interactive blocks, mobile layouts, nested health checks, ZIP round trip, and reload persistence",
  );
} finally {
  await browser.close();
}
