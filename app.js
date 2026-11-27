/* 英語で聞くストーリー */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const main = $("#main");
const backBtn = $("#backBtn");
const where = $("#where");
const APP_NAME = "英語で聞くストーリー";

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

/* ---- ホーム（2つのコーナー）と一覧 ---- */
// section："home"＝ホーム、"stories"＝お話読み聞かせ、"toefl"＝TOEFL対策
const SECTIONS = { stories: "お話読み聞かせ", toefl: "TOEFL対策" };
let section = "home";
const inSection = (s, sec) => (s.section || "stories") === sec;

async function loadIndex() {
  if (!stories.length) stories = (await getJSON("stories/index.json")).stories;
}
function startPage(title, back) {
  stopAudio();
  story = null;
  backBtn.hidden = !back;
  where.textContent = title;
  document.title = title === APP_NAME ? APP_NAME : title + "｜" + APP_NAME;
  main.replaceChildren(el("p", { class: "muted small", text: "読みこみ中…" }));
}
function loadError() {
  main.replaceChildren(el("p", { text: "一覧を読みこめませんでした。電波のある所で開き直してください。" }));
}

// 入口のピクトグラム（線だけのシンプルな絵。色は CSS の color に合わせる）
const PICTO = {
  stories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/></svg>',
  toefl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 10v6"/></svg>',
};
function picto(sec, cls) {
  const sp = el("span", { class: cls + " pic-" + sec, "aria-hidden": "true" });
  sp.innerHTML = PICTO[sec];
  return sp;
}

async function showHome() {
  section = "home";
  startPage(APP_NAME, false);
  try { await loadIndex(); } catch (e) { return loadError(); }
  const n = (sec) => stories.filter((s) => inSection(s, sec)).length;
  const goBtn = (sec, desc, unit) => el("button", { class: "sec-btn sec-" + sec, type: "button", onclick: () => showList(sec) },
    picto(sec, "sec-mark"),
    el("span", { class: "sec-txt" },
      el("span", { class: "sec-name", text: SECTIONS[sec] }),
      el("span", { class: "sec-desc", text: desc }),
      el("span", { class: "sec-count", text: n(sec) + unit })),
    el("span", { class: "sec-go", "aria-hidden": "true", text: "＞" }));
  const step = (t) => el("li", { text: t });
  main.replaceChildren(
    el("p", { class: "home-lead", text: "英語の音声を聞きながら読む、英語の練習アプリです。目的に合わせて、2つのコーナーから選んでください。" }),
    goBtn("stories", "物語・偉人へのインタビュー・会話。楽しく聞いて、読む力と聞く力をのばします。", "話"),
    goBtn("toefl", "理科や社会など、学校で習う内容を短い英文で。教科の単語を覚え、TOEFLと同じ形の問題でたしかめます。", "ブロック"),
    el("section", { class: "howto" },
      el("h2", { text: "このアプリの活用方法" }),
      el("h3", {}, picto("stories", "h3-pic"), "お話読み聞かせ"),
      el("ol", {},
        step("音声を流しながら、英語の文字を目で追いましょう。速いと感じたら 0.8倍に。"),
        step("わからない単語は、色の付いた単語をタップして確かめます。日本語訳は、最後の答え合わせに使いましょう。"),
        step("同じお話を何回も聞くと、聞き取れる部分がふえていきます。慣れたら音声のすぐあとについて声に出して読み、1.2倍にも挑戦。"),
        step("「ちょっとむずかしい」くらいのレベルを選び、1日1チャプターでも毎日つづけましょう。")),
      el("h3", {}, picto("toefl", "h3-pic"), "TOEFL対策"),
      el("ol", {},
        step("まず音声を1回聞きながら、英語の文字を目で追います。正しい発音を先に耳に入れておくと、まちがった読み方で覚えずにすみます。"),
        step("次に、音声なしで自分で読みます。知らない単語があっても止まらず、前後の文から意味を考えましょう（TOEFLの本番と同じ読み方）。"),
        step("色の付いた単語をタップして確かめます。緑はその教科の単語、紫はどの教科の文章にもよく出る単語です。"),
        step("意味がとれない段落だけ、段落の最後の訳ボタンで確かめます。"),
        step("もう一度音声を流し、音声のすぐあとについて声に出して読んでみましょう。"),
        step("題名の下の「このお話の単語リスト」で単語を復習します。特に紫の単語は、TOEFLのいろいろな文章に出てくるので優先して覚えましょう。"),
        step("最後に確認問題（5問）に答えます。まちがえた問題は解説を読み、本文のどこに答えがあるか探しましょう。")),
      el("p", { class: "howto-note", text: "TOEFL対策の文章は、日本の学校で習う内容をもとにしています。内容を日本語で知っているので、英語そのものに集中できます。" })),
    el("div", { class: "credit" },
      el("p", { text: "お話は英語学習のために作ったフィクションです。偉人へのインタビューや登場人物の会話は、史実や言い伝えをもとに想像して書いたもので、本人が実際に話した言葉ではありません。" }),
      el("p", { text: "色を付けた単語は、英検3級（中学卒業程度）より上を目安に選んでいます。英検は公益財団法人 日本英語検定協会の登録商標です。このアプリは日本英語検定協会とは関係ありません。" }),
      el("p", { text: "TOEFL は ETS の登録商標です。このアプリは ETS とは関係ありません。確認問題は、TOEFL iBT の問題の形を参考にして作った練習問題です。" }),
      el("p", { text: "単語のレベルは CEFR-J Wordlist Version 1.5（東京外国語大学 投野由紀夫 編）を参考にしています。" }),
      el("p", { text: "日本語訳と単語の説明は、学習の参考として作ったものです。" })));
  main.scrollTop = 0;
}

function storyCard(s) {
  // TOEFL対策：小さなカード（教科の頭文字＋番号のしるしと、英語の題名だけ）
  if (s.section === "toefl") {
    const mark = ({ sci: "理", soc: "社", math: "数" })[s.subjectKey] || (s.subject || "").slice(0, 1);
    const num = (s.code || "").slice(-2);
    return el("button", { class: "story-btn compact", type: "button", onclick: () => openStory(s), "aria-label": s.subject + num + "　" + s.title },
      el("span", { class: "subj-badge mini subj-" + (s.subjectKey || "x"), "aria-hidden": "true", text: mark + num }),
      el("span", { class: "t", lang: "en", text: s.title }));
  }
  const badge = s.subject ? el("span", { class: "subj-badge subj-" + (s.subjectKey || "x"), "aria-hidden": "true", text: s.subject }) : null;
  return el("button", { class: "story-btn", type: "button", onclick: () => openStory(s) },
    s.icon ? el("img", { class: "story-icon", src: s.icon, alt: "", width: "88", height: "88" }) : badge,
    el("div", { class: "story-txt" },
      el("div", { class: "t", lang: "en", text: s.title }),
      s.subtitle ? el("div", { class: "sub", lang: "en", text: s.subtitle }) : null,
      el("div", { class: "j", text: s.titleJa }),
      el("div", { class: "meta muted", text: s.meta || `${s.chapters}チャプター` })));
}

async function showList(sec) {
  section = sec;
  startPage(SECTIONS[sec], true);
  try { await loadIndex(); } catch (e) { return loadError(); }
  const toefl = sec === "toefl";
  // stories：level 1＝初級、2＝中級、3＝上級　／　toefl：step 1〜3
  const GROUPS = toefl ? [
    [1, "ステップ1", "英検3級〜準2級。約100語の短い文章"],
    [2, "ステップ2", "英検準2級〜2級。約150語"],
    [3, "ステップ3", "英検2級〜準1級。約200語。TOEFLの文章に近い形"],
  ] : [
    [1, "初級", "短い会話。文が短く、やさしい単語が中心"],
    [2, "中級", "少し長い会話や、章に分かれた文章"],
    [3, "上級", "難しい単語が多い会話や、長い文章"],
  ];
  const mine = stories.filter((s) => inSection(s, sec));
  const list = GROUPS.flatMap(([lv, name, note]) => {
    const items = mine.filter((s) => ((toefl ? s.step : s.level) || 2) === lv);
    if (!items.length) return [];
    return [el("h2", { class: "level lv" + lv }, el("span", { class: "level-name", text: name }),
      el("span", { class: "level-note", text: note })), ...items.map(storyCard)];
  });
  // TOEFL対策の進め方（ホームの活用方法と同じ順番）
  const FLOW = ["聞く", "読む", "単語を確認", "訳を確認", "もう一度聞いて声に出す", "単語リスト", "確認問題"];
  const flow = toefl ? el("div", { class: "flow-box" },
    el("p", { class: "flow-title", text: "1つの文章の進め方" }),
    el("ol", { class: "flow" }, FLOW.map((t, i) => el("li", {},
      el("span", { class: "flow-pill" }, el("span", { class: "flow-n", text: String(i + 1) }), el("span", { text: t })))))) : null;
  const help = toefl
    ? el("div", { class: "help" },
      el("p", {}, "色の付いた単語をタップすると意味が出ます。",
        el("span", { class: "w w-subj", style: "cursor:default", text: "緑" }), "＝その教科の単語、",
        el("span", { class: "w w-acad", style: "cursor:default", text: "紫" }), "＝どの教科にもよく出る単語。"),
      el("p", {}, "段落の最後の", helpBubble(), "を押すと、その段落の日本語訳が出ます。題名の下のボタンで単語リスト、本文のあとに確認問題（5問）があります。"))
    : el("div", { class: "help" },
      el("p", {}, "色の付いた単語（",
        el("span", { class: "w", style: "cursor:default", text: "example" }),
        "）をタップすると、その文での意味が出ます。"),
      el("p", {}, "会話のお話では、せりふの横の", helpBubble(),
        "を押すと、そのせりふの日本語訳が出ます。ほかのお話では、チャプターの最後の「日本語訳を見る」で訳が出ます。"));
  const empty = list.length ? null : el("p", { class: "empty-msg", text: "まだここに表示できる文章がありません。少したってから開き直してください。" });
  main.replaceChildren(...[flow, help, ...list, empty].filter(Boolean));
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
  seenWords = new Set();
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
  const block = !!story.block;   // TOEFL対策：1文ごとに訳ボタン
  const storyTr = storyInfo && storyInfo.titleTr ? storyInfo.titleTr + (storyInfo.subtitleTr ? "　" + storyInfo.subtitleTr : "") : "";
  const storyTrBox = (talk || block) && storyTr ? trBox(storyTr) : null;
  const storyHead = chIndex === 0 ? el("div", { class: "story-head", lang: "en" },
    el("div", { class: "story-title" }, story.title, storyTrBox ? trBtn(storyTrBox) : null),
    story.subtitle ? el("div", { class: "story-sub", text: story.subtitle }) : null, storyTrBox) : null;
  const chTrBox = talk && ch.titleJa ? trBox(ch.titleJa) : null;
  const title = ch.title.length ? el("div", { class: "ch-title", lang: "en" },
    el("span", { class: "num", text: "Chapter " + ch.n }), ...segs(ch.title), chTrBox ? trBtn(chTrBox) : null, chTrBox) : null;
  const speakers = [];
  // 長い名前は、札だけ頭文字で短くする（本文と音声はそのまま）
  const SHORT_WHO = { "Nightingale": "N.", "Hokusai": "H.", "Mr. Brown": "Mr. B" };
  // TOEFL対策：1文ずつのデータを段落にまとめ、段落ごとに訳ボタンを付ける（pstart＝段落が始まる文の番号）
  const paragraphs = () => {
    const starts = [0, ...(story.pstart || []), ch.paras.length];
    const out = [];
    for (let k = 0; k + 1 < starts.length; k++) {
      const idx = [];
      for (let i = starts[k]; i < starts[k + 1]; i++) idx.push(i);
      if (!idx.length) continue;
      // 式の行（$ で書いた行）は、黒板のように1行で見せる
      if (idx.length === 1 && (story.eqs || []).includes(idx[0])) {
        const fig = story.figs && story.figs[String(idx[0])];
        out.push(fig ? figure(fig) : el("div", { class: "eq" }, ...segs(ch.paras[idx[0]])));
        continue;
      }
      const body = idx.flatMap((i, n) => (n ? [document.createTextNode(" "), ...segs(ch.paras[i])] : segs(ch.paras[i])));
      const ja = idx.map((i) => ch.ja[i] || "").join("");
      const box = ja ? trBox(ja) : null;
      out.push(el("p", { class: "para" }, ...body, box ? trBtn(box) : null, box));
    }
    return out;
  };
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
  const text = el("div", { class: "text" + (talk ? " talk" : "") + (block ? " block" : ""), lang: "en" }, block ? paragraphs() : ch.paras.map(line));
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
  const sep = talk || block;   // 1行ずつ訳があるときは、下の「日本語訳を見る」は出さない
  const wl = block ? wordList() : null;
  main.replaceChildren(...[one ? null : chips, player, storyHead,
    wl ? wl.btn : null, wl ? wl.box : null, title, text,
    sep ? null : jaBtn, sep ? null : jaBox,
    block && story.quiz ? quizSection() : null,
    one ? null : nav].filter(Boolean));
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
// 色を付けるのは、そのチャプターで最初に出たときだけ（2回目からはふつうの文字）
let seenWords = new Set();
function segs(list) {
  return list.map((s) => {
    if (typeof s === "string") return document.createTextNode(s);
    const g = story.gloss[s.g];
    if (!g) return document.createTextNode(s.t);
    const key = (g.base || g.w).toLowerCase();
    if (seenWords.has(key)) return document.createTextNode(s.t);
    seenWords.add(key);
    return el("button", { class: "w" + (g.k ? " w-" + g.k : ""), type: "button", "data-g": s.g, onclick: (e) => showWord(e.currentTarget, s.t, g), text: s.t });
  });
}

/* ---- グラフ（本文の「% 名前」の行）：点と直線の xy グラフを SVG でかく ---- */
function figure(f) {
  const NS = "http://www.w3.org/2000/svg";
  const W = 340, H = 250, L = 50, R = 18, T = 18, B = 48;
  let sx = (x) => L + (x / f.xMax) * (W - L - R);
  let sy = (y) => H - B - (y / f.yMax) * (H - T - B);
  // 図形（type "shape"）：目もりとじくをかかず、縦と横を同じ縮尺にして真ん中に置く（直角三角形など）
  const shape = f.type === "shape";
  if (shape) {
    const k = Math.min((W - 80) / f.xMax, (H - 50) / f.yMax), ox = (W - k * f.xMax) / 2, oy = (H + k * f.yMax) / 2;
    sx = (x) => ox + x * k;
    sy = (y) => oy - y * k;
  }
  const svg = document.createElementNS(NS, "svg");
  const add = (parent, tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    parent.append(n);
    return n;
  };
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", f.title || "graph");
  svg.setAttribute("class", "fig-svg");
  // 目もりと補助線（うすい1px）。hideTicks のときは、じくだけ（需要と供給のような考え方のグラフ）
  if (!f.hideTicks && !shape) for (let y = 0; y <= f.yMax + 1e-9; y += f.yStep) {
    add(svg, "line", { x1: L, x2: W - R, y1: sy(y), y2: sy(y), class: "fig-grid" });
    add(svg, "text", { x: L - 6, y: sy(y) + 4, class: "fig-tick", "text-anchor": "end" }, String(y));
  }
  if (!f.hideTicks && !shape) for (let x = 0; x <= f.xMax + 1e-9; x += f.xStep) {
    add(svg, "line", { x1: sx(x), x2: sx(x), y1: T, y2: H - B, class: "fig-grid" });
    add(svg, "text", { x: sx(x), y: H - B + 16, class: "fig-tick", "text-anchor": "middle" }, String(x));
  }
  // じく（図形のときはかかない）
  if (!shape) {
    add(svg, "line", { x1: L, x2: W - R, y1: sy(0), y2: sy(0), class: "fig-axis" });
    add(svg, "line", { x1: L, x2: L, y1: T, y2: H - B, class: "fig-axis" });
    add(svg, "text", { x: (L + W - R) / 2, y: H - 8, class: "fig-label", "text-anchor": "middle" }, f.xLabel);
    add(svg, "text", { x: 14, y: (T + H - B) / 2, class: "fig-label", "text-anchor": "middle", transform: `rotate(-90 14 ${(T + H - B) / 2})` }, f.yLabel);
  }
  // 図形：多角形（poly）と直角のしるし（rightAngle：at の角から右と上に size の正方形）
  if (f.poly) add(svg, "path", { d: "M" + f.poly.map(([x, y]) => sx(x) + " " + sy(y)).join(" L") + " Z", class: "fig-line fig-shape" });
  if (f.rightAngle) {
    const [x0, y0] = f.rightAngle.at, r = f.rightAngle.size;
    add(svg, "path", { d: `M${sx(x0 + r)} ${sy(y0)} V${sy(y0 + r)} H${sx(x0)}`, class: "fig-slope" });
  }
  if (f.origin) add(svg, "text", { x: L + 22, y: sy(0) - 6, class: "fig-note" }, "origin");
  // 傾きの三角形（右へ run、上へ rise）
  if (f.slope) {
    const [x0, y0] = f.slope.from, x1 = x0 + f.slope.run, y1 = y0 + f.slope.rise;
    add(svg, "path", { d: `M${sx(x0)} ${sy(y0)} H${sx(x1)} V${sy(y1)}`, class: "fig-slope" });
    add(svg, "text", { x: (sx(x0) + sx(x1)) / 2, y: sy(y0) + 15, class: "fig-note", "text-anchor": "middle" }, String(f.slope.run));
    add(svg, "text", { x: sx(x1) + 6, y: (sy(y0) + sy(y1)) / 2 + 4, class: "fig-note" }, String(f.slope.rise));
    const [tx, ty] = f.slope.textAt || [x1, y1];   // ラベルが線と重ならない場所（データの座標）
    add(svg, "text", { x: sx(tx), y: sy(ty), class: "fig-note fig-strong" }, f.slope.text);
  }
  // 直線（2px）と点（8px以上・まわりに2pxのふち）
  if (f.line) {
    const [[a, b], [c, d]] = f.line;
    add(svg, "line", { x1: sx(a), y1: sy(b), x2: sx(c), y2: sy(d), class: "fig-line" });
  }
  // 2本以上の線：それぞれ色（slot）と名前のラベル。名前は文字色で、線の色だけにたよらない
  for (const ln of f.lines || []) {
    const [[a, b], [c, d]] = ln.pts;
    const g = add(svg, "g", {});
    add(g, "title", {}, ln.label);
    add(g, "line", { x1: sx(a), y1: sy(b), x2: sx(c), y2: sy(d), class: "fig-line s" + (ln.slot || 1) });
    if (ln.labelAt) add(svg, "text", { x: sx(ln.labelAt[0]), y: sy(ln.labelAt[1]), class: "fig-note fig-strong" }, ln.label);
  }
  for (const [x, y] of f.points || []) {
    const g = add(svg, "g", {});
    add(g, "title", {}, `(${x}, ${y})`);
    add(g, "circle", { cx: sx(x), cy: sy(y), r: 5, class: "fig-dot" });
    if (f.pointLabels) add(g, "text", { x: sx(x) - 8, y: sy(y) - 10, class: "fig-note", "text-anchor": "end" }, String(y));
  }
  for (const n of f.notes || []) {
    // pos＝文字を置く場所（データの座標）、at＋dx/dy＝点からのずらし。leaderTo があれば点まで細い線を引く
    const tx = n.pos ? sx(n.pos[0]) : sx(n.at[0]) + (n.dx || 0);
    const ty = n.pos ? sy(n.pos[1]) : sy(n.at[1]) + (n.dy || 0);
    const t = add(svg, "text", { x: tx, y: ty, class: "fig-note fig-strong" }, n.text);
    if (n.leaderTo) {
      const w = t.getComputedTextLength ? (t.getComputedTextLength() || n.text.length * 7) : n.text.length * 7;
      add(svg, "line", { x1: tx + w + 4, y1: ty - 4, x2: sx(n.leaderTo[0]) - 7, y2: sy(n.leaderTo[1]), class: "fig-leader" });
    }
  }
  // 線が2本以上なら凡例（色の短い線＋名前）
  const legend = (f.lines || []).length > 1 ? el("div", { class: "fig-legend" }, f.lines.map((ln) =>
    el("span", {}, el("i", { class: "fig-key s" + (ln.slot || 1), "aria-hidden": "true" }), ln.label))) : null;
  return el("figure", { class: "fig", lang: "en" }, svg, legend, f.title ? el("figcaption", { text: f.title }) : null);
}

/* ---- TOEFL対策：このお話の単語リスト（ボタンで開く） ---- */
function wordList() {
  const seen = new Set();
  const groups = { subj: [], acad: [], other: [] };
  for (const g of Object.values(story.gloss)) {
    const key = (g.base || g.w).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    groups[groups[g.k] ? g.k : "other"].push(g);
  }
  const n = groups.subj.length + groups.acad.length + groups.other.length;
  const ul = (arr) => el("ul", { class: "wl" }, arr.map((g) => el("li", {},
    el("span", { class: "wl-en", lang: "en", text: g.base || g.w }), el("span", { class: "wl-ja", text: g.ja }))));
  const part = (k, cls, label) => (groups[k].length ? [el("h3", { class: cls, text: label }), ul(groups[k])] : []);
  const box = el("section", { class: "wordlist", hidden: true },
    ...part("subj", "wl-subj", "教科の単語"),
    ...part("acad", "wl-acad", "どの教科にもよく出る単語"),
    ...part("other", "wl-other", "そのほかの語句"));
  const label = (open) => (open ? "単語リストをとじる" : `このお話の単語リスト（${n}語）`);
  const btn = el("button", { class: "wl-btn", type: "button", "aria-expanded": "false", text: label(false) });
  btn.addEventListener("click", () => {
    const open = box.hidden;
    box.hidden = !open;
    btn.textContent = label(open);
    btn.setAttribute("aria-expanded", String(open));
  });
  return { btn, box };
}

/* ---- TOEFL対策：確認問題 ---- */
const QTYPE = { purpose: "筆者の意図", main: "主な内容", detail: "内容の確認", vocab: "単語の意味", infer: "推測", not: "あてはまらないもの", ctw: "単語を完成させる（Complete the Words）" };
function quizSection() {
  const wrap = el("section", { class: "quiz" });
  const build = () => {
    const total = story.quiz.length;
    let answered = 0, right = 0;
    const score = el("div", { class: "q-score", hidden: true });
    const done = (ok) => {
      answered++;
      if (ok) right++;
      if (answered < total) return;
      const msg = right === total ? "全問正解！　すばらしい！"
        : right >= total - 2 ? "よくできました。まちがえた問題は、解説を読んで本文の答えの場所を探してみよう。"
          : "もう一度本文を読んでから、やり直してみよう。";
      score.replaceChildren(el("p", { class: "q-score-n", text: `${total}問中 ${right}問 正解` }), el("p", { text: msg }),
        el("button", { class: "q-retry", type: "button", text: "もう一度やる", onclick: build }));
      score.hidden = false;
      score.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    wrap.replaceChildren(
      el("h2", { text: "確認問題（TOEFL形式）" }),
      el("p", { class: "q-lead", text: "本文の内容について答えましょう。問題文の横の訳ボタンで、問題と選択肢の日本語訳が見られます。" }),
      ...story.quiz.map((q, i) => (q.type === "ctw" ? ctwItem : mcItem)(q, i, done)), score);
  };
  build();
  return wrap;
}
function qHead(q, i) {
  return el("div", { class: "q-head" }, el("span", { class: "q-num", text: "問" + (i + 1) }), el("span", { class: "q-type", text: QTYPE[q.type] || "" }));
}
function mcItem(q, i, done) {
  const L = "ABCD";
  const box = trBox("");
  box.replaceChildren(q.q_ja, ...(q.choices_ja || []).map((c, k) => el("span", { class: "q-tr-c", text: L[k] + "　" + c })));
  const res = el("div", { class: "q-res", hidden: true });
  const btns = q.choices.map((c, k) => el("button", { class: "q-ch", type: "button", lang: "en" },
    el("span", { class: "q-letter", text: L[k] }), el("span", { text: c })));
  btns.forEach((b, k) => b.addEventListener("click", () => {
    if (res.hidden === false) return;
    const ok = k === q.answer;
    btns.forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add("ok"); });
    if (!ok) b.classList.add("ng");
    res.replaceChildren(el("p", { class: "q-verdict " + (ok ? "ok" : "ng"), text: ok ? "正解！" : "ざんねん。正解は " + L[q.answer] + " です。" }),
      el("p", { text: q.explain }));
    res.hidden = false;
    done(ok);
  }));
  return el("div", { class: "q" }, qHead(q, i),
    el("p", { class: "q-text", lang: "en" }, q.q, trBtn(box), box), el("div", { class: "q-chs" }, btns), res);
}
function ctwItem(q, i, done) {
  // "pro[cess]" の [ ] の中を入力してもらう
  const inputs = [];
  const parts = [];
  const rx = /([A-Za-z]+)\[([A-Za-z]+)\]/g;
  let last = 0, m;
  while ((m = rx.exec(q.text))) {
    parts.push(q.text.slice(last, m.index));
    // inputmode="email"：多くのスマホで、日本語ではなく英語（ローマ字）のキーボードが出る
    const inp = el("input", { class: "ctw-in", type: "text", inputmode: "email", lang: "en", maxlength: String(m[2].length), autocomplete: "off",
      autocapitalize: "off", autocorrect: "off", spellcheck: "false", "aria-label": m[1] + "のつづきを入力",
      placeholder: "_".repeat(m[2].length), style: "width:" + (m[2].length + 1.2) + "ch" });
    inp.dataset.ans = m[2];
    inputs.push(inp);
    parts.push(el("span", { class: "ctw-w" }, m[1], inp));   // 見えている前半と入力欄を、行の途中で分けない
    last = rx.lastIndex;
  }
  parts.push(q.text.slice(last));
  const box = q.text_ja ? trBox(q.text_ja) : null;
  const res = el("div", { class: "q-res", hidden: true });
  const check = el("button", { class: "q-check", type: "button", text: "答え合わせ" });
  check.addEventListener("click", () => {
    let n = 0;
    inputs.forEach((inp) => {
      // 全角で入力されても（ｃｅｓｓ など）半角になおして判定する
      const ok = inp.value.normalize("NFKC").trim().toLowerCase() === inp.dataset.ans.toLowerCase();
      if (ok) n++;
      inp.classList.add(ok ? "ok" : "ng");
      inp.readOnly = true;   // disabled だと iPhone で半透明・灰色になるので readOnly にする
      if (!ok) inp.after(el("span", { class: "ctw-ans", text: inp.dataset.ans }));
    });
    check.disabled = true;
    const ok = n === inputs.length;
    res.replaceChildren(el("p", { class: "q-verdict " + (ok ? "ok" : "ng"), text: ok ? "全部正解！" : `${inputs.length}語中 ${n}語 正解。正しいつづりは緑の文字です。` }),
      el("p", { text: q.explain }));
    res.hidden = false;
    done(ok);
  });
  return el("div", { class: "q" }, qHead(q, i),
    el("p", { class: "q-text" }, "単語の後ろ半分が消えています。つづりを入れて、文章を完成させましょう。", box ? trBtn(box) : null, box),
    el("p", { class: "ctw", lang: "en" }, parts), check, res);
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
// お話を開いていれば、その一覧へ。一覧ならホームへ
backBtn.addEventListener("click", () => { hideWord(); if (story && section !== "home") showList(section); else showHome(); });
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

showHome();
