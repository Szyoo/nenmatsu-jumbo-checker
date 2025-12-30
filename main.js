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
  // 3) ミニ: 前後賞（当选番号以1等为基准自动判定）
  if (data.meta.type === "mini") {
    const first = data.prizes.find(x => x.name === "1等" && x.type === "mini_exact");
    if (first) {
      const glast = g.slice(-1);
      const firstNum = pad6(first.number);
      if (glast === String(first.group_last_digit) && adjacentJumbo(num, firstNum)) {
        hits.push({ name: "前後賞", amount: 10000000, note: "1等番号の前後（組末位一致）" });
      }
    }
  }

  // 金额只取最高奖（重叠当选时不累加）
  const total = hits.reduce((max, x) => Math.max(max, Number(x.amount) || 0), 0);

  return { hits, total };
}

function yen(n) {
  try {
    if (currentLang === "en") {
      return "¥" + new Intl.NumberFormat("en-US").format(n);
    }
    return new Intl.NumberFormat("ja-JP").format(n) + "円";
  } catch {
    return currentLang === "en" ? "¥" + String(n) : String(n) + "円";
  }
}

function formatWinAmountParts(n) {
  const number = Number(n) || 0;
  const formatted = currentLang === "en"
    ? new Intl.NumberFormat("en-US").format(number)
    : new Intl.NumberFormat("ja-JP").format(number);
  if (currentLang === "en") {
    return { prefix: "¥", number: formatted, suffix: "" };
  }
  return { prefix: "", number: formatted, suffix: "円" };
}

function formatTemplate(key, vars) {
  return t(key).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : ""));
}

function formatGroupNumber(group, number) {
  const groupPart = `${t("group_prefix")}${group}${t("group_suffix")}`.trim();
  const numberPart = `${t("number_prefix")}${number}`.trim();
  return [groupPart, numberPart].filter(Boolean).join(" ");
}

const prizeNameMap = {
  "1等": "prize_rank_1",
  "2等": "prize_rank_2",
  "3等": "prize_rank_3",
  "4等": "prize_rank_4",
  "5等": "prize_rank_5",
  "6等": "prize_rank_6",
  "7等": "prize_rank_7",
  "前後賞": "prize_adjacent",
  "1等の前後賞": "prize_adjacent",
  "組違い賞": "prize_group_diff",
  "1等の組違い賞": "prize_group_diff"
};

function translatePrizeName(name) {
  const key = prizeNameMap[name];
  return key ? t(key) : name;
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
    section_round: "回号と種別",
    section_input: "購入・入力",
    section_share: "導入・共有",
    section_result: "判定結果",
    buy_label: "購入タイプ",
    buy_bara: "バラ",
    buy_renban: "連番",
    buy_hint: "連番は組と連番内の任意番号（6桁）を入力すると、10連番を自動追加します。",
    add_label: "追加",
    opt_2024_jumbo: "2024年 第1031回",
    opt_2024_mini: "2024年 第1032回",
    latest_btn: "最新へ",
    add_btn: "追加する",
    scan_btn: "撮影認識",
    sort_added: "追加順",
    sort_amount_desc: "金額：高→低",
    sort_amount_asc: "金額：低→高",
    sort_group_number: "組・番号順",
    show_prizes: "当せん番号",
    prize_title: "当せん番号",
    scan_btn_note: "撮影認識（テスト中・不安定）",
    scan_label: "撮影認識",
    scan_title: "認識結果",
    scan_tip: "票面の組と番号を合わせてください",
    scan_loading: "認識中...",
    scan_ok: "認識成功",
    scan_guide_group: "123組",
    scan_guide_number: "123456",
    scan_upload: "画像をアップロード",
    scan_drop: "画像をここにドロップして認識",
    scan_raw_title: "OCR 原文",
    scan_raw_group: "GROUP",
    scan_raw_number: "NUMBER",
    scan_copy: "コピー",
    scan_retry: "再認識",
    scan_confirm: "追加を確定",
    prize_meta: "第{round}回 / {year}年",
    prize_group_last: "組末位 {digit} / {number}",
    prize_common: "各組共通 {number}",
    prize_last_n: "下{n}桁 {digits}",
    group_prefix: "",
    group_suffix: "組",
    number_prefix: "",
    remove_label: "削除",
    sort_label: "並び替え",
    close_label: "閉じる",
    capture_label: "撮影",
    prize_rank_1: "1等",
    prize_rank_2: "2等",
    prize_rank_3: "3等",
    prize_rank_4: "4等",
    prize_rank_5: "5等",
    prize_rank_6: "6等",
    prize_rank_7: "7等",
    prize_adjacent: "前後賞",
    prize_group_diff: "組違い賞",
    export_label: "書き出し",
    export_label_import: "導入",
    export_ph: "短いテキスト...",
    export_input_ph: "短いテキストを貼り付け...",
    export_generate: "生成",
    export_copy: "コピー",
    export_paste: "貼り付け",
    export_apply: "適用",
    export_qr: "QR",
    export_empty: "書き出す番号がありません",
    export_no_code: "生成したテキストがありません",
    export_invalid: "無効なテキストです",
    export_copied: "書き出しテキストをコピーしました",
    export_paste_failed: "貼り付けできませんでした",
    export_restored: "リストを復元しました",
    qr_title: "共有QRコード",
    qr_save: "画像を保存",
    qr_fail: "QRコード生成に失敗しました",
    qr_saved: "画像を保存しました",
    qr_copy: "リンクをコピー",
    qr_desc: "このQRは現在のページを共有するためのものです。短いテキストが生成済み、または番号リストがある場合は import パラメータ付きのURLになります。リストが空で短いテキストも無い場合は、トップページのみのURLになります。",
    win_title: "おめでとう",
    win_line: "{name} ×{count}",
    win_unit_yi: "億",
    win_unit_wan: "万",
    win_unit_qian: "千",
    win_unit_bai: "百",
    win_unit_shi: "十",
    win_unit_ge: "一",
    toast_copied: "コピーしました",
    toast_pasted: "貼り付けました",
    toast_added: "{count}件追加しました",
    toast_latest: "最新回を選択しました",
    toast_generated: "書き出しテキストを生成しました",
    toast_applied: "導入しました",
    toast_cleared: "リストをクリアしました",
    toast_checked: "判定しました",
    group_label: "組",
    number_label: "番号（6桁）",
    group_ph: "例: 110",
    number_ph: "例: 123456",
    check_btn: "判定する",
    hint: "入力内容は保存されません。",
    result_title: "判定結果",
    result_desc: "複数当せん時はすべて表示されます。",
    result_note: "結果は参考用です。最終的には販売店のスキャン結果をご確認ください。",
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
    section_round: "回号与种类",
    section_input: "购买与输入",
    section_share: "导入与分享",
    section_result: "判定结果",
    buy_label: "购买方式",
    buy_bara: "散买",
    buy_renban: "连号",
    buy_hint: "连号输入组号与连号内任意号码（6位），自动追加整组10连号。",
    add_label: "追加",
    opt_2024_jumbo: "2024年 第1031回",
    opt_2024_mini: "2024年 第1032回",
    latest_btn: "最新",
    add_btn: "追加",
    scan_btn: "拍照识别",
    sort_added: "按添加顺序",
    sort_amount_desc: "金额从大到小",
    sort_amount_asc: "金额从小到大",
    sort_group_number: "按组和番号",
    show_prizes: "当选号",
    prize_title: "当选号",
    scan_btn_note: "拍照识别（测试中不稳定）",
    scan_label: "拍照识别",
    scan_title: "识别结果",
    scan_tip: "请对准票面中的组和号",
    scan_loading: "识别中...",
    scan_ok: "识别成功",
    scan_guide_group: "123組",
    scan_guide_number: "123456",
    scan_upload: "上传图片",
    scan_drop: "拖拽图片到这里识别",
    scan_raw_title: "OCR 原文",
    scan_raw_group: "GROUP",
    scan_raw_number: "NUMBER",
    scan_copy: "复制",
    scan_retry: "重新识别",
    scan_confirm: "确认添加",
    prize_meta: "第{round}回 / {year}",
    prize_group_last: "组末位 {digit} / {number}",
    prize_common: "各组共通 {number}",
    prize_last_n: "后{n}位 {digits}",
    group_prefix: "",
    group_suffix: "组",
    number_prefix: "",
    remove_label: "删除",
    sort_label: "排序",
    close_label: "关闭",
    capture_label: "拍照",
    prize_rank_1: "一等奖",
    prize_rank_2: "二等奖",
    prize_rank_3: "三等奖",
    prize_rank_4: "四等奖",
    prize_rank_5: "五等奖",
    prize_rank_6: "六等奖",
    prize_rank_7: "七等奖",
    prize_adjacent: "前后奖",
    prize_group_diff: "组别不同奖",
    export_label: "导出",
    export_label_import: "导入",
    export_ph: "短文本...",
    export_input_ph: "粘贴短文本...",
    export_generate: "生成",
    export_copy: "复制",
    export_paste: "粘贴",
    export_apply: "应用",
    export_qr: "二维码",
    export_empty: "暂无可导出的号码",
    export_no_code: "还没有生成文本",
    export_invalid: "文本无效，无法还原",
    export_copied: "已复制导出文本",
    export_paste_failed: "粘贴失败",
    export_restored: "已还原列表",
    qr_title: "分享二维码",
    qr_save: "保存图片",
    qr_fail: "二维码生成失败",
    qr_saved: "已保存图片",
    qr_copy: "复制链接",
    qr_desc: "此二维码用于分享当前网站。若已生成短文本或已有号码列表，会生成带 import 参数的链接，扫码后可直接还原列表。若列表为空且未生成短文本，则仅分享主页链接，不带参数。",
    win_title: "恭喜中奖",
    win_line: "{name} ×{count}",
    win_unit_yi: "亿",
    win_unit_wan: "万",
    win_unit_qian: "千",
    win_unit_bai: "百",
    win_unit_shi: "十",
    win_unit_ge: "个",
    toast_copied: "已复制",
    toast_pasted: "已粘贴",
    toast_added: "已追加 {count} 个",
    toast_latest: "已切换到最新回",
    toast_generated: "已生成导出文本",
    toast_applied: "已导入",
    toast_cleared: "已清空列表",
    toast_checked: "已判定",
    group_label: "组",
    number_label: "号码（6位）",
    group_ph: "例: 110",
    number_ph: "例: 123456",
    check_btn: "开始判定",
    hint: "输入内容不会被保存。",
    result_title: "判定结果",
    result_desc: "如同时中奖，将全部显示。",
    result_note: "结果仅供参考，以实际彩票站扫码结果为准。",
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
    section_round: "Round & Type",
    section_input: "Entry & Scan",
    section_share: "Import & Share",
    section_result: "Results",
    buy_label: "Purchase",
    buy_bara: "Single",
    buy_renban: "Consecutive",
    buy_hint: "Consecutive: enter group and any 6-digit number in the set to add all 10 numbers.",
    add_label: "Add",
    opt_2024_jumbo: "2024 · Round 1031",
    opt_2024_mini: "2024 · Round 1032",
    latest_btn: "Latest",
    add_btn: "Add",
    scan_btn: "Scan",
    scan_btn_note: "Scan (beta, unstable)",
    sort_added: "Added order",
    sort_amount_desc: "Amount (high → low)",
    sort_amount_asc: "Amount (low → high)",
    sort_group_number: "Group & Number",
    show_prizes: "Winning Numbers",
    prize_title: "Winning Numbers",
    scan_label: "Scan",
    scan_title: "Scan Result",
    scan_tip: "Align the group and number on your ticket",
    scan_loading: "Scanning...",
    scan_ok: "Scan complete",
    scan_guide_group: "123組",
    scan_guide_number: "123456",
    scan_upload: "Upload image",
    scan_drop: "Drop an image here to scan",
    scan_raw_title: "OCR Raw",
    scan_raw_group: "GROUP",
    scan_raw_number: "NUMBER",
    scan_copy: "Copy",
    scan_retry: "Rescan",
    scan_confirm: "Add",
    prize_meta: "Round {round} / {year}",
    prize_group_last: "Group last digit {digit} / {number}",
    prize_common: "All groups {number}",
    prize_last_n: "Last {n} digits {digits}",
    group_prefix: "G",
    group_suffix: "",
    number_prefix: "#",
    remove_label: "Remove",
    sort_label: "Sort",
    close_label: "Close",
    capture_label: "Capture",
    prize_rank_1: "1st Prize",
    prize_rank_2: "2nd Prize",
    prize_rank_3: "3rd Prize",
    prize_rank_4: "4th Prize",
    prize_rank_5: "5th Prize",
    prize_rank_6: "6th Prize",
    prize_rank_7: "7th Prize",
    prize_adjacent: "Adjacent Prize",
    prize_group_diff: "Different Group Prize",
    export_label: "Export",
    export_label_import: "Import",
    export_ph: "Short code...",
    export_input_ph: "Paste short code...",
    export_generate: "Generate",
    export_copy: "Copy",
    export_paste: "Paste",
    export_apply: "Apply",
    export_qr: "QR",
    export_empty: "No entries to export",
    export_no_code: "No generated code yet",
    export_invalid: "Invalid code",
    export_copied: "Export code copied",
    export_paste_failed: "Paste failed",
    export_restored: "List restored",
    qr_title: "Share QR Code",
    qr_save: "Save Image",
    qr_fail: "Failed to generate QR code",
    qr_saved: "Image saved",
    qr_copy: "Copy link",
    qr_desc: "This QR shares the current site. If a short code is generated or entries exist, the link includes an import parameter so the list can be restored after scanning. If no entries and no code, it shares the base homepage URL.",
    win_title: "Congratulations",
    win_line: "{name} ×{count}",
    win_unit_yi: "",
    win_unit_wan: "",
    win_unit_qian: "",
    win_unit_bai: "",
    win_unit_shi: "",
    win_unit_ge: "",
    toast_copied: "Copied",
    toast_pasted: "Pasted",
    toast_added: "Added {count}",
    toast_latest: "Switched to latest round",
    toast_generated: "Export code generated",
    toast_applied: "Imported",
    toast_cleared: "List cleared",
    toast_checked: "Checked",
    group_label: "Group",
    number_label: "Number (6 digits)",
    group_ph: "e.g. 110",
    number_ph: "e.g. 123456",
    check_btn: "Check",
    hint: "Your inputs are not stored.",
    result_title: "Result",
    result_desc: "All matching prizes will be shown.",
    result_note: "Results are for reference only; please rely on the official scan at the lottery counter.",
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
let currentSort = "added";
let lastResults = null;
const entries = [];
let toastTimer = null;
let winTimer = null;
let winActive = false;
let winStageTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast || !message) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function showWinOverlay(total, results, bestRank) {
  const overlay = document.getElementById("winOverlay");
  const amountEl = document.getElementById("winAmount");
  const breakdownEl = document.getElementById("winBreakdown");
  const unitsEl = document.getElementById("winUnits");
  const titleEl = document.querySelector(".win-title");
  const tableEl = document.getElementById("winTable");
  if (!overlay || !amountEl) return;
  const amountParts = formatWinAmountParts(total);
  const digits = String(Math.floor(total));
  if (tableEl) {
    const unitMap = {
      8: t("win_unit_yi"),
      4: t("win_unit_wan"),
      3: t("win_unit_qian"),
      2: t("win_unit_bai"),
      1: t("win_unit_shi"),
      0: t("win_unit_ge")
    };
    const unitCells = digits.split("").map((_, idx) => {
      const pos = digits.length - 1 - idx;
      const unit = currentLang === "en" ? "" : (unitMap[pos] || "");
      return `<td class="win-cell unit">${unit}</td>`;
    }).join("");
    const digitCells = digits.split("").map(d => `<td class="win-cell">${d}</td>`).join("");
    const prefix = amountParts.prefix ? `<td class="win-cell currency" rowspan="2">${amountParts.prefix}</td>` : "";
    const suffix = amountParts.suffix ? `<td class="win-cell currency" rowspan="2">${amountParts.suffix}</td>` : "";
    tableEl.innerHTML = `
      <tbody>
        <tr>${prefix}${unitCells}${suffix}</tr>
        <tr>${digitCells}</tr>
      </tbody>
    `;
  }

  const maxWidth = window.innerWidth * 0.86;
  const maxHeight = window.innerHeight * 0.5;
  let size = Math.min(180, Math.max(60, window.innerWidth * 0.2));
  amountEl.style.fontSize = `${size}px`;
  amountEl.style.lineHeight = "1";

  for (let i = 0; i < 14; i += 1) {
    const rect = amountEl.getBoundingClientRect();
    if (rect.width <= maxWidth && rect.height <= maxHeight) break;
    size = Math.max(36, size - 8);
    amountEl.style.fontSize = `${size}px`;
  }
  if (unitsEl) unitsEl.innerHTML = "";

  if (titleEl) titleEl.textContent = t("win_title");
  if (breakdownEl) {
    const lines = buildWinBreakdown(results);
    breakdownEl.innerHTML = lines.map(line => `<div>${line}</div>`).join("");
  }
  overlay.classList.remove("show-text");
  overlay.classList.add("is-active");
  overlay.setAttribute("aria-hidden", "false");
  winActive = true;
  if (winTimer) window.clearTimeout(winTimer);
  if (winStageTimer) window.clearTimeout(winStageTimer);
  winStageTimer = window.setTimeout(() => {
    overlay.classList.add("show-text");
    triggerFireworks(bestRank);
  }, 650);
}

function hideWinOverlay() {
  if (!winActive) return;
  const overlay = document.getElementById("winOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-active", "show-text");
  overlay.setAttribute("aria-hidden", "true");
  winActive = false;
}

document.addEventListener("click", () => {
  hideWinOverlay();
}, { capture: true });

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
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const k = el.getAttribute("data-i18n-aria");
    if (k) el.setAttribute("aria-label", t(k));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const k = el.getAttribute("data-i18n-title");
    if (k) el.setAttribute("title", t(k));
  });
  const scanBtn = document.getElementById("scan");
  const scanMobile = document.getElementById("scanMobile");
  if (scanBtn) scanBtn.textContent = t("scan_btn_note");
  if (scanMobile) scanMobile.textContent = t("scan_btn_note");
  const scanPreview = document.querySelector(".scan-preview");
  if (scanPreview) scanPreview.dataset.drop = t("scan_drop");
  updateLangIndicator();
  updateThemeButton(document.body.classList.contains("theme-night"));
  if (lastResults) {
    renderResultList(lastResults);
  } else {
    renderEntryList();
  }
}

function applyTheme(isNight) {
  document.body.classList.toggle("theme-night", isNight);
  updateThemeButton(isNight);
}

function updateThemeButton(isNight) {
  const btn = document.getElementById("theme");
  if (!btn) return;
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

  const allOptions = Array.from(roundSelect.options).map(opt => opt.cloneNode(true));

  function setActiveType(type) {
    typeButtons.forEach(btn => {
      const active = btn.dataset.type === type;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    typeSwitch.dataset.active = type;
    roundSelect.innerHTML = "";
    const filtered = allOptions.filter(opt => opt.dataset.type === type);
    filtered.forEach(opt => roundSelect.appendChild(opt.cloneNode(true)));
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
      showToast(t("toast_latest"));
    }
  });

  const current = roundSelect.selectedOptions[0];
  setActiveType(current ? current.dataset.type : "jumbo");
}

setupRoundSwitch();

function importFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("import");
  if (!code) return;
  const items = decodeEntries(code);
  if (!items || items.length === 0) return;
  entries.splice(0, entries.length);
  addEntries(items);
  resetResultView();
  renderEntryList();
  const input = document.getElementById("exportInput");
  if (input) input.value = code;
  showToast(t("toast_applied"));
}

importFromUrl();

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

function encodeEntries(list) {
  if (!list.length) return "";
  const bytes = new Uint8Array(list.length * 4);
  list.forEach((e, idx) => {
    const group = Math.min(999, Math.max(0, Number(normGroup(e.group))));
    const number = Math.min(999999, Math.max(0, Number(pad6(e.number))));
    const val = (group << 20) | number;
    const offset = idx * 4;
    bytes[offset] = (val >>> 24) & 0xff;
    bytes[offset + 1] = (val >>> 16) & 0xff;
    bytes[offset + 2] = (val >>> 8) & 0xff;
    bytes[offset + 3] = val & 0xff;
  });
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeEntries(token) {
  const raw = String(token || "").trim();
  if (!raw) return null;
  let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  if (b64.length % 4) b64 += "=".repeat(4 - (b64.length % 4));
  let binary = "";
  try {
    binary = atob(b64);
  } catch {
    return null;
  }
  if (!binary || binary.length % 4 !== 0) return null;
  const items = [];
  for (let i = 0; i < binary.length; i += 4) {
    const b0 = binary.charCodeAt(i);
    const b1 = binary.charCodeAt(i + 1);
    const b2 = binary.charCodeAt(i + 2);
    const b3 = binary.charCodeAt(i + 3);
    const val = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    const group = String((val >>> 20) & 0x3ff).padStart(3, "0");
    const number = String(val & 0xfffff).padStart(6, "0");
    items.push({ group, number });
  }
  return items;
}

const SHARE_BASE_URL = "https://szyoo.github.io/nenmatsu-jumbo-checker/";
let qrInstance = null;

function buildShareUrl(code) {
  return `${SHARE_BASE_URL}?import=${encodeURIComponent(code)}`;
}

function getShareCode() {
  const input = document.getElementById("exportText");
  const current = String(input?.value || "").trim();
  if (current) return current;
  if (entries.length > 0) {
    const generated = encodeEntries(entries);
    if (input) input.value = generated;
    return generated;
  }
  return "";
}

function renderEntryList() {
  const totalEl = document.getElementById("resultTotal");
  const listEl = document.getElementById("resultList");
  if (!listEl || !totalEl) return;
  if (entries.length === 0) {
    totalEl.textContent = t("empty_list");
    listEl.innerHTML = "";
    return;
  }
  totalEl.textContent = t("added_count").replace("{count}", String(entries.length));
  listEl.innerHTML = entries.map(e => `
      <li class="result-item" data-key="${e.group}-${e.number}">
        <span class="badge">📌</span>
        <span>${formatGroupNumber(e.group, e.number)}</span>
        <button class="remove" type="button" aria-label="${t("remove_label")}">✕</button>
      </li>
    `).join("");
}

function resetResultView() {
  const sortWrap = document.getElementById("sortWrap");
  if (sortWrap) {
    sortWrap.classList.remove("is-visible");
    sortWrap.setAttribute("aria-hidden", "true");
  }
  lastResults = null;
}

function renderResultList(results = []) {
  const totalEl = document.getElementById("resultTotal");
  const listEl = document.getElementById("resultList");
  const sortWrap = document.getElementById("sortWrap");
  if (!totalEl || !listEl) return;

  if (results.length === 0) {
    totalEl.textContent = t("empty_list");
    listEl.innerHTML = "";
    if (sortWrap) {
      sortWrap.classList.remove("is-visible");
      sortWrap.setAttribute("aria-hidden", "true");
    }
    return;
  }

  lastResults = results;
  if (sortWrap) {
    sortWrap.classList.add("is-visible");
    sortWrap.setAttribute("aria-hidden", "false");
  }

  const display = sortResults(results, currentSort);
  const total = results.reduce((sum, r) => sum + r.total, 0);
  const bestRank = getBestRank(results);
  totalEl.textContent = `${t("total")}: ${yen(total)}`;
  if (total > 0) {
    if (bestRank < 7) {
      showWinOverlay(total, results, bestRank);
    } else {
      triggerFireworks(bestRank);
    }
  }
  listEl.innerHTML = display.map(r => {
    const emoji = r.total > 0 ? "🎉" : "❌";
    const amount = r.total > 0 ? yen(r.total) : yen(0);
    return `
      <li class="result-item" data-key="${r.group}-${r.number}">
        <span class="badge">${emoji}</span>
        <span>${formatGroupNumber(r.group, r.number)}</span>
        <span class="amount">${amount}${r.total > 0 ? ' <span class="amount-emoji">🎉</span>' : ""}</span>
        <button class="remove" type="button" aria-label="${t("remove_label")}">✕</button>
      </li>
    `;
  }).join("");
}

function sortResults(results, sortKey) {
  const arr = [...results];
  if (sortKey === "amount_desc") {
    return arr.sort((a, b) => b.total - a.total);
  }
  if (sortKey === "amount_asc") {
    return arr.sort((a, b) => a.total - b.total);
  }
  if (sortKey === "group_number") {
    return arr.sort((a, b) => {
      const g = Number(a.group) - Number(b.group);
      if (g !== 0) return g;
      return Number(a.number) - Number(b.number);
    });
  }
  return arr;
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

  function insetRect(rect, padRatio = 0.08) {
    const padX = Math.floor(rect.w * padRatio);
    const padY = Math.floor(rect.h * padRatio);
    return {
      x: rect.x + padX,
      y: rect.y + padY,
      w: rect.w - padX * 2,
      h: rect.h - padY * 2
    };
  }

  const groupRect = insetRect({
    x: Math.floor(w * 0.30),
    y: Math.floor(h * 0.26),
    w: Math.floor(w * 0.40),
    h: Math.floor(h * 0.18)
  });
  const numberRect = insetRect({
    x: Math.floor(w * 0.24),
    y: Math.floor(h * 0.54),
    w: Math.floor(w * 0.52),
    h: Math.floor(h * 0.20)
  });
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
    if (rawEl) {
      rawEl.textContent = `${t("scan_raw_group")}:\n${groupRaw}\n\n${t("scan_raw_number")}:\n${numberRaw}`.trim();
    }
    const groupText = groupRaw.replace(/[^0-9組]/g, " ");
    const numberText = numberRaw.replace(/[^0-9]/g, " ");

    const groupMatch = groupText.match(/(\d{1,3})\s*組/);
    let group = groupMatch ? groupMatch[1].padStart(3, "0") : "";
    if (!group) {
      const digitGroups = (groupText.match(/\d+/g) || []).filter(x => x.length <= 3);
      if (digitGroups.length) group = digitGroups[digitGroups.length - 1].padStart(3, "0");
    }
    const numCandidates = (numberText.match(/\d{6,}/g) || []);
    const number = numCandidates.length ? numCandidates[0].slice(0, 6) : "";
    scanState.group = group;
    scanState.number = number;
    groupEl.value = group || "";
    numberEl.value = number || "";
    const ok = Boolean(groupEl.value && numberEl.value);
    status.textContent = ok ? t("scan_ok") : t("scan_tip");
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
    renderEntryList();
  }
  closeScanModal();
});

document.getElementById("scanCopy").addEventListener("click", () => {
  const rawEl = document.getElementById("scanRaw");
  if (!rawEl) return;
  const text = rawEl.textContent || "";
  if (!text.trim()) return;
  navigator.clipboard?.writeText(text);
  showToast(t("toast_copied"));
});

document.getElementById("exportGenerate")?.addEventListener("click", () => {
  const input = document.getElementById("exportText");
  if (!input) return;
  if (entries.length === 0) {
    showToast(t("export_empty"));
    return;
  }
  input.value = encodeEntries(entries);
  showToast(t("toast_generated"));
});

document.getElementById("exportCopy")?.addEventListener("click", async () => {
  const input = document.getElementById("exportText");
  if (!input) return;
  const token = String(input.value || "").trim();
  if (!token) {
    showToast(t("export_no_code"));
    return;
  }
  try {
    await navigator.clipboard?.writeText(token);
  } catch {
    input.focus();
    input.select();
  }
  showToast(t("toast_copied"));
});

document.getElementById("exportPaste")?.addEventListener("click", async () => {
  const input = document.getElementById("exportInput");
  if (!input) return;
  try {
    const text = await navigator.clipboard?.readText();
    if (text) input.value = text.trim();
    showToast(t("toast_pasted"));
  } catch {
    showToast(t("export_paste_failed"));
  }
});

document.getElementById("exportApply")?.addEventListener("click", () => {
  const input = document.getElementById("exportInput");
  if (!input) return;
  const items = decodeEntries(input.value);
  if (!items || items.length === 0) {
    showToast(t("export_invalid"));
    return;
  }
  entries.splice(0, entries.length);
  addEntries(items);
  resetResultView();
  renderEntryList();
  showToast(t("toast_applied"));
});

document.getElementById("exportQr")?.addEventListener("click", async () => {
  const input = document.getElementById("exportText");
  if (!input) return;
  let url = SHARE_BASE_URL;
  const hadCode = Boolean(String(input.value || "").trim());
  const code = getShareCode();
  if (code) {
    if (!hadCode && entries.length > 0) showToast(t("toast_generated"));
    url = buildShareUrl(code);
  }
  const modal = document.getElementById("qrModal");
  const canvas = document.getElementById("qrCanvas");
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
  const urlText = document.getElementById("qrUrlText");
  if (urlText) urlText.textContent = url;
  if (!canvas || !window.QRCode) {
    showToast(t("qr_fail"));
    return;
  }
  try {
    if (qrInstance && typeof qrInstance.makeCode === "function") {
      qrInstance.makeCode(url);
    } else {
      canvas.innerHTML = "";
      qrInstance = new window.QRCode(canvas, {
        text: url,
        width: 240,
        height: 240,
        colorDark: "#111111",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
      });
    }
  } catch {
    showToast(t("qr_fail"));
  }
});

document.getElementById("qrClose")?.addEventListener("click", () => {
  const modal = document.getElementById("qrModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
});

document.getElementById("qrSave")?.addEventListener("click", () => {
  const canvas = document.getElementById("qrCanvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = "nenmatsu-jumbo-qr.png";
  const innerCanvas = canvas.querySelector("canvas");
  const innerImg = canvas.querySelector("img");
  if (innerCanvas) {
    link.href = innerCanvas.toDataURL("image/png");
  } else if (innerImg && innerImg.src) {
    link.href = innerImg.src;
  } else {
    const table = canvas.querySelector("table");
    if (!table) {
      showToast(t("qr_fail"));
      return;
    }
    const size = 240;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d");
    if (!ctx) {
      showToast(t("qr_fail"));
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const rows = Array.from(table.querySelectorAll("tr"));
    const count = rows.length || 1;
    const cellSize = size / count;
    rows.forEach((row, r) => {
      const cells = Array.from(row.querySelectorAll("td"));
      cells.forEach((cell, c) => {
        const color = cell.style.backgroundColor || cell.style.background || "";
        if (color && color !== "transparent") {
          ctx.fillStyle = color;
          ctx.fillRect(c * cellSize, r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
        }
      });
    });
    link.href = off.toDataURL("image/png");
  }
  link.click();
  showToast(t("qr_saved"));
});

document.getElementById("qrUrlCopy")?.addEventListener("click", async () => {
  const urlText = document.getElementById("qrUrlText");
  const text = String(urlText?.textContent || "").trim();
  if (!text) return;
  try {
    await navigator.clipboard?.writeText(text);
    showToast(t("toast_copied"));
  } catch {
    showToast(t("export_paste_failed"));
  }
});

document.getElementById("sortBtn")?.addEventListener("click", () => {
  const menu = document.getElementById("sortMenu");
  const btn = document.getElementById("sortBtn");
  if (!menu || !btn) return;
  const open = menu.classList.toggle("is-open");
  btn.setAttribute("aria-expanded", String(open));
});

document.getElementById("sortMenu")?.addEventListener("click", (e) => {
  const item = e.target.closest("button[data-sort]");
  if (!item) return;
  currentSort = item.dataset.sort;
  const menu = document.getElementById("sortMenu");
  const btn = document.getElementById("sortBtn");
  if (menu) menu.classList.remove("is-open");
  if (btn) btn.setAttribute("aria-expanded", "false");
  if (lastResults) renderResultList(lastResults);
});

document.addEventListener("click", (e) => {
  const menu = document.getElementById("sortMenu");
  const btn = document.getElementById("sortBtn");
  if (!menu || !btn) return;
  if (menu.contains(e.target) || btn.contains(e.target)) return;
  menu.classList.remove("is-open");
  btn.setAttribute("aria-expanded", "false");
});

document.getElementById("showPrizes")?.addEventListener("click", async () => {
  const modal = document.getElementById("prizeModal");
  const listEl = document.getElementById("prizeList");
  const metaEl = document.getElementById("prizeMeta");
  if (!modal || !listEl || !metaEl) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  listEl.innerHTML = "";
  metaEl.textContent = "";

  try {
    const key = document.getElementById("round").value;
    const data = await loadData(key);
    metaEl.textContent = formatTemplate("prize_meta", { round: data.meta.round, year: data.meta.year });
    listEl.innerHTML = data.prizes.map(p => {
      let num = "";
      if (p.type === "exact") num = formatGroupNumber(p.group, p.number);
      else if (p.type === "mini_exact") {
        num = formatTemplate("prize_group_last", { digit: p.group_last_digit, number: p.number });
      } else if (p.type === "common_all_groups") {
        num = formatTemplate("prize_common", { number: p.number });
      } else if (p.type === "last_n_digits") {
        num = formatTemplate("prize_last_n", { n: p.n, digits: p.digits });
      }
      else num = p.number || "";
      return `
        <li class="prize-item">
          <span class="name">${translatePrizeName(p.name)}</span>
          <span class="num">${num}</span>
          <span>${yen(p.amount)}</span>
        </li>
      `;
    }).join("");
  } catch (e) {
    metaEl.textContent = `${t("error_prefix")}: ${e.message || e}`;
  }
});

document.getElementById("prizeClose")?.addEventListener("click", () => {
  const modal = document.getElementById("prizeModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
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
    showToast(t("toast_added").replace("{count}", String(items.length)));
  }
  if (listEl) {
    renderEntryList();
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
      showToast(t("toast_checked"));
      return;
    }

    const results = entries.map(entry => {
      const { hits, total } = checkWin(entry, data);
      return { ...entry, hits, total };
    });
    renderResultList(results);
    showToast(t("toast_checked"));
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
    renderEntryList();
  }
});

document.getElementById("clearList").addEventListener("click", () => {
  entries.splice(0, entries.length);
  const totalEl = document.getElementById("resultTotal");
  const listEl = document.getElementById("resultList");
  const sortWrap = document.getElementById("sortWrap");
  lastResults = null;
  if (totalEl) totalEl.textContent = t("empty_list");
  if (listEl) listEl.innerHTML = "";
  if (sortWrap) {
    sortWrap.classList.remove("is-visible");
    sortWrap.setAttribute("aria-hidden", "true");
  }
  showToast(t("toast_cleared"));
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

function getEntryRank(hits = []) {
  let best = 99;
  hits.forEach(h => {
    const name = String(h.name || "");
    if (name.includes("1等") || name.includes("前後賞")) best = Math.min(best, 1);
    else if (name.includes("2等")) best = Math.min(best, 2);
    else if (name.includes("3等")) best = Math.min(best, 3);
    else if (name.includes("4等")) best = Math.min(best, 4);
    else if (name.includes("5等")) best = Math.min(best, 5);
    else if (name.includes("6等")) best = Math.min(best, 6);
    else if (name.includes("7等") || name.includes("組違い賞")) best = Math.min(best, 7);
  });
  return best === 99 ? null : best;
}

function buildWinBreakdown(results = []) {
  const counts = new Map();
  results.forEach(r => {
    if (!r.hits || r.hits.length === 0) return;
    const rank = getEntryRank(r.hits);
    if (!rank) return;
    const key = `prize_rank_${rank}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const lines = [];
  for (let rank = 1; rank <= 7; rank += 1) {
    const key = `prize_rank_${rank}`;
    const count = counts.get(key);
    if (!count) continue;
    const name = t(key);
    lines.push(t("win_line").replace("{name}", name).replace("{count}", String(count)));
  }
  return lines;
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
