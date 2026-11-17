/* 電波がなくても使えるようにするしくみ。アプリやお話を直したら VERSION を上げる */
const VERSION = "2026-11-17h";
const CACHE = "ondoku-" + VERSION;
const AUDIO = "ondoku-audio";   // 音声は版が変わっても消さない（一度聞いたチャプターを保存）
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "stories/index.json", "stories/einstein/story.json", "stories/einstein/icon.png",
  "stories/edo/story.json", "stories/edo/icon.png",
  "stories/hidden/story.json", "stories/hidden/icon.png",
  "stories/630days/story.json", "stories/630days/icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((k) => k.startsWith("ondoku-") && k !== CACHE && k !== AUDIO)
    .map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skip") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (/\/audio\/[^/]+\.(mp3|m4a|aac|wav|ogg)$/i.test(url.pathname)) {
      if (url.searchParams.has("net")) {
        // まだ保存していない音声：ふつうにネットから再生し、裏でファイル全体を保存する
        // （ネットの応答と保存した応答を1つの再生でまぜると、Chromeで止まるため分ける）
        const clean = url.origin + url.pathname;
        e.waitUntil(caches.open(AUDIO).then((c) => c.match(clean).then((hit) => hit || fetch(clean)
          .then((res) => { if (res.ok && res.status === 200) return c.put(clean, res); }))).catch(() => {}));
        return;
      }
      e.respondWith(audioResponse(e, url.href, req.headers.get("range")));
    } else {
      // 自分のファイル：保存したものを使う（新しい版は VERSION を上げて届ける）
      e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    }
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // 文字（フォント）：保存したものを使い、裏で新しくする
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});

// 音声：保存したものから返す（途中から再生できるよう Range に答える）
async function audioResponse(e, href, range) {
  const cache = await caches.open(AUDIO);
  const hit = await cache.match(href);
  if (!hit) return fetch(e.request);
  if (!range) return hit;
  const buf = await hit.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start, end;
  if (!m || (m[1] === "" && m[2] === "")) { start = 0; end = size - 1; }
  else if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": hit.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
