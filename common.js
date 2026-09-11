/* ==========================================================================
   FECHAS IMPORTANTES — common.js
   Lógica compartida por todas las páginas: guardado de días especiales,
   cálculo de próxima ocurrencia / cuenta regresiva, y el modal para
   agregar un día especial (se usa desde calendario.html y también se
   puede abrir directo desde index.html vía el parámetro ?add=1).
   ========================================================================== */

const STORAGE_KEY = 'fechasImportantes.specialDays.v1';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const TOTAL_COLORES = 30;

/* --- Persistencia en localStorage ------------------------------------- */

function getSpecialDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDefaultDays();
    return JSON.parse(raw);
  } catch (e) {
    return seedDefaultDays();
  }
}

function saveSpecialDays(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addSpecialDay(entry) {
  const list = getSpecialDays();
  list.push(entry);
  saveSpecialDays(list);
}

// Dos fechas de ejemplo la primera vez que se abre la app, para que
// calendario.html y fechas.html no se vean vacíos. Se guardan igual que
// cualquier día agregado a mano, así que se pueden editar/borrar libremente
// (por ahora la app no tiene borrado/edición, ver ideas de mejora).
function seedDefaultDays() {
  const seed = [
    { id: 'seed-1', day: 1, month: 1, year: null, recurring: true, name: 'Año Nuevo', description: 'El primer día del año, ideal para armar propósitos nuevos.', colorIndex: 11 },
    { id: 'seed-2', day: 25, month: 12, year: null, recurring: true, name: 'Navidad', description: 'Celebración familiar de fin de año.', colorIndex: 6 },
  ];
  saveSpecialDays(seed);
  return seed;
}

/* --- Cálculo de fechas --------------------------------------------------
   Una fecha "recurrente" (switch activado, sin año) se repite cada año en
   el mismo día/mes. Una fecha "puntual" (con año) ocurre una sola vez. */

function todayAtMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Devuelve el objeto Date de la próxima vez que ocurre ese día especial
// a partir de hoy. Para fechas puntuales ya pasadas, devuelve la fecha
// original (queda marcada como pasada por getCountdownInfo).
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

/* --- Modal "Agregar día especial" ---------------------------------------
   Se inyecta como HTML en cualquier página que llame a initAddDayModal().
   Vive acá para no duplicar el formulario en calendario.html e index.html. */

function buildColorSwatchesHTML() {
  let html = '';
  for (let i = 1; i <= TOTAL_COLORES; i++) {
    html += `
      <label>
        <input type="radio" name="colorIndex" value="${i}" ${i === 1 ? 'checked' : ''}>
        <span class="color-swatch" style="background: var(--special-color-${i});"></span>
      </label>`;
  }
  return html;
}

function buildAddDayModalHTML() {
  return `
    <div class="modal-overlay" id="addDayOverlay">
      <div class="modal-sheet">
        <h2>Agregar día especial</h2>
        <form id="addDayForm">
          <div class="switch-row">
            <div class="switch-text">
              <strong>Se repite cada año</strong>
              <span>Si está activo, se ignora el año (ej: todos los 11 de septiembre)</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="recurringSwitch" checked>
              <span class="track"><span class="thumb"></span></span>
            </label>
          </div>

          <div class="field">
            <label for="dayDate">Fecha</label>
            <input type="date" id="dayDate" required>
            <p class="field-hint" id="dayDateHint">El año no se va a usar: se repite todos los años.</p>
          </div>

          <div class="field">
            <label for="dayName">Nombre</label>
            <input type="text" id="dayName" placeholder="Ej: Día de la Novia" required maxlength="60">
          </div>

          <div class="field">
            <label for="dayDescription">Descripción</label>
            <textarea id="dayDescription" placeholder="Una descripción breve de este día..." maxlength="600"></textarea>
          </div>

          <div class="field">
            <label>Color</label>
            <div class="color-picker">${buildColorSwatchesHTML()}</div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="cancelAddDay">
              <span class="material-symbols-outlined">close</span> Cancelar
            </button>
            <button type="submit" class="btn btn-primary" id="submitAddDay">
              <span class="material-symbols-outlined">check</span> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>`;
}

// Inserta el modal en el DOM y conecta toda su interacción.
// onSaved(entry) se llama después de guardar, para que la página que lo
// invoque (calendario.html) pueda refrescar su vista sin recargar.
function initAddDayModal(onSaved) {
  const mount = document.createElement('div');
  mount.innerHTML = buildAddDayModalHTML();
  document.body.appendChild(mount.firstElementChild);

  const overlay = document.getElementById('addDayOverlay');
  const form = document.getElementById('addDayForm');
  const recurringSwitch = document.getElementById('recurringSwitch');
  const dayDateHint = document.getElementById('dayDateHint');

  function updateHint() {
    dayDateHint.textContent = recurringSwitch.checked
      ? 'El año no se va a usar: se repite todos los años.'
      : 'Se va a guardar como una fecha puntual (con año).';
  }
  recurringSwitch.addEventListener('change', updateHint);
  updateHint();

  function open() {
    overlay.classList.add('is-open');
  }
  function close() {
    overlay.classList.remove('is-open');
    form.reset();
    updateHint();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.getElementById('cancelAddDay').addEventListener('click', close);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateValue = document.getElementById('dayDate').value; // "YYYY-MM-DD"
    if (!dateValue) return;
    const [y, m, d] = dateValue.split('-').map(Number);
    const colorIndex = Number(form.querySelector('input[name="colorIndex"]:checked').value);

    const entry = {
      id: `day-${Date.now()}`,
      day: d,
      month: m,
      year: recurringSwitch.checked ? null : y,
      recurring: recurringSwitch.checked,
      name: document.getElementById('dayName').value.trim(),
      description: document.getElementById('dayDescription').value.trim(),
      colorIndex,
    };

    addSpecialDay(entry);
    close();
    if (typeof onSaved === 'function') onSaved(entry);
  });

  return { open, close };
}
