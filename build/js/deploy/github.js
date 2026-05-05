// Site builder github. Loaded by build/index.html in dependency order.
async function deployToGithub(asRelease = false) {
  const gh = LS.get('github') || {};
  const rawRepoInput = document.getElementById('deploy-gh-repo').value.trim();
  const branch = document.getElementById('deploy-gh-branch').value.trim() || 'main';
  const subfolder = document.getElementById('deploy-gh-folder').value.trim();
  const login = gh.login || await getGithubLogin(gh.token);
  const repoParts = parseGithubRepoInput(rawRepoInput, normalizeGithubOwner(gh.owner || login));
  let owner = repoParts.owner || login;
  const repo = repoParts.repo;
  if (!repo) {
    toast('Enter a GitHub repository name or owner/repo path', 'error');
    return;
  }
  if (!/^[a-z0-9_-]{1,100}$/.test(repo) || repo.includes('--') || repo.startsWith('-') || repo.endsWith('-')) {
    toast('Invalid repository name. Use only lowercase letters, numbers, hyphens, and underscores (1-100 chars, no leading/trailing/consecutive hyphens).', 'error');
    return;
  }
  if (!owner) {
    toast('Unable to determine GitHub owner. Set your GitHub username in Settings or enter owner/repo.', 'error');
    return;
  }

  const steps = document.getElementById('deploy-steps');

  const addStep = (title) => {
    const el = document.createElement('div');
    el.className = 'deploy-step';
    el.innerHTML = `<div class="deploy-step-title">${title}</div><div class="deploy-step-status"><span class="spinner"></span> In progress...</div>`;
    steps.appendChild(el);
    return el;
  };
  const setStepDone = (el, msg = 'Done', ok = true) => {
    el.querySelector('.deploy-step-status').innerHTML = `<span style="color:${ok?'var(--green)':'var(--red)'};">${ok?'✓':'✗'}</span> ${msg}`;
  };

  steps.innerHTML = '';

  // Step 1: Ensure repo exists
  const s1 = addStep('Checking / creating repository');
  let repoData = null;
  try {
    let res = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, gh.token);
    if (res.status === 404) {
      repoData = await createGithubRepo(owner, login, repo, gh.token);
      owner = repoData.owner?.login || owner;
      if (!gh.login && login) LS.set('github', Object.assign({}, gh, { login }));
      await sleep(2000); // Wait for GitHub to initialize
    } else if (!res.ok) {
      throw new Error(await githubErrorMessage(res, 'Failed to check repo'));
    } else {
      repoData = await res.json();
      owner = repoData.owner?.login || owner;
    }
    if (!repoData) {
      const repoRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, gh.token);
      if (!repoRes.ok) throw new Error(await githubErrorMessage(repoRes, 'Failed to load repo after creation'));
      repoData = await repoRes.json();
    }
    LS.set('lastDeployRepo', { owner, repo, branch });
    setStepDone(s1, `Repository ${owner}/${repo}`);
  } catch(e) { setStepDone(s1, e.message, false); return showDeployDone(false); }

  // Step 2: Get current tree (to check for existing files) or build ZIP
  const s2 = addStep(asRelease ? 'Building site ZIP' : 'Preparing files');
  let blobs = [];
  let zipBlob = null;
  try {
    // Build image map for deploy
    const imageMap = buildImageAssetMap(_projectData);
    const libImages = _projectData.images || [];

    if (asRelease) {
      // Generate ZIP for release
      const zip = new JSZip();
      const folder = zip.folder('site');

      for (const [i, page] of _projectData.pages.entries()) {
        const html = compilePageHTML(_projectData, i, false, imageMap);
        const filename = (page.slug || (i===0?'index':'page'+i)) + '.html';
        folder.file(filename, html);
        const path = subfolder ? `${subfolder}/${filename}` : filename;
        const content = btoa(unescape(encodeURIComponent(html)));
        blobs.push({ path, content, binary: false });
      }
      folder.file('style.css', _projectData.globalCSS || '');
      folder.file('script.js', _projectData.globalJS || '');
      blobs.push({ path: subfolder ? `${subfolder}/style.css` : 'style.css', content: btoa(unescape(encodeURIComponent(_projectData.globalCSS||''))), binary: false });
      blobs.push({ path: subfolder ? `${subfolder}/script.js` : 'script.js', content: btoa(unescape(encodeURIComponent(_projectData.globalJS||''))), binary: false });
      libImages.forEach(img => {
        const b64 = img.dataURL.split(',')[1];
        if (b64) {
          const fname = imageMap[imageRef(img.id)] || imageMap[img.dataURL] || sanitizeAssetFilename(img.name);
          folder.file(`images/${fname}`, b64, { base64: true });
          const imgPath = subfolder ? `${subfolder}/images/${fname}` : `images/${fname}`;
          blobs.push({ path: imgPath, content: b64, binary: true });
        }
      });

      zipBlob = await zip.generateAsync({ type: 'blob' });
      setStepDone(s2, `ZIP built and ${blobs.length} files ready`);
    } else {
      // Prepare blobs for upload
      for (const [i, page] of _projectData.pages.entries()) {
        const html = compilePageHTML(_projectData, i, false, imageMap);
        const filename = (page.slug || (i===0?'index':'page'+i)) + '.html';
        const path = subfolder ? `${subfolder}/${filename}` : filename;
        const content = btoa(unescape(encodeURIComponent(html)));
        blobs.push({ path, content, binary: false });
      }
      blobs.push({ path: subfolder ? `${subfolder}/style.css` : 'style.css', content: btoa(unescape(encodeURIComponent(_projectData.globalCSS||''))), binary: false });
      blobs.push({ path: subfolder ? `${subfolder}/script.js` : 'script.js', content: btoa(unescape(encodeURIComponent(_projectData.globalJS||''))), binary: false });
      libImages.forEach(img => {
        const b64 = img.dataURL.split(',')[1];
        if (b64) {
          const fname = imageMap[imageRef(img.id)] || imageMap[img.dataURL] || sanitizeAssetFilename(img.name);
          const imgPath = subfolder ? `${subfolder}/images/${fname}` : `images/${fname}`;
          blobs.push({ path: imgPath, content: b64, binary: true });
        }
      });
      setStepDone(s2, `${blobs.length} files ready`);
    }
  } catch(e) { setStepDone(s2, e.message, false); return showDeployDone(false); }

  // Step 3: Upload or create release
  const s3 = addStep(asRelease ? 'Creating GitHub release' : 'Uploading to GitHub');
  try {
    if (asRelease) {
      // Create release with ZIP
      const version = `v${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-4)}`;
      const releaseBody = JSON.stringify({
        tag_name: version,
        name: `${(_projectData.name || 'Site').replace(/[^\w\s-]/g, '').trim()} - ${new Date().toLocaleDateString()}`,
        body: 'Deployed from Functional Websites builder',
        draft: false,
        prerelease: false
      });
      let release;
      try {
        const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
          method: 'POST',
          headers: githubHeaders(gh.token, true),
          body: releaseBody
        });
        if (!releaseRes.ok) {
          const errMsg = await githubErrorMessage(releaseRes, 'Failed to create release');
          throw new Error(errMsg);
        }
        release = await releaseRes.json();
      } catch (e) {
        if (e.message.includes('Load failed') || e.message.includes('Network')) {
          throw new Error('Network error creating release. Check your connection and try again.');
        }
        throw e;
      }

      // Upload ZIP as repo file instead of release asset (avoids GitHub uploads CORS issues)
      const zipName = `${repo}-${version}.zip`;
      const path = `versioned-zips/${zipName}`;
      const uploadBranch = await ensureGithubBranch(owner, repo, branch, repoData?.default_branch, gh.token);
      const contentBase64 = await blobToBase64(zipBlob);
      const existingSha = await getGithubFileSha(owner, repo, path, uploadBranch, gh.token);
      const putBody = { message: `Upload versioned ZIP: ${zipName}`, content: contentBase64 };
      if (uploadBranch) putBody.branch = uploadBranch;
      if (existingSha) putBody.sha = existingSha;
      const uploadRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeGithubPath(path)}`, {
        method: 'PUT',
        headers: githubHeaders(gh.token, true),
        body: JSON.stringify(putBody)
      });
      if (!uploadRes.ok) {
        const errMsg = await githubErrorMessage(uploadRes, `Failed to upload ZIP to repo path ${path}`);
        throw new Error(errMsg);
      }

      // Upload website files to branch as well
      for (const blob of blobs) {
        const encodedPath = encodeGithubPath(blob.path);
        const refQuery = uploadBranch ? `?ref=${encodeURIComponent(uploadBranch)}` : '';
        const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}${refQuery}`, {
          headers: githubHeaders(gh.token)
        });

        let sha;
        if (fileRes.ok) {
          const existing = await fileRes.json();
          sha = existing.sha;
        } else if (fileRes.status !== 404) {
          throw new Error(await githubErrorMessage(fileRes, `Failed to check ${blob.path}`));
        }

        const putBody = { message: `Deploy: ${blob.path}`, content: blob.content };
        if (uploadBranch) putBody.branch = uploadBranch;
        if (sha) putBody.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
          method: 'PUT',
          headers: githubHeaders(gh.token, true),
          body: JSON.stringify(putBody)
        });
        if (!putRes.ok) {
          throw new Error(await githubErrorMessage(putRes, `Upload failed for ${blob.path}`));
        }
      }
      setStepDone(s3, `Release ${version} created, ZIP saved to ${path}, and website uploaded`);
    } else {
      // Original file upload logic
      const uploadBranch = await ensureGithubBranch(owner, repo, branch, repoData?.default_branch, gh.token);

      for (const blob of blobs) {
        const encodedPath = encodeGithubPath(blob.path);
        const refQuery = uploadBranch ? `?ref=${encodeURIComponent(uploadBranch)}` : '';
        const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}${refQuery}`, {
          headers: githubHeaders(gh.token)
        });

        let sha;
        if (fileRes.ok) {
          const existing = await fileRes.json();
          sha = existing.sha;
        } else if (fileRes.status !== 404) {
          throw new Error(await githubErrorMessage(fileRes, `Failed to check ${blob.path}`));
        }

        const putBody = { message: `Deploy: ${blob.path}`, content: blob.content };
        if (uploadBranch) putBody.branch = uploadBranch;
        if (sha) putBody.sha = sha;

        const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
          method: 'PUT',
          headers: githubHeaders(gh.token, true),
          body: JSON.stringify(putBody)
        });
        if (!putRes.ok) {
          throw new Error(await githubErrorMessage(putRes, `Upload failed for ${blob.path}`));
        }
      }
      setStepDone(s3, `Uploaded ${blobs.length} files`);
    }
  } catch(e) { setStepDone(s3, e.message, false); return showDeployDone(false); }

  // Done
  const url = asRelease ? `https://github.com/${owner}/${repo}/releases` : `https://${owner}.github.io/${repo}/${subfolder||''}`;
  const msg = asRelease ? `✓ Release created! Download the ZIP from the releases page to restore later.\n\nReleases: ${url}` : `✓ Deployed! Enable GitHub Pages in repo settings to go live.\n\nYour site will be at:\n${url}`;
  showDeployDone(true, msg, url);
}

async function ghFetch(url, token) {
  return fetch(url, { headers: githubHeaders(token) });
}

async function getGithubLogin(token) {
  const res = await ghFetch('https://api.github.com/user', token);
  if (!res.ok) return '';
  const user = await res.json();
  return user.login || '';
}

function normalizeGithubOwner(owner) {
  return String(owner || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '');
}

function parseGithubRepoInput(input, fallbackOwner = '') {
  let value = String(input || '').trim();
  let owner = fallbackOwner;
  let repo = value;

  const urlMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/i);
  if (urlMatch) {
    owner = urlMatch[1];
    repo = urlMatch[2];
  } else {
    const slashMatch = value.match(/^([^\/]+)\/([^\/]+)$/);
    if (slashMatch) {
      owner = slashMatch[1];
      repo = slashMatch[2];
    }
  }

  return { owner: normalizeGithubOwner(owner), repo: repo.trim() };
}

async function createGithubRepo(owner, login, repo, token) {
  const body = JSON.stringify({ name: repo, private: false, auto_init: true, description: _projectData.name });
  const shouldTryOrg = owner && login && owner.toLowerCase() !== login.toLowerCase();

  if (shouldTryOrg) {
    const orgRes = await fetch(`https://api.github.com/orgs/${owner}/repos`, {
      method: 'POST',
      headers: githubHeaders(token, true),
      body
    });
    if (orgRes.ok) return orgRes.json();
    if (orgRes.status === 422) {
      const existing = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
      if (existing.ok) return existing.json();
    }
    if (orgRes.status !== 404 && orgRes.status !== 403) {
      throw new Error(await githubErrorMessage(orgRes, 'Failed to create repo in organization'));
    }
  }

  const userRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: githubHeaders(token, true),
    body
  });
  if (userRes.ok) return userRes.json();
  if (userRes.status === 422) {
    const existing = await ghFetch(`https://api.github.com/repos/${login}/${repo}`, token);
    if (existing.ok) return existing.json();
  }
  throw new Error(await githubErrorMessage(userRes, 'Failed to create repo'));

}

function githubHeaders(token, json = false) {
  const headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json'
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function githubErrorMessage(res, fallback) {
  try {
    const err = await res.json();
    return err.message ? `${fallback}: ${err.message}` : fallback;
  } catch(e) {
    return fallback;
  }
}

async function getGithubFileSha(owner, repo, path, branch, token) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeGithubPath(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`;
    const res = await fetch(url, { headers: githubHeaders(token) });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(await githubErrorMessage(res, `Failed to check file ${path}`));
    }
    const data = await res.json();
    return data.sha;
  } catch (e) {
    if (e.message && e.message.includes('404')) return null;
    throw e;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function encodeGithubPath(path) {
  return String(path).split('/').map(encodeURIComponent).join('/');
}

async function getGithubBranchRef(owner, repo, branch, token) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    headers: githubHeaders(token)
  });
  if (res.ok) return res.json();
  if (res.status === 404) return null;
  throw new Error(await githubErrorMessage(res, `Failed to check branch ${branch}`));
}

async function ensureGithubBranch(owner, repo, branch, defaultBranch, token) {
  const existing = await getGithubBranchRef(owner, repo, branch, token);
  if (existing) return branch;

  const sourceBranch = defaultBranch || 'main';
  const source = await getGithubBranchRef(owner, repo, sourceBranch, token);
  if (!source) {
    // Empty repositories can be initialized by the contents API; omit branch so GitHub uses the default.
    return null;
  }

  const createRef = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    headers: githubHeaders(token, true),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: source.object.sha })
  });
  if (!createRef.ok && createRef.status !== 422) {
    throw new Error(await githubErrorMessage(createRef, `Failed to create branch ${branch}`));
  }
  return branch;
}

// ============================================================
// CLOUDFLARE DEPLOYMENT
// ============================================================
