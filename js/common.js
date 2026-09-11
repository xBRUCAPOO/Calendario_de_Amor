/* ==========================================================================
   FECHAS IMPORTANTES — js/common.js
   Capa de datos compartida por todas las páginas:
   - Lee/escribe días especiales contra el backend (Cloudflare Pages Functions
     + D1, ver /functions/api/days.js) y cachea todo en localStorage para que
     la app funcione offline (PWA).
   - Si el backend no responde (sin conexión, o todavía no lo desplegaste),
     la app sigue funcionando 100% con la copia local y reintenta sincronizar
     sola apenas vuelve la conexión.
   - Cálculo de fechas/cuenta regresiva, categorías, colores, diálogos con la
     estética de la app (reemplazan confirm()/alert() nativos del navegador,
     que no se pueden personalizar), y el modal para agregar/editar un día.

   Todas las rutas a otros archivos (css, js, íconos, api) son ABSOLUTAS
   (empiezan con "/") a propósito: este archivo se carga tanto desde
   /index.html como desde /pages/calendario.html y /pages/fechas.html, que
   viven en carpetas distintas.
   ========================================================================== */

const API_BASE = '/api';
const CACHE_KEY = 'fechasImportantes.cache.v3';
const PENDING_KEY = 'fechasImportantes.pending.v3';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const TOTAL_COLORES = 50;

// Categorías disponibles para clasificar un día especial (además del color)
const CATEGORIES = [
  { id: 'pareja', label: 'Pareja', icon: 'favorite' },
  { id: 'cumpleanos', label: 'Cumpleaños', icon: 'cake' },
  { id: 'aniversario', label: 'Aniversario', icon: 'celebration' },
  { id: 'feriado', label: 'Feriado', icon: 'flag' },
  { id: 'otro', label: 'Otro', icon: 'star' },
];

function getCategoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function makeId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `day-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* --------------------------------------------------------------------------
   CACHÉ LOCAL (localStorage) — copia offline de todos los días especiales
   -------------------------------------------------------------------------- */

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeCache(list) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(list));
}

function readPendingQueue() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function writePendingQueue(queue) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

function queuePendingOp(op) {
  const queue = readPendingQueue();
  queue.push(op);
  writePendingQueue(queue);
}

// Datos de ejemplo la primera vez que se abre la app: los feriados nacionales
// confirmados (+ el feriado propio de Córdoba Capital) y las fechas más
// conocidas "de pareja". Se guardan como cualquier día cargado a mano: se
// pueden editar o borrar sin problema.
function seedDefaultDays() {
  const seed = [...buildHolidaySeedDays(), ...buildCoupleSeedDays()];
  writeCache(seed);
  return seed;
}

// Feriados nacionales de Argentina + el feriado propio de Córdoba Capital.
// Fuente: Ley 27.399 y Resolución 164/2025 (Jefatura de Gabinete), más el
// decreto anual de la Municipalidad de Córdoba para el 6 de julio.
// Los "inamovibles" son recurrentes (misma fecha todos los años). Los
// "trasladables" y los "puente turístico" se fijan por decreto cada año, así
// que van con año puntual 2026 y hay que cargar los del año que viene cuando
// se confirmen (no son siempre el mismo día/mes).
function buildHolidaySeedDays() {
  const recurrentes = [
    { day: 1, month: 1, name: 'Año Nuevo' },
    { day: 24, month: 3, name: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
    { day: 2, month: 4, name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
    { day: 1, month: 5, name: 'Día del Trabajador' },
    { day: 25, month: 5, name: 'Día de la Revolución de Mayo' },
    { day: 6, month: 7, name: 'Fundación de la Ciudad de Córdoba', desc: 'Feriado propio de **Córdoba Capital**: la Municipalidad lo declara día no laborable para conmemorar el aniversario de la fundación de la ciudad, el 6 de julio de 1573.' },
    { day: 20, month: 6, name: 'Día de la Bandera (Paso a la Inmortalidad de Belgrano)' },
    { day: 9, month: 7, name: 'Día de la Independencia' },
    { day: 8, month: 12, name: 'Inmaculada Concepción de María' },
    { day: 25, month: 12, name: 'Navidad' },
  ];

  const puntuales2026 = [
    { day: 16, month: 2, name: 'Carnaval (día 1)' },
    { day: 17, month: 2, name: 'Carnaval (día 2)' },
    { day: 3, month: 4, name: 'Viernes Santo' },
    { day: 15, month: 6, name: 'Paso a la Inmortalidad del Gral. Güemes', desc: 'Feriado **trasladable**: la fecha de conmemoración es el 17 de junio, pero en 2026 se observa el 15.' },
    { day: 17, month: 8, name: 'Paso a la Inmortalidad del Gral. San Martín' },
    { day: 12, month: 10, name: 'Día del Respeto a la Diversidad Cultural' },
    { day: 23, month: 11, name: 'Día de la Soberanía Nacional', desc: 'Feriado **trasladable**: la fecha de conmemoración es el 20 de noviembre, pero en 2026 se observa el 23.' },
    { day: 23, month: 3, name: 'Día no laborable (puente turístico)' },
    { day: 10, month: 7, name: 'Día no laborable (puente turístico)' },
    { day: 7, month: 12, name: 'Día no laborable (puente turístico)' },
  ];

  const items = [];
  recurrentes.forEach((h, i) => items.push({
    id: makeId(), day: h.day, month: h.month, year: null, recurring: true,
    name: h.name, category: 'feriado', colorIndex: 11 + (i % 6), remindDaysBefore: null,
    description: h.desc || `**${h.name}**, feriado nacional inamovible: se celebra siempre en esta fecha, caiga el día de la semana que caiga.`,
  }));
  puntuales2026.forEach((h, i) => items.push({
    id: makeId(), day: h.day, month: h.month, year: 2026, recurring: false,
    name: h.name, category: 'feriado', colorIndex: 24 + (i % 6), remindDaysBefore: null,
    description: h.desc || `**${h.name}** confirmado para 2026. Al no ser una fecha fija, para 2027 hay que cargar el nuevo día apenas se confirme.`,
  }));
  return items;
}

// Fechas conocidas como "de pareja" en Argentina/internacionalmente.
// Nota: salvo San Valentín, ninguna es una fecha oficial ni tiene una única
// fuente "correcta" (varía según el sitio que la difunda); lo aclaramos en
// la propia descripción para no presentarlas como un dato 100% cerrado.
function buildCoupleSeedDays() {
  return [
    {
      id: makeId(), day: 14, month: 2, year: null, recurring: true,
      name: 'San Valentín', category: 'pareja', colorIndex: 17, remindDaysBefore: 3,
      description: 'El **Día de San Valentín** se celebra cada 14 de febrero y es la fecha más reconocida en el mundo para festejar el amor en pareja. No hace falta un gesto grande: una carta, una cena en casa o simplemente decirle a la otra persona por qué la elegís todos los días ya alcanza. Más info: [Wikipedia](https://es.wikipedia.org/wiki/D%C3%ADa_de_San_Valent%C3%ADn)',
    },
    {
      id: makeId(), day: 1, month: 8, year: null, recurring: true,
      name: 'Día de la Novia', category: 'pareja', colorIndex: 16, remindDaysBefore: 3,
      description: 'El **Día de la Novia** (o *National Girlfriend·s Day*) nació en Estados Unidos y se viralizó en redes sociales como una especie de segundo San Valentín. La fecha exacta varía bastante según el país y hasta según la fuente que la difunda: acá tomamos el **1 de agosto**, la más difundida internacionalmente, pero en Argentina vas a encontrar sitios que la mueven a marzo, abril u octubre.',
    },
    {
      id: makeId(), day: 20, month: 9, year: null, recurring: true,
      name: 'Día de los Novios', category: 'pareja', colorIndex: 40, remindDaysBefore: 3,
      description: 'En Argentina se popularizó el **Día de los Novios** cada 20 de septiembre, justo antes del inicio de la primavera. No es una fecha oficial ni tiene un origen documentado: la idea es aprovechar el clima primaveral como excusa para un gesto simple hacia la pareja, como el Día del Estudiante pero en versión romántica.',
    },
    {
      id: makeId(), day: 3, month: 10, year: null, recurring: true,
      name: 'Día del Novio', category: 'pareja', colorIndex: 45, remindDaysBefore: 3,
      description: 'El **Día del Novio** se difundió en Argentina como el equivalente al Día de la Novia, pensado para que sea ella quien lo agasaje a él. Tampoco es una fecha oficial ni hay demasiado consenso sobre el día exacto (algunos sitios lo ubican el 20 de septiembre); lo que importa es el gesto, no la fecha en sí.',
    },
  ];
}

/* --------------------------------------------------------------------------
   API — llamadas al backend (Cloudflare Pages Functions + D1)
   Si el fetch falla (sin conexión, backend caído o todavía no desplegado),
   cada función devuelve null y quien la llama cae al modo offline.
   -------------------------------------------------------------------------- */

async function apiRequest(path, options) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) return null;
    if (res.status === 204) return true;
    return await res.json();
  } catch (e) {
    return null; // sin conexión / backend no disponible -> modo offline
  }
}

/* --------------------------------------------------------------------------
   API PÚBLICA usada por las páginas (todas async)
   -------------------------------------------------------------------------- */

async function getSpecialDays() {
  const remote = await apiRequest('/days');
  if (remote) {
    writeCache(remote);
    return remote;
  }
  const cached = readCache();
  if (cached) return cached;
  return seedDefaultDays();
}

async function addSpecialDay(entry) {
  if (!entry.id) entry.id = makeId();
  const created = await apiRequest('/days', { method: 'POST', body: JSON.stringify(entry) });
  const list = readCache() || [];
  if (created) {
    list.push(created);
    writeCache(list);
    return created;
  }
  list.push(entry);
  writeCache(list);
  queuePendingOp({ type: 'create', payload: entry });
  return entry;
}

async function updateSpecialDay(id, changes) {
  const updated = await apiRequest(`/days/${id}`, { method: 'PUT', body: JSON.stringify(changes) });
  const list = readCache() || [];
  const idx = list.findIndex((d) => d.id === id);
  const merged = { ...(idx >= 0 ? list[idx] : {}), ...changes, id };
  if (idx >= 0) list[idx] = updated || merged; else list.push(updated || merged);
  writeCache(list);
  if (!updated) queuePendingOp({ type: 'update', id, payload: changes });
  return updated || merged;
}

async function deleteSpecialDay(id) {
  const ok = await apiRequest(`/days/${id}`, { method: 'DELETE' });
  const list = (readCache() || []).filter((d) => d.id !== id);
  writeCache(list);
  if (!ok) queuePendingOp({ type: 'delete', id });
  return true;
}

async function flushPendingQueue() {
  let queue = readPendingQueue();
  if (queue.length === 0) return;
  while (queue.length > 0) {
    const op = queue[0];
    let ok = false;
    if (op.type === 'create') ok = !!(await apiRequest('/days', { method: 'POST', body: JSON.stringify(op.payload) }));
    if (op.type === 'update') ok = !!(await apiRequest(`/days/${op.id}`, { method: 'PUT', body: JSON.stringify(op.payload) }));
    if (op.type === 'delete') ok = !!(await apiRequest(`/days/${op.id}`, { method: 'DELETE' }));
    if (!ok) break;
    queue.shift();
    writePendingQueue(queue);
  }
}
window.addEventListener('online', flushPendingQueue);
document.addEventListener('DOMContentLoaded', flushPendingQueue);

/* --------------------------------------------------------------------------
   CÁLCULO DE FECHAS
   -------------------------------------------------------------------------- */

function todayAtMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getNextOccurrence(item) {
  const today = todayAtMidnight();
  if (!item.recurring && item.year) {
    return new Date(item.year, item.month - 1, item.day);
  }
  let candidate = new Date(today.getFullYear(), item.month - 1, item.day);
  if (candidate < today) {
    candidate = new Date(today.getFullYear() + 1, item.month - 1, item.day);
  }
  return candidate;
}

function getCountdownInfo(item) {
  const today = todayAtMidnight();
  const target = getNextOccurrence(item);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return { label: '¡Es hoy!', diffDays, target, isPast: false };
  if (diffDays > 0) return { label: `Faltan: ${diffDays} día${diffDays === 1 ? '' : 's'}`, diffDays, target, isPast: false };
  return { label: `Pasó hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`, diffDays, target, isPast: true };
}

function formatDayMonth(day, month) {
  return `${day} de ${MESES[month - 1]}`;
}

// Color de acento a usar para un día especial: los feriados siempre se
// muestran en gris claro (sin color propio), el resto usa su colorIndex.
function getAccentColorVar(item) {
  return item.category === 'feriado' ? 'var(--gray-300)' : `var(--special-color-${item.colorIndex})`;
}

function findDaysOn(list, day, month, year) {
  return list.filter((item) => {
    if (item.day !== day || item.month !== month) return false;
    if (!item.recurring && item.year && item.year !== year) return false;
    return true;
  });
}

/* --------------------------------------------------------------------------
   TEXTO ENRIQUECIDO EN LAS DESCRIPCIONES
   **palabra** la resalta con el color del día, [texto](https://...) arma un
   link. Todo se escapa antes, así que es seguro aunque el texto tenga
   símbolos raros.
   -------------------------------------------------------------------------- */

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseDescription(raw) {
  if (!raw) return '';
  let safe = escapeHTML(raw);
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<span class="hl">$1</span>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

/* --------------------------------------------------------------------------
   COMPARTIR (Web Share API, con fallback a copiar el texto)
   -------------------------------------------------------------------------- */

async function shareSpecialDay(item) {
  const countdown = getCountdownInfo(item);
  const text = `${item.name} — ${formatDayMonth(item.day, item.month)} (${countdown.label})`;
  if (navigator.share) {
    try {
      await navigator.share({ title: item.name, text });
    } catch (e) { /* el usuario canceló el share, no hacemos nada */ }
    return;
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    showToast('Copiado al portapapeles');
  }
}

/* --------------------------------------------------------------------------
   SERVICE WORKER (PWA offline) — ruta absoluta para que el SW controle
   todo el sitio sin importar desde qué carpeta se registre
   -------------------------------------------------------------------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => {});
  });
}

/* --------------------------------------------------------------------------
   DIÁLOGOS PROPIOS — reemplazan a confirm()/alert() nativos del navegador,
   que no se pueden re-vestir con la estética de la app.
   -------------------------------------------------------------------------- */

function showConfirmDialog({ message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' }) {
  return new Promise((resolve) => {
    const mount = document.createElement('div');
    mount.innerHTML = `
      <div class="confirm-overlay">
        <div class="confirm-box">
          <p>${escapeHTML(message)}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-choice="cancel">${escapeHTML(cancelLabel)}</button>
            <button type="button" class="btn btn-primary" data-choice="confirm">${escapeHTML(confirmLabel)}</button>
          </div>
        </div>
      </div>`;
    const overlay = mount.firstElementChild;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      const choice = e.target.closest('[data-choice]');
      if (choice) { overlay.remove(); resolve(choice.dataset.choice === 'confirm'); }
    });
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

/* --------------------------------------------------------------------------
   MODAL COMPARTIDO — Agregar / Editar día especial
   -------------------------------------------------------------------------- */

function buildColorSwatchesHTML(selectedIndex) {
  let html = '';
  for (let i = 1; i <= TOTAL_COLORES; i++) {
    const checked = i === (selectedIndex || 1) ? 'checked' : '';
    html += `
      <label>
        <input type="radio" name="colorIndex" value="${i}" ${checked}>
        <span class="color-swatch" style="background: var(--special-color-${i});"></span>
      </label>`;
  }
  return html;
}

function buildCategoryOptionsHTML(selectedId) {
  return CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === (selectedId || 'otro') ? 'selected' : ''}>${c.label}</option>`).join('');
}

function toDateInputValue(item) {
  if (!item) return '';
  const y = item.year || new Date().getFullYear();
  const mm = String(item.month).padStart(2, '0');
  const dd = String(item.day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function buildDayModalHTML(item) {
  const isEdit = !!item;
  return `
    <div class="modal-overlay" id="dayModalOverlay">
      <div class="modal-sheet">
        <h2>${isEdit ? 'Editar día especial' : 'Agregar día especial'}</h2>
        <form id="dayForm">
          <div class="switch-row">
            <div class="switch-text">
              <strong>El año también importa</strong>
              <span>Activado: es una fecha puntual (ej: 11 de septiembre de 2026). Apagado: se repite todos los años.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="yearMattersSwitch" ${isEdit && !item.recurring ? 'checked' : ''}>
              <span class="track"><span class="thumb"></span></span>
            </label>
          </div>

          <div class="field">
            <label for="dayDate">Fecha</label>
            <input type="date" id="dayDate" value="${toDateInputValue(item)}" required>
            <p class="field-hint" id="dayDateHint"></p>
          </div>

          <div class="field">
            <label for="dayName">Nombre</label>
            <input type="text" id="dayName" placeholder="Ej: Día de la Novia" required maxlength="60" value="${isEdit ? escapeHTML(item.name) : ''}">
          </div>

          <div class="field">
            <label for="dayCategory">Categoría</label>
            <div class="select-wrap">
              <select id="dayCategory">${buildCategoryOptionsHTML(isEdit ? item.category : 'otro')}</select>
              <span class="material-symbols-outlined select-chevron">expand_more</span>
            </div>
          </div>

          <div class="field">
            <label for="dayReminder">Avisarme (días antes)</label>
            <input type="number" inputmode="numeric" id="dayReminder" min="0" max="60" placeholder="Vacío = sin recordatorio" value="${isEdit && item.remindDaysBefore != null ? item.remindDaysBefore : ''}">
            <p class="field-hint">Requiere permitir notificaciones (botón de campanita arriba).</p>
          </div>

          <div class="field">
            <label for="dayDescription">Descripción</label>
            <textarea id="dayDescription" placeholder="Usá **palabra** para resaltarla con el color del día...">${isEdit ? escapeHTML(item.description || '') : ''}</textarea>
          </div>

          <div class="field" id="colorField">
            <label>Color</label>
            <div class="color-picker no-scrollbar">${buildColorSwatchesHTML(isEdit ? item.colorIndex : 1)}</div>
          </div>
          <p class="field-hint" id="feriadoColorHint">Los feriados siempre se muestran en gris claro, sin color propio.</p>

          <div class="modal-actions">
            ${isEdit ? `
              <button type="button" class="btn btn-secondary" id="deleteDayBtn">
                <span class="material-symbols-outlined">delete</span> Borrar
              </button>
            ` : `
              <button type="button" class="btn btn-secondary" id="cancelDayBtn">
                <span class="material-symbols-outlined">close</span> Cancelar
              </button>
            `}
            <button type="submit" class="btn btn-primary" id="submitDayBtn">
              <span class="material-symbols-outlined">check</span> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>`;
}

function openDayModal(item, onSaved, onDeleted) {
  const mount = document.createElement('div');
  mount.innerHTML = buildDayModalHTML(item);
  const overlay = mount.firstElementChild;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#dayForm');
  const yearMattersSwitch = overlay.querySelector('#yearMattersSwitch');
  const dayDateHint = overlay.querySelector('#dayDateHint');
  const initialSnapshot = new FormData(form);

  function updateHint() {
    dayDateHint.textContent = yearMattersSwitch.checked
      ? 'Se va a guardar como una fecha puntual (con año).'
      : 'El año no se va a usar: se repite todos los años.';
  }
  yearMattersSwitch.addEventListener('change', updateHint);
  updateHint();

  // Los feriados no eligen color: siempre se muestran en gris claro, así que
  // ocultamos el selector de color y mostramos una aclaración en su lugar.
  const categorySelect = overlay.querySelector('#dayCategory');
  const colorField = overlay.querySelector('#colorField');
  const feriadoColorHint = overlay.querySelector('#feriadoColorHint');
  function updateColorFieldVisibility() {
    const isFeriado = categorySelect.value === 'feriado';
    colorField.style.display = isFeriado ? 'none' : '';
    feriadoColorHint.style.display = isFeriado ? '' : 'none';
  }
  categorySelect.addEventListener('change', updateColorFieldVisibility);
  updateColorFieldVisibility();

  function isDirty() {
    const current = new FormData(form);
    for (const [key, value] of current.entries()) {
      if (initialSnapshot.get(key) !== value) return true;
    }
    return false;
  }

  function removeOverlay() {
    overlay.remove();
  }

  async function requestClose() {
    if (!isDirty()) { removeOverlay(); return; }
    const discard = await showConfirmDialog({
      message: 'Tenés cambios sin guardar. ¿Querés descartarlos?',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
    });
    if (discard) removeOverlay();
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) requestClose(); });
  const cancelBtn = overlay.querySelector('#cancelDayBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', requestClose);

  const deleteBtn = overlay.querySelector('#deleteDayBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const ok = await showConfirmDialog({
        message: `¿Borrar "${item.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Borrar',
      });
      if (!ok) return;
      await deleteSpecialDay(item.id);
      removeOverlay();
      if (typeof onDeleted === 'function') onDeleted(item.id);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dateValue = overlay.querySelector('#dayDate').value; // "YYYY-MM-DD"
    if (!dateValue) return;
    const [y, m, d] = dateValue.split('-').map(Number);
    const colorIndex = Number(form.querySelector('input[name="colorIndex"]:checked').value);
    const reminderRaw = overlay.querySelector('#dayReminder').value;

    const payload = {
      day: d,
      month: m,
      year: yearMattersSwitch.checked ? y : null,
      recurring: !yearMattersSwitch.checked,
      name: overlay.querySelector('#dayName').value.trim(),
      category: overlay.querySelector('#dayCategory').value,
      description: overlay.querySelector('#dayDescription').value.trim(),
      colorIndex,
      remindDaysBefore: reminderRaw === '' ? null : Number(reminderRaw),
    };

    let saved;
    if (item) {
      saved = await updateSpecialDay(item.id, payload);
    } else {
      payload.id = makeId();
      saved = await addSpecialDay(payload);
    }
    removeOverlay();
    if (typeof onSaved === 'function') onSaved(saved);
  });

  requestAnimationFrame(() => overlay.classList.add('is-open'));

  return { close: requestClose };
}
