import { CONSTANTS, LINK_SORT_TYPES, PRINTER_NAME } from "@/constants";
import { lang } from "@/utils/lang";
import { DOC_SORT_TYPES, exportMdContent, getBackLink2T, getBlockBreadcrumb, getDocInfo, getDocPreview, getNotebookInfoLocallyF, getNotebookSortModeF, isMobile, listDocsByPathT, queryAPI } from "@/syapi"
import { getChildDocuments, getChildDocumentsWordCount, isChildDocExist, isDocEmpty, isDocHasAv } from "@/syapi/custom";
import { getGSettings, getReadOnlyGSettings } from "@/manager/settingManager";
import { isValidStr } from "@/utils/commonCheck";
import { debugPush, errorPush, isDebugMode, logPush, warnPush } from "@/logger";
import { IProtyle, Menu } from "siyuan";
import { fillOneDocRelationOfBasicInfo, getUserDemandSiblingDocuments } from "./commonProvider";
import { getNeighborDailyNoteDoc, htmlTransferParser, isSortAsc, isSortByNameOrCreateTime, openRefLinkByAPIWithConfig, trimListDocsByPathAPIReturnedDocName } from "@/utils/onlyThisUtil";
import { setCouldHideStyle } from "./setStyle";
import { linkSortTypeToBackLinkApiSortNum, pinAndRemoveByDocNameForBackLinks, sortIFileWithNatural } from "@/utils/docSortUtils";
import { formatDateStringLikeFileTree, parseDateString } from "@/utils/common";
import { clearMenuInstance, saveMenuInstance } from "./menuHelper";
import { getListDocsByPathAPIFilePath, isNotebookDoc, isNotebookDocEnabled } from "@/utils/compatUtils";

export default class ContentPrinter {
    private basicInfo: IBasicInfo;
    private protyleBasicInfo: IProtyleEnvInfo;
    // 这里如果只给出方法，可能需要另外bind(this)
    private printerList: Record<string, typeof BasicContentPrinter> = {
        [PRINTER_NAME.INFO]: DocInfoContentPrinter,
        [PRINTER_NAME.BREADCRUMB]: BreadcrumbContentPrinter,
        [PRINTER_NAME.PARENT]: ParentContentPrinter,
        [PRINTER_NAME.SIBLING]: SiblingContentPrinter,
        [PRINTER_NAME.PREV_NEXT]: NeighborContentPrinter,
        [PRINTER_NAME.BACKLINK]: BackLinkContentPrinter,
        [PRINTER_NAME.CHILD]: ChildContentPrinter,
        [PRINTER_NAME.WIDGET]: WidgetContentPrinter,
        [PRINTER_NAME.BLOCK_BREADCRUMB]: BlockTitleBreadcrumbContentPrinter,
        [PRINTER_NAME.ON_THIS_DAY]: OnThisDayInPreviousYears,
        [PRINTER_NAME.FORWARDLINK]: ForwardLinkPrinter,
        [PRINTER_NAME.PREV_NEXT_PREVIEW]: NeighborWithPreviewContentPrinter,
        [PRINTER_NAME.PREVIEW_BOX]: PreviewBoxContentPrinter,
        [PRINTER_NAME.PARENT_SIBLING]: ParentSiblingContentPrinter,
    }
    
    constructor(basicInfo:IBasicInfo, protyleBasicInfo:IProtyleEnvInfo) {
        this.basicInfo = basicInfo;
        this.protyleBasicInfo = protyleBasicInfo;
    }
    // 考虑到部分Printer还是需要自己判断状态，这里async
    async print(inTheEndFlag: boolean):Promise<IAllPrinterResult> {
        // const result = document.createElement("div");
        // result.classList.add("og-hn-heading-docs-container");
        let result: IAllPrinterResult = {
            elements: new Array(), // 最终生成的各个部分元素
            onlyOnce: new Array(), // 如果有，则该部分不做替换
            relateContentKeys: new Array(), // 相关的各个部分内容key
        }
        const g_setting = getReadOnlyGSettings();
        // TODO: 根据basicInfo选择不同的constentGroupList
        let docContentKeyGroup = [];
        docContentKeyGroup = isMobile() ? g_setting.mobileContentGroup : g_setting.openDocContentGroup;
        const ialString = JSON.stringify(this.basicInfo.docBasicInfo.ial ?? "");
        if (ialString.includes("og-hn-ignore") || ialString.includes("og文档导航忽略")) {
            return null;
        }
        if (!inTheEndFlag) {
            // 笔记本覆盖
            if (g_setting["setting_notebook_order_top_" + this.basicInfo.docBasicInfo.box]) {
                docContentKeyGroup = g_setting["setting_notebook_order_top_" + this.basicInfo.docBasicInfo.box];
                logPush("选择笔记本排序-top");
            }
            // doc覆盖
            if (this.basicInfo.currentDocAttrs["custom-og-hn-content"]) {
                try {
                    docContentKeyGroup = JSON.parse(this.basicInfo.currentDocAttrs["custom-og-hn-content"]);
                    logPush("选择文档排序-top");
                } catch(e) {
                    logPush("用户自定义顺序读取失败", e);
                }
            }
        } else {
            docContentKeyGroup = g_setting.normalEndContentGroup;
            // 笔记本指定
            if (g_setting["setting_notebook_order_end_" + this.basicInfo.docBasicInfo.box]) {
                docContentKeyGroup = g_setting["setting_notebook_order_end_" + this.basicInfo.docBasicInfo.box];
                logPush("选择笔记本排序-end");
            }
            // 文档排序覆盖
            if (this.basicInfo.currentDocAttrs["custom-og-hn-end-content"]) {
                try {
                    docContentKeyGroup = JSON.parse(this.basicInfo.currentDocAttrs["custom-og-hn-end-content"]);
                    logPush("选择文档排序-end");
                } catch(e) {
                    logPush("用户自定义顺序读取失败", e);
                }
            }
        }

        if (this.protyleBasicInfo.flashCard) {
            docContentKeyGroup = g_setting.flashcardContentGroup;
            logPush("选择闪卡排序");
        }
        if (inTheEndFlag && this.protyleBasicInfo.mobile) {
            return null;
        }
        debugPush("docContentKeyGroup", docContentKeyGroup);
        debugPush("g_setting", g_setting);
        // 排除重复
        let uniqueArray = [];
        docContentKeyGroup.forEach(function(item) {
            if (uniqueArray.indexOf(item) === -1) {
                uniqueArray.push(item);
            }
        });
        docContentKeyGroup = uniqueArray;
        // 获取文档信息
        const promises = [];
        for (const printerName of docContentKeyGroup) {
            const printer = this.printerList[printerName];
    
            if (printer) {
                promises.push(
                    // https://developer.mozilla.org/zh-CN/docs/Glossary/IIFE
                    (async () => {
                        const printerResult = await printer.getWrappedBindedElement(this.basicInfo, this.protyleBasicInfo);
                        const isOnlyOnce = await printer.isOnlyOnce(this.basicInfo);
    
                        if (printerResult) {
                            printerResult.dataset.ogContentType = printerName;
                            return {
                                element: printerResult,
                                onlyOnce: isOnlyOnce,
                                relateContentKey: printerName,
                            };
                        }
    
                        return null;
                    })()
                );
            }
        }
    
        const results = await Promise.all(promises);
        // 避免实际启用内容区不多时，还显示
        if (g_setting.areaHideFrom > 0 && results.filter((result)=>result != null).length >= g_setting.areaHideFrom) {
            // for (let i = g_setting.areaHideFrom - 1; i < results.length; i++) {
            //     results[i]?.element.classList.add(CONSTANTS.COULD_FOLD_CLASS_NAME);
            // }
            // 请注意，在其他位置使用Printer，应当为element增加ogContentType
            results.unshift({
                element: await MoreOrLessPrinter.getMoreOrLessElement(this.basicInfo, this.protyleBasicInfo, results.slice()),
                onlyOnce: await MoreOrLessPrinter.isOnlyOnce(this.basicInfo),
                relateContentKey: PRINTER_NAME.MORE_OR_LESS
            });
        }
        // 添加置顶拖拽移动区域
        results.unshift({
            element: await MoveAreaContentPrinter.getWrappedBindedElement(this.basicInfo, this.protyleBasicInfo),
            onlyOnce: await MoveAreaContentPrinter.isOnlyOnce(this.basicInfo),
            relateContentKey: PRINTER_NAME.MOVE_TOP_AREA
        });
    
        return {
            elements: results.filter((result) => result !== null).map((result) => result.element),
            onlyOnce: results.filter((result) => result !== null).map((result) => result.onlyOnce),
            relateContentKeys: results.filter((result) => result !== null).map((result) => result.relateContentKey),
        };
    }
}


class BasicContentPrinter {
    private basicInfo:IBasicInfo;
    constructor(basicInfo:IBasicInfo) {
        this.basicInfo = basicInfo;
    }
    /**
     * 获取已经绑定了元素内操作的HTMLElement
     * 子类必须实现该方法
     * @param basicInfo 基本信息对象
     * @returns 装有该部分内容的一个HTMLElement
     */
    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        throw new Error("需子类覆盖实现");
    }

    /**
     * 子类可以覆盖实现，以直接使用自行创建的元素；
     * 这是统一调用的入口
     * @param basicInfo 
     * @param protyleEnvInfo 
     * @returns 
     */
    static async getWrappedBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const result = await this.getBasicElement();
        const contentElem = await this.getBindedElement(basicInfo, protyleEnvInfo);
        if (!result) {
            return contentElem;
        }
        if (!contentElem) {
            return null;
        }
        const indicatorTitle = contentElem?.dataset?.ogIndicatorTitle;
        if (isValidStr(indicatorTitle)
            && result.children.length > 0
            && result.children[0].classList.contains(CONSTANTS.INDICATOR_CLASS_NAME)) {
            result.children[0].setAttribute("title", indicatorTitle);
        }
        result.appendChild(contentElem);
        result.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        if (contentElem.classList.contains(CONSTANTS.NONE_CLASS_NAME)) {
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        return result;
    }

    /**
     * 获取基础元素(最外层)
     * 仅用于[getBindedElementWrapper]内部调用
     * 返回Null时，表示不需要基础元素，直接返回[getBindedElement]的结果
     */
    static async getBasicElement(): Promise<HTMLElement> {
        throw new Error("需子类覆盖实现");
    }


    /**
     * 获取对应部分是否只插入一次
     * 默认会进行更新
     * @param basicInfo 
     * @returns true: 该元素如果已经存在，则不会二次插入 false: 该元素会进行更新
     */
    static async isOnlyOnce(basicInfo:IBasicInfo): Promise<boolean> {
        return false
    }

    static bindAction(element:HTMLElement): HTMLElement {
        //TODO: 基本的点击链接绑定
        return element;
    }

    /**
     * 获取通用文档链接区域
     * @param classNames 对应区域的样式名，如果是正常网格结构或只有文档链接，直接不传入即可
     * @returns 
     */
    static getContentElement(classNames: string[]):HTMLElement {
        const result = document.createElement("div");
        if (classNames) {
            for (const className of classNames) {
                result.classList.add(className);
            }
        } else {
            result.classList.add(CONSTANTS.CONTAINER_MULTILINE_STYLE_CLASS_NAME);
        }
        return result;
    }
    
    /**
     * 获取基础对象
     * @param uniqueClassName 基础对象独立类名
     * @param classNames 附加类名，如果不传该参数，默认添加多行与container容器类名
     * @param indicatorLang 区域提示词
     * @returns HTMLElement
     */
    static _getBasicElement(uniqueClassName: string, indicatorLang?: string, hoverTitleLang?: string):HTMLElement {
        const contentElem = document.createElement("div");
        // 这里有点重复，看看再说
        contentElem.classList.add(uniqueClassName, "og-hn-doc-grid-container");
        if (isValidStr(hoverTitleLang)) {
            // contentElem.setAttribute("title", hoverTitleLang);
            contentElem.classList.add("ariaLabel")
            contentElem.setAttribute("aria-label", hoverTitleLang);
        }
        
        if (isValidStr(indicatorLang)) {
            const indicatorElem = document.createElement("span");
            indicatorElem.classList.add(CONSTANTS.INDICATOR_CLASS_NAME);
            indicatorElem.innerText = indicatorLang;
            contentElem.appendChild(indicatorElem);
        }
        return contentElem;
    }

    static getNoneElement() {
        const result = document.createElement("span");
        result.classList.add("og-hn-doc-none-word");
        result.innerText = lang("none");
        return result;
    }

    // 请注意，传入的doc.name应当包含.sy后缀（即IFile类型原始值），本函数会进行处理！
    static docLinkGenerator(doc:IDocLinkGenerateInfo, unclickable:boolean = false) {
        let g_setting = getReadOnlyGSettings();
        let emojiStr = this.getEmojiHtmlStr(doc.icon, doc?.subFileCount != 0, g_setting);
        // 这里需要区分doc.content 和 doc.name，或者，传入前就将doc.name加入.sy后缀
        let docName = "";
        if (isValidStr(doc.name)) {
            docName = trimListDocsByPathAPIReturnedDocName(doc.name);
        } else {
            docName = doc.content;
        }
        docName = htmlTransferParser(docName);
        // docName = Lute.EscapeHTMLStr(docName);
        let trimDocName = docName;
        if (doc["ogSimpleName"]) {
            trimDocName = doc["ogSimpleName"];
        }
        // 文件名长度限制
        // if (docName.length > g_setting.nameMaxLength && g_setting.nameMaxLength != 0) trimDocName = trimDocName.substring(0, g_setting.nameMaxLength) + "...";

        let result = document.createElement("span");
        const isBacklink = doc.isBacklink === true;
        result.classList.add("refLinks", "docLinksWrapper");
        if (g_setting.docLinkClass) {
            result.classList.add(escapeClass(g_setting.docLinkClass));
        }
        result.dataset["subtype"] = "d";
        result.dataset["id"] = doc.id;
        if (isBacklink) {
            result.dataset["isBacklink"] = "true";
            result.dataset["action"] = CONSTANTS.BACKLINK_OPEN_ACTION;
            if (isValidStr(doc.docId)) {
                result.dataset["docId"] = doc.docId;
            }
            if (isValidStr(doc.defId)) {
                result.dataset["defId"] = doc.defId;
            }
        }
        // result.title = docName;
        if (isValidStr(docName)) {
            result.setAttribute("aria-label", docName);
            result.classList.add("ariaLabel");
        }

        const emojiAndName = document.createElement("span");
        emojiAndName.classList.add("og-hn-emoji-and-name");

        // 触发浮窗用icon element
        const emojiHoverElem = document.createElement("span");
        emojiHoverElem.dataset["type"] = "block-ref";
        emojiHoverElem.dataset["subtype"] = "d";
        emojiHoverElem.dataset["id"] = doc.id;
        emojiHoverElem.classList.add(CONSTANTS.REF_LINK_FOR_POP_OUT_CLASS_NAME);
        emojiHoverElem.innerHTML = emojiStr;

        // 格式化后的文件名Elem
        const trimedDocNameElem = document.createElement("span");
        trimedDocNameElem.classList.add("trimDocName");
        trimedDocNameElem.innerText = trimDocName;
        /* 语义调整 refLink的可点击，docLinksWrapper仅样式 https://github.com/OpaqueGlass/syplugin-hierarchyNavigate/issues/61 */
        if (unclickable) {
            result.classList.add("og-none-click");
            result.classList.remove("refLinks");
        }
        switch (g_setting.popupWindow) {
            case CONSTANTS.POP_ALL: {
                if (!unclickable) {
                    result.dataset["type"] = "block-ref";
                    result.classList.add(CONSTANTS.REF_LINK_FOR_POP_OUT_CLASS_NAME);
                }
                emojiAndName.innerHTML = emojiStr;
                break;
            }
            case CONSTANTS.POP_LIMIT: {
                if (unclickable) {
                    emojiAndName.innerHTML = emojiStr;
                    break;
                }
                if (isValidStr(emojiStr)) {
                    emojiAndName.appendChild(emojiHoverElem);
                }
                break;
            }
            case CONSTANTS.POP_NONE: {
                emojiAndName.innerHTML = emojiStr;
                break;
            }
            default: {

            }
        }
        emojiAndName.appendChild(trimedDocNameElem);
        result.appendChild(emojiAndName);
        // debugPush("doc", doc);
        // debugPush("generateDocLinkElem", result);
        // if (old_result !== result.outerHTML) {
        //     warnPush("重构检查 generateDocLinkElem未通过");
        //     logPush("重构检查：old ", old_result);
        //     logPush("重构检查：new ", result.outerHTML);
        // }
        return result;
        function escapeClass(val: string) {
            if (!val) return "";
            return val.replaceAll(`"`, "");
        }
    }

    static getEmojiHtmlStr(iconString:string, hasChild:boolean, g_setting:any) {
        if (g_setting.icon == CONSTANTS.ICON_NONE) return g_setting.linkDivider;
        // 处理sqlResult等无图标的情况
        if (iconString == null) return g_setting.linkDivider;
        // 无emoji的处理
        if ((!isValidStr(iconString)) && g_setting.icon == CONSTANTS.ICON_ALL) {
            if (window.siyuan.storage["local-images"]) {
                if (hasChild) {
                    return BasicContentPrinter.getEmojiHtmlStr(window.siyuan.storage["local-images"].folder, hasChild, g_setting);
                } else {
                    return BasicContentPrinter.getEmojiHtmlStr(window.siyuan.storage["local-images"].file, hasChild, g_setting);
                }
            }
            return hasChild ? "📑" : "📄";//无icon默认值
        }
        if (!isValidStr(iconString)) return g_setting.linkDivider;
        let result = iconString;
        // emoji地址判断逻辑为出现.，但请注意之后的补全
        if (iconString.startsWith("api/icon/getDynamicIcon")) {
            result = `<img class="iconpic" style="width: 1em" src="/${iconString}"/>`;
        } else if (iconString.indexOf(".") != -1 && !iconString.match(new RegExp("http(s)?:\\/\\/")) ) {
            result = `<img class="iconpic" style="width: 1em" src="/emojis/${iconString}"/>`;
        } else if (iconString.match(new RegExp("http(s)?:\\/\\/"))) {
            result = `<img class="iconpic" style="width: 1em" src="${iconString}"/>`;
        } else {
            result = `<span class="emojitext">${emojiIconHandler(iconString, hasChild)}</span>`;
        }
        return result;
        function emojiIconHandler(iconString:string, hasChild = false) {
            //确定是emojiIcon 再调用，printer自己加判断
            try {
                let result = "";
                iconString.split("-").forEach(element => {
                    debugPush("element", element);
                    result += String.fromCodePoint(Number("0x" + element));
                });
                return result;
            } catch (err) {
                errorPush("emoji处理时发生错误", iconString, err);
                return hasChild ? "📑" : "📄";
            }
        }
    }
    /**
     * 排序方式转sql orderby
     * @param sortType 
     * @returns 
     */
    static linkSortTypeToFowardLinkSortSql(sortType: string): string {
        switch (sortType) {
            case LINK_SORT_TYPES.NAME_ALPHABET_ASC:
                return " ORDER BY content ASC";
            case LINK_SORT_TYPES.NAME_ALPHABET_DESC:
                return " ORDER BY content DESC";
            case LINK_SORT_TYPES.NAME_NATURAL_ASC:
    //             return ` ORDER BY 
    // REGEXP_REPLACE(content, '[0-9]+', '') ASC,
    // CAST(REGEXP_SUBSTR(content, '[0-9]+') AS UNSIGNED) ASC;`;
                return " ORDER BY content ASC";
            case LINK_SORT_TYPES.NAME_NATURAL_DESC:
    //             return ` ORDER BY 
    // REGEXP_REPLACE(content, '[0-9]+', '') DESC,
    // CAST(REGEXP_SUBSTR(content, '[0-9]+') AS UNSIGNED) DESC;`;
                return " ORDER BY content DESC";

            case LINK_SORT_TYPES.CREATE_TIME_ASC:
                return " ORDER BY created ASC";
            case LINK_SORT_TYPES.CREATE_TIME_DESC:
                return " ORDER BY created DESC";
            case LINK_SORT_TYPES.UPDATE_TIME_ASC:
                return " ORDER BY updated ASC";
            case LINK_SORT_TYPES.UPDATE_TIME_DESC:
                return " ORDER BY updated DESC";
            default:
                warnPush("未知的排序类型：" + sortType);
                return " ORDER BY updated DESC";
        }
    }
}

class MoveAreaContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return null;
    }
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const result = super.getContentElement([CONSTANTS.MOVE_TOP_AREA_CONTAINER_CLASS_NAME]);
        const moreOrLess = document.createElement("span");
        moreOrLess.innerHTML = lang("move_temp_top_area");
        result.appendChild(moreOrLess);
        // result.classList.add("og-hn-more-less");
        let offsetX, offsetY, x, y;
        let restricArea = protyleEnvInfo.originProtyle.element; // 获取禁区元素
        result.addEventListener("mousedown", (e) => {
            const outerAreaElem = document.querySelector(".og-hn-heading-docs-container.og-hn-at-doc-top.og-hn-container-to-top") as HTMLElement;
            if (!outerAreaElem) {
                return;
            }
            // outerAreaElem 的 left 和 top 属性是通过 style 设置的，它们是相对于其父容器的。而 getBoundingClientRect() 返回的是相对于视口的位置。所以，使用 e.clientX - rect.left 来计算偏移量会产生一个基于视口的偏移值，而不是基于父容器的偏移值。
            // 之后我们的修改直接赋予style.left/top所以应当基于这个
            offsetX = e.clientX - parseFloat(outerAreaElem.style.left);  // 计算鼠标移动位置，并加上left原始值，下同
            offsetY = e.clientY - parseFloat(outerAreaElem.style.top);
            let timeout = null;
            // 获取限制区域的位置v
            const restrictedRect = restricArea.getBoundingClientRect();
            // 监听鼠标移动
            const onMouseMove = (e) => {
                timeout = setTimeout(() => {
                    clearTimeout(timeout);
                    // 计算鼠标位置
                    x = e.clientX - offsetX;
                    y = e.clientY - offsetY;
                    // 限制拖拽框在 restricArea 区域内的范围
                    x = Math.max(x, restrictedRect.left);
                    x = Math.min(x, restrictedRect.right - outerAreaElem.offsetWidth);
                    y = Math.max(y, restrictedRect.top);
                    y = Math.min(y, restrictedRect.bottom - outerAreaElem.offsetHeight);
                    // 更新元素位置
                    outerAreaElem.style.left = `${x}px`;
                    outerAreaElem.style.top = `${y}px`;
                }, 10);
            };

            // 监听鼠标释放
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                const g_settings = getGSettings();
                g_settings.value["topMovePosition"] = {
                    applyLeft: x,
                    applyTop: y,
                    wndHeight: window.innerHeight,
                    wndWidth: window.innerWidth,
                    protyleHeight: restrictedRect.height,
                    protyleWidth: restrictedRect.width,
                    relativeLeft: x / window.innerWidth,
                    relativeTop: y / window.innerHeight,
                    protyleRelativeLeft: (x - restrictedRect.left) / restrictedRect.width,
                    protyleRelativeTop: (y - restrictedRect.top) / restrictedRect.height,
                };
            };

            // 绑定鼠标移动和释放事件
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        result.dataset.ogContentType = PRINTER_NAME.MOVE_TOP_AREA;
        return result;
    }
    static async isOnlyOnce(basicInfo:IBasicInfo): Promise<boolean> {
        return false;
    }
}

class DocInfoContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return null;
    }

    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        // 请求总字数
        const g_setting = getReadOnlyGSettings();
        let totalWords = null;
        if (!g_setting.performanceMode) {
            totalWords = await getChildDocumentsWordCount(basicInfo.currentDocId);
        }
        let totalChildDocs: any, totalChildDocsNum:Number = -1;
        let directChildDocsNum:Number = basicInfo.docBasicInfo.subFileCount;
        if (!basicInfo.siblingDocLimited) {
            await fillOneDocRelationOfBasicInfo(basicInfo, "allSiblingDocInfoList");
        }
        // 获得所有子文档个数统计
        try {
            if (!g_setting.performanceMode) {
                totalChildDocs = await queryAPI(`SELECT count(*) as total_count FROM blocks WHERE path like "${basicInfo.docBasicInfo.path.replace(".sy", "")}/%" AND type = "d"`);
                totalChildDocsNum = totalChildDocs[0]["total_count"];
            }
        } catch(err) {
            errorPush(err);
        }
        
        let thisDocInfos = null;
        // 检索兄弟文档
        for (const sibling of basicInfo.allSiblingDocInfoList ?? []) {
            if (sibling.id == basicInfo.currentDocId) {
                thisDocInfos = sibling;
                break;
            }
        }
        if (thisDocInfos == null) {
            // 地区不同
            thisDocInfos = {
                "hCtime": parseDateString(basicInfo.docBasicInfo.id.substring(0, 14)).toLocaleString(),
                "hMtime": parseDateString(basicInfo.docBasicInfo.ial["updated"]).toLocaleString()
            }
            // 类似文档树的格式
            thisDocInfos = {
                "hCtime": formatDateStringLikeFileTree(basicInfo.docBasicInfo.id.substring(0, 14)),
                "hMtime": formatDateStringLikeFileTree(basicInfo.docBasicInfo.ial["updated"])
            }
        }
        let result = document.createElement("div");
        result.classList.add(CONSTANTS.INFO_CONTAINER_CLASS);
        // firstLineElem.style.cssText = CONTAINER_STYLE;
        let box = getNotebookInfoLocallyF(basicInfo.docBasicInfo.box);
        let dividerHtml = isMobile() ? "<br/>" : "";

        let infoWordsHtml = totalWords ? `<span class="og-hn-child-word-count-wrapper">
            <span class="og-hn-child-word-count-indicator">${lang("child_word_count")}</span> 
            <span class="og-hn-child-word-count-content">${totalWords}</span>
        </span>` : ``;

        let infoElemInnerText = `<span class="og-hn-create-at-wrapper">
            <span class="og-hn-create-at-indicator">${lang("create_at")}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hCtime"]}</span>
        </span>
        ${dividerHtml}
        <span class="og-hn-modify-at-wrapper">
            <span class="og-hn-modify-at-indicator">${lang("update_at")}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hMtime"]}</span>
        </span>
        ${dividerHtml}
        <span class="og-hn-child-doc-count-wrapper">
        ${lang("child_count").replace("%NUM%", `<span class="og-hn-child-doc-count-content">${directChildDocsNum}</span>`).replace("%TOTAL%", totalChildDocsNum == -1 ? "":`<span class="og-hn-total-child-doc-count-content">(${totalChildDocsNum})</span>`)} 
        </span>
        ${directChildDocsNum == 0 ? "" : 
        infoWordsHtml}
        
        <span class="og-hn-notebook-wrapper">
            ${box.name}
        </span>
        `;
        
        result.innerHTML = infoElemInnerText;
        return result;
    }
}

class ParentContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.PARENT_CONTAINER_ID, lang("parent_nodes"), lang("parent_area"));
    }

    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const contentElem = super.getContentElement(null);
        if (basicInfo.docBasicInfo == null || basicInfo.parentDocBasicInfo == null) {
            const g_setting = getReadOnlyGSettings();
            // 历史兼容选项，当没有父文档时，将显示兄弟文档
            if (g_setting.sibling) {
                return await SiblingContentPrinter.getBindedElement(basicInfo, protyleEnvInfo);
            }
            contentElem.appendChild(super.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            if (basicInfo.parentDocBasicInfo) {
                contentElem.appendChild(this.docLinkGenerator(basicInfo.parentDocBasicInfo));
            } else {
                contentElem.appendChild(this.getNoneElement());
                contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
            }
        }
        logPush("parentAreaOutput", contentElem);
        return contentElem;
    }
}

class SiblingContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.SIBLING_CONTAINER_ID, lang("sibling_nodes"), lang("sibling_area"));
    }

    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const contentElem = super.getContentElement(null);
        if (basicInfo.siblingDocLimited) {
            logPush("出于性能考虑，本文档的同级文档将不再显示");
            return null;
        }
        await fillOneDocRelationOfBasicInfo(basicInfo, "userDemandSiblingDocInfoList");
        contentElem.dataset.ogIndicatorTitle = lang("number_count").replace("%NUM%", basicInfo.userDemandSiblingDocInfoList.length);
        if (basicInfo.userDemandSiblingDocInfoList.length == 0) {
            contentElem.appendChild(super.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            for (let i = 0; i < basicInfo.userDemandSiblingDocInfoList.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
                let doc = basicInfo.userDemandSiblingDocInfoList[i];
                const oneLinkElem = this.docLinkGenerator(doc);
                if (doc.id == basicInfo.currentDocId) {
                    // const parser = new DOMParser();
                    // const doc = parser.parseFromString(temp, "text/html");
                    // let tempElement = doc.body.firstChild;
                    // tempElement.classList.add("og-hn-docLinksWrapper-hl");
                    // temp = tempElement.outerHTML;
                    oneLinkElem.classList.add("og-hn-docLinksWrapper-hl");
                }
                contentElem.appendChild(oneLinkElem);
            }
        }
        return contentElem;
    }
}

// IDEA: 或者我们把不同的决策设置为一个新的Printer，比如自动换成widget的话，一个AutoChild 然后判断再调用 Widget/Child
class ChildContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.CHILD_CONTAINER_ID, lang("child_nodes"), lang("child_area"));
    }

    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const contentElem = super.getContentElement(null);
        if (g_setting.noChildIfHasAv && await isDocHasAv(basicInfo.currentDocId)) {
            logPush("文档中含有数据库，不显示子文档区域");
            return null;
        }

        if (basicInfo.subDocLimited) {
            logPush("文档数量过多，停止显示");
            return null;
        }
        await fillOneDocRelationOfBasicInfo(basicInfo, "childDocInfoList");

        contentElem.dataset.ogIndicatorTitle = lang("number_count").replace("%NUM%", basicInfo.childDocInfoList.length);
        if (basicInfo.childDocInfoList.length == 0) {
            contentElem.appendChild(super.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            for (let i = 0; i < basicInfo.childDocInfoList.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
                let doc = basicInfo.childDocInfoList[i];
                const oneLinkElem = super.docLinkGenerator(doc);
                contentElem.appendChild(oneLinkElem);
            }
        }
        return contentElem;
    }
}

class BreadcrumbContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.BREADCRUMB_CONTAINER_CLASS_NAME, null, null);
    }

    static async getWrappedBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        return await this.getBindedElement(basicInfo, protyleEnvInfo);
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        // 没有前置缩进，不加入multiline样式
        const contentElem = super.getContentElement([CONSTANTS.BREADCRUMB_CONTAINER_CLASS_NAME, CONSTANTS.CONTAINER_CLASS_NAME]);
        // 这里嵌套了一层element……是因为原来用的parent下插入的面包屑，暂时保持一致
        const breadcrumbElem = await this.generateBreadCrumb(basicInfo);
        contentElem.appendChild(breadcrumbElem);

        // 绑定 > 点击事件
        contentElem.querySelectorAll(`.og-fake-breadcrumb-arrow-span[data-type="FILE"], .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"]`).forEach((elem) => {
            elem.addEventListener("click", this.openRelativeMenu)
        });
        return contentElem;
    }
    static async generateBreadCrumb(basicInfo:IBasicInfo) {
        const pathObject = await this.parseDocPath(basicInfo.docBasicInfo);
        const breadcrumbElem = await this.generateBreadCrumbElement(pathObject);
        return breadcrumbElem;
    }
    static async parseDocPath(docDetail) {
        let docPath = getListDocsByPathAPIFilePath(docDetail.path, docDetail.box);
        if (docPath.endsWith(".sy")) {
            docPath = docPath.substring(0, docPath.length - 3);
        }
        let pathArray = docPath.split("/");
        // let hpathArray = docDetail.hpath.split("/");
        let resultArray = [];
        let box = getNotebookInfoLocallyF(docDetail.box);
        let temp = {
            "name": box.name,
            "id": box.id,
            "icon": box.icon,
            "box": box.id,
            "path": "/",
            "type": "NOTEBOOK",
            "subFileCount": 999,
            "bNotebookDoc": true
        }
        resultArray.push(temp);
        let tempPath = "";
        // slice(start, end) 起始start，终止end(不含)
        const docInfoPromises = pathArray.slice(1).filter(item => isValidStr(item)).map(async (pathSegment) => {
            const docInfoResult = await getDocInfo(pathSegment);
            docInfoResult["box"] = box.id;
            docInfoResult["path"] = `${tempPath}/${pathSegment}.sy`;
            docInfoResult["type"] = "FILE";
            docInfoResult["name"] = `${docInfoResult["name"]}`;
            tempPath += `/${pathSegment}`;
            return docInfoResult;
        });

        const docInfoResults = await Promise.all(docInfoPromises);

        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Spread_syntax
        resultArray.push(...docInfoResults);

        return resultArray;
    }
    static async generateBreadCrumbElement(pathObjects: any) {
        const result = document.createElement("div");
        result.classList.add("og-hn-parent-area-replace-with-breadcrumb");
        const g_setting = getReadOnlyGSettings();

        const divideArrow = `<span class="og-fake-breadcrumb-arrow-span" data-type="%4%" data-parent-id="%5%"  data-next-id="%6%"><svg class="${CONSTANTS.ARROW_CLASS_NAME}"
            data-type="%4%" data-parent-id="%5%">
            <use xlink:href="#iconRight"></use></svg></span>`;
        // oneItm换用docLinkGenerator生成链接
        for (let i = 0; i < pathObjects.length; i++) {
            let onePathObject = pathObjects[i];
            if (i != 0) { // 这里排除了Notebook节点
                result.appendChild(this.docLinkGenerator(pathObjects[i]));
            } else if (g_setting.showNotebookInBreadcrumb || isNotebookDocEnabled()) {
                result.appendChild(this.docLinkGenerator(pathObjects[i], !isNotebookDocEnabled()));
            }
            // 如果是最后一个条目，且没有子文档，则不显示`>`；笔记本文档除外
            if (i == pathObjects.length - 1 && !onePathObject["bNotebookDoc"] && !await isChildDocExist(onePathObject.id)) {
                continue;
            }
            result.insertAdjacentHTML("beforeend", divideArrow
                .replaceAll("%4%", onePathObject.type)
                .replaceAll("%5%", pathObjects[i].id)
                .replaceAll("%6%", pathObjects[i+1]?.id));
        }
        return result;
    }
    static async openRelativeMenu(event) {
        const g_setting = getReadOnlyGSettings();
        let id = event.currentTarget.getAttribute("data-parent-id");
        let nextId = event.currentTarget.getAttribute("data-next-id");
        let rect = event.currentTarget.getBoundingClientRect();
        if (clearMenuInstance(id)) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = '${id}'`);
        if (sqlResult.length == 0 || isNotebookDoc(sqlResult[0].path, sqlResult[0].box)) {
            sqlResult = [{
                path: "/",
                box: id
            }];
        }
        let siblings = await getChildDocuments(sqlResult[0], g_setting);
        if (siblings.length <= 0) return;
        const tempMenu = new Menu("og-hn-relative-menu");
        for (let i = 0; i < siblings.length; i++) {
            let currSibling = siblings[i];
            currSibling.name = trimListDocsByPathAPIReturnedDocName(currSibling.name);
            let trimedName = currSibling.name.length > g_setting.nameMaxLength ? 
                currSibling.name.substring(0, g_setting.nameMaxLength) + "..."
                : currSibling.name;
            let tempMenuItemObj = {
                accelerator: nextId == currSibling.id ? "<-" : undefined,
                iconHTML: BreadcrumbContentPrinter.getEmojiHtmlStrE2(currSibling.icon, currSibling.subFileCount != 0),
                label: `<span class="${CONSTANTS.MENU_ITEM_CLASS_NAME}" 
                    og-data-doc-id="${currSibling.id}"
                    ${nextId == currSibling.id ? `style="font-weight: bold;"` : ""}
                    title="${currSibling.name}">
                    ${trimedName}
                </span>`,
                click: (element, event)=>{
                    debugPush("menu clickEvent", event);
                    let docId = element.querySelector("[og-data-doc-id]")?.getAttribute("og-data-doc-id");
                    openRefLinkByAPIWithConfig({mouseEvent: event, paramDocId: docId, g_setting: getReadOnlyGSettings()});
                }
            }
            // if (currSibling.icon != "" && currSibling.icon.indexOf(".") == -1) {
            //     tempMenuItemObj["icon"] = `icon-${currSibling.icon}`;
            // }
            tempMenu.addItem(tempMenuItemObj);
        }
        if (siblings.length * 30 > (window.innerHeight - rect.bottom) * 0.7) {
            tempMenu.open({x: rect.right, y: rect.top, isLeft:false});
        } else {
            tempMenu.open({x: rect.left, y: rect.bottom, isLeft:false});
        }
        setTimeout(()=>{
            if (g_setting.menuKeepCurrentVisible) {
                tempMenu.element.querySelector('.b3-menu__item--selected')?.scrollIntoView({
                    behavior: 'smooth',        // 平滑滚动（可选）
                    block: 'nearest',          // 'start' | 'center' | 'end' | 'nearest'
                    inline: 'nearest'
                });
            }
        }, 3);
        saveMenuInstance(tempMenu, id);
    }
    static getEmojiHtmlStrE2(iconString, hasChild) {
        const g_setting = getReadOnlyGSettings();
        if (g_setting.icon == CONSTANTS.ICON_NONE) return ``;
        // 无emoji的处理
        if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_ALL) {
            if (window.siyuan.storage["local-images"]) {
                if (hasChild) {
                    return BreadcrumbContentPrinter.getEmojiHtmlStrE2(window.siyuan.storage["local-images"].folder, hasChild);
                } else {
                    return BreadcrumbContentPrinter.getEmojiHtmlStrE2(window.siyuan.storage["local-images"].file, hasChild);
                }
            }
            return hasChild ? `<span class="og-hn-menu-emojitext">📑</span>` : `<span class="og-hn-menu-emojitext">📄</span>`;//无icon默认值
        }
        if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_CUSTOM_ONLY) return `<span class="og-hn-menu-emojitext"></span>`;
        let result = iconString;
        // emoji地址判断逻辑为出现.，但请注意之后的补全
        if (iconString.startsWith("api/icon/getDynamicIcon")) {
            result = `<img class="og-hn-menu-emojipic" src="/${iconString}"/>`;
        } else if (iconString.indexOf(".") != -1 && !iconString.match(new RegExp("http(s)?:\\/\\/")) ) {
            result = `<img class="og-hn-menu-emojipic" src="/emojis/${iconString}"/>`;
        } else if (iconString.match(new RegExp("http(s)?:\\/\\/"))) {
            result = `<img class="og-hn-menu-emojipic" src="${iconString}"/>`;
        } else {
            result = `<span class="og-hn-menu-emojitext">${BreadcrumbContentPrinter.emojiIconHandler(iconString, hasChild)}</span>`;
        }
        return result;
    }
    static emojiIconHandler(iconString, hasChild = false) {
        //确定是emojiIcon 再调用，printer自己加判断
        try {
            let result = "";
            iconString.split("-").forEach(element => {
                result += String.fromCodePoint(Number("0x" + element));
            });
            return result;
        } catch (err) {
            errorPush("emoji处理时发生错误", iconString, err);
            return hasChild ? "📑" : "📄";
        }
    }
}

export class BackLinkContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.BACKLINK_CONTAINER_CLASS_NAME, lang("backlink_nodes"), lang("backlink_area"));
    }

    private static escapeSqlValue(value: string) {
        return value.replaceAll(`"`, `""`);
    }

    /**
     * 获取具体引用对应的内容块id
     * @param backLinkInfos 这里的id是引用发出者所在的文档id
     * @param defDocId 被引文档id
     * @param exactDefBlock 是否要求精确匹配内容，为false则引用了在被引文档的任何内容块都行；为true是必须引用的是被引文档
     * @returns 
     */
    private static async attachBacklinkRefBlockInfo(backLinkInfos: any[], defDocId: string, exactDefBlock: boolean = false) {
        const docIds = backLinkInfos.map((item) => item.id).filter((id) => isValidStr(id));
        const refBlockIdMap = new Map<string, string>();
        if (docIds.length > 0) {
            const defColumn = exactDefBlock ? "def_block_id" : "def_block_root_id";
            const docIdListSql = docIds.map((id) => `"${this.escapeSqlValue(id)}"`).join(",");
            const sqlStmt = `SELECT root_id, block_id FROM refs WHERE ${defColumn} = "${this.escapeSqlValue(defDocId)}" AND root_id IN (${docIdListSql}) ORDER BY block_id ASC`;
            try {
                const refBlockResponse = await queryAPI(sqlStmt);
                refBlockResponse?.forEach((item) => {
                    if (isValidStr(item.root_id) && isValidStr(item.block_id) && !refBlockIdMap.has(item.root_id)) {
                        refBlockIdMap.set(item.root_id, item.block_id);
                    }
                });
            } catch (err) {
                warnPush("查询反链引用块失败", err);
            }
        }
        backLinkInfos.forEach((item) => {
            const docId = item.id;
            item.isBacklink = true;
            item.defId = defDocId;
            item.docId = docId;
            const refBlockId = refBlockIdMap.get(docId);
            if (isValidStr(refBlockId)) {
                item.id = refBlockId;
            }
        });
        return backLinkInfos;
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        let contentElem = null;
        switch (g_setting.showBackLinksType) {
            case CONSTANTS.BACKLINK_DOC_ONLY: {
                contentElem = await this.docOnlyBackLinkElement(basicInfo);
                break;
            }
            case CONSTANTS.BACKLINK_NORMAL: {
                contentElem = await this.normalBackLinkElement(basicInfo);
                break;
            }
            default: {
                warnPush("BackLink配置项值错误", g_setting.showBackLinksType);
                break;
            }
        }
        if (contentElem == null) {
            contentElem = super.getContentElement(null);
            contentElem.appendChild(super.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        return contentElem;
    }
    static async getNormalBackLinks(docId: string, sortType: string) {
        // 处理不同排序方式
        let backlinkResponse = await getBackLink2T(docId, linkSortTypeToBackLinkApiSortNum(sortType));
        debugPush("backlinkResponse", backlinkResponse);
        if (backlinkResponse.backlinks.length == 0) {
            return [];
        }
        const prepareBackLinkInfo = [];
        for (let i = 0; i < backlinkResponse.backlinks.length; i++) {
            const oneBacklinkItem = backlinkResponse.backlinks[i];
            if (oneBacklinkItem.nodeType === "NodeDocument") {
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.name,
                    "name": oneBacklinkItem.name,
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                prepareBackLinkInfo.push(tempDocItem);
            }
        }
        return this.attachBacklinkRefBlockInfo(pinAndRemoveByDocNameForBackLinks(prepareBackLinkInfo), docId);
    }
    static async normalBackLinkElement(basicInfo: IBasicInfo) {
        const result = this.getContentElement(null);
        // 处理不同排序方式
        const g_setting = getReadOnlyGSettings();
        const backlinkResponse = await getBackLink2T(basicInfo.currentDocId, linkSortTypeToBackLinkApiSortNum(g_setting.sortForBackLink));
        debugPush("backlinkResponse", backlinkResponse);
        if (backlinkResponse.backlinks.length == 0) {
            return null;
        }
        const prepareBackLinkInfo = [];
        for (let i = 0; i < backlinkResponse.backlinks.length; i++) {
            const oneBacklinkItem = backlinkResponse.backlinks[i];
            if (oneBacklinkItem.nodeType === "NodeDocument") {
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.name,
                    "name": oneBacklinkItem.name,
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                prepareBackLinkInfo.push(tempDocItem);
            }
        }
        const sortedBackLinkInfos = await this.attachBacklinkRefBlockInfo(pinAndRemoveByDocNameForBackLinks(prepareBackLinkInfo), basicInfo.currentDocId);

        sortedBackLinkInfos.forEach((item)=>{
            result.appendChild(this.docLinkGenerator(item));
        });
        if (sortedBackLinkInfos.length == 0) {
            return null;
        }
        return result;
    }
    static async getDocOnlyBackLinks(docId: string, sortType: string) {
        // 处理不同排序方式
        const g_setting = getReadOnlyGSettings();
        let sqlStmt = `SELECT id, content FROM blocks WHERE id in (
            SELECT DISTINCT root_id FROM refs WHERE def_block_id = "${docId}" LIMIT ${CONSTANTS.LINKS_LIMIT}
            ) AND type = "d" ` + this.linkSortTypeToFowardLinkSortSql(sortType);
        let backlinkDocSqlResponse = await queryAPI(sqlStmt);
        if (backlinkDocSqlResponse != null && backlinkDocSqlResponse.length > 0) {
            if (sortType == LINK_SORT_TYPES.NAME_NATURAL_ASC || sortType == LINK_SORT_TYPES.NAME_NATURAL_DESC) {
                backlinkDocSqlResponse = sortIFileWithNatural(backlinkDocSqlResponse.slice(), "content", sortType == LINK_SORT_TYPES.NAME_NATURAL_DESC);
                logPush("自然排序", backlinkDocSqlResponse);
            }
            const prepareBackLinkInfo = [];
            for (let i = 0; i < backlinkDocSqlResponse.length; i++) {
                const oneBacklinkItem = backlinkDocSqlResponse[i];
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.content,
                    "name": oneBacklinkItem.content,
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                prepareBackLinkInfo.push(tempDocItem);
            }
            return this.attachBacklinkRefBlockInfo(pinAndRemoveByDocNameForBackLinks(prepareBackLinkInfo), docId, true);
        } else {
            return [];
        }
    }
    static async docOnlyBackLinkElement(basicInfo: IBasicInfo) {
        const result = this.getContentElement(null);
        // 处理不同排序方式
        const g_setting = getReadOnlyGSettings();
        let sqlStmt = `SELECT id, content FROM blocks WHERE id in (
            SELECT DISTINCT root_id FROM refs WHERE def_block_id = "${basicInfo.currentDocId}" LIMIT ${CONSTANTS.LINKS_LIMIT}
            ) AND type = "d" ` + this.linkSortTypeToFowardLinkSortSql(g_setting.sortForBackLink);
        let backlinkDocSqlResponse = await queryAPI(sqlStmt);
        debugPush("backlinkSQLResponse", backlinkDocSqlResponse);
        if (backlinkDocSqlResponse != null && backlinkDocSqlResponse.length > 0) {
            if (g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_ASC || g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_DESC) {
                backlinkDocSqlResponse = sortIFileWithNatural(backlinkDocSqlResponse.slice(), "content", g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_DESC);
                logPush("自然排序", backlinkDocSqlResponse);
            }
            const prepareBackLinkInfo = [];
            for (let i = 0; i < backlinkDocSqlResponse.length; i++) {
                const oneBacklinkItem = backlinkDocSqlResponse[i];
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.content,
                    "name": oneBacklinkItem.content,
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                prepareBackLinkInfo.push(tempDocItem);
            }
            const sortedBackLinkInfos = await this.attachBacklinkRefBlockInfo(pinAndRemoveByDocNameForBackLinks(prepareBackLinkInfo), basicInfo.currentDocId, true);

            sortedBackLinkInfos.forEach((item)=>{
                result.appendChild(this.docLinkGenerator(item));
            });
            if (sortedBackLinkInfos.length == 0) {
                return null;
            }
        } else {
            return null;
        }
        return result;
    }
}

class NeighborContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.NEXT_CONTAINER_CLASS_NAME, lang("neighbor_nodes"), lang("neighbor_area"));
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        if (basicInfo.siblingDocLimited) {
            logPush("出于性能考虑，上一篇下一篇（相邻文档）在本文档不显示");
            return null;
        }
        await fillOneDocRelationOfBasicInfo(basicInfo, "allSiblingDocInfoList");
        const siblingDocs = basicInfo.allSiblingDocInfoList;
        const contentElem = super.getContentElement([CONSTANTS.NEXT_DOC_MULTILINE_CLASS_NAME]);
        let iCurrentDoc = -1;
        let previousElem = null, nextElem = null;
        for (let iSibling = 0; iSibling < siblingDocs.length; iSibling++) {
            if (siblingDocs[iSibling].id === basicInfo.currentDocId) {
                iCurrentDoc = iSibling;
                break;
            }
        }
        // 我们应该根据情况获取，如果是按照月构建的dailynote，同一笔记上可能有多个标签
        let minCurrentDate = Number.MAX_SAFE_INTEGER.toString(); // 向上跳转用
        let maxCurrentDate = "0";
        const protyle = protyleEnvInfo.originProtyle as IProtyle
        const ialObject = protyle.background?.ial;
        if (g_setting.previousAndNextFollowDailynote) {
            for (const key in ialObject) {
                if (key.startsWith("custom-dailynote-")) {
                    if (parseInt(ialObject[key]) > parseInt(maxCurrentDate)) {
                        maxCurrentDate = ialObject[key];
                    }
                    if (parseInt(ialObject[key]) < parseInt(minCurrentDate)) {
                        minCurrentDate = ialObject[key];
                    }
                }
            }
        }
        const dailynoteFlag = JSON.stringify(protyle.background?.ial)?.includes("custom-dailynote");
        const sortMode = getNotebookSortModeF(basicInfo.docBasicInfo.box);
        const sortByNameOrCreateTimeFlag = isSortByNameOrCreateTime(sortMode);
        const ascSortFlag = isSortAsc(sortMode);
        // #78 文档排序方式 升降序补充缺失的上一篇或下一篇；文件名、自然排序、创建时间排序以外的排序方式，不补充；
        if (iCurrentDoc >= 0 && siblingDocs.length >= 1) {
            let flag = false;
            // 上一篇
            if (dailynoteFlag 
                && (g_setting.previousAndNextFollowDailynote // 选项强制
                    || (iCurrentDoc <= 0 && sortByNameOrCreateTimeFlag)  // 第一篇且是按照名字或创建时间排序
                    )
                ) {
                let getNewer = false;
                if (!g_setting.previousAndNextFollowDailynote && !ascSortFlag) {
                    getNewer = true;
                }
                const thisDocInfo = await getNeighborDailyNoteDoc({ialObject: ialObject, docId: basicInfo.docBasicInfo.id, boxId: basicInfo.docBasicInfo.box, getNewer: getNewer});
                debugPush("日记组-上一篇", thisDocInfo);
                if (thisDocInfo) {
                    thisDocInfo["ogSimpleName"] = lang("previous_doc") + htmlTransferParser(thisDocInfo.name);
                    thisDocInfo["name"] = thisDocInfo.name;
                    if (g_setting.requestAllDocIcon && !isMobile()) {
                        const fullDocInfo = await getDocInfo(thisDocInfo.id);
                        thisDocInfo["icon"] = fullDocInfo.icon;
                        thisDocInfo["subFileCount"] = fullDocInfo.subFileCount;
                    }
                    const oneLinkElem = super.docLinkGenerator(thisDocInfo);
                    previousElem = oneLinkElem;
                    flag = true;
                }
            } else if (iCurrentDoc > 0) {
                let simpleName = lang("previous_doc") + htmlTransferParser(siblingDocs[iCurrentDoc - 1]["name"]);
                let docInfo = Object.assign({}, siblingDocs[iCurrentDoc - 1]);
                docInfo["ogSimpleName"] = trimListDocsByPathAPIReturnedDocName(simpleName);
                previousElem = this.docLinkGenerator(docInfo);
                flag = true;
            }

            if (dailynoteFlag 
                && (g_setting.previousAndNextFollowDailynote
                     || (iCurrentDoc + 1 >= siblingDocs.length) && sortByNameOrCreateTimeFlag)
                    ) {
                let getNewer = true;
                if (!g_setting.previousAndNextFollowDailynote && !ascSortFlag) {
                    getNewer = false;
                }
                const thisDocInfo = await getNeighborDailyNoteDoc({ialObject: ialObject, docId: basicInfo.docBasicInfo.id, boxId: basicInfo.docBasicInfo.box, getNewer: getNewer});
                debugPush("日记组-下一篇", thisDocInfo);
                if (thisDocInfo) {
                    thisDocInfo["ogSimpleName"] = lang("next_doc") + htmlTransferParser(thisDocInfo.name);
                    thisDocInfo["name"] = thisDocInfo.name;
                    if (g_setting.requestAllDocIcon && !isMobile()) {
                        const fullDocInfo = await getDocInfo(thisDocInfo.id);
                        thisDocInfo["icon"] = fullDocInfo.icon;
                        thisDocInfo["subFileCount"] = fullDocInfo.subFileCount;
                    }
                    const oneLinkElem = super.docLinkGenerator(thisDocInfo);
                    nextElem = oneLinkElem;
                    flag = true;
                }
            } else if (iCurrentDoc + 1 < siblingDocs.length) {
                let simpleName = lang("next_doc") + htmlTransferParser(siblingDocs[iCurrentDoc + 1]["name"]);
                let docInfo = Object.assign({}, siblingDocs[iCurrentDoc + 1]);
                docInfo["ogSimpleName"] = trimListDocsByPathAPIReturnedDocName(simpleName);
                nextElem = this.docLinkGenerator(docInfo);
                flag = true;
            }

            // if (iCurrentDoc > 0) {
                
            // } else if (isValidStr(minCurrentDate) && minCurrentDate != Number.MAX_SAFE_INTEGER.toString() && g_setting.previousAndNextFollowDailynote) {
            //     const response = await queryAPI(`
            //     SELECT b.content as name, b.id
            //     FROM attributes AS a
            //     JOIN blocks AS b ON a.root_id = b.id
            //     WHERE a.name LIKE 'custom-dailynote%' AND a.block_id = a.root_id
            //     AND b.box = '${basicInfo.docBasicInfo.box}' 
            //     AND a.value < '${minCurrentDate}'
            //     ORDER BY
            //     a.value DESC
            //     LIMIT 1`);
            //     debugPush("上一层", response);
            //     if (response && response.length > 0) {
            //         const thisDocInfo = response[0];
            //         thisDocInfo["ogSimpleName"] = lang("previous_doc") + htmlTransferParser(thisDocInfo.name);
            //         thisDocInfo["name"] = thisDocInfo.name;
            //         const oneLinkElem = super.docLinkGenerator(thisDocInfo);
            //         previousElem = oneLinkElem;
            //         flag = true;
            //     }
            // }
            // if (iCurrentDoc + 1 < siblingDocs.length) {
            //     let simpleName = lang("next_doc") + htmlTransferParser(siblingDocs[iCurrentDoc + 1]["name"]);
            //     let docInfo = Object.assign({}, siblingDocs[iCurrentDoc + 1]);
            //     docInfo["ogSimpleName"] = trimListDocsByPathAPIReturnedDocName(simpleName);
            //     nextElem = this.docLinkGenerator(docInfo);
            //     flag = true;
            // } else if (isValidStr(maxCurrentDate) && maxCurrentDate != "0" && g_setting.previousAndNextFollowDailynote) {
            //     const response = await queryAPI(`
            //     SELECT b.content as name, b.id, a.value
            //     FROM attributes AS a
            //     JOIN blocks AS b ON a.root_id = b.id
            //     WHERE a.name LIKE 'custom-dailynote%' AND a.block_id = a.root_id
            //     AND b.box = '${basicInfo.docBasicInfo.box}' 
            //     AND a.value > '${maxCurrentDate}'
            //     ORDER BY
            //     a.value ASC
            //     LIMIT 1`);
            //     debugPush("下一层", response);
            //     if (response && response.length > 0) {
                    // const thisDocInfo = response[0];
                    // thisDocInfo["ogSimpleName"] = lang("next_doc") + htmlTransferParser(thisDocInfo.name);
                    // thisDocInfo["name"] = thisDocInfo.name;
                    // const oneLinkElem = super.docLinkGenerator(thisDocInfo);
                    // nextElem = oneLinkElem;
                    // flag = true;
            //     }
            // }
            if (flag) {
                if (previousElem) {
                    contentElem.appendChild(previousElem);
                }
                if (nextElem) {
                    contentElem.appendChild(nextElem);
                }
                contentElem.classList.add(CONSTANTS.NEXT_CONTAINER_CLASS_NAME);
            } else {
                const noneElem = this.getNoneElement();
                contentElem.appendChild(noneElem);
                contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
            }
        } else {
            const noneElem = this.getNoneElement();
            noneElem.title = lang("is_hidden_doc");
            contentElem.appendChild(noneElem);
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        return contentElem;
    }
}

// TODO: 有个问题，widget不应该走切换页签的刷新吧，这个加载太慢；可能要applyer做其他实现
class WidgetContentPrinter extends BasicContentPrinter {
    static isDoNotUpdate = true;

    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.CHILD_CONTAINER_ID, lang("child_nodes"), lang("child_area"));
    }

    static async getWrappedBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        if (basicInfo.docBasicInfo.subFileCount <= 0) {
            logPush("无子文档，不显示子文档区域");
            const result = await this.getBasicElement();
            const contentElem = super.getContentElement(null);
            contentElem.appendChild(this.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
            this.isDoNotUpdate = false;
            result.appendChild(contentElem);
            result.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
            return result;
        }
        return await this.getBindedElement(basicInfo, protyleEnvInfo);
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        if (g_setting.noChildIfHasAv && await isDocHasAv(basicInfo.currentDocId)) {
            logPush("文档中含有数据库，不显示子文档区域");
            return null;
        }
        
        if (g_setting.lcdEmptyDocThreshold >= 0 && !await isDocEmpty(basicInfo.currentDocId, g_setting.lcdEmptyDocThreshold)) {
            this.isDoNotUpdate = false;
            return await ChildContentPrinter.getWrappedBindedElement(basicInfo, protyleEnvInfo);
        }
        this.isDoNotUpdate = true;
        const result = document.createElement("div");
        result.classList.add("og-hn-widget-container");
        /* ?printMode=11 */
        result.innerHTML = `<iframe src="/widgets/listChildDocs/" data-subtype="widget" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; height: ${(window.screen.availWidth - 75) > 350 ? 350 : (window.screen.availWidth - 75)}px;" data-doc-id="${basicInfo.currentDocId}" ></iframe>`;
        if (isValidStr((result.children[0] as HTMLElement).dataset)) {
            (result.children[0] as HTMLElement).dataset.defaultConfig = JSON.stringify({height_2widget_min: 150});
        }
        return result;
    }
    static async isOnlyOnce(basicInfo: IBasicInfo): Promise<boolean> {
        return this.isDoNotUpdate;    
    }
}


class BlockTitleBreadcrumbContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.BREADCRUMB_CONTAINER_CLASS_NAME, null, null);
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        debugPush("isMobile", isMobile(), g_setting.hideBlockBreadceumbInDesktop);
        if (!isMobile() && g_setting.hideBlockBreadcrumbInDesktop) {
            return null;
        }
        // 没有前置缩进，不加入multiline样式
        const contentElem = super.getContentElement([CONSTANTS.CONTAINER_CLASS_NAME]);
        // 这里嵌套了一层element……是因为原来用的parent下插入的面包屑，暂时保持一致
        const breadcrumbElem = await this.generateBreadCrumb(basicInfo, protyleEnvInfo);
        if (!breadcrumbElem) {
            return null;
        }
        contentElem.appendChild(breadcrumbElem);

        // 绑定 > 点击事件
        // result.querySelectorAll(`.og-fake-breadcrumb-arrow-span[data-type="FILE"], .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"]`).forEach((elem) => {
        //     elem.addEventListener("click", this.openRelativeMenu)
        // });
        return contentElem;
    }
    static async generateBreadCrumb(basicInfo:IBasicInfo, protyleEnvInfo:IProtyleEnvInfo) {
        const pathObject = await this.parseDocPath(protyleEnvInfo.originProtyle as IProtyle);
        const breadcrumbElem = await this.generateBreadCrumbElement(pathObject);
        return breadcrumbElem;
    }
    static async parseDocPath(protyle: IProtyle) {
        let blockId = protyle?.breadcrumb?.id;
        let paraBlockId = protyle.element.querySelector(`[data-node-id='${protyle.block.id}'] .p`)?.getAttribute("data-node-id");
        debugPush(`breadblockId ${blockId} parablockId ${paraBlockId} blockId ${protyle.block.id}`);
        if (!isValidStr(blockId) && isValidStr(paraBlockId)) {
            blockId = paraBlockId;
            debugPush("闪卡id定位，使用选择器结果", blockId)
        }
        if (!isValidStr(blockId)) {
            blockId = protyle.block.id;
        }
        const blockBreadcrumbs = await getBlockBreadcrumb(blockId, ["NodeTextMark-mark"]);
        debugPush("blockBread", blockBreadcrumbs);
        const lastBlock = blockBreadcrumbs[blockBreadcrumbs.length - 1];
        const resultArray = blockBreadcrumbs.slice(1).map((block) => {
            return {
                "name": block.name,
                "id": block.id,
                "icon": blockIconProvider(block.type, block.subType),
                "box": "",
                "path": "",
                "type": "BLOCK",
                "subFileCount": 0
            }
        });
        if (lastBlock.type == "NodeParagraph" || lastBlock.type == "NodeHeading") {
            resultArray.pop();
            if (blockBreadcrumbs.length >= 3 && blockBreadcrumbs[blockBreadcrumbs.length - 2]?.name == lastBlock.name) {
                resultArray.pop();
            }
        }
        debugPush("block bread resultArray", resultArray);
        return resultArray;
        function blockIconProvider(mainType: string, subType: string) {
            if (mainType == "NodeListItem") {
                return "2a-fe0f-20e3";
            }
            if (subType.includes("h")) {
                let countNum = parseInt(subType.substring(1));
                return `3${countNum}-fe0f-20e3`;
            }
            return "";
        }
    }
    static async generateBreadCrumbElement(pathObjects: any) {
        const result = document.createElement("div");
        result.classList.add("og-hn-parent-area-replace-with-breadcrumb");

        const divideArrow = `<span class="og-fake-breadcrumb-arrow-span" data-type="%4%" data-parent-id="%5%"><svg class="${CONSTANTS.ARROW_CLASS_NAME}"
            data-type="%4%" data-parent-id="%5%">
            <use xlink:href="#iconRight"></use></svg></span>`;
        if (pathObjects.length == 0) {
            return null;
        }
        // oneItm换用docLinkGenerator生成链接
        for (let i = 0; i < pathObjects.length; i++) {
            let onePathObject = pathObjects[i];
            result.appendChild(this.docLinkGenerator(pathObjects[i]));
            result.insertAdjacentHTML("beforeend", divideArrow
                .replaceAll("%4%", onePathObject.type)
                .replaceAll("%5%", pathObjects[i].id));
        }
        return result;
    }
}

class OnThisDayInPreviousYears extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.ON_THIS_DAY_CONTAINER_CLASS_NAME, lang("on_this_day_nodes"), lang("on_this_day_area"));
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const contentElem = super.getContentElement(null);
        let currentDateMonthDay = "";
        const protyle = protyleEnvInfo.originProtyle as IProtyle
        const ialObject = protyle.background?.ial;
        for (const key in ialObject) {
            if (key.startsWith("custom-dailynote-")) {
                currentDateMonthDay = key.substring(key.length - 4);
                break;
            }
        }
        if (!isValidStr(currentDateMonthDay)) {
            logPush("不是日记，没有往年今日", ialObject);
            return undefined;
        }
        const response = await queryAPI(`
        SELECT b.content as name, b.id
        FROM attributes AS a
        JOIN blocks AS b ON a.root_id = b.id
        WHERE a.name LIKE '%${currentDateMonthDay}' AND a.name LIKE 'custom-dailynote%' AND a.block_id = a.root_id
        AND b.box = "${basicInfo.docBasicInfo.box}"`);
        if (response.length <= 1) {
            logPush("没有往年今日", response);
            const noneElem = super.getNoneElement();
            contentElem.appendChild(noneElem);
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
            return contentElem;
        }
        for (let i = 0; i < response.length; i++) {
            const thisDocInfo = response[i];
            if (thisDocInfo.id == basicInfo.docBasicInfo.id) {
                continue;
            }
            thisDocInfo.name = thisDocInfo.name;
            const oneLinkElem = super.docLinkGenerator(thisDocInfo);
            contentElem.appendChild(oneLinkElem);
        }
        return contentElem;
    }
    static async isOnlyOnce(basicInfo: IBasicInfo): Promise<boolean> {
        return true;    
    }
}




class ForwardLinkPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.FOWARDLINK_CONTAINER_CLASS_NAME, lang("forwardlink_nodes"), lang("forwardlink_area"));
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        let contentElem = null;
        switch (g_setting.showBackLinksType) {
            case CONSTANTS.BACKLINK_DOC_ONLY: {
                contentElem = await this.docOnlyBackLinkElement(basicInfo);
                break;
            }
            case CONSTANTS.BACKLINK_NORMAL: {
                contentElem = await this.normalBackLinkElement(basicInfo);
                break;
            }
            default: {
                warnPush("BackLink（forward）配置项值错误", g_setting.showBackLinksType);
                break;
            }
        }
        if (contentElem == null) {
            contentElem = super.getContentElement(null);
            contentElem.appendChild(super.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        return contentElem;
    }
    static async normalBackLinkElement(basicInfo: IBasicInfo) {
        const result = this.getContentElement(null);
        // 处理不同排序方式
        const g_setting = getReadOnlyGSettings();
        let sqlStmt = `SELECT id, content FROM blocks WHERE id in (
            SELECT DISTINCT def_block_root_id FROM refs WHERE root_id = "${basicInfo.currentDocId}" LIMIT ${CONSTANTS.LINKS_LIMIT}
            ) AND type = "d" ` + this.linkSortTypeToFowardLinkSortSql(g_setting.sortForBackLink);
        let backlinkDocSqlResponse = await queryAPI(sqlStmt);
        debugPush("backlinkSQLResponse", backlinkDocSqlResponse);
        if (backlinkDocSqlResponse != null && backlinkDocSqlResponse.length > 0) {
            if (g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_ASC || g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_DESC) {
                backlinkDocSqlResponse = sortIFileWithNatural(backlinkDocSqlResponse.slice(), "content", g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_DESC);
                logPush("自然排序", backlinkDocSqlResponse);
            }
            for (let i = 0; i < backlinkDocSqlResponse.length; i++) {
                const oneBacklinkItem = backlinkDocSqlResponse[i];
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.content,
                    "name": oneBacklinkItem.content,
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                result.appendChild(this.docLinkGenerator(tempDocItem));
            }
        } else {
            return null;
        }
        return result;
    }
    static async docOnlyBackLinkElement(basicInfo: IBasicInfo) {
        const result = this.getContentElement(null);
        // 处理不同排序方式
        const g_setting = getReadOnlyGSettings();
        let sqlStmt = `SELECT id, content FROM blocks WHERE id in (
            SELECT DISTINCT def_block_root_id FROM refs WHERE root_id = "${basicInfo.currentDocId}" AND def_block_root_id = def_block_id LIMIT ${CONSTANTS.LINKS_LIMIT}
            )  AND type = "d" ` + this.linkSortTypeToFowardLinkSortSql(g_setting.sortForBackLink);
        let backlinkDocSqlResponse = await queryAPI(sqlStmt);
        debugPush("forwardlinkSQLResponse", backlinkDocSqlResponse);
        if (backlinkDocSqlResponse != null && backlinkDocSqlResponse.length > 0) {
            if (g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_ASC || g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_DESC) {
                backlinkDocSqlResponse = sortIFileWithNatural(backlinkDocSqlResponse.slice(), "content", g_setting.sortForBackLink == LINK_SORT_TYPES.NAME_NATURAL_DESC);
                logPush("自然排序", backlinkDocSqlResponse);
            }
            for (let i = 0; i < backlinkDocSqlResponse.length; i++) {
                const oneBacklinkItem = backlinkDocSqlResponse[i];
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.content,
                    "name": oneBacklinkItem.content,
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                result.appendChild(this.docLinkGenerator(tempDocItem));
            }
        } else {
            return null;
        }
        return result;
    }
}

class MoreOrLessPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.MORE_OR_LESS_CONTAINER_CLASS_NAME, null, null);
    }

    static async getMoreOrLessElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo, printerElemList: Array<any>
    ): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const result = super._getBasicElement(CONSTANTS.MORE_OR_LESS_CONTAINER_CLASS_NAME, null, null);
        const content = super.getContentElement([CONSTANTS.MORE_OR_LESS_CONTAINER_CLASS_NAME]);
        result.appendChild(content);
        const moreOrLess = document.createElement("span");
        content.appendChild(moreOrLess);
        // 默认状态处理
        if (protyleEnvInfo.originProtyle?.element?.querySelectorAll(".og-hn-more-less[data-og-hide-flag=false]").length > 0) {
            debugPush("MoreOrLessPrinter 生成时判定原内容区存在，且未折叠，更新后也调整为未折叠");
            result.dataset.ogHideFlag = "false";
            moreOrLess.innerHTML = lang("less");
        } else {
            result.dataset.ogHideFlag = "true";
            moreOrLess.innerHTML = lang("more");
            for (let i = g_setting.areaHideFrom - 1; i < printerElemList.length; i++) {
                printerElemList[i]?.element.classList.add(CONSTANTS.IS_FOLDING_CLASS_NAME);
            }
        }
        result.classList.add("og-hn-more-less");
        result.addEventListener("click", ()=>{
            const childrens = result.parentElement?.children ?? [];
            if (childrens.length <= 1) {
                debugPush("折叠展开判定错误，不存在任何内容区元素");
            }
            if (moreOrLess.innerHTML === lang("more")) {
                // 遍历移除 考虑到moreOrLess和move两个部分，所以相较于从0开始，以从1开始的再加1
                for (let i = g_setting.areaHideFrom + 1; i < childrens.length; i++) {
                    childrens[i].classList.remove(CONSTANTS.IS_FOLDING_CLASS_NAME);
                }
                moreOrLess.innerHTML = lang("less");
                result.dataset.ogHideFlag = "false";
            }else {
                // 遍历添加
                for (let i = g_setting.areaHideFrom + 1; i < childrens.length; i++) {
                    childrens[i].classList.add(CONSTANTS.IS_FOLDING_CLASS_NAME);
                }
                moreOrLess.innerHTML = lang("more");
                result.dataset.ogHideFlag = "true";
            }
        });
        result.dataset.ogContentType = PRINTER_NAME.MORE_OR_LESS;
        return result;
    }
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const contentElem = super.getContentElement(null);
        const moreOrLess = document.createElement("span");
        moreOrLess.innerHTML = lang("more_or_less");
        contentElem.appendChild(moreOrLess);
        //
        contentElem.classList.add("og-hn-more-less");
        contentElem.addEventListener("click", ()=>{
            const styleElem = document.getElementById(CONSTANTS.HIDE_COULD_FOLD_STYLE_ID);
            if (styleElem) {
                styleElem.remove();
            } else {
                setCouldHideStyle();
            }
        });
        contentElem.dataset.ogContentType = PRINTER_NAME.MORE_OR_LESS;
        return contentElem;
    }
    static async isOnlyOnce(basicInfo:IBasicInfo): Promise<boolean> {
        return false;
    }
}


class NeighborWithPreviewContentPrinter extends BasicContentPrinter {
    static async getWrappedBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        return await this.getBindedElement(basicInfo, protyleEnvInfo);
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        if (basicInfo.siblingDocLimited) {
            logPush("出于性能考虑，上一篇下一篇（相邻文档）在本文档不显示");
            return null;
        }
        await fillOneDocRelationOfBasicInfo(basicInfo, "allSiblingDocInfoList");
        const siblingDocs = basicInfo.allSiblingDocInfoList;
        // const result = this.getBasicElement(CONSTANTS.NEXT_CONTAINER_CLASS_NAME, null, lang("neighbor_nodes"), lang("neighbor_area"));
        const innerFlexElem = document.createElement("div");
        innerFlexElem.classList.add("og-hn-np-inner-flex");
        const result = document.createElement("div");
        let iCurrentDoc = -1;
        let previousDocInfo = null, nextDocInfo = null;
        for (let iSibling = 0; iSibling < siblingDocs.length; iSibling++) {
            if (siblingDocs[iSibling].id === basicInfo.currentDocId) {
                iCurrentDoc = iSibling;
                break;
            }
        }
        // 我们应该根据情况获取，如果是按照月构建的dailynote，同一笔记上可能有多个标签
        let minCurrentDate = Number.MAX_SAFE_INTEGER.toString(); // 向上跳转用
        let maxCurrentDate = "0";
        const protyle = protyleEnvInfo.originProtyle as IProtyle
        const ialObject = protyle.background?.ial;
        if (g_setting.previousAndNextFollowDailynote) {
            for (const key in ialObject) {
                if (key.startsWith("custom-dailynote-")) {
                    if (parseInt(ialObject[key]) > parseInt(maxCurrentDate)) {
                        maxCurrentDate = ialObject[key];
                    }
                    if (parseInt(ialObject[key]) < parseInt(minCurrentDate)) {
                        minCurrentDate = ialObject[key];
                    }
                }
            }
        }
        const dailynoteFlag = JSON.stringify(protyle.background?.ial)?.includes("custom-dailynote");
        const sortMode = getNotebookSortModeF(basicInfo.docBasicInfo.box);
        const sortByNameOrCreateTimeFlag = isSortByNameOrCreateTime(sortMode);
        const ascSortFlag = isSortAsc(sortMode);
        // #78 文档排序方式 升降序补充缺失的上一篇或下一篇；文件名、自然排序、创建时间排序以外的排序方式，不补充；
        if (iCurrentDoc >= 0 && siblingDocs.length >= 1) {
            let flag = false;
            // 上一篇
            if (dailynoteFlag 
                && (g_setting.previousAndNextFollowDailynote // 选项强制
                    || (iCurrentDoc <= 0 && sortByNameOrCreateTimeFlag)  // 第一篇且是按照名字或创建时间排序
                    )
                ) {
                let getNewer = false;
                if (!g_setting.previousAndNextFollowDailynote && !ascSortFlag) {
                    getNewer = true;
                }
                const thisDocInfo = await getNeighborDailyNoteDoc({ialObject: ialObject, docId: basicInfo.docBasicInfo.id, boxId: basicInfo.docBasicInfo.box, getNewer: getNewer});
                debugPush("日记组-上一篇", thisDocInfo);
                if (thisDocInfo) {
                    thisDocInfo["ogSimpleName"] = htmlTransferParser(thisDocInfo.name);
                    thisDocInfo["name"] = thisDocInfo.name;
                    if (g_setting.requestAllDocIcon && !isMobile()) {
                        const fullDocInfo = await getDocInfo(thisDocInfo.id);
                        thisDocInfo["icon"] = fullDocInfo.icon;
                        thisDocInfo["subFileCount"] = fullDocInfo.subFileCount;
                    }
                    previousDocInfo = thisDocInfo;
                    const oneLinkElem = super.docLinkGenerator(thisDocInfo);
                    flag = true;
                }
            } else if (iCurrentDoc > 0) {
                let simpleName = htmlTransferParser(siblingDocs[iCurrentDoc - 1]["name"]);
                let docInfo = Object.assign({}, siblingDocs[iCurrentDoc - 1]);
                docInfo["ogSimpleName"] = trimListDocsByPathAPIReturnedDocName(simpleName);
                previousDocInfo = docInfo;
                flag = true;
            }

            if (dailynoteFlag 
                && (g_setting.previousAndNextFollowDailynote
                     || (iCurrentDoc + 1 >= siblingDocs.length) && sortByNameOrCreateTimeFlag)
                    ) {
                let getNewer = true;
                if (!g_setting.previousAndNextFollowDailynote && !ascSortFlag) {
                    getNewer = false;
                }
                const thisDocInfo = await getNeighborDailyNoteDoc({ialObject: ialObject, docId: basicInfo.docBasicInfo.id, boxId: basicInfo.docBasicInfo.box, getNewer: getNewer});
                debugPush("日记组-下一篇", thisDocInfo);
                if (thisDocInfo) {
                    thisDocInfo["ogSimpleName"] = htmlTransferParser(thisDocInfo.name);
                    thisDocInfo["name"] = thisDocInfo.name;
                    if (g_setting.requestAllDocIcon && !isMobile()) {
                        const fullDocInfo = await getDocInfo(thisDocInfo.id);
                        thisDocInfo["icon"] = fullDocInfo.icon;
                        thisDocInfo["subFileCount"] = fullDocInfo.subFileCount;
                    }
                    nextDocInfo = thisDocInfo;
                    const oneLinkElem = super.docLinkGenerator(thisDocInfo);
                    flag = true;
                }
            } else if (iCurrentDoc + 1 < siblingDocs.length) {
                let simpleName = htmlTransferParser(siblingDocs[iCurrentDoc + 1]["name"]);
                let docInfo = Object.assign({}, siblingDocs[iCurrentDoc + 1]);
                docInfo["ogSimpleName"] = trimListDocsByPathAPIReturnedDocName(simpleName);
                nextDocInfo = docInfo;
                flag = true;
            }

            if (flag) {
                if (previousDocInfo) {
                    const content = await this.getDocContent(previousDocInfo["id"]);
                    innerFlexElem.appendChild(this.createNavPreview(previousDocInfo["id"], previousDocInfo["ogSimpleName"], content, true));
                } else {
                    innerFlexElem.appendChild(this.createPlaceholderPreview(true));
                }
                if (nextDocInfo) {
                    const content = await this.getDocContent(nextDocInfo["id"]);
                    innerFlexElem.appendChild(this.createNavPreview(nextDocInfo["id"], nextDocInfo["ogSimpleName"], content, false));
                } else {
                    innerFlexElem.appendChild(this.createPlaceholderPreview(false));
                }
                result.appendChild(innerFlexElem);
            } else {
                const noneElem = this.getNoneElement();
                result.appendChild(noneElem);
                result.classList.add(CONSTANTS.NONE_CLASS_NAME);
            }
        } else {
            const noneElem = this.getNoneElement();
            noneElem.title = lang("is_hidden_doc");
            result.appendChild(noneElem);
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        result.classList.add(CONSTANTS.NEXT_PREVIEW_CONSTAINER_CLASS_NAME);
        return result;
    }

    static async getDocContent(docId: string) {
        const previewContent = await exportMdContent({
            id: docId,
            refMode: 2,
            embedMode: 0,
            yfm: false
        });
        logPush("content", previewContent)
        let trimed = previewContent.content.substring(0, 3000);
        // 清理内容
        // 如果开启导出标题，需要在预览区域去除标题
        if (window.siyuan.config.export.addTitle) {
            const splitted = trimed.split("\n");
            trimed = splitted.slice(1).join('\n');
        }
        trimed = trimed.replace(new RegExp(`<iframe.*</iframe>`, "gm"), "");
        // 移除图片、链接，但保留alt
        trimed = trimed.replace(/!\[([^\]]+)\]\((.*?)\)/g, '[$1]');
        trimed = trimed.replace(/\[([^\]]+)\]\((.*?)\)/g, '$1');
        // trimed = trimed.replace(/!\[.*?\]\(.*?\)/g, '');
        return trimed;
    }
    static createNavPreview(id: string, title: string, content: string, isPrev: boolean, clickable: boolean=true): HTMLElement {
        let emptyFlag = isValidStr(title) && isValidStr(content);
        // 创建外层容器
        const navPreview = document.createElement('div');
        navPreview.className = `og-hn-np-nav-preview ${isPrev ? 'og-hn-np-prev' : 'og-hn-np-next'} ${clickable ? "refLinks" : "og-hn-np-non-clickable"}`;
        if (isValidStr(id)) {
            navPreview.setAttribute("data-id", id);
        }

        // 创建内部容器
        const inner = document.createElement('div');
        inner.className = 'og-hn-np-nav-preview-inner';
        
        // 创建方向指示
        const direction = document.createElement('div');
        direction.className = 'og-hn-np-nav-direction';
        direction.textContent = isPrev ? `< ${lang("previous_doc_v2")}` : `${lang("next_doc_v2")} >`;

        // 创建文章标题
        const titleElement = document.createElement('div');
        titleElement.className = 'og-hn-np-nav-post-title';
        titleElement.textContent = title;
        
        // 创建内容摘要
        const excerpt = document.createElement('div');
        excerpt.className = 'og-hn-np-nav-excerpt';
        excerpt.textContent = content;
        
        // 组装元素
        inner.appendChild(direction);
        inner.appendChild(titleElement);
        inner.appendChild(excerpt);
        navPreview.appendChild(inner);
        
        return navPreview;
    }

    /**
     * 创建空占位符导航预览元素
     * @param isPrev 是否为上一篇占位符
     * @returns 创建好的占位符元素
     */
    static createPlaceholderPreview(isPrev: boolean): HTMLElement {
        // if (!isPrev) return document.createElement('div'); // 只有上一篇可能有占位符
        const placeholder = this.createNavPreview('', '', '', isPrev, false);
        placeholder.querySelector('.og-hn-np-nav-preview-inner')?.classList.add('og-hn-np-placeholder');
        return placeholder;
    }
}

class PreviewBoxContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return null;
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        
        // 创建外层容器
        const container = document.createElement('div');
        container.className = 'og-hn-pb-container';
        
        if (basicInfo.subDocLimited) {
            logPush("文档数量过多，停止显示");
            return null;
        }
        // 获取子文档列表
        await fillOneDocRelationOfBasicInfo(basicInfo, "childDocInfoList");
        const directChildDocs = basicInfo.childDocInfoList;
        // await listDocsByPathT({
        //     notebook: basicInfo.docBasicInfo.box,
        //     path: basicInfo.docBasicInfo.path,
        //     g_setting.maxListCount,
        //     g_setting.sortBy,
        //     g_setting.showHiddenDocs
        // });

        // 处理每个子文档
        for (const childDoc of directChildDocs) {
            const docBox = document.createElement('div');
            docBox.className = 'og-hn-pb-doc-box ';
            docBox.setAttribute('data-id', childDoc.id);
            
            // 处理文档名
            let docName = childDoc.name;
            if (docName.endsWith('.sy')) {
                docName = trimListDocsByPathAPIReturnedDocName(docName);
            }
            
            // 添加emoji图标
            // const emojiSpan = document.createElement('span');
            // emojiSpan.className = 'og-hn-pb-emoji';
            // emojiSpan.innerHTML = 
            // docBox.appendChild(emojiSpan);
            
            // 添加标题
            const title = document.createElement('h4');
            title.className = 'og-hn-pb-title refLinks';
            title.setAttribute("data-id", childDoc.id);
            title.insertAdjacentHTML("afterbegin", this.getEmojiHtmlStr(childDoc.icon, childDoc.subFileCount > 0, g_setting) + docName);
            // title.textContent = docName;
            docBox.appendChild(title);
            
            // 获取预览内容
            const [previewText, isEmpty] = await this.generatePreview(childDoc.id);
            
            if (!isEmpty) {
                // 如果有内容，直接显示预览
                const contentDiv = document.createElement('div');
                contentDiv.className = 'og-hn-pb-content refLinks';
                contentDiv.setAttribute('data-id', childDoc.id);
                contentDiv.innerHTML = previewText;
                docBox.appendChild(contentDiv);
            } else {
                // 如果没有内容，显示子文档列表
                const subDocs = await this.generateSecond(
                    basicInfo.docBasicInfo.box,
                    childDoc.path,
                    g_setting.maxListCount,
                    g_setting.sortBy,
                    g_setting.showHiddenDocs
                );
                docBox.appendChild(subDocs);
            }
            
            container.appendChild(docBox);
        }
        
        return container;
    }

    static async generatePreview(docId: string): Promise<[string, boolean]> {

        const previewHtml = await getDocPreview(docId);
        const TRIM_THRESHOLD = 20000;
        
        // 处理过长的预览内容
        let trimmedHtml = previewHtml;
        if (previewHtml.length > TRIM_THRESHOLD) {
            const temp = previewHtml.substring(TRIM_THRESHOLD);
            const crIndex = temp.search("</p>");
            if (crIndex !== -1) {
                trimmedHtml = previewHtml.substring(0, TRIM_THRESHOLD + crIndex + 1);
                logPush("预览内容过长，强制截断了预览内容");
            }
        }
        
        // 清理HTML内容
        const cleanedHtml = this.cleanDocHtml(trimmedHtml);
        const removeSpacedHtml = cleanedHtml
            .replace(/&zwj;|&zwnj;|&thinsp;|&emsp;|&ensp;|&nbsp;/g, "")
            .replace(/<p[^>]*>[\u200d]*<\/p>/g, "")
            .replace(/ |\n/g, "");
        
        return [cleanedHtml, !isValidStr(removeSpacedHtml)];
    }

    static async generateSecond(notebook: string, docPath: string, maxListCount: number, sortBy: string, showHidden: boolean): Promise<HTMLElement> {
        const container = document.createElement('div');
        container.className = 'og-hn-pb-child-container';
        const g_setting = getReadOnlyGSettings();
        
        const childDocs = await listDocsByPathT({notebook, path: docPath, maxListCount, sort: sortBy, showHidden});
        
        for (const childDoc of childDocs) {
            let docName = childDoc.name;
            if (docName.endsWith('.sy')) {
                docName = trimListDocsByPathAPIReturnedDocName(docName);
            }
            
            const docItem = document.createElement('p');
            docItem.className = 'og-hn-pb-child-item refLinks';
            docItem.setAttribute('data-id', childDoc.id);
            
            const docLink = document.createElement('span');
            docLink.className = 'og-hn-pb-child-link ';
            // docLink.setAttribute('data-type', 'block-ref');
            // docLink.setAttribute('data-subtype', 'd');
            // docLink.setAttribute('data-id', childDoc.id);
            
            docLink.innerHTML = this.getEmojiHtmlStr(childDoc.icon, childDoc.subFileCount > 0, g_setting);
            
            docLink.appendChild(document.createTextNode(docName));
            docItem.appendChild(docLink);
            container.appendChild(docItem);
        }
        
        return container;
    }

    static cleanDocHtml(text: string): string {
        // 创建临时容器
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // 移除iframe
        const iframes = tempDiv.querySelectorAll('.iframe');
        iframes.forEach(iframe => iframe.remove());
        
        // 如果需要导出标题，移除第一个h1
        if (window.top.siyuan.config.export.addTitle) {
            const h1Elements = tempDiv.querySelectorAll('h1');
            if (h1Elements.length > 0) {
                h1Elements[0].remove();
            }
        }
        
        // 处理emoji图标
        const emojis = tempDiv.querySelectorAll('.emoji');
        emojis.forEach(emoji => emoji.classList.add('iconpic'));
        
        // 移除空段落
        const paragraphs = tempDiv.querySelectorAll('p');
        paragraphs.forEach(p => {
            if (!p.innerHTML.trim() || p.innerHTML === String.fromCharCode(0x200d)) {
                p.remove();
            }
        });
        
        // 处理图片路径
        const images = tempDiv.querySelectorAll('img');
        images.forEach(img => {
            let path = img.getAttribute('src') || '';
            path = path.replace(/http(s)*:\/\/[^\/]*\/widgets\/listChildDocs(-dev)*/, '');
            img.setAttribute('src', path);
        });

        // 处理A标签
        const links = tempDiv.querySelectorAll('a');
        links.forEach(a => {
            // 创建文本节点替换a标签
            const textNode = document.createTextNode(a.textContent || '');
            a.parentNode?.replaceChild(textNode, a);
        });

        // 将h1-h5标题转换为加粗文本
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5');
        headings.forEach(heading => {
            const bold = document.createElement('strong');
            bold.textContent = heading.textContent;
            heading.parentNode?.replaceChild(bold, heading);
        });
        
        // 删除所有input节点
        const inputs = tempDiv.querySelectorAll('input');
        inputs.forEach(input => input.remove());
        
        return tempDiv.innerHTML;
    }
}

class ParentSiblingContentPrinter extends BasicContentPrinter {
    static async getBasicElement(): Promise<HTMLElement> {
        return super._getBasicElement(CONSTANTS.PARENT_SIBLING_CONTAINER_ID, lang("parent_sibling_nodes"), lang("parent_sibling_area"));
    }

    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        
        const contentElem = super.getContentElement(null);

        if (basicInfo.siblingDocLimited) {
            logPush("出于性能考虑，父级文档的同级文档将不再显示");
            return null;
        }
        if (basicInfo.docBasicInfo == null || basicInfo.parentDocBasicInfo == null) {
            contentElem.appendChild(super.getNoneElement());
            contentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            logPush("ParentSiblingContentPrinter 基本信息", basicInfo);
            const parentSiblings = await getUserDemandSiblingDocuments(basicInfo.parentDocBasicInfo.path, basicInfo.parentDocBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc);
            const count = parentSiblings.length;
            contentElem.dataset.ogIndicatorTitle = lang("number_count").replace("%NUM%", count.toString());
            // 循环生成文档链接
            const list = parentSiblings;
            for (let i = 0; i < list.length && (g_setting.docMaxNum === 0 || i < g_setting.docMaxNum); i++) {
                const doc = list[i];
                const oneLinkElem = this.docLinkGenerator(doc);

                // 高亮当前文档的父级（如果需要，或者高亮与当前路径相关的节点）
                if (doc.id === basicInfo.parentDocBasicInfo.id) {
                    oneLinkElem.classList.add("og-hn-docLinksWrapper-hl");
                }
                contentElem.appendChild(oneLinkElem);
            }
        }
        return contentElem;
    }
}
