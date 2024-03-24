/**
 * 此文件中包含 仅在当前插件中使用的interface接口定义
 */
interface IBasicInfo {
    success: boolean,
    docBasicInfo: ISimpleDocInfoResult,
    parentDocBasicInfo: ISimpleDocInfoResult,
    allSiblingDocInfoList: IFile[],
    childDocInfoList: IFile[],
    userDemandSiblingDocInfoList: IFile[],
    currentDocId: string,
    currentDocAttrs: any,
}

interface ISimpleDocInfoResult {
    id: string,
    path: string,
    ial: any,
    attrViews: any,
    // rootID: string, // 根块id，不是笔记本id
    name: string,
    refCount: number,
    refIDs: string[],
    subFileCount: number,
    createTime: Date,
    updateTime: Date,
    icon: string|undefined,
    box: string
    // hpath: string,
}

interface IProtyleEnvInfo {
    mobile: boolean,
    flashCard: boolean,
    notTraditional: boolean,
    originProtyle: any
}

interface IDocLinkGenerateInfo {
    icon?: string;
    // alias: string;
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
    relateContentKeys: Array<string>, // 相关的各个部分内容key
}