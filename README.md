# Taiwan Lottery Statistics

以台灣彩券官方歷史資料建立可重現的統計分析與選號實驗。第一階段先蒐集並標準化今彩 539 開獎資料。

## 蒐集資料

```bash
python collect_data.py
```

輸出：

- `data/daily_cash.csv`：每期開獎日期、5 個獎號、銷售與獎金資料
- `data/daily_cash.metadata.json`：來源、蒐集時間、筆數及日期範圍

資料來源：[台灣彩券各期開獎結果資料下載](https://www.taiwanlottery.com/lotto/history/result_download/)。年度檔依官方說明每月 5 日更新至前一個月；程式另以官方查詢 API 補齊最近兩個月。

## 原則

歷史頻率、遺漏期數或連續出現等統計，只描述過去資料。若開獎機制公平且各期獨立，它們不會提高下一期單一組合的理論中獎機率；後續的「預測」會以回測結果呈現，不宣稱能保證獲利或中獎。
