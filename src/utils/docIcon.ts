import { CONSTANTS } from "@/constants";
import { errorPush } from "@/logger";
import { isValidStr } from "@/utils/commonCheck";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const DYNAMIC_ICON_PREFIX = "api/icon/getDynamicIcon";
const HTTP_URL_PATTERN = new RegExp("http(s)?:\\/\\/");
const FOLDER_EMOJI = "📑";
const FILE_EMOJI = "📄";
const DEFAULT_SVG_ICON_CLASS_NAME = "og-hn-default-svgicon";

/**
 * 面包屑节点类型（决定默认图标）
 */
export enum BreadcrumbNodeType {
    NOTEBOOK,    // 笔记本
    PARENT_FILE, // 有子文档的文档
    FILE,        // 无子文档的文档
}

/**
 * 文档图标生成选项
 */
export interface IDocIconOptions {
    iconString: string,
    nodeType: BreadcrumbNodeType,
    textClassName?: string,
    picClassName?: string,
    picStyle?: string, // 仅对 img 生效的内联样式
    svgClassName?: string, // 仅对 svg 图标生效的 class
    wrapSvg?: boolean, // span 包装默认svg图标（emoji 文本始终包裹 span）
    wrapBlank?: boolean,// span 包装空值
    iconMode?: string,
    outerHtmlTag?: string | null,
}

/**
 * 归一化后的图标生成参数，供内部各构建函数复用
 */
interface IResolvedIconOptions {
    nodeType: BreadcrumbNodeType,
    textClassName: string,
    picClassName: string,
    picStyle: string,
    svgClassName: string,
}

function getSiyuanGlobal(): any {
    return window.top?.siyuan ?? window.siyuan;
}

/**
 * 思源全局配置，插件运行在iframe中，配置挂载在顶层window
 */
export function getSiyuanBaseConfig(): any {
    return getSiyuanGlobal()?.config;
}

export function isSvgIconAsDefaultEnabled(): boolean {
    return getSiyuanBaseConfig()?.fileTree?.useSVGDefaultIcon ?? false;
}

/**
 * 根据节点信息解析面包屑节点类型
 * @param isNotebook 是否为笔记本
 * @param subFileCount 子文档数量
 * @returns 节点类型
 */
export function resolveNodeType(isNotebook: boolean, subFileCount: number): BreadcrumbNodeType {
    if (isNotebook) {
        return BreadcrumbNodeType.NOTEBOOK;
    }
    // subFileCount 缺省表示「有子文档但数量未知」，与 IDocLinkGenerateInfo.subFileCount 的约定保持一致
    if (subFileCount == null || subFileCount != 0) {
        return BreadcrumbNodeType.PARENT_FILE;
    }
    return BreadcrumbNodeType.FILE;
}

export function getSvgElement(iconName: string): SVGSVGElement {
    const svgElement = document.createElementNS(SVG_NAMESPACE, "svg");
    const useElement = document.createElementNS(SVG_NAMESPACE, "use");
    useElement.setAttributeNS(XLINK_NAMESPACE, "xlink:href", `#${iconName}`);
    svgElement.appendChild(useElement);
    return svgElement;
}

export function getDefaultSvgIcon(type: BreadcrumbNodeType): SVGSVGElement {
    switch (type) {
        case BreadcrumbNodeType.NOTEBOOK:
            return getSvgElement("iconNotebook");
        case BreadcrumbNodeType.PARENT_FILE:
            return getSvgElement("iconFileText");
        case BreadcrumbNodeType.FILE:
        default:
            return getSvgElement("iconFile");
    }
}

/**
 * 获取默认EmojiIcon 字符串
 * 可能是unicode码，也可能是图标文件名，不包括html结构
 * @param hasChild
 * @returns
 */
export function getDefaultEmojiIcon(hasChild: boolean): string {
    const localImages = getSiyuanGlobal()?.storage?.["local-images"];
    if (localImages) {
        return hasChild ? localImages.folder : localImages.file;
    }
    return hasChild ? FOLDER_EMOJI : FILE_EMOJI;
}

/**
 * 默认图标对应的 emoji 文本，已完成 unicode 转码
 * @param hasChild
 * @returns
 */
export function getDefaultEmojiText(hasChild: boolean): string {
    const defaultIconString = getDefaultEmojiIcon(hasChild);
    // 无 local-images 时拿到的是 emoji 字符本身，不能再走 unicode 解析
    if (defaultIconString === FOLDER_EMOJI || defaultIconString === FILE_EMOJI) {
        return defaultIconString;
    }
    return unicodeToEmoji(defaultIconString) ?? (hasChild ? FOLDER_EMOJI : FILE_EMOJI);
}

/**
 * 将unicode码转换为emojiIconStr
 * @param unicodeStr
 * @returns 可空
 */
export function unicodeToEmoji(unicodeStr: string): string {
    try {
        let result = "";
        unicodeStr.split("-").forEach(element => {
            result += String.fromCodePoint(Number("0x" + element));
        });
        return result;
    } catch (err) {
        errorPush("emoji处理时发生错误", unicodeStr, err);
        return null;
    }
}

function buildEmojiTextElement(text: string, textClassName: string): HTMLSpanElement {
    const spanElement = document.createElement("span");
    spanElement.className = textClassName;
    spanElement.textContent = text;
    return spanElement;
}

function buildIconImgElement(src: string, options: IResolvedIconOptions): HTMLImageElement {
    const imgElement = document.createElement("img");
    imgElement.className = options.picClassName;
    if (isValidStr(options.picStyle)) {
        imgElement.setAttribute("style", options.picStyle);
    }
    imgElement.src = src;
    return imgElement;
}

/**
 * 按图标字符串形态构建图标元素
 * @returns 图标字符串无法解析时返回 null
 */
function buildIconElement(iconString: string, options: IResolvedIconOptions): Element {
    if (!isValidStr(iconString)) {
        return null;
    }
    // emoji地址判断逻辑为出现.，但请注意之后的补全
    if (iconString.startsWith(DYNAMIC_ICON_PREFIX)) {
        return buildIconImgElement(`/${iconString}`, options);
    }
    if (HTTP_URL_PATTERN.test(iconString)) {
        return buildIconImgElement(iconString, options);
    }
    if (iconString.indexOf(".") != -1) {
        return buildIconImgElement(`/emojis/${iconString}`, options);
    }
    const emojiText = unicodeToEmoji(iconString);
    if (emojiText == null) {
        return null;
    }
    return buildEmojiTextElement(emojiText, options.textClassName);
}

function buildDefaultEmojiElement(options: IResolvedIconOptions): Element {
    const hasChild = options.nodeType !== BreadcrumbNodeType.FILE;
    const defaultIconString = getDefaultEmojiIcon(hasChild);
    // 无 local-images 时拿到的是 emoji 字符本身，不能再走 unicode 解析
    if (defaultIconString !== FOLDER_EMOJI && defaultIconString !== FILE_EMOJI) {
        const result = buildIconElement(defaultIconString, options);
        if (result != null) {
            return result;
        }
    }
    return buildEmojiTextElement(hasChild ? FOLDER_EMOJI : FILE_EMOJI, options.textClassName);
}

function buildDefaultSvgElement(options: IResolvedIconOptions, wrapSvg: boolean): Element {
    const svgElement = getDefaultSvgIcon(options.nodeType);
    if (isValidStr(options.svgClassName)) {
        svgElement.classList.add(...options.svgClassName.split(" "));
    }
    if (!wrapSvg) {
        return svgElement;
    }
    const spanElement = document.createElement("span");
    spanElement.className = options.textClassName;
    spanElement.appendChild(svgElement);
    return spanElement;
}

/**
 * 生成文档图标 HTMLElement 元素
 * @param options
 * @returns
 */
export function getDocIconElement({
    iconString,
    nodeType = BreadcrumbNodeType.FILE,
    textClassName = "",
    picClassName = "",
    picStyle = "",
    svgClassName = DEFAULT_SVG_ICON_CLASS_NAME,
    wrapSvg = true,
    wrapBlank = true,
    iconMode = CONSTANTS.ICON_CUSTOM_ONLY,
    outerHtmlTag = null,
}: IDocIconOptions): Element {
    const resolvedOptions: IResolvedIconOptions = {
        nodeType,
        textClassName,
        picClassName,
        picStyle,
        svgClassName,
    };
    let tempResult: Element = null;

    // 有自定义图标时，解析失败也回退为默认 emoji，避免图标区域空缺
    if (isValidStr(iconString)) {
        tempResult = buildIconElement(iconString, resolvedOptions);
        if (tempResult == null) {
            tempResult = buildDefaultEmojiElement(resolvedOptions);
        }
    }

    if (tempResult == null && iconMode == CONSTANTS.ICON_ALL) {
        if (isSvgIconAsDefaultEnabled()) {
            tempResult = buildDefaultSvgElement(resolvedOptions, wrapSvg);
        }
        if (tempResult == null) {
            tempResult = buildDefaultEmojiElement(resolvedOptions);
        }
    }

    if (tempResult == null && wrapBlank) {
        tempResult = buildEmojiTextElement("", textClassName);
    }

    if (!isValidStr(outerHtmlTag) || tempResult == null) {
        return tempResult;
    }

    const result = document.createElement(outerHtmlTag);
    result.appendChild(tempResult);
    return result;
}

/**
 * 生成文档图标的 HTML 字符串，供 iconHTML / innerHTML 等字符串场景使用
 * @param options
 * @returns 无图标时返回空字符串
 */
export function getDocIconHtmlStr(options: IDocIconOptions): string {
    const result = getDocIconElement(options);
    return result == null ? "" : result.outerHTML;
}
