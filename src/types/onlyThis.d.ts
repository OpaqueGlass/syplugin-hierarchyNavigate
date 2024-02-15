/**
 * 此文件中包含 仅在当前插件中使用的interface接口定义
 */
interface IBasicInfo {
    success: boolean,
    docSqlResult: SqlResult,
    parentDocSqlResult: SqlResult,
    siblingDocInfoList: IFile[],
    childDocInfoList: IFile[],
    currentDocId: string,
}

interface IProtyleEnvInfo {
    mobile: boolean,
    flashCard: boolean,
    notTraditional: boolean
}