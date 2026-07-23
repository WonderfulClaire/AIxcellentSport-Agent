/* AIxcellent 私享管家 · Service Worker
 * 策略：
 *  - 导航请求(HTML)：网络优先，离线时回退到缓存的应用外壳，保证更新能及时生效。
 *  - 静态资源(js/css/图片/字体)：stale-while-revalidate，秒开且后台更新。
 *  - 后端 API(跨域)：只走网络，绝不缓存，避免脏数据。
 */
const VERSION = "aix-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const SHELL_URLS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 跨域（后端 API / CDN 模型）不缓存，直接放行网络
  if (url.origin !== self.location.origin) return;

  // 导航：网络优先，离线回退外壳
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // 同源静态资源：stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
