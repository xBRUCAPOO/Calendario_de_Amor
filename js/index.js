/* ==========================================================================
   FECHAS IMPORTANTES — index.js
   Lógica de la home: revisa si "hoy" coincide con algún día especial
   guardado y muestra el banner correspondiente; conecta el botón de
   recordatorios (definido en notifications.js).
   ========================================================================== */

(function () {
  document.getElementById('openNotifSettings').addEventListener('click', openNotificationSettings);

  async function renderTodayBanner() {
    const today = todayAtMidnight();
    const list = await getSpecialDays();
    const todays = findDaysOn(list, today.getDate(), today.getMonth() + 1, today.getFullYear());
    if (todays.length === 0) return;

    const banner = document.getElementById('todayBanner');
    const title = document.getElementById('todayBannerTitle');
    const first = todays[0];

    title.textContent = todays.length === 1
      ? `¡Hoy es ${first.name}!`
      : `¡Hoy es ${first.name} y ${todays.length - 1} día especial más!`;
    banner.style.setProperty('--banner-accent', `var(--special-color-${first.colorIndex})`);
    banner.style.display = 'flex';
  }

  renderTodayBanner();
})();
