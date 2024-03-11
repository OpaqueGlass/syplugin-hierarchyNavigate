import { CONSTANTS, PRINTER_NAME } from "@/constants";
import { lang } from "@/utils/lang";
import { getBackLink2T, getBlockBreadcrumb, getDocInfo, getNotebookInfoLocallyF, isMobile, queryAPI } from "@/syapi"
import { getChildDocuments, getChildDocumentsWordCount, isChildDocExist, isDocEmpty, isDocHasAv } from "@/syapi/custom";
import { getGSettings, getReadOnlyGSettings } from "@/manager/settingManager";
import { isValidStr } from "@/utils/commonCheck";
import { debugPush, errorPush, logPush, warnPush } from "@/logger";
import { openRefLink } from "@/utils/common";
import { IProtyle, Menu } from "siyuan";
import { getUserDemandSiblingDocuments } from "./commonProvider";
import { htmlTransferParser } from "@/utils/onlyThisUtil";

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
    }
    
    constructor(basicInfo:IBasicInfo, protyleBasicInfo:IProtyleEnvInfo) {
        this.basicInfo = basicInfo;
        this.protyleBasicInfo = protyleBasicInfo;
    }
    // 考虑到部分Printer还是需要自己判断状态，这里async
    async print():Promise<IAllPrinterResult> {
        
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
        if (this.basicInfo.docSqlResult.ial?.includes("og-hn-ignore") || this.basicInfo.docSqlResult.ial?.includes("og文档导航忽略")) {
            return null;
        }
        // doc覆盖
        if (this.basicInfo.currentDocAttrs["custom-og-hn-content"]) {
            try {
                docContentKeyGroup = JSON.parse(this.basicInfo.currentDocAttrs["custom-og-hn-content"]);
            } catch(e) {
                logPush("用户自定义顺序读取失败", e);
            }
        }
        if (this.protyleBasicInfo.flashCard) {
            docContentKeyGroup = g_setting.flashcardContentGroup;
        }
        debugPush("docContentKeyGroup", docContentKeyGroup);
        debugPush("g_setting", g_setting);
        // 获取文档信息
        const promises = [];
        for (const printerName of docContentKeyGroup) {
            const printer = this.printerList[printerName];
    
            if (printer) {
                promises.push(
                    // https://developer.mozilla.org/zh-CN/docs/Glossary/IIFE
                    (async () => {
                        const printerResult = await printer.getBindedElement(this.basicInfo, this.protyleBasicInfo);
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
    //TODO: 修饰符还有顺序？！java有吗？没关注过
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
     * 获取基础对象
     * @param uniqueClassName 基础对象独立类名
     * @param classNames 附加类名，如果不传该参数，默认添加多行与container容器类名
     * @param indicatorLang 区域提示词
     * @returns HTMLElement
     */
    static getBasicElement(uniqueClassName: string, classNames: string[], indicatorLang?: string):HTMLElement {
        const contentElem = document.createElement("div");
        // 这里有点重复，看看再说
        contentElem.classList.add(uniqueClassName);
        if (classNames) {
            for (const className of classNames) {
                contentElem.classList.add(className);
            }
        } else {
            contentElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME, CONSTANTS.CONTAINER_MULTILINE_STYLE_CLASS_NAME);
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

    //TODO: 请注意，传入的doc.name应当包含.sy后缀（即IFile类型原始值），本函数会进行处理！
    //TODO: 样式有问题
    static docLinkGenerator(doc:IDocLinkGenerateInfo) {
        let g_setting = getReadOnlyGSettings();
        let emojiStr = this.getEmojiHtmlStr(doc.icon, doc?.subFileCount != 0, g_setting);
        // TODO: 这里需要区分doc.content 和 doc.name，或者，传入前就将doc.name加入.sy后缀

        let docName = isValidStr(doc?.name) ? doc.name.substring(0, doc.name.length - 3) : doc.content;
        docName = htmlTransferParser(docName);
        // docName = Lute.EscapeHTMLStr(docName);
        let trimDocName = docName;
        if (doc["ogSimpleName"]) {
            trimDocName = doc["ogSimpleName"];
        }
        // 文件名长度限制
        if (docName.length > g_setting.nameMaxLength && g_setting.nameMaxLength != 0) trimDocName = trimDocName.substring(0, g_setting.nameMaxLength) + "...";

        let result = document.createElement("span");
        result.classList.add("refLinks", "docLinksWrapper");
        if (g_setting.docLinkClass) {
            result.classList.add(escapeClass(g_setting.docLinkClass));
        }
        result.dataset["subtype"] = "d";
        result.dataset["id"] = doc.id;
        result.title = docName;

        // result.style.fontSize = `${g_setting.fontSize}px`;
        const emojiAndName = document.createElement("span");
        emojiAndName.classList.add("og-hn-emoji-and-name");

        // 触发浮窗用icon element
        const emojiHoverElem = document.createElement("span");
        emojiHoverElem.dataset["type"] = "block-ref";
        emojiHoverElem.dataset["subtype"] = "d";
        emojiHoverElem.dataset["id"] = doc.id;
        emojiHoverElem.innerHTML = emojiStr;

        // 格式化后的文件名Elem
        const trimedDocNameElem = document.createElement("span");
        trimedDocNameElem.classList.add("trimDocName");
        trimedDocNameElem.innerText = trimDocName;

        switch (g_setting.popupWindow) {
            case CONSTANTS.POP_ALL: {
                result.dataset["type"] = "block-ref";
                emojiAndName.innerHTML = emojiStr;
                break;
            }
            case CONSTANTS.POP_LIMIT: {
                emojiAndName.appendChild(emojiHoverElem);
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

    //TODO: 请注意，Constants.icon_none相关将被修改为语义化结果（例如"none"值）需要setting那边转换，也需要修改CONSTANTS
    static getEmojiHtmlStr(iconString:string, hasChild:boolean, g_setting:any) {
        if (g_setting.icon == CONSTANTS.ICON_NONE) return g_setting.linkDivider;
        // 无emoji的处理
        if ((!isValidStr(iconString)) && g_setting.icon == CONSTANTS.ICON_ALL) return hasChild ? "📑" : "📄";//无icon默认值
        if (!isValidStr(iconString)) return g_setting.linkDivider;
        let result = iconString;
        // emoji地址判断逻辑为出现.，但请注意之后的补全
        if (iconString.indexOf(".") != -1) {
            result = `<img class="iconpic" style="width: ${g_setting.fontSize}px" src="/emojis/${iconString}"/>`;
        } else {
            result = `<span class="emojitext">${emojiIconHandler(iconString, hasChild)}</span>`;
        }
        return result;
        function emojiIconHandler(iconString:string, hasChild = false) {
            //确定是emojiIcon 再调用，printer自己加判断
            try {
                let result = "";
                iconString.split("-").forEach(element => {
                    //TODO: 确定是否正常
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
}

class DocInfoContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        // 请求总字数
        const totalWords = await getChildDocumentsWordCount(basicInfo.currentDocId);
        let thisDocInfos = null;
        // 检索兄弟文档
        for (const sibling of basicInfo.allSiblingDocInfoList) {
            if (sibling.id == basicInfo.currentDocId) {
                thisDocInfos = sibling;
                break;
            }
        }
        let result = document.createElement("div");
        result.classList.add(CONSTANTS.INFO_CONTAINER_CLASS);
        // firstLineElem.style.cssText = CONTAINER_STYLE;
        let box = getNotebookInfoLocallyF(basicInfo.docSqlResult.box);
        
        let infoElemInnerText = `<span class="og-hn-create-at-wrapper">
            <span class="og-hn-create-at-indicator">${lang("create_at")}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hCtime"]}</span>
        </span>
        <span class="og-hn-modify-at-wrapper">
            <span class="og-hn-modify-at-indicator">${lang("update_at")}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hMtime"]}</span>
        </span>
        <span class="og-hn-child-doc-count-wrapper">
        ${lang("child_count").replace("%NUM%", `<span class="og-hn-child-doc-count-content">${basicInfo.childDocInfoList.length}</span>`)} 
        </span>
        ${basicInfo.childDocInfoList.length == 0 ? "" : 
        `<span class="og-hn-child-word-count-wrapper">
            <span class="og-hn-child-word-count-indicator">${lang("child_word_count")}</span> 
            <span class="og-hn-child-word-count-content">${totalWords}</span>
        </span>`}
        
        <span class="og-hn-notebook-wrapper">
            ${box.name}
        </span>
        `;
        result.innerHTML = infoElemInnerText;
        return result;
    }
}

class ParentContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const result = super.getBasicElement(CONSTANTS.PARENT_CONTAINER_ID, null, lang("parent_nodes"));
        if (basicInfo.parentDocSqlResult == null) {
            const g_setting = getReadOnlyGSettings();
            // 历史兼容选项，当没有父文档时，将显示兄弟文档
            if (g_setting.sibling) {
                return await SiblingContentPrinter.getBindedElement(basicInfo, protyleEnvInfo);
            }
            result.appendChild(super.getNoneElement());
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            result.appendChild(this.docLinkGenerator(basicInfo.parentDocSqlResult));
        }
        logPush("parentAreaOutput", result);
        return result;
    }
}

class SiblingContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const result = super.getBasicElement(CONSTANTS.SIBLING_CONTAINER_ID, null, lang("sibling_nodes"));
        if (result.children.length > 0 && result.children[0].classList.contains(CONSTANTS.INDICATOR_CLASS_NAME)) {
            result.children[0].setAttribute("title", lang("number_count").replace("%NUM%", basicInfo.userDemandSiblingDocInfoList.length));
        }
        if (basicInfo.userDemandSiblingDocInfoList.length == 0) {
            result.appendChild(super.getNoneElement());
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
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
                result.appendChild(oneLinkElem);
            }
        }
        return result;
    }
}

// IDEA: 或者我们把不同的决策设置为一个新的Printer，比如自动换成widget的话，一个AutoChild 然后判断再调用 Widget/Child
class ChildContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo:IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const result = super.getBasicElement(CONSTANTS.CHILD_CONTAINER_ID, null, lang("child_nodes"));
        if (g_setting.noChildIfHasAv && await isDocHasAv(basicInfo.currentDocId)) {
            logPush("文档中含有数据库，不显示子文档区域");
            return null;
        }

        if (result.children.length > 0 && result.children[0].classList.contains(CONSTANTS.INDICATOR_CLASS_NAME)) {
            result.children[0].setAttribute("title", lang("number_count").replace("%NUM%", basicInfo.childDocInfoList.length));
        }
        if (basicInfo.childDocInfoList.length == 0) {
            result.appendChild(super.getNoneElement());
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            for (let i = 0; i < basicInfo.childDocInfoList.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
                let doc = basicInfo.childDocInfoList[i];
                const oneLinkElem = super.docLinkGenerator(doc);
                result.appendChild(oneLinkElem);
            }
        }
        return result;
    }
}

class BreadcrumbContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        // 没有前置缩进，不加入multiline样式
        const result = super.getBasicElement(CONSTANTS.BREADCRUMB_CONTAINER_CLASS_NAME, [CONSTANTS.CONTAINER_CLASS_NAME], null);
        // 这里嵌套了一层element……是因为原来用的parent下插入的面包屑，暂时保持一致
        const breadcrumbElem = await this.generateBreadCrumb(basicInfo);
        result.appendChild(breadcrumbElem);

        // 绑定 > 点击事件
        result.querySelectorAll(`.og-fake-breadcrumb-arrow-span[data-type="FILE"], .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"]`).forEach((elem) => {
            elem.addEventListener("click", this.openRelativeMenu)
        });
        return result;
    }
    static async generateBreadCrumb(basicInfo:IBasicInfo) {
        const pathObject = await this.parseDocPath(basicInfo.docSqlResult);
        const breadcrumbElem = await this.generateBreadCrumbElement(pathObject);
        return breadcrumbElem;
    }
    static async parseDocPath(docDetail) {
        let pathArray = docDetail.path.substring(0, docDetail.path.length - 3).split("/");
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
            "subFileCount": 999
        }
        resultArray.push(temp);
        let tempPath = "";
        // slice(start, end) 起始start，终止end(不含)
        const docInfoPromises = pathArray.slice(1).map(async (pathSegment) => {
            const docInfoResult = await getDocInfo(pathSegment);
            docInfoResult["box"] = box.id;
            docInfoResult["path"] = `${tempPath}/${pathSegment}.sy`;
            docInfoResult["type"] = "FILE";
            docInfoResult["name"] = `${docInfoResult["name"]}.sy`;
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

        const divideArrow = `<span class="og-fake-breadcrumb-arrow-span" data-type="%4%" data-parent-id="%5%"><svg class="${CONSTANTS.ARROW_CLASS_NAME}"
            data-type="%4%" data-parent-id="%5%">
            <use xlink:href="#iconRight"></use></svg></span>`;
        // oneItm换用docLinkGenerator生成链接
        for (let i = 0; i < pathObjects.length; i++) {
            let onePathObject = pathObjects[i];
            if (i != 0) { // 这里排除了Notebook节点
                result.appendChild(this.docLinkGenerator(pathObjects[i]));
            }
            if (i == pathObjects.length - 1 && !await isChildDocExist(onePathObject.id)) {
                continue;
            }
            result.insertAdjacentHTML("beforeend", divideArrow
                .replaceAll("%4%", onePathObject.type)
                .replaceAll("%5%", pathObjects[i].id));
        }
        return result;
    }
    static async openRelativeMenu(event) {
        const g_setting = getReadOnlyGSettings();
        let id = event.currentTarget.getAttribute("data-parent-id");
        let rect = event.currentTarget.getBoundingClientRect();
        event.stopPropagation();
        event.preventDefault();
        let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = '${id}'`);
        if (sqlResult.length == 0) {
            sqlResult = [{
                path: "/",
                box: id
            }];
        }
        let siblings = await getChildDocuments(sqlResult[0], g_setting);
        if (siblings.length <= 0) return;
        const tempMenu = new Menu("newMenu");
        for (let i = 0; i < siblings.length; i++) {
            let currSibling = siblings[i];
            currSibling.name = currSibling.name.substring(0, currSibling.name.length - 3);
            let trimedName = currSibling.name.length > g_setting.nameMaxLength ? 
                currSibling.name.substring(0, g_setting.nameMaxLength) + "..."
                : currSibling.name;
            let tempMenuItemObj = {
                label: `<span class="${CONSTANTS.MENU_ITEM_CLASS_NAME}" 
                    data-doc-id="${currSibling.id}"
                    title="${currSibling.name}">
                    ${trimedName}
                </span>`,
                click: (event)=>{
                    debugPush("menu clickEvent", event);
                    let docId = event.querySelector("[data-doc-id]")?.getAttribute("data-doc-id")
                    openRefLink(undefined, docId, {
                        ctrlKey: event?.ctrlKey,
                        shiftKey: event?.shiftKey,
                        altKey: event?.altKey});
                }
            }
            if (currSibling.icon != "" && currSibling.icon.indexOf(".") == -1) {
                tempMenuItemObj["icon"] = `icon-${currSibling.icon}`;
            }
            tempMenu.addItem(tempMenuItemObj);
        }
    
        tempMenu.open({x: rect.left, y: rect.bottom, isLeft:false}); 
    }
}

class BackLinkContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        let result = null;
        switch (g_setting.showBackLinksType) {
            case CONSTANTS.BACKLINK_DOC_ONLY: {
                result = await this.docOnlyBackLinkElement(basicInfo);
                break;
            }
            case CONSTANTS.BACKLINK_NORMAL: {
                result = await this.normalBackLinkElement(basicInfo);
                break;
            }
            default: {
                warnPush("BackLink配置项值错误", g_setting.showBackLinksType);
                break;
            }
        }
        if (result == null) {
            result = super.getBasicElement(CONSTANTS.BACKLINK_CONTAINER_CLASS_NAME, null, lang("backlink_nodes"));
            result.appendChild(super.getNoneElement());
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        return result;
    }
    static async normalBackLinkElement(basicInfo: IBasicInfo) {
        const result = this.getBasicElement(CONSTANTS.BACKLINK_CONTAINER_CLASS_NAME, null, lang("backlink_nodes"));
        const backlinkResponse = await getBackLink2T(basicInfo.currentDocId);
        debugPush("backlinkResponse", backlinkResponse);
        if (backlinkResponse.backlinks.length == 0) {
            return null;
        }
        for (let i = 0; i < backlinkResponse.backlinks.length; i++) {
            const oneBacklinkItem = backlinkResponse.backlinks[i];
            if (oneBacklinkItem.nodeType === "NodeDocument") {
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.name,
                    "name": oneBacklinkItem.name + ".sy",
                    "icon": "",
                    "id": oneBacklinkItem.id,
                    "alias": "",
                    "path": "",
                };
                result.appendChild(this.docLinkGenerator(tempDocItem));
            }
        }
        return result;
    }
    static async docOnlyBackLinkElement(basicInfo: IBasicInfo) {
        const result = this.getBasicElement(CONSTANTS.BACKLINK_CONTAINER_CLASS_NAME, null, lang("backlink_nodes"));
        const backlinkDocSqlResponse = await queryAPI(`SELECT id, content FROM blocks WHERE id in (
            SELECT DISTINCT root_id FROM refs WHERE def_block_id = "${basicInfo.currentDocId}"
            ) AND type = "d" ORDER BY updated DESC;`);
        debugPush("backlinkSQLResponse", backlinkDocSqlResponse);
        if (backlinkDocSqlResponse != null && backlinkDocSqlResponse.length > 0) {
            for (let i = 0; i < backlinkDocSqlResponse.length; i++) {
                const oneBacklinkItem = backlinkDocSqlResponse[i];
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.content,
                    "name": oneBacklinkItem.content + ".sy",
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

class NeighborContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const siblingDocs = await getUserDemandSiblingDocuments(basicInfo.parentDocSqlResult, basicInfo.docSqlResult, undefined, g_setting.previousAndNextHiddenDoc);//basicInfo.allSiblingDocInfoList;
        const result = this.getBasicElement(CONSTANTS.NEXT_CONTAINER_CLASS_NAME, null, lang("neighbor_nodes"));
        let iCurrentDoc = -1;
        let previousElem = null, nextElem = null;
        for (let iSibling = 0; iSibling < siblingDocs.length; iSibling++) {
            if (siblingDocs[iSibling].id === basicInfo.currentDocId) {
                iCurrentDoc = iSibling;
                break;
            }
        }
        if (iCurrentDoc >= 0) {
            let flag = false;
            if (iCurrentDoc > 0) {
                let simpleName = lang("previous_doc") + htmlTransferParser(siblingDocs[iCurrentDoc - 1]["name"]);
                let docInfo = Object.assign({}, siblingDocs[iCurrentDoc - 1]);
                docInfo["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                previousElem = this.docLinkGenerator(docInfo);
                flag = true;
            }
            if (iCurrentDoc + 1 < siblingDocs.length) {
                let simpleName = lang("next_doc") + htmlTransferParser(siblingDocs[iCurrentDoc + 1]["name"]);
                let docInfo = Object.assign({}, siblingDocs[iCurrentDoc + 1]);
                docInfo["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                nextElem = this.docLinkGenerator(docInfo);
                flag = true;
            }
            if (flag) {
                if (previousElem) {
                    result.appendChild(previousElem);
                }
                if (nextElem) {
                    result.appendChild(nextElem);
                }
                result.classList.add(CONSTANTS.NEXT_CONTAINER_CLASS_NAME);
            }
        } else {
            const noneElem = this.getNoneElement();
            noneElem.title = lang("is_hidden_doc");
            result.appendChild(noneElem);
        }
        return result;
    }
}

// TODO: 有个问题，widget不应该走切换页签的刷新吧，这个加载太慢；可能要applyer做其他实现
class WidgetContentPrinter extends BasicContentPrinter {
    static isDoNotUpdate = true;
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        if (g_setting.noChildIfHasAv && await isDocHasAv(basicInfo.currentDocId)) {
            logPush("文档中含有数据库，不显示子文档区域");
            return null;
        }
        if (g_setting.lcdEmptyDocThreshold >= 0 && !await isDocEmpty(basicInfo.currentDocId, g_setting.lcdEmptyDocThreshold)) {
            this.isDoNotUpdate = false;
            return await ChildContentPrinter.getBindedElement(basicInfo, protyleEnvInfo);
        }
        this.isDoNotUpdate = true;
        const result = document.createElement("div");
        result.classList.add("og-hn-widget-container");
        result.innerHTML = `<iframe src="/widgets/listChildDocs" data-subtype="widget" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; height: ${(window.screen.availWidth - 75) > 350 ? 350 : (window.screen.availWidth - 75)}px;" data-doc-id="${basicInfo.currentDocId}"></iframe>`;
        return result;
    }
    static async isOnlyOnce(basicInfo: IBasicInfo): Promise<boolean> {
        return this.isDoNotUpdate;    
    }
}


class BlockTitleBreadcrumbContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo: IBasicInfo, protyleEnvInfo: IProtyleEnvInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        debugPush("isMobile", isMobile(), g_setting.hideBlockBreadceumbInDesktop);
        if (!isMobile() && g_setting.hideBlockBreadcrumbInDesktop) {
            return null;
        }
        // 没有前置缩进，不加入multiline样式
        const result = super.getBasicElement(CONSTANTS.BREADCRUMB_CONTAINER_CLASS_NAME, [CONSTANTS.CONTAINER_CLASS_NAME], null);
        // 这里嵌套了一层element……是因为原来用的parent下插入的面包屑，暂时保持一致
        const breadcrumbElem = await this.generateBreadCrumb(basicInfo, protyleEnvInfo);
        if (!breadcrumbElem) {
            return null;
        }
        result.appendChild(breadcrumbElem);

        // 绑定 > 点击事件
        // result.querySelectorAll(`.og-fake-breadcrumb-arrow-span[data-type="FILE"], .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"]`).forEach((elem) => {
        //     elem.addEventListener("click", this.openRelativeMenu)
        // });
        return result;
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
                "name": block.name + ".sy",
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