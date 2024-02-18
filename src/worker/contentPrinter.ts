import { CONSTANTS } from "@/constants";
import { lang } from "@/utils/lang";
import { getBackLink2T, getDocInfo, getNotebookInfoLocallyF, queryAPI } from "@/syapi"
import { getChildDocuments, getChildDocumentsWordCount, isChildDocExist } from "@/syapi/custom";
import { getGSettings, getReadOnlyGSettings } from "@/manager/settingManager";
import { isValidStr } from "@/utils/commonCheck";
import { debugPush, logPush, warnPush } from "@/logger";
import { openRefLink } from "@/utils/common";
import { Menu } from "siyuan";

export default class ContentPrinter {
    private basicInfo: IBasicInfo;
    private protyleBasicInfo: IProtyleEnvInfo;
    
    constructor(basicInfo:IBasicInfo, protyleBasicInfo:IProtyleEnvInfo) {
        this.basicInfo = basicInfo;
        this.protyleBasicInfo = protyleBasicInfo;
    }
    // 考虑到部分Printer还是需要自己判断状态，这里async
    async print():Promise<HTMLElement> {
        const result = document.createElement("div");
        result.classList.add("og-hn-heading-docs-container");
        // 这里依次填入各个部分
        // TODO: 后续扩展为按照顺序添加
        result.appendChild(await DocInfoContentPrinter.getBindedElement(this.basicInfo));
        result.appendChild(await BreadcrumbContentPrinter.getBindedElement(this.basicInfo));
        result.appendChild(await ParentContentPrinter.getBindedElement(this.basicInfo));
        result.appendChild(await SiblingContentPrinter.getBindedElement(this.basicInfo));
        result.appendChild(await NeighborContentPrinter.getBindedElement(this.basicInfo));
        // 反向链接
        result.appendChild(await BackLinkContentPrinter.getBindedElement(this.basicInfo));
        result.appendChild(await ChildContentPrinter.getBindedElement(this.basicInfo));
        result.appendChild(await WidgetContentPrinter.getBindedElement(this.basicInfo));
        return result;
    }
}


class BasicContentPrinter {
    private basicInfo:IBasicInfo;
    constructor(basicInfo:IBasicInfo) {
        this.basicInfo = basicInfo;
    }
    //TODO: 修饰符还有顺序？！java有吗？没关注过
    static async getBindedElement(basicInfo:IBasicInfo): Promise<HTMLElement> {
        throw new Error("需子类覆盖实现");
    }

    static bindAction(element:HTMLElement): HTMLElement {
        //TODO: 基本的点击链接绑定
        return element;
    }
    
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
        if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_ALL) return hasChild ? "📑" : "📄";//无icon默认值
        if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_CUSTOM_ONLY) return g_setting.linkDivider;
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
                    result += String.fromCodePoint(Number("0x" + element));
                });
                return result;
            } catch (err) {
                console.error("emoji处理时发生错误", iconString, err);
                return hasChild ? "📑" : "📄";
            }
        }
    }
}

class DocInfoContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo:IBasicInfo): Promise<HTMLElement> {
        // 请求总字数
        const totalWords = await getChildDocumentsWordCount(basicInfo.currentDocId);
        let thisDocInfos = null;
        // 检索兄弟文档
        for (const sibling of basicInfo.siblingDocInfoList) {
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
    static async getBindedElement(basicInfo:IBasicInfo): Promise<HTMLElement> {
        const result = super.getBasicElement(CONSTANTS.PARENT_CONTAINER_ID, null, lang("parent_nodes"));
        if (basicInfo.parentDocSqlResult == null) {
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
    static async getBindedElement(basicInfo:IBasicInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const result = super.getBasicElement(CONSTANTS.SIBLING_CONTAINER_ID, null, lang("sibling_nodes"));
        if (basicInfo.siblingDocInfoList.length == 0) {
            result.appendChild(super.getNoneElement());
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            for (let i = 0; i < basicInfo.siblingDocInfoList.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
                let doc = basicInfo.siblingDocInfoList[i];
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
    static async getBindedElement(basicInfo:IBasicInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        const result = super.getBasicElement(CONSTANTS.CHILD_CONTAINER_ID, null, lang("child_nodes"));
        if (basicInfo.childDocInfoList.length == 0) {
            result.appendChild(super.getNoneElement());
            result.classList.add(CONSTANTS.NONE_CLASS_NAME);
        } else {
            for (let i = 0; i < basicInfo.childDocInfoList.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
                let doc = basicInfo.childDocInfoList[i];
                const oneLinkElem = this.docLinkGenerator(doc);
                result.appendChild(oneLinkElem);
            }
        }
        return result;
    }
}

class BreadcrumbContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo: IBasicInfo): Promise<HTMLElement> {
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
        let temp_path = "";
        for (let i = 1; i < pathArray.length; i++) {
            let docInfoResult = await getDocInfo(pathArray[i]);
            debugPush("docInfo", docInfoResult);
            docInfoResult["box"] = box.id; 
            docInfoResult["path"] = `${temp_path}/${pathArray[i]}.sy`;
            docInfoResult["type"] = "FILE";
            docInfoResult["name"] = docInfoResult["name"] + ".sy";
            temp_path += "/" + pathArray[i];
            resultArray.push(docInfoResult);
        }
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
    static async getBindedElement(basicInfo: IBasicInfo): Promise<HTMLElement> {
        const g_setting = getReadOnlyGSettings();
        let result = null;
        switch (g_setting.showBackLinksArea) {
            case CONSTANTS.BACKLINK_DOC_ONLY: {
                result = await this.docOnlyBackLinkElement(basicInfo);
                break;
            }
            case CONSTANTS.BACKLINK_NORMAL: {
                result = await this.normalBackLinkElement(basicInfo);
                break;
            }
            default: {
                warnPush("BackLink配置项值错误", g_setting.showBackLinksArea);
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
    static async getBindedElement(basicInfo: IBasicInfo): Promise<HTMLElement> {
        const siblingDoc = basicInfo.siblingDocInfoList;
        const result = this.getBasicElement(CONSTANTS.NEXT_CONTAINER_CLASS_NAME, null, lang("neighbor_nodes"));
        let iCurrentDoc = -1;
        let previousElem = null, nextElem = null;
        for (let iSibling = 0; iSibling < basicInfo.siblingDocInfoList.length; iSibling++) {
            if (siblingDoc[iSibling].id === basicInfo.currentDocId) {
                iCurrentDoc = iSibling;
                break;
            }
        }
        if (iCurrentDoc >= 0) {
            let flag = false;
            if (iCurrentDoc > 0) {
                let simpleName = lang("previous_doc") + siblingDoc[iCurrentDoc - 1]["name"];
                let docInfo = Object.assign({}, siblingDoc[iCurrentDoc - 1]);
                docInfo["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                previousElem = this.docLinkGenerator(docInfo);
                flag = true;
            }
            if (iCurrentDoc + 1 < siblingDoc.length) {
                let simpleName = lang("next_doc") + siblingDoc[iCurrentDoc + 1]["name"];
                let docInfo = Object.assign({}, siblingDoc[iCurrentDoc + 1]);
                docInfo["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                nextElem = this.docLinkGenerator(docInfo);
                flag = true;
            }
            if (flag) {
                if (previousElem) {
                    result.appendChild(previousElem);
                }
                if (result) {
                    result.appendChild(nextElem);
                }
                result.classList.add(CONSTANTS.NEXT_CONTAINER_CLASS_NAME);
            }
        } else {
            
        }
        return result;
    }
}

// TODO: 有个问题，widget不应该走切换页签的刷新吧，这个加载太慢；可能要applyer做其他实现
class WidgetContentPrinter extends BasicContentPrinter {
    static async getBindedElement(basicInfo: IBasicInfo): Promise<HTMLElement> {
        const result = document.createElement("div");
        result.classList.add("og-hn-widget-container");
        result.innerHTML = `<iframe src="/widgets/listChildDocs" data-subtype="widget" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; height: ${window.screen.availWidth - 75}px;"></iframe>`;
        return result;
    }
}

async function generateText(parentDoc, childDoc, siblingDoc, docId, totalWords, docSqlResult, widgetMode) {
    const CONTAINER_STYLE = ``;
    let htmlElem = document.createElement("div");
    htmlElem.classList.add("og-hn-heading-docs-container");
    htmlElem.style.fontSize = `${g_setting.fontSize}px`;
    if (g_setting.showDocInfo) {
        htmlElem.appendChild(generateInfoLine());
    }

    let parentElem = document.createElement("div");
    parentElem.classList.add(CONSTANTS.PARENT_CONTAINER_ID);
    parentElem.style.cssText = CONTAINER_STYLE;
    let parentElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
        ${language["parent_nodes"]}
    </span>`;
    let parentFlag = false;
    for (let doc of parentDoc) {
        parentElemInnerText += docLinkGenerator(doc);
        parentFlag = true;
    }
    let siblingElem = document.createElement("div");
    siblingElem.classList.add(CONSTANTS.SIBLING_CONTAINER_ID);
    siblingElem.style.cssText = CONTAINER_STYLE;
    let siblingElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}" title="${language["number_count"].replace("%NUM%", siblingDoc.length)}">
        ${language["sibling_nodes"]}
        </span>`;
    if (parentFlag && !g_setting.replaceWithBreadcrumb) {
        parentElem.innerHTML = parentElemInnerText;
        htmlElem.appendChild(parentElem);
    }else if (!g_setting.replaceWithBreadcrumb){
        // do nothing #17代码调整遗留，确认不影响后可删除
        // parentElem.innerHTML = parentElemInnerText + `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
        // parentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        // htmlElem.appendChild(parentElem);
    }else if (g_setting.replaceWithBreadcrumb){
        parentElem.appendChild(await generateBreadCrumb());
        htmlElem.appendChild(parentElem);
    }
    // 同级文档始终显示或首层级显示
    if ((g_setting.sibling && !parentFlag) || g_setting.alwaysShowSibling){
        if (siblingDoc.length > 1) {
            for (let i = 0; i < siblingDoc.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
                let doc = siblingDoc[i];
                let temp = docLinkGenerator(doc);
                // 对当前文档加入新样式
                if (doc.id == docId) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(temp, "text/html");
                    let tempElement = doc.body.firstChild;
                    tempElement.classList.add("og-hn-docLinksWrapper-hl");
                    temp = tempElement.outerHTML;
                }
                siblingElemInnerText += temp;
            }
        }
        
        if (siblingDoc.length > 1 && siblingElemInnerText != `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
          ${language["sibling_nodes"]}
          </span>`) {
            siblingElem.innerHTML = siblingElemInnerText;
            htmlElem.appendChild(siblingElem);
        }else{
            siblingElem.innerHTML = siblingElemInnerText + `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
            siblingElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
            htmlElem.appendChild(siblingElem);
        }
        
    }
    
    // 同一层级上下文档 紧邻的文档
    let nextDocElem = document.createElement("div");
    let nextDocInnerText = "";
    let iCurrentDoc = -1;
    if (g_setting.previousAndNext) {
        for (let iSibling = 0; iSibling < siblingDoc.length; iSibling++) {
            if (siblingDoc[iSibling].id === docId) {
                iCurrentDoc = iSibling;
                break;
            }
        }
        if (iCurrentDoc >= 0) {
            let flag = false;
            if (iCurrentDoc > 0) {
                let simpleName = language["previous_doc"] + siblingDoc[iCurrentDoc - 1]["name"];
                siblingDoc[iCurrentDoc - 1]["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                nextDocInnerText += docLinkGenerator(siblingDoc[iCurrentDoc - 1]);
                flag = true;
            }
            if (iCurrentDoc + 1 < siblingDoc.length) {
                let simpleName = language["next_doc"] + siblingDoc[iCurrentDoc + 1]["name"];
                siblingDoc[iCurrentDoc + 1]["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                nextDocInnerText += docLinkGenerator(siblingDoc[iCurrentDoc + 1]);
                flag = true;
            }
            if (flag) {
                // emm 宽度不一这个bug是由于其他提示词文字后面有空格导致的
                nextDocElem.innerHTML = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
                ${language["neighbor_nodes"]}
            </span>` + nextDocInnerText;
                nextDocElem.classList.add(CONSTANTS.NEXT_CONTAINER_CLASS_NAME);
                htmlElem.appendChild(nextDocElem);
            }
        }
    }

    // 反链区域
    let backLinkElem = document.createElement("div");
    if (g_setting.showBackLinksArea != CONSTANTS.BACKLINK_NONE) {
        // 区分：是否只保留块引本文档
        let backlinkInnerText = "";
        if (g_setting.showBackLinksArea == CONSTANTS.BACKLINK_NORMAL) {
            const backlinkResponse = await getBackLink2(docId);
            debugPush("backlinkResponse", backlinkResponse);
            for (let i = 0; i < backlinkResponse.backlinks.length; i++) {
                const oneBacklinkItem = backlinkResponse.backlinks[i];
                if (oneBacklinkItem.nodeType === "NodeDocument") {
                    let tempDocItem = {
                        "ogSimpleName": oneBacklinkItem.name,
                        "name": oneBacklinkItem.name + ".sy",
                        "icon": "",
                        "id": oneBacklinkItem.id
                    };
                    backlinkInnerText += docLinkGenerator(tempDocItem);
                }
            }
        } else if (g_setting.showBackLinksArea == CONSTANTS.BACKLINK_DOC_ONLY) {
            const backlinkDocSqlResponse = await sqlAPI(`SELECT id, content FROM blocks WHERE id in (
                SELECT DISTINCT root_id FROM refs WHERE def_block_id = "${docId}"
                ) AND type = "d" ORDER BY updated DESC;`);
            debugPush("backlinkSQLResponse", backlinkDocSqlResponse);
            if (backlinkDocSqlResponse != null) {
                for (let i = 0; i < backlinkDocSqlResponse.length; i++) {
                    const oneBacklinkItem = backlinkDocSqlResponse[i];
                    let tempDocItem = {
                        "ogSimpleName": oneBacklinkItem.content,
                        "name": oneBacklinkItem.content + ".sy",
                        "icon": "",
                        "id": oneBacklinkItem.id
                    };
                    debugPush("docLinkCheck", docLinkGenerator(tempDocItem));
                    backlinkInnerText += docLinkGenerator(tempDocItem);
                }
            }
        }
        

        if (backlinkInnerText === "") {
            backlinkInnerText = `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
            backLinkElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        backLinkElem.innerHTML = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
        ${language["backlink_nodes"]}
        </span>` + backlinkInnerText;
        backLinkElem.classList.add(CONSTANTS.BACKLINK_CONTAINER_CLASS_NAME);
        htmlElem.appendChild(backLinkElem);
    }
    // 反链区域END

    // 如果插入挂件，则不处理子文档部分
    // 新：判断是否启用并包含数据库
    if (widgetMode || (g_setting.noChildIfHasAv && await isDocHasAv(docId))) {
        parentElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        siblingElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        siblingElem.classList.add("og-hn-container-multiline");
        nextDocElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        backLinkElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        backLinkElem.classList.add("og-hn-container-multiline");
        return htmlElem;
    }
    let childElem = document.createElement("div");
    childElem.classList.add(CONSTANTS.CHILD_CONTAINER_ID);
    
    childElem.style.cssText = CONTAINER_STYLE;
    let childElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}" title="${language["number_count"].replace("%NUM%", childDoc.length)}">
        ${language["child_nodes"]}
        </span>`;
    let childFlag = false;
    for (let i = 0; i < childDoc.length && (i < g_setting.docMaxNum || g_setting.docMaxNum == 0); i++) {
        let doc = childDoc[i];
        childElemInnerText += docLinkGenerator(doc);
        childFlag = true;
    }
    if (childFlag) {
        childElem.innerHTML = childElemInnerText;
        htmlElem.appendChild(childElem);
    }else{
        childElem.innerHTML = childElemInnerText + `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
        childElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        htmlElem.appendChild(childElem);
    }

    if (g_DEBUG > 1) {
        let debug = window.document.createElement("div");
        debug.setAttribute("id", "og-debug");
        htmlElem.appendChild(debug);
        g_DEBUG_ELEM = debug;
    }
    
    parentElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    siblingElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    siblingElem.classList.add("og-hn-container-multiline");
    childElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    childElem.classList.add("og-hn-container-multiline");
    nextDocElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    backLinkElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    backLinkElem.classList.add("og-hn-container-multiline");
    
    return htmlElem;

    async function generateBreadCrumb() {
        const pathObject = await parseDocPath(docSqlResult);
        debugPush("pathObject", pathObject);
        const breadcrumbElem = await generateBreadCrumbElement(pathObject);
        return breadcrumbElem;
    }
    async function parseDocPath(docDetail) {
        let pathArray = docDetail.path.substring(0, docDetail.path.length - 3).split("/");
        let hpathArray = docDetail.hpath.split("/");
        let resultArray = [];
        let notebooks = getNotebooks();
        let box;
        for (let notebook of notebooks) {
            if (notebook.id == docDetail.box) {
                box = notebook;
                break;
            }
        }
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
        let temp_path = "";
        for (let i = 1; i < pathArray.length; i++) {
            let docInfoResult = await getDocInfo(pathArray[i]);
            docInfoResult["box"] = box.id; 
            docInfoResult["path"] = `${temp_path}/${pathArray[i]}.sy`;
            docInfoResult["type"] = "FILE";
            docInfoResult["name"] = docInfoResult["name"] + ".sy";
            // let temp = {
            //     "name": hpathArray[i],
            //     "id": pathArray[i],
            //     "icon": "",
            //     "path": `${temp_path}/${pathArray[i]}.sy`,
            //     "box": box.id,
            //     "type": "FILE",
            // }
            temp_path += "/" + pathArray[i];
            resultArray.push(docInfoResult);
        }
        return resultArray;
    }
    async function generateBreadCrumbElement(pathObjects, docId) {
        const divideArrow = `<span class="og-fake-breadcrumb-arrow-span" data-type="%4%" data-parent-id="%5%"><svg class="${CONSTANTS.ARROW_CLASS_NAME}"
            data-type="%4%" data-parent-id="%5%">
            <use xlink:href="#iconRight"></use></svg></span>`;
        const oneItem = `<span class="protyle-breadcrumb__item fake-breadcrumb-click" data-node-id="%0%" data-type="%3%" data-node-names="%NAMES%">
            <span class="protyle-breadcrumb__text" title="%1%">%2%</span>
        </span>
        `;
        let htmlStr = "";
        for (let i = 0; i < pathObjects.length; i++) {
            let onePathObject = pathObjects[i];
            if ((g_setting.showNotebook && i == 0) || i != 0) {
                htmlStr += docLinkGenerator(pathObjects[i]);
            }
            htmlStr += divideArrow
                .replaceAll("%4%", onePathObject.type)
                .replaceAll("%5%", pathObjects[i].id);
        }
    
        let result = document.createElement("div");
        // let barElement = document.createElement("div");
        // barElement.classList.add("protyle-breadcrumb__bar");
        // barElement.classList.add("protyle-breadcrumb__bar--nowrap");
        result.innerHTML = htmlStr;
        // result.appendChild(barElement);
        result.classList.add("og-hn-parent-area-replace-with-breadcrumb");
        // result.classList.add("protyle-breadcrumb");
        return result;
    }

    function generateInfoLine() {
        let thisDocInfos = null;
        // 检索兄弟文档
        for (const sibling of siblingDoc) {
            if (sibling.id == docId) {
                thisDocInfos = sibling;
                break;
            }
        }
        let firstLineElem = document.createElement("div");
        firstLineElem.classList.add(CONSTANTS.INFO_CONTAINER_CLASS);
        firstLineElem.style.cssText = CONTAINER_STYLE;
        let notebooks = getNotebooks();
        let box;
        for (let notebook of notebooks) {
            if (notebook.id == docSqlResult.box) {
                box = notebook;
                break;
            }
        }
        let infoElemInnerText = `<span class="og-hn-create-at-wrapper">
            <span class="og-hn-create-at-indicator">${language["create_at"]}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hCtime"]}</span>
        </span>
        <span class="og-hn-modify-at-wrapper">
            <span class="og-hn-modify-at-indicator">${language["update_at"]}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hMtime"]}</span>
        </span>
        <span class="og-hn-child-doc-count-wrapper">
        ${language["child_count"].replace("%NUM%", `<span class="og-hn-child-doc-count-content">${childDoc.length}</span>`)} 
        </span>
        ${childDoc.length == 0 ? "" : 
        `<span class="og-hn-child-word-count-wrapper">
            <span class="og-hn-child-word-count-indicator">${language["child_word_count"]}</span> 
            <span class="og-hn-child-word-count-content">${totalWords}</span>
        </span>`}
        
        <span class="og-hn-notebook-wrapper">
            ${box.name}
        </span>
        `;
        firstLineElem.innerHTML = infoElemInnerText;
        return firstLineElem;
    }

    function docLinkGenerator(doc) {
        let emojiStr = getEmojiHtmlStr(doc.icon, doc?.subFileCount != 0);
        let docName = isValidStr(doc?.name) ? doc.name.substring(0, doc.name.length - 3) : doc.content;
        // docName = Lute.EscapeHTMLStr(docName);
        let trimDocName = docName;
        if (doc["ogSimpleName"]) {
            trimDocName = doc["ogSimpleName"];
        }
        // 文件名长度限制
        if (docName.length > g_setting.nameMaxLength && g_setting.nameMaxLength != 0) trimDocName = trimDocName.substring(0, g_setting.nameMaxLength) + "...";

        let result = "";
        switch (parseInt(g_setting.popupWindow)) {
            case CONSTANTS.POP_ALL: {
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "": escapeClass(g_setting.docLinkClass)}"
                    data-type='block-ref'
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px;"
                    title="${docName}"
                    data-id="${doc.id}">
                        <span class="og-hn-emoji-and-name">
                        ${emojiStr}<span class="trimDocName">${trimDocName}</span>
                        </span>
                    </span>`
                break;
            }
            case CONSTANTS.POP_LIMIT:{
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "":escapeClass(g_setting.docLinkClass)}"
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px; "
                    title="${docName}"
                    data-id="${doc.id}">
                        <span class="og-hn-emoji-and-name">
                        <span data-type='block-ref'
                        data-subtype="d"
                        data-id="${doc.id}"
                        >${emojiStr}</span><span class="trimDocName">${trimDocName}</span>
                        </span>
                    </span>`
                break;
            }
            case CONSTANTS.POP_NONE: {
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "":escapeClass(g_setting.docLinkClass)}"
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px;"
                    title="${docName}"
                    data-id="${doc.id}">
                    <span class="og-hn-emoji-and-name">
                        ${emojiStr}<span class="trimDocName">${trimDocName}</span>
                    </span>
                    </span>`
                break;
            }
            default: {
                console.warn("WARN数据格式不正常");
                g_setting.icon = g_setting_default.icon;
                g_writeStorage("settings.json", JSON.stringify(g_setting));
            }
        }
        return result;
        function escapeClass(val) {
            if (!val) return "";
            return val.replaceAll(`"`, "");
        }
    }
}


/*
 * 废弃中，暂时不打算使用对象实现，似乎没有意义 
 */
