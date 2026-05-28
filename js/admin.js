let token = '';
let owner = '';
let repo = '';
let allRepairs = [];
let allDevices = [];
let allReviews = [];
let editingRepairId = null;
let editingDeviceSerial = null;
let _mfaFactorId = null;

const viewLogin = document.getElementById('viewLogin');
const viewDashboard = document.getElementById('viewDashboard');
const viewRepairEditor = document.getElementById('viewRepairEditor');
const viewDeviceEditor = document.getElementById('viewDeviceEditor');

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginMfaStep = document.getElementById('loginMfaStep');
const loginMfaCode = document.getElementById('loginMfaCode');
const loginMfaBtn = document.getElementById('loginMfaBtn');
const loginMfaError = document.getElementById('loginMfaError');
const loginMfaEnroll = document.getElementById('loginMfaEnroll');
const loginMfaQr = document.getElementById('loginMfaQr');
const loginMfaSecret = document.getElementById('loginMfaSecret');
const loginMfaEnrollCode = document.getElementById('loginMfaEnrollCode');
const loginMfaEnrollBtn = document.getElementById('loginMfaEnrollBtn');
const loginMfaEnrollError = document.getElementById('loginMfaEnrollError');

const repairsBody = document.getElementById('repairsBody');
const repairsTable = document.getElementById('repairsTable');
const repairsEmpty = document.getElementById('repairsEmpty');
const repairsLoading = document.getElementById('repairsLoading');
const newRepairBtn = document.getElementById('newRepairBtn');
const logoutBtn = document.getElementById('logoutBtn');

const devicesBody = document.getElementById('devicesBody');
const devicesTable = document.getElementById('devicesTable');
const devicesEmpty = document.getElementById('devicesEmpty');
const devicesLoading = document.getElementById('devicesLoading');
const newDeviceBtn = document.getElementById('newDeviceBtn');

const pendingReviews = document.getElementById('pendingReviews');
const approvedReviews = document.getElementById('approvedReviews');
const reviewsLoading = document.getElementById('reviewsLoading');
const reviewsEmpty = document.getElementById('reviewsEmpty');

const repairEditorBackBtn = document.getElementById('repairEditorBackBtn');
const repairEditorForm = document.getElementById('repairEditorForm');
const repairEditorTitle = document.getElementById('repairEditorTitle');
const edSaveBtn = document.getElementById('edSaveBtn');
const edMsg = document.getElementById('edMsg');
const edTitle = document.getElementById('edTitle');
const edSlug = document.getElementById('edSlug');
const edDeviceType = document.getElementById('edDeviceType');
const edDeviceModel = document.getElementById('edDeviceModel');
const edIssue = document.getElementById('edIssue');
const edStatus = document.getElementById('edStatus');
const edDate = document.getElementById('edDate');
const edImage = document.getElementById('edImage');
const edExcerpt = document.getElementById('edExcerpt');
const edProblem = document.getElementById('edProblem');
const edProcess = document.getElementById('edProcess');
const edParts = document.getElementById('edParts');
const edReviewAuthor = document.getElementById('edReviewAuthor');
const edReviewRating = document.getElementById('edReviewRating');
const edReviewText = document.getElementById('edReviewText');

const deviceEditorBackBtn = document.getElementById('deviceEditorBackBtn');
const deviceEditorForm = document.getElementById('deviceEditorForm');
const deviceEditorTitle = document.getElementById('deviceEditorTitle');
const edDeviceSaveBtn = document.getElementById('edDeviceSaveBtn');
const edDeviceMsg = document.getElementById('edDeviceMsg');
const edDeviceCustomer = document.getElementById('edDeviceCustomer');
const edDeviceSerial = document.getElementById('edDeviceSerial');
const edDeviceType2 = document.getElementById('edDeviceType2');
const edDeviceBrand = document.getElementById('edDeviceBrand');
const edDeviceModel2 = document.getElementById('edDeviceModel2');
const edDeviceYear = document.getElementById('edDeviceYear');
const edDeviceSpecs = document.getElementById('edDeviceSpecs');

const settingsForm = document.getElementById('settingsForm');
const settingsMsg = document.getElementById('settingsMsg');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');

const githubForm = document.getElementById('githubForm');
const githubToken = document.getElementById('githubToken');
const githubOwner = document.getElementById('githubOwner');
const githubRepo = document.getElementById('githubRepo');
const githubSaveBtn = document.getElementById('githubSaveBtn');
const githubMsg = document.getElementById('githubMsg');
const githubStatus = document.getElementById('githubStatus');

const passwordForm = document.getElementById('passwordForm');
const pwMsg = document.getElementById('pwMsg');
const pwSaveBtn = document.getElementById('pwSaveBtn');

const mfaStatus = document.getElementById('mfaStatus');
const mfaEnroll = document.getElementById('mfaEnroll');
const mfaQr = document.getElementById('mfaQr');
const mfaSecret = document.getElementById('mfaSecret');
const mfaVerifyCode = document.getElementById('mfaVerifyCode');
const mfaVerifyBtn = document.getElementById('mfaVerifyBtn');
const mfaEnrollMsg = document.getElementById('mfaEnrollMsg');
const mfaActive = document.getElementById('mfaActive');
const mfaDisableBtn = document.getElementById('mfaDisableBtn');
const mfaDisableMsg = document.getElementById('mfaDisableMsg');

async function ghFetch(path, method = 'GET', body = null) {
  const opts = { method, headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`, opts);
  if (res.status === 404) return null;
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `API error: ${res.status}`); }
  return res.json();
}

async function getFileSha(path) { const data = await ghFetch(`contents/${path}`); return data ? data.sha : null; }

async function readFileContent(path) {
  const data = await ghFetch(`contents/${path}`);
  if (!data) return null;
  return { content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))), sha: data.sha };
}

async function writeFile(path, content, sha = null) {
  const body = { message: `Update ${path}`, content: btoa(unescape(encodeURIComponent(content))) };
  if (sha) body.sha = sha;
  return ghFetch(`contents/${path}`, 'PUT', body);
}

async function deleteFile(path, sha) { return ghFetch(`contents/${path}`, 'DELETE', { message: `Delete ${path}`, sha }); }

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { loginError.textContent = 'Please enter your email and password.'; return; }
  loginError.textContent = 'Signing in...';
  try {
    const { data, error } = await sbAuth.signInWithPassword({ email, password });
    if (error) throw error;
    const verified = (data?.factors || []).filter(f => f.type === 'totp' && f.status === 'verified');
    if (verified.length) {
      _mfaFactorId = verified[0].id;
      loginForm.style.display = 'none';
      loginMfaStep.style.display = '';
      loginMfaCode.focus();
      return;
    }
    showLoginMfaEnroll();
  } catch (err) { loginError.textContent = 'Login failed: ' + err.message; }
});

loginMfaBtn.addEventListener('click', async () => {
  const code = loginMfaCode.value.trim();
  if (!code || code.length !== 6) { loginMfaError.textContent = 'Enter a 6-digit code.'; return; }
  loginMfaError.textContent = 'Verifying...';
  loginMfaBtn.disabled = true;
  try {
    const { data: chal, error: chalErr } = await sbMfaChallenge(_mfaFactorId);
    if (chalErr) throw chalErr;
    const { error: verErr } = await sbMfaVerify(_mfaFactorId, chal.id, code);
    if (verErr) throw verErr;
    showDashboard();
  } catch (err) {
    loginMfaError.textContent = 'MFA failed: ' + err.message;
    loginMfaBtn.disabled = false;
  }
});

let _loginEnrollFactorId = null;

async function showLoginMfaEnroll() {
  loginForm.style.display = 'none';
  loginMfaEnroll.style.display = '';
  loginMfaEnrollError.textContent = '';
  try {
    const { data, error } = await sbMfaEnroll();
    if (error) throw error;
    _loginEnrollFactorId = data.id;
    loginMfaSecret.textContent = data.totp.secret;
    loginMfaQr.innerHTML = '';
    new QRCode(loginMfaQr, { text: data.totp.qr_code, width: 180, height: 180, colorDark: '#1E3D63', colorLight: '#FFFFFF', correctLevel: QRCode.CorrectLevel.H });
  } catch (err) { loginMfaEnrollError.textContent = 'Error starting MFA enrollment: ' + err.message; }
}

loginMfaEnrollBtn.addEventListener('click', async () => {
  const code = loginMfaEnrollCode.value.trim();
  if (!code || code.length !== 6) { loginMfaEnrollError.textContent = 'Enter a 6-digit code.'; return; }
  loginMfaEnrollError.textContent = 'Verifying...';
  loginMfaEnrollBtn.disabled = true;
  try {
    const { data: chal, error: chalErr } = await sbMfaChallenge(_loginEnrollFactorId);
    if (chalErr) throw chalErr;
    const { error: verErr } = await sbMfaVerify(_loginEnrollFactorId, chal.id, code);
    if (verErr) throw verErr;
    showDashboard();
  } catch (err) {
    loginMfaEnrollError.textContent = 'MFA enrollment failed: ' + err.message;
    loginMfaEnrollBtn.disabled = false;
  }
});

function showView(view) {
  [viewLogin, viewDashboard, viewRepairEditor, viewDeviceEditor].forEach(v => v.style.display = 'none');
  view.style.display = '';
  if (view === viewLogin) {
    loginForm.style.display = '';
    loginMfaStep.style.display = 'none';
    loginMfaCode.value = '';
    loginMfaError.textContent = '';
    loginMfaBtn.disabled = false;
    loginError.textContent = '';
    loginMfaEnroll.style.display = 'none';
    loginMfaEnrollCode.value = '';
    loginMfaEnrollError.textContent = '';
    loginMfaEnrollBtn.disabled = false;
  }
}

function showDashboard() {
  showView(viewDashboard);
  if (token && owner && repo) {
    switchTab('repairs');
  } else {
    switchTab('github');
    githubStatus.innerHTML = '⚠️ GitHub credentials not configured. Enter them below to enable saving repairs and settings.';
  }
}

function showRepairEditor(repair = null) {
  showView(viewRepairEditor);
  editingRepairId = repair ? repair.id : null;
  repairEditorTitle.textContent = repair ? 'Edit Repair' : 'New Repair';
  edSaveBtn.textContent = repair ? 'Update Repair' : 'Publish Repair';
  edMsg.textContent = '';
  edMsg.className = 'form-msg';
  if (repair) {
    edTitle.value = repair.title; edSlug.value = repair.id;
    edDeviceType.value = repair.deviceType; edDeviceModel.value = repair.deviceModel;
    edIssue.value = repair.issue; edStatus.value = repair.status || 'Completed';
    edDate.value = repair.date; edImage.value = repair.image || '';
    edExcerpt.value = repair.excerpt; edProblem.value = repair.problem || '';
    edProcess.value = repair.process || ''; edParts.value = repair.partsUsed || '';
    edReviewAuthor.value = repair.reviewAuthor || '';
    edReviewRating.value = repair.reviewRating || '';
    edReviewText.value = repair.reviewText || '';
  } else {
    repairEditorForm.reset();
    edSlug.value = '';
    edDate.value = new Date().toISOString().slice(0, 10);
    edStatus.value = 'Completed';
  }
}

function showDeviceEditor(device = null) {
  showView(viewDeviceEditor);
  editingDeviceSerial = device ? device.serial : null;
  deviceEditorTitle.textContent = device ? 'Edit Device' : 'Register Device';
  edDeviceSaveBtn.textContent = device ? 'Update Device' : 'Register Device';
  edDeviceMsg.textContent = '';
  edDeviceMsg.className = 'form-msg';
  if (device) {
    edDeviceCustomer.value = device.customer; edDeviceSerial.value = device.serial;
    edDeviceType2.value = device.device_type; edDeviceBrand.value = device.brand;
    edDeviceModel2.value = device.model; edDeviceYear.value = device.year || '';
    edDeviceSpecs.value = device.specs || '';
  } else {
    deviceEditorForm.reset();
  }
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  const content = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  if (content) content.style.display = '';
  if (tabId === 'repairs') loadRepairsDashboard();
  if (tabId === 'devices') loadDevicesDashboard();
  if (tabId === 'reviews') loadReviewsDashboard();
  if (tabId === 'settings') loadSettings();
  if (tabId === 'github') loadGitHubStatus();
  if (tabId === 'account') loadMfaStatus();
}

edTitle.addEventListener('input', () => {
  if (editingRepairId) return;
  edSlug.value = edTitle.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
});

async function loadRepairsDashboard() {
  repairsLoading.style.display = '';
  repairsTable.style.display = 'none';
  repairsEmpty.style.display = 'none';
  try { const data = await readFileContent('repairs/repairs.json'); allRepairs = data ? JSON.parse(data.content) : []; } catch { allRepairs = []; }
  renderRepairsDashboard();
}

function renderRepairsDashboard() {
  repairsLoading.style.display = 'none';
  if (!allRepairs.length) { repairsEmpty.style.display = ''; repairsTable.style.display = 'none'; return; }
  repairsTable.style.display = ''; repairsEmpty.style.display = 'none';
  repairsBody.innerHTML = allRepairs.map(r => {
    const statusClass = r.status ? r.status.toLowerCase().replace(/\s+/g, '-') : 'completed';
    return `<tr data-id="${r.id}">
      <td class="cell-title">${escHtml(r.title)}</td>
      <td>${escHtml(r.deviceModel)}</td>
      <td>${r.date}</td>
      <td><span class="status-badge ${statusClass}">${r.status}</span></td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm act-edit">Edit</button>
        <button class="btn btn-danger btn-sm act-delete">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

repairsBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const row = btn.closest('tr[data-id]');
  if (!row) return;
  const id = row.dataset.id;
  if (btn.classList.contains('act-edit')) editRepair(id);
  else if (btn.classList.contains('act-delete')) deleteRepair(id);
});

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

newRepairBtn.addEventListener('click', () => showRepairEditor(null));
repairEditorBackBtn.addEventListener('click', () => { showView(viewDashboard); switchTab('repairs'); });
document.getElementById('edCancelBtn').addEventListener('click', () => { showView(viewDashboard); switchTab('repairs'); });

async function editRepair(id) {
  const meta = allRepairs.find(r => r.id === id);
  if (!meta) { alert('Repair not found.'); return; }
  try {
    const data = await readFileContent(`repairs/${id}.json`);
    if (data) { const full = JSON.parse(data.content); showRepairEditor(full); }
    else { showRepairEditor(meta); }
  } catch { showRepairEditor(meta); }
}

async function deleteRepair(id) {
  if (!confirm(`Delete repair "${id}"?`)) return;
  try {
    const sha = await getFileSha(`repairs/${id}.json`);
    if (sha) await deleteFile(`repairs/${id}.json`, sha);
    const updated = allRepairs.filter(r => r.id !== id);
    const content = JSON.stringify(updated, null, 2);
    const data = await readFileContent('repairs/repairs.json');
    await writeFile('repairs/repairs.json', content, data ? data.sha : null);
    allRepairs = updated; renderRepairsDashboard();
  } catch (err) { alert('Delete failed: ' + err.message); }
}

logoutBtn.addEventListener('click', async () => {
  await sbAuth.signOut().catch(() => {});
  showView(viewLogin);
});

repairEditorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  edMsg.textContent = 'Saving...'; edMsg.className = 'form-msg';
  edSaveBtn.disabled = true;

  const title = edTitle.value.trim(), slug = edSlug.value.trim();
  const deviceType = edDeviceType.value.trim(), deviceModel = edDeviceModel.value.trim();
  const issue = edIssue.value.trim(), status = edStatus.value;
  const date = edDate.value, image = edImage.value.trim() || 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&q=80';
  const excerpt = edExcerpt.value.trim(), problem = edProblem.value.trim();
  const process = edProcess.value.trim(), partsUsed = edParts.value.trim();
  const reviewAuthor = edReviewAuthor.value.trim(), reviewRating = edReviewRating.value;
  const reviewText = edReviewText.value.trim();

  if (!slug.match(/^[a-z0-9-]+$/)) {
    edMsg.textContent = 'Slug must contain only lowercase letters, numbers, and hyphens.';
    edMsg.className = 'form-msg error'; edSaveBtn.disabled = false; return;
  }

  const repair = { id: slug, title, deviceType, deviceModel, issue, status, date, image, excerpt, problem, process };
  if (partsUsed) repair.partsUsed = partsUsed;
  if (reviewAuthor) { repair.reviewAuthor = reviewAuthor; repair.reviewRating = reviewRating; repair.reviewText = reviewText; }

  try {
    const repairsData = await readFileContent('repairs/repairs.json');
    let repairs = repairsData ? JSON.parse(repairsData.content) : [];
    const idx = repairs.findIndex(r => r.id === slug);
    if (editingRepairId && editingRepairId !== slug) {
      const oldSha = await getFileSha(`repairs/${editingRepairId}.json`);
      if (oldSha) await deleteFile(`repairs/${editingRepairId}.json`, oldSha);
    }
    const repairContent = JSON.stringify(repair, null, 2);
    const repairSha = editingRepairId && editingRepairId === slug ? await getFileSha(`repairs/${slug}.json`) : null;
    await writeFile(`repairs/${slug}.json`, repairContent, repairSha);
    const meta = { id: slug, title, deviceType, deviceModel, issue, status, date, image, excerpt };
    if (idx >= 0) repairs[idx] = meta; else repairs.push(meta);
    await writeFile('repairs/repairs.json', JSON.stringify(repairs, null, 2), repairsData ? repairsData.sha : null);
    edMsg.textContent = 'Repair saved! Redirecting...'; edMsg.className = 'form-msg success';
    setTimeout(() => { showView(viewDashboard); switchTab('repairs'); }, 800);
  } catch (err) {
    edMsg.textContent = 'Error: ' + err.message; edMsg.className = 'form-msg error';
    edSaveBtn.disabled = false;
  }
});

const edImageFile = document.getElementById('edImageFile');
const edImageUploadBtn = document.getElementById('edImageUploadBtn');
edImageUploadBtn.addEventListener('click', () => edImageFile.click());
edImageFile.addEventListener('change', async () => {
  const file = edImageFile.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); edImageFile.value = ''; return; }
  const ext = file.name.split('.').pop();
  const filename = `images/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  edImageUploadBtn.textContent = 'Uploading...';
  edImageUploadBtn.disabled = true;
  try {
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
    const sha = await getFileSha(filename);
    await ghFetch(`contents/${filename}`, 'PUT', { message: `Upload ${filename}`, content: base64, sha: sha || undefined });
    edImage.value = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filename}`;
    edImageUploadBtn.textContent = 'Upload';
    edImageUploadBtn.disabled = false;
    edImageFile.value = '';
  } catch (err) { alert('Upload failed: ' + err.message); edImageUploadBtn.textContent = 'Upload'; edImageUploadBtn.disabled = false; }
});

async function loadDevicesDashboard() {
  devicesLoading.style.display = '';
  devicesTable.style.display = 'none';
  devicesEmpty.style.display = 'none';
  try {
    const { data, error } = await sbSelect('devices', { order: 'date_added', dir: 'desc' });
    if (error) throw error;
    allDevices = data || [];
  } catch { allDevices = []; }
  renderDevicesDashboard();
}

function renderDevicesDashboard() {
  devicesLoading.style.display = 'none';
  if (!allDevices.length) { devicesEmpty.style.display = ''; devicesTable.style.display = 'none'; return; }
  devicesTable.style.display = ''; devicesEmpty.style.display = 'none';
  devicesBody.innerHTML = allDevices.map(d => `
    <tr data-serial="${escHtml(d.serial)}">
      <td><code style="font-family:var(--ff-mono);font-size:0.8rem;color:var(--clr-primary)">${escHtml(d.serial)}</code></td>
      <td>${escHtml(d.customer)}</td>
      <td class="cell-title">${escHtml(d.brand)} ${escHtml(d.model)}</td>
      <td>${escHtml(d.device_type)}</td>
      <td>${d.date_added || '-'}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm act-edit">Edit</button>
        <button class="btn btn-danger btn-sm act-delete">Delete</button>
      </td>
    </tr>
  `).join('');
}

devicesBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const row = btn.closest('tr[data-serial]');
  if (!row) return;
  const serial = row.dataset.serial;
  if (btn.classList.contains('act-edit')) editDevice(serial);
  else if (btn.classList.contains('act-delete')) deleteDevice(serial);
});

newDeviceBtn.addEventListener('click', () => showDeviceEditor(null));
deviceEditorBackBtn.addEventListener('click', () => { showView(viewDashboard); switchTab('devices'); });
document.getElementById('edDeviceCancelBtn').addEventListener('click', () => { showView(viewDashboard); switchTab('devices'); });

async function editDevice(serial) {
  const device = allDevices.find(d => d.serial === serial);
  if (device) showDeviceEditor(device);
  else alert('Device not found.');
}

async function deleteDevice(serial) {
  if (!confirm(`Delete device with serial "${serial}"?`)) return;
  try {
    const { error } = await sbDelete('devices', 'serial', serial);
    if (error) throw error;
    allDevices = allDevices.filter(d => d.serial !== serial);
    renderDevicesDashboard();
  } catch (err) { alert('Delete failed: ' + err.message); }
}

deviceEditorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  edDeviceMsg.textContent = 'Saving...'; edDeviceMsg.className = 'form-msg';
  edDeviceSaveBtn.disabled = true;

  const customer = edDeviceCustomer.value.trim();
  const serial = edDeviceSerial.value.trim();
  const deviceType = edDeviceType2.value.trim();
  const brand = edDeviceBrand.value.trim();
  const model = edDeviceModel2.value.trim();
  const year = edDeviceYear.value.trim();
  const specs = edDeviceSpecs.value.trim();

  if (!serial) {
    edDeviceMsg.textContent = 'Serial number is required.'; edDeviceMsg.className = 'form-msg error';
    edDeviceSaveBtn.disabled = false; return;
  }

  if (!editingDeviceSerial && allDevices.find(d => d.serial === serial)) {
    edDeviceMsg.textContent = 'A device with this serial number already exists.'; edDeviceMsg.className = 'form-msg error';
    edDeviceSaveBtn.disabled = false; return;
  }

  const device = {
    serial, customer, device_type: deviceType, brand, model, year, specs,
    date_added: editingDeviceSerial
      ? (allDevices.find(d => d.serial === editingDeviceSerial)?.date_added || new Date().toISOString().slice(0, 10))
      : new Date().toISOString().slice(0, 10)
  };

  try {
    const { error } = await sbUpsert('devices', device, 'serial');
    if (error) throw error;
    edDeviceMsg.textContent = 'Device saved! Redirecting...'; edDeviceMsg.className = 'form-msg success';
    setTimeout(() => { showView(viewDashboard); switchTab('devices'); }, 800);
  } catch (err) {
    edDeviceMsg.textContent = 'Error: ' + err.message; edDeviceMsg.className = 'form-msg error';
    edDeviceSaveBtn.disabled = false;
  }
});

async function loadReviewsDashboard() {
  reviewsLoading.style.display = '';
  pendingReviews.innerHTML = '';
  approvedReviews.innerHTML = '';
  reviewsEmpty.style.display = 'none';
  try {
    const { data, error } = await sbSelect('reviews', { order: 'date', dir: 'desc' });
    if (error) throw error;
    allReviews = data || [];
  } catch { allReviews = []; }
  renderReviewsDashboard();
}

function renderReviewsDashboard() {
  reviewsLoading.style.display = 'none';
  const pending = allReviews.filter(r => !r.approved);
  const approved = allReviews.filter(r => r.approved);

  if (!allReviews.length) { reviewsEmpty.style.display = ''; pendingReviews.innerHTML = ''; approvedReviews.innerHTML = ''; return; }

  if (!pending.length) {
    pendingReviews.innerHTML = '<p style="color:var(--clr-text-light);font-size:0.85rem">No pending reviews.</p>';
  } else {
    pendingReviews.innerHTML = pending.map(r => {
      const stars = '&#9733;'.repeat(r.rating) + '&#9734;'.repeat(5 - r.rating);
      return `<div class="pending-card">
        <div class="review-stars">${stars}</div>
        <p class="review-text">"${escHtml(r.text)}"</p>
        <p class="review-meta">— ${escHtml(r.name)} · <span class="serial">${escHtml(r.serial)}</span> · ${r.date}</p>
        <div class="actions">
          <button class="btn btn-primary btn-sm act-approve" data-id="${r.id}">Approve</button>
          <button class="btn btn-danger btn-sm act-reject" data-id="${r.id}">Reject</button>
        </div>
      </div>`;
    }).join('');
  }

  if (!approved.length) {
    approvedReviews.innerHTML = '<p style="color:var(--clr-text-light);font-size:0.85rem">No approved reviews.</p>';
  } else {
    approvedReviews.innerHTML = approved.map(r => {
      const stars = '&#9733;'.repeat(r.rating) + '&#9734;'.repeat(5 - r.rating);
      return `<div class="approved-card">
        <div class="review-stars">${stars}</div>
        <p class="review-text">"${escHtml(r.text)}"</p>
        <p class="review-meta">— ${escHtml(r.name)} · ${r.date}</p>
        <div class="actions">
          <button class="btn btn-secondary btn-sm act-reject" data-id="${r.id}">Remove</button>
        </div>
      </div>`;
    }).join('');
  }
}

document.addEventListener('click', (e) => {
  const actApprove = e.target.closest('.act-approve');
  const actReject = e.target.closest('.act-reject');
  if (actApprove) approveReview(actApprove.dataset.id);
  else if (actReject) rejectReview(actReject.dataset.id);
});

async function approveReview(id) {
  try {
    const { error } = await sbUpdate('reviews', 'id', id, { approved: true });
    if (error) throw error;
    const review = allReviews.find(r => r.id === id);
    if (review) review.approved = true;
    renderReviewsDashboard();
  } catch (err) { alert('Failed to approve: ' + err.message); }
}

async function rejectReview(id) {
  if (!confirm('Remove this review?')) return;
  try {
    const { error } = await sbDelete('reviews', 'id', id);
    if (error) throw error;
    allReviews = allReviews.filter(r => r.id !== id);
    renderReviewsDashboard();
  } catch (err) { alert('Failed to remove: ' + err.message); }
}

const SETTINGS_PATH = 'site-config.json';
const SETTINGS_FIELDS = [
  'siteName', 'defaultLanguage', 'metaDescription',
  'hero-badge', 'hero-title', 'hero-subtitle', 'hero-statRepairs', 'hero-statHappy', 'hero-statYears',
  'services-title', 'services-subtitle',
  'repairs-title', 'repairs-subtitle',
  'reviews-title', 'reviews-subtitle',
  'about-title', 'about-paragraph1', 'about-paragraph2', 'about-detail1', 'about-detail2', 'about-detail3', 'about-image',
  'contact-title', 'contact-subtitle', 'contact-address', 'contact-email', 'contact-hours',
  'footer-tagline'
];

async function loadSettings() {
  settingsMsg.textContent = 'Loading...'; settingsMsg.className = 'form-msg';
  try {
    const data = await readFileContent(SETTINGS_PATH);
    if (!data) throw new Error('site-config.json not found');
    const cfg = JSON.parse(data.content);
    SETTINGS_FIELDS.forEach(key => {
      const el = document.getElementById(`cfg-${key}`);
      if (el) { const val = key.split('-').reduce((o, p) => (o ? o[p] : undefined), cfg); el.value = val || ''; }
    });
    settingsMsg.textContent = ''; settingsMsg.className = 'form-msg';
  } catch (err) { settingsMsg.textContent = 'Error loading settings: ' + err.message; settingsMsg.className = 'form-msg error'; }
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  settingsMsg.textContent = 'Saving...'; settingsMsg.className = 'form-msg';
  settingsSaveBtn.disabled = true;
  const cfg = {};
  SETTINGS_FIELDS.forEach(key => {
    const el = document.getElementById(`cfg-${key}`);
    if (!el) return;
    const parts = key.split('-'); let current = cfg;
    for (let i = 0; i < parts.length - 1; i++) { if (!current[parts[i]]) current[parts[i]] = {}; current = current[parts[i]]; }
    current[parts[parts.length - 1]] = el.value;
  });
  cfg.siteName = cfg.siteName || "Sosa's 64bit Fix";
  try {
    const data = await readFileContent(SETTINGS_PATH);
    await writeFile(SETTINGS_PATH, JSON.stringify(cfg, null, 2), data ? data.sha : null);
    settingsMsg.textContent = 'Settings saved!'; settingsMsg.className = 'form-msg success';
  } catch (err) { settingsMsg.textContent = 'Error: ' + err.message; settingsMsg.className = 'form-msg error'; }
  settingsSaveBtn.disabled = false;
});

async function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  if (/^[\d\s%+\-.,]+$/.test(text.trim())) return text;
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    return text;
  } catch { return text; }
}

async function translateAllToSpanish() {
  const translateBtn = document.getElementById('translateBtn');
  const originalText = translateBtn.innerHTML;
  translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
  translateBtn.disabled = true;
  settingsMsg.textContent = 'Translating all content to Spanish...';
  settingsMsg.className = 'form-msg';

  try {
    const langData = await readFileContent('lang/en.json');
    const enLang = langData ? JSON.parse(langData.content) : {};
    const esData = await readFileContent('lang/es.json');
    let esLang = esData ? JSON.parse(esData.content) : {};

    const keysToTranslate = Object.keys(enLang);
    const skipKeys = ['contact.email'];
    let translated = 0;

    for (const key of keysToTranslate) {
      const enVal = enLang[key];
      if (!enVal || skipKeys.includes(key)) {
        if (!esLang[key] && enVal) esLang[key] = enVal;
        continue;
      }
      if (enVal === esLang[key]) continue;
      const translatedVal = await translateText(enVal);
      await new Promise(r => setTimeout(r, 200));
      esLang[key] = translatedVal || enVal;
      translated++;
      if (translated % 10 === 0) {
        settingsMsg.textContent = `Translating... ${translated}/${keysToTranslate.length} strings`;
      }
    }

    const esWriteData = await readFileContent('lang/es.json');
    await writeFile('lang/es.json', JSON.stringify(esLang, null, 2), esWriteData ? esWriteData.sha : null);

    settingsMsg.textContent = `Spanish translation updated! (${translated} strings translated)`;
    settingsMsg.className = 'form-msg success';
  } catch (err) {
    settingsMsg.textContent = 'Translation error: ' + err.message;
    settingsMsg.className = 'form-msg error';
  }

  translateBtn.innerHTML = originalText;
  translateBtn.disabled = false;
}

document.getElementById('translateBtn').addEventListener('click', translateAllToSpanish);

/* ===== GITHUB SETTINGS ===== */
function loadGitHubStatus() {
  if (token && owner && repo) {
    githubStatus.innerHTML = '&#10003; GitHub is configured (<code>' + escHtml(owner) + '/' + escHtml(repo) + '</code>)';
    githubToken.value = token;
    githubOwner.value = owner;
    githubRepo.value = repo;
  } else {
    githubStatus.innerHTML = '&#9888; GitHub credentials not configured. Enter them below to enable saving repairs and settings.';
  }
}

githubForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  githubMsg.textContent = 'Saving...'; githubMsg.className = 'form-msg';
  githubSaveBtn.disabled = true;
  const newToken = githubToken.value.trim();
  const newOwner = githubOwner.value.trim();
  const newRepo = githubRepo.value.trim();
  if (!newToken || !newOwner || !newRepo) {
    githubMsg.textContent = 'All fields are required.'; githubMsg.className = 'form-msg error';
    githubSaveBtn.disabled = false; return;
  }
  try {
    const { error } = await sbAuth.updateUser({ data: { github_token: newToken, github_owner: newOwner, github_repo: newRepo } });
    if (error) throw error;
    token = newToken; owner = newOwner; repo = newRepo;
    githubMsg.textContent = 'GitHub settings saved!'; githubMsg.className = 'form-msg success';
    githubStatus.innerHTML = '&#10003; GitHub is configured (<code>' + escHtml(owner) + '/' + escHtml(repo) + '</code>)';
  } catch (err) {
    githubMsg.textContent = 'Error: ' + err.message; githubMsg.className = 'form-msg error';
  }
  githubSaveBtn.disabled = false;
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  pwMsg.textContent = ''; pwMsg.className = 'form-msg';
  pwSaveBtn.disabled = true;
  const newPw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  if (newPw.length < 6) { pwMsg.textContent = 'Password must be at least 6 characters.'; pwMsg.className = 'form-msg error'; pwSaveBtn.disabled = false; return; }
  if (newPw !== confirm) { pwMsg.textContent = 'Passwords do not match.'; pwMsg.className = 'form-msg error'; pwSaveBtn.disabled = false; return; }
  try {
    const { error } = await sbAuth.updateUser({ password: newPw });
    if (error) throw error;
    pwMsg.textContent = 'Password updated!'; pwMsg.className = 'form-msg success';
    passwordForm.reset();
  } catch (err) { pwMsg.textContent = 'Error: ' + err.message; pwMsg.className = 'form-msg error'; }
  pwSaveBtn.disabled = false;
});

async function loadMfaStatus() {
  mfaEnroll.style.display = 'none';
  mfaActive.style.display = 'none';
  mfaStatus.textContent = 'Checking MFA status...';
  try {
    const { data: factors, error } = await sbMfaListFactors();
    if (error) throw error;
    const verified = (factors || []).filter(f => f.type === 'totp' && f.status === 'verified');
    if (verified.length) {
      _mfaFactorId = verified[0].id;
      mfaActive.style.display = '';
      mfaStatus.textContent = '';
    } else {
      mfaEnroll.style.display = '';
      mfaStatus.textContent = 'MFA is not enabled. Set it up below.';
    }
  } catch (err) { mfaStatus.textContent = 'Error: ' + err.message; }
}

document.getElementById('mfaStartEnrollBtn').addEventListener('click', async () => {
  mfaEnrollMsg.textContent = '';
  document.getElementById('mfaStartEnrollBtn').style.display = 'none';
  document.getElementById('mfaEnrollStep').style.display = '';
  try {
    const { data, error } = await sbMfaEnroll();
    if (error) throw error;
    window._mfaEnrollFactorId = data.id;
    mfaSecret.textContent = data.totp.secret;
    mfaQr.innerHTML = '';
    new QRCode(mfaQr, { text: data.totp.qr_code, width: 180, height: 180 });
  } catch (err) { mfaEnrollMsg.textContent = 'Error: ' + err.message; mfaEnrollMsg.className = 'form-msg error'; }
});

mfaVerifyBtn.addEventListener('click', async () => {
  const code = mfaVerifyCode.value.trim();
  if (!code || code.length !== 6) { mfaEnrollMsg.textContent = 'Enter a 6-digit code.'; mfaEnrollMsg.className = 'form-msg error'; return; }
  mfaEnrollMsg.textContent = 'Verifying...';
  mfaEnrollMsg.className = 'form-msg';
  mfaVerifyBtn.disabled = true;
  try {
    const { data: chal, error: chalErr } = await sbMfaChallenge(window._mfaEnrollFactorId);
    if (chalErr) throw chalErr;
    const { error: verErr } = await sbMfaVerify(window._mfaEnrollFactorId, chal.id, code);
    if (verErr) throw verErr;
    mfaEnrollMsg.textContent = 'MFA enabled!';
    mfaEnrollMsg.className = 'form-msg success';
    document.getElementById('mfaEnrollStep').style.display = 'none';
    mfaEnroll.style.display = 'none';
    mfaActive.style.display = '';
    mfaStatus.textContent = '';
    _mfaFactorId = window._mfaEnrollFactorId;
  } catch (err) {
    mfaEnrollMsg.textContent = 'Error: ' + err.message;
    mfaEnrollMsg.className = 'form-msg error';
    mfaVerifyBtn.disabled = false;
  }
});

mfaDisableBtn.addEventListener('click', async () => {
  if (!confirm('Disable MFA? Your account will only require email and password to sign in.')) return;
  mfaDisableMsg.textContent = 'Disabling...';
  mfaDisableMsg.className = 'form-msg';
  mfaDisableBtn.disabled = true;
  try {
    const { error } = await sbMfaUnenroll(_mfaFactorId);
    if (error) throw error;
    mfaDisableMsg.textContent = 'MFA disabled.';
    mfaDisableMsg.className = 'form-msg success';
    mfaActive.style.display = 'none';
    mfaEnroll.style.display = '';
    mfaStatus.textContent = 'MFA is not enabled. Set it up below.';
    _mfaFactorId = null;
  } catch (err) {
    mfaDisableMsg.textContent = 'Error: ' + err.message;
    mfaDisableMsg.className = 'form-msg error';
    mfaDisableBtn.disabled = false;
  }
});

document.getElementById('sessionLogoutBtn').addEventListener('click', async () => {
  if (!confirm('Sign out of all active sessions?')) return;
  try {
    const { error } = await sbAuth.signOut();
    if (error) throw error;
    document.getElementById('sessionMsg').textContent = 'Signed out globally. Redirecting...';
    document.getElementById('sessionMsg').className = 'form-msg success';
    setTimeout(() => showView(viewLogin), 1000);
  } catch (err) {
    document.getElementById('sessionMsg').textContent = 'Error: ' + err.message;
    document.getElementById('sessionMsg').className = 'form-msg error';
  }
});

sbAuth.getSession().then(async ({ data: { session } }) => {
  if (session?.user?.user_metadata?.github_token) {
    const meta = session.user.user_metadata;
    if (meta.github_token && meta.github_owner && meta.github_repo) {
      token = meta.github_token;
      owner = meta.github_owner;
      repo = meta.github_repo;
    }
  }
  if (session) showDashboard();
});
