import { debugPush, logPush } from "@/logger";
import {queryAPI, listDocsByPathT, getblockAttr as getblockAttr} from "@/syapi"
export async function getBasicInfo(docId:string) {
    let result: IBasicInfo;
    result = {
        success: true,
        docSqlResult: null,
        parentDocSqlResult: null,
        siblingDocInfoList: [],
        childDocInfoList: [],
        currentDocId: docId,
        currentDocAttrs: {},
    };
    const currentDocSqlResponse = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    if (currentDocSqlResponse.length == 0) {
        result["success"] = false;
        return result;
    }
    result.docSqlResult = currentDocSqlResponse[0];
    [result.parentDocSqlResult, result.siblingDocInfoList, result.childDocInfoList] = await getDocumentRelations(currentDocSqlResponse[0]);
    result.currentDocAttrs = await getblockAttr(docId);
    // 是否包括数据库
    // 文档中块数判断（用于控制lcd）
    logPush("BasicProviderFinalR", result);
    return result;
}


/**
 * 获取文档相关信息：父文档、同级文档、子文档(按此顺序返回)
 * @returns [parentDoc, siblingDocs, childDocs]
 */
async function getDocumentRelations(sqlResult:any) {
     // 获取父文档
    let parentDoc = await getParentDocument(sqlResult);
    // 获取子文档
    let childDocs = getAllChildDocuments(sqlResult);
    // 获取同级文档
    let siblingDocs = getAllSiblingDocuments(parentDoc, sqlResult);
    logPush("siblings", siblingDocs);
    const waitResult = await Promise.all([siblingDocs, childDocs]);
    logPush("waitResult", waitResult);
    // 返回结果
    return [ parentDoc, waitResult[0], waitResult[1] ];
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

export async function getAllChildDocuments(sqlResult:SqlResult, sortType?: number): Promise<IFile[]> {
    let childDocs = await listDocsByPathT({path: sqlResult.path, notebook: sqlResult.box, maxListCount: 0, sort: sortType});
    return childDocs;
}

export async function getAllSiblingDocuments(parentSqlResult:SqlResult, sqlResult:SqlResult) {
    const noParentFlag = (parentSqlResult == null);
    let siblingDocs = await listDocsByPathT({path: noParentFlag ? "/" : parentSqlResult.path, notebook: sqlResult.box, maxListCount: 0});
    return siblingDocs;
}