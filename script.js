/* ═══════════════════════════════════════════════════
   BandHub — script.js
   Fetches rehearsal data from Google Sheets CSV,
   renders a calendar, and shows day detail on click.
═══════════════════════════════════════════════════ */

// ─── Constants ────────────────────────────────────
const MONTHS_ES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];
const WEEKDAYS_ES = ['L','M','X','J','V','S','D'];
const DAY_NAMES_ES = [
  'DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'
];

// ─── App state ────────────────────────────────────
const state = {
  rehearsals: [],       // raw array: [{date, title, link, notes}]
  grouped: {},          // { 'YYYY-MM-DD': [rehearsal, ...] }
  latestDate: null,     // 'YYYY-MM-DD' of most recent rehearsal
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,   // currently highlighted date
  loaded: false,
  error: null,
};

// ─── Entry point ──────────────────────────────────
async function init() {
  setupAddBtn();
  await loadData();
  setupNavButtons();
  render();
  hideLoading();
}

// ─── Add button setup ─────────────────────────────
function setupAddBtn() {
  const btn = document.getElementById('addBtn');
  if (!CONFIG.FORM_URL) {
    btn.classList.add('disabled');
    btn.title = 'Form URL no configurada — editá config.js';
    btn.addEventListener('click', e => e.preventDefault());
  } else {
    btn.href = CONFIG.FORM_URL;
  }
}

// ─── Navigation ───────────────────────────────────
function setupNavButtons() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) {
      state.currentMonth = 11;
      state.currentYear--;
    }
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) {
      state.currentMonth = 0;
      state.currentYear++;
    }
    renderCalendar();
  });
}

// ─── Data loading ─────────────────────────────────
async function loadData() {
  try {
    const res = await fetch(CONFIG.SHEET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    state.rehearsals = parseCSV(text);
    state.grouped    = groupByDate(state.rehearsals);
    state.latestDate = findLatestDate(state.rehearsals);
    state.loaded     = true;

    // Auto-navigate to the month of the latest rehearsal
    if (state.latestDate) {
      const [y, m] = state.latestDate.split('-').map(Number);
      state.currentYear  = y;
      state.currentMonth = m - 1;
      state.selectedDate = state.latestDate;
    }

    setConnStatus('connected', state.rehearsals.length
      ? `${state.rehearsals.length} ensayo${state.rehearsals.length !== 1 ? 's' : ''}`
      : 'sin datos');

    updateTotalCount();
  } catch (err) {
    console.error('[BandHub] Error cargando datos:', err);
    state.error = err.message;
    setConnStatus('error', 'error');
  }
}

function setConnStatus(cls, label) {
  const el = document.getElementById('connIndicator');
  el.className = `conn-indicator ${cls}`;
  document.getElementById('connLabel').textContent = label;
}

function updateTotalCount() {
  const n = state.rehearsals.length;
  document.getElementById('totalCount').textContent =
    n === 0 ? 'Sin ensayos registrados' : `${n} ensayo${n !== 1 ? 's' : ''} en total`;
}

// ─── CSV parsing ──────────────────────────────────
// Maps any variation of column names → internal keys (date, title, link, notes)
const HEADER_MAP = {
  // date
  date: 'date', fecha: 'date', 'fecha ensayo': 'date', 'fecha del ensayo': 'date',
  // title
  title: 'title', titulo: 'title', título: 'title', nombre: 'title', 'nombre del ensayo': 'title',
  // link
  link: 'link', enlace: 'link', url: 'link', grabacion: 'link', grabación: 'link',
  'link de grabacion': 'link', 'link de grabación': 'link', 'link grabacion': 'link',
  // notes
  notes: 'notes', notas: 'notes', nota: 'notes', comentarios: 'notes', descripcion: 'notes',
  descripción: 'notes', observaciones: 'notes',
};

function normalizeHeader(h) {
  const clean = h.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents for matching
    .replace(/[^a-z0-9 ]/g, '').trim();
  // Try with accents stripped first, then original
  return HEADER_MAP[clean] || HEADER_MAP[h.trim().toLowerCase()] || null;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = splitCSVLine(lines[0]);
  const headerMap  = rawHeaders.map(h => normalizeHeader(h));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const vals = splitCSVLine(line);
    const obj  = {};
    headerMap.forEach((key, idx) => {
      if (key) obj[key] = (vals[idx] || '').trim();
    });
    if (obj.date) rows.push(obj);
  }

  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ─── Data helpers ─────────────────────────────────
function groupByDate(rehearsals) {
  const g = {};
  for (const r of rehearsals) {
    const key = normalizeDate(r.date);
    if (!key) continue;
    if (!g[key]) g[key] = [];
    g[key].push({ ...r, _dateKey: key });
  }
  return g;
}

function findLatestDate(rehearsals) {
  if (!rehearsals.length) return null;
  const today = toDateKey(new Date());
  const past  = rehearsals
    .map(r => normalizeDate(r.date))
    .filter(d => d && d <= today)
    .sort();
  return past.length ? past[past.length - 1] : null;
}

// Normalize any date string → 'YYYY-MM-DD'
function normalizeDate(str) {
  if (!str) return null;
  str = str.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or D/M/YYYY
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // MM/DD/YYYY (US format, fallback)
  const mdy = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Let the browser try
  const d = new Date(str);
  if (!isNaN(d)) return toDateKey(d);
  return null;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Link & player helpers ────────────────────────
function isDirectAudio(url) {
  return /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(url);
}

// Extract file ID from any Google Drive URL format
function getDriveId(url) {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
            url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function isDriveUrl(url) {
  return url.includes('drive.google.com');
}

// Returns an object describing what kind of player to render
function getPlayerInfo(url) {
  if (!url) return { type: 'none' };
  if (isDriveUrl(url)) {
    const id = getDriveId(url);
    if (id) return { type: 'drive', id, previewUrl: `https://drive.google.com/file/d/${id}/preview`, downloadUrl: `https://drive.google.com/uc?export=download&id=${id}` };
  }
  if (isDirectAudio(url)) return { type: 'audio', url };
  if (url.includes('mega.nz'))          return { type: 'external', label: '↗ ABRIR EN MEGA' };
  if (url.includes('youtube.com') || url.includes('youtu.be')) return { type: 'external', label: '↗ VER EN YOUTUBE' };
  if (url.includes('soundcloud.com'))   return { type: 'external', label: '↗ VER EN SOUNDCLOUD' };
  return { type: 'external', label: '↗ ABRIR LINK' };
}

// ─── Main render ──────────────────────────────────
function render() {
  renderCalendar();
  renderDetail();
}

// ─── Calendar rendering ───────────────────────────
function renderCalendar() {
  const { currentYear: y, currentMonth: m } = state;
  document.getElementById('monthTitle').textContent = `${MONTHS_ES[m]} ${y}`;

  const cal      = document.getElementById('calendar');
  const todayKey = toDateKey(new Date());

  cal.innerHTML = '';

  // Weekday headers
  WEEKDAYS_ES.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-wday';
    el.textContent = d;
    cal.appendChild(el);
  });

  // Calculate first day offset (Monday = 0)
  const firstDayJS = new Date(y, m, 1).getDay(); // 0=Sun
  const offset     = (firstDayJS + 6) % 7;       // Mon=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Empty leading cells
  for (let i = 0; i < offset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day is-empty';
    cal.appendChild(el);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEvent   = !!state.grouped[key];
    const isLatest   = key === state.latestDate;
    const isToday    = key === todayKey;
    const isSelected = key === state.selectedDate;

    const classes = [
      'cal-day',
      hasEvent   ? 'has-event'   : '',
      isLatest   ? 'is-latest'   : '',
      isToday    ? 'is-today'    : '',
      isSelected ? 'is-selected' : '',
      !hasEvent  ? 'is-empty'    : '',
    ].filter(Boolean).join(' ');

    const cell = document.createElement('div');
    cell.className = classes;

    const num = document.createElement('span');
    num.className = 'day-num';
    num.textContent = d;
    cell.appendChild(num);

    if (hasEvent) {
      const dot = document.createElement('span');
      dot.className = 'day-dot';
      cell.appendChild(dot);
      cell.addEventListener('click', () => selectDate(key));
    }

    cal.appendChild(cell);
  }
}

function selectDate(key) {
  state.selectedDate = key;
  renderCalendar();
  renderDetail();
}

// ─── Detail panel rendering ───────────────────────
function renderDetail() {
  const placeholder = document.getElementById('detailPlaceholder');
  const view        = document.getElementById('detailView');

  // Error state shown in detail panel
  if (state.error && !state.loaded) {
    placeholder.style.display = 'none';
    view.innerHTML = `
      <div class="error-state">
        <h3>ERROR DE CONEXIÓN</h3>
        <p>No se pudieron cargar los ensayos desde Google Sheets.<br>
           Verificá que el Sheet esté publicado correctamente.<br><br>
           <code style="font-size:10px;color:var(--text-dim)">${esc(state.error)}</code>
        </p>
      </div>`;
    return;
  }

  // No date selected or no data for that date
  if (!state.selectedDate || !state.grouped[state.selectedDate]) {
    placeholder.style.display = 'flex';
    view.innerHTML = '';

    // If loaded but sheet is empty, add a hint inside placeholder
    if (state.loaded && state.rehearsals.length === 0) {
      placeholder.innerHTML = `
        <svg class="placeholder-icon" viewBox="0 0 64 64" width="48" height="48" fill="none">
          <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="1"/>
          <circle cx="32" cy="32" r="7" stroke="currentColor" stroke-width="1"/>
          <line x1="32" y1="4" x2="32" y2="16" stroke="currentColor" stroke-width="1"/>
          <line x1="32" y1="48" x2="32" y2="60" stroke="currentColor" stroke-width="1"/>
          <line x1="4" y1="32" x2="16" y2="32" stroke="currentColor" stroke-width="1"/>
          <line x1="48" y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="1"/>
        </svg>
        <p>El sheet está vacío — agregá tu primer ensayo</p>`;
    }
    return;
  }

  // Has data
  placeholder.style.display = 'none';

  const rehearsals = state.grouped[state.selectedDate];
  const isLatest   = state.selectedDate === state.latestDate;
  const date       = parseDateKey(state.selectedDate);
  const dayName    = DAY_NAMES_ES[date.getDay()];
  const dayNum     = date.getDate();
  const monthName  = MONTHS_ES[date.getMonth()];
  const year       = date.getFullYear();

  let html = `
    <div class="detail-date-block">
      <div class="detail-weekday">${dayName}</div>
      <div class="detail-date-big">${dayNum} ${monthName}</div>
      <div class="detail-year">${year}</div>
      ${isLatest ? '<div class="latest-badge">Último ensayo</div>' : ''}
    </div>
    <div class="cards-list">
  `;

  for (const r of rehearsals) {
    const p = getPlayerInfo(r.link);

    // Build player HTML
    let playerHTML = '';
    if (p.type === 'drive') {
      playerHTML = `
        <div class="player-wrap">
          <iframe class="drive-player"
                  src="${esc(p.previewUrl)}"
                  allow="autoplay"
                  allowfullscreen
                  loading="lazy"
                  title="Reproductor de ensayo"></iframe>
        </div>`;
    } else if (p.type === 'audio') {
      playerHTML = `
        <div class="player-wrap">
          <audio class="audio-player" controls preload="none" src="${esc(p.url)}"></audio>
        </div>`;
    }

    // Build action buttons
    let actionsHTML = '';
    if (p.type === 'drive') {
      actionsHTML = `
        <a href="${esc(p.downloadUrl)}" class="link-btn" target="_blank" rel="noopener">↓ DESCARGAR</a>
        <a href="${esc(r.link)}" class="link-btn" target="_blank" rel="noopener">↗ ABRIR EN DRIVE</a>`;
    } else if (p.type === 'audio') {
      actionsHTML = `<a href="${esc(r.link)}" class="link-btn" download>↓ DESCARGAR</a>`;
    } else if (p.type === 'external') {
      actionsHTML = `<a href="${esc(r.link)}" class="link-btn primary" target="_blank" rel="noopener">${p.label}</a>`;
    } else {
      actionsHTML = `<span class="link-btn no-link">Sin link</span>`;
    }

    html += `
      <div class="rehearsal-card ${isLatest ? 'card-latest' : ''}">
        <div class="card-title">${esc(r.title || 'Sin título')}</div>
        ${r.notes ? `<div class="card-notes">${esc(r.notes)}</div>` : ''}
        ${playerHTML}
        <div class="card-actions">${actionsHTML}</div>
      </div>
    `;
  }

  html += '</div>';
  view.innerHTML = html;
}

// ─── Utilities ────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

function hideLoading() {
  const el = document.getElementById('loadingScreen');
  el.classList.add('out');
  setTimeout(() => el.remove(), 550);
}

// ─── Start ────────────────────────────────────────
init();
