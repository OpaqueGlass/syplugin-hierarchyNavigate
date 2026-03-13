import { debugPush, logPush, warnPush } from "@/logger";
import { getReadOnlyGSettings } from "@/manager/settingManager";
import { queryAPI, listDocsByPathT, DOC_SORT_TYPES, getDocInfo} from "@/syapi"
import { parseDateString } from "@/utils/common";
import { isValidStr } from "@/utils/commonCheck";
export async function getBasicInfo(docId:string, docPath: string, notebookId: string): Promise<IBasicInfo> {
    let result: IBasicInfo;
    result = {
        success: true,
        docBasicInfo: null,
        parentDocBasicInfo: null,
        allSiblingDocInfoList: null, // 性能
        userDemandSiblingDocInfoList: null, // 性能
        childDocInfoList: null, // x性能
        currentDocId: docId,
        currentDocAttrs: {},
        subDocLimited: false,
        siblingDocLimited: false,
    };
    result.docBasicInfo = await getSimpleDocInfo(docId, docPath, notebookId);
    const parentDocId = getParentDocIdFromPath(docPath);
    // 笔记本的时候就没有上层,也导致下面没有统计
    if (isValidStr(parentDocId)) {
        result.parentDocBasicInfo = await getSimpleDocInfo(parentDocId, getParentPath(docPath), notebookId);
    }
    // TODO: 这个失败怎么判断？
    // if (currentDocSqlResponse.length == 0) {
    //     result["success"] = false;
    //     return result;
    // }
    [result.subDocLimited, result.siblingDocLimited] = getLimitation(result.docBasicInfo, result.parentDocBasicInfo);
    result.currentDocAttrs = result.docBasicInfo.ial;
    // 是否包括数据库
    // 文档中块数判断（用于控制lcd）
    logPush("BasicProviderFinalR", result);
    return result;
}

async function getSimpleDocInfo(docId:string, docPath?:string, notebookId?: string):Promise<ISimpleDocInfoResult> {
    const result:ISimpleDocInfoResult = {
        id: docId,
        path: docPath??"",
        ial: {},
        attrViews: {},
        name: "",
        refCount: 0,
        refIDs: [],
        subFileCount: 0,
        createTime: null,
        updateTime: null,
        icon: null,
        box: notebookId
        // hPath: "",
    };
    const docInfoResponse = await getDocInfo(docId);
    Object.assign(result, docInfoResponse);
    // 新旧api文档图标字段不一致
    result.icon = result.ial?.icon ?? result.icon;
    result.name = result.name + ".sy";
    result.createTime = parseDateString(result.id.substring(0, 14));
    result.updateTime = parseDateString(result.ial.updated ?? result.id.substring(0, 14));
    return result;
}


/**
 * 获取文档相关信息：父文档、同级文档、子文档(按此顺序返回)
 * @returns [parentDoc, siblingDocs, childDocs, getSubFlag, getSiblingFlag]
 */
async function getDocumentRelations(docBasicInfo:ISimpleDocInfoResult) {
    const g_setting = getReadOnlyGSettings();
    // TODO: 获取上层文档的文档数量
    
    // 获取子文档
    let reorderdChildDocs: Promise<IFile[]> = Promise.resolve([]);
    let getSubFlag = !isTooMuchSubDoc(docBasicInfo.subFileCount);
    if (getSubFlag) {
        reorderdChildDocs = getAllChildDocuments(docBasicInfo.path, docBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc);
    }
    let parentDocId = getParentDocIdFromPath(docBasicInfo.path);
    let getSiblingFlag = true;
    if (parentDocId) {
        let parentDocInfo = await getDocInfo(parentDocId);
        parentDocId["box"] = docBasicInfo.box;
        getSiblingFlag = !isTooMuchSubDoc(parentDocInfo.subFileCount);
    }
    // 获取同级文档
    let siblingDocs = getSiblingFlag ? getAllSiblingDocuments(docBasicInfo.path, docBasicInfo.box) : Promise.resolve([]);
    // 获取显示用同级文档
    let userDemandSiblingDocs = getSiblingFlag ? getUserDemandSiblingDocuments(docBasicInfo.path, docBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc) : Promise.resolve([]);
    
    logPush("siblings", siblingDocs);
    const waitResult = await Promise.all([siblingDocs, reorderdChildDocs, userDemandSiblingDocs]);
    logPush("waitResult", waitResult);
    // 返回结果
    return [ waitResult[0], waitResult[1], waitResult[2], getSubFlag, getSiblingFlag];
}

/**
 * 填充一个字段
 * @param basicInfo 基础信息
 * @param field 字段名称
 */
export async function fillOneDocRelationOfBasicInfo(basicInfo:IBasicInfo, field: "allSiblingDocInfoList"| "userDemandSiblingDocInfoList" | "childDocInfoList") {
    if (basicInfo[field] === null) {
        const g_setting = getReadOnlyGSettings();
        let result = null;
        const docBasicInfo = basicInfo.docBasicInfo;
        switch (field) {
            case "allSiblingDocInfoList": {
                result = await getAllSiblingDocuments(docBasicInfo.path, docBasicInfo.box)
                break;
            }
            case "userDemandSiblingDocInfoList": {
                result = await getUserDemandSiblingDocuments(docBasicInfo.path, docBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc);
                break;
            }
            case "childDocInfoList": {
                result = await getAllChildDocuments(docBasicInfo.path, docBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc);
                break;
            }
            default: {
                throw new Error("不支持的字段类型");
            }
        }
        basicInfo[field] = result;
    }
}

function getLimitation(docBasicInfo, parentDocInfo) {
    let limitSubFlag = isTooMuchSubDoc(docBasicInfo?.subFileCount);
    let limitSiblingFlag = isTooMuchSubDoc(parentDocInfo?.subFileCount);
    return [limitSubFlag, limitSiblingFlag];
}

export function isTooMuchSubDoc(count: number) {
    if (count == null) {
        logPush("[性能]没有输入文档个数", count);
        return false;
    }
    const g_setting = getReadOnlyGSettings();
    if (count > 1024) {
        logPush("[性能]性能模式限制", count);
        return true;
    }
    // const LIMIT = window["OG_FILE_PERFORM_LIMIT"] ?? 4096;
    // if (count > LIMIT) {
    //     logPush("[性能]文档数量过多", count);
    //     return true;
    // }
    return false;
}


export async function getParentDocument(sqlResult:SqlResult) {
    let splitText = sqlResult.path.split("/");
    if (splitText.length <= 2) return null;
    let parentSqlResponse = await queryAPI(`SELECT * FROM blocks WHERE id = "${splitText[splitText.length - 2]}"`);
    if (parentSqlResponse.length == 0) {
        return null;
    }
    return parentSqlResponse[0];
}

export async function getAllChildDocuments(docPath:string, notebookId: string, sortType?: number, showHidden?: boolean): Promise<IFile[]> {
    let childDocs = await listDocsByPathT({path: docPath, notebook: notebookId, maxListCount: 0, sort: sortType, showHidden: showHidden});
    return childDocs;
}

export async function getAllSiblingDocuments(currentDocPath: string, notebookId: string) {
    const parentDocPath = getParentPath(currentDocPath);
    let siblingDocs = await listDocsByPathT({path: parentDocPath, notebook: notebookId, maxListCount: 0, showHidden: true});
    return siblingDocs;
}

export async function getUserDemandSiblingDocuments(currentDocPath: string, notebookId: string, sortType?: number, showHidden?: boolean) {
    const parentDocPath = getParentPath(currentDocPath);
    let siblingDocs = await listDocsByPathT({path: parentDocPath, notebook: notebookId, maxListCount: 0, showHidden: showHidden, sort: sortType});
    return siblingDocs;
}

export async function getAllDescendantDocuments(currentDocPath: string, notebookId: string) {
    const path = currentDocPath.substring(0, currentDocPath.length - 3) + "/";
    const sqlResult = await queryAPI(`SELECT * FROM blocks WHERE path like "%${path}%" AND box = "${notebookId}" AND type = 'd'`);
    return sqlResult;
}

/**
 * 从文档路径中提取父文档路径
 * @param docPath sy格式的文档路径
 * @returns sy格式的父文档路径
 */
export function getParentPath(docPath:string):string|undefined {
    if (!isValidStr(docPath))  throw Error("无效的文档路径" + docPath);
    const docPathItem = docPath.split("/");
    if (docPathItem.length <= 2) return "/";
    docPathItem.pop();
    return docPathItem.join("/") + ".sy";
}

export function getParentDocIdFromPath(docPath:string):string|undefined {
    if (!isValidStr(docPath))  throw Error("无效的文档路径" + docPath);
    const docPathItem = docPath.split("/");
    if (docPathItem.length <= 2) return undefined;
    return docPathItem[docPathItem.length - 2];
}

export async function getCurrentDocSqlResult(docId: string) {
    const sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    if (sqlResult.length == 0) {
        return null;
    }
    return sqlResult[0];
}