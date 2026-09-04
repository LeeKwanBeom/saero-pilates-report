// 새로필라테스 리포트 서비스워커
// 전략: network-first — 인터넷이 되면 항상 최신 데이터를 받아오고,
// 인터넷이 안 될 때만 마지막으로 성공했던 화면(캐시)을 보여줌.
// 데이터가 매주 바뀌는 리포트라 오프라인일 때만 캐시를 쓰도록 설계함.

const CACHE_NAME = 'saero-report-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // GET 요청만 처리 (다른 메서드는 그대로 통과)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 네트워크 성공 시: 최신 응답을 캐시에 저장해두고 그대로 반환
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 실패(오프라인) 시: 캐시에 저장된 마지막 버전을 반환
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || Response.error();
        });
      })
  );
});
