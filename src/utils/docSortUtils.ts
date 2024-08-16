import { debugPush, errorPush, logPush, warnPush } from "@/logger";
import { getReadOnlyGSettings } from "@/manager/settingManager";
import { isBlankStr, isValidStr } from "./commonCheck";
import { LINK_SORT_TYPES } from "@/constants";
import natsort from "natsort";

export function removeDocByDocName(docList: IFile[], regExpStrList: string[]) {
    let regExpList = regExpStrList.map(turnRegStr2Reg).filter(reg => reg != null);
    let newDocList: IFile[] = [];
    for (let doc of docList) {
        let isRemove = false;
        for (let reg of regExpList) {
            // 全局匹配g或粘性匹配y后，再次test从上次匹配位置之后开始匹配，这里清空
            reg.lastIndex = 0;
            if (reg.test(doc.name.slice(0, -3))) {
                isRemove = true;
                break;
            }
        }
        if (!isRemove) {
            newDocList.push(doc);
        }
    }
    return newDocList;
}

/**
 * 根据正则字符串，将匹配的文档固定在列表前部
 * @param docList 请注意 文档名称以.sy结尾！匹配时会移除
 * @param regExpStrList 
 */
export function pinDocByDocName(docList: IFile[], regExpStrList: string[]) {
    let regExpList = regExpStrList.map(turnRegStr2Reg).filter(reg => reg != null);
    let pinDocList: IFile[] = [];
    let otherDocList: IFile[] = [];
    let addedFlagList: boolean[] = new Array(docList.length).fill(false);
    // 按照正则的顺序匹配，第一个正则匹配到的文档固定在前部，第二个正则匹配到的文档固定在第一个正则匹配到的文档后部，以此类推
    for (let reg of regExpList) {
        for (let [index, doc] of docList.entries()) {
            // 全局匹配g或粘性匹配y后，再次test从上次匹配位置之后开始匹配，这里清空
            reg.lastIndex = 0;
            if (reg.test(doc.name.slice(0, -3)) && !addedFlagList[index]) {
                pinDocList.push(doc);
                addedFlagList[docList.indexOf(doc)] = true;
            }
        }
    }
    // 将addedFlag为False的，整理为 otherDocList
    for (let [index, doc] of docList.entries()) {
        if (!addedFlagList[index]) {
            otherDocList.push(doc);
        }
    }
    return pinDocList.concat(otherDocList);
}

export function pinAndRemoveByDocNameForBackLinks(docList: IFile[]) {
    const g_setting = getReadOnlyGSettings();
    
    const removeRegStrListStr = g_setting.removeRegStrListForLinks;
    const removeRegStrList = isBlankStr(removeRegStrListStr) ? [] : removeRegStrListStr.split("\n");
    
    const pinRegStrListStr = g_setting.pinRegStrListForLinks;
    const pinRegStrList = isBlankStr(pinRegStrListStr) ? [] : pinRegStrListStr.split("\n");
    
    const removedDocList = removeDocByDocName(docList, removeRegStrList);
    return pinDocByDocName(removedDocList, pinRegStrList);
}

function turnRegStr2Reg(regStr: string): RegExp {
    try {
        if (isBlankStr(regStr)) {
            warnPush("跳过正则表达式，因为正则字符串为空");
            return null;
        }
        return new RegExp(regStr, "gm");
    } catch (error) {
        warnPush("正则表达式无法解析，正则字符串为：" + regStr, "，错误为：" + error);
        return null;
    }
}

/**
 * （反链）内部排序类型转换为API接口所需的排序类型
 * @param sortType 插件内部的排序类型
 * @returns getBacklink2 API接口所需的sort
 */
export function linkSortTypeToBackLinkApiSortNum(sortType: string): string {
    switch (sortType) {
        case LINK_SORT_TYPES.NAME_ALPHABET_ASC:
            return "0";
        case LINK_SORT_TYPES.NAME_ALPHABET_DESC:
            return "1";
        case LINK_SORT_TYPES.NAME_NATURAL_ASC:
            return "4";
        case LINK_SORT_TYPES.NAME_NATURAL_DESC:
            return "5";
        case LINK_SORT_TYPES.CREATE_TIME_ASC:
            return "9";
        case LINK_SORT_TYPES.CREATE_TIME_DESC:
            return "10";
        case LINK_SORT_TYPES.UPDATE_TIME_ASC:
            return "2";
        case LINK_SORT_TYPES.UPDATE_TIME_DESC:
            return "3";
        default:
            warnPush("反链未知的排序类型：" + sortType);
            return "3";
    }
}

/**
 * 对文档信息列表进行自然排序
 * @param docList 对象列表
 * @param attributeName 需要排序的对象属性
 * @param desc 是否为降序
 * @returns 排序后的结果
 */
export function sortIFileWithNatural(docList: IFile[], attributeName: string, desc: boolean): IFile[] {
    const sorter = natsort({ insensitive: true });
    return docList.sort((a, b) => {
        if (desc) {
            return sorter(b[attributeName], a[attributeName]);
        }
        return sorter(a[attributeName], b[attributeName]);
    });
}