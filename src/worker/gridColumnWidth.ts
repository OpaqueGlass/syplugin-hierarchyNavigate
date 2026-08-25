// 网格对齐下列宽计算：文档名展示长度测量 + 列宽统计算法
// 全部为独立纯函数，便于单测；选择哪种测量/算法由调用方（ContentApplyer）以内部常量决定，不在此暴露。

// ============ 文档名展示长度测量（三种实现，均独立、可单测） ============

/** 基线：字符数 × 字号px（CJK/Latin 同权，不依赖 DOM，最易单测） */
export function measureDocNameLengthByChars(name: string, fontSizePx: number): number {
    return (name?.length ?? 0) * fontSizePx;
}

/** 脚本加权：CJK≈1em、Latin/数字≈0.5em、空白≈0.3em（不依赖 DOM，单测友好，作 canvas 的纯函数替代） */
export function measureDocNameLengthByScriptWeight(name: string, fontSizePx: number): number {
    let units = 0;
    for (const ch of name ?? "") {
        if (/[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/.test(ch)) units += 1;      // 全/半角 CJK 与标点
        else if (ch.trim() === "") units += 0.3;                     // 空白
        else units += 0.5;                                           // 拉丁/数字
    }
    return units * fontSizePx;
}

/** 真实像素：Canvas measureText（最准，含字体/字偶距；可注入 ctx 便于单测） */
let _sharedCtx: CanvasRenderingContext2D | null = null;
export function getSharedCanvasContext(): CanvasRenderingContext2D {
    if (!_sharedCtx) {
        const c = document.createElement("canvas");
        _sharedCtx = c.getContext("2d");
    }
    return _sharedCtx!;
}
export function measureDocNameLengthByCanvas(
    name: string, fontSizePx: number,
    fontFamily = "sans-serif",
    ctx?: CanvasRenderingContext2D | null,
): number {
    const context = ctx ?? getSharedCanvasContext();
    context.font = `${fontSizePx}px ${fontFamily}`;
    return context.measureText(name ?? "").width;
}

/** 取一个 multiline 容器内所有链接名（含 emoji + 左右 padding 余量）的展示长度 */
export type DocNameMeasurer = (name: string, fontSizePx: number) => number;
const EMOJI_PX_RATIO = 1.1;        // emoji 约 1.1em
const LINK_H_PADDING_PX = 12;      // docLinksWrapper 左右各 6px
export function measureMultilineDocNameLengths(
    multilineElem: HTMLElement, measurer: DocNameMeasurer, fontSizePx: number,
): number[] {
    const links = Array.from(multilineElem.querySelectorAll("span.docLinksWrapper")) as HTMLElement[];
    const extraPx = fontSizePx * EMOJI_PX_RATIO + LINK_H_PADDING_PX;
    const out: number[] = [];
    for (const link of links) {
        const nameText = (link.querySelector(".trimDocName")?.textContent ?? link.textContent ?? "").trim();
        if (!nameText) continue;
        out.push(measurer(nameText, fontSizePx) + extraPx);
    }
    return out;
}

// ============ 列宽统计算法（多种实现，便于对比/单测） ============

export type ColumnWidthAlgo = "user" | "percentile" | "trimmedMean";

/** 用户原始算法：Q1=全局平均，Q2=排序后第二大长度（仅一个时回退为最大），列宽=(Q1+Q2)/2 */
export function computeColumnWidthUser(lengths: number[]): number {
    if (lengths.length === 0) return 0;
    const Q1 = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const sortedDesc = [...lengths].sort((a, b) => b - a);
    const Q2 = sortedDesc.length >= 2 ? sortedDesc[1] : sortedDesc[0];
    return (Q1 + Q2) / 2;
}

/** 稳健百分位（推荐）：取第 p 百分位长度，天然抑制「少数极长」离群值 */
export function computeColumnWidthPercentile(lengths: number[], percentile = 85): number {
    if (lengths.length === 0) return 0;
    const sorted = [...lengths].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
    return sorted[idx];
}

/** 去极值均值：去掉两端 trimRatio 比例后再平均 */
export function computeColumnWidthTrimmedMean(lengths: number[], trimRatio = 0.15): number {
    if (lengths.length === 0) return 0;
    const sorted = [...lengths].sort((a, b) => a - b);
    const cut = Math.floor(sorted.length * trimRatio);
    const kept = sorted.slice(cut, sorted.length - cut);
    if (kept.length === 0) return sorted[Math.floor(sorted.length / 2)];
    return kept.reduce((a, b) => a + b, 0) / kept.length;
}

export function computeRawColumnWidth(
    lengths: number[], algo: ColumnWidthAlgo = "percentile",
    opts?: { percentile?: number; trimRatio?: number },
): number {
    switch (algo) {
        case "user":        return computeColumnWidthUser(lengths);
        case "trimmedMean": return computeColumnWidthTrimmedMean(lengths, opts?.trimRatio);
        case "percentile":
        default:            return computeColumnWidthPercentile(lengths, opts?.percentile);
    }
}

/** 夹紧到 [minPx, maxPx]，raw 非法时回退 minPx */
export function clampColumnWidth(raw: number, minPx: number, maxPx: number): number {
    if (!isFinite(raw) || raw <= 0) return minPx > 0 ? minPx : 0;
    return Math.min(Math.max(raw, minPx), maxPx);
}
