/**
 * Service Worker - ตารางเข้าเยี่ยม และที่ตั้งร้านค้า
 *
 * หน้าที่:
 * 1. ทำให้แอปติดตั้งเป็นไอคอนหน้าจอโฮมได้ (ข้อกำหนดของ PWA ต้องมี Service Worker)
 * 2. แคชหน้าตาแอป (HTML/ไอคอน) ไว้ในเครื่อง เพื่อให้เปิดแอปได้เร็วขึ้นและยังเปิดได้แม้สัญญาณอ่อน
 * 3. ข้อมูลร้านค้า/ประวัติเข้าเยี่ยม (เรียกจาก Google Apps Script) จะ "ไม่ถูกแคช" เสมอ
 *    เพื่อให้ข้อมูลที่เห็นเป็นข้อมูลล่าสุดจริงทุกครั้งที่มีสัญญาณอินเทอร์เน็ต
 */

const CACHE_NAME = 'shop-visit-tracker-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ข้อมูลจาก Google Apps Script (Sheet backend) ต้องออนไลน์เสมอ ห้ามใช้ค่าที่แคชไว้
  if (url.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ success: false, error: 'ไม่มีสัญญาณอินเทอร์เน็ต' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // เฉพาะ GET request เท่านั้นที่นำมาแคช (ตัว HTML/ไอคอน/ไลบรารีจาก CDN)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
