import { debugPush } from "@/logger";
import { queryAPI, listDocsByPathT, getTreeStat } from ".";

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

export async function isDocHasAv(docId: string) {
    let sqlResult = await queryAPI(`
    SELECT count(*) as avcount FROM blocks WHERE root_id = '${docId}'
    AND type = 'av'
    `);
    if (sqlResult.length > 0 && sqlResult[0].avcount > 0) {
        return true;
    } else {
        
        return false;
    }
}

export async function isDocEmpty(docId: string, blockCountThreshold = 0) {
    // 检查父文档是否为空
    let treeStat = await getTreeStat(docId);
    if (blockCountThreshold == 0 && treeStat.wordCount != 0 && treeStat.imageCount != 0) {
        debugPush("treeStat判定文档非空，不插入挂件");
        return false;
    }
    if (blockCountThreshold != 0) {
        let blockCountSqlResult = await queryAPI(`SELECT count(*) as bcount FROM blocks WHERE root_id like '${docId}' AND type in ('p', 'c', 'iframe', 'html', 'video', 'audio', 'widget', 'query_embed', 't')`);
        if (blockCountSqlResult.length > 0) {
            if (blockCountSqlResult[0].bcount > blockCountThreshold) {
                return false;
            } else {
                return true;
            }
        }
    }
    
    let sqlResult = await queryAPI(`SELECT markdown FROM blocks WHERE 
        root_id like '${docId}' 
        AND type != 'd' 
        AND (type != 'p' 
           OR (type = 'p' AND length != 0)
           )
        LIMIT 5`);
    if (sqlResult.length <= 0) {
        return true;
    } else {
        debugPush("sql判定文档非空，不插入挂件");
        return false;
    }
}