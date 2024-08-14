import { warnPush } from "@/logger";

export function removeDocByDocName(docList: IFile[], regExpStrList: string[]) {
    let regExpList = regExpStrList.map(turnRegStr2Reg).filter(reg => reg != null);
    let newDocList: IFile[] = [];
    for (let doc of docList) {
        let isRemove = false;
        for (let reg of regExpList) {
            if (reg.test(doc.name)) {
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
 * @param docList 
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
            if (reg.test(doc.name) && !addedFlagList[index]) {
                pinDocList.push(doc);
                addedFlagList[docList.indexOf(doc)] = true;
            }
        }
    }
     
}

function turnRegStr2Reg(regStr: string): RegExp {
    try {
        return new RegExp(regStr);
    } catch (error) {
        warnPush("正则表达式无法解析，正则字符串为：" + regStr, "，错误为：" + error);
        return null;
    }
}