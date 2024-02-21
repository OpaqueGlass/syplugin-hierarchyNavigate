import { debugPush, logPush } from "@/logger";
import { getCurrentDocIdF, queryAPI } from "@/syapi";
import { getFocusedBlockId, openRefLink } from "@/utils/common";
import { isValidStr } from "@/utils/commonCheck";
import { lang } from "@/utils/lang";
import { openTab, showMessage, Plugin } from "siyuan";
import { getAllChildDocuments, getAllSiblingDocuments, getParentDocument } from "./commonProvider";
import { getPluginInstance } from "@/utils/getInstance";

export function bindCommand(pluginInstance: Plugin) {
    pluginInstance.addCommand({
        langKey: "go_up",
        hotkey: "⌥⌘←",
        callback: () => {
            goUpShortcutHandler();
        },
    });
    
    pluginInstance.addCommand({
        langKey: "go_down",
        hotkey: "⌥⌘→",
        callback: () => {
            goDownShortcutHandler();
        }
    });
    
    pluginInstance.addCommand({
        langKey: "insert_lcd",
        hotkey: "",
        editorCallback: (protyle) => {
            addWidgetShortcutHandler(protyle);
        }
    });
    
    pluginInstance.addCommand({
        langKey: "go_to_previous_doc",
        hotkey: "⌥⌘↑",
        callback: () => {
            goToPreviousDocShortcutHandler();
        }
    });
    
    
    pluginInstance.addCommand({
        langKey: "go_to_next_doc",
        hotkey: "⌥⌘↓",
        callback: () => {
            goToNextDocShortcutHandler();
        },
    });
}




async function goUpShortcutHandler() {
    const docId = await getCurrentDocIdF();
    if (docId == null) {
        logPush("未能读取到打开文档的id");
        return ;
    }
    // 通过正则判断IAL，匹配指定属性是否是禁止显示的文档
    let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    let paths;
    if (sqlResult && sqlResult.length >= 1) {
        paths = sqlResult[0].path.split("/");
    } else {
        return;
    }
    if (paths.length < 2) {
        return;
    }
    if (isValidStr(paths[paths.length - 2])) {
        let docId = paths[paths.length - 2];
        docId = docId.replace(".sy", "");
        openRefLink(undefined, docId, {
            ctrlKey: false,
            shiftKey: false,
            altKey: false});
    } else {
        showMessage(lang("is_top_document"), 2000)
    }
}


async function goDownShortcutHandler() {
    const docId = await getCurrentDocIdF();
    let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    if (sqlResult && sqlResult.length >= 1) {
        // TODO: 如果可以忽略超过范围的提示，再将这里的限制修改为3以下
        const childDocsList = await getAllChildDocuments(sqlResult[0]);
        if (childDocsList && childDocsList.length >= 1) {
            const childDoc = childDocsList[0];
            openRefLink(undefined, childDoc.id, {
                ctrlKey: false,
                shiftKey: false,
                altKey: false});
        } else {
            showMessage(lang("no_child_document"), 2000);
        }
    } else {
        showMessage(lang("canot_open_child_doc"), 2000);
    }
}

async function goToPreviousDocShortcutHandler() {
    const previousDoc = await getSiblingDocsForNeighborShortcut(false);
    debugPush("previousDoc", previousDoc);
    if (previousDoc) {
        // 打开
        openRefLink(undefined, previousDoc.id);
        // openTab({
        //     app: getPluginInstance().app.appId,
        //     doc: {
        //         id: previousDoc.id,
        //     }
        // });
    } else {
        // 提示
        showMessage(lang("is_first_document"), 2000);
    }
}

async function goToNextDocShortcutHandler() {
    const nextDoc = await getSiblingDocsForNeighborShortcut(true);
    debugPush("nextDoc", nextDoc);
    if (nextDoc) {
        openRefLink(undefined, nextDoc.id);
        // openTab({
        //     app: getPluginInstance().app.appId,
        //     doc: {
        //         id: nextDoc.id,
        //     }
        // });
    } else {
        // 提示
        showMessage(lang("is_last_document"), 2000);
    }
}

async function getSiblingDocsForNeighborShortcut(isNext) {
    let siblingDocs = null;
    let docId;

    docId = await getCurrentDocIdF();
    let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    if (!sqlResult || sqlResult.length <= 0) {
        // debugPush(`第${retryCount}次获取文档信息失败，该文档可能是刚刚创建，休息一会儿后重新尝试`);
        // await sleep(200);
        // continue;
        debugPush("文档似乎是刚刚创建，无法获取上下文信息，停止处理");
        return;
    }
    const parentSqlResult = await getParentDocument(sqlResult[0]);
    siblingDocs = await getAllSiblingDocuments(parentSqlResult, sqlResult[0]);
    
    // 处理sibling docs
    if (siblingDocs == null || siblingDocs.length == 1) {
        debugPush("仅此一个文档，停止处理");
        return null;
    }
    let iCurrentDoc = -1;
    for (let iSibling = 0; iSibling < siblingDocs.length; iSibling++) {
        if (siblingDocs[iSibling].id === docId) {
            iCurrentDoc = iSibling;
            break;
        }
    }
    if (iCurrentDoc >= 0) {
        if (iCurrentDoc > 0 && isNext == false) {
            return siblingDocs[iCurrentDoc - 1];
        }
        if (iCurrentDoc + 1 < siblingDocs.length && isNext == true) {
            return siblingDocs[iCurrentDoc + 1];
        }
        return null;
    }
    return null;
}

async function addWidgetShortcutHandler(protyle:any) {
    const docId = await getCurrentDocIdF();
    if (docId == null) {
        logPush("未能读取到打开文档的id");
        return ;
    }
    const focusedBlockId = getFocusedBlockId();
    if (!isValidStr(focusedBlockId)) {
        return;
    }
    const WIDGET_HTML = `<iframe src="/widgets/listChildDocs" data-src="/widgets/listChildDocs" data-subtype="widget" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 1500px; height: 350px;"></iframe>`;
    debugPush("shortCut,PROTYLE", protyle);
    protyle.getInstance()?.insert(WIDGET_HTML, true)
}