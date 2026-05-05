// Site builder settings. Loaded by site-builder/index.html in dependency order.
function loadSettingsForm() {
  const gh = LS.get('github') || {};
  const cf = LS.get('cloudflare') || {};
  document.getElementById('gh-token').value = gh.token || '';
  document.getElementById('gh-owner').value = gh.owner || '';
  document.getElementById('cf-token').value = cf.token || '';
  document.getElementById('cf-account-id').value = cf.accountId || '';
  setBuilderTheme(getBuilderTheme());
  updateIntegrationBadges();
}

function updateIntegrationBadges() {
  const gh = LS.get('github') || {};
  const cf = LS.get('cloudflare') || {};
  const ghBadge = document.getElementById('gh-status-badge');
  const cfBadge = document.getElementById('cf-status-badge');
  if (gh.verified) {
    ghBadge.className = 'status-badge connected'; ghBadge.textContent = '● Connected';
  } else {
    ghBadge.className = 'status-badge disconnected'; ghBadge.textContent = '● Disconnected';
  }
  if (cf.verified) {
    cfBadge.className = 'status-badge connected'; cfBadge.textContent = '● Connected';
  } else {
    cfBadge.className = 'status-badge disconnected'; cfBadge.textContent = '● Disconnected';
  }
}

async function saveGithubSettings() {
  const token = document.getElementById('gh-token').value.trim();
  const owner = document.getElementById('gh-owner').value.trim();
  if (!token) { toast('Enter a token', 'error'); return; }

  toast('Verifying GitHub token...', 'info');
  try {
    const res = await fetch('https://api.github.com/user', { headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' } });
    if (!res.ok) throw new Error('Invalid token');
    const user = await res.json();
    LS.set('github', { token, owner: owner || user.login, verified: true, login: user.login });
    updateIntegrationBadges();
    toast(`Connected as ${user.login}!`, 'success');
  } catch(e) {
    toast('GitHub verification failed: ' + e.message, 'error');
    LS.set('github', { token, owner, verified: false });
  }
}

function clearGithubSettings() {
  LS.del('github');
  document.getElementById('gh-token').value = '';
  document.getElementById('gh-owner').value = '';
  updateIntegrationBadges();
  toast('GitHub disconnected', 'info');
}

async function saveCloudflareSettings() {
  const token = document.getElementById('cf-token').value.trim();
  const accountId = document.getElementById('cf-account-id').value.trim();
  if (!token || !accountId) { toast('Enter both token and account ID', 'error'); return; }

  toast('Verifying Cloudflare credentials...', 'info');
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.errors?.[0]?.message || 'Invalid credentials');
    LS.set('cloudflare', { token, accountId, verified: true, accountName: data.result?.name });
    updateIntegrationBadges();
    toast('Cloudflare connected!', 'success');
  } catch(e) {
    toast('Cloudflare verification failed: ' + e.message, 'error');
    LS.set('cloudflare', { token, accountId, verified: false });
  }
}

function clearCloudflareSettings() {
  LS.del('cloudflare');
  document.getElementById('cf-token').value = '';
  document.getElementById('cf-account-id').value = '';
  updateIntegrationBadges();
  toast('Cloudflare disconnected', 'info');
}

function updateStorageInfo() {
  let total = 0;
  let count = 0;
  LS.keys().filter(k=>k.startsWith('proj_')).forEach(k => {
    const v = localStorage.getItem(LS.PREFIX+k);
    if (v) { total += v.length; count++; }
  });
  const kb = (total / 1024).toFixed(1);
  document.getElementById('storage-info').textContent = `${count} website${count!==1?'s':''} stored · ~${kb} KB used`;
}

function clearAllData() {
  if (!confirm('Clear ALL websites and settings? This cannot be undone.')) return;
  LS.keys().forEach(k => LS.del(k));
  loadProjects();
  toast('All data cleared', 'info');
}

async function loadDeploymentHistory(forceRefresh = false) {
  console.log('Loading deployment history, forceRefresh:', forceRefresh);
  const gh = LS.get('github') || {};
  const repoInfo = LS.get('lastDeployRepo') || {};
  if (!gh.verified) {
    document.getElementById('deployment-history').textContent = 'Connect GitHub first.';
    return;
  }
  const owner = repoInfo.owner || gh.owner || gh.login;
  const repo = repoInfo.repo || 'my-website';
  console.log('Loading history for repo:', owner + '/' + repo);
  try {
    // Look for versioned ZIPs in the repo instead of release assets
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/versioned-zips`, {
      headers: githubHeaders(gh.token)
    });
    if (!res.ok) {
      if (res.status === 404) {
        document.getElementById('deployment-history').innerHTML = '<div class="text-muted text-sm">No versioned deployments found.</div>';
        return;
      }
      throw new Error('Failed to load versioned ZIPs');
    }
    const files = await res.json();
    const zipFiles = files.filter(f => f.name.endsWith('.zip')).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    console.log('Found', zipFiles.length, 'ZIP files');
    if (!zipFiles.length) {
      document.getElementById('deployment-history').innerHTML = '<div class="text-muted text-sm">No versioned deployments found.</div>';
      return;
    }
    const timestamp = Date.now();
    const html = `<div class="text-muted text-sm" style="margin-bottom:8px;">Last updated: ${new Date(timestamp).toLocaleTimeString()} (v2.0)</div>` + zipFiles.slice(0,5).map(f => {
      const version = f.name.replace(/\.zip$/, '').replace(/^[^-]*-/, '');
      return `
        <div style="margin-bottom:8px;padding:8px;border:1px solid var(--border);border-radius:6px;">
          <div style="font-weight:600;">${f.name}</div>
          <div class="text-muted text-sm">${new Date(f.created_at).toLocaleString()}</div>
          <button class="btn btn-secondary btn-sm" onclick="restoreFromRepoZip('${owner}', '${repo}', '${f.path}', '${gh.token}', ${timestamp})">Restore</button>
        </div>
      `;
    }).join('');
    document.getElementById('deployment-history').innerHTML = html;
    console.log('Deployment history updated successfully');
  } catch(e) {
    console.error('Deployment history error:', e);
    document.getElementById('deployment-history').textContent = 'Error loading history: ' + e.message;
  }
}

async function restoreFromRepoZip(owner, repo, path, token, timestamp = 0) {
  console.log('Starting restore from repo ZIP:', { owner, repo, path, timestamp });
  toast('Restoring from versioned ZIP...', 'info');
  try {
    // Use GitHub API to get the file content
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    console.log('Fetching from API URL:', apiUrl);
    const res = await fetch(apiUrl, {
      headers: githubHeaders(token)
    });
    if (!res.ok) {
      console.error('API fetch failed:', res.status, res.statusText);
      throw new Error('Failed to fetch ZIP from repo');
    }
    const data = await res.json();
    console.log('Received data, content length:', data.content?.length);
    // Convert base64 to blob
    const byteCharacters = atob(data.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/zip' });
    const file = new File([blob], path.split('/').pop(), { type: 'application/zip' });
    console.log('Created file blob, size:', blob.size);
    await importProjectZip(file);
    console.log('Import completed successfully');
  } catch(e) {
    console.error('Restore failed:', e);
    toast('Restore failed: ' + e.message, 'error');
  }
}

// ============================================================
// DEPLOY MODAL
// ============================================================
