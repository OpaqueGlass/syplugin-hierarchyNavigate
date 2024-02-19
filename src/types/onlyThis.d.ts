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

interface IDocLinkGenerateInfo {
    icon?: string;
    alias: string;
    path: string;
    name: string;
    id: string;
    count?: number;
    subFileCount?: number; // 请注意，不指出此项将是认为有子文档，但数量未知
    content?: string;
}

interface IAllPrinterResult {
    elements: Array<HTMLElement>, // 最终生成的各个部分元素
    onlyOnce: Array<boolean>, // 如果有，则该部分不做替换
    relateContentKey: Array<string>, // 相关的各个部分内容key
}