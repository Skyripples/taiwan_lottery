const CSV_PATH = "data/daily_cash.csv";
const NUMBER_COLUMNS = ["number_1", "number_2", "number_3", "number_4", "number_5"];

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

function renderRanking(element, numbers) {
  const highestCount = Math.max(...numbers.map(({ count }) => count));
  const lowestCount = Math.min(...numbers.map(({ count }) => count));
  const spread = Math.max(highestCount - lowestCount, 1);

  element.innerHTML = numbers
    .map(({ number, count }, index) => {
      const relativeWidth = 58 + ((count - lowestCount) / spread) * 42;
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

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}.${month}.${day}`;
}

async function loadStatistics() {
  const hotElement = document.querySelector("#hot-numbers");
  const coldElement = document.querySelector("#cold-numbers");

  try {
    const response = await fetch(CSV_PATH);
    if (!response.ok) throw new Error(`資料讀取失敗 (${response.status})`);

    const draws = parseCsv(await response.text());
    if (!draws.length) throw new Error("歷史資料目前為空");

    const frequencies = calculateFrequency(draws);
    const hotNumbers = [...frequencies].sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 5);
    const coldNumbers = [...frequencies].sort((a, b) => a.count - b.count || a.number - b.number).slice(0, 5);

    renderRanking(hotElement, hotNumbers);
    renderRanking(coldElement, coldNumbers);

    document.querySelector("#draw-count").textContent = draws.length.toLocaleString("zh-TW");
    document.querySelector("#date-range").textContent = `${formatDate(draws[0].draw_date)}–${formatDate(draws.at(-1).draw_date)}`;
  } catch (error) {
    const message = `<li class="loading-row error-message">${error.message}，請稍後再試。</li>`;
    hotElement.innerHTML = message;
    coldElement.innerHTML = message;
    document.querySelector("#date-range").textContent = "暫時無法取得";
  }
}

document.querySelector("#current-year").textContent = new Date().getFullYear();
loadStatistics();
