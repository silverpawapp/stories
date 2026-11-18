/* 英語で読むおはなし */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const main = $("#main");
const backBtn = $("#backBtn");
const where = $("#where");
const APP_NAME = "英語で読むおはなし";

let stories = [];          // stories/index.json
let story = null;          // 開いているお話（story.json）
let storyBase = "";        // "stories/einstein/"
let storyInfo = null;      // stories/index.json の、開いているお話の行
let chIndex = 0;           // 開いているチャプター（0から）
const audio = new Audio();
audio.preload = "metadata";
const SPEEDS = [0.8, 1.0, 1.2];
let speed = parseFloat(store("speed"));
if (!SPEEDS.includes(speed)) speed = 1.0;
function applySpeed() {
  audio.defaultPlaybackRate = speed;
  audio.playbackRate = speed;
  try { audio.preservesPitch = true; } catch (e) {}
}

/* ---- 小さな道具 ---- */
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
}
function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch (e) { return null; }
}
function fmt(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}

/* ---- メニュー ---- */
async function showMenu() {
  stopAudio();
  story = null;
  backBtn.hidden = true;
  where.textContent = APP_NAME;
  document.title = APP_NAME;
  main.replaceChildren(el("p", { class: "muted small", text: "読みこみ中…" }));
  try {
    if (!stories.length) stories = (await getJSON("stories/index.json")).stories;
  } catch (e) {
    main.replaceChildren(el("p", { text: "お話の一覧を読みこめませんでした。電波のある所で開き直してください。" }));
    return;
  }
  const card = (s) => el("button", { class: "story-btn", type: "button", onclick: () => openStory(s) },
    s.icon ? el("img", { class: "story-icon", src: s.icon, alt: "", width: "88", height: "88" }) : null,
    el("div", { class: "story-txt" },
      el("div", { class: "t", lang: "en", text: s.title }),
      s.subtitle ? el("div", { class: "sub", lang: "en", text: s.subtitle }) : null,
      el("div", { class: "j", text: s.titleJa }),
      el("div", { class: "meta muted", text: s.meta || `${s.chapters}チャプター` })));
  // 難しさで3つに分ける（index.json の level：1＝初級、2＝中級、3＝上級）
  const LEVELS = [
    [1, "初級", "短い会話。文が短く、やさしい単語が中心"],
    [2, "中級", "少し長い会話や、章に分かれた文章"],
    [3, "上級", "難しい単語が多い会話や、長い文章"],
  ];
  const list = LEVELS.flatMap(([lv, name, note]) => {
    const items = stories.filter((s) => (s.level || 2) === lv);
    if (!items.length) return [];
    return [el("h2", { class: "level lv" + lv }, el("span", { class: "level-name", text: name }),
      el("span", { class: "level-note", text: note })), ...items.map(card)];
  });
  main.replaceChildren(
    el("div", { class: "about" },
      el("p", { class: "about-lead", text: "英語の音声を聞きながら、物語や偉人へのインタビューを読むアプリです。耳と目の両方を使って、英語を読む力と聞く力をのばします。" }),
      el("details", {},
        el("summary", { text: "使い方のヒント" }),
        el("ol", {},
          el("li", { text: "まずは音声を流しながら、英語の文字を目で追いましょう。速いと感じたら 0.8倍に。" }),
          el("li", { text: "わからない単語は、色の付いた単語をタップして確かめます。日本語訳は、最後の答え合わせに使いましょう。" }),
          el("li", { text: "同じお話を何回も聞くと、聞き取れる部分がふえていきます。慣れたら音声のすぐあとについて声に出して読み、1.2倍にも挑戦。" }),
          el("li", { text: "「ちょっとむずかしい」くらいのレベルを選びましょう。1日1チャプターでも、毎日つづけるのがいちばんの近道です。" })))),
    el("div", { class: "help" },
      el("p", {}, "色の付いた単語（",
        el("span", { class: "w", style: "cursor:default", text: "example" }),
        "）をタップすると、その文での意味が出ます。"),
      el("p", {}, "会話のお話では、せりふの横の", helpBubble(),
        "を押すと、そのせりふの日本語訳が出ます。ほかのお話では、チャプターの最後の「日本語訳を見る」で訳が出ます。")),
    ...list,
    el("div", { class: "credit" },
      el("p", { text: "お話は英語学習のために作ったフィクションです。偉人へのインタビューや登場人物の会話は、史実や言い伝えをもとに想像して書いたもので、本人が実際に話した言葉ではありません。" }),
      el("p", { text: "色を付けた単語は、英検3級（中学卒業程度）より上を目安に選んでいます。英検は公益財団法人 日本英語検定協会の登録商標です。このアプリは日本英語検定協会とは関係ありません。" }),
      el("p", { text: "単語のレベルは CEFR-J Wordlist Version 1.5（東京外国語大学 投野由紀夫 編）を参考にしています。" }),
      el("p", { text: "日本語訳と単語の説明は、学習の参考として作ったものです。" })));
  main.scrollTop = 0;
}

/* ---- お話を開く ---- */
async function openStory(s) {
  storyBase = "stories/" + s.id + "/";
  storyInfo = s;
  main.replaceChildren(el("p", { class: "muted small", text: "読みこみ中…" }));
  try {
    story = await getJSON(storyBase + "story.json");
  } catch (e) {
    main.replaceChildren(el("p", { text: "お話を読みこめませんでした。電波のある所で開き直してください。" }));
    return;
  }
  backBtn.hidden = false;
  where.textContent = s.short || s.titleJa;
  document.title = s.title + "｜" + APP_NAME;
  const saved = parseInt(store("ch:" + s.id), 10);
  chIndex = Number.isInteger(saved) && saved >= 0 && saved < story.chapters.length ? saved : 0;
  showChapter();
}

/* ---- チャプターの画面 ---- */
let ui = {};
function showChapter() {
  stopAudio();
  const ch = story.chapters[chIndex];
  store("ch:" + story.id, String(chIndex));

  // チャプターの切り替え
  const chips = el("div", { class: "chips", role: "group", "aria-label": "チャプター" },
    story.chapters.map((c, i) => el("button", {
      class: "chip", type: "button", "aria-pressed": String(i === chIndex),
      "aria-label": "チャプター" + c.n, text: String(c.n),
      onclick: () => { if (i !== chIndex) { chIndex = i; showChapter(); } },
    })));

  // プレーヤー
  ui.play = el("button", { class: "play", type: "button", disabled: true, onclick: togglePlay, text: "▶ 再生" });
  ui.seek = el("input", { class: "seek", type: "range", min: "0", max: "0", step: "0.1", value: "0", disabled: true, "aria-label": "再生する位置" });
  ui.cur = el("span", { text: "0:00" });
  ui.dur = el("span", { text: "--:--" });
  ui.msg = el("div", { class: "audio-msg", hidden: true });
  ui.seek.addEventListener("input", () => { ui.dragging = true; ui.cur.textContent = fmt(+ui.seek.value); });
  ui.seek.addEventListener("change", () => { audio.currentTime = +ui.seek.value; ui.dragging = false; });
  const speedBtns = SPEEDS.map((v) => el("button", {
    class: "speed", type: "button", "aria-pressed": String(v === speed), "aria-label": v + "倍の速さ",
    text: v.toFixed(1) + "×",
    onclick: () => {
      speed = v; store("speed", String(v)); applySpeed();
      speedBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(SPEEDS[i] === speed)));
    },
  }));
  const player = el("div", { class: "player" },
    el("div", { class: "player-box" }, ui.play,
      el("div", { class: "seek-wrap" }, ui.seek, el("div", { class: "time" }, ui.cur, ui.dur)),
      el("div", { class: "speeds", role: "group", "aria-label": "再生の速さ" },
        el("span", { class: "speeds-label", text: "速さ" }), speedBtns)),
    ui.msg);

  // 本文
  // Chapter 1 の音声は、お話の題名と副題から読み上げるので、本文の上にも出す
  const talk = !!story.dialogue;
  const storyTr = storyInfo && storyInfo.titleTr ? storyInfo.titleTr + (storyInfo.subtitleTr ? "　" + storyInfo.subtitleTr : "") : "";
  const storyTrBox = talk && storyTr ? trBox(storyTr) : null;
  const storyHead = chIndex === 0 ? el("div", { class: "story-head", lang: "en" },
    el("div", { class: "story-title" }, story.title, storyTrBox ? trBtn(storyTrBox) : null),
    story.subtitle ? el("div", { class: "story-sub", text: story.subtitle }) : null, storyTrBox) : null;
  const chTrBox = talk && ch.titleJa ? trBox(ch.titleJa) : null;
  const title = ch.title.length ? el("div", { class: "ch-title", lang: "en" },
    el("span", { class: "num", text: "Chapter " + ch.n }), ...segs(ch.title), chTrBox ? trBtn(chTrBox) : null, chTrBox) : null;
  const speakers = [];
  // 長い名前は、札だけ頭文字で短くする（本文と音声はそのまま）
  const SHORT_WHO = { "Nightingale": "N.", "Hokusai": "H.", "Mr. Brown": "Mr. B" };
  const line = (p, i) => {
    const m = talk && typeof p[0] === "string" && /^([A-Z][A-Za-z. ]*): $/.exec(p[0]);
    if (!m) return el("p", {}, ...segs(p));
    if (!speakers.includes(m[1])) speakers.push(m[1]);
    // 訳の「オオカミ：」などの話し手の部分は、札があるので取る
    const ja = (ch.ja[i] || "").replace(/^[^：「]{1,8}：/, "");
    const box = ja ? trBox(ja) : null;
    return el("p", { class: "line" }, el("span", { class: "who who" + (speakers.indexOf(m[1]) % 2), text: SHORT_WHO[m[1]] || m[1], title: m[1] }),
      el("span", { class: "say" }, ...segs(p.slice(1)), box ? trBtn(box) : null, box));
  };
  const text = el("div", { class: "text" + (talk ? " talk" : ""), lang: "en" }, ch.paras.map(line));
  // 話し手の札は、いちばん長い名前（Mr. Brown・Nightingale など）に幅をそろえる
  if (talk) requestAnimationFrame(() => {
    const ws = [...text.querySelectorAll(".who")];
    if (ws.length) text.style.setProperty("--who", Math.max(...ws.map((w) => w.scrollWidth)) + "px");
  });

  // 日本語訳（ボタンで開く）
  const jaBox = el("div", { class: "ja-box", hidden: true, lang: "ja" },
    chIndex === 0 && storyInfo && storyInfo.titleTr ? el("p", { class: "ja-story" }, storyInfo.titleTr,
      storyInfo.subtitleTr ? el("br") : null, storyInfo.subtitleTr || null) : null,
    ch.titleJa ? el("h2", { text: ch.titleJa }) : null, ch.ja.map((t) => el("p", { text: t })));
  const jaBtn = el("button", { class: "ja-btn", type: "button", "aria-expanded": "false", text: "日本語訳を見る" });
  jaBtn.addEventListener("click", () => {
    const open = jaBox.hidden;
    jaBox.hidden = !open;
    jaBtn.textContent = open ? "日本語訳をとじる" : "日本語訳を見る";
    jaBtn.setAttribute("aria-expanded", String(open));
    if (open) jaBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // 前へ・次へ
  const last = story.chapters.length - 1;
  const nav = el("div", { class: "nav" },
    el("button", { class: "sub", type: "button", disabled: chIndex === 0, onclick: () => { chIndex--; showChapter(); }, text: "＜ 前のチャプター" }),
    el("button", { type: "button", disabled: chIndex === last, onclick: () => { chIndex++; showChapter(); }, text: "次のチャプター ＞" }));

  const one = story.chapters.length === 1;
  main.replaceChildren(...[one ? null : chips, player, storyHead, title, text,
    talk ? null : jaBtn, talk ? null : jaBox, one ? null : nav].filter(Boolean));
  main.scrollTop = 0;
  const on = chips.querySelector('[aria-pressed="true"]');
  if (on) on.scrollIntoView({ block: "nearest", inline: "center" });

  loadAudio(storyBase + ch.audio);
}

// 会話の訳：吹き出しボタンを押すと、そのすぐ下に日本語訳を出す
const BUBBLE = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor"/><text x="12" y="13.6" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="sans-serif">訳</text></svg>';
function helpBubble() {
  const s = el("span", { class: "tr-btn help-bubble", "aria-hidden": "true" });
  s.innerHTML = BUBBLE;
  return s;
}
function trBox(text) {
  return el("span", { class: "tr", lang: "ja", hidden: true, text });
}
function trBtn(box) {
  const b = el("button", { class: "tr-btn", type: "button", "aria-label": "日本語訳", "aria-expanded": "false" });
  b.innerHTML = BUBBLE;
  b.addEventListener("click", () => {
    const open = box.hidden;
    box.hidden = !open;
    b.setAttribute("aria-expanded", String(open));
  });
  return b;
}

// 本文のかたまりを、文字と「タップできる語」に分ける
function segs(list) {
  return list.map((s) => {
    if (typeof s === "string") return document.createTextNode(s);
    const g = story.gloss[s.g];
    if (!g) return document.createTextNode(s.t);
    return el("button", { class: "w", type: "button", "data-g": s.g, onclick: (e) => showWord(e.currentTarget, s.t, g), text: s.t });
  });
}

/* ---- 語の説明 ---- */
const sheet = $("#sheet");
let lastWordBtn = null;
function showWord(btn, surface, g) {
  if (lastWordBtn) lastWordBtn.classList.remove("now");
  lastWordBtn = btn;
  btn.classList.add("now", "seen");
  $("#sheetWord").textContent = surface;
  const base = $("#sheetBase");
  if (g.base && g.base.toLowerCase() !== surface.toLowerCase()) {
    base.replaceChildren("もとの形：", el("b", { lang: "en", text: g.base }));
    base.hidden = false;
  } else base.hidden = true;
  $("#sheetMean").textContent = g.ja;
  sheet.hidden = false;
  $("#sheetClose").focus({ preventScroll: true });
}
function hideWord() {
  if (sheet.hidden) return;
  sheet.hidden = true;
  if (lastWordBtn) { lastWordBtn.classList.remove("now"); lastWordBtn.focus({ preventScroll: true }); }
}
$("#sheetClose").addEventListener("click", hideWord);
sheet.addEventListener("click", (e) => { if (e.target === sheet) hideWord(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideWord(); });

/* ---- 音声 ---- */
// 保存ずみの音声はそのまま、まだなら「?net=1」を付けてネットから読む（sw.js が裏で保存する）
let loadToken = 0;
async function loadAudio(src) {
  ui.ready = false;
  const token = ++loadToken;
  let cached = false;
  try { cached = !!(await caches.match(new URL(src, location.href).href)); } catch (e) {}
  if (token !== loadToken || story === null) return;
  audio.src = cached || !navigator.serviceWorker || !navigator.serviceWorker.controller ? src : src + "?net=1";
  audio.load();
}
function stopAudio() {
  loadToken++;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
function togglePlay() {
  applySpeed();
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
function setPlayLabel() {
  if (!ui.play) return;
  ui.play.textContent = audio.paused ? "▶ 再生" : "❚❚ 一時停止";
  ui.play.setAttribute("aria-label", audio.paused ? "再生" : "一時停止");
}
audio.addEventListener("loadedmetadata", () => {
  applySpeed();
  if (!ui.seek) return;
  ui.ready = true;
  ui.seek.max = String(audio.duration || 0);
  ui.seek.disabled = false;
  ui.play.disabled = false;
  ui.dur.textContent = fmt(audio.duration);
  ui.msg.hidden = true;
});
audio.addEventListener("timeupdate", () => {
  if (!ui.seek || ui.dragging) return;
  ui.seek.value = String(audio.currentTime);
  ui.cur.textContent = fmt(audio.currentTime);
});
audio.addEventListener("play", setPlayLabel);
audio.addEventListener("pause", setPlayLabel);
audio.addEventListener("ended", () => { setPlayLabel(); });
audio.addEventListener("error", () => {
  if (!ui.msg || !audio.getAttribute("src")) return;
  ui.play.disabled = true;
  ui.seek.disabled = true;
  ui.msg.hidden = false;
  ui.msg.textContent = navigator.onLine
    ? "このチャプターの音声は、まだありません。"
    : "音声を読みこめませんでした。一度聞いた音声は、電波がなくても聞けます。";
});

/* ---- 画面の切り替え ---- */
backBtn.addEventListener("click", () => { hideWord(); showMenu(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) audio.pause(); });

/* ---- 電波がなくても使えるしくみ ---- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const ask = (w) => {
      $("#update").hidden = false;
      $("#updateBtn").onclick = () => w.postMessage("skip");
    };
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) ask(w);
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

showMenu();
