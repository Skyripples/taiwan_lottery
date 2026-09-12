const CSV_PATH = "data/daily_cash.csv";
const NUMBER_COLUMNS = ["number_1", "number_2", "number_3", "number_4", "number_5"];
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
  const hasFullGamePage = gameKey === "daily539";
  const supportsQuickPick = gameKey !== "bingo";
  document.querySelectorAll(".game-feature").forEach((element) => {
    element.hidden = hasFullGamePage ? false : !(supportsQuickPick && element.id === "quick-pick");
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
  if (hasFullGamePage || supportsQuickPick) {
    document.querySelector(hasFullGamePage ? "#daily539" : "#quick-pick")
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

function getDrawNumbers(draw) {
  return NUMBER_COLUMNS.map((column) => Number(draw[column]));
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

function calculateFrequency(draws) {
  const frequencies = new Map(Array.from({ length: 39 }, (_, index) => [index + 1, 0]));

  draws.forEach((draw) => {
    NUMBER_COLUMNS.forEach((column) => {
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

function renderRanking(element, numbers, highestCount) {
  element.innerHTML = numbers
    .map(({ number, count }, index) => {
      const relativeWidth = highestCount ? count / highestCount * 100 : 0;
      return `
        <li>
          <span class="rank">${String(index + 1).padStart(2, "0")}</span>
          <span class="number-ball">${String(number).padStart(2, "0")}</span>
          <span class="frequency-bar" aria-hidden="true"><span style="width: ${relativeWidth}%"></span></span>
          <span class="count">${count.toLocaleString("zh-TW")} 次</span>
        </li>`;
    })
    .join("");
}

function calculateSpecialNumbers(draws) {
  const latestFirst = [...draws].reverse();
  const recentDraws = draws.slice(-10);
  const recentCounts = new Map(calculateFrequency(recentDraws).map(({ number, count }) => [number, count]));
  const specials = [];

  for (let number = 1; number <= 39; number += 1) {
    let missed = 0;
    for (const draw of latestFirst) {
      if (getDrawNumbers(draw).includes(number)) break;
      missed += 1;
    }
    if (missed >= 3) specials.push({ number, value: missed, rule: `連續 ${missed} 期未開出`, priority: 1 });

    let appeared = 0;
    for (const draw of latestFirst) {
      if (!getDrawNumbers(draw).includes(number)) break;
      appeared += 1;
    }
    if (appeared >= 2) specials.push({ number, value: appeared, rule: `連續 ${appeared} 期開出`, priority: 2 });

    const recentCount = recentCounts.get(number) || 0;
    if (recentDraws.length >= 5 && recentCount >= 3) {
      specials.push({ number, value: recentCount, rule: `最近 ${recentDraws.length} 期開出 ${recentCount} 次`, priority: 3 });
    }
  }

  return specials.sort((a, b) => a.priority - b.priority || b.value - a.value || a.number - b.number);
}

function renderSpecialNumbers(draws) {
  const specials = calculateSpecialNumbers(draws);
  document.querySelector("#special-numbers").innerHTML = specials.length
    ? specials.map(({ number, rule }) => `
      <li>
        <span class="number-ball">${String(number).padStart(2, "0")}</span>
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

function updateStatistics(range = selectedStatsRange) {
  selectedStatsRange = range;
  const draws = getDrawsForStatsRange(historicalDraws, range);
  document.querySelectorAll(".stats-range-button").forEach((button) => {
    const isSelected = button.dataset.range === String(range);
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (!draws.length) {
    const message = "所選區間沒有可用資料。";
    document.querySelector("#hot-numbers").innerHTML = `<li class="loading-row error-message">${message}</li>`;
    document.querySelector("#cold-numbers").innerHTML = `<li class="loading-row error-message">${message}</li>`;
    document.querySelector("#special-numbers").innerHTML = `<li class="loading-row error-message">${message}</li>`;
    document.querySelector("#draw-count").textContent = "0";
    document.querySelector("#date-range").textContent = "暫時無資料";
    renderPairError(message);
    return;
  }

  const frequencies = calculateFrequency(draws);
  const highestCount = Math.max(...frequencies.map(({ count }) => count));
  const hotNumbers = [...frequencies].sort((a, b) => b.count - a.count || a.number - b.number);
  const coldNumbers = [...frequencies].sort((a, b) => a.count - b.count || a.number - b.number);

  renderRanking(document.querySelector("#hot-numbers"), hotNumbers, highestCount);
  renderRanking(document.querySelector("#cold-numbers"), coldNumbers, highestCount);
  renderSpecialNumbers(draws);
  renderPairAnalysis(draws);
  document.querySelector("#draw-count").textContent = draws.length.toLocaleString("zh-TW");
  document.querySelector("#date-range").textContent = `${formatDate(draws[0].draw_date)}–${formatDate(draws.at(-1).draw_date)}`;
}

async function loadStatistics() {
  const hotElement = document.querySelector("#hot-numbers");
  const coldElement = document.querySelector("#cold-numbers");

  try {
    const response = await fetch(CSV_PATH);
    if (!response.ok) throw new Error(`資料讀取失敗 (${response.status})`);

    const draws = parseCsv(await response.text());
    if (!draws.length) throw new Error("歷史資料目前為空");
    historicalDraws = draws;
  } catch (error) {
    const message = `<li class="loading-row error-message">${error.message}，請稍後再試。</li>`;
    hotElement.innerHTML = message;
    coldElement.innerHTML = message;
    document.querySelector("#special-numbers").innerHTML = message;
    document.querySelector("#date-range").textContent = "暫時無法取得";
    renderPairError(error.message || "同期雙號資料暫時無法取得。");
    setStatsRangeControlsEnabled(false);
    return;
  }

  updateAiAvailability();
  setStatsRangeControlsEnabled(true);
  updateStatistics("all");
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
