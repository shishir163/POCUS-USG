/* POCUS USG — service worker: অ্যাপ ফোনে জমা রাখে, যাতে ইন্টারনেট ছাড়াও খোলে */
const VERSION = 'pocus-usg-v3';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* অ্যাপের পাতা: আগে ইন্টারনেট থেকে নতুনটা, না পেলে জমা রাখা কপি */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(ca => ca.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* নিজের ফাইল (আইকন, manifest): জমা কপি দেখাও, পেছনে নতুনটা আনো */
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  /* Firebase SDK ও ফন্ট: একবার আনলে জমা থাকবে */
  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); }
      return r;
    })));
  }
  /* বাকি সব (Firestore, login) সরাসরি ইন্টারনেটে — Firebase নিজেই ডেটা ফোনে জমা রাখে */
});
