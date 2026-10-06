const LANGUAGE_KEY = "mapleroyals.language.v1";

function initialLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "zh-TW") return saved;
  } catch { /* Local storage may be disabled. */ }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("zh")
    ? "zh-TW" : "en";
}

let language = initialLanguage();

export function getLanguage() { return language; }
export function tr(english, chinese) { return language === "zh-TW" ? chinese : english; }

export function setLanguage(next) {
  if (next !== "en" && next !== "zh-TW") return;
  language = next;
  try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Keep this session's choice. */ }
  document.documentElement.lang = next;
  window.dispatchEvent(new Event("languagechange"));
}

// These pairs cover the visible interface. Model identifiers, skill names,
// source titles and raw JSON stay in their source language for auditability.
const PAIRS = [
  ["Appearance", "外觀"], ["Language", "語言"], ["System", "跟隨系統"], ["Light", "淺色"], ["Dark", "深色"],
  ["Progression", "成長曲線"], ["User Preset", "自訂配裝"], ["Library", "模型資料庫"],
  ["PHASE 5 · USER PRESET", "第 5 階段 · 自訂配裝"],
  ["Changelog", "更新紀錄"],
  ["A short history of changes visible in this site.", "本站已上線功能的簡要沿革。"],
  ["Latest refinements", "近期調整"],
  ["Personal range and Echo rounding, optional event NX gear, and the Sky Ski Krex reference.", "修正個人 Range 與 Echo 取整、新增活動 NX 裝備欄位，並改用 Sky Ski 的 Krex 參考資料。"],
  ["Phase 5 · User Preset", "第 5 階段 · 自訂配裝"],
  ["Character inputs, per-slot gear, three comparison presets, ammunition and passive attack, and English / Traditional Chinese switching.", "加入角色能力、逐部位裝備、三組配裝比較、彈藥與被動攻擊，以及英文／繁體中文切換。"],
  ["Public UI and gear review", "公開介面與裝備校對"],
  ["Simpler navigation and Library, improved light-theme readability, and aligned class gear fixtures.", "精簡導覽與模型資料庫、改善淺色主題可讀性，並對齊各職業裝備模型。"],
  ["Phase 4 · WDEF", "第 4 階段 · 物理防禦"],
  ["Bounded defense presets and a Netlify-ready static build.", "加入 WDEF 檔位，並準備可部署至 Netlify 的靜態網站。"],
  ["Phase 3 · Interactive site", "第 3 階段 · 互動網站"],
  ["Progression chart, reference layers, and a reviewable model Library.", "加入成長曲線、參考資料層及可檢視的模型資料庫。"],
  ["Phase 2 · Class models", "第 2 階段 · 職業模型"],
  ["Nine class engines and recovered authoritative gear and stat fixtures.", "建立九個職業引擎，並恢復各職業已確認的裝備與能力值資料。"],
  ["Phase 1 · Foundation", "第 1 階段 · 基礎架構"],
  ["Initial DPM chart and archived model inputs.", "建立最初的 DPM 圖表並歸檔模型輸入資料。"],
  ["Gear-driven Master v9.5.0 · Integration", "裝備驅動主模型 v9.5.0 · 整合版"],
  ["Gear & Damage Analysis", "配裝與傷害分析"],
  ["Compare how each class scales from Entry to End-game across every supported target count.", "比較各職業從入門到畢業、在不同目標數下的傷害成長。"],
  ["9 class engines live", "9 個職業引擎已上線"], ["WDEF presets enabled", "WDEF 預設檔已啟用"],
  ["Audited fixtures enabled", "已載入核對過的模型資料"],
  ["Explore the model", "探索模型"], ["View controls", "顯示與計算設定"],
  ["Loading authoritative data…", "載入模型資料中……"], ["Targets", "目標數"], ["Target count", "目標數"],
  ["Potion", "藥水"], ["Combat buffs", "戰鬥 Buff"], ["Shared buffs", "共用 Buff"],
  ["Maple Warrior", "楓葉祝福"], ["Maple Warrior level", "楓葉祝福等級"],
  ["fixed on · canonical timing", "固定開啟 · 標準攻速"],
  ["Class-owned buffs", "職業專屬 Buff"], ["Visible classes / selected preset", "顯示的職業／選取的配裝"],
  ["No visible class has a class-owned buff control.", "目前顯示的職業沒有專屬 Buff 開關。"],
  ["Reset buffs", "重設 Buff"], ["Classes shown", "顯示職業"],
  ["Toggle lines without changing the underlying calculation.", "切換曲線顯示不會改變計算結果。"],
  ["MW changes base AP only. X stays normalized to MW20 clean range. Shad uses its SE-off canonical model. Rage and Dragon Blood are mutually exclusive; SI is fixed on because alternate rotation timing is not verified.", "MW 只加成基礎 AP；X 軸固定以 MW20 Clean range 表示。Shad 使用標準 SE 關閉模型。Rage 與 Dragon Blood 互斥；SI 關閉的攻速尚未驗證，因此固定開啟。"],
  ["Progression curve", "成長曲線"], ["DPM vs MW20 clean range", "DPM 與 MW20 Clean range"],
  ["Each line follows one class from Entry to End-game.", "每條線代表一個職業從入門到畢業的進程。"],
  ["Reference layers", "參考資料層"], ["Forum median", "論壇中位數"], ["Forum #1", "論壇第一名"],
  ["Extreme", "極限配裝"], ["alternate", "替代設定"],
  ["Each layer follows the class filter. Fury is an alternate polearm configuration.", "參考資料層會跟隨職業篩選；Fury 是替代的長柄武器設定。"],
  ["Fit visible data", "符合可見資料"], ["Y-axis from 0", "Y 軸從 0 開始"],
  ["Range-only evidence · Published clean-range references", "僅 Range 證據 · 已發布的 Clean range 參考值"],
  ["Range-only evidence", "僅 Range 證據"],
  ["No range-only references are enabled for this view.", "目前沒有啟用的僅 Range 參考資料。"],
  ["Select at least one class to display the progression chart.", "請至少選擇一個職業以顯示成長曲線。"],
  ["Phase 5", "第 5 階段"],
  ["快速核對面板，或依部位建立配裝。計算沿用上方 Buff、藥水、目標數與 WDEF；SI 固定開啟。", "Quickly verify your character panel or enter gear by slot. Calculations use the buffs, potion, target count and WDEF above; SI stays on."],
  ["Open the calculation", "檢視計算過程"], ["Model Library", "模型資料庫"],
  ["Read the model through summaries, tables and calculation traces. Raw JSON stays available at the bottom for advanced inspection.", "透過摘要、表格與計算追蹤檢視模型。原始 JSON 收在頁面底部供進階檢查。"],
  ["Class models", "職業模型"], ["Mechanics", "計算機制"], ["Validation & sources", "驗證與來源"],
  ["Class", "職業"], ["Stage focus", "階段焦點"],
  ["Class models use the selected stage for the calculation trace and strategy DPM.", "職業模型會用所選階段顯示計算追蹤與策略 DPM。"],
  ["Model note:", "模型說明："],
  ["v9.5.0 integration · WDEF presets 0–4000 (Lv200 vs same/lower level). Shockwave and summon defense remain assumptions; negative base damage is floored at zero. Bucc 4T/6T workbook reconciliation remains pending. User Preset follows the same models; quick verification does not certify individual equipment requirements. Personal input stays in this browser.", "v9.5.0 整合版 · WDEF 預設 0–4000（Lv200 對同級或低級目標）。Shockwave 與召喚物防禦仍有假設；負傷害下限為零。Bucc 4T/6T 的工作表核對尚待完成。自訂配裝沿用相同模型；快速驗證不保證單件裝備符合需求。個人輸入僅留在此瀏覽器。"],
  ["Phase 5 · User Preset · local-only inputs", "第 5 階段 · 自訂配裝 · 資料僅存本機"],
  ["Entry", "入門"], ["Advanced", "進階"], ["Late-game", "後期"], ["End-game", "畢業"],
  ["0 · Baseline", "0 · 基準"], ["1000 · Low–medium", "1000 · 中低"], ["2000 · Medium", "2000 · 中等"],
  ["3200 · High", "3200 · 高"], ["4000 · Test ceiling", "4000 · 測試上限"],
  ["Off", "關閉"], ["average", "平均值"],
  ["Preset slots", "配裝欄位"], ["Preset name", "配裝名稱"], ["Preset comparison", "配裝比較"],
  ["Go to Progression", "前往成長曲線"],
  ["Preset", "配裝"], ["MW20 Clean Max", "MW20 Clean Max"], ["Status", "狀態"],
  ["Ready", "已計算"], ["Invalid", "未通過驗證"], ["Not calculated", "尚未計算"],
  ["輸入只保存在這個瀏覽器的本機儲存，不會上傳。按下計算後才會把個人點位送到 Progression。", "Inputs are saved only in this browser and are not uploaded. Calculate each preset to show its point on Progression."],
  ["1. 選擇職業與武器", "1. Choose class and weapon"], ["職業", "Class"], ["武器類別／指定武器", "Weapon type / weapon"],
  ["請選擇武器", "Choose a weapon"], ["2. 輸入模式", "2. Input mode"],
  ["快速驗證", "Quick verification"], ["無 MW Clean Max range、總 W.att、主副屬性", "No-MW Clean Max range, total W.att, main and secondary stats"],
  ["無 MW Clean Max range、裝備攻擊、彈藥與主副屬性", "No-MW Clean Max range, gear WA, ammo and stats"],
  ["無 MW Clean Max range、總 W.att 與主副屬性", "No-MW Clean Max range, total W.att and stats"],
  ["攻擊力輸入方式", "Attack input mode"],
  ["裝備攻擊（彈藥、被動另加）", "Gear WA (ammo and passive added separately)"],
  ["舊草稿：已含彈藥與被動的總攻擊", "Legacy draft: total WA already includes ammo and passive"],
  ["裝備 W.att（不含彈藥與被動）", "Gear W.att (excluding ammo and passive)"],
  ["舊版總 W.att（已含彈藥與被動）", "Legacy total W.att (ammo and passive included)"],
  ["箭袋／彈藥 W.att", "Quiver / ammunition W.att"],
  ["填入攻擊力後，這裡會顯示計算用總 W.att。", "Enter W.att to see the calculated total here."],
  ["若有使用箭袋／彈藥，請記得填入攻擊力。", "If you use a quiver / ammo, enter its W.att."],
  ["此草稿沿用舊版總攻擊，不會再加入彈藥與職業被動。改用裝備攻擊模式前，請先扣除原本手動加上的數值。", "This draft uses the old total WA; ammo and passive will not be added again. Subtract previously included bonuses before switching to gear WA."],
  ["裝備 W.att 不含箭袋／彈藥及職業被動；後兩者由下方加總。不要輸入藥水或攻擊 Buff。MW 只作用於基礎 AP。", "Gear W.att excludes quiver / ammo and class passive; both are added below. Exclude potions and attack buffs. MW affects base AP only."],
  ["總 W.att 直接用於計算；不含藥水或攻擊 Buff。MW 只作用於基礎 AP。", "Total W.att is used directly; exclude potions and attack buffs. MW affects base AP only."],
  ["舊草稿使用已含彈藥與被動的總 W.att，不會重複加總；建議檢查後切換成拆解輸入。", "Legacy draft total W.att includes ammo and passive, so neither is added again. Review before switching to the breakdown."],
  ["逐部位配裝", "Gear by slot"], ["基礎 AP＋逐部位裝備數值", "Base AP and gear stats by slot"],
  ["基礎 AP（不含裝備與 MW）", "Base AP (before gear and MW)"],
  ["預設為各職業 Lv.200 基礎配點；可改成自己的 AP。這些數值用於 MW 增量與 AP 合規檢查。", "Defaults use each class's level 200 base AP. Change them to your character's AP; these values determine the MW bonus and AP limit."],
  ["3. 無 MW Clean 面板", "3. No-MW clean character panel"],
  ["填入含裝備、但未開 MW 的面板總值；關閉 Echo、Rage／Dragon Blood 等攻擊 Buff，且不使用攻擊藥水。range 僅填 Clean Max；最小值由模型計算，DK 遊戲面板顯示的最小值不納入核對。", "Enter panel totals with gear but without MW, Echo, Rage / Dragon Blood or attack potions. Enter only Clean Max range; the model calculates the minimum and does not check the DK panel minimum."],
  ["總 W.att（無 MW）", "Total W.att (no MW)"], ["Clean Max range（無 MW）", "Clean Max range (no MW)"],
  ["總 W.att 包含武器、副手、其他裝備、投擲物／箭袋與職業固定被動；不含藥水及任何攻擊 Buff。MW 只作用於基礎 AP。", "Total W.att includes weapon, off-hand, other gear, ammunition / quiver and fixed class passives once. Exclude potions and attack buffs. MW affects base AP only."],
  ["3. 逐部位裝備數值", "3. Gear stats by slot"],
  ["空白裝備欄位視為 0。只顯示目前職業相關的主／副屬性與 W.att；主屬性武器需求不納入檢查。", "Blank gear fields count as zero. Only relevant stats and W.att appear; weapon main-stat requirements are not checked."],
  ["衣服形式（二選一）", "Clothing type (choose one)"], ["上衣＋下衣", "Top + bottom"], ["套服", "Overall"],
  ["武器類別已於上方選擇；此處只填入武器本體屬性與 W.att。", "Weapon choice is above; enter only the weapon item's stats and W.att here."],
  ["Shadower 副手固定為 Dragon Khanjar；盾牌自身屬性不能用來滿足自己的需求。", "Shadower's off-hand is fixed to Dragon Khanjar. Its own stats cannot satisfy its equip requirements."],
  ["投擲物／箭袋／子彈", "Throwing stars / quiver / bullets"],
  ["此職業沒有獨立的投擲物／箭袋／子彈欄位，數值固定為 0。", "This class has no separate ammunition / quiver field; the value is zero."],
  ["額外 W.att", "Additional W.att"], ["常用值可由提示選擇，也可以直接輸入自訂數值。", "Select a common value or enter your own."],
  ["計算 DPM 與 MW20 Clean range", "Calculate DPM and MW20 Clean range"],
  ["清除此組設定", "Clear this preset"], ["前往 Progression", "Go to Progression"],
  ["武器", "Weapon"], ["副手／盾牌", "Off-hand / shield"], ["頭盔", "Helmet"], ["臉部裝備", "Face accessory"],
  ["眼部裝備", "Eye accessory"], ["耳環", "Earring"], ["項鍊", "Pendant"], ["上衣", "Top"],
  ["下衣", "Bottom"], ["手套", "Gloves"], ["披風", "Cape"], ["鞋子", "Shoes"],
  ["腰帶", "Belt"], ["肩膀", "Shoulder"], ["勳章", "Medal"],
  ["已切換職業；不相容的武器、基礎 AP 與逐部位欄位已重設，請重新確認。", "Class changed. Incompatible weapon, base AP and gear fields were reset; review them before calculating."],
  ["已切換為套服；上衣與下衣數值已清除。", "Switched to Overall; top and bottom values were cleared."],
  ["已切換為上衣＋下衣；套服數值已清除。", "Switched to top + bottom; Overall values were cleared."],
  ["已清除本機設定；新的輸入變更後才會重新保存。", "This preset was cleared. New input will be saved after you edit it."],
  ["請選擇武器；只檢查已確認的副屬性需求。", "Choose a weapon. Only confirmed secondary-stat requirements are checked."],
  ["需求摘要：無已設定的副屬性門檻（主屬性門檻忽略）。", "Requirements: no configured secondary-stat threshold (main-stat requirements ignored)."],
  ["目前有尚未重新計算的變更；Progression 個人點位已暫停。", "Uncalculated changes: this preset's Progression point is paused."],
  ["填寫完成後按下計算，才會啟用個人結果。", "Calculate this preset to show its result."],
  ["正在等待引擎結果……", "Waiting for the calculation…"],
  ["請先修正以下欄位：", "Fix these fields first:"], ["計算結果", "Calculation result"],
  ["輸入已變更，請重新按下計算。", "Inputs changed. Calculate again."],
  ["尚未計算；結果會顯示在這裡。", "Not calculated yet. The result will appear here."],
  ["正在計算……", "Calculating…"], ["目前沒有可顯示的結果。", "No result to show."],
  ["這組輸入未通過模型驗證，未建立 Progression 點位。", "This preset failed validation and has no Progression point."],
  ["模型計算 MW20 Clean range", "Model MW20 Clean range"],
  ["模型計算 Clean range（無 MW）", "Model Clean range (no MW)"],
  ["技能分支", "Skill branch"], ["屬性計算明細", "Stat calculation details"],
  ["在 Progression 查看個人點位", "View preset point on Progression"],
  ["不可用", "Unavailable"],
  ["本機儲存不可用；輸入不會跨頁保存。", "Local storage is unavailable; inputs will not survive a reload."],
  ["無法讀取本機設定；已使用空白表單。", "Could not read local settings; using a blank form."],
  ["本機設定版本或格式不相容；已使用空白表單。", "Saved settings are incompatible; using a blank form."],
  ["本機設定的職業無法辨識；已使用空白表單。", "Saved class is unknown; using a blank form."],
  ["已載入上次的本機草稿；請按計算後才會重新啟用結果。", "Saved draft loaded. Calculate it to restore the result."],
  ["本機設定無法解析；已使用空白表單。", "Saved settings could not be parsed; using a blank form."],
  ["瀏覽器拒絕本機儲存；本次輸入只會保留到頁面關閉。", "Browser storage was denied; these inputs last for this session only."],
  ["職業選擇無效。", "Invalid class selection."],
  ["請選擇武器類別或指定武器。", "Choose a weapon type or weapon."],
  ["所選武器不屬於目前職業。", "This weapon is not available to the selected class."],
  ["額外 W.att 必須是 0 以上的數值。", "Additional W.att must be nonnegative."],
  ["無 MW 總 W.att 必須大於 0。", "Total no-MW W.att must be greater than zero."],
  ["無 MW Clean Max range 尚未填寫。", "Enter the no-MW Clean Max range."],
  ["武器 W.att 必須大於 0。", "Weapon W.att must be greater than zero."],
  ["目前選擇上衣＋下衣，套服欄位必須為空白或 0。", "Top + bottom is selected; Overall values must be blank or zero."],
  ["目前選擇套服，上衣與下衣欄位必須為空白或 0。", "Overall is selected; top and bottom values must be blank or zero."],
  ["面板比對通過僅代表總值一致；快速模式無法排除單件裝備自身屬性，裝備需求只做初步檢查。", "Matching panel totals do not prove individual gear requirements. Quick mode only checks them provisionally."],
  ["Dragon Khanjar 不能靠自己的屬性滿足需求；請用逐部位模式確認。", "Dragon Khanjar cannot use its own stats to satisfy its requirements. Use Gear by slot to verify."],
  ["快速模式使用已含彈藥／箭袋與被動的總 W.att，不重複加入逐部位模式的數值。", "Quick mode uses total W.att including ammunition / quiver and passives; those values are not added twice."],
  ["基礎 AP 四屬性合計不可超過 1030。", "Total base AP across four stats cannot exceed 1030."],
  ["各項基礎 AP 必須為 4～999 的整數。", "Each base AP value must be an integer from 4 to 999."],
  ["無 MW Clean Max range 與屬性／W.att 重算最大值不符（容許 1 點取整差異）。請確認面板已關閉 Buff，且攻擊力沒有漏算或重複。", "The no-MW Clean Max range differs from the value calculated from stats and W.att (±1 allowed). Check buffs and total W.att."],
  ["無 MW Clean Max range 與屬性／W.att 重算最大值不符（容許 1 點取整差異）。請對照上方攻擊力拆解，確認箭袋／彈藥有填、被動沒有重複加，且面板已關閉 Buff。", "The no-MW Clean Max range differs from the calculated value (±1 allowed). Check the attack breakdown above: include quiver / ammo, do not add the passive twice, and turn off attack buffs."],
  ["Corsair 3T 以上尚未支援 SE 關閉的計算。", "Corsair with 3+ targets and SE off is not supported."],
  ["無法存取本機儲存；表單已清除，但無法確認舊資料是否移除。", "Storage is unavailable; the form is cleared, but the saved draft may remain."],
  ["本機設定移除失敗；表單已清除，但舊資料可能仍留在瀏覽器中。", "Could not remove the saved draft; the form is cleared for this session."],
  ["Class model", "職業模型"], ["Aggregate inputs loaded", "已載入彙總數值"],
  ["Selected stage", "所選階段"], ["Stage aggregates", "各階段彙總"],
  ["Weapon, off-hand & ammunition", "武器、副手與彈藥"], ["Equipment by slot", "各部位裝備"],
  ["Skills and damage model", "技能與傷害模型"], ["Target strategy", "目標策略"],
  ["Calculation trace", "計算追蹤"], ["Buff and AP rules", "Buff 與 AP 規則"],
  ["Potion inputs", "藥水數值"], ["Weapon and range models", "武器與 Range 模型"],
  ["Calculation rules", "計算規則"], ["Version summary", "版本摘要"],
  ["Published reference records", "已發布的參考紀錄"], ["Pending source payloads", "待補來源資料"],
  ["Reading guide", "閱讀指南"], ["Raw JSON", "原始 JSON"],
  ["Clean WA", "無 Buff W.att"], ["MW20 clean range", "MW20 Clean range"],
  ["Current buffed range", "目前 Buff 後 Range"], ["Current DPM", "目前 DPM"],
  ["Stage", "階段"], ["Aggregate status", "彙總狀態"], ["Base AP", "基礎 AP"],
  ["MW bonus", "MW 加成"], ["Equipment stats", "裝備屬性"], ["Actual stats", "實際屬性"],
  ["Off-hand / shield", "副手／盾牌"], ["Throwing stars / bullets / quiver", "飛鏢／子彈／箭袋"],
  ["Reading status", "資料狀態"], ["Slot", "部位"],
  ["Targets", "目標數"], ["Mainline strategy", "主要策略"], ["Timing", "攻速／循環"],
  ["Target rule", "目標規則"], ["Special rule", "特殊規則"],
  ["Step", "步驟"], ["Item", "項目"], ["Current value", "目前數值"], ["Origin / rule", "來源／規則"],
  ["Rule", "規則"], ["Current behavior", "目前行為"], ["Control / value", "控制／數值"],
  ["Added WA", "增加 W.att"], ["Order", "順序"], ["Range model", "Range 模型"], ["Rule family", "公式類型"],
  ["Area", "範圍"], ["Version / value", "版本／數值"],
  ["Kind", "類型"], ["Label", "標籤"], ["Clean range", "Clean range"],
  ["Reference DPM (see basis)", "參考 DPM（見依據）"], ["Evidence status", "證據狀態"], ["Source", "來源"],
  ["Advanced inspection only. The primary Library view is represented by the tables and cards above.", "僅供進階檢查；主要內容已整理在上方表格與卡片中。"],
  ["No slot table was recovered for this class. Aggregate inputs remain visible above.", "此職業尚無可用的裝備部位表；上方仍提供彙總數值。"],
  ["No pending payloads are listed.", "目前沒有待補資料。"],
  ["Not applicable", "不適用"], ["Not provided in current source", "目前來源未提供"],
  ["Exact slot values", "部位精確值"], ["Representative equipment", "代表性裝備"], ["Confirmed aggregate", "已確認彙總值"],
  ["Confirmed", "已確認"], ["Representative", "代表性"], ["Unavailable", "不可用"],
  ["DPM unavailable:", "DPM 無法計算："],
  ["Hover a line to focus it. Click to pin or release a class.", "滑過曲線可聚焦；點選可固定或取消固定職業。"],
  ["Plotly did not load. Check the network connection and reload the page.", "圖表元件未載入；請檢查網路並重新整理。"],
  ["No enabled reference layers match the current class filter and target count.", "目前職業篩選與目標數下沒有符合條件的參考資料。"],
  ["Forum / Extreme points reproduce p.3 FINAL curve projections, not measured player DPM. They appear only when source settings match.", "Forum／Extreme 點位是 p.3 FINAL 曲線的估算，並非玩家實測 DPM；僅在來源條件相符時顯示。"],
  ["Unable to render the selected view.", "無法顯示所選頁面。"],
  ["Stage shapes: circle = Entry · square = Advanced · diamond = Late-game · triangle = End-game. All nine classes have Forum median / #1 references; Extreme exists for DK, NL and Paladin only. Forum / Extreme DPM reproduces p.3 FINAL interpolation/extrapolation of its frozen stage curves, not measured player damage. Reference DPM appears only with Apple / canonical buffs.", "階段形狀：圓形＝入門、方形＝進階、菱形＝後期、三角形＝畢業。九個職業都有論壇中位數與第一名參考值；Extreme 僅有 DK、NL、Paladin。Forum／Extreme DPM 由 p.3 FINAL 階段曲線推估，並非玩家實測；參考 DPM 僅在 Apple 與標準 Buff 條件下顯示。"],
  ["The library separates confirmed aggregate inputs from representative slot descriptions. Select a stage above to inspect the matching calculation trace.", "資料庫分別呈現已確認的彙總輸入與代表性裝備部位說明。選取上方階段可查看對應的計算追蹤。"],
  ["This summary follows the current MW, potion and buff controls. The clean range remains the fixed MW20 value used on the Progression X axis.", "摘要會跟隨目前的 MW、藥水與 Buff 設定；Clean range 固定使用 Progression X 軸的 MW20 數值。"],
  ["Base AP + floor(AP × MW%) + equipment stats gives the actual stats used by the selected combat setting. Current DPM uses the selected target and potion controls.", "基礎 AP＋向下取整的 AP×MW%＋裝備屬性＝目前戰鬥設定使用的實際屬性；DPM 使用所選目標數與藥水。"],
  ["Recovered source tables with approved September 11 gear corrections. Shoulder grants all four stats (2 through Late, 3 at End). Unlisted stats are not a complete slot reconstruction. Corsair remains on its old aggregate pending its overall/gun breakdown.", "裝備表採用已核准的 9 月 11 日修正。肩膀四屬性至後期為 2、畢業為 3。未列出的屬性不代表完整部位重建；Corsair 的套服與槍枝拆分完成前仍使用舊彙總值。"],
  ["Buccaneer archive note: the Pioneer row's third value is the CGS attack budget. It is not weapon attack on Pioneer itself. The recovered slot table has no separate CGS item row; the runtime clean WA remains the frozen aggregate.", "Buccaneer 歸檔註記：Pioneer 列第三個數值是 CGS 攻擊預算，不是 Pioneer 本體的武器攻擊。部位表沒有獨立 CGS 列；執行時仍使用既定 Clean WA 彙總值。"],
  ["Eye / face / earring stat review (STR / DEX / LUK)", "眼部／臉部／耳環屬性檢視（STR／DEX／LUK）"],
  ["Late/End now use the approved explicit slot values. Face/eye CS stats are included, not added a second time. Entry/Advanced retain their historical aggregates, adjusted only for the shared shoulder rule.", "後期與畢業採用已核准的部位數值；臉部與眼部的 CS 屬性已包含，不會重複加總。入門與進階保留歷史彙總值，僅套用共用肩膀規則。"],
  ["Cards show values present in the current skill fixture. A missing field is shown explicitly instead of being inferred from a familiar skill name.", "卡片只顯示目前技能資料中實際存在的數值；缺失欄位會明確標示，不會依技能名稱自行推測。"],
  ["This trace is produced from the selected class stage and engine audit. Values absent from the audit stay marked as unavailable.", "計算追蹤由所選職業階段與引擎稽核資料產生；缺少的數值會標示為不可用。"],
  ["Shared rules that connect the gear profile, buffs, range formulas and class engines.", "連接裝備進程、Buff、Range 公式與職業引擎的共用規則。"],
  ["These rules are shared across the interactive pages. Class-owned switches remain in the global control panel and are reflected in the selected class trace.", "這些規則供互動頁面共用。職業專屬開關位於上方控制面板，其效果會反映在所選職業的計算追蹤。"],
  ["Potion WA is added before Echo. It is an engine input, not a multiplier applied to an Apple result.", "藥水 W.att 會在 Echo 前加入，屬於引擎輸入，不是對 Apple 計算結果再乘倍率。"],
  ["Each class uses an explicit weapon model. Range anchors in reference data are validation checks only.", "各職業使用明確的武器模型；參考資料中的 Range 錨點僅用於驗證。"],
  ["WDEF presets apply across all three pages. Current v9.5 results are separate from the archived v9.4.2 audit; Shockwave, summon defense and the zero floor remain model assumptions.", "WDEF 預設適用於三個頁面。目前 v9.5 計算與歸檔的 v9.4.2 稽核分開；Shockwave、召喚物防禦與零下限仍屬模型假設。"],
  ["Validation and sources", "驗證與來源"],
  ["Validation status is shown separately from runtime calculations. A passing test means the code path ran; it does not turn every source value into a verified parity fixture.", "驗證狀態與實際運算分開呈現。測試通過代表程式路徑已執行，不代表每筆來源數值都已完成對照驗證。"],
  ["The visible version is the model/runtime version currently loaded by the app.", "顯示版本是網站目前載入的模型與運算版本。"],
  ["Range-only records show no DPM value. Private conversation links are omitted; public source links are shown when available.", "僅有 Range 的紀錄不顯示 DPM。私人對話連結會省略；公開來源連結有資料時才顯示。"],
  ["These items are listed as pending in the current reference manifest.", "以下項目在目前參考資料清單中標記為待補。"],
  ["Raw data (advanced)", "原始資料（進階）"],
  ["Gear class record", "職業裝備紀錄"], ["Skill class record", "職業技能紀錄"],
  ["Buff database", "Buff 資料庫"], ["Potion database", "藥水資料庫"],
  ["Gear calculation rules", "裝備計算規則"], ["Version manifest", "版本清單"],
  ["Model sync manifest", "模型同步清單"], ["Chart reference manifest", "圖表參考資料清單"],
  ["open source", "開啟來源"], ["open recovered source conversation", "開啟歸檔來源對話"],
  ["Class source:", "職業來源："], ["Face", "臉部"], ["Eye", "眼部"], ["Earring", "耳環"],
  ["Additive before Echo", "在 Echo 前加算"], ["Applied", "已套用"],
  ["Recovered AP profile", "歸檔 AP 配點"], ["Selected potion", "所選藥水"],
  ["Gear aggregate", "裝備彙總值"], ["Engine audit", "引擎稽核"],
  ["Time-weighted skill fixture", "按時間加權的技能資料"],
  ["Clean WA + potion + additive buffs", "Clean W.att＋藥水＋加算 Buff"],
  ["Calculated from MW20 stats + clean WA", "由 MW20 屬性與 Clean W.att 計算"],
  ["Class engine selector", "職業引擎分支選擇"], ["Interactive target selector", "互動目標數選擇"],
  ["Class target cap", "職業目標數上限"], ["Engine audit not provided", "未提供引擎稽核"],
  ["Engine selector", "引擎分支選擇"], ["1 · Input", "1 · 輸入"],
  ["2 · WA stack", "2 · W.att 加總"], ["3 · Range", "3 · Range"],
  ["4 · Skill", "4 · 技能"], ["5 · Cap / rotation", "5 · 上限／循環"],
  ["6 · Result", "6 · 結果"], ["MW contribution", "MW 加成"],
  ["Potion WA", "藥水 W.att"], ["Additive buffs", "加算 Buff"],
  ["Pre-Echo WA", "Echo 前 W.att"], ["Calculation WA", "計算用 W.att"],
  ["Post-defense base range", "扣防後基礎 Range"], ["Selected skill / branch", "所選技能／分支"],
  ["Target count", "目標數"], ["Effective targets", "有效目標數"],
  ["Cap state", "傷害上限狀態"], ["Rotation", "技能循環"],
  ["ST / non-ST weighting", "ST／非 ST 權重"]
];

const normalizedPairs = PAIRS.map(([first, second]) => /[\u3400-\u9fff]/.test(first)
  ? [second, first] : [first, second]);
const enToZh = new Map(normalizedPairs);
const zhToEn = new Map(normalizedPairs.map(([en, zh]) => [zh, en]));

function convert(value) {
  const text = String(value);
  const map = language === "zh-TW" ? enToZh : zhToEn;
  const exact = map.get(text);
  if (exact !== undefined) return exact;
  const ammoReminderZh = "若有使用箭袋／彈藥，請記得填入攻擊力。";
  const ammoReminderEn = "If you use a quiver / ammo, enter its W.att.";
  if (language === "en" && text.endsWith(` ${ammoReminderZh}`)) {
    return `${convert(text.slice(0, -ammoReminderZh.length - 1))} ${ammoReminderEn}`;
  }
  if (language === "zh-TW" && text.endsWith(` ${ammoReminderEn}`)) {
    return `${convert(text.slice(0, -ammoReminderEn.length - 1))} ${ammoReminderZh}`;
  }
  if (language === "zh-TW") {
    let match = text.match(/^Preset ([1-3])$/);
    if (match) return `配裝 ${match[1]}`;
    match = text.match(/^Gear (.+) \+ quiver \/ ammo (.+) \+ class passive (.+) = calculated (.+) W\.att \(passive added automatically; do not enter it twice\)\.$/);
    if (match) return `裝備 ${match[1]} + 箭袋／彈藥 ${match[2]} + 職業被動 ${match[3]} = 計算用 ${match[4]} W.att（被動已自動加入，請勿重複輸入）。`;
    match = text.match(/^Gear (.+) \+ quiver \/ ammo (.+) \+ class passive (.+) = (.+) W\.att\.$/);
    if (match) return `裝備 ${match[1]} + 箭袋／彈藥 ${match[2]} + 職業被動 ${match[3]} = ${match[4]} W.att。`;
    match = text.match(/^Legacy total (.+) W\.att \(ammo and passive already included\)\.$/);
    if (match) return `舊版總攻擊 ${match[1]} W.att（已含彈藥與被動，不再加總）。`;
    match = text.match(/^Legacy total (.+) W\.att; ammo and passive were already included and not added again\.$/);
    if (match) return `舊版總攻擊 ${match[1]} W.att；彈藥與被動已含在輸入值內，未再加總。`;
    match = text.match(/^Off · (\d+)%$/);
    if (match) return `關閉 · ${match[1]}%`;
    match = text.match(/^Lv (\d+) · (\d+)%$/);
    if (match) return `等級 ${match[1]} · ${match[2]}%`;
    match = text.match(/^Selected class: (.+) · stage focus: (.+)$/);
    if (match) return `所選職業：${match[1]} · 階段：${convert(match[2])}`;
    match = text.match(/^Stage focus · (.+)$/);
    if (match) return `階段焦點 · ${convert(match[1])}`;
    match = text.match(/^Range model · (.+)$/);
    if (match) return `Range 模型 · ${match[1]}`;
    match = text.match(/^(\d+) of (\d+) classes · (\d+)T · (.+)$/);
    if (match) return `顯示 ${match[1]} / ${match[2]} 職業 · ${match[3]}T · ${match[4]}`;
    match = text.match(/^★ (\d+) \/ (\d+) presets plotted · (\d+)T · (.+)$/);
    if (match) return `★ 已繪製 ${match[1]} / ${match[2]} 組配裝 · ${match[3]}T · ${match[4]}`;
    match = text.match(/^([A-Za-z-]+) DPM$/);
    if (match) return `${convert(match[1])} DPM`;
    match = text.match(/^The DPM column uses the (.+) stage with the current controls\. Buccaneer keeps separate ST and non-ST windows\.$/);
    if (match) return `DPM 欄使用${convert(match[1])}階段與目前設定；Buccaneer 的 ST 與非 ST 循環分開計算。`;
  } else {
    let match = text.match(/^配裝 ([1-3])$/);
    if (match) return `Preset ${match[1]}`;
    match = text.match(/^關閉 · (\d+)%$/);
    if (match) return `Off · ${match[1]}%`;
    match = text.match(/^等級 (\d+) · (\d+)%$/);
    if (match) return `Lv ${match[1]} · ${match[2]}%`;
    match = text.match(/^基礎 (STR|DEX|INT|LUK)$/);
    if (match) return `Base ${match[1]}`;
    match = text.match(/^無 MW (STR|DEX|LUK)$/);
    if (match) return `No-MW ${match[1]}`;
    match = text.match(/^戒指 ([1-4])$/);
    if (match) return `Ring ${match[1]}`;
    match = text.match(/^(.+) (STR|DEX|LUK|W\.att)$/);
    if (match && zhToEn.has(match[1])) return `${zhToEn.get(match[1])} ${match[2]}`;
    match = text.match(/^需求摘要：(.+)（主屬性門檻忽略）$/);
    if (match) return `Requirements: ${match[1]} (main-stat requirements ignored)`;
    match = text.match(/^(.+) 職業固定被動：\+(\d+) W\.att（唯讀，由引擎自動套用）。$/);
    if (match) return `${match[1]} fixed passive: +${match[2]} W.att (read-only; applied automatically).`;
    match = text.match(/^(STR|DEX|INT|LUK) 基礎 AP 必須是 0 以上的數值。$/);
    if (match) return `Base ${match[1]} must be nonnegative.`;
    match = text.match(/^(STR|DEX|LUK) 無 MW 總值尚未填寫。$/);
    if (match) return `Enter the no-MW total ${match[1]}.`;
    match = text.match(/^(.+) 的 (STR|DEX|LUK|W\.att) 必須是 0 以上的數值。$/);
    if (match) return `${convert(match[1])} ${match[2]} must be nonnegative.`;
    match = text.match(/^(.+) 需要 (STR|DEX) (\d+)，目前還差 (\d+)。$/);
    if (match) return `${match[1]} requires ${match[2]} ${match[3]}; missing ${match[4]}.`;
    match = text.match(/^裝備 (.+) \+ 箭袋／彈藥 (.+) \+ 職業被動 (.+) = 計算用 (.+) W\.att（被動已自動加入，請勿重複輸入）。$/);
    if (match) return `Gear ${match[1]} + quiver / ammo ${match[2]} + class passive ${match[3]} = calculated ${match[4]} W.att (passive added automatically; do not enter it twice).`;
    match = text.match(/^裝備 (.+) \+ 箭袋／彈藥 (.+) \+ 職業被動 (.+) = (.+) W\.att。$/);
    if (match) return `Gear ${match[1]} + quiver / ammo ${match[2]} + class passive ${match[3]} = ${match[4]} W.att.`;
    match = text.match(/^舊版總攻擊 (.+) W\.att（已含彈藥與被動，不再加總）。$/);
    if (match) return `Legacy total ${match[1]} W.att (ammo and passive already included).`;
    match = text.match(/^舊版總攻擊 (.+) W\.att；彈藥與被動已含在輸入值內，未再加總。$/);
    if (match) return `Legacy total ${match[1]} W.att; ammo and passive were already included and not added again.`;
    match = text.match(/^無 MW (STR|DEX|LUK) 總值不可低於基礎 AP。$/);
    if (match) return `No-MW ${match[1]} total cannot be below base AP.`;
  }
  return text;
}

export function localizeText(value) { return convert(value); }

export function localizePage(root = document.body) {
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.matches("script, style, pre, code, .plot, .range-reference-chart")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.nodeValue;
      const content = raw.trim();
      if (!content) continue;
      const translated = convert(content);
      if (translated !== content) node.nodeValue = raw.replace(content, translated);
      continue;
    }
    for (const attribute of ["aria-label", "title", "placeholder"]) {
      const value = node.getAttribute(attribute);
      if (value) node.setAttribute(attribute, convert(value));
    }
  }
}
