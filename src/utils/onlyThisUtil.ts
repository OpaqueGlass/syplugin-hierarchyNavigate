import { debugPush, errorPush } from "@/logger";
import { isMobile } from "@/syapi";
import { IProtyle } from "siyuan";
import { isValidStr } from "./commonCheck";

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
    if (iconString.indexOf(".") != -1) {
        result = `<img class="b3-list-item__graphic" src="/emojis/${iconString}"}" />`;
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
