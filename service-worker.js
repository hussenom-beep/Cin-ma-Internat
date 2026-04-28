// ================================================================
// Service Worker — Cinéma Internat Blum
// Reçoit les notifications push et gère les clics dessus.
// ================================================================

// Activation immédiate du SW à la 1re install (pas d'attente)
self.addEventListener('install', (event) => {
  console.log('[SW] install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(self.clients.claim());
});

// ----------------------------------------------------------------
// Push : réception d'une notification depuis Edge Function
// ----------------------------------------------------------------
self.addEventListener('push', (event) => {
  console.log('[SW] push received');

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    console.warn('[SW] push payload non-JSON, fallback texte');
    payload = { title: 'Cinéma Internat', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Cinéma Internat';
  const options = {
    body:  payload.body || '',
    icon:  '/favicon-cinema.png',     // icône principale (192x192)
    badge: '/favicon-cinema.png',     // petit badge mono pour Android
    data:  { url: payload.url || '/' },
    vibrate: [120, 60, 120],
    // tag: groupe les notifs : une nouvelle remplace l'ancienne du même tag
    tag: payload.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ----------------------------------------------------------------
// Click : focus sur l'app ou ouverture si pas ouverte
// ----------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notification clicked');
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // Si une fenêtre/onglet de l'app est déjà ouverte → focus dessus
    for (const client of allClients) {
      if ('focus' in client) {
        try {
          await client.focus();
          // Si possible, naviguer vers l'URL ciblée
          if ('navigate' in client && targetUrl) {
            await client.navigate(targetUrl);
          }
          return;
        } catch (e) {
          console.warn('[SW] focus failed', e);
        }
      }
    }

    // Aucune fenêtre ouverte → on en ouvre une
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

// ----------------------------------------------------------------
// pushsubscriptionchange : quand le navigateur révoque la sub
// (rare, géré côté client à la prochaine ouverture de l'app)
// ----------------------------------------------------------------
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] pushsubscriptionchange — la sub doit être renouvelée côté front');
});
