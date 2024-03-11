import { isMobile } from "@/syapi";
import { IProtyle } from "siyuan";

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

