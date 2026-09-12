/* ==========================================================================
   FECHAS IMPORTANTES — service-worker.js (vive en la raíz a propósito, para
   que su scope cubra todo el sitio: /, /pages/, /css/, /js/, /icons/)
   - Cachea el "app shell" para que la PWA abra offline.
   - Las llamadas a /api/... NO se cachean acá: common.js ya sabe qué hacer
     si el fetch falla (usa la copia en localStorage).
   - Mejor esfuerzo de recordatorios en segundo plano vía Periodic Background
     Sync (donde el navegador lo soporte).
   ========================================================================== */

const CACHE_NAME = 'fechas-importantes-v9';
const APP_SHELL = [
  '/',
  '/index.html',
  '/pages/calendario.html',
  '/pages/fechas.html',
  '/css/style.css?v=8',
  '/js/common.js?v=8',
  '/js/notifications.js?v=8',
  '/js/index.js?v=8',
  '/js/calendario.js?v=8',
  '/js/fechas.js?v=8',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return; // ver nota arriba

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // OJO: hay que pasar { redirect: 'follow' } explícito. Cloudflare Pages
      // redirige las URLs "*.html" a su versión sin extensión, y sin esto
      // Chrome corta la conexión con "a redirected response was used for a
      // request whose redirect mode is not follow" (bug clásico de Service
      // Workers con fetch(event.request) en navegaciones).
      const network = fetch(event.request, { redirect: 'follow' }).then((response) => {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/pages/fechas.html');
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkRemindersInBackground());
  }
});

async function checkRemindersInBackground() {
  try {
    const res = await fetch('/api/days');
    if (!res.ok) return;
    const list = await res.json();
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (const item of list) {
      if (item.remindDaysBefore == null) continue;
      let target = new Date(todayMidnight.getFullYear(), item.month - 1, item.day);
      if (!item.recurring && item.year) target = new Date(item.year, item.month - 1, item.day);
      else if (target < todayMidnight) target = new Date(todayMidnight.getFullYear() + 1, item.month - 1, item.day);
      const diffDays = Math.round((target - todayMidnight) / 86400000);
      if (diffDays === item.remindDaysBefore) {
        self.registration.showNotification(item.name, {
          body: diffDays === 0 ? 'Es hoy' : `Es en ${diffDays} día(s)`,
          icon: '/icons/icon-192.png',
        });
      }
    }
  } catch (e) { /* sin conexión: no hacemos nada, se reintentará más tarde */ }
}