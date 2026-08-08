import { queryAPI, getKramdown, updateBlockAPI } from "@/syapi";
import { logPush, warnPush, errorPush, debugPush } from "@/logger";
import { showPluginMessage } from "@/utils/common";
import { lang } from "@/utils/lang";

let running = false;
/**
 * 修正工作空间中 listChildDocs 挂件的 src，使其以 / 结尾。
 *
 * 在sql缓存能够被及时更新的前提下，本操作幂等。
 */
export async function fixListChildDocsSrc(): Promise<void> {
    const SQL_STMT = `SELECT * FROM blocks where markdown like '%src="/widgets/listChildDocs"%' limit 999999`;
    const SRC_NEED_FIX = 'src="/widgets/listChildDocs"';
    const SRC_FIXED = 'src="/widgets/listChildDocs/"';

    if (running) {
        showPluginMessage(lang("fix_lcd_src_running"), 2000, "info");
        return;
    }
    running = true;
    showPluginMessage(lang("fix_lcd_src_start"), 1000, "info");
    let blocks: any[];
    try {
        blocks = await queryAPI(SQL_STMT);
    } catch (err) {
        errorPush("修正 listChildDocs src 失败：SQL 查询出错", err);
        showPluginMessage(lang("fix_lcd_src_sql_error"), 5000, "error");
        return;
    }

    if (!blocks || blocks.length === 0) {
        logPush("修正 listChildDocs src：未找到需要处理的块");
        showPluginMessage(lang("fix_lcd_src_no_match"));
        return;
    }

    logPush(`修正 listChildDocs src：共找到 ${blocks.length} 个候选块`);
    let fixedCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const block of blocks) {
        const blockId = block.id;
        if (!blockId) {
            skipCount++;
            continue;
        }

        const kramdown = await getKramdown(blockId);
        if (kramdown == null) {
            warnPush("修正 listChildDocs src：无法获取块 kramdown，跳过", blockId);
            failCount++;
            continue;
        }

        // 仅当确实包含需要修正的形式时才处理；
        // 已带结尾斜杠的（/widgets/listChildDocs/）不会命中，避免重复/误处理
        if (!kramdown.includes(SRC_NEED_FIX)) {
            skipCount++;
            continue;
        }

        const newContent = kramdown.replaceAll(SRC_NEED_FIX, SRC_FIXED);
        const result = await updateBlockAPI(newContent, blockId, "markdown");
        if (result != null) {
            fixedCount++;
            debugPush("修正 listChildDocs src：已修正块", blockId);
        } else {
            failCount++;
            warnPush("修正 listChildDocs src：保存块失败", blockId);
        }
    }

    logPush(`修正 listChildDocs src 完成：修正 ${fixedCount} 个，跳过 ${skipCount} 个，失败 ${failCount} 个`);
    showPluginMessage(
        lang("fix_lcd_src_done")
            .replace("%FIXED%", String(fixedCount))
            .replace("%SKIP%", String(skipCount))
            .replace("%FAIL%", String(failCount))
    );
    running = false;
}


export async function isWrongListChildDocsSrcExist(): Promise<boolean> {
    const SQL_STMT = `SELECT * FROM blocks where markdown like '%src="/widgets/listChildDocs"%' limit 999999`;

    let blocks: any[];
    try {
        blocks = await queryAPI(SQL_STMT);
    } catch (err) {
        errorPush("查询 listChildDocs src 失败：SQL 查询出错", err);
        return false;
    }
    if (blocks && blocks.length > 0) {
        return true;
    }
    return false;
}