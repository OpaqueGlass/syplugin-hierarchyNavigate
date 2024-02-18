import { queryAPI, listDocsByPathT } from ".";

/**
 * 统计子文档字符数
 * @param {*} childDocs 
 * @returns 
 */
export async function getChildDocumentsWordCount(docId:string) {
    const sqlResult = await queryAPI(`
        SELECT SUM(length) AS count
        FROM blocks
        WHERE
            path like "%/${docId}/%"
            AND 
            type in ("p", "h", "c", "t")
        `);
    if (sqlResult[0].count) {
        return sqlResult[0].count;
    }
    return 0;
    // let totalWords = 0;
    // let docCount = 0;
    // for (let childDoc of childDocs) {
    //     let tempWordsResult = await getTreeStat(childDoc.id);
    //     totalWords += tempWordsResult.wordCount;
    //     childDoc["wordCount"] = tempWordsResult.wordCount;
    //     docCount++;
    //     if (docCount > 128) {
    //         totalWords = `${totalWords}+`;
    //         break;
    //     }
    // }
    // return [childDocs, totalWords];
}

export async function getChildDocuments(sqlResult:SqlResult, maxListCount: number): Promise<IFile[]> {
    let childDocs = await listDocsByPathT({path: sqlResult.path, notebook: sqlResult.box, maxListCount: maxListCount});
    return childDocs;
}

export async function isChildDocExist(id: string) {
    const sqlResponse = await queryAPI(`
        SELECT * FROM blocks WHERE path like '%${id}/%' LIMIT 3
        `);
    if (sqlResponse && sqlResponse.length > 0) {
        return true;
    }
    return false;
}