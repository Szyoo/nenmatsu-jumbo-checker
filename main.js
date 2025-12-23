async function loadData(key) {
  const res = await fetch(`./data/${key}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`data/${key}.json を読み込めませんでした`);
  return await res.json();
}

function pad6(s) {
  const t = String(s ?? "").replace(/\D/g, "");
  return t.padStart(6, "0").slice(-6);
}

function normGroup(s) {
  return String(s ?? "").replace(/\D/g, "").padStart(2, "0").slice(-2);
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

  // 金额合计（重叠当选时也合算展示；你也可以改成只取最高奖）
  const total = hits.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);

  return { hits, total };
}

function yen(n) {
  try { return new Intl.NumberFormat("ja-JP").format(n) + "円"; }
  catch { return String(n) + "円"; }
}

document.getElementById("check").addEventListener("click", async () => {
  const resultEl = document.getElementById("result");
  resultEl.textContent = "判定中...";

  try {
    const key = document.getElementById("round").value;
    const data = await loadData(key);

    const input = {
      unit: String(document.getElementById("unit").value ?? "").trim(),
      group: normGroup(document.getElementById("group").value),
      number: pad6(document.getElementById("number").value)
    };

    if (!/^\d{2}$/.test(input.group)) throw new Error("組は数字2桁で入力してください（例: 01）");
    if (!/^\d{6}$/.test(input.number)) throw new Error("番号は6桁で入力してください（例: 123456）");

    const { hits, total } = checkWin(input, data);

    const header =
      `回号: 第${data.meta.round}回 (${data.meta.type})\n` +
      `ユニット: ${input.unit || "（未入力）"}\n` +
      `入力: ${input.group}組 ${input.number}\n\n`;

    if (hits.length === 0) {
      resultEl.textContent = header + "当せんなし";
      return;
    }

    const lines = hits.map(h => {
      const note = h.note ? ` / ${h.note}` : "";
      return `- ${h.name}: ${yen(h.amount)}${note}`;
    });

    resultEl.textContent = header + "当せん:\n" + lines.join("\n") + `\n\n合計: ${yen(total)}`;
  } catch (e) {
    resultEl.textContent = `エラー: ${e.message || e}`;
  }
});
