let allRepairs = [];
let allReviews = [];
let siteConfig = {};
let langData = {};
let currentLang = 'en';

const repairsGrid = document.getElementById('repairsGrid');
const reviewsGrid = document.getElementById('reviewsGrid');
const repairModal = document.getElementById('repairModal');
const repairModalContent = document.getElementById('repairModalContent');
const reviewModal = document.getElementById('reviewModal');
const navToggle = document.getElementById('navToggle');
const navList = document.querySelector('.nav-list');
const navLinks = document.querySelectorAll('.nav-link:not(.lang-btn)');
const langBtns = document.querySelectorAll('.lang-btn');

function formatDate(dateStr) {
  const locale = currentLang === 'es' ? 'es-ES' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function getNested(obj, path) {
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
}

async function loadLang(lang) {
  try {
    const res = await fetch(`lang/${lang}.json`, { cache: 'no-cache' });
    langData = await res.json();
  } catch {
    langData = {};
  }
  currentLang = lang;
  document.documentElement.lang = lang === 'es' ? 'es' : 'en';
  document.documentElement.dataset.lang = lang;
  applyLang();
  localStorage.setItem('siteLang', lang);
  langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  if (siteConfig.siteName) {
    document.title = `${siteConfig.siteName} — ${lang === 'es' ? 'Reparación de Computadoras' : 'Computer Repair'}`;
  }
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = langData[key];
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = langData[key];
    if (val !== undefined) el.placeholder = val;
  });
  if (reviewsGrid && !reviewsGrid.children.length) {
    const emptyMsg = langData['reviews.empty'] || 'No reviews yet. Be the first to leave one!';
    reviewsGrid.innerHTML = `<p style="text-align:center;color:var(--clr-text-light);grid-column:1/-1">${emptyMsg}</p>`;
  }
}

async function loadConfig() {
  try {
    const res = await fetch('site-config.json', { cache: 'no-cache' });
    siteConfig = await res.json();
    applyConfig(siteConfig);
  } catch {}
  const preferred = localStorage.getItem('siteLang') || navigator.language.split('-')[0] || 'en';
  const defaultLang = siteConfig.defaultLanguage || 'en';
  await loadLang(preferred === 'es' ? 'es' : defaultLang);
}

function applyConfig(cfg) {
  document.querySelectorAll('[data-cfg]').forEach(el => {
    const key = el.dataset.cfg;
    const val = getNested(cfg, key);
    if (val) el.innerHTML = val;
  });
  document.querySelectorAll('[data-cfg-src]').forEach(el => {
    const key = el.dataset.cfgSrc;
    const val = getNested(cfg, key);
    if (val) el.src = val;
  });
  const titleEl = document.querySelector('[data-cfg="titleTag"]');
  if (titleEl && cfg.siteName) {
    document.title = `${cfg.siteName} — Computer Repair`;
  }
  const metaDesc = document.querySelector('meta[data-cfg="metaDescription"]');
  if (metaDesc && cfg.metaDescription) {
    metaDesc.setAttribute('content', cfg.metaDescription);
  }
}

function renderRepairs(repairs) {
  if (!repairsGrid) return;
  repairsGrid.innerHTML = repairs.map(r => `
    <article class="repair-card" data-id="${r.id}">
      <img src="${r.image}" alt="${r.title}" class="repair-card-image" loading="lazy">
      <div class="repair-card-body">
        <div class="repair-card-tags">
          <span class="repair-card-tag type">${r.deviceType}</span>
          <span class="repair-card-tag">${r.status}</span>
        </div>
        <div class="repair-card-date">${formatDate(r.date)}</div>
        <h3 class="repair-card-title">${r.title}</h3>
        <p class="repair-card-excerpt">${r.excerpt}</p>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.repair-card').forEach(card => {
    card.addEventListener('click', () => openRepair(card.dataset.id));
  });
}

async function openRepair(id) {
  try {
    const res = await fetch(`repairs/${id}.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const repair = await res.json();
    showRepairModal(repair);
  } catch {}
}

function showRepairModal(repair) {
  const stars = repair.reviewRating ? '★'.repeat(parseInt(repair.reviewRating)) + '☆'.repeat(5 - parseInt(repair.reviewRating)) : '';
  const partsList = repair.partsUsed ? repair.partsUsed.split('\n').filter(p => p.trim()).map(p => `<li>${p.trim()}</li>`).join('') : '';

  repairModalContent.innerHTML = `
    <img src="${repair.image}" alt="${repair.title}" class="modal-image" loading="lazy">
    <div class="modal-body">
      <div class="repair-modal-tags">
        <span class="repair-card-tag type">${repair.deviceType}</span>
        <span class="repair-card-tag">${repair.status}</span>
      </div>
      <div class="repair-modal-date">${formatDate(repair.date)} &middot; ${repair.deviceModel}</div>
      <h2 class="repair-modal-title">${repair.title}</h2>
      <div class="repair-modal-section">
        <h4>${langData['repair.modalIssue'] || 'Issue'}</h4>
        <p>${repair.issue}</p>
      </div>
      <div class="repair-modal-section">
        <h4>${langData['repair.modalProblem'] || 'Problem'}</h4>
        <p>${repair.problem}</p>
      </div>
      <div class="repair-modal-section">
        <h4>${langData['repair.modalProcess'] || 'Diagnosis & Process'}</h4>
        <p>${repair.process}</p>
      </div>
      ${partsList ? `
        <div class="repair-modal-section">
          <h4>${langData['repair.modalParts'] || 'Parts Used'}</h4>
          <ul>${partsList}</ul>
        </div>
      ` : ''}
      ${repair.reviewAuthor ? `
        <div class="repair-review-box">
          <h4>${langData['repair.modalReview'] || 'Customer Review'}</h4>
          ${stars ? `<div class="review-stars">${stars}</div>` : ''}
          <p class="review-text">"${repair.reviewText}"</p>
          <p class="review-author">— ${repair.reviewAuthor}</p>
        </div>
      ` : ''}
      <button class="modal-close-bottom" id="repairModalClose">${langData['repair.modalClose'] || 'Close'}</button>
    </div>
  `;

  repairModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  document.getElementById('repairModalClose').addEventListener('click', closeRepairModal);
  repairModal.addEventListener('click', (e) => {
    if (e.target === repairModal) closeRepairModal();
  });
  document.addEventListener('keydown', handleRepairEsc);
}

function closeRepairModal() {
  repairModal.classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleRepairEsc);
}

function handleRepairEsc(e) {
  if (e.key === 'Escape') closeRepairModal();
}

function renderReviews(reviews) {
  if (!reviewsGrid) return;
  if (!reviews.length) {
    const emptyMsg = langData['reviews.empty'] || 'No reviews yet. Be the first to leave one!';
    reviewsGrid.innerHTML = `<p style="text-align:center;color:var(--clr-text-light);grid-column:1/-1">${emptyMsg}</p>`;
    return;
  }
  reviewsGrid.innerHTML = reviews.map(r => {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    return `
      <div class="review-card">
        <div class="review-card-stars">${stars}</div>
        <p class="review-card-text">"${r.text}"</p>
        <p class="review-card-author">${r.name}</p>
      </div>
    `;
  }).join('');
}

async function loadRepairs() {
  try {
    const res = await fetch('repairs/repairs.json', { cache: 'no-cache' });
    allRepairs = await res.json();
    renderRepairs(allRepairs);
  } catch {}
}

async function loadReviews() {
  try {
    const res = await fetch('reviews/reviews.json', { cache: 'no-cache' });
    const data = await res.json();
    allReviews = (data || []).filter(r => r.approved);
    renderReviews(allReviews);
  } catch {}
}

langBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    if (lang && lang !== currentLang) {
      loadLang(lang);
    }
  });
});

navToggle.addEventListener('click', () => {
  const open = navList.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navList.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

function updateActiveNav() {
  const scrollY = window.scrollY + 120;
  let current = 'home';
  document.querySelectorAll('section[id]').forEach(section => {
    const top = section.offsetTop - 100;
    const bottom = top + section.offsetHeight;
    if (scrollY >= top && scrollY < bottom) {
      current = section.id;
    }
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

window.addEventListener('scroll', updateActiveNav);

document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('.btn');
  const msg = document.getElementById('contactMsg');
  msg.textContent = langData['contact.sending'] || 'Sending...';
  msg.className = 'form-msg';
  btn.disabled = true;
  await new Promise(r => setTimeout(r, 1000));
  msg.textContent = langData['contact.sent'] || 'Thanks! I\'ll get back to you soon.';
  msg.className = 'form-msg';
  btn.disabled = false;
  e.target.reset();
  setTimeout(() => { msg.textContent = ''; }, 4000);
});

const openReviewModalBtn = document.getElementById('openReviewModalBtn');
if (openReviewModalBtn) {
  openReviewModalBtn.addEventListener('click', () => {
    reviewModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
}

reviewModal.addEventListener('click', (e) => {
  if (e.target === reviewModal) closeReviewModal();
});

document.getElementById('reviewModalClose').addEventListener('click', closeReviewModal);

function closeReviewModal() {
  reviewModal.classList.remove('open');
  document.body.style.overflow = '';
}

const starInput = document.getElementById('starInput');
let selectedRating = 0;
if (starInput) {
  starInput.querySelectorAll('i').forEach(star => {
    const val = parseInt(star.dataset.star);
    star.addEventListener('mouseenter', () => {
      starInput.querySelectorAll('i').forEach(s => {
        s.classList.toggle('hover', parseInt(s.dataset.star) <= val);
      });
    });
    star.addEventListener('mouseleave', () => {
      starInput.querySelectorAll('i').forEach(s => s.classList.remove('hover'));
    });
    star.addEventListener('click', () => {
      selectedRating = val;
      starInput.querySelectorAll('i').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.star) <= val);
        s.classList.remove('fas', 'far');
        s.classList.add(parseInt(s.dataset.star) <= val ? 'fas' : 'far');
      });
    });
  });
}

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('reviewMsg');
  const name = document.getElementById('reviewName').value.trim();
  const serial = document.getElementById('reviewSerial').value.trim();
  const text = document.getElementById('reviewText').value.trim();

  if (!selectedRating) {
    msg.textContent = langData['review.errorRating'] || 'Please select a rating.';
    msg.className = 'form-msg error';
    return;
  }

  msg.textContent = langData['review.submitting'] || 'Submitting...';
  msg.className = 'form-msg';

  const review = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, serial, rating: selectedRating, text,
    date: new Date().toISOString().slice(0, 10),
    approved: false
  };

  try {
    const existingRes = await fetch('reviews/reviews.json', { cache: 'no-cache' });
    let existing = [];
    if (existingRes.ok) existing = await existingRes.json();

    const serialCheck = await fetch('devices/devices.json', { cache: 'no-cache' });
    const devices = serialCheck.ok ? await serialCheck.json() : [];

    const validDevice = devices.find(d => d.serial === serial);
    if (!validDevice) {
      msg.textContent = langData['review.errorSerial'] || 'Serial number not found. Make sure it matches the serial from your repair service.';
      msg.className = 'form-msg error';
      return;
    }

    existing.push(review);
    const content = JSON.stringify(existing, null, 2);

    const ghToken = localStorage.getItem('adminToken');
    const ghOwner = localStorage.getItem('adminOwner');
    const ghRepo = localStorage.getItem('adminRepo');
    if (ghToken && ghOwner && ghRepo) {
      await ghWriteFile('reviews/reviews.json', content, ghToken, ghOwner, ghRepo);
    } else {
      const successMsg = langData['review.success'] || 'Review submitted for approval! It will appear once approved.';
      msg.textContent = successMsg;
      msg.className = 'form-msg success';
      document.getElementById('reviewForm').reset();
      selectedRating = 0;
      starInput.querySelectorAll('i').forEach(s => { s.className = 'far fa-star'; s.classList.remove('active'); });
      setTimeout(closeReviewModal, 1500);
      return;
    }

    const successMsg = langData['review.success'] || 'Review submitted for approval! It will appear once approved.';
    msg.textContent = successMsg;
    msg.className = 'form-msg success';
    document.getElementById('reviewForm').reset();
    selectedRating = 0;
    starInput.querySelectorAll('i').forEach(s => { s.className = 'far fa-star'; s.classList.remove('active'); });
    setTimeout(closeReviewModal, 1500);
  } catch (err) {
    msg.textContent = langData['review.errorSubmit'] || 'Error submitting review. Please try again.';
    msg.className = 'form-msg error';
  }
});

async function ghWriteFile(path, content, token, owner, repo) {
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  let sha = null;
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  }
  const body = { message: `Update ${path}`, content: btoa(unescape(encodeURIComponent(content))) };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('GitHub write failed');
}

Promise.all([
  loadConfig().catch(() => {}),
  loadRepairs().catch(() => {}),
  loadReviews().catch(() => {})
]).then(() => {
  document.body.classList.add('config-ready');
});
