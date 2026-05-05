// Site builder cloudflare. Loaded by site-builder/index.html in dependency order.
async function deployToCloudflare() {
  const cf = LS.get('cloudflare') || {};
  const projectName = document.getElementById('deploy-cf-project').value.trim();
  const steps = document.getElementById('deploy-steps');
  steps.innerHTML = '';

  const addStep = (title) => {
    const el = document.createElement('div');
    el.className = 'deploy-step';
    el.innerHTML = `<div class="deploy-step-title">${title}</div><div class="deploy-step-status"><span class="spinner"></span> In progress...</div>`;
    steps.appendChild(el);
    return el;
  };
  const setStepDone = (el, msg, ok = true) => {
    el.querySelector('.deploy-step-status').innerHTML = `<span style="color:${ok?'var(--green)':'var(--red)'};">${ok?'✓':'✗'}</span> ${msg}`;
  };

  // Step 1: Ensure project exists
  const s1 = addStep('Checking / creating Cloudflare Pages project');
  try {
    const checkRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/pages/projects/${projectName}`, {
      headers: { 'Authorization': 'Bearer '+cf.token }
    });
    const checkData = await checkRes.json();
    if (!checkData.success) {
      // Create project
      const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/pages/projects`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer '+cf.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, production_branch: 'main' })
      });
      const createData = await createRes.json();
      if (!createData.success) throw new Error(createData.errors?.[0]?.message || 'Create failed');
    }
    setStepDone(s1, `Project: ${projectName}`);
  } catch(e) { setStepDone(s1, e.message, false); return showDeployDone(false); }

  // Step 2: Build files
  const s2 = addStep('Building site files');
  let files = {};
  try {
    // Build image map for deploy
    const imageMap = buildImageAssetMap(_projectData);
    const libImages = _projectData.images || [];

    for (const [i, page] of _projectData.pages.entries()) {
      const html = compilePageHTML(_projectData, i, false, imageMap);
      const filename = '/' + (page.slug || (i===0?'index':'page'+i)) + '.html';
      files[filename] = { content: html, type: 'text/html' };
    }
    files['/style.css'] = { content: _projectData.globalCSS || '', type: 'text/css' };
    files['/script.js'] = { content: _projectData.globalJS || '', type: 'text/javascript' };
    // Images as blobs
    for (const img of libImages) {
      const b64 = img.dataURL.split(',')[1];
      if (b64) {
        const byteChars = atob(b64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const fname = imageMap[imageRef(img.id)] || imageMap[img.dataURL] || sanitizeAssetFilename(img.name);
        files[`/images/${fname}`] = { content: new Blob([byteArr], { type: img.type }), type: img.type, binary: true };
      }
    }
    setStepDone(s2, `${Object.keys(files).length} files`);
  } catch(e) { setStepDone(s2, e.message, false); return showDeployDone(false); }

  // Step 3: Create deployment using Direct Upload
  const s3 = addStep('Uploading to Cloudflare Pages');
  try {
    // Use the Direct Upload v2 API
    // First, create a deployment
    const deployRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer '+cf.token }
    });
    const deployData = await deployRes.json();
    if (!deployData.success && deployData.errors?.[0]?.code !== 8000014) {
      // Try direct upload via form
      const formData = new FormData();
      const manifest = {};

      for (const [path, fileObj] of Object.entries(files)) {
        const fileBlob = fileObj.binary ? fileObj.content : new Blob([fileObj.content], { type: fileObj.type });
        const hashInput = fileObj.binary ? path : fileObj.content;
        const hash = await sha1(typeof hashInput === 'string' ? hashInput : path);
        manifest[path] = hash;
        formData.append(hash, fileBlob, hash);
      }
      formData.append('manifest', JSON.stringify(manifest));

      const uploadRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/pages/projects/${projectName}/deployments`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer '+cf.token },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.errors?.[0]?.message || 'Upload failed');
    }
    setStepDone(s3, 'Upload complete');
  } catch(e) { setStepDone(s3, e.message, false); return showDeployDone(false); }

  const url = `https://${projectName}.pages.dev`;
  showDeployDone(true, `✓ Deployed to Cloudflare Pages!`, url);
}

async function sha1(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function showDeployDone(success, message = '', url = '') {
  const steps = document.getElementById('deploy-steps');
  const result = document.createElement('div');
  result.style.cssText = 'margin-top:16px;padding:16px;background:var(--bg3);border-radius:8px;';
  result.innerHTML = success
    ? `<div style="color:var(--green);font-weight:600;margin-bottom:8px;">✓ Deployment successful!</div>
       <div style="font-size:13px;color:var(--text2);white-space:pre-wrap;">${message}</div>
       ${url ? `<a href="${url}" target="_blank" style="display:inline-block;margin-top:12px;color:var(--accent);"><span style="color:var(--green);">⌁</span> Visit Site →</a>` : ''}`
    : `<div style="color:var(--red);font-weight:600;">✗ Deployment failed. Check errors above.</div>`;
  steps.appendChild(result);

  document.getElementById('deploy-actions').innerHTML = '<button class="btn btn-secondary" onclick="closeModal(\'modal-deploy\')">Close</button>';
  document.getElementById('deploy-actions').classList.remove('hidden');
}

// ============================================================
// MODAL HELPERS
// ============================================================
