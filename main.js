async function loadData(key) {
  const res = await fetch(`./data/${key}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(t("error_load").replace("{key}", key));
  return await res.json();
}

function pad6(s) {
  const t = String(s ?? "").replace(/\D/g, "");
  return t.padStart(6, "0").slice(-6);
}

function normGroup(s) {
  return String(s ?? "").replace(/\D/g, "").padStart(3, "0").slice(-3);
}

function lastNDigitsMatch(number6, n, digits) {
  const tail = number6.slice(-n);
  return tail === String(digits).padStart(n, "0").slice(-n);
}

// ジャンボの前後賞（同一組、番号±1、100000〜199999循環）
function adjacentJumbo(number6, target6) {
  const n = parseInt(number6, 10);
  const t = parseInt(target6, 10);
  if (Number.isNaN(n) || Number.isNaN(t)) return false;

  const min = 100000, max = 199999;
  const prev = (t === min) ? max : (t - 1);
  const next = (t === max) ? min : (t + 1);
  return n === prev || n === next;
}

function checkWin(input, data) {
  const hits = [];

  const g = input.group;
  const num = input.number;

  // 1) exact / mini_exact / common / last_n_digits
  for (const p of data.prizes) {
    if (p.type === "exact") {
      if (g === normGroup(p.group) && num === pad6(p.number)) hits.push(p);
      continue;
    }
    if (p.type === "mini_exact") {
      const glast = g.slice(-1);
      if (glast === String(p.group_last_digit) && num === pad6(p.number)) hits.push(p);
      continue;
    }
    if (p.type === "common_all_groups") {
      if (num === pad6(p.number)) hits.push(p);
      continue;
    }
    if (p.type === "last_n_digits") {
      if (lastNDigitsMatch(num, p.n, p.digits)) hits.push(p);
      continue;
    }
  }

  // 2) ジャンボ: 前後賞 / 組違い賞（当选番号以1等为基准自动判定）
  if (data.meta.type === "jumbo") {
    const first = data.prizes.find(x => x.name === "1等" && x.type === "exact");
    if (first) {
      const firstGroup = normGroup(first.group);
      const firstNum = pad6(first.number);

      // 前後賞
      if (g === firstGroup && adjacentJumbo(num, firstNum)) {
        hits.push({ name: "前後賞", amount: 150000000, note: "1等番号の前後（同一組）" });
      }

      // 組違い賞（同番号、组不同）
      if (num === firstNum && g !== firstGroup) {
        hits.push({ name: "組違い賞", amount: 100000, note: "1等番号と同番号（組違い）" });
      }
    }
  }

  // 金额只取最高奖（重叠当选时不累加）
  const total = hits.reduce((max, x) => Math.max(max, Number(x.amount) || 0), 0);

  return { hits, total };
}

function yen(n) {
  try { return new Intl.NumberFormat("ja-JP").format(n) + "円"; }
  catch { return String(n) + "円"; }
}

const I18N = {
  ja: {
    eyebrow: "Nenmatsu Jumbo Checker",
    title: "年末ジャンボ 当せんチェッカー",
    lead: "最新の当せん番号データで、組・番号を一発判定。",
    badge_years: "2024 / 2025",
    badge_note: "公式発表後に更新",
    form_title: "入力フォーム",
    form_desc: "回号と番号を入力して判定します。",
    lang_label: "言語",
    theme_label: "テーマ",
    type_label: "種類",
    type_jumbo: "年末ジャンボ",
    type_mini: "年末ジャンボミニ",
    buy_label: "購入タイプ",
    buy_bara: "バラ",
    buy_renban: "連番",
    buy_hint: "連番は組と連番内の任意番号（6桁）を入力すると、10連番を自動追加します。",
    add_label: "追加",
    opt_2024_jumbo: "2024年 第1031回",
    opt_2025_jumbo: "2025年 第1082回（模拟）",
    opt_2025_mini: "2025年 第1083回",
    latest_btn: "最新へ",
    add_btn: "追加する",
    scan_btn: "拍照识别",
    scan_label: "拍照识别",
    scan_title: "识别结果",
    scan_tip: "请对准票面中的组和号",
    scan_loading: "识别中...",
    scan_guide_group: "123組",
    scan_guide_number: "123456",
    scan_copy: "复制",
    scan_retry: "重新识别",
    scan_confirm: "确认添加",
    group_label: "組",
    number_label: "番号（6桁）",
    group_ph: "例: 110",
    number_ph: "例: 123456",
    check_btn: "判定する",
    hint: "入力内容は保存されません。",
    result_title: "判定結果",
    result_desc: "複数当せん時はすべて表示されます。",
    footer_note: "毎年、当せん番号発表後に data/*.json を手動更新してください。",
    theme_day: "白昼",
    theme_night: "夜",
    checking: "判定中...",
    no_win: "当せんなし",
    header_round: "回号",
    header_input: "入力",
    won: "当せん",
    total: "合計",
    added: "追加しました",
    added_count: "{count}件追加",
    clear_btn: "リストをクリア",
    empty_list: "まだ追加がありません",
    item_prefix: "番号",
    error_prefix: "エラー",
    error_group: "組は数字1〜3桁で入力してください（例: 110）",
    error_number: "番号は6桁で入力してください（例: 123456）",
    error_load: "data/{key}.json を読み込めませんでした"
  },
  zh: {
    eyebrow: "Nenmatsu Jumbo Checker",
    title: "年末ジャンボ 中奖查询",
    lead: "使用最新开奖数据，快速判定组别与号码。",
    badge_years: "2024 / 2025",
    badge_note: "官方发布后更新",
    form_title: "输入表单",
    form_desc: "选择回号并输入号码进行判定。",
    lang_label: "语言",
    theme_label: "主题",
    type_label: "类型",
    type_jumbo: "年末ジャンボ",
    type_mini: "年末ジャンボミニ",
    buy_label: "购买方式",
    buy_bara: "散买",
    buy_renban: "连号",
    buy_hint: "连号输入组号与连号内任意号码（6位），自动追加整组10连号。",
    add_label: "追加",
    opt_2024_jumbo: "2024年 第1031回",
    opt_2025_jumbo: "2025年 第1082回（模拟）",
    opt_2025_mini: "2025年 第1083回",
    latest_btn: "最新",
    add_btn: "追加",
    scan_btn: "拍照识别",
    scan_label: "拍照识别",
    scan_title: "识别结果",
    scan_tip: "请对准票面中的组和号",
    scan_loading: "识别中...",
    scan_guide_group: "123組",
    scan_guide_number: "123456",
    scan_copy: "复制",
    scan_retry: "重新识别",
    scan_confirm: "确认添加",
    group_label: "组",
    number_label: "号码（6位）",
    group_ph: "例: 110",
    number_ph: "例: 123456",
    check_btn: "开始判定",
    hint: "输入内容不会被保存。",
    result_title: "判定结果",
    result_desc: "如同时中奖，将全部显示。",
    footer_note: "每年官方公布后请手动更新 data/*.json。",
    theme_day: "白昼",
    theme_night: "夜间",
    checking: "判定中...",
    no_win: "未中奖",
    header_round: "回号",
    header_input: "输入",
    won: "中奖",
    total: "合计",
    added: "已追加",
    added_count: "已追加 {count} 个",
    clear_btn: "清空列表",
    empty_list: "暂无追加号码",
    item_prefix: "号码",
    error_prefix: "错误",
    error_group: "组请输入 1〜3 位数字（例: 110）",
    error_number: "号码请输入 6 位数字（例: 123456）",
    error_load: "无法读取 data/{key}.json"
  },
  en: {
    eyebrow: "Nenmatsu Jumbo Checker",
    title: "Nenmatsu Jumbo Prize Checker",
    lead: "Check your group and number against the latest results.",
    badge_years: "2024 / 2025",
    badge_note: "Updated after official release",
    form_title: "Entry Form",
    form_desc: "Choose a round and enter your ticket info.",
    lang_label: "Language",
    theme_label: "Theme",
    type_label: "Type",
    type_jumbo: "Jumbo",
    type_mini: "Mini Jumbo",
    buy_label: "Purchase",
    buy_bara: "Single",
    buy_renban: "Consecutive",
    buy_hint: "Consecutive: enter group and any 6-digit number in the set to add all 10 numbers.",
    add_label: "Add",
    opt_2024_jumbo: "2024 · Round 1031",
    opt_2025_jumbo: "2025 · Round 1082 (mock)",
    opt_2025_mini: "2025 · Round 1083",
    latest_btn: "Latest",
    add_btn: "Add",
    scan_btn: "Scan",
    scan_label: "Scan",
    scan_title: "Scan Result",
    scan_tip: "Align the group and number on your ticket",
    scan_loading: "Scanning...",
    scan_guide_group: "123組",
    scan_guide_number: "123456",
    scan_copy: "Copy",
    scan_retry: "Rescan",
    scan_confirm: "Add",
    group_label: "Group",
    number_label: "Number (6 digits)",
    group_ph: "e.g. 110",
    number_ph: "e.g. 123456",
    check_btn: "Check",
    hint: "Your inputs are not stored.",
    result_title: "Result",
    result_desc: "All matching prizes will be shown.",
    footer_note: "Update data/*.json after official results are announced.",
    theme_day: "Day",
    theme_night: "Night",
    checking: "Checking...",
    no_win: "No prize",
    header_round: "Round",
    header_input: "Input",
    won: "Prizes",
    total: "Total",
    added: "Added",
    added_count: "Added {count}",
    clear_btn: "Clear list",
    empty_list: "No entries yet",
    item_prefix: "Number",
    error_prefix: "Error",
    error_group: "Group must be 1–3 digits (e.g. 110)",
    error_number: "Number must be 6 digits (e.g. 123456)",
    error_load: "Failed to load data/{key}.json"
  }
};

let currentLang = "zh";

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.ja[key] || "";
}

function applyI18n(lang) {
  currentLang = lang in I18N ? lang : "ja";
  document.documentElement.lang = currentLang;
  const langSelect = document.getElementById("lang");
  if (langSelect) langSelect.value = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    el.textContent = t(k);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const k = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(k));
  });
  updateLangIndicator();
  updateThemeButton(document.body.classList.contains("theme-night"));
}

function applyTheme(isNight) {
  document.body.classList.toggle("theme-night", isNight);
  updateThemeButton(isNight);
}

function updateThemeButton(isNight) {
  const btn = document.getElementById("theme");
  if (!btn) return;
  const icon = btn.querySelector(".theme-icon");
  if (icon) icon.textContent = isNight ? "🌙" : "☀";
  const label = isNight ? t("theme_night") : t("theme_day");
  btn.setAttribute("aria-pressed", String(isNight));
  btn.setAttribute("aria-label", label);
  btn.setAttribute("title", label);
}

function updateLangIndicator() {
  const langBtn = document.getElementById("langBtn");
  if (!langBtn) return;
  const indicator = langBtn.querySelector(".lang-indicator");
  if (!indicator) return;
  const map = { ja: "日", zh: "中", en: "EN" };
  const nameMap = { ja: "日本語", zh: "中文", en: "English" };
  indicator.textContent = map[currentLang] || "日";
  const label = `${t("lang_label")}: ${nameMap[currentLang] || "日本語"}`;
  langBtn.setAttribute("aria-label", label);
  langBtn.setAttribute("title", label);
}

function initI18nAndTheme() {
  const langSelect = document.getElementById("lang");
  if (langSelect) {
    langSelect.addEventListener("change", () => applyI18n(langSelect.value));
  }
  const themeBtn = document.getElementById("theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isNight = !document.body.classList.contains("theme-night");
      applyTheme(isNight);
    });
  }
  applyI18n(langSelect ? langSelect.value : "ja");
  applyTheme(false);
}

initI18nAndTheme();

function setupLangMenu() {
  const langBtn = document.getElementById("langBtn");
  const langMenu = document.getElementById("langMenu");
  if (!langBtn || !langMenu) return;

  function closeMenu() {
    langMenu.classList.remove("is-open");
  }

  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langMenu.classList.toggle("is-open");
  });

  langMenu.querySelectorAll(".lang-item").forEach(item => {
    item.addEventListener("click", () => {
      const lang = item.dataset.lang;
      if (lang) applyI18n(lang);
      closeMenu();
    });
  });

  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

setupLangMenu();

function syncHeaderHeight() {
  const header = document.querySelector(".header-block");
  if (!header) return;
  const height = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--header-height", `${height}px`);
}

window.addEventListener("resize", syncHeaderHeight);
window.addEventListener("load", syncHeaderHeight);
syncHeaderHeight();

function setupRoundSwitch() {
  const roundSelect = document.getElementById("round");
  const typeButtons = Array.from(document.querySelectorAll(".type-btn"));
  const typeSwitch = document.querySelector(".type-switch");
  const latestBtn = document.getElementById("latest");
  if (!roundSelect || typeButtons.length === 0 || !latestBtn || !typeSwitch) return;

  const allOptions = Array.from(roundSelect.options);

  function setActiveType(type) {
    typeButtons.forEach(btn => {
      const active = btn.dataset.type === type;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    typeSwitch.dataset.active = type;
    allOptions.forEach(opt => {
      const match = opt.dataset.type === type;
      opt.hidden = !match;
    });
    const latest = getLatestOption(type);
    if (latest) roundSelect.value = latest.value;
  }

  function getLatestOption(type) {
    return allOptions
      .filter(opt => opt.dataset.type === type)
      .sort((a, b) => {
        const ay = Number(a.dataset.year || 0);
        const by = Number(b.dataset.year || 0);
        if (ay !== by) return by - ay;
        const ar = Number(a.dataset.round || 0);
        const br = Number(b.dataset.round || 0);
        return br - ar;
      })[0];
  }

  typeButtons.forEach(btn => {
    btn.addEventListener("click", () => setActiveType(btn.dataset.type));
  });

  latestBtn.addEventListener("click", () => {
    const active = typeButtons.find(btn => btn.classList.contains("is-active"));
    const type = active ? active.dataset.type : "jumbo";
    const latest = getLatestOption(type);
    if (latest) {
      roundSelect.value = latest.value;
    }
  });

  const current = roundSelect.selectedOptions[0];
  setActiveType(current ? current.dataset.type : "jumbo");
}

setupRoundSwitch();

const entries = [];

function getBuyType() {
  const active = document.querySelector(".tab-btn.is-active");
  return active ? active.dataset.buy : "bara";
}

function setBuyType(type) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    const active = btn.dataset.buy === type;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function buildEntries(groupRaw, numberRaw, buyType) {
  const group = normGroup(groupRaw);
  const number = pad6(numberRaw);
  if (buyType === "renban") {
    const base = parseInt(number.slice(0, 5), 10);
    if (Number.isNaN(base)) return [];
    const list = [];
    for (let i = 0; i < 10; i += 1) {
      const n = String(base * 10 + i).padStart(6, "0");
      list.push({ group, number: n });
    }
    return list;
  }
  return [{ group, number }];
}

function isValidNumber(rawNumber, buyType) {
  if (buyType === "renban") return /^\d{6}$/.test(rawNumber);
  return /^\d{6}$/.test(rawNumber);
}

function addEntries(newItems) {
  newItems.forEach(item => {
    const exists = entries.some(e => e.group === item.group && e.number === item.number);
    if (!exists) entries.push(item);
  });
}

function renderResultList(results = []) {
  const totalEl = document.getElementById("resultTotal");
  const listEl = document.getElementById("resultList");
  if (!totalEl || !listEl) return;

  if (results.length === 0) {
    totalEl.textContent = t("empty_list");
    listEl.innerHTML = "";
    return;
  }

  const total = results.reduce((sum, r) => sum + r.total, 0);
  totalEl.textContent = `${t("total")}: ${yen(total)}`;
  if (total > 0) triggerFireworks(getBestRank(results));
  listEl.innerHTML = results.map(r => {
    const emoji = r.total > 0 ? "🎉" : "❌";
    const amount = r.total > 0 ? yen(r.total) : "0円";
    return `
      <li class="result-item" data-key="${r.group}-${r.number}">
        <span class="badge">${emoji}</span>
        <span>${r.group}組 ${r.number}</span>
        <span class="amount">${amount}</span>
        <button class="remove" type="button" aria-label="remove">✕</button>
      </li>
    `;
  }).join("");
}

function setupBuyTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setBuyType(btn.dataset.buy);
      updateBuyHint();
    });
  });
}

function updateBuyHint() {
  const hint = document.querySelector("[data-buy-hint]");
  if (!hint) return;
  const show = getBuyType() === "renban";
  hint.style.display = show ? "block" : "none";
}

setupBuyTabs();
updateBuyHint();

const scanState = {
  stream: null,
  group: "",
  number: "",
  busy: false
};

function updateScanConfirm() {
  const groupEl = document.getElementById("scanGroup");
  const numberEl = document.getElementById("scanNumber");
  const confirmBtn = document.getElementById("scanConfirm");
  if (!groupEl || !numberEl || !confirmBtn) return;
  const ok = Boolean(String(groupEl.value || "").trim() && String(numberEl.value || "").trim());
  confirmBtn.disabled = !ok;
}

async function openScanModal() {
  const modal = document.getElementById("scanModal");
  const video = document.getElementById("scanVideo");
  const canvas = document.getElementById("scanCanvas");
  const status = document.getElementById("scanStatus");
  const groupEl = document.getElementById("scanGroup");
  const numberEl = document.getElementById("scanNumber");
  if (!modal || !video || !canvas || !status) return;
  modal.classList.add("is-open", "scan-only");
  modal.classList.remove("show-result");
  modal.setAttribute("aria-hidden", "false");
  status.textContent = t("scan_tip");
  const confirmBtn = document.getElementById("scanConfirm");
  if (confirmBtn) confirmBtn.disabled = true;
  scanState.group = "";
  scanState.number = "";
  if (groupEl) groupEl.value = "";
  if (numberEl) numberEl.value = "";
  updateScanConfirm();

  try {
    scanState.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = scanState.stream;
    await video.play();
  } catch (e) {
    status.textContent = `${t("error_prefix")}: ${e.message || e}`;
  }
}

function closeScanModal() {
  const modal = document.getElementById("scanModal");
  const video = document.getElementById("scanVideo");
  if (modal) {
    modal.classList.remove("is-open", "scan-only", "show-result");
    modal.setAttribute("aria-hidden", "true");
  }
  if (video) video.pause();
  if (scanState.stream) {
    scanState.stream.getTracks().forEach(t => t.stop());
    scanState.stream = null;
  }
}

async function runOcr() {
  const video = document.getElementById("scanVideo");
  const canvas = document.getElementById("scanCanvas");
  const status = document.getElementById("scanStatus");
  const groupEl = document.getElementById("scanGroup");
  const numberEl = document.getElementById("scanNumber");
  const confirmBtn = document.getElementById("scanConfirm");
  const modal = document.getElementById("scanModal");
  const rawEl = document.getElementById("scanRaw");
  if (!video || !canvas || !status || !groupEl || !numberEl) return;

  if (scanState.busy) return;
  scanState.busy = true;
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 360;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, w, h);

  function makeCrop(x, y, width, height) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const cctx = c.getContext("2d");
    if (!cctx) return null;
    cctx.filter = "grayscale(1) contrast(1.6)";
    cctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    const img = cctx.getImageData(0, 0, width, height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isDark = lum < 85 && (max - min) < 40;
      if (isDark) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
    cctx.putImageData(img, 0, 0);
    return c;
  }

  const groupRect = {
    x: Math.floor(w * 0.30),
    y: Math.floor(h * 0.28),
    w: Math.floor(w * 0.40),
    h: Math.floor(h * 0.18)
  };
  const numberRect = {
    x: Math.floor(w * 0.24),
    y: Math.floor(h * 0.52),
    w: Math.floor(w * 0.52),
    h: Math.floor(h * 0.20)
  };
  const groupCrop = makeCrop(groupRect.x, groupRect.y, groupRect.w, groupRect.h);
  const numberCrop = makeCrop(numberRect.x, numberRect.y, numberRect.w, numberRect.h);
  if (!groupCrop || !numberCrop) return;
  status.textContent = t("scan_loading");
  if (rawEl) rawEl.textContent = "";
  if (modal) {
    modal.classList.remove("scan-only");
    modal.classList.add("show-result");
  }

  try {
    const groupRes = await Tesseract.recognize(groupCrop, "jpn", {
      tessedit_char_whitelist: "0123456789組",
      tessedit_char_blacklist: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZぁ-んァ-ヶ一-龯々〆〤ー・！!？?。、，．.／/（）()［］[]【】{}「」『』〜~＠@＃#％%＆&＋+－-＝=＊*：:；;＜>＜＞“”\"'`^|\\_",
      tessedit_pageseg_mode: "6"
    });
    const numberRes = await Tesseract.recognize(numberCrop, "jpn", {
      tessedit_char_whitelist: "0123456789",
      tessedit_char_blacklist: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZぁ-んァ-ヶ一-龯々〆〤ー・！!？?。、，．.／/（）()［］[]【】{}「」『』〜~＠@＃#％%＆&＋+－-＝=＊*：:；;＜>＜＞“”\"'`^|\\_",
      tessedit_pageseg_mode: "6"
    });
    const groupRaw = (groupRes.data.text || "").trim();
    const numberRaw = (numberRes.data.text || "").trim();
    if (rawEl) rawEl.textContent = `GROUP:\n${groupRaw}\n\nNUMBER:\n${numberRaw}`.trim();
    const groupText = groupRaw.replace(/\s/g, "").replace(/[^0-9組]/g, "");
    const numberText = numberRaw.replace(/\s/g, "").replace(/[^0-9]/g, "");

    const groupMatch = groupText.match(/(\d{1,3})組/);
    let group = groupMatch ? groupMatch[1].padStart(3, "0") : "";
    if (!group) {
      const digitGroups = (groupText.match(/\d+/g) || []).filter(x => x.length <= 3);
      if (digitGroups.length) group = digitGroups[digitGroups.length - 1].padStart(3, "0");
    }
    const numMatches = numberText.match(/(\d{6})/g) || [];
    const number = numMatches.length ? numMatches[numMatches.length - 1] : "";
    scanState.group = group;
    scanState.number = number;
    groupEl.value = group || "";
    numberEl.value = number || "";
    const ok = Boolean(groupEl.value && numberEl.value);
    status.textContent = ok ? "OK" : t("scan_tip");
    updateScanConfirm();
    if (modal) modal.classList.add("show-result");
  } catch (e) {
    status.textContent = `${t("error_prefix")}: ${e.message || e}`;
    if (confirmBtn) confirmBtn.disabled = true;
    if (modal) modal.classList.add("show-result");
  } finally {
    scanState.busy = false;
  }
}

document.getElementById("scan").addEventListener("click", openScanModal);
document.getElementById("scanMobile")?.addEventListener("click", openScanModal);
document.getElementById("scanClose").addEventListener("click", closeScanModal);
document.getElementById("scanCloseCam").addEventListener("click", closeScanModal);
document.getElementById("scanRetry").addEventListener("click", () => {
  updateScanConfirm();
  const modal = document.getElementById("scanModal");
  if (modal) {
    modal.classList.add("scan-only");
    modal.classList.remove("show-result");
  }
});
document.getElementById("scanCapture").addEventListener("click", runOcr);
document.getElementById("scanGroup").addEventListener("input", updateScanConfirm);
document.getElementById("scanNumber").addEventListener("input", updateScanConfirm);
document.getElementById("scanConfirm").addEventListener("click", () => {
  const groupEl = document.getElementById("scanGroup");
  const numberEl = document.getElementById("scanNumber");
  const groupVal = String(groupEl?.value || "").trim();
  const numberVal = String(numberEl?.value || "").trim();
  scanState.group = groupVal;
  scanState.number = numberVal;
  if (!scanState.group || !scanState.number) return;
  addEntries(buildEntries(scanState.group, scanState.number, getBuyType()));
  const listEl = document.getElementById("resultList");
  if (listEl) {
    listEl.innerHTML = entries.map(e => `
      <li class="result-item" data-key="${e.group}-${e.number}">
        <span class="badge">📌</span>
        <span>${e.group}組 ${e.number}</span>
        <button class="remove" type="button" aria-label="remove">✕</button>
      </li>
    `).join("");
  }
  closeScanModal();
});

document.getElementById("scanCopy").addEventListener("click", () => {
  const rawEl = document.getElementById("scanRaw");
  if (!rawEl) return;
  const text = rawEl.textContent || "";
  if (!text.trim()) return;
  navigator.clipboard?.writeText(text);
});
document.getElementById("add").addEventListener("click", () => {
  const groupInput = document.getElementById("group");
  const numberInput = document.getElementById("number");
  const totalEl = document.getElementById("resultTotal");
  const listEl = document.getElementById("resultList");
  if (!groupInput || !numberInput) return;

  const rawGroup = String(groupInput.value ?? "").trim();
  const rawNumber = String(numberInput.value ?? "").trim();
  if (!/^\d{1,3}$/.test(rawGroup)) {
    if (totalEl) totalEl.textContent = `${t("error_prefix")}: ${t("error_group")}`;
    return;
  }
  if (!isValidNumber(rawNumber, getBuyType())) {
    if (totalEl) totalEl.textContent = `${t("error_prefix")}: ${t("error_number")}`;
    return;
  }

  const items = buildEntries(rawGroup, rawNumber, getBuyType());
  addEntries(items);

  if (totalEl) {
    totalEl.textContent = t("added_count").replace("{count}", String(items.length));
  }
  if (listEl) {
    listEl.innerHTML = entries.map(e => `
      <li class="result-item" data-key="${e.group}-${e.number}">
        <span class="badge">📌</span>
        <span>${e.group}組 ${e.number}</span>
        <button class="remove" type="button" aria-label="remove">✕</button>
      </li>
    `).join("");
  }

  groupInput.value = "";
  numberInput.value = "";
  groupInput.focus();
});

document.getElementById("check").addEventListener("click", async () => {
  const totalEl = document.getElementById("resultTotal");

  try {
    const key = document.getElementById("round").value;
    const data = await loadData(key);

    const rawGroup = String(document.getElementById("group").value ?? "").trim();
    const rawNumber = String(document.getElementById("number").value ?? "").trim();
    if (rawGroup || rawNumber) {
      if (!/^\d{1,3}$/.test(rawGroup)) throw new Error(t("error_group"));
      if (!isValidNumber(rawNumber, getBuyType())) throw new Error(t("error_number"));
      addEntries(buildEntries(rawGroup, rawNumber, getBuyType()));
    }

    if (entries.length === 0) {
      renderResultList([]);
      return;
    }

    const results = entries.map(entry => {
      const { hits, total } = checkWin(entry, data);
      return { ...entry, hits, total };
    });
    renderResultList(results);
  } catch (e) {
    if (totalEl) totalEl.textContent = `${t("error_prefix")}: ${e.message || e}`;
  }
});

document.getElementById("resultList").addEventListener("click", (e) => {
  const btn = e.target.closest(".remove");
  if (!btn) return;
  const item = btn.closest(".result-item");
  if (!item) return;
  const key = item.getAttribute("data-key");
  if (!key) return;
  const [group, number] = key.split("-");
  const idx = entries.findIndex(en => en.group === group && en.number === number);
  if (idx >= 0) entries.splice(idx, 1);
  const totalEl = document.getElementById("resultTotal");
  if (totalEl) totalEl.textContent = t("added_count").replace("{count}", String(entries.length));
  const listEl = document.getElementById("resultList");
  if (listEl) {
    listEl.innerHTML = entries.map(en => `
      <li class="result-item" data-key="${en.group}-${en.number}">
        <span class="badge">📌</span>
        <span>${en.group}組 ${en.number}</span>
        <button class="remove" type="button" aria-label="remove">✕</button>
      </li>
    `).join("");
  }
});

document.getElementById("clearList").addEventListener("click", () => {
  entries.splice(0, entries.length);
  const totalEl = document.getElementById("resultTotal");
  const listEl = document.getElementById("resultList");
  if (totalEl) totalEl.textContent = t("empty_list");
  if (listEl) listEl.innerHTML = "";
});

let fwRunning = false;
function getBestRank(results) {
  let best = 99;
  results.forEach(r => {
    (r.hits || []).forEach(h => {
      const name = String(h.name || "");
      if (name.includes("1等") || name.includes("前後賞")) best = Math.min(best, 1);
      else if (name.includes("2等")) best = Math.min(best, 2);
      else if (name.includes("3等")) best = Math.min(best, 3);
      else if (name.includes("4等")) best = Math.min(best, 4);
      else if (name.includes("5等")) best = Math.min(best, 5);
      else if (name.includes("6等")) best = Math.min(best, 6);
      else if (name.includes("7等") || name.includes("組違い賞")) best = Math.min(best, 7);
      else best = Math.min(best, 8);
    });
  });
  return best === 99 ? 8 : best;
}

function triggerFireworks(rank = 8) {
  if (fwRunning) return;
  const canvas = document.getElementById("fireworks");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const colors = ["#f59e0b", "#f97316", "#22c55e", "#38bdf8", "#a78bfa"];
  const intensity = rank <= 1 ? 1.5 : rank <= 3 ? 1.15 : rank <= 5 ? 0.95 : 0.75;
  const bursts = Math.round(6 * intensity);
  const particleMin = Math.round(45 * intensity);
  const particleVar = Math.round(35 * intensity);
  const speedMin = 1.2 * intensity;
  const speedVar = 3.2 * intensity;
  const radius = 2.1 * intensity;
  const maxFrames = Math.round(180 * intensity);
  const particles = [];
  for (let i = 0; i < bursts; i += 1) {
    const cx = window.innerWidth * (0.2 + Math.random() * 0.6);
    const cy = window.innerHeight * (0.2 + Math.random() * 0.4);
    const count = particleMin + Math.floor(Math.random() * particleVar);
    for (let j = 0; j < count; j += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * speedVar;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  fwRunning = true;
  canvas.classList.add("is-active");
  let frame = 0;
  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life -= 1;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    if (particles.length > 0 && frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      canvas.classList.remove("is-active");
      fwRunning = false;
    }
  };
  requestAnimationFrame(tick);
  window.addEventListener("resize", resize, { once: true });
}
