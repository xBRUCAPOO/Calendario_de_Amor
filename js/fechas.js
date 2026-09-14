/* ==========================================================================
   FECHAS IMPORTANTES — js/fechas.js
   Lista los días especiales guardados (los más próximos primero), separados
   con un switch entre "Días importantes" (todo menos feriados) y "Feriados".
   Permite buscar por nombre, filtrar por categoría (solo en modo días
   importantes), editar/borrar/compartir cada uno, ver un detalle completo en
   un menú flotante al tocar la tarjeta, y desplegar su descripción.

   Si se llega desde el calendario (?day=D&month=M), se resaltan la(s)
   tarjeta(s) que caen en esa fecha, se abre su detalle solo y vibra el
   celular para que quede clarísimo cuál es. Si esa fecha tiene VARIOS días
   especiales cargados, en vez del detalle de uno solo se abre el visor de
   "historias" (círculos arriba + deslizamiento horizontal entre días,
   definido en common.js como showDayGroupModal). El botón "volver" respeta
   de dónde vino: si fue desde el calendario, vuelve ahí (que a su vez
   recuerda el mes que se estaba viendo).
   ========================================================================== */

(function () {
  const listEl = document.getElementById('datesList');
  const searchInput = document.getElementById('searchInput');
  const categoryFilterEl = document.getElementById('categoryFilter');
  const showHolidaysSwitch = document.getElementById('showHolidaysSwitch');
  const modeLabelDates = document.getElementById('modeLabelDates');
  const modeLabelHolidays = document.getElementById('modeLabelHolidays');
  const params = new URLSearchParams(window.location.search);
  const highlightDay = params.get('day') ? Number(params.get('day')) : null;
  const highlightMonth = params.get('month') ? Number(params.get('month')) : null;

  let activeCategory = 'todas';
  // Controla que el menú flotante de "llegada desde el calendario" se abra
  // una sola vez, no cada vez que la lista se vuelve a pintar
  let arrivalModalShown = false;

  document.getElementById('backBtn').addEventListener('click', () => {
    const cameFromCalendar = document.referrer && document.referrer.includes('calendario.html');
    window.location.href = cameFromCalendar ? 'calendario.html' : '../index.html';
  });

  // Switch "Días importantes" / "Feriados": son dos vistas separadas, no se
  // mezclan. Con feriados activo, el filtro de categoría no aplica (se oculta).
  showHolidaysSwitch.addEventListener('change', () => {
    const showingHolidays = showHolidaysSwitch.checked;
    modeLabelDates.style.opacity = showingHolidays ? '0.5' : '1';
    modeLabelHolidays.style.opacity = showingHolidays ? '1' : '0.5';
    categoryFilterEl.style.display = showingHolidays ? 'none' : 'flex';
    renderList(searchInput.value);
  });
  modeLabelDates.style.opacity = '1';
  modeLabelHolidays.style.opacity = '0.5';

  // FIX: pone el switch en modo "Feriados" (y ajusta etiquetas/filtro de
  // categoría) sin disparar el evento "change", para usarlo antes del primer
  // renderizado cuando la tarjeta de destino (llegada desde el calendario)
  // es un feriado.
  function activateHolidaysMode() {
    showHolidaysSwitch.checked = true;
    modeLabelDates.style.opacity = '0.5';
    modeLabelHolidays.style.opacity = '1';
    categoryFilterEl.style.display = 'none';
  }

  // NUEVO: determina si un ítem corresponde al día señalado por el link del
  // calendario (?day=D&month=M): coincide con su fecha exacta, o cae dentro
  // de su rango de varios días (ej. "Semana de la Dulzura") cuando el rango
  // entero está dentro de ese mismo mes.
  function matchesHighlightedDate(item, day, month) {
    if (item.day === day && item.month === month) return true;
    if (item.endDay != null) {
      const endMonth = item.endMonth || item.month;
      if (item.month === month && endMonth === month) {
        return day >= item.day && day <= item.endDay;
      }
    }
    return false;
  }

  function renderCategoryFilter() {
    // El chip "Feriado" no aparece acá: ese modo ya lo maneja el switch de arriba
    const chips = [{ id: 'todas', label: 'Todas', icon: 'apps' }, ...CATEGORIES.filter((c) => c.id !== 'feriado')];
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
    const showingHolidays = showHolidaysSwitch.checked;
    let rows = await getSortedDays();
    rows = rows.filter(({ item }) => item.name.toLowerCase().includes(query));

    if (showingHolidays) {
      rows = rows.filter(({ item }) => item.category === 'feriado');
    } else {
      rows = rows.filter(({ item }) => item.category !== 'feriado');
      if (activeCategory !== 'todas') rows = rows.filter(({ item }) => item.category === activeCategory);
    }

    if (rows.length === 0) {
      listEl.innerHTML = `<p class="empty-state">${showingHolidays ? 'No hay feriados guardados.' : 'No hay días que coincidan con la búsqueda.'}</p>`;
      return;
    }

    listEl.innerHTML = rows.map(({ item, countdown }) => {
      const cat = getCategoryMeta(item.category);
      return `
      <div class="date-card" style="--card-accent: ${getAccentColorVar(item)};" data-id="${item.id}" data-day="${item.day}" data-month="${item.month}">
        <div class="date-card-top">
          <span class="date-card-day">${formatDayRangeLabel(item)}</span>
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

    function findItem(card) {
      return rows.find((r) => r.item.id === card.dataset.id).item;
    }

    listEl.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.closest('.date-card').classList.toggle('is-expanded');
      });
    });

    listEl.querySelectorAll('[data-action="share"]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); shareSpecialDay(findItem(btn.closest('.date-card'))); });
    });

    listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDayModal(findItem(btn.closest('.date-card')), () => renderList(searchInput.value), () => renderList(searchInput.value));
      });
    });

    listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = findItem(btn.closest('.date-card'));
        const ok = await showConfirmDialog({
          message: `¿Borrar "${item.name}"? Esta acción no se puede deshacer.`,
          confirmLabel: 'Borrar',
        });
        if (!ok) return;
        await deleteSpecialDay(item.id);
        renderList(searchInput.value);
      });
    });

    // Tocar la tarjeta (fuera de los botones de arriba) abre el menú
    // flotante con toda la información de esa fecha.
    listEl.querySelectorAll('.date-card').forEach((card) => {
      card.addEventListener('click', () => {
        showDayDetailModal(findItem(card), {
          onSaved: () => renderList(searchInput.value),
          onDeleted: () => renderList(searchInput.value),
        });
      });
    });

    // Si llegamos desde el calendario con un día puntual: resaltamos la(s)
    // tarjeta(s) y, solo la primera vez (no en cada re-render posterior),
    // abrimos el detalle. NUEVO: si esa fecha tiene VARIOS días especiales
    // (ej. un cumpleaños y un aniversario el mismo día), en vez del detalle
    // de uno solo se abre el visor de "historias" (círculos arriba +
    // deslizamiento horizontal) con todos ellos.
    // La búsqueda usa matchesHighlightedDate() y el data-id de la tarjeta
    // (antes usaba data-day/data-month exactos), para que también funcione
    // si el día tocado en el calendario es parte de un rango de varias
    // fechas (ej. cualquier día de la Semana de la Dulzura).
    if (highlightDay && highlightMonth) {
      const matchedRows = rows.filter(({ item }) => matchesHighlightedDate(item, highlightDay, highlightMonth));
      if (matchedRows.length > 0) {
        // Resaltamos TODAS las tarjetas que caen en esa fecha, no solo la primera
        matchedRows.forEach(({ item }) => {
          const card = listEl.querySelector(`.date-card[data-id="${item.id}"]`);
          if (card) card.classList.add('is-highlighted');
        });
        const firstCard = listEl.querySelector(`.date-card[data-id="${matchedRows[0].item.id}"]`);
        if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (!arrivalModalShown) {
          arrivalModalShown = true;
          if (navigator.vibrate) navigator.vibrate(200);
          const matchedItems = matchedRows.map(({ item }) => item);
          if (matchedItems.length > 1) {
            showDayGroupModal(matchedItems, 0, {
              onSaved: () => renderList(searchInput.value),
              onDeleted: () => renderList(searchInput.value),
            });
          } else {
            showDayDetailModal(matchedItems[0], {
              onSaved: () => renderList(searchInput.value),
              onDeleted: () => renderList(searchInput.value),
            });
          }
        }
      }
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // FIX: antes de pintar la lista por primera vez, si venimos desde el
  // calendario apuntando a un día que es feriado, activamos el switch
  // "Feriados" automáticamente (si no, queda en modo "Días importantes" por
  // defecto y el feriado queda filtrado afuera, sin resaltado ni vibración,
  // hasta que el usuario toca el switch a mano).
  async function initView() {
    if (highlightDay && highlightMonth) {
      const allDays = await getSpecialDays();
      const targetItem = allDays.find((it) => matchesHighlightedDate(it, highlightDay, highlightMonth));
      if (targetItem && targetItem.category === 'feriado') {
        activateHolidaysMode();
      }
    }
    renderCategoryFilter();
    renderList('');
  }

  searchInput.addEventListener('input', () => renderList(searchInput.value));
  initView();
})();