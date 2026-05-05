// Site builder ui. Loaded by build/index.html in dependency order.
function openDeployModal() {
  if (!checkProThenDeploy()) return;
  if (!STATE.currentProjectId) return;

  const gh = LS.get('github') || {};
  const cf = LS.get('cloudflare') || {};

  document.getElementById('deploy-github-config').classList.add('hidden');
  document.getElementById('deploy-cloudflare-config').classList.add('hidden');
  document.getElementById('deploy-progress').classList.add('hidden');
  document.getElementById('deploy-actions').classList.remove('hidden');
  document.getElementById('btn-deploy-go').disabled = true;

  // Pre-fill repo name from project
  const safeName = (_projectData.name||'my-site').toLowerCase().replace(/[^a-z0-9]/g,'-');
  document.getElementById('deploy-gh-repo').value = safeName;
  document.getElementById('deploy-cf-project').value = safeName;

  // Show connect warnings if not set up
  document.getElementById('btn-deploy-github').innerHTML = `<span style="font-size:24px;color:var(--green);line-height:1;">⌘</span><span>GitHub Pages</span>${!gh.verified?'<span style="font-size:10px;color:#f87171;">Not connected</span>':'<span style="font-size:10px;color:#4ade80;">Connected</span>'}`;
  document.getElementById('btn-deploy-cloudflare').innerHTML = `<span style="font-size:24px;color:var(--green);line-height:1;">☁︎</span><span>Cloudflare Pages</span>${!cf.verified?'<span style="font-size:10px;color:#f87171;">Not connected</span>':'<span style="font-size:10px;color:#4ade80;">Connected</span>'}`;

  STATE.deployTarget = null;
  openModal('modal-deploy');
}

function selectDeployTarget(t) {
  STATE.deployTarget = t;
  document.getElementById('btn-deploy-github').style.borderColor = t==='github' ? 'var(--accent)' : '';
  document.getElementById('btn-deploy-cloudflare').style.borderColor = t==='cloudflare' ? 'var(--accent)' : '';
  document.getElementById('deploy-github-config').classList.toggle('hidden', t !== 'github');
  document.getElementById('deploy-cloudflare-config').classList.toggle('hidden', t !== 'cloudflare');
  document.getElementById('btn-deploy-go').disabled = false;

  const gh = LS.get('github') || {};
  const cf = LS.get('cloudflare') || {};
  if (t === 'github' && !gh.verified) {
    toast('GitHub not connected. Go to Settings first.', 'error');
    document.getElementById('btn-deploy-go').disabled = true;
  }
  if (t === 'cloudflare' && !cf.verified) {
    toast('Cloudflare not connected. Go to Settings first.', 'error');
    document.getElementById('btn-deploy-go').disabled = true;
  }
}

async function startDeploy() {
  if (!checkProThenDeploy()) return;
  if (!STATE.deployTarget) return;
  if (!confirmPreflight('deploying')) return;
  const asRelease = STATE.deployTarget === 'github' && document.getElementById('deploy-as-release').checked;
  document.getElementById('deploy-actions').classList.add('hidden');
  document.getElementById('deploy-progress').classList.remove('hidden');

  if (STATE.deployTarget === 'github') {
    await deployToGithub(asRelease);
  } else {
    await deployToCloudflare();
  }
}

// ============================================================
// GITHUB DEPLOYMENT
// ============================================================
