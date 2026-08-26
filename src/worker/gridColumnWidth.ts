/* 网格对齐列宽计算工具
 */

// ============ 文档字符宽度统计算法 ============

/** 字符统计：字符数 × 字号px */
export function measureDocNameLengthByChars(name: string, fontSizePx: number): number {
    return (name?.length ?? 0) * fontSizePx;
}

/** 按字符类型加权
 * CJK≈1em、Latin/数字≈0.5em、空白≈0.3em（不依赖 DOM，单测友好，作 canvas 的纯函数替代） 
 * */
export function measureDocNameLengthByScriptWeight(name: string, fontSizePx: number): number {
    let units = 0;
    for (const ch of name ?? "") {
        if (/[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/.test(ch)) units += 1;      // 全/半角 CJK 与标点
        else if (ch.trim() === "") units += 0.3;                     // 空白
        else units += 0.5;                                           // 拉丁/数字
    }
    return units * fontSizePx;
}

/** Canvas 上下文获取
 * 600ms+建议别用
 */
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
const LINK_H_PADDING_PX = 12;      // docLinksWrapper 左右 padding
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

// ============ 列宽统计算法 ============

export type ColumnWidthAlgo = "percentile" | "trimmedMean";

/** 百分位 */
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
        case "trimmedMean": return computeColumnWidthTrimmedMean(lengths, opts?.trimRatio);
        case "percentile":
        default:            return computeColumnWidthPercentile(lengths, opts?.percentile);
    }
}

/** 限制宽度到范围内 [minPx, maxPx]，raw 非法时回退 minPx */
export function clampColumnWidth(raw: number, minPx: number, maxPx: number): number {
    if (!isFinite(raw) || raw <= 0) return minPx > 0 ? minPx : 0;
    return Math.min(Math.max(raw, minPx), maxPx);
}
