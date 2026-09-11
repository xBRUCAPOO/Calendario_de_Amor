/* ==========================================================================
   FECHAS IMPORTANTES — calendario.js
   Renderiza la grilla del mes actual (o el que se navegue con las flechas),
   marca en color los días especiales guardados y conecta el modal
   compartido de "agregar día especial" (definido en common.js).
   ========================================================================== */

(function () {
  const monthLabel = document.getElementById('monthLabel');
  const weekdayRow = document.getElementById('weekdayRow');
  const grid = document.getElementById('calendarGrid');
  const today = todayAtMidnight();

  // Mes/año que se está mostrando (se puede navegar con las flechas)
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-11

  // Fila de iniciales de los días de la semana (empezando en lunes)
  weekdayRow.innerHTML = DIAS_SEMANA.map((d) => `<span>${d}</span>`).join('');

  function renderCalendar() {
    monthLabel.textContent = `${MESES[viewMonth]} ${viewYear}`;

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    // getDay(): 0=domingo..6=sábado -> lo convertimos para que la semana empiece en lunes
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const specialDays = getSpecialDays();
    // Índice rápido "día-mes" -> color, para no recorrer la lista en cada celda
    const specialByDayMonth = {};
    specialDays.forEach((item) => {
      const matchesYear = item.recurring || !item.year || item.year === viewYear;
      if (matchesYear) {
        specialByDayMonth[`${item.day}-${item.month}`] = item.colorIndex;
      }
    });

    let html = '';
    for (let i = 0; i < firstWeekday; i++) {
      html += `<div class="day-cell is-empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
      const colorIndex = specialByDayMonth[`${day}-${viewMonth + 1}`];
      const classes = ['day-cell'];
      let style = '';
      if (colorIndex) {
        classes.push('is-special');
        style = `style="--day-accent: var(--special-color-${colorIndex});"`;
      } else if (isToday) {
        classes.push('is-today');
      }
      html += `<div class="${classes.join(' ')}" ${style}>${day}</div>`;
    }
    grid.innerHTML = html;
  }

  document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  renderCalendar();

  // Modal compartido de "agregar día especial" (definido en common.js).
  // Al guardar, se vuelve a pintar el calendario para reflejar el nuevo día.
  const modal = initAddDayModal(() => renderCalendar());
  document.getElementById('openAddDay').addEventListener('click', () => modal.open());

  // Acceso directo desde index.html (?add=1): abre el modal automáticamente
  const params = new URLSearchParams(window.location.search);
  if (params.get('add') === '1') {
    modal.open();
  }
})();
