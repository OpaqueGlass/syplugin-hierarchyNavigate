import { debugPush, logPush, warnPush } from "@/logger";
import { getReadOnlyGSettings } from "@/manager/settingManager";
import { queryAPI, listDocsByPathT, getblockAttr as getblockAttr, DOC_SORT_TYPES, getDocInfo} from "@/syapi"
import { parseDateString } from "@/utils/common";
import { isValidStr } from "@/utils/commonCheck";
export async function getBasicInfo(docId:string, docPath: string, notebookId: string): Promise<IBasicInfo> {
    let result: IBasicInfo;
    result = {
        success: true,
        docBasicInfo: null,
        parentDocBasicInfo: null,
        allSiblingDocInfoList: [],
        userDemandSiblingDocInfoList: [],
        childDocInfoList: [],
        currentDocId: docId,
        currentDocAttrs: {},
    };
    // FIXME: 之后换成getDocInfo，看看能不能快一些
    result.docBasicInfo = await getSimpleDocInfo(docId, docPath, notebookId);
    const parentDocId = getParentDocIdFromPath(docPath);
    if (isValidStr(parentDocId)) {
        result.parentDocBasicInfo = await getSimpleDocInfo(parentDocId, getParentPath(docPath));
    }
    // TODO: 这个失败怎么判断？
    // if (currentDocSqlResponse.length == 0) {
    //     result["success"] = false;
    //     return result;
    // }
    [result.allSiblingDocInfoList, result.childDocInfoList, result.userDemandSiblingDocInfoList] = await getDocumentRelations(result.docBasicInfo);
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
    result.icon = result.ial?.icon;
    result.name = result.name + ".sy";
    result.createTime = parseDateString(result.id.substring(0, 14));
    result.updateTime = parseDateString(result.ial.updated ?? result.id.substring(0, 14));
    return result;
}


/**
 * 获取文档相关信息：父文档、同级文档、子文档(按此顺序返回)
 * @returns [parentDoc, siblingDocs, childDocs]
 */
async function getDocumentRelations(docBasicInfo:ISimpleDocInfoResult) {
    const g_setting = getReadOnlyGSettings();
    // 获取子文档
    let reorderdChildDocs = getAllChildDocuments(docBasicInfo.path, docBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc);
    // 获取同级文档
    let siblingDocs = getAllSiblingDocuments(docBasicInfo.path, docBasicInfo.box);
    // 获取显示用同级文档
    let userDemandSiblingDocs = getUserDemandSiblingDocuments(docBasicInfo.path, docBasicInfo.box, DOC_SORT_TYPES[g_setting.childOrder], g_setting.showHiddenDoc);
    
    logPush("siblings", siblingDocs);
    const waitResult = await Promise.all([siblingDocs, reorderdChildDocs, userDemandSiblingDocs]);
    logPush("waitResult", waitResult);
    // 返回结果
    return [ waitResult[0], waitResult[1], waitResult[2] ];
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