/* ==========================================================================
   FECHAS IMPORTANTES — notifications.js
   Recordatorios locales para los días especiales que tienen "avisarme X días
   antes" configurado. Usa la Notification API del navegador.

   Importante (se lo explicamos también al usuario en el panel de ajustes):
   esto son recordatorios LOCALES. Funcionan mientras el navegador/la PWA se
   abre en algún momento ese día (gracias al service worker, incluso en
   segundo plano si el sistema lo permite). NO es lo mismo que un push real
   enviado por un servidor: eso requiere una infraestructura aparte (VAPID +
   una función programada en el backend) que no viene incluida en esta
   entrega para no arriesgar algo a medio probar.
   -------------------------------------------------------------------------- */

const NOTIFIED_LOG_KEY = 'fechasImportantes.notifiedLog.v1';

function getNotifiedLog() {
  try { return JSON.parse(localStorage.getItem(NOTIFIED_LOG_KEY) || '[]'); } catch (e) { return []; }
}

function markNotified(key) {
  const log = getNotifiedLog();
  log.push(key);
  // nos quedamos solo con los últimos 200 registros para no crecer sin límite
  localStorage.setItem(NOTIFIED_LOG_KEY, JSON.stringify(log.slice(-200)));
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

async function showLocalNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
      return;
    } catch (e) { /* seguimos al fallback de abajo */ }
  }
  new Notification(title, { body, icon: '/icons/icon-192.png' });
}

// Revisa todos los días especiales y dispara una notificación local para los
// que hoy caigan exactamente en su "avisarme X días antes".
async function checkAndNotifyDueReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const list = await getSpecialDays();
  const today = todayAtMidnight();
  const notifiedLog = getNotifiedLog();

  list.forEach((item) => {
    if (item.remindDaysBefore == null) return;
    const countdown = getCountdownInfo(item);
    if (countdown.diffDays !== item.remindDaysBefore) return;
    const dedupeKey = `${item.id}:${countdown.target.getFullYear()}`;
    if (notifiedLog.includes(dedupeKey)) return;

    const when = countdown.diffDays === 0 ? 'es hoy' : `es en ${countdown.diffDays} día${countdown.diffDays === 1 ? '' : 's'}`;
    showLocalNotification(item.name, `${when} (${formatDayMonth(item.day, item.month)})`);
    markNotified(dedupeKey);
  });
}

// Se ejecuta al abrir cualquier página, y a partir de ahí una vez por hora
// mientras la pestaña siga abierta.
document.addEventListener('DOMContentLoaded', () => {
  checkAndNotifyDueReminders();
  setInterval(checkAndNotifyDueReminders, 60 * 60 * 1000);
});

// Mejor esfuerzo: si el navegador soporta Periodic Background Sync (Chrome/
// Android con la PWA instalada), lo registramos para poder revisar
// recordatorios aunque la app esté cerrada. No todos los navegadores lo
// soportan (iOS Safari no), por eso es un intento silencioso, no una promesa.
async function tryRegisterPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await reg.periodicSync.register('check-reminders', { minInterval: 12 * 60 * 60 * 1000 });
      }
    }
  } catch (e) { /* no soportado en este navegador, seguimos sin romper nada */ }
}

/* --------------------------------------------------------------------------
   PANEL DE AJUSTES DE NOTIFICACIONES (ícono de campanita en el top bar)
   -------------------------------------------------------------------------- */

function buildNotificationSettingsHTML() {
  const supported = 'Notification' in window;
  const permission = supported ? Notification.permission : 'unsupported';
  const statusLabel = { granted: 'Activadas', denied: 'Bloqueadas por el navegador', default: 'No configuradas', unsupported: 'No soportadas en este navegador' }[permission];

  return `
    <div class="modal-overlay" id="notifSettingsOverlay">
      <div class="modal-sheet">
        <h2>Recordatorios</h2>
        <p class="field-hint" style="margin-bottom: var(--space-md);">Estado actual: <strong>${statusLabel}</strong></p>
        <p class="field-hint" style="margin-bottom: var(--space-lg);">
          Configurá "avisarme X días antes" en cada día especial (al agregarlo o editarlo). Son recordatorios locales del navegador: para que suenen, la app tiene que haberse abierto en algún momento ese día.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="closeNotifSettings">
            <span class="material-symbols-outlined">close</span> Cerrar
          </button>
          <button type="button" class="btn btn-primary" id="enableNotifBtn" ${permission === 'granted' ? 'disabled' : ''}>
            <span class="material-symbols-outlined">notifications_active</span> ${permission === 'granted' ? 'Ya activadas' : 'Activar'}
          </button>
        </div>
      </div>
    </div>`;
}

function openNotificationSettings() {
  const mount = document.createElement('div');
  mount.innerHTML = buildNotificationSettingsHTML();
  const overlay = mount.firstElementChild;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  function close() { overlay.remove(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#closeNotifSettings').addEventListener('click', close);
  overlay.querySelector('#enableNotifBtn').addEventListener('click', async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      tryRegisterPeriodicSync();
      checkAndNotifyDueReminders();
    }
    close();
    openNotificationSettings(); // reabrimos para mostrar el estado actualizado
  });
}
