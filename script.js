/* ══════════════════════════════════════════════
   AETHERIS — Unified Intelligence Layer  v2
   ══════════════════════════════════════════════ */

const safeStorage = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
};
function todayKey() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

/* ══════════════════════ THEME ══════════════════════ */
function initTheme() {
  applyTheme(safeStorage.get('aetheris_theme') || 'dark');
}
function applyTheme(theme) {
  const btn = document.getElementById('themeToggle');
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    btn.textContent = '☾'; btn.setAttribute('aria-label', 'Switch to dark mode');
  } else {
    document.documentElement.removeAttribute('data-theme');
    btn.textContent = '☀'; btn.setAttribute('aria-label', 'Switch to light mode');
  }
  safeStorage.set('aetheris_theme', theme);
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
}

/* ══════════════════════ PROVIDER CREDENTIALS ══════════════════════ */
const PROVIDER_META = [
  { key: 'openai', label: 'OpenAI (ChatGPT + DALL·E)', color: '#56d9a8', placeholder: 'sk-...' },
  { key: 'anthropic', label: 'Anthropic (Claude)', color: '#f0a050', placeholder: 'sk-ant-...' },
  { key: 'google', label: 'Google (Gemini)', color: '#7ab3ff', placeholder: 'AIza...' },
  { key: 'perplexity', label: 'Perplexity', color: '#4fd4e0', placeholder: 'pplx-...' },
  { key: 'deepseek', label: 'DeepSeek', color: '#4d70ff', placeholder: 'sk-...' },
  { key: 'groq', label: 'Groq', color: '#f55036', placeholder: 'gsk_...' },
  { key: 'xai', label: 'xAI (Grok)', color: '#e5e5e5', placeholder: 'xai-...' },
  { key: 'mistral', label: 'Mistral', color: '#ff8c42', placeholder: 'Api key' },
  { key: 'stability', label: 'Stability AI (Stable Diffusion)', color: '#7c4dff', placeholder: 'sk-...' },
  { key: 'ideogram', label: 'Ideogram', color: '#ff5252', placeholder: 'Api key' }
];

let apiKeys = {};
let customModels = []; // [{id,name,modelId,baseUrl,key}]

function loadApiKeys() { try { apiKeys = JSON.parse(safeStorage.get('aetheris_api_keys') || '{}'); } catch (e) { apiKeys = {}; } }
function saveApiKeys() { safeStorage.set('aetheris_api_keys', JSON.stringify(apiKeys)); }
function loadCustomModels() { try { customModels = JSON.parse(safeStorage.get('aetheris_custom_models') || '[]'); } catch (e) { customModels = []; } }
function saveCustomModels() { safeStorage.set('aetheris_custom_models', JSON.stringify(customModels)); }

/* ══════════════════════ API ADAPTERS ══════════════════════
   Each adapter: build(messages, key, cfg) -> {url, options, raw?}
   parse(json) -> text (chat) or image url (image)
   Some providers reject direct browser calls (CORS) — that surfaces
   as a caught fetch error, reported honestly rather than retried silently. */
const ADAPTERS = {
  openai_chat: {
    provider: 'openai', type: 'text',
    build(messages, key) {
      return { url: 'https://api.openai.com/v1/chat/completions', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages })
      }};
    },
    parse(j) { return j.choices[0].message.content; }
  },
  anthropic_chat: {
    provider: 'anthropic', type: 'text',
    build(messages, key) {
      return { url: 'https://api.anthropic.com/v1/messages', options: {
        method: 'POST', headers: {
          'Content-Type': 'application/json', 'x-api-key': key,
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages })
      }};
    },
    parse(j) { return j.content[0].text; }
  },
  google_chat: {
    provider: 'google', type: 'text',
    build(messages, key) {
      const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      return { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, options: {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents })
      }};
    },
    parse(j) { return j.candidates[0].content.parts[0].text; }
  },
  perplexity_chat: {
    provider: 'perplexity', type: 'text',
    build(messages, key) {
      return { url: 'https://api.perplexity.ai/chat/completions', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'sonar', messages })
      }};
    },
    parse(j) { return j.choices[0].message.content; }
  },
  deepseek_chat: {
    provider: 'deepseek', type: 'text',
    build(messages, key) {
      return { url: 'https://api.deepseek.com/chat/completions', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages })
      }};
    },
    parse(j) { return j.choices[0].message.content; }
  },
  groq_chat: {
    provider: 'groq', type: 'text',
    build(messages, key) {
      return { url: 'https://api.groq.com/openai/v1/chat/completions', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages })
      }};
    },
    parse(j) { return j.choices[0].message.content; }
  },
  xai_chat: {
    provider: 'xai', type: 'text',
    build(messages, key) {
      return { url: 'https://api.x.ai/v1/chat/completions', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'grok-2-latest', messages })
      }};
    },
    parse(j) { return j.choices[0].message.content; }
  },
  mistral_chat: {
    provider: 'mistral', type: 'text',
    build(messages, key) {
      return { url: 'https://api.mistral.ai/v1/chat/completions', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'mistral-small-latest', messages })
      }};
    },
    parse(j) { return j.choices[0].message.content; }
  },
  openai_image: {
    provider: 'openai', type: 'image',
    build(messages, key) {
      const prompt = messages[messages.length - 1].content;
      return { url: 'https://api.openai.com/v1/images/generations', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024' })
      }};
    },
    parse(j) { return j.data[0].url; }
  },
  stability_image: {
    provider: 'stability', type: 'image', raw: true,
    build(messages, key) {
      const prompt = messages[messages.length - 1].content;
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('output_format', 'png');
      return { url: 'https://api.stability.ai/v2beta/stable-image/generate/core', options: {
        method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'image/*' }, body: form
      }};
    }
  },
  ideogram_image: {
    provider: 'ideogram', type: 'image',
    build(messages, key) {
      const prompt = messages[messages.length - 1].content;
      return { url: 'https://api.ideogram.ai/generate', options: {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Api-Key': key },
        body: JSON.stringify({ image_request: { prompt, aspect_ratio: 'ASPECT_1_1', model: 'V_2', magic_prompt_option: 'AUTO' } })
      }};
    },
    parse(j) { return j.data[0].url; }
  },
  custom_chat: {
    provider: 'custom', type: 'text',
    build(messages, key, cfg) {
      const base = cfg.baseUrl.replace(/\/$/, '');
      const headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;
      return { url: `${base}/chat/completions`, options: { method: 'POST', headers, body: JSON.stringify({ model: cfg.modelId, messages }) } };
    },
    parse(j) { return j.choices[0].message.content; }
  }
};

async function callAdapter(adapterId, messages, customCfg) {
  const adapter = ADAPTERS[adapterId];
  const key = customCfg ? customCfg.key : apiKeys[adapter.provider];
  if (adapter.provider !== 'custom' && !key) return { ok: false, error: 'No API key stored for this provider.' };

  const started = performance.now();
  try {
    const { url, options } = adapter.build(messages, key, customCfg);
    const res = await fetch(url, options);
    if (adapter.raw) {
      if (!res.ok) { const t = await res.text().catch(() => ''); return { ok: false, error: `Request failed (HTTP ${res.status}). ${t.slice(0, 120)}` }; }
      const blob = await res.blob();
      return { ok: true, type: 'image', url: URL.createObjectURL(blob), ms: performance.now() - started };
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || `Request failed (HTTP ${res.status}).`;
      return { ok: false, error: msg };
    }
    if (adapter.type === 'image') return { ok: true, type: 'image', url: adapter.parse(json), ms: performance.now() - started };
    return { ok: true, type: 'text', text: adapter.parse(json), ms: performance.now() - started };
  } catch (err) {
    return { ok: false, error: 'Request blocked — this provider may not allow direct browser calls (CORS), or the network request failed.' };
  }
}

/* ══════════════════════ MODEL REGISTRY ══════════════════════ */
function baseModels() {
  return {
    chatgpt: { id: 'chatgpt', name: 'ChatGPT', icon: '✳', color: '#56d9a8', apiProvider: 'openai', adapter: 'openai_chat', webUrl: 'https://chatgpt.com/?q=', supportsParam: true },
    claude: { id: 'claude', name: 'Claude', icon: '✺', color: '#f0a050', apiProvider: 'anthropic', adapter: 'anthropic_chat', webUrl: 'https://claude.ai/new?q=', supportsParam: true },
    gemini: { id: 'gemini', name: 'Gemini', icon: '✦', color: '#7ab3ff', apiProvider: 'google', adapter: 'google_chat', webUrl: 'https://gemini.google.com/app', supportsParam: false },
    perplexity: { id: 'perplexity', name: 'Perplexity', icon: '◈', color: '#4fd4e0', apiProvider: 'perplexity', adapter: 'perplexity_chat', webUrl: 'https://www.perplexity.ai/search?q=', supportsParam: true },
    deepseek: { id: 'deepseek', name: 'DeepSeek', icon: '◐', color: '#4d70ff', apiProvider: 'deepseek', adapter: 'deepseek_chat', webUrl: 'https://chat.deepseek.com', supportsParam: false },
    groq: { id: 'groq', name: 'Groq', icon: '⚡', color: '#f55036', apiProvider: 'groq', adapter: 'groq_chat', webUrl: 'https://groq.com', supportsParam: false },
    grok: { id: 'grok', name: 'Grok', icon: '✕', color: '#e5e5e5', apiProvider: 'xai', adapter: 'xai_chat', webUrl: 'https://grok.com', supportsParam: false },
    mistral: { id: 'mistral', name: 'Mistral', icon: '▲', color: '#ff8c42', apiProvider: 'mistral', adapter: 'mistral_chat', webUrl: 'https://chat.mistral.ai', supportsParam: false },
    consensus: { id: 'consensus', name: 'Consensus AI', icon: '◉', color: '#8884ff', webUrl: 'https://consensus.app/results/?q=', supportsParam: true },
    scholar: { id: 'scholar', name: 'Google Scholar', icon: '🎓', color: '#7ab3ff', webUrl: 'https://scholar.google.com/scholar?q=', supportsParam: true },
    v0: { id: 'v0', name: 'v0 by Vercel', icon: '▽', color: '#ffffff', webUrl: 'https://v0.dev/chat?q=', supportsParam: true },
    dalle: { id: 'dalle', name: 'DALL·E 3', icon: '▣', color: '#56d9a8', apiProvider: 'openai', adapter: 'openai_image', webUrl: 'https://chatgpt.com/?q=Generate%20an%20image:%20', supportsParam: true },
    stable_diff: { id: 'stable_diff', name: 'Stable Diffusion', icon: '◧', color: '#7c4dff', apiProvider: 'stability', adapter: 'stability_image', webUrl: 'https://clipdrop.co', supportsParam: false },
    ideogram: { id: 'ideogram', name: 'Ideogram', icon: '◪', color: '#ff5252', apiProvider: 'ideogram', adapter: 'ideogram_image', webUrl: 'https://ideogram.ai', supportsParam: false },
    midjourney: { id: 'midjourney', name: 'Midjourney', icon: '◭', color: '#8a2be2', webUrl: 'https://alpha.midjourney.com', supportsParam: false }
  };
}

function buildSuites() {
  const M = baseModels();
  const suites = {
    general: { title: 'Ask Every <em>AI. At Once.</em>', sub: 'One prompt. Every model. Smarter answers.', models: [M.chatgpt, M.claude, M.gemini, M.perplexity, M.grok] },
    research: { title: 'Deep <em>Research</em>', sub: 'Multi-source synthesis, citation aggregation, cross-model verification.', models: [M.perplexity, M.gemini, M.consensus, M.scholar] },
    coding: { title: 'Advanced <em>Coding</em>', sub: 'Generation, debugging, refactoring — compared side by side.', models: [M.chatgpt, M.deepseek, M.groq, M.mistral, M.v0] },
    image: { title: 'Image <em>Generation</em>', sub: 'Prompt once, render across connected image providers.', models: [M.dalle, M.stable_diff, M.ideogram, M.midjourney] }
  };
  // fold in custom models into every suite as extra chat options
  customModels.forEach(cm => {
    const modelObj = { id: `custom_${cm.id}`, name: cm.name, icon: '⌁', color: '#a78bfa', apiProvider: `custom_${cm.id}`, adapter: 'custom_chat', customCfg: cm, webUrl: cm.baseUrl, supportsParam: false };
    Object.values(suites).forEach(s => { if (s !== suites.image) s.models.push(modelObj); });
  });
  return suites;
}

const SIDEBAR_PROVIDER_IDS = ['chatgpt', 'claude', 'gemini', 'perplexity', 'deepseek', 'grok', 'mistral', 'groq'];

let suites = buildSuites();
let activeSuiteId = 'general';
let selectedModels = {};
let currentView = 'grid';
let compareMode = false;
let reasoningMode = false;
let webSearchPreferred = false;
let conversations = {}; // modelId -> [{role,content}]

/* ══════════════════════ ANALYTICS ══════════════════════ */
let analytics = { totalQueries: 0, perModel: {}, history: [], responseTimesMs: [], tokensTotal: 0, dailyCounts: {} };
function loadAnalytics() {
  try { analytics = Object.assign({ totalQueries: 0, perModel: {}, history: [], responseTimesMs: [], tokensTotal: 0, dailyCounts: {} }, JSON.parse(safeStorage.get('aetheris_analytics') || '{}')); }
  catch (e) { /* keep defaults */ }
}
function saveAnalytics() { safeStorage.set('aetheris_analytics', JSON.stringify(analytics)); }
function recordQuery(promptText, modelIds) {
  analytics.totalQueries++;
  const day = todayKey();
  analytics.dailyCounts[day] = (analytics.dailyCounts[day] || 0) + 1;
  modelIds.forEach(id => { analytics.perModel[id] = (analytics.perModel[id] || 0) + 1; });
  analytics.history.unshift({ prompt: promptText, ts: Date.now(), modelCount: modelIds.length });
  analytics.history = analytics.history.slice(0, 8);
  saveAnalytics();
  renderAnalyticsPanel();
}
function recordResponse(tokensEst, ms) {
  analytics.tokensTotal += tokensEst;
  analytics.responseTimesMs.push(ms);
  analytics.responseTimesMs = analytics.responseTimesMs.slice(-40);
  saveAnalytics();
  renderAnalyticsPanel();
}

function renderAnalyticsPanel() {
  document.getElementById('statQueries').textContent = analytics.totalQueries;
  document.getElementById('statTokens').textContent = formatCompact(analytics.tokensTotal);
  const liveCount = PROVIDER_META.filter(p => apiKeys[p.key]).length;
  document.getElementById('statLiveApis').textContent = `${liveCount}/${PROVIDER_META.length}`;
  const avg = analytics.responseTimesMs.length ? analytics.responseTimesMs.reduce((a, b) => a + b, 0) / analytics.responseTimesMs.length : null;
  document.getElementById('statAvgTime').textContent = avg ? `${(avg / 1000).toFixed(1)}s` : '—';

  document.getElementById('sidebarTotalQueries').textContent = analytics.totalQueries;

  // donut
  const entries = Object.entries(analytics.perModel).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const donut = document.getElementById('donutChart');
  const legend = document.getElementById('donutLegend');
  document.getElementById('donutTotal').textContent = total;
  if (total === 0) {
    donut.style.background = 'var(--glass)';
    legend.innerHTML = '<p class="empty-note">No usage yet</p>';
  } else {
    const M = baseModels();
    let acc = 0; const stops = [];
    entries.forEach(([id, count]) => {
      const color = (M[id] || {}).color || '#8b6cf2';
      const pct = (count / total) * 100;
      stops.push(`${color} ${acc}% ${acc + pct}%`);
      acc += pct;
    });
    donut.style.background = `conic-gradient(${stops.join(',')})`;
    legend.innerHTML = entries.map(([id, count]) => {
      const m = M[id] || { name: id, color: '#8b6cf2' };
      return `<div class="legend-row"><span class="legend-dot" style="background:${m.color}"></span><span class="legend-name">${escapeHtml(m.name)}</span><span class="legend-pct">${Math.round((count / total) * 100)}%</span></div>`;
    }).join('');
  }

  // history
  const historyList = document.getElementById('historyList');
  if (analytics.history.length === 0) {
    historyList.innerHTML = '<p class="empty-note">Nothing synced yet.</p>';
  } else {
    historyList.innerHTML = analytics.history.map(h => `
      <div class="history-row">
        <span class="history-dot"></span>
        <div class="history-text">
          <div class="history-prompt">${escapeHtml(h.prompt)}</div>
          <div class="history-meta">${timeAgo(h.ts)}</div>
        </div>
        <span class="history-badge">${h.modelCount} model${h.modelCount === 1 ? '' : 's'}</span>
      </div>`).join('');
  }

  drawSparkline();
}

function formatCompact(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function drawSparkline() {
  const canvas = document.getElementById('sparkline');
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth || 220, h = canvas.clientHeight || 34;
  canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(analytics.dailyCounts[d.toISOString().slice(0, 10)] || 0);
  }
  const max = Math.max(1, ...days);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b6cf2';

  ctx.beginPath();
  days.forEach((v, i) => {
    const x = (i / (days.length - 1)) * (w - 4) + 2;
    const y = h - 3 - (v / max) * (h - 6);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = accent; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();

  days.forEach((v, i) => {
    const x = (i / (days.length - 1)) * (w - 4) + 2;
    const y = h - 3 - (v / max) * (h - 6);
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
  });
}

/* ══════════════════════ SIDEBAR PROVIDER LIST ══════════════════════ */
function renderProviderList() {
  const M = baseModels();
  const list = document.getElementById('providerList');
  const ids = [...SIDEBAR_PROVIDER_IDS];
  let html = ids.map(id => {
    const m = M[id];
    const live = m.apiProvider && apiKeys[m.apiProvider];
    return `<div class="provider-row">
      <span class="provider-dot-ico" style="background:${m.color}22; color:${m.color}">${m.icon}</span>
      <span class="provider-name">${m.name}</span>
      <span class="status-pill ${live ? 'live' : 'off'}">${live ? 'LIVE' : 'OFF'}</span>
    </div>`;
  }).join('');
  html += customModels.map(cm => `<div class="provider-row">
      <span class="provider-dot-ico" style="background:#a78bfa22; color:#a78bfa">⌁</span>
      <span class="provider-name">${escapeHtml(cm.name)}</span>
      <span class="status-pill live">LIVE</span>
    </div>`).join('');
  list.innerHTML = html;
}

/* ══════════════════════ SETTINGS MODAL ══════════════════════ */
function buildSettingsModal() {
  const body = document.getElementById('settingsBody');
  body.innerHTML = PROVIDER_META.map(p => `
    <div class="key-field">
      <label for="key_${p.key}"><span class="provider-swatch" style="background:${p.color}"></span> ${p.label}</label>
      <input type="password" id="key_${p.key}" placeholder="${p.placeholder}" autocomplete="off" value="${apiKeys[p.key] || ''}">
    </div>`).join('');
  renderCustomModelsList();
}
function renderCustomModelsList() {
  const wrap = document.getElementById('customModelsList');
  if (customModels.length === 0) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = customModels.map(cm => `
    <div class="key-field" style="display:flex; align-items:center; gap:8px;">
      <span class="provider-swatch" style="background:#a78bfa"></span>
      <span style="flex:1; font-size:12.5px;">${escapeHtml(cm.name)} <span style="color:var(--muted-dim)">(${escapeHtml(cm.modelId)})</span></span>
      <button class="btn btn-danger" style="padding:4px 10px;" onclick="removeCustomModel('${cm.id}')">Remove</button>
    </div>`).join('');
}
function removeCustomModel(id) {
  customModels = customModels.filter(c => c.id !== id);
  saveCustomModels();
  suites = buildSuites();
  renderCustomModelsList();
  renderProviderList();
  switchSuite(activeSuiteId);
}
function addCustomModel() {
  const name = document.getElementById('customName').value.trim();
  const modelId = document.getElementById('customModelId').value.trim();
  const baseUrl = document.getElementById('customBaseUrl').value.trim();
  const key = document.getElementById('customKey').value.trim();
  if (!name || !modelId || !baseUrl) { alert('Please fill in at least name, model ID, and base URL.'); return; }
  customModels.push({ id: 'c' + Date.now(), name, modelId, baseUrl, key });
  saveCustomModels();
  ['customName', 'customModelId', 'customBaseUrl', 'customKey'].forEach(id => document.getElementById(id).value = '');
  renderCustomModelsList();
}

function openSettings() { buildSettingsModal(); document.getElementById('settingsOverlay').classList.add('visible'); }
function closeSettings() { document.getElementById('settingsOverlay').classList.remove('visible'); }
function saveSettings() {
  PROVIDER_META.forEach(p => {
    const val = document.getElementById(`key_${p.key}`).value.trim();
    if (val) apiKeys[p.key] = val; else delete apiKeys[p.key];
  });
  saveApiKeys();
  suites = buildSuites();
  closeSettings();
  renderProviderList();
  switchSuite(activeSuiteId);
  renderAnalyticsPanel();
}
function clearAllKeys() { apiKeys = {}; saveApiKeys(); buildSettingsModal(); renderProviderList(); switchSuite(activeSuiteId); renderAnalyticsPanel(); }

/* ══════════════════════ SUITE / PILL RENDERING ══════════════════════ */
function switchSuite(suiteId) {
  activeSuiteId = suiteId;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.suite === suiteId));
  const suite = suites[suiteId];
  document.getElementById('heroTitle').innerHTML = suite.title;
  document.getElementById('heroSub').textContent = suite.sub;

  selectedModels = {};
  const row = document.getElementById('pillRow');
  row.innerHTML = '';
  suite.models.forEach(m => {
    selectedModels[m.id] = true;
    const hasApi = !!m.adapter;
    const live = hasApi && (m.customCfg || apiKeys[m.apiProvider]);
    const pill = document.createElement('button');
    pill.className = `model-pill active ${hasApi ? '' : 'no-api'}`;
    pill.innerHTML = `<span class="pill-ico" style="color:${m.color}">${m.icon}</span>${escapeHtml(m.name)}${live ? ' <span style="color:var(--green);font-size:9px;">●</span>' : ''}`;
    pill.title = hasApi ? (live ? 'Live via your API key' : 'No key saved — will open in a tab / copy prompt') : 'No public API — will open in a tab / copy prompt';
    pill.onclick = () => { selectedModels[m.id] = !selectedModels[m.id]; pill.classList.toggle('active'); updateMatrixCount(); };
    row.appendChild(pill);
  });
  const addPill = document.createElement('button');
  addPill.className = 'model-pill model-pill-add';
  addPill.textContent = '+ Add Model';
  addPill.onclick = openSettings;
  row.appendChild(addPill);

  document.getElementById('matrixGrid').innerHTML = '<p class="empty-note" style="grid-column:1/-1;">Type a prompt and hit send to populate the Response Matrix.</p>';
  updateMatrixCount();
}
function updateMatrixCount() {
  const n = Object.values(selectedModels).filter(Boolean).length;
  document.getElementById('matrixCount').textContent = `${n} model${n === 1 ? '' : 's'} selected`;
  document.getElementById('sendBtn').disabled = document.getElementById('prompt').value.trim().length === 0;
}

/* ══════════════════════ MARKDOWN-LITE RENDERER ══════════════════════ */
function renderMarkdown(raw) {
  let text = escapeHtml(raw);
  text = text.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.split(/\n{2,}/).map(block => {
    if (block.startsWith('<pre>')) return block;
    if (/^(-|\*)\s/.test(block.trim())) {
      const items = block.split('\n').map(l => l.replace(/^(-|\*)\s/, '').trim()).filter(Boolean);
      return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return text;
}

/* ══════════════════════ BROADCAST / RESPONSE MATRIX ══════════════════════ */
function clearConsole() {
  document.getElementById('prompt').value = '';
  updateMatrixCount();
}

async function broadcastQuery() {
  let promptText = document.getElementById('prompt').value.trim();
  if (!promptText) return;
  if (reasoningMode) promptText = `Think step by step, briefly show your reasoning, then give the final answer.\n\n${promptText}`;

  const suite = suites[activeSuiteId];
  let activeModels = suite.models.filter(m => selectedModels[m.id]);
  if (webSearchPreferred) {
    const pplx = activeModels.find(m => m.apiProvider === 'perplexity');
    if (pplx) activeModels = [pplx, ...activeModels.filter(m => m !== pplx)];
  }
  if (activeModels.length === 0) return;

  try { await navigator.clipboard.writeText(promptText); } catch (e) { /* clipboard denied — non-fatal */ }

  recordQuery(promptText, activeModels.map(m => m.id));

  conversations = {};
  const grid = document.getElementById('matrixGrid');
  grid.innerHTML = '';
  grid.className = `matrix-grid ${currentView === 'list' ? 'list-view' : ''} ${compareMode ? 'compare-view' : ''}`;

  activeModels.forEach(model => {
    const hasKey = model.adapter && (model.customCfg || apiKeys[model.apiProvider]);
    const card = buildCard(model, hasKey);
    grid.appendChild(card);
    if (hasKey) {
      conversations[model.id] = [{ role: 'user', content: promptText }];
      runLiveCall(model);
    }
  });
}

function buildCard(model, hasKey) {
  const card = document.createElement('div');
  card.className = 'response-card';
  card.id = `card-${model.id}`;
  const centerHtml = hasKey
    ? `<div class="thinking-row"><span>◉ Contacting ${escapeHtml(model.name)}…</span></div><div class="thinking-bar"></div>`
    : (model.supportsParam
        ? `<div class="status-line info">✔ Direct routing armed</div><p class="note-text">Opens with your prompt pre-filled. Add an API key in ⚙ Settings for a live answer right here.</p>`
        : `<div class="status-line ok">✦ Copied to clipboard</div><p class="note-text">This platform blocks automated routing — paste with Ctrl/Cmd+V once the tab opens.</p>`);

  card.innerHTML = `
    <div class="card-head">
      <span class="card-ico" style="background:${model.color}22; color:${model.color}">${model.icon}</span>
      <span class="card-name">${escapeHtml(model.name)}</span>
      <div class="card-head-spacer"></div>
      <div class="card-menu-wrap">
        <button class="card-menu-btn" onclick="toggleCardMenu('${model.id}')">⋮</button>
        <div class="card-menu" id="menu-${model.id}">
          <button onclick="copyCardResponse('${model.id}')">Copy response</button>
          <button onclick="executeLaunch('${model.id}')">Open in tab ↗</button>
        </div>
      </div>
    </div>
    <div class="card-body" id="body-${model.id}">${centerHtml}</div>
    <div class="card-foot">
      <span id="foot-${model.id}">${hasKey ? 'Live API' : 'Fallback mode'}</span>
      <button class="card-cta" onclick="executeLaunch('${model.id}')">Open ↗</button>
    </div>`;
  return card;
}

async function runLiveCall(model) {
  const result = await callAdapter(model.adapter, conversations[model.id], model.customCfg);
  const body = document.getElementById(`body-${model.id}`);
  const foot = document.getElementById(`foot-${model.id}`);
  if (!body) return; // user navigated away

  if (result.ok) {
    if (result.type === 'image') {
      body.innerHTML = `<div class="status-line ok">◉ Image received</div><div class="image-result"><img src="${result.url}" alt="${escapeHtml(model.name)} generated image"></div>`;
      recordResponse(0, result.ms);
    } else {
      conversations[model.id].push({ role: 'assistant', content: result.text });
      body.innerHTML = `<div class="status-line ok">◉ Live response</div><div class="response-text">${renderMarkdown(result.text)}</div>${continueRowHtml(model.id)}`;
      const tokensEst = Math.round(result.text.length / 4);
      recordResponse(tokensEst, result.ms);
    }
    foot.textContent = `Live API · ${(result.ms / 1000).toFixed(1)}s`;
  } else {
    body.innerHTML = `<div class="status-line warn">⚠ ${escapeHtml(result.error)}</div><p class="note-text">Try opening it directly instead — your prompt is already on your clipboard.</p>`;
    foot.textContent = 'Call failed';
  }
}

function continueRowHtml(modelId) {
  return `<div class="continue-row">
    <input type="text" id="continue-${modelId}" placeholder="Continue this conversation…" onkeydown="if(event.key==='Enter') continueConversation('${modelId}')">
    <button onclick="continueConversation('${modelId}')">Send</button>
  </div>`;
}

async function continueConversation(modelId) {
  const input = document.getElementById(`continue-${modelId}`);
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const model = findModelById(modelId);
  if (!model) return;
  conversations[modelId].push({ role: 'user', content: text });
  const body = document.getElementById(`body-${modelId}`);
  body.insertAdjacentHTML('beforeend', `<div class="thinking-row"><span>◉ Thinking…</span></div><div class="thinking-bar"></div>`);
  const result = await callAdapter(model.adapter, conversations[modelId], model.customCfg);
  if (result.ok && result.type === 'text') {
    conversations[modelId].push({ role: 'assistant', content: result.text });
    body.innerHTML = `<div class="status-line ok">◉ Live response</div><div class="response-text">${renderMarkdown(result.text)}</div>${continueRowHtml(modelId)}`;
    recordResponse(Math.round(result.text.length / 4), result.ms);
  } else {
    body.insertAdjacentHTML('beforeend', `<div class="status-line warn">⚠ ${escapeHtml(result.error || 'Could not fetch a response.')}</div>`);
  }
}

function findModelById(id) {
  return suites[activeSuiteId].models.find(m => m.id === id);
}
function toggleCardMenu(id) {
  document.querySelectorAll('.card-menu.open').forEach(m => { if (m.id !== `menu-${id}`) m.classList.remove('open'); });
  document.getElementById(`menu-${id}`).classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.card-menu-wrap')) document.querySelectorAll('.card-menu.open').forEach(m => m.classList.remove('open'));
});
function copyCardResponse(id) {
  const el = document.querySelector(`#body-${id} .response-text`);
  const text = el ? el.textContent : '';
  navigator.clipboard.writeText(text).catch(() => {});
  toggleCardMenu(id);
}
function executeLaunch(id) {
  const model = findModelById(id);
  if (!model) return;
  const promptText = document.getElementById('prompt').value.trim();
  const url = model.supportsParam ? model.webUrl + encodeURIComponent(promptText) : model.webUrl;
  window.open(url, '_blank', 'noopener,noreferrer');
  toggleCardMenu(id);
}

/* ══════════════════════ VIEW / COMPARE TOGGLES ══════════════════════ */
function setView(view) {
  currentView = view;
  document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  const grid = document.getElementById('matrixGrid');
  grid.classList.toggle('list-view', view === 'list');
}

const TUTORIAL_KEY = 'aetheris_tutorial_seen_v1';
const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Aetheris',
    kicker: 'Launch sequence',
    body: 'Aetheris is built around one simple flow: choose a mode, write one prompt, pick the models you want, then compare their answers side by side. Use Next to follow the guided tour, or Skip when you are ready to explore.'
  },
  {
    selector: '.nav-group',
    title: 'Choose a mission',
    kicker: 'Suites',
    body: 'These buttons change the workspace. General Assistant is for everyday questions, Deep Research is for source-heavy work, Advanced Coding is for programming help, and Image Generation switches to visual tools. Click a suite whenever your task changes.'
  },
  {
    selector: '.console-card',
    title: 'Ask once',
    kicker: 'Command deck',
    body: 'Type your prompt in the big input. Turn on Web Search when the answer needs fresh information, or Reasoning mode when you want more deliberate problem solving. Press the send button when the prompt is ready.'
  },
  {
    selector: '#pillRow',
    title: 'Pick your models',
    kicker: 'Model swarm',
    body: 'Each chip is one model or tool. Active chips receive your prompt; inactive chips are skipped. Use this row to compare only the models you care about, or add a custom model from the Add Model chip.'
  },
  {
    selector: '#matrixGrid',
    title: 'Compare the answers',
    kicker: 'Response matrix',
    body: 'After you send, every selected model gets its own card here. If an API key is connected, the answer appears directly in the card. If not, Aetheris can still open the model in a tab or copy the prompt so you can paste it manually.'
  },
  {
    selector: '#settingsToggle',
    title: 'Connect your keys',
    kicker: 'Private cockpit',
    body: 'Open settings to add API keys, custom endpoints, or local models. Keys are saved only in this browser local storage. Add keys when you want live answers inside Aetheris instead of fallback tabs.'
  },
  {
    selector: '#rightPanel',
    title: 'Watch the system',
    kicker: 'Analytics',
    body: 'This panel tracks activity, estimated tokens, connected APIs, usage mix, and recent prompt history. It helps you see which models you are using and how busy the workspace has been.'
  }
];

let tutorialIndex = 0;
let tutorialEls = null;

function initTutorial() {
  if (safeStorage.get(TUTORIAL_KEY) === '1') return;
  window.setTimeout(startTutorial, 450);
}

function startTutorial() {
  if (tutorialEls) return;
  tutorialIndex = 0;
  tutorialEls = buildTutorialOverlay();
  document.body.appendChild(tutorialEls.overlay);
  tutorialEls.overlay.classList.add('visible');
  document.addEventListener('keydown', handleTutorialKeydown);
  renderTutorialStep();
}

function buildTutorialOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.id = 'tutorialOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tutorialTitle');
  overlay.innerHTML = `
    <span class="tutorial-spark"></span>
    <span class="tutorial-spark"></span>
    <span class="tutorial-spark"></span>
    <span class="tutorial-spark"></span>
    <div class="tutorial-spotlight"></div>
    <div class="tutorial-card">
      <div class="tutorial-orb"></div>
      <div class="tutorial-kicker"></div>
      <h2 class="tutorial-title" id="tutorialTitle"></h2>
      <p class="tutorial-body"></p>
      <div class="tutorial-progress"></div>
      <div class="tutorial-actions">
        <button class="tutorial-btn" data-action="skip">Skip</button>
        <button class="tutorial-btn" data-action="back">Back</button>
        <button class="tutorial-btn primary" data-action="next">Next</button>
      </div>
    </div>`;

  overlay.querySelector('[data-action="skip"]').addEventListener('click', finishTutorial);
  overlay.querySelector('[data-action="back"]').addEventListener('click', () => {
    tutorialIndex = Math.max(0, tutorialIndex - 1);
    renderTutorialStep();
  });
  overlay.querySelector('[data-action="next"]').addEventListener('click', () => {
    if (tutorialIndex >= TUTORIAL_STEPS.length - 1) finishTutorial();
    else {
      tutorialIndex++;
      renderTutorialStep();
    }
  });

  return {
    overlay,
    card: overlay.querySelector('.tutorial-card'),
    spotlight: overlay.querySelector('.tutorial-spotlight'),
    kicker: overlay.querySelector('.tutorial-kicker'),
    title: overlay.querySelector('.tutorial-title'),
    body: overlay.querySelector('.tutorial-body'),
    progress: overlay.querySelector('.tutorial-progress'),
    back: overlay.querySelector('[data-action="back"]'),
    next: overlay.querySelector('[data-action="next"]')
  };
}

function renderTutorialStep() {
  if (!tutorialEls) return;
  const step = TUTORIAL_STEPS[tutorialIndex];
  clearTutorialFocus();

  tutorialEls.kicker.textContent = step.kicker;
  tutorialEls.title.textContent = step.title;
  tutorialEls.body.textContent = step.body;
  tutorialEls.back.disabled = tutorialIndex === 0;
  tutorialEls.next.textContent = tutorialIndex === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next';
  tutorialEls.progress.innerHTML = TUTORIAL_STEPS.map((_, i) => `<span class="tutorial-dot ${i <= tutorialIndex ? 'active' : ''}"></span>`).join('');

  const target = step.selector ? document.querySelector(step.selector) : null;
  const rect = target ? target.getBoundingClientRect() : null;
  const visible = rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;

  if (target && visible) {
    target.classList.add('tutorial-focus');
    tutorialEls.overlay.classList.add('targeting');
    positionTutorialSpotlight(rect);
    positionTutorialCard(rect);
  } else {
    tutorialEls.overlay.classList.remove('targeting');
    tutorialEls.card.style.left = `${Math.max(16, (window.innerWidth - tutorialEls.card.offsetWidth) / 2)}px`;
    tutorialEls.card.style.top = `${Math.max(16, (window.innerHeight - tutorialEls.card.offsetHeight) / 2)}px`;
  }
}

function positionTutorialSpotlight(rect) {
  const pad = 10;
  tutorialEls.spotlight.style.left = `${Math.max(8, rect.left - pad)}px`;
  tutorialEls.spotlight.style.top = `${Math.max(8, rect.top - pad)}px`;
  tutorialEls.spotlight.style.width = `${Math.min(window.innerWidth - 16, rect.width + pad * 2)}px`;
  tutorialEls.spotlight.style.height = `${Math.min(window.innerHeight - 16, rect.height + pad * 2)}px`;
}

function positionTutorialCard(rect) {
  const margin = 18;
  const card = tutorialEls.card;
  const cardW = card.offsetWidth || 390;
  const cardH = card.offsetHeight || 260;
  let left = rect.right + margin;
  let top = rect.top;

  if (left + cardW > window.innerWidth - margin) left = rect.left - cardW - margin;
  if (left < margin) left = (window.innerWidth - cardW) / 2;
  if (top + cardH > window.innerHeight - margin) top = window.innerHeight - cardH - margin;
  if (top < margin) top = margin;

  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(top)}px`;
}

function clearTutorialFocus() {
  document.querySelectorAll('.tutorial-focus').forEach(el => el.classList.remove('tutorial-focus'));
}

function finishTutorial() {
  if (!tutorialEls) return;
  safeStorage.set(TUTORIAL_KEY, '1');
  clearTutorialFocus();
  document.removeEventListener('keydown', handleTutorialKeydown);
  tutorialEls.overlay.classList.remove('visible');
  const oldOverlay = tutorialEls.overlay;
  tutorialEls = null;
  window.setTimeout(() => oldOverlay.remove(), 240);
}

function handleTutorialKeydown(e) {
  if (!tutorialEls) return;
  if (e.key === 'Escape') finishTutorial();
  if (e.key === 'ArrowRight' || e.key === 'Enter') {
    e.preventDefault();
    tutorialEls.next.click();
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    tutorialEls.back.click();
  }
}

window.addEventListener('resize', () => {
  if (tutorialEls) renderTutorialStep();
});

/* ══════════════════════ MOBILE / PANEL TOGGLES ══════════════════════ */
function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('visible'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('visible'); }
function openPanel() { document.getElementById('rightPanel').classList.add('open'); document.getElementById('panelOverlay').classList.add('visible'); }
function closePanel() { document.getElementById('rightPanel').classList.remove('open'); document.getElementById('panelOverlay').classList.remove('visible'); }

/* ══════════════════════ WIRE UP EVENTS ══════════════════════ */
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchSuite(btn.dataset.suite)));
document.getElementById('prompt').addEventListener('input', updateMatrixCount);
document.getElementById('prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) broadcastQuery(); });
document.getElementById('sendBtn').addEventListener('click', broadcastQuery);
document.getElementById('clearBtn').addEventListener('click', clearConsole);
document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));
document.getElementById('compareToggle').addEventListener('change', e => { compareMode = e.target.checked; document.getElementById('matrixGrid').classList.toggle('compare-view', compareMode); });
document.getElementById('webSearchChip').addEventListener('click', function () { webSearchPreferred = !webSearchPreferred; this.classList.toggle('toggle-on', webSearchPreferred); });
document.getElementById('reasoningChip').addEventListener('click', function () { reasoningMode = !reasoningMode; this.classList.toggle('toggle-on', reasoningMode); });

document.getElementById('menuToggle').addEventListener('click', openSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.getElementById('panelToggle').addEventListener('click', openPanel);
document.getElementById('panelOverlay').addEventListener('click', closePanel);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('settingsToggle').addEventListener('click', openSettings);
document.getElementById('sidebarSettingsBtn').addEventListener('click', openSettings);
document.getElementById('sidebarAddModel').addEventListener('click', openSettings);
document.getElementById('settingsCancel').addEventListener('click', closeSettings);
document.getElementById('settingsSave').addEventListener('click', saveSettings);
document.getElementById('settingsClearAll').addEventListener('click', clearAllKeys);
document.getElementById('addCustomModelBtn').addEventListener('click', addCustomModel);
document.getElementById('settingsOverlay').addEventListener('click', e => { if (e.target.id === 'settingsOverlay') closeSettings(); });
window.addEventListener('resize', drawSparkline);

/* ══════════════════════ INIT ══════════════════════ */
initTheme();
loadApiKeys();
loadCustomModels();
loadAnalytics();
suites = buildSuites();
renderProviderList();
switchSuite('general');
renderAnalyticsPanel();
initTutorial();

/* ══════════════════════ AMBIENT STARFIELD ══════════════════════ */
(function () {
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [], meteors = [];
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function build() {
    stars = []; meteors = [];
    const count = Math.floor((canvas.width * canvas.height) / 5000);
    for (let i = 0; i < count; i++) {
      stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.3 + 0.2, base: Math.random() * 0.4 + 0.15, speed: Math.random() * 0.02 + 0.005, phase: Math.random() * Math.PI });
    }
    for (let i = 0; i < 6; i++) meteors.push(makeMeteor());
  }
  function makeMeteor() {
    return { x: Math.random() * canvas.width * 1.3, y: Math.random() * -canvas.height, len: Math.random() * 60 + 25, speed: Math.random() * 8 + 4, op: Math.random() * 0.4 + 0.1 };
  }
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; build(); }
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = Date.now();
    const starRgb = cssVar('--star-rgb') || '240,235,255';
    stars.forEach(s => {
      const o = s.base + Math.sin(t * s.speed + s.phase) * 0.12;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${starRgb}, ${Math.max(0.05, o)})`; ctx.fill();
    });
    meteors.forEach(m => {
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.len, m.y + m.len);
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.len, m.y + m.len);
      grad.addColorStop(0, `rgba(${starRgb}, ${m.op})`); grad.addColorStop(1, `rgba(${starRgb}, 0)`);
      ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.stroke();
      m.x -= m.speed; m.y += m.speed;
      if (m.x < -150 || m.y > canvas.height + 150) Object.assign(m, makeMeteor());
    });
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  resize(); loop();
})();
