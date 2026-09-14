const CSV_PATH = "data/daily_cash.csv";
const NUMBER_COLUMNS = ["number_1", "number_2", "number_3", "number_4", "number_5"];
const HISTORICAL_GAMES = {
  daily539: { path: CSV_PATH, eyebrow: "DAILY CASH 539", title: "今彩 539", columns: NUMBER_COLUMNS, min: 1, max: 39 },
  lotto649: { path: "data/lotto649.csv", eyebrow: "LOTTO 6/49", title: "大樂透", columns: ["number_1", "number_2", "number_3", "number_4", "number_5", "number_6"], min: 1, max: 49 },
  power638: { path: "data/super_lotto638.csv", eyebrow: "SUPER LOTTO 638", title: "威力彩第一區", columns: ["number_1", "number_2", "number_3", "number_4", "number_5", "number_6"], min: 1, max: 38 },
  markSix39: { path: "data/39_m5.csv", eyebrow: "39 LOTTO", title: "39 樂合彩", columns: ["number_1", "number_2", "number_3", "number_4", "number_5"], min: 1, max: 39 },
  markSix49: { path: "data/49_m6.csv", eyebrow: "49 LOTTO", title: "49 樂合彩", columns: ["number_1", "number_2", "number_3", "number_4", "number_5", "number_6"], min: 1, max: 49 },
  threeStar: { path: "data/3_d.csv", eyebrow: "3-STAR", title: "3 星彩", columns: ["number_1", "number_2", "number_3"], min: 0, max: 9 },
  fourStar: { path: "data/4_d.csv", eyebrow: "4-STAR", title: "4 星彩", columns: ["number_1", "number_2", "number_3", "number_4"], min: 0, max: 9 },
};
const GAME_DETAILS = {
  daily539: {
    price: "每注 NT$50",
    play: "從 01–39 選出 5 個號碼；當期開出 5 個獎號，依對中數量決定獎項。",
    prizes: [["頭獎", "5 碼全中", "NT$8,000,000"], ["貳獎", "任 4 碼", "NT$20,000"], ["參獎", "任 3 碼", "NT$300"], ["肆獎", "任 2 碼", "NT$50"]],
    url: "https://www.taiwanlottery.com/lotto/info/daily_cash/",
  },
  lotto649: {
    price: "每注 NT$50",
    play: "從 01–49 選出 6 個號碼；開獎另有 1 個特別號，依主號與特別號的對中情形給獎。",
    prizes: [["頭獎", "6 個主號全中", "依當期獎金分配"], ["貳獎", "5 主號＋特別號", "依當期獎金分配"], ["參獎", "5 個主號", "依當期獎金分配"], ["肆獎", "4 主號＋特別號", "依當期獎金分配"], ["伍獎", "4 個主號", "NT$2,000"], ["陸獎", "3 主號＋特別號", "NT$1,000"], ["柒獎", "2 主號＋特別號", "NT$400"], ["普獎", "3 個主號", "NT$400"]],
    url: "https://www.taiwanlottery.com/lotto/info/lotto649/",
  },
  power638: {
    price: "每注 NT$100",
    play: "第一區從 01–38 選 6 個號碼，第二區從 01–08 選 1 個號碼；兩區分別對獎。",
    prizes: [["頭獎", "第一區 6 碼＋第二區", "依當期獎金分配"], ["貳獎", "第一區 6 碼", "依當期獎金分配"], ["參獎", "第一區 5 碼＋第二區", "NT$150,000"], ["肆獎", "第一區 5 碼", "NT$20,000"], ["伍獎", "第一區 4 碼＋第二區", "NT$4,000"], ["陸獎", "第一區 4 碼", "NT$800"], ["柒獎", "第一區 3 碼＋第二區", "NT$400"], ["捌獎", "第一區 2 碼＋第二區", "NT$200"], ["玖獎", "第一區 3 碼", "NT$100"], ["普獎", "第一區 1 碼＋第二區", "NT$100"]],
    url: "https://www.taiwanlottery.com/lotto/info/super_lotto638/",
  },
  markSix39: {
    price: "每注 NT$25",
    play: "從 01–39 選擇 2、3 或 4 個號碼；所選號碼全部包含在當期 5 個獎號內即中獎。",
    prizes: [["二合", "選 2 碼且全部對中", "NT$1,125"], ["三合", "選 3 碼且全部對中", "NT$11,250"], ["四合", "選 4 碼且全部對中", "NT$212,500"]],
    url: "https://www.taiwanlottery.com/lotto/info/39_m5/",
  },
  markSix49: {
    price: "每注 NT$25",
    play: "從 01–49 選擇 2、3 或 4 個號碼；所選號碼全部包含在當期 6 個獎號內即中獎。",
    prizes: [["二合", "選 2 碼且全部對中", "NT$1,250"], ["三合", "選 3 碼且全部對中", "NT$12,500"], ["四合", "選 4 碼且全部對中", "NT$200,000"]],
    url: "https://www.taiwanlottery.com/lotto/info/49_m6/",
  },
  threeStar: {
    price: "每注 NT$25",
    play: "從百位、十位、個位各選 0–9 的一個數字，依相同位置對中的位數給獎。",
    prizes: [["壹獎", "3 位數字及位置全中", "NT$5,000"], ["貳獎", "任 2 位數字及位置相同", "NT$500"], ["參獎", "任 1 位數字及位置相同", "NT$50"]],
    url: "https://www.taiwanlottery.com/lotto/info/3_d/",
  },
  fourStar: {
    price: "每注 NT$25",
    play: "從千位、百位、十位、個位各選 0–9 的一個數字，依相同位置對中的位數給獎。",
    prizes: [["壹獎", "4 位數字及位置全中", "NT$50,000"], ["貳獎", "任 3 位數字及位置相同", "NT$5,000"], ["參獎", "任 2 位數字及位置相同", "NT$500"]],
    url: "https://www.taiwanlottery.com/lotto/info/4_d/",
  },
};
const GAME_RULES = {
  daily539: { name: "今彩 539", rule: "01–39 選 5 個不重複號碼", groups: [{ count: 5, max: 39 }] },
  lotto649: { name: "大樂透", rule: "01–49 選 6 個不重複號碼", groups: [{ count: 6, max: 49 }] },
  power638: {
    name: "威力彩",
    rule: "第一區 01–38 選 6 個，第二區 01–08 選 1 個",
    groups: [
      { label: "第一區", count: 6, max: 38 },
      { label: "第二區（特別號）", count: 1, max: 8, secondary: true },
    ],
  },
  threeStar: { name: "3 星彩", rule: "百、十、個位各取 0–9 一個數字", digits: 3 },
  fourStar: { name: "4 星彩", rule: "千、百、十、個位各取 0–9 一個數字", digits: 4 },
  bingo: { name: "BINGO BINGO 10 星", rule: "01–80 選 10 個不重複號碼", groups: [{ count: 10, max: 80 }] },
  markSix39: { name: "39 樂合彩（二合）", rule: "01–39 選 2 個不重複號碼", groups: [{ count: 2, max: 39 }] },
  markSix49: { name: "49 樂合彩（二合）", rule: "01–49 選 2 個不重複號碼", groups: [{ count: 2, max: 49 }] },
};

let selectedGame = null;
let historicalDraws = [];
const historicalDrawsByGame = {};
const historicalDataErrors = {};
const historicalMetadata = {};
let selectedStatsRange = "all";

function secureRandomInt(max) {
  const range = 0x100000000;
  const limit = range - (range % max);
  const value = new Uint32Array(1);
  do window.crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % max;
}

function drawUniqueNumbers(count, max) {
  const numbers = new Set();
  while (numbers.size < count) numbers.add(secureRandomInt(max) + 1);
  return [...numbers].sort((a, b) => a - b);
}

function renderPickGroup(numbers, { label = "", secondary = false, digits = false } = {}) {
  const balls = numbers
    .map((number, index) => `<span class="pick-ball${secondary ? " secondary" : ""}${digits ? " digit-ball" : ""}" style="animation-delay:${index * 45}ms">${digits ? number : String(number).padStart(2, "0")}</span>`)
    .join("");
  return `<div class="pick-group">${label ? `<span class="pick-label">${label}</span>` : ""}${balls}</div>`;
}

function generateNumbers() {
  const game = GAME_RULES[selectedGame];
  const result = document.querySelector("#quick-pick-result");
  if (!game || selectedGame === "bingo") return;

  if (game.digits) {
    const digits = Array.from({ length: game.digits }, () => secureRandomInt(10));
    const positions = game.digits === 3 ? "百位 · 十位 · 個位" : "千位 · 百位 · 十位 · 個位";
    result.innerHTML = renderPickGroup(digits, { label: positions, digits: true });
  } else {
    result.innerHTML = game.groups
      .map((group) => renderPickGroup(drawUniqueNumbers(group.count, group.max), group))
      .join("");
  }

}

function selectGame(gameKey) {
  selectedGame = gameKey;
  const game = GAME_RULES[gameKey];
  const hasStatistics = Boolean(HISTORICAL_GAMES[gameKey]);
  const hasFullGamePage = gameKey === "daily539";
  const supportsQuickPick = gameKey !== "bingo";
  document.querySelectorAll(".game-feature").forEach((element) => {
    const isQuickPick = supportsQuickPick && element.id === "quick-pick";
    const isStatistics = hasStatistics && (element.id === "game-rules" || element.id === "historical-stats" || element.classList.contains("notice"));
    const isDailyOnly = hasFullGamePage && (element.id === "ai-pick" || element.classList.contains("pair-section"));
    element.hidden = !(isQuickPick || isStatistics || isDailyOnly);
  });
  document.querySelectorAll(".game-card").forEach((card) => {
    const isSelected = card.dataset.game === gameKey;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });
  document.querySelector("#selected-game-name").textContent = game.name;
  document.querySelector("#selected-game-rule").textContent = game.rule;
  document.querySelector("#quick-pick-result").innerHTML = "<p>按下按鈕，產生你的隨機號碼</p>";
  updateAiAvailability();
  resetAiResults();
  if (hasStatistics) {
    updateStatistics("all");
  }
  if (hasStatistics || supportsQuickPick) {
    document.querySelector(hasStatistics ? "#game-rules" : "#quick-pick")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showHome() {
  selectedGame = null;
  document.querySelectorAll(".game-card").forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
  });
  document.querySelectorAll(".game-feature").forEach((element) => {
    element.hidden = true;
  });
  document.querySelector("#quick-pick-result").innerHTML = "<p>按下按鈕，產生你的隨機號碼</p>";
  resetAiResults();
  updateAiAvailability();
  document.querySelector("#top").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAiResults() {
  const results = document.querySelector("#ai-results");
  results.innerHTML = "";
  results.hidden = true;
}

function getDrawNumbers(draw, columns = NUMBER_COLUMNS) {
  return columns.map((column) => Number(draw[column]));
}

function rankByFrequency(draws) {
  return calculateFrequency(draws).sort((a, b) => b.count - a.count || a.number - b.number);
}

function calculateLongestStreaks(draws) {
  const current = Array(40).fill(0);
  const longest = Array(40).fill(0);
  draws.forEach((draw) => {
    const drawn = new Set(getDrawNumbers(draw));
    for (let number = 1; number <= 39; number += 1) {
      current[number] = drawn.has(number) ? current[number] + 1 : 0;
      longest[number] = Math.max(longest[number], current[number]);
    }
  });
  return Array.from({ length: 39 }, (_, index) => ({ number: index + 1, streak: longest[index + 1] }))
    .sort((a, b) => b.streak - a.streak || a.number - b.number);
}

function calculateOverdue(draws) {
  const lastSeen = Array(40).fill(-1);
  draws.forEach((draw, drawIndex) => getDrawNumbers(draw).forEach((number) => { lastSeen[number] = drawIndex; }));
  return Array.from({ length: 39 }, (_, index) => ({
    number: index + 1,
    overdue: draws.length - 1 - lastSeen[index + 1],
  })).sort((a, b) => b.overdue - a.overdue || a.number - b.number);
}

function combineUnique(...lists) {
  const result = [];
  lists.flat().forEach((number) => {
    if (!result.includes(number)) result.push(number);
  });
  return result;
}

function weightedPick(ranked, count) {
  const pool = ranked.map(({ number, count: frequency }) => ({ number, weight: frequency }));
  const result = [];
  while (result.length < count) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let target = (secureRandomInt(1000000) / 1000000) * total;
    let selectedIndex = 0;
    for (let index = 0; index < pool.length; index += 1) {
      target -= pool[index].weight;
      if (target < 0) { selectedIndex = index; break; }
    }
    result.push(pool.splice(selectedIndex, 1)[0].number);
  }
  return result.sort((a, b) => a - b);
}

function buildAiPicks(draws) {
  const ranked = rankByFrequency(draws);
  const hot = ranked.map(({ number }) => number);
  const cold = [...ranked]
    .sort((a, b) => a.count - b.count || a.number - b.number)
    .map(({ number }) => number);
  const recentRanked = rankByFrequency(draws.slice(-60));
  const recent = recentRanked.map(({ number }) => number);
  const priorCounts = new Map(calculateFrequency(draws.slice(-120, -60)).map(({ number, count }) => [number, count]));
  const momentum = recentRanked
    .map(({ number, count }) => ({ number, gain: count - (priorCounts.get(number) || 0) }))
    .sort((a, b) => b.gain - a.gain || a.number - b.number);
  const streaks = calculateLongestStreaks(draws);
  const overdue = calculateOverdue(draws);
  const streakChoice = streaks.find(({ number }) => !hot.slice(0, 4).includes(number));
  const oddHot = hot.filter((number) => number % 2 === 1);
  const evenHot = hot.filter((number) => number % 2 === 0);
  const lowHot = hot.filter((number) => number <= 20);
  const highHot = hot.filter((number) => number > 20);
  const mean = draws.length * 5 / 39;
  const neutral = [...ranked].sort((a, b) => Math.abs(a.count - mean) - Math.abs(b.count - mean) || a.number - b.number);

  return [
    { title: "歷年熱門組", numbers: hot.slice(0, 5), reason: "選用歷年累計出現次數最高的 5 個號碼。" },
    { title: "歷年冷門組", numbers: cold.slice(0, 5), reason: "選用歷年累計出現次數最低的 5 個號碼。" },
    { title: "熱門＋連莊組", numbers: combineUnique(hot.slice(0, 4), [streakChoice.number]).slice(0, 5), reason: `4 個歷年熱門號碼，加上曾連續 ${streakChoice.streak} 期開出的 ${String(streakChoice.number).padStart(2, "0")} 號。` },
    { title: "近期熱門組", numbers: recent.slice(0, 5), reason: "選用最近 60 期中出現次數最高的 5 個號碼。" },
    { title: "久未開出組", numbers: overdue.slice(0, 5).map(({ number }) => number), reason: `選用目前間隔期數最長的號碼，最久的 ${String(overdue[0].number).padStart(2, "0")} 號已間隔 ${overdue[0].overdue} 期。` },
    { title: "冷熱混合組", numbers: combineUnique(hot.slice(0, 3), cold.slice(0, 2)).slice(0, 5), reason: "組合 3 個歷年熱門號碼與 2 個歷年冷門號碼。" },
    { title: "近期升溫組", numbers: momentum.slice(0, 5).map(({ number }) => number), reason: "比較前後各 60 期，選出近期出現次數成長最明顯的號碼。" },
    { title: "奇偶平衡組", numbers: combineUnique(oddHot.slice(0, 3), evenHot.slice(0, 2)).slice(0, 5), reason: "依歷年熱度挑選，配置為 3 個奇數與 2 個偶數。" },
    { title: "大小平衡組", numbers: combineUnique(lowHot.slice(0, 3), highHot.slice(0, 2)).slice(0, 5), reason: "依歷年熱度挑選，配置為 3 個低號（01–20）與 2 個高號（21–39）。" },
    { title: "頻率加權組", numbers: weightedPick(ranked, 5), reason: "依歷年出現頻率加權隨機抽取，保留變化且不重複選號。" },
  ].map((pick) => ({ ...pick, numbers: [...pick.numbers].sort((a, b) => a - b) }));
}

function renderAiPicks(picks) {
  const results = document.querySelector("#ai-results");
  results.hidden = false;
  results.innerHTML = picks.map((pick, index) => `
    <article class="ai-pick-card" style="animation-delay:${index * 45}ms">
      <span class="ai-pick-index">${String(index + 1).padStart(2, "0")}</span>
      <div class="ai-pick-content">
        <h3>${pick.title}</h3>
        <div class="ai-number-row">${pick.numbers.map((number) => `<span class="ai-number">${String(number).padStart(2, "0")}</span>`).join("")}</div>
        <p class="ai-reason"><strong>選號依據：</strong>${pick.reason}</p>
      </div>
    </article>`).join("");
}

function updateAiAvailability() {
  const button = document.querySelector("#generate-ai-picks");
  const supportsAi = selectedGame === "daily539";
  button.disabled = !supportsAi || !historicalDraws.length;
}

function generateAiPicks() {
  if (selectedGame !== "daily539" || !historicalDraws.length) return;
  renderAiPicks(buildAiPicks(historicalDraws));
  document.querySelector("#ai-pick").scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function calculateFrequency(draws, numberMin = 1, numberMax = 39, columns = NUMBER_COLUMNS) {
  const frequencies = new Map(Array.from({ length: numberMax - numberMin + 1 }, (_, index) => [index + numberMin, 0]));

  draws.forEach((draw) => {
    columns.forEach((column) => {
      const number = Number(draw[column]);
      if (frequencies.has(number)) frequencies.set(number, frequencies.get(number) + 1);
    });
  });

  return [...frequencies].map(([number, count]) => ({ number, count }));
}

function calculatePairFrequency(draws) {
  const pairs = [];
  const pairByKey = new Map();
  for (let first = 1; first <= 38; first += 1) {
    for (let second = first + 1; second <= 39; second += 1) {
      const pair = { first, second, count: 0 };
      pairs.push(pair);
      pairByKey.set(`${first}-${second}`, pair);
    }
  }

  draws.forEach((draw) => {
    const numbers = [...new Set(getDrawNumbers(draw))].sort((a, b) => a - b);
    for (let firstIndex = 0; firstIndex < numbers.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < numbers.length; secondIndex += 1) {
        pairByKey.get(`${numbers[firstIndex]}-${numbers[secondIndex]}`).count += 1;
      }
    }
  });

  return pairs.sort((a, b) => b.count - a.count || a.first - b.first || a.second - b.second);
}

function renderPairAnalysis(draws) {
  if (!draws.length) {
    renderPairError("所選區間沒有可用資料。");
    return;
  }
  const pairs = calculatePairFrequency(draws);
  document.querySelector("#pair-draw-count").textContent = draws.length.toLocaleString("zh-TW");
  document.querySelector("#pair-ranking-body").innerHTML = pairs.slice(0, 10).map((pair, index) => `
    <tr>
      <td class="pair-rank">${String(index + 1).padStart(2, "0")}</td>
      <td><span class="pair-ball">${String(pair.first).padStart(2, "0")}</span></td>
      <td><span class="pair-ball">${String(pair.second).padStart(2, "0")}</span></td>
      <td>${pair.count.toLocaleString("zh-TW")} 次</td>
      <td>${(pair.count / draws.length * 100).toFixed(2)}%</td>
    </tr>`).join("");
}

function renderPairError(message) {
  document.querySelector("#pair-draw-count").textContent = "—";
  document.querySelector("#pair-ranking-body").innerHTML = `<tr><td class="pair-error" colspan="5">${message}</td></tr>`;
}

function renderRanking(element, numbers, highestCount, config = HISTORICAL_GAMES.daily539) {
  element.innerHTML = numbers
    .map(({ number, count }, index) => {
      const relativeWidth = highestCount ? count / highestCount * 100 : 0;
      return `
        <li>
          <span class="rank">${String(index + 1).padStart(2, "0")}</span>
          <span class="number-ball">${config.min === 0 ? number : String(number).padStart(2, "0")}</span>
          <span class="frequency-bar" aria-hidden="true"><span style="width: ${relativeWidth}%"></span></span>
          <span class="count">${count.toLocaleString("zh-TW")} 次</span>
        </li>`;
    })
    .join("");
}

function calculateSpecialNumbers(draws, config = HISTORICAL_GAMES.daily539) {
  const latestFirst = [...draws].reverse();
  const recentDraws = draws.slice(-10);
  const recentCounts = new Map(Array.from({ length: config.max - config.min + 1 }, (_, index) => [index + config.min, 0]));
  recentDraws.forEach((draw) => {
    new Set(getDrawNumbers(draw, config.columns)).forEach((number) => {
      if (recentCounts.has(number)) recentCounts.set(number, recentCounts.get(number) + 1);
    });
  });
  const specials = [];

  for (let number = config.min; number <= config.max; number += 1) {
    let missed = 0;
    for (const draw of latestFirst) {
      if (getDrawNumbers(draw, config.columns).includes(number)) break;
      missed += 1;
    }
    if (missed >= 3) specials.push({ number, value: missed, rule: `連續 ${missed} 期未開出`, priority: 1 });

    let appeared = 0;
    for (const draw of latestFirst) {
      if (!getDrawNumbers(draw, config.columns).includes(number)) break;
      appeared += 1;
    }
    if (appeared >= 2) specials.push({ number, value: appeared, rule: `連續 ${appeared} 期開出`, priority: 2 });

    const recentCount = recentCounts.get(number) || 0;
    if (recentDraws.length >= 5 && recentCount >= 3) {
      specials.push({ number, value: recentCount, rule: `最近 ${recentDraws.length} 期中，有 ${recentCount} 期出現此數字（不限位置）`, priority: 3 });
    }
  }

  return specials.sort((a, b) => a.priority - b.priority || b.value - a.value || a.number - b.number);
}

function renderSpecialNumbers(draws, config) {
  const specials = calculateSpecialNumbers(draws, config);
  document.querySelector("#special-numbers").innerHTML = specials.length
    ? specials.map(({ number, rule }) => `
      <li>
        <span class="number-ball">${config.min === 0 ? number : String(number).padStart(2, "0")}</span>
        <span class="special-rule">${rule}</span>
      </li>`).join("")
    : '<li class="loading-row">目前沒有符合特殊規則的號碼。</li>';
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}.${month}.${day}`;
}

function getDrawsForStatsRange(draws, range) {
  const sortedDraws = [...draws].sort((a, b) =>
    a.draw_date.localeCompare(b.draw_date)
    || a.draw_no.localeCompare(b.draw_no, undefined, { numeric: true })
  );
  const requestedCount = Number(range);
  return Number.isInteger(requestedCount) && sortedDraws.length >= requestedCount
    ? sortedDraws.slice(-requestedCount)
    : sortedDraws;
}

function setStatsRangeControlsEnabled(enabled) {
  document.querySelectorAll(".stats-range-button").forEach((button) => {
    button.disabled = !enabled;
  });
}

function renderStatisticsMessage(message) {
  const markup = `<li class="loading-row error-message">${message}</li>`;
  document.querySelector("#hot-numbers").innerHTML = markup;
  document.querySelector("#cold-numbers").innerHTML = markup;
  document.querySelector("#special-numbers").innerHTML = markup;
  document.querySelector("#draw-count").textContent = "0";
  document.querySelector("#date-range").textContent = "暫時無法取得";
  document.querySelector("#last-updated").textContent = "—";
}

function updateStatisticsHeading(config) {
  document.querySelector("#stats-eyebrow").textContent = config.eyebrow;
  document.querySelector("#stats-title").innerHTML = `${config.title}<br />歷史數據統計`;
  document.querySelector("#stats-description").textContent = config.min === 0
    ? "冷熱統計為各位置合計出現次數，同期重複數字分別計次；特殊規則另以逐期出現情形計算。"
    : "統計每一期的開獎號碼，找出累計出現次數最高、最低與符合特殊規則的號碼。";
  document.querySelector(".stats-range-options").setAttribute("aria-label", `${config.title} 統計區間`);
}

function formatTaipeiTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function updateGameRules(gameKey) {
  const details = GAME_DETAILS[gameKey];
  document.querySelector("#rules-game-name").textContent = GAME_RULES[gameKey].name;
  document.querySelector("#rules-price").textContent = details.price;
  document.querySelector("#rules-play").textContent = details.play;
  document.querySelector("#rules-prize-body").innerHTML = details.prizes.map(([award, match, prize]) => `
    <tr>
      <th scope="row">${award}</th>
      <td>${match}</td>
      <td>${prize}</td>
    </tr>`).join("");
  document.querySelector("#rules-source").href = details.url;
}

function updateStatistics(range = selectedStatsRange) {
  selectedStatsRange = range;
  const config = HISTORICAL_GAMES[selectedGame];
  if (!config) return;
  updateGameRules(selectedGame);
  updateStatisticsHeading(config);
  const availableDraws = historicalDrawsByGame[selectedGame] || [];
  const draws = getDrawsForStatsRange(availableDraws, range);
  setStatsRangeControlsEnabled(Boolean(availableDraws.length));
  document.querySelectorAll(".stats-range-button").forEach((button) => {
    const isSelected = button.dataset.range === String(range);
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (!draws.length) {
    const message = historicalDataErrors[selectedGame] || "所選區間沒有可用資料。";
    renderStatisticsMessage(message);
    if (selectedGame === "daily539") renderPairError(message);
    return;
  }

  const frequencies = calculateFrequency(draws, config.min, config.max, config.columns);
  const highestCount = Math.max(...frequencies.map(({ count }) => count));
  const hotNumbers = [...frequencies].sort((a, b) => b.count - a.count || a.number - b.number);
  const coldNumbers = [...frequencies].sort((a, b) => a.count - b.count || a.number - b.number);

  renderRanking(document.querySelector("#hot-numbers"), hotNumbers, highestCount, config);
  renderRanking(document.querySelector("#cold-numbers"), coldNumbers, highestCount, config);
  renderSpecialNumbers(draws, config);
  if (selectedGame === "daily539") renderPairAnalysis(draws);
  document.querySelector("#draw-count").textContent = draws.length.toLocaleString("zh-TW");
  document.querySelector("#date-range").textContent = `${formatDate(draws[0].draw_date)}–${formatDate(draws.at(-1).draw_date)}`;
  document.querySelector("#last-updated").textContent = formatTaipeiTime(historicalMetadata[selectedGame]?.collected_at);
}

async function loadStatistics() {
  await Promise.all(Object.entries(HISTORICAL_GAMES).map(async ([gameKey, config]) => {
    try {
      const metadataPath = config.path.replace(/\.csv$/, ".metadata.json");
      const [response, metadataResponse] = await Promise.all([fetch(config.path), fetch(metadataPath)]);
      if (!response.ok || !metadataResponse.ok) throw new Error(`資料讀取失敗 (${response.status}/${metadataResponse.status})`);
      const [draws, metadata] = await Promise.all([response.text().then(parseCsv), metadataResponse.json()]);
      if (!draws.length) throw new Error("歷史資料目前為空");
      historicalDrawsByGame[gameKey] = draws;
      historicalMetadata[gameKey] = metadata;
      if (gameKey === "daily539") historicalDraws = draws;
    } catch (error) {
      historicalDataErrors[gameKey] = `${error.message}，請稍後再試。`;
    }
  }));
  updateAiAvailability();
  if (selectedGame && HISTORICAL_GAMES[selectedGame]) updateStatistics("all");
}

async function loadBulletin() {
  const content = document.querySelector("#bulletin-content");
  try {
    const response = await fetch("data/bulletin.json");
    if (!response.ok) throw new Error("速報資料尚未建立");
    const bulletin = await response.json();
    const items = [
      ...(bulletin.jackpots || []).map((item) => `
        <article class="bulletin-item jackpot-alert">
          <p>累積獎金速報</p>
          <h3>${item.game}累積金額約 ${Number(item.amount).toLocaleString("zh-TW")} 元</h3>
          <span>下次開獎：${formatTaipeiTime(item.next_draw_at)}</span>
        </article>`),
      ...(bulletin.errors || []).map((message) => `
        <article class="bulletin-item data-alert">
          <p>資料更新異常</p>
          <h3>${message}</h3>
          <span>系統將於下一個開獎更新時段再次嘗試。</span>
        </article>`),
    ];
    content.innerHTML = items.length ? items.join("") : '<p class="bulletin-empty">目前沒有超過 20 億元的累積獎金或資料更新異常。</p>';
  } catch (error) {
    content.innerHTML = `<p class="bulletin-empty">${error.message}</p>`;
  }
}

document.querySelector("#current-year").textContent = new Date().getFullYear();
document.querySelectorAll(".game-card").forEach((card) => card.addEventListener("click", () => selectGame(card.dataset.game)));
document.querySelector("#home-link").addEventListener("click", (event) => {
  event.preventDefault();
  showHome();
});
document.querySelector("#generate-numbers").addEventListener("click", generateNumbers);
document.querySelector("#generate-ai-picks").addEventListener("click", generateAiPicks);
document.querySelectorAll(".stats-range-button").forEach((button) => {
  button.addEventListener("click", () => updateStatistics(button.dataset.range));
});
loadStatistics();
loadBulletin();
