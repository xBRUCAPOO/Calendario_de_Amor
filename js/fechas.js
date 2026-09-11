/* ==========================================================================
   FECHAS IMPORTANTES — js/fechas.js
   Lista todos los días especiales guardados (los más próximos primero),
   permite buscar por nombre, filtrar por categoría (con un acceso directo a
   "Feriados"), editar/borrar/compartir cada uno, y desplegar su descripción
   (con links y palabras resaltadas).

   Si se llega desde el calendario (?day=D&month=M), se resalta la tarjeta,
   se abre su descripción sola y vibra el celular para que quede clarísimo
   cuál es. El botón "volver" respeta de dónde vino: si fue desde el
   calendario, vuelve ahí (que a su vez recuerda el mes que se estaba viendo).
   ========================================================================== */

(function () {
  const listEl = document.getElementById('datesList');
  const searchInput = document.getElementById('searchInput');
  const categoryFilterEl = document.getElementById('categoryFilter');
  const params = new URLSearchParams(window.location.search);
  const highlightDay = params.get('day') ? Number(params.get('day')) : null;
  const highlightMonth = params.get('month') ? Number(params.get('month')) : null;

  let activeCategory = 'todas';

  document.getElementById('backBtn').addEventListener('click', () => {
    const cameFromCalendar = document.referrer && document.referrer.includes('calendario.html');
    window.location.href = cameFromCalendar ? 'calendario.html' : '../index.html';
  });

  // Acceso directo: salta al filtro de feriados de un toque
  document.getElementById('quickHolidaysBtn').addEventListener('click', () => {
    activeCategory = 'feriado';
    renderCategoryFilter();
    renderList(searchInput.value);
    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function renderCategoryFilter() {
    const chips = [{ id: 'todas', label: 'Todas', icon: 'apps' }, ...CATEGORIES];
    categoryFilterEl.innerHTML = chips.map((c) => `
      <button type="button" class="category-chip ${c.id === activeCategory ? 'is-active' : ''}" data-category="${c.id}">
        <span class="material-symbols-outlined">${c.icon}</span> ${c.label}
      </button>
    `).join('');

    categoryFilterEl.querySelectorAll('.category-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeCategory = chip.dataset.category;
        renderCategoryFilter();
        renderList(searchInput.value);
      });
    });
  }

  async function getSortedDays() {
    const list = await getSpecialDays();
    return list
      .map((item) => ({ item, countdown: getCountdownInfo(item) }))
      .sort((a, b) => a.countdown.diffDays - b.countdown.diffDays);
  }

  async function renderList(filterText) {
    const query = (filterText || '').trim().toLowerCase();
    let rows = await getSortedDays();
    rows = rows.filter(({ item }) => item.name.toLowerCase().includes(query));
    if (activeCategory !== 'todas') rows = rows.filter(({ item }) => item.category === activeCategory);

    if (rows.length === 0) {
      listEl.innerHTML = `<p class="empty-state">No hay días que coincidan con la búsqueda.</p>`;
      return;
    }

    listEl.innerHTML = rows.map(({ item, countdown }) => {
      const cat = getCategoryMeta(item.category);
      return `
      <div class="date-card" style="--card-accent: ${getAccentColorVar(item)};" data-id="${item.id}" data-day="${item.day}" data-month="${item.month}">
        <div class="date-card-top">
          <span class="date-card-day">${formatDayMonth(item.day, item.month)}</span>
          <div class="date-card-info">
            <p class="date-card-title">${escapeHTML(item.name)}</p>
            <p class="date-card-countdown">${countdown.label}</p>
            <span class="category-tag"><span class="material-symbols-outlined">${cat.icon}</span> ${cat.label}</span>
          </div>
          <div class="date-card-actions">
            <button class="card-icon-btn" data-action="share" aria-label="Compartir">
              <span class="material-symbols-outlined">share</span>
            </button>
            <button class="card-icon-btn" data-action="edit" aria-label="Editar">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="card-icon-btn is-danger" data-action="delete" aria-label="Borrar">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        ${item.description ? `
          <button class="date-card-toggle" data-toggle>
            Ver descripción <span class="material-symbols-outlined">expand_more</span>
          </button>
          <p class="date-card-description">${parseDescription(item.description)}</p>
        ` : ''}
      </div>
    `;
    }).join('');

    listEl.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.date-card').classList.toggle('is-expanded'));
    });

    listEl.querySelectorAll('[data-action="share"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = rows.find((r) => r.item.id === btn.closest('.date-card').dataset.id).item;
        shareSpecialDay(item);
      });
    });

    listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = rows.find((r) => r.item.id === btn.closest('.date-card').dataset.id).item;
        openDayModal(item, () => renderList(searchInput.value), () => renderList(searchInput.value));
      });
    });

    listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.date-card');
        const item = rows.find((r) => r.item.id === card.dataset.id).item;
        const ok = await showConfirmDialog({
          message: `¿Borrar "${item.name}"? Esta acción no se puede deshacer.`,
          confirmLabel: 'Borrar',
        });
        if (!ok) return;
        await deleteSpecialDay(item.id);
        renderList(searchInput.value);
      });
    });

    // Si llegamos desde el calendario con un día puntual: resaltamos la
    // tarjeta, abrimos su descripción sola y vibramos para que se note.
    if (highlightDay && highlightMonth) {
      const target = listEl.querySelector(`.date-card[data-day="${highlightDay}"][data-month="${highlightMonth}"]`);
      if (target) {
        target.classList.add('is-highlighted', 'is-expanded');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (navigator.vibrate) navigator.vibrate(200);
      }
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  searchInput.addEventListener('input', () => renderList(searchInput.value));
  renderCategoryFilter();
  renderList('');
})();
