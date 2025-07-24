import { debugPush, isDebugMode, logPush } from "@/logger";
import { getblockAttr, getCurrentDocIdF, getNotebookSortModeF, isMobile, queryAPI } from "@/syapi";
import { generateUUID, getFocusedBlockId, replaceShortcutString } from "@/utils/common";
import { isValidStr } from "@/utils/commonCheck";
import { lang } from "@/utils/lang";
import { showMessage, Plugin } from "siyuan";
import { getAllChildDocuments, getUserDemandSiblingDocuments } from "./commonProvider";
import { getReadOnlyGSettings } from "@/manager/settingManager";
import { createApp } from "vue";
import switchPanel from "@/components/dialog/switchPanel.vue";
import * as siyuan from "siyuan";
import { useShowSwitchPanel } from "./pluginHelper";
import { getNeighborDailyNoteDoc, isSortAsc, isSortByNameOrCreateTime, openRefLinkByAPIWithConfig } from "@/utils/onlyThisUtil";
import { CONSTANTS } from "@/constants";

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

    pluginInstance.addCommand({
        langKey: "show_switch_panel",
        hotkey: "⌥⌘E",
        callback: () => {
            showSwitchPanel();
        },
    });

    // 图标的制作参见帮助文档
    pluginInstance.addIcons(`<symbol id="iconOgHnBookUp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V7"/><path d="M18 2h1a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2"/><path d="m9 10 3-3 3 3"/><path d="m9 5 3-3 3 3"/>
        </symbol>
    `);
    if (isDebugMode() || !isMobile()) {
        pluginInstance.addTopBar({
            "icon": "iconOgHnBookUp",
            "title": lang("dialog_panel_switchDoc"),
            "position": "right",
            "callback": () => {
                showSwitchPanel();
            }
        });
    }

    // const topBarElement = this.addTopBar({
        //     icon: "iconTestStatistics",
        //     title: this.i18n.addTopBarIcon,
        //     position: "right",
        //     callback: () => {
        //         this.openStatisticTab();
        //     }
        // });
    pluginInstance.addCommand({
        langKey: "make_navigation_top",
        hotkey: "",
        callback: () => {
            turnNavigationToTop();
        },
    });
}


async function showSwitchPanel() {
    const docId = getCurrentDocIdF();
    if (!isValidStr(docId)) {
        debugPush("未能获取到当前文档id");
        showMessage(lang("open_doc_first"));
        return;
    }
    let app = null;
    const uid = generateUUID();
    const switchPanelDialogRef = useShowSwitchPanel();
    if (switchPanelDialogRef.value) {
        switchPanelDialogRef.value.destroy();
        switchPanelDialogRef.value = null;
        return;
    }
    // 获取文档id
    
    const switchPanelDialog = new siyuan.Dialog({
            "title": lang("dialog_panel_plugin_name") + "--" + lang("dialog_panel_switchDoc"),
            "content": `
            <div id="og_plugintemplate_${uid}" class="b3-dialog__content" style="overflow: hidden; position: relative;height: 100%;"></div>
            `,
            "width": isMobile() ? "80vw":"55vw",
            "height": isMobile() ? "75vh":"80vh",
            "destroyCallback": ()=>{app.unmount(); switchPanelDialogRef.value = null; debugPush("对话框销毁成功")},
        });
    switchPanelDialogRef.value = switchPanelDialog;
    app = createApp(switchPanel, {docId: docId, dialog: switchPanelDialog});
    app.mount(`#og_plugintemplate_${uid}`);
    return;
}




async function goUpShortcutHandler() {
    const docId = getCurrentDocIdF();
    const g_setting = getReadOnlyGSettings();
    if (!isValidStr(docId)) {
        logPush("未能读取到打开文档的id");
        showMessage(lang("open_doc_first"));
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
        openRefLinkByAPIWithConfig({paramDocId: docId, keyParam: {
            ctrlKey: false,
            shiftKey: false,
            altKey: false}, g_setting});
    } else {
        showMessage(lang("is_top_document"), 2000)
    }
}


async function goDownShortcutHandler() {
    const docId = getCurrentDocIdF();
    const g_setting = getReadOnlyGSettings();
    let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    if (sqlResult && sqlResult.length >= 1) {
        // TODO: 如果可以忽略超过范围的提示，再将这里的限制修改为3以下
        const childDocsList = await getAllChildDocuments(sqlResult[0].path, sqlResult[0].box);
        if (childDocsList && childDocsList.length >= 1) {
            const childDoc = childDocsList[0];
            openRefLinkByAPIWithConfig({paramDocId: childDoc.id, keyParam: {
                ctrlKey: false,
                shiftKey: false,
                altKey: false}, g_setting});
        } else {
            showMessage(lang("no_child_document"), 2000);
        }
    } else {
        showMessage(lang("canot_open_child_doc"), 2000);
    }
}

async function goToPreviousDocShortcutHandler() {
    const previousDoc = await getSiblingDocsForNeighborShortcut(false);
    const g_setting = getReadOnlyGSettings();
    debugPush("previousDoc", previousDoc);
    if (previousDoc) {
        // 打开
        openRefLinkByAPIWithConfig({paramDocId: previousDoc.id, g_setting});
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
    const g_setting = getReadOnlyGSettings();
    debugPush("nextDoc", nextDoc);
    if (nextDoc) {
        openRefLinkByAPIWithConfig({paramDocId: nextDoc.id, g_setting});
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
    docId = getCurrentDocIdF();
    if (!isValidStr(docId)) {
        showMessage(lang("open_doc_first"));
        return ;
    }
    let sqlResult = await queryAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
    if (!sqlResult || sqlResult.length <= 0) {
        // debugPush(`第${retryCount}次获取文档信息失败，该文档可能是刚刚创建，休息一会儿后重新尝试`);
        // await sleep(200);
        // continue;
        debugPush("文档似乎是刚刚创建，无法获取上下文信息，停止处理");
        return;
    }
    const g_setting = getReadOnlyGSettings();
    // const parentSqlResult = await getParentDocument(sqlResult[0]);
    siblingDocs = await getUserDemandSiblingDocuments(sqlResult[0].path, sqlResult[0].box, undefined, true);
    
    // 处理sibling docs
    if (!sqlResult[0].ial?.includes("custom-dailynote") && (siblingDocs == null || siblingDocs.length == 1)) {
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
        // #78 启用日记独立排序时，日记先行
        if (sqlResult[0].ial?.includes("custom-dailynote") && g_setting.previousAndNextFollowDailynote) {
            return await getNeighborDailyNoteDoc({sqlResult: sqlResult, getNewer: isNext});
        }
        if (iCurrentDoc > 0 && isNext == false) {
            return siblingDocs[iCurrentDoc - 1];
        }
        if (iCurrentDoc + 1 < siblingDocs.length && isNext == true) {
            return siblingDocs[iCurrentDoc + 1];
        }
        // #78 默认情况 文档排序方式 升降序补充缺失的上一篇或下一篇；文件名、自然排序、创建时间排序以外的排序方式，不补充；
        if (sqlResult[0].ial?.includes("custom-dailynote")) {
            const sortMode = getNotebookSortModeF(sqlResult[0].box);
            if (isSortByNameOrCreateTime(sortMode)) {
                if (isSortAsc(sortMode)) {
                    return await getNeighborDailyNoteDoc({sqlResult: sqlResult, getNewer: isNext});
                } else {
                    // 若为降序，下一篇isNext为获取更早的日记，这里取反
                    return await getNeighborDailyNoteDoc({sqlResult: sqlResult, getNewer: !isNext});
                }
            } else {
                return null;
            }
        }
        
        return null;
    }
    return null;
}

async function addWidgetShortcutHandler(protyle:any) {
    const docId = getCurrentDocIdF();
    if (docId == null) {
        logPush("未能读取到打开文档的id");
        showMessage(lang("open_doc_first"));
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

async function turnNavigationToTop() {
    // 确认当前聚焦的是否是本文档内容
    const currentProtyle = window.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none)") as HTMLElement;
    if (!currentProtyle) {
        return;
    }
    const currentProtyleId = currentProtyle.getAttribute("data-id");
    // 如果和当前正置顶的相同，那么关闭；如果和当前正置顶的不同，关闭，并打开新的；
    if (getCurrentTopAreaProtyleId() === currentProtyleId) {
        removeToTheTop();
        return;
    } else {
        removeToTheTop();
    }
    
    // 找到当前有效的，指定之
    const navigationArea = window.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .og-hn-heading-docs-container") as HTMLElement;
    if (!navigationArea) {
        return;
    }
    // 创建占位元素
    const navigationAreaElemRect = navigationArea.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.classList.add(CONSTANTS.PLACEHOLDER_FOR_POP_OUT_CLASS_NAME);
    placeholder.style.width = `${navigationAreaElemRect.width}px`;
    placeholder.style.height = `${navigationAreaElemRect.height}px`;
    placeholder.innerHTML = lang("make_top_placeholder").replace("##", replaceShortcutString(window.siyuan.config.keymap.plugin["syplugin-hierarchyNavigate"]["make_navigation_top"].custom));
    // placeholder.style.display = 'block';
    // 添加和替换
    navigationArea.classList.add(CONSTANTS.TO_THE_TOP_CLASS_NAME);
    navigationArea.parentNode.insertBefore(placeholder, navigationArea);
    // 调整位置
    const protyleContentEle = window.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-content");
    const protyleEle = window.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none)");
    const protyleRect = protyleEle.getBoundingClientRect();
    const rect = protyleContentEle.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    // 需要从缓存中读取位置信息
    const g_setting = getReadOnlyGSettings();
    if (g_setting["topMovePosition"]) {
        // left = Math.max(g_setting["topMovePosition"]["relativeLeft"] * window.innerWidth, 32);
        // left = Math.min(left, window.innerWidth - 32);
        // top = Math.max(g_setting["topMovePosition"]["relativeTop"] * window.innerHeight, 64);
        left = protyleRect.left + protyleRect.width * g_setting["topMovePosition"].protyleRelativeLeft;
        top = protyleRect.top + protyleRect.height * g_setting["topMovePosition"].protyleRelativeTop;
    }
    navigationArea.style.left = `${left}px`;
    navigationArea.style.top = `${top}px`;
    // 添加监听，有点击事件则清除之
    // window.document.addEventListener("click", removeToTheTop);
}

export function getCurrentTopAreaProtyleId() {
    const navigationArea = window.document.querySelector(`.og-hn-heading-docs-container.${CONSTANTS.TO_THE_TOP_CLASS_NAME}`);
    let temp = navigationArea;
    let protyleElem = null;
    for (let i=0; i < 4; i++) {
        if (temp == null) {
            break;
        }
        if (temp.getAttribute("data-id")) {
            protyleElem = temp;
            break;
        }
        temp = temp.parentElement;
    }
    return protyleElem?.getAttribute("data-id");
}

export function removeToTheTop() {
    // window.document.removeEventListener("click", removeToTheTop);
    //.layout__wnd--active .protyle.fn__flex-1:not(.fn__none)
    const navigationAreaList = window.document.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.TO_THE_TOP_CLASS_NAME}`);
    if (navigationAreaList && navigationAreaList.length > 0) {
        window.document.querySelectorAll(`.${CONSTANTS.PLACEHOLDER_FOR_POP_OUT_CLASS_NAME}`).forEach(elem=>elem.remove());
        navigationAreaList.forEach((elem)=>{
            elem.classList.remove(CONSTANTS.TO_THE_TOP_CLASS_NAME);
            elem.style.left = '';
            elem.style.top = '';
        })
        return true;
    }
    return false;
}