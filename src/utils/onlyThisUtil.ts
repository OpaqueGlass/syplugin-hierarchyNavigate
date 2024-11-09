import { debugPush, errorPush } from "@/logger";
import { DOC_SORT_TYPES, getblockAttr, getCurrentDocIdF, isMobile, queryAPI } from "@/syapi";
import { IProtyle } from "siyuan";
import * as siyuanAPIs from "siyuan";
import { isValidStr } from "./commonCheck";
import { openRefLinkByAPI } from "./common";

export function getProtyleInfo(protyle: IProtyle):IProtyleEnvInfo {
    let result:IProtyleEnvInfo = {
        mobile: false,
        flashCard: false,
        notTraditional: false,
        originProtyle: protyle
    };
    if (protyle.model == null) {
        result["notTraditional"] = true;
    }
    if (isMobile()) {
        result["mobile"] = true;
    }
    if (protyle.element.classList.contains("card__block")) {
        result["flashCard"] = true;
    }
    return result;
}

/**
 * html字符转义
 * 目前仅emoji使用
 * 对常见的html字符实体换回原符号
 * @param {*} inputStr 
 * @returns 
 */
export function htmlTransferParser(inputStr:string): string {
    if (inputStr == null || inputStr == "") return "";
    let transfer = ["&lt;", "&gt;", "&nbsp;", "&quot;", "&amp;"];
    let original = ["<", ">", " ", `"`, "&"];
    for (let i = 0; i < transfer.length; i++) {
        inputStr = inputStr.replace(new RegExp(transfer[i], "g"), original[i]);
    }
    return inputStr;
}


export function getListItemEmojiHtmlStr(iconString:string, hasChild:boolean) {
    // 无emoji的处理
    if (!isValidStr(iconString)) {
        return hasChild ? `<span class="b3-list-item__graphic">📑</span>` : `<span class="b3-list-item__graphic">📄</span>`;
    }
    let result = iconString;
    // emoji地址判断逻辑为出现.，但请注意之后的补全
    if (iconString.startsWith("api/icon/getDynamicIcon")) {
        result = `<img class="b3-list-item__graphic" src="/${iconString}" />`;
    } else if (iconString.indexOf(".") != -1) {
        result = `<img class="b3-list-item__graphic" src="/emojis/${iconString}" />`;
    } else {
        result = `<span class="b3-list-item__graphic">${emojiIconHandler(iconString, hasChild)}</span>`;
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

export function emojiIconHandler(iconString:string, hasChild = false) {
    if (!isValidStr(iconString)) {
        if (window.siyuan.storage["local-images"]) {
            if (hasChild) {
                return emojiIconHandler(window.siyuan.storage["local-images"].folder, hasChild);
            } else {
                return emojiIconHandler(window.siyuan.storage["local-images"].file, hasChild);
            }
        }
        return hasChild ? "📑" : "📄";
    }
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

/**
 * 使用设置中的参数处理文档
 * @param param0 
 */
export function openRefLinkByAPIWithConfig({mouseEvent, paramDocId = "", keyParam = undefined, openInFocus = undefined, g_setting}: {mouseEvent?: MouseEvent, paramDocId?: string, keyParam?: any, openInFocus?: boolean, g_setting: any}) {
    let removeCurrentTab = undefined;
    let autoRemoveJudgeMiliseconds = 0;
    if (g_setting.openDocRemoveCurrentTab == "true") {
        removeCurrentTab = true;
    }
    if (g_setting.openDocRemoveCurrentTab == "false") {
        removeCurrentTab = false;
    }
    if (g_setting.autoRemoveOldTabJudgeMiliseconds != 0 && Number.isInteger(g_setting.autoRemoveOldTabJudgeMiliseconds)) {
        autoRemoveJudgeMiliseconds = g_setting.autoRemoveOldTabJudgeMiliseconds;
    }
    openRefLinkByAPI({mouseEvent, paramDocId, keyParam, openInFocus, removeCurrentTab, autoRemoveJudgeMiliseconds});
}

export function removeCurrentTabF(docId?:string) {
    // 获取tabId
    if (!isValidStr(docId)) {
        docId = getCurrentDocIdF(true);
    }
    if (!isValidStr(docId)) {
        debugPush("错误的id或多个匹配id");
        return;
    }
    // v3.1.11或以上
    if (siyuanAPIs?.getAllEditor) {
        const editor = siyuanAPIs.getAllEditor();
        let protyle = null;
        for (let i = 0; i < editor.length; i++) {
            if (editor[i].protyle.block.rootID === docId) {
                protyle = editor[i].protyle;
                break;
            }
        }
        if (protyle) {
            if (protyle.model.headElement) {
                if (protyle.model.headElement.classList.contains("item--pin")) {
                    debugPush("Pin页面，不关闭存在页签");
                    return;
                }
            }
            //id: string, closeAll = false, animate = true, isSaveLayout = true
            debugPush("关闭存在页签", protyle?.model?.parent?.parent, protyle.model?.parent?.id);
            protyle?.model?.parent?.parent?.removeTab(protyle.model?.parent?.id, false, false);
        } else {
            debugPush("没有找到对应的protyle，不关闭存在的页签");
            return;
        }
    } else { // v3.1.10或以下
        return;
    }

}

/**
 * 获取临近的日记
 * @param param0 sqlResult^: 查询结果，docId&: 文档id，boxId&: 笔记本id，getNewer: 是否获取更新的日记，ialObject*: ial对象
 * @returns 
 */
export async function getNeighborDailyNoteDoc({sqlResult=null, docId=null, boxId=null, getNewer=true, ialObject=null}: {sqlResult?: any, docId?: string, getNewer?: boolean, ialObject?:any, boxId?: string}) {
    if (sqlResult == null && boxId == null) {
        sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = '${docId}'`);
    } else if (sqlResult == null && isValidStr(boxId) && isValidStr(docId)) {
        sqlResult = [{"id": docId, "box": boxId, "ial": JSON.stringify(ialObject)}];
    }
    if (sqlResult == null || sqlResult.length == 0) {
        debugPush("未找到对应的block");
        throw new Error("未找到对应的block" + docId);
    }
    if (!sqlResult[0].ial?.includes("custom-dailynote")) {
        return null;
    }
    // 我们应该根据情况获取，如果是按照月构建的dailynote，同一笔记上可能有多个标签
    let minCurrentDate = Number.MAX_SAFE_INTEGER.toString(); // 向上跳转用
    let maxCurrentDate = "0";
    if (ialObject == null) {
        ialObject = await getblockAttr(sqlResult[0].id);
    }
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
    if ((getNewer && maxCurrentDate == "0") && (!getNewer && minCurrentDate == Number.MAX_SAFE_INTEGER.toString())) {
        return null;
    }
    // 在这里我们假定id前截取到的8位数是dailynote的创建时间
    const response = await queryAPI(`
    SELECT b.content as name, b.id
    FROM attributes AS a
    JOIN blocks AS b ON a.root_id = b.id
    WHERE a.name LIKE 'custom-dailynote%' AND a.block_id = a.root_id
    AND b.box = '${sqlResult[0].box}' 
    AND a.value ${getNewer ? ">" : "<"} '${getNewer ? maxCurrentDate : minCurrentDate}'
    ORDER BY
    a.value ${getNewer ? "ASC" : "DESC"}
    LIMIT 1`);
    debugPush("dailyNote结果", response);
    if (response && response.length > 0) {
        return response[0];
    } else {
        debugPush("日记未定位到结果");
        return null;
    }
}

// export function getNotebookSortMode(boxId: string) {
//     let sortType: string|number = window.document.querySelector(`.file-tree.sy__file ul[data-url='${boxId}']`)?.getAttribute("data-sortmode");
//     if (!isValidStr(sortType)) {
//         sortType = window.siyuan.notebooks.filter((item) => item.id == boxId)[0]?.sortMode;
//     }
//     if (typeof sortType === "string") {
//         sortType = parseInt(sortType, 10);
//     }
//     if (sortType == DOC_SORT_TYPES.FOLLOW_DOC_TREE_ORI) {
//         sortType = window.siyuan.config?.fileTree?.sort;
//     }
//     return sortType;
// }

export function isSortAsc(sortMode: number) {
    return [DOC_SORT_TYPES.FILE_NAME_ASC, DOC_SORT_TYPES.NAME_NAT_ASC, DOC_SORT_TYPES.CREATED_TIME_ASC, 
        DOC_SORT_TYPES.MODIFIED_TIME_ASC, DOC_SORT_TYPES.REF_COUNT_ASC, DOC_SORT_TYPES.DOC_SIZE_ASC,
        DOC_SORT_TYPES.SUB_DOC_COUNT_ASC
    ].includes(sortMode);
}

export function isSortByNameOrCreateTime(sortMode: number) {
    return [DOC_SORT_TYPES.FILE_NAME_ASC, DOC_SORT_TYPES.FILE_NAME_DESC, DOC_SORT_TYPES.NAME_NAT_ASC,
        DOC_SORT_TYPES.NAME_NAT_DESC, DOC_SORT_TYPES.CREATED_TIME_ASC, DOC_SORT_TYPES.CREATED_TIME_DESC
    ].includes(sortMode);
}