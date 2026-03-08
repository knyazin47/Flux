// Flux Service Worker — local notification scheduler
// No push server needed: schedules notifications via setTimeout when SW is active.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Scheduled timer id (one active at a time)
let notifTimer = null;

function clearTimer() {
  if (notifTimer !== null) {
    clearTimeout(notifTimer);
    notifTimer = null;
  }
}

function scheduleNext(h, m) {
  clearTimer();
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const ms = target - now;

  notifTimer = setTimeout(() => {
    self.registration.showNotification('Flux — Физика', {
      body: 'Не забудь повторить физику сегодня!',
      icon: '/web-app-manifest-192x192.png',
      badge: '/favicon-96x96.png',
      tag: 'daily-reminder',
      renotify: true,
      data: { url: '/' },
    });
    scheduleNext(h, m); // schedule tomorrow
  }, ms);
}

self.addEventListener('message', (event) => {
  const { type, enabled, time } = event.data || {};
  if (type !== 'SCHEDULE_NOTIF') return;

  clearTimer();
  if (!enabled || !time) return;

  const parts = String(time).split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return;

  scheduleNext(h, m);
});

// Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
