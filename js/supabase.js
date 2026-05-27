const SUPABASE_URL = 'https://nwujdtzxriajgkauqmmk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KDIDStOvDPbb7BOoo6saVg_002Joggm';

let _token = null;

function sbFetch(method, path, body) {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  return fetch(`${SUPABASE_URL}/${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined
  }).then(async r => {
    const text = await r.text();
    if (r.status >= 400) {
      let msg = text;
      try { const j = JSON.parse(text); msg = j.message || j.error || j.msg || msg; } catch {}
      throw new Error(msg);
    }
    try { return JSON.parse(text); } catch { return text; }
  });
}

const sbAuth = {
  signInWithPassword: ({ email, password }) =>
    sbFetch('POST', 'auth/v1/token?grant_type=password', { email, password })
      .then(data => {
        if (data.access_token) {
          _token = data.access_token;
          const s = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at, user: data.user };
          try { localStorage.setItem('sb-session', JSON.stringify(s)); } catch {}
        }
        return { data, error: null };
      })
      .catch(err => ({ data: null, error: err })),

  signOut: () => {
    _token = null;
    try { localStorage.removeItem('sb-session'); } catch {}
    return Promise.resolve({ error: null });
  },

  getSession: () => {
    try {
      const saved = localStorage.getItem('sb-session');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now())) {
          _token = s.access_token;
          return Promise.resolve({ data: { session: s }, error: null });
        }
      }
    } catch {}
    return Promise.resolve({ data: { session: null }, error: null });
  },

  updateUser: ({ password }) =>
    sbFetch('PUT', 'auth/v1/user', { password })
      .then(data => ({ data, error: null }))
      .catch(err => ({ data: null, error: err }))
};

sbAuth.getSession();

function sbSelect(table, filters) {
  const p = new URLSearchParams(); p.set('select', '*');
  if (filters) {
    if (filters.approved !== undefined) p.set('approved', `eq.${filters.approved}`);
    if (filters.order) p.set('order', `${filters.order}.${filters.dir || 'asc'}.nullslast`);
  }
  return sbFetch('GET', `rest/v1/${table}?${p}`)
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbInsert(table, row) {
  return sbFetch('POST', `rest/v1/${table}`, Array.isArray(row) ? row : [row])
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbUpsert(table, row, onConflict) {
  let path = `rest/v1/${table}`;
  if (onConflict) path += `?on_conflict=${onConflict}`;
  return sbFetch('POST', path, Array.isArray(row) ? row : [row])
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbUpdate(table, col, val, body) {
  return sbFetch('PATCH', `rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, body)
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbDelete(table, col, val) {
  return sbFetch('DELETE', `rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`)
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbRpc(fn, params) {
  return sbFetch('POST', `rest/v1/rpc/${fn}`, params || {})
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbMfaEnroll() {
  return sbFetch('POST', 'auth/v1/mfa/totp/enroll')
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbMfaChallenge(factorId) {
  return sbFetch('POST', 'auth/v1/mfa/challenge', { factor_id: factorId })
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbMfaVerify(factorId, challengeId, code) {
  return sbFetch('POST', 'auth/v1/mfa/verify', { factor_id: factorId, challenge_id: challengeId, code })
    .then(d => {
      if (d.access_token) {
        _token = d.access_token;
        const s = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at, user: d.user };
        try { localStorage.setItem('sb-session', JSON.stringify(s)); } catch {}
      }
      return { data: d, error: null };
    }).catch(err => ({ data: null, error: err }));
}

function sbMfaUnenroll(factorId) {
  return sbFetch('DELETE', `auth/v1/mfa/factors/${factorId}`)
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}

function sbMfaListFactors() {
  return sbFetch('GET', 'auth/v1/mfa/factors')
    .then(d => ({ data: d, error: null })).catch(err => ({ data: null, error: err }));
}
