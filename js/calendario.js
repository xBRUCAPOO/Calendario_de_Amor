/* ==========================================================================
   FECHAS IMPORTANTES — calendario.js
   Renderiza la grilla del mes actual (o el que se navegue con las flechas),
   marca en color los días especiales guardados, muestra un indicador "+N"
   cuando hay más de un día especial en la misma fecha, y al tocar un día
   especial te manda a su tarjeta en fechas.html.

   La posición (mes/año) que se está viendo se guarda en sessionStorage para
   que, si volvés desde fechas.html, el calendario aparezca en el mismo lugar
   en el que lo dejaste (y no siempre en el mes actual).
   ========================================================================== */

(function () {
  const VIEW_STATE_KEY = 'fechasImportantes.calendarView';
  const monthLabel = document.getElementById('monthLabel');
  const weekdayRow = document.getElementById('weekdayRow');
  const grid = document.getElementById('calendarGrid');
  const today = todayAtMidnight();

  // Recuperamos la última posición vista (si existe) o arrancamos en el mes actual
  const savedView = JSON.parse(sessionStorage.getItem(VIEW_STATE_KEY) || 'null');
  let viewYear = savedView ? savedView.year : today.getFullYear();
  let viewMonth = savedView ? savedView.month : today.getMonth(); // 0-11

  function saveViewState() {
    sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ year: viewYear, month: viewMonth }));
  }

  // Fila de iniciales de los días de la semana (empezando en lunes)
  weekdayRow.innerHTML = DIAS_SEMANA.map((d) => `<span>${d}</span>`).join('');

  async function renderCalendar() {
    monthLabel.textContent = `${MESES[viewMonth]} ${viewYear}`;
    saveViewState();

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    // getDay(): 0=domingo..6=sábado -> lo convertimos para que la semana empiece en lunes
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const specialDays = await getSpecialDays();
    // Por cada día del mes juntamos TODOS los especiales que caen ahí (para
    // poder mostrar cuántos hay, aunque el color visible sea el del último).
    // NUEVO: si un día especial abarca un rango de varias fechas (ej.
    // "Semana de la Dulzura", con endDay), se reparte en TODOS los días que
    // ocupa, no solo en el primero.
    const byDay = {};
    // NUEVO: por cada día, si la celda debe dibujar la línea que la conecta
    // con la de al lado (izquierda/derecha) para marcar visualmente que es
    // parte de un mismo rango de varios días. Solo se calcula para rangos
    // que caen enteros dentro de este mismo mes (no soporta rangos que
    // crucen de un mes a otro).
    const rangeConnections = {};
    specialDays.forEach((item) => {
      if (item.month !== viewMonth + 1) return;
      const matchesYear = item.recurring || !item.year || item.year === viewYear;
      if (!matchesYear) return;

      const endDay = item.endDay != null ? item.endDay : item.day;
      for (let d = item.day; d <= endDay; d++) {
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push(item);
      }

      if (item.endDay != null && (item.endMonth || item.month) === item.month) {
        for (let d = item.day; d <= item.endDay; d++) {
          // Columna de la semana para este día (0 = lunes ... 6 = domingo),
          // para no dibujar la línea hacia afuera de la fila cuando el
          // rango cruza de una semana a la siguiente.
          const col = (firstWeekday + (d - 1)) % 7;
          if (!rangeConnections[d]) rangeConnections[d] = {};
          if (d > item.day && col !== 0) rangeConnections[d].left = true;
          if (d < item.endDay && col !== 6) rangeConnections[d].right = true;
        }
      }
    });

    let html = '';
    for (let i = 0; i < firstWeekday; i++) {
      html += `<div class="day-cell is-empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
      const items = byDay[day];
      const classes = ['day-cell'];
      let style = '';
      let extraDot = '';
      if (isToday) classes.push('is-today');
      if (items && items.length > 0) {
        classes.push('is-special');
        const primary = items[items.length - 1]; // el color visible es el del último cargado
        style = `style="--day-accent: ${getAccentColorVar(primary)};"`;
        if (items.length > 1) extraDot = `<span class="extra-count">+${items.length - 1}</span>`;
        // Si alguno de los especiales del día es un feriado, lo aclaramos
        // con una etiqueta chica debajo del número (además del color)
        if (items.some((it) => it.category === 'feriado')) {
          extraDot += `<span class="day-holiday-label">Feriado</span>`;
        }
        // NUEVO: si este día forma parte de un rango de varias fechas,
        // agregamos la clase que dibuja la línea conectora (ver css/style.css)
        if (rangeConnections[day] && rangeConnections[day].left) classes.push('range-connect-left');
        if (rangeConnections[day] && rangeConnections[day].right) classes.push('range-connect-right');
      }
      html += `<div class="${classes.join(' ')}" ${style} data-day="${day}">${day}${extraDot}</div>`;
    }
    grid.innerHTML = html;

    // Tocar un día con evento(s) te lleva directo a su tarjeta en fechas.html
    grid.querySelectorAll('.day-cell.is-special').forEach((cell) => {
      cell.addEventListener('click', () => {
        const day = Number(cell.dataset.day);
        saveViewState();
        window.location.href = `fechas.html?day=${day}&month=${viewMonth + 1}`;
      });
    });
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

  // Modal compartido de "agregar/editar día especial" (definido en common.js).
  // Al guardar o borrar, se vuelve a pintar el calendario.
  document.getElementById('openAddDay').addEventListener('click', () => {
    openDayModal(null, () => renderCalendar(), () => renderCalendar());
  });

  // Acceso directo desde index.html (?add=1): abre el modal automáticamente
  const params = new URLSearchParams(window.location.search);
  if (params.get('add') === '1') {
    openDayModal(null, () => renderCalendar(), () => renderCalendar());
  }
})();
