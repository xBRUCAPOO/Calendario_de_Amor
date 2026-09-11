/* ==========================================================================
   FECHAS IMPORTANTES — fechas.js
   Lista todos los días especiales guardados (los más próximos primero),
   permite buscar por nombre y desplegar la descripción de cada uno.
   ========================================================================== */

(function () {
  const listEl = document.getElementById('datesList');
  const searchInput = document.getElementById('searchInput');

  function getSortedDays() {
    return getSpecialDays()
      .map((item) => ({ item, countdown: getCountdownInfo(item) }))
      .sort((a, b) => a.countdown.diffDays - b.countdown.diffDays);
  }

  function renderList(filterText) {
    const query = (filterText || '').trim().toLowerCase();
    const rows = getSortedDays().filter(({ item }) => item.name.toLowerCase().includes(query));

    if (rows.length === 0) {
      listEl.innerHTML = `<p class="empty-state">No hay días que coincidan con la búsqueda.</p>`;
      return;
    }

    listEl.innerHTML = rows.map(({ item, countdown }) => `
      <div class="date-card" style="--card-accent: var(--special-color-${item.colorIndex});" data-id="${item.id}">
        <div class="date-card-top">
          <span class="date-card-day">${formatDayMonth(item.day, item.month)}</span>
          <div class="date-card-info">
            <p class="date-card-title">${escapeHTML(item.name)}</p>
            <p class="date-card-countdown">${countdown.label}</p>
          </div>
        </div>
        ${item.description ? `
          <button class="date-card-toggle" data-toggle>
            Ver descripción <span class="material-symbols-outlined">expand_more</span>
          </button>
          <p class="date-card-description">${escapeHTML(item.description)}</p>
        ` : ''}
      </div>
    `).join('');

    // Conecta el botón de "ver descripción" de cada tarjeta recién pintada
    listEl.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.date-card').classList.toggle('is-expanded');
      });
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  searchInput.addEventListener('input', () => renderList(searchInput.value));
  renderList('');
})();
