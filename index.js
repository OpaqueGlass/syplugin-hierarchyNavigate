const siyuan = require('siyuan');

/**
 * 全局变量
 */
let g_switchTabObserver; // 页签切换与新建监视器
let g_windowObserver; // 窗口监视器
const CONSTANTS = {
    RANDOM_DELAY: 300, // 插入挂件的延迟最大值，300（之后会乘以10）对应最大延迟3秒
    OBSERVER_RANDOM_DELAY: 500, // 插入链接、引用块和自定义时，在OBSERVER_RANDOM_DELAY_ADD的基础上增加延时，单位毫秒
    OBSERVER_RANDOM_DELAY_ADD: 100, // 插入链接、引用块和自定义时，延时最小值，单位毫秒
    OBSERVER_RETRY_INTERVAL: 1000, // 找不到页签时，重试间隔
    STYLE_ID: "hierarchy-navigate-plugin-style",
    ICON_ALL: 2,
    ICON_NONE: 0,
    ICON_CUSTOM_ONLY: 1,
    PLUGIN_NAME: "og_hierachy_navigate",
    SAVE_TIMEOUT: 900,
    CONTAINER_CLASS_NAME: "og-hierachy-navigate-doc-container", 
    ARROW_CLASS_NAME: "og-hierachy-navigate-breadcrumb-arrow",
    INFO_CONTAINER_CLASS: "og-hierachy-navigate-info-container",
    PARENT_CONTAINER_ID: "og-hierachy-navigate-parent-doc-container",
    CHILD_CONTAINER_ID: "og-hierachy-navigate-children-doc-container",
    SIBLING_CONTAINER_ID: "og-hierachy-navigate-sibling-doc-container",
    INDICATOR_CLASS_NAME: "og-hierachy-navigate-doc-indicator",
    NONE_CLASS_NAME: "og-hierachy-navigate-doc-not-exist",
    NEXT_CONTAINER_CLASS_NAME: "og-hierachy-navigate-next-doc-container",
    BACKLINK_CONTAINER_CLASS_NAME: "og-hierachy-navigate-backlink-doc-container",
    POP_NONE: 0,
    POP_LIMIT: 1,
    POP_ALL: 2,
}
let g_observerRetryInterval;
let g_observerStartupRefreshTimeout;
let g_initRetryInterval;
let g_TIMER_LABLE_NAME_COMPARE = "文档导航插件";
let g_tabbarElement = undefined;
let g_saveTimeout;
let g_writeStorage;
let g_isMobile = false;
let g_mutex = 0;
let g_initFlag = false;
let g_app;
let g_setting = {
    fontSize: null,
    parentBoxCSS: null,
    siblingBoxCSS: null,
    childBoxCSS: null,
    docLinkCSS: null,
    docLinkClass: "",
    icon: null, // 0禁用 1只显示设置图标的 2显示所有
    sibling: null, // 为true则在父文档不存在时清除
    nameMaxLength: null,// 文档名称最大长度 0不限制
    docMaxNum: null, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    linkDivider: null,
    popupWindow: null,
    hideIndicator: null,
    sameWidth: null,
    adjustDocIcon: null, //调整文档图标位置
    timelyUpdate: null, // 及时响应更新（进入标签页时更新）
    immediatelyUpdate: null,// 实时响应更新
    noneAreaHide: null,
    showDocInfo: null,
    replaceWithBreadcrumb: null, // 父文档部分使用面包屑替代
    // retryForNewDoc: null, // 出错重试，目前是禁用状态
    listChildDocs: null, // 对于空白文档，使用列出子文档挂件替代
    lcdEmptyDocThreshold: null, // 插入列出子文档挂件的空文档段落块个数判定阈值
    previousAndNext: null, // 上一篇、下一篇
    alwaysShowSibling: null, // 一直显示兄弟文档区域
    mainRetry: null, // 主函数重试次数
    noChildIfHasAv: null,
    showBackLinksArea: null,
};
let g_setting_default = {
    fontSize: 12,
    parentBoxCSS: "",
    siblingBoxCSS: "",
    childBoxCSS: "",
    docLinkCSS: "",
    docLinkClass: "",
    icon: CONSTANTS.ICON_CUSTOM_ONLY, // 0禁用 1只显示设置图标的 2显示所有
    sibling: false, // 为true则在父文档不存在时清除
    nameMaxLength: 20,// 文档名称最大长度 0不限制
    docMaxNum: 512, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    limitPopUpScope: false,// 限制浮窗触发范围
    linkDivider: "", // 前缀
    popupWindow: CONSTANTS.POP_LIMIT,
    maxHeightLimit: 10,
    hideIndicator: false,
    sameWidth: 0,
    adjustDocIcon: true,
    timelyUpdate: true,
    immediatelyUpdate: false,
    noneAreaHide: false,
    showDocInfo: false,
    replaceWithBreadcrumb: true,
    // retryForNewDoc: null,
    listChildDocs: false, // 对于空白文档，使用列出子文档挂件替代
    lcdEmptyDocThreshold: 0, // 插入列出子文档挂件的空文档判定阈值（段落块）,-1为不限制、对所有父文档插入
    previousAndNext: false, // 上一篇、下一篇
    alwaysShowSibling: false, // 始终显示同级文档
    mainRetry: 5, // 主函数重试次数
    noChildIfHasAv: false, // 检查文档是否包含数据库，如果有，则不显示子文档区域
    showBackLinksArea: false, // 显示反链区域
};
/**
 * Plugin类
 */
class HierachyNavigatePlugin extends siyuan.Plugin {

    tabOpenObserver =  null;

    onload() {
        g_isMobile = isMobile();
        language = this.i18n;
        g_app = this.app;
        // 读取配置
        // TODO: 读取配置API变更
        Object.assign(g_setting, g_setting_default);

        g_writeStorage = this.saveData;

        this.addCommand({
            langKey: "go_up",
            hotkey: "⌥⌘←",
            callback: () => {
                goUpShortcutHandler();
            },
            // editorCallback: () => {
            //     goUpShortcutHandler();
            // },
            // dockCallback: ()=>{
            //     goUpShortcutHandler();
            // },
            // fileTreeCallback: () => {
            //     goUpShortcutHandler();
            // }
        });

        this.addCommand({
            langKey: "insert_lcd",
            hotkey: "",
            editorCallback: (protyle) => {
                addWidgetShortcutHandler(protyle);
            }
        });

        this.addCommand({
            langKey: "go_to_previous_doc",
            hotkey: "⌥⌘↑",
            callback: () => {
                goToPreviousDocShortcutHandler(null);
            }
            // editorCallback: (protyle) => {
            //     goToPreviousDocShortcutHandler(protyle);
            // },
            // dockCallback: ()=>{
            //     goToPreviousDocShortcutHandler(null);
            // },
            // fileTreeCallback: () => {
            //     goToPreviousDocShortcutHandler(null);
            // }
        });


        this.addCommand({
            langKey: "go_to_next_doc",
            hotkey: "⌥⌘↓",
            callback: () => {
                goToNextDocShortcutHandler(null);
            },
            // 连续切换时，使用下述多个callback并不能胜任，原因未知
            // editorCallback: (protyle) => {
            //     goToNextDocShortcutHandler(protyle);
            // },
            // dockCallback: ()=>{
            //     goToNextDocShortcutHandler(null);
            // },
            // fileTreeCallback: () => {
            //     goToNextDocShortcutHandler(null);
            // }
        });
        
        logPush('HierarchyNavigatorPluginInited');
    }
    onLayoutReady() {
        this.loadData("settings.json").then((settingCache)=>{
            // 解析并载入配置
            try {
                // let settingData = JSON.parse(settingCache);
                Object.assign(g_setting, settingCache);
                this.eventBusInnerHandler(); 
            }catch(e){
                console.warn("HN载入配置时发生错误",e);
            }
            // 开始运行
            // try {
            //     setObserver();
            //     setStyle();
            // }catch(e) {
            //     console.error("文档导航插件首次初始化失败", e);
                // g_initRetryInterval = setInterval(initRetry, 2500);
                // if (window.siyuan.layout.centerLayout) {
                //     initRetry();
                // }
            // }
            if (!initRetry()) {
                errorPush("初始化失败，2秒后执行一次重试");
                setTimeout(initRetry, 2000);
            }
        }, (e)=> {
            debugPush("配置文件读入失败", e);
        });
    }

    onunload() {
        this.el && this.el.remove();
        removeObserver();
        removeStyle();
        // 善后：关闭插件后移除已经插入的层级导航容器
        [].forEach.call(document.querySelectorAll(".og-hn-widget-container, .og-hn-heading-docs-container"), (elem)=>{
            elem.remove();
        });
    }
    // TODO: 重写载入设置
    openSetting() {
        // 生成Dialog内容

        // 创建dialog
        const settingDialog = new siyuan.Dialog({
            "title": language["setting_panel_title"],
            "content": `
            <div class="b3-dialog__content" style="flex: 1;">
                <div id="${CONSTANTS.PLUGIN_NAME}-form-content" style="overflow: auto;"></div>
            </div>
            <div class="b3-dialog__action" id="${CONSTANTS.PLUGIN_NAME}-form-action" style="max-height: 40px">
                <button class="b3-button b3-button--cancel">${language["button_cancel"]}</button><div class="fn__space"></div>
                <button class="b3-button b3-button--text">${language["button_save"]}</button>
            </div>
            `,
            "width": isMobile() ? "92vw":"1040px",
            "height": isMobile() ? "50vw":"80vh",
        });
        // console.log("dialog", settingDialog);
        const actionButtons = settingDialog.element.querySelectorAll(`#${CONSTANTS.PLUGIN_NAME}-form-action button`);
        actionButtons[0].addEventListener("click",()=>{settingDialog.destroy()}),
        actionButtons[1].addEventListener("click",()=>{
            // this.writeStorage('hello.txt', 'world' + Math.random().toFixed(2));
            debugPush('SAVING');
            let uiSettings = loadUISettings(settingForm);
            // clearTimeout(g_saveTimeout);
            // g_saveTimeout = setTimeout(()=>{
            this.saveData(`settings.json`, JSON.stringify(uiSettings));
            Object.assign(g_setting, uiSettings);
            removeStyle();
            setStyle();
            try {
                this.eventBusInnerHandler(); 
            }catch(err){
                console.error("og eventBusError", err);
            }
            debugPush("SAVED");
            settingDialog.destroy();
            // }, CONSTANTS.SAVE_TIMEOUT);
        });
        // 绑定dialog和移除操作

        // 生成配置页面
        const hello = document.createElement('div');
        const settingForm = document.createElement("form");
        settingForm.setAttribute("name", CONSTANTS.PLUGIN_NAME);
        settingForm.innerHTML = generateSettingPanelHTML([
            // 基础设定
            new SettingProperty("fontSize", "NUMBER", [0, 1024]),
            new SettingProperty("sibling", "SWITCH", null),
            new SettingProperty("popupWindow", "SELECT", [
                {value:0},
                {value:1},
                {value:2},
            ]),
            new SettingProperty("docMaxNum", "NUMBER", [0, 1024]),
            new SettingProperty("nameMaxLength", "NUMBER", [0, 1024]),
            new SettingProperty("icon", "SELECT", [
                {value:0},
                {value:1},
                {value:2}]),
            // 扩展设定
            new SettingProperty("maxHeightLimit", "NUMBER", [0, 1024]),
            new SettingProperty("sameWidth", "NUMBER", [0, 1024]),
            new SettingProperty("adjustDocIcon", "SWITCH", null),
            // new SettingProperty("timelyUpdate", "SWITCH", null),
            new SettingProperty("immediatelyUpdate", "SWITCH", null),
            new SettingProperty("replaceWithBreadcrumb", "SWITCH", null),
            new SettingProperty("listChildDocs", "SWITCH", null),
            new SettingProperty("lcdEmptyDocThreshold", "NUMBER", [-1, 1024]), // -1为不限制
            new SettingProperty("previousAndNext", "SWITCH", null),
            new SettingProperty("alwaysShowSibling", "SWITCH", null),
            new SettingProperty("mainRetry", "NUMBER", [0, 20]),
            new SettingProperty("noChildIfHasAv", "SWITCH", null),
            new SettingProperty("showBackLinksArea", "SWITCH", null),
            // CSS样式组
            new SettingProperty("showDocInfo", "SWITCH", null),
            new SettingProperty("hideIndicator", "SWITCH", null),
            new SettingProperty("noneAreaHide", "SWITCH", null),
            new SettingProperty("linkDivider", "TEXT", null),
            new SettingProperty("docLinkClass", "TEXT", null),
            new SettingProperty("parentBoxCSS", "TEXTAREA", null),
            new SettingProperty("siblingBoxCSS", "TEXTAREA", null),
            new SettingProperty("childBoxCSS", "TEXTAREA", null),
            new SettingProperty("docLinkCSS", "TEXTAREA", null),
        ]);

        hello.appendChild(settingForm);
        settingDialog.element.querySelector(`#${CONSTANTS.PLUGIN_NAME}-form-content`).appendChild(hello);
    }

    eventBusInnerHandler() {
        if (g_setting.immediatelyUpdate) {
            this.eventBus.on("ws-main", eventBusHandler);
        }else{
            this.eventBus.off("ws-main", eventBusHandler);
        }
    }
}



// debug push
let g_DEBUG = 2;
const g_NAME = "hn";
const g_FULLNAME = "层级导航";

/*
LEVEL 0 忽略所有
LEVEL 1 仅Error
LEVEL 2 Err + Warn
LEVEL 3 Err + Warn + Info
LEVEL 4 Err + Warn + Info + Log
LEVEL 5 Err + Warn + Info + Log + Debug
*/
function commonPushCheck() {
    if (window.top["OpaqueGlassDebugV2"] == undefined || window.top["OpaqueGlassDebugV2"][g_NAME] == undefined) {
        return g_DEBUG;
    }
    return window.top["OpaqueGlassDebugV2"][g_NAME];
}

function isDebugMode() {
    return commonPushCheck() > g_DEBUG;
}

function debugPush(str, ...args) {
    if (commonPushCheck() >= 5) {
        console.debug(`${g_FULLNAME}[D] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

function logPush(str, ...args) {
    if (commonPushCheck() >= 4) {
        console.log(`${g_FULLNAME}[L] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

function errorPush(str, ... args) {
    if (commonPushCheck() >= 1) {
        console.error(`${g_FULLNAME}[E] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

function warnPush(str, ... args) {
    if (commonPushCheck() >= 2) {
        console.warn(`${g_FULLNAME}[W] ${new Date().toLocaleString()} ${str}`, ...args);
    }
}

class SettingProperty {
    id;
    simpId;
    name;
    desp;
    type;
    limit;
    value;
    /**
     * 设置属性对象
     * @param {*} id 唯一定位id
     * @param {*} type 设置项类型
     * @param {*} limit 限制
     */
    constructor(id, type, limit, value = undefined) {
        this.id = `${CONSTANTS.PLUGIN_NAME}_${id}`;
        this.simpId = id;
        this.name = language[`setting_${id}_name`];
        this.desp = language[`setting_${id}_desp`];
        this.type = type;
        this.limit = limit;
        if (value) {
            this.value = value;
        }else{
            this.value = g_setting[this.simpId];
        }
    }
}

function initRetry() {
    let successFlag = false;
    try {
        removeObserver();
        removeStyle();
        setObserver();
        setStyle();
        successFlag = true;
    }catch(e) {
        warnPush("文档导航插件初始化失败", e);
    }
    if (successFlag) {
        clearInterval(g_initRetryInterval);
        logPush("文档导航插件初始化");
        g_initFlag = true;
        return true;
    }
    return false;
}


/**
 * 设置监视器Observer
 */
function setObserver() {
    if (g_isMobile) {
        g_switchTabObserver = new MutationObserver(async (mutationList) => {
            for (let mutation of mutationList) {
                // console.log("发现页签切换", mutation);
                setTimeout(async () => {
                    if (isDebugMode()) console.time(g_TIMER_LABLE_NAME_COMPARE);
                    try{
                        debugPush("移动端切换文档触发");
                        // TODO: 改为动态获取id
                        await main([mutation.target]);
                    }catch(err) {
                        console.error(err);
                    }
                    if (isDebugMode()) console.timeEnd(g_TIMER_LABLE_NAME_COMPARE);
                }, Math.round(Math.random() * CONSTANTS.OBSERVER_RANDOM_DELAY) + CONSTANTS.OBSERVER_RANDOM_DELAY_ADD);
            }
        });
        g_switchTabObserver.observe(window.document.querySelector(".protyle-background[data-node-id]"), {"attributes": true, "attributeFilter": ["data-node-id"]});
        debugPush("MOBILE_LOADED");
        try {
            debugPush("移动端立即执行触发");
            main();
        } catch(err) {
            debugPush("移动端立即main执行", err);
        }
        return;
    }
    g_switchTabObserver = new MutationObserver(async (mutationList) => {
        for (let mutation of mutationList) {
            // console.log("发现页签切换", mutation);
            setTimeout(async () => {
                if (isDebugMode()) console.time(g_TIMER_LABLE_NAME_COMPARE);
                try{
                    debugPush("由页签切换事件触发");
                    // TODO: 改为动态获取id
                    await main([mutation.target]);
                }catch(err) {
                    errorPush(err);
                }
                if (isDebugMode()) console.timeEnd(g_TIMER_LABLE_NAME_COMPARE);
            }, Math.round(Math.random() * CONSTANTS.OBSERVER_RANDOM_DELAY) + CONSTANTS.OBSERVER_RANDOM_DELAY_ADD);
        }
    });
    g_windowObserver = new MutationObserver((mutationList) => {
        for (let mutation of mutationList) {
            // console.log("发现窗口变化", mutation);
            if (mutation.removedNodes.length > 0 || mutation.addedNodes.length > 0) {
                // console.log("断开Observer");
                // tabBarObserver.disconnect();
                g_switchTabObserver.disconnect();
                clearInterval(g_observerRetryInterval);
                g_observerRetryInterval = setInterval(observerRetry, CONSTANTS.OBSERVER_RETRY_INTERVAL);
                observerRetry()
            }
            
        }
        
    });
    clearInterval(g_observerRetryInterval);
    g_observerRetryInterval = setInterval(observerRetry, CONSTANTS.OBSERVER_RETRY_INTERVAL);
    observerRetry()
    g_windowObserver.observe(window.siyuan.layout.centerLayout.element, {childList: true});
}
/**
 * 重试页签监听
 */
function observerRetry() {
    g_tabbarElement = window.siyuan.layout.centerLayout.element.querySelectorAll("[data-type='wnd'] ul.layout-tab-bar.fn__flex");
    if (g_tabbarElement.length > 0) {
        g_switchTabObserver.disconnect();
        // debugPush("重新监视页签变化g_tabbarElem", g_tabbarElement);
        g_tabbarElement.forEach((element)=>{
            g_switchTabObserver.observe(element, {"attributes": true, "attributeFilter": ["data-activetime"], "subtree": true});
            clearInterval(g_observerRetryInterval);
            // 重启监听后立刻执行检查
            if (element.children.length > 0) {
                g_observerStartupRefreshTimeout = setTimeout(async () => {
                    // console.time(g_TIMER_LABLE_NAME_COMPARE);
                    try{
                        debugPush("由重设页签监听后刷新触发");
                        // TODO
                        await main(element.children);
                    }catch (err) {
                        console.error(err);
                    }
                    // console.timeEnd(g_TIMER_LABLE_NAME_COMPARE);
                }, Math.round(Math.random() * CONSTANTS.OBSERVER_RANDOM_DELAY) + CONSTANTS.OBSERVER_RANDOM_DELAY_ADD);
            }
        });
    }
}

function removeObserver() {
    g_switchTabObserver?.disconnect();
    g_windowObserver?.disconnect();
}

function eventBusHandler(detail) {
    // console.log(detail);
    const cmdType = ["moveDoc", "rename", "removeDoc"];
    if (cmdType.indexOf(detail.detail.cmd) != -1) {
        try {
            debugPush("由 立即更新 触发");
            main();
        }catch(err) {
            errorPush(err);
        }
    }
}

async function main(targets) {
    let retryCount = 0;
    let success = false;
    let failDueToEmptyId = false;
    let errorTemp;
    debugPush("MAIN函数执行");
    do {
        retryCount++ ;
        if (g_mutex > 0) {
            debugPush("发现多实例运行，已停止");
            return;
        }
        try {
            g_mutex++;
            // 获取当前文档id
            const docId = await getCurrentDocIdF();
            debugPush(docId);
            if (!isValidStr(docId)) {
                failDueToEmptyId = true;
                debugPush(`第${retryCount}次获取文档id失败，休息一会儿后重新尝试`);
                await sleep(200);
                continue;
            }
            failDueToEmptyId = false;
            // 防止重复执行
            if (!g_setting.timelyUpdate &&
                window.document.querySelector(`.protyle-title[data-node-id="${docId}"] .og-hn-heading-docs-container`) != null) {
                    return;
            }
            debugPush("main防重复检查已通过");
            // 通过正则判断IAL，匹配指定属性是否是禁止显示的文档
            let sqlResult = await sqlAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
            debugPush("sqlResult", sqlResult);
            if (!sqlResult || sqlResult.length <= 0) {
                // debugPush(`第${retryCount}次获取文档信息失败，该文档可能是刚刚创建，休息一会儿后重新尝试`);
                // await sleep(200);
                // continue;
                logPush("文档似乎是刚刚创建，无法获取上下文信息，停止处理");
                return;
            }
            if (sqlResult && sqlResult.length >= 1 && (sqlResult[0].ial.includes("og-hn-ignore") || sqlResult[0].ial.includes("og文档导航忽略"))) {
                debugPush("检测到忽略标记，停止处理");
                return;
            }

            // 获取文档相关信息
            const [parentDoc, childDoc, siblingDoc] = await getDocumentRelations(docId, sqlResult);

            // 获取字符数
            const [convertedChildCount, totalWords] = await getChildDocumentsWordCount(childDoc, docId);
            // console.log(parentDoc, childDoc, siblingDoc);
            let widgetMode = false;
            // 检查用户设置 检查文档是否为空
            if (g_setting.listChildDocs 
                && (await isDocEmpty(docId, g_setting.lcdEmptyDocThreshold) || g_setting.lcdEmptyDocThreshold === -1)
                && !(g_setting.noChildIfHasAv && await isDocHasAv(docId))) {
                widgetMode = true;
            }
            // 生成插入文本
            const htmlElem = await generateText(parentDoc, convertedChildCount, siblingDoc, docId, totalWords, sqlResult[0], widgetMode);
            // console.log("FIN",htmlElem);
            
            // 应用插入
            setAndApply(htmlElem, docId);
            if (widgetMode) {
                // 计算
                let subCountResult = await sqlAPI(`SELECT count(*) as count FROM blocks WHERE path like "%${docId}/%" and type = 'd'`);
                debugPush("子块计数", subCountResult);
                if (subCountResult && subCountResult[0].count > 0) {
                    applyWidget(docId);
                }
            } else if (g_isMobile) {
                // 移动端切换到其他文档后，如果不更新挂件，则需要移除已有的挂件
                window.document.querySelector(`.protyle-background ~ .og-hn-widget-container`)?.remove();
            } else {
                // 电脑端移除widget
                const titleTarget = window.document.querySelector(`.protyle.fn__flex-1:not(.fn__none) .protyle-title .og-hn-widget-container`);
                if (titleTarget) {
                    titleTarget.remove();
                } else {
                    const test = window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .og-hn-widget-container`);
                    if (test) {
                        test.remove();
                    }
                }
            }
            success = true;
        }catch(err){
            warnPush(err);
            errorTemp = err;
        }finally{
            g_mutex--;
        }
        if (errorTemp) {
            debugPush("由于出现错误，终止重试", errorTemp);
            break;
        }
        if (success) {
            break;
        } else {
            await sleep(200);
        }
    }while (isValidStr(g_setting.mainRetry) && retryCount < parseInt(g_setting.mainRetry));
    if (!success && failDueToEmptyId) {
        logPush("未能获取文档id，且重试次数已达上限，停止重试");
    } else if (!success) {
        logPush("重试次数已达上限，停止重试");
        // 抛出是为了防止后续错误
        throw new Error(errorTemp);
    }
}

/**
 * 获取文档相关信息：父文档、同级文档、子文档
 */
async function getDocumentRelations(docId, sqlResult) {
    // let sqlResult = await sqlAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
     // 获取父文档
    let parentDoc = await getParentDocument(docId, sqlResult);
    
    // 获取子文档
    let childDocs = await getChildDocuments(docId, sqlResult);

    let noParentFlag = false;
    if (parentDoc.length == 0) {
        noParentFlag = true;
    }
    // 获取同级文档
    let siblingDocs = await getSiblingDocuments(docId, parentDoc, sqlResult, noParentFlag);

    // 超长部分裁剪
    if (childDocs.length > g_setting.docMaxNum && g_setting.docMaxNum != 0) {
        childDocs = childDocs.slice(0, g_setting.docMaxNum);
    }
    if (siblingDocs.length > g_setting.docMaxNum && g_setting.docMaxNum != 0) {
        siblingDocs = siblingDocs.slice(0, g_setting.docMaxNum);
    }

    // 返回结果
    return [ parentDoc, childDocs, siblingDocs ];
}

async function getParentDocument(docId, sqlResult) {
    let splitText = sqlResult[0].path.split("/");
    if (splitText.length <= 2) return [];
    let parentSqlResult = await sqlAPI(`SELECT * FROM blocks WHERE id = "${splitText[splitText.length - 2]}"`);
    return parentSqlResult;
}

async function getChildDocuments(docId, sqlResult) {
    let childDocs = await listDocsByPath({path: sqlResult[0].path, notebook: sqlResult[0].box});
    return childDocs.files;
}

async function getSiblingDocuments(docId, parentSqlResult, sqlResult, noParentFlag) {
    let siblingDocs = await listDocsByPath({path: noParentFlag ? "/" : parentSqlResult[0].path, notebook: sqlResult[0].box});
    return siblingDocs.files;
}

/**
 * 统计子文档字符数
 * @param {*} childDocs 
 * @returns 
 */
async function getChildDocumentsWordCount(childDocs, docId) {
    let totalWords = 0;
    const sqlResult = await sqlAPI(`
        SELECT SUM(length) AS count
        FROM blocks
        WHERE
            path like "%/${docId}/%"
            AND 
            type in ("p", "h", "c", "t")
        `);
    if (sqlResult[0].count) {
        return [childDocs, sqlResult[0].count];
    }
    return [childDocs, 0];
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



/**
 * 生成插入文本
 */
async function generateText(parentDoc, childDoc, siblingDoc, docId, totalWords, docSqlResult, widgetMode) {
    const CONTAINER_STYLE = ``;
    let htmlElem = document.createElement("div");
    htmlElem.classList.add("og-hn-heading-docs-container");
    htmlElem.style.fontSize = `${g_setting.fontSize}px`;
    if (g_setting.showDocInfo) {
        htmlElem.appendChild(generateInfoLine());
    }

    let parentElem = document.createElement("div");
    parentElem.classList.add(CONSTANTS.PARENT_CONTAINER_ID);
    parentElem.style.cssText = CONTAINER_STYLE;
    let parentElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
        ${language["parent_nodes"]}
    </span>`;
    let parentFlag = false;
    for (let doc of parentDoc) {
        parentElemInnerText += docLinkGenerator(doc);
        parentFlag = true;
    }
    let siblingElem = document.createElement("div");
    siblingElem.classList.add(CONSTANTS.SIBLING_CONTAINER_ID);
    siblingElem.style.cssText = CONTAINER_STYLE;
    let siblingElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}" title="${language["number_count"].replace("%NUM%", siblingDoc.length)}">
        ${language["sibling_nodes"]}
        </span>`;
    if (parentFlag && !g_setting.replaceWithBreadcrumb) {
        parentElem.innerHTML = parentElemInnerText;
        htmlElem.appendChild(parentElem);
    }else if (!g_setting.replaceWithBreadcrumb){
        // do nothing #17代码调整遗留，确认不影响后可删除
        // parentElem.innerHTML = parentElemInnerText + `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
        // parentElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        // htmlElem.appendChild(parentElem);
    }else if (g_setting.replaceWithBreadcrumb){
        parentElem.appendChild(await generateBreadCrumb());
        htmlElem.appendChild(parentElem);
    }
    // 同级文档始终显示或首层级显示
    if ((g_setting.sibling && !parentFlag) || g_setting.alwaysShowSibling){
        if (siblingDoc.length > 1) {
            for (let doc of siblingDoc) {
                let temp = docLinkGenerator(doc);
                // 对当前文档加入新样式
                if (doc.id == docId) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(temp, "text/html");
                    let tempElement = doc.body.firstChild;
                    tempElement.classList.add("og-hn-docLinksWrapper-hl");
                    temp = tempElement.outerHTML;
                }
                siblingElemInnerText += temp;
            }
        }
        
        if (siblingDoc.length > 1 && siblingElemInnerText != `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
          ${language["sibling_nodes"]}
          </span>`) {
            siblingElem.innerHTML = siblingElemInnerText;
            htmlElem.appendChild(siblingElem);
        }else{
            siblingElem.innerHTML = siblingElemInnerText + `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
            siblingElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
            htmlElem.appendChild(siblingElem);
        }
        
    }
    
    // 同一层级上下文档 紧邻的文档
    let nextDocElem = document.createElement("div");
    let nextDocInnerText = "";
    let iCurrentDoc = -1;
    if (g_setting.previousAndNext) {
        for (let iSibling = 0; iSibling < siblingDoc.length; iSibling++) {
            if (siblingDoc[iSibling].id === docId) {
                iCurrentDoc = iSibling;
                break;
            }
        }
        if (iCurrentDoc >= 0) {
            let flag = false;
            if (iCurrentDoc > 0) {
                let simpleName = language["previous_doc"] + siblingDoc[iCurrentDoc - 1]["name"];
                siblingDoc[iCurrentDoc - 1]["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                nextDocInnerText += docLinkGenerator(siblingDoc[iCurrentDoc - 1]);
                flag = true;
            }
            if (iCurrentDoc + 1 < siblingDoc.length) {
                let simpleName = language["next_doc"] + siblingDoc[iCurrentDoc + 1]["name"];
                siblingDoc[iCurrentDoc + 1]["ogSimpleName"] = simpleName.substring(0, simpleName.length - 3);
                nextDocInnerText += docLinkGenerator(siblingDoc[iCurrentDoc + 1]);
                flag = true;
            }
            if (flag) {
                // emm 宽度不一这个bug是由于其他提示词文字后面有空格导致的
                nextDocElem.innerHTML = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
                ${language["neighbor_nodes"]}
            </span>` + nextDocInnerText;
                nextDocElem.classList.add(CONSTANTS.NEXT_CONTAINER_CLASS_NAME);
                htmlElem.appendChild(nextDocElem);
            }
        }
    }

    // 反链区域
    let backLinkElem = document.createElement("div");
    if (g_setting.showBackLinksArea) {
        const backlinkResponse = await getBackLink2(docId);
        let backlinkInnerText = "";
        debugPush("backlinkResponse", backlinkResponse);
        for (let i = 0; i < backlinkResponse.backlinks.length; i++) {
            const oneBacklinkItem = backlinkResponse.backlinks[i];
            if (oneBacklinkItem.nodeType === "NodeDocument") {
                let tempDocItem = {
                    "ogSimpleName": oneBacklinkItem.name,
                    "name": oneBacklinkItem.name + ".sy",
                    "icon": "",
                    "id": oneBacklinkItem.id
                };
                debugPush("docLinkCheck", docLinkGenerator(tempDocItem));
                backlinkInnerText += docLinkGenerator(tempDocItem);
            }
        }
        if (backlinkInnerText === "") {
            backlinkInnerText = `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
            backLinkElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        }
        backLinkElem.innerHTML = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}">
        ${language["backlink_nodes"]}
        </span>` + backlinkInnerText;
        backLinkElem.classList.add(CONSTANTS.BACKLINK_CONTAINER_CLASS_NAME);
        htmlElem.appendChild(backLinkElem);
    }
    // 反链区域END

    // 如果插入挂件，则不处理子文档部分
    // 新：判断是否启用并包含数据库
    if (widgetMode || (g_setting.noChildIfHasAv && await isDocHasAv(docId))) {
        parentElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        siblingElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        siblingElem.classList.add("og-hn-container-multiline");
        nextDocElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        backLinkElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
        backLinkElem.classList.add("og-hn-container-multiline");
        return htmlElem;
    }
    let childElem = document.createElement("div");
    childElem.classList.add(CONSTANTS.CHILD_CONTAINER_ID);
    
    childElem.style.cssText = CONTAINER_STYLE;
    let childElemInnerText = `<span class="${CONSTANTS.INDICATOR_CLASS_NAME}" title="${language["number_count"].replace("%NUM%", childDoc.length)}">
        ${language["child_nodes"]}
        </span>`;
    let childFlag = false;
    for (let doc of childDoc) {
        childElemInnerText += docLinkGenerator(doc);
        childFlag = true;
    }
    if (childFlag) {
        childElem.innerHTML = childElemInnerText;
        htmlElem.appendChild(childElem);
    }else{
        childElem.innerHTML = childElemInnerText + `<span class="og-hn-doc-none-word">${language["none"]}</span>`;
        childElem.classList.add(CONSTANTS.NONE_CLASS_NAME);
        htmlElem.appendChild(childElem);
    }

    if (g_DEBUG > 1) {
        let debug = window.document.createElement("div");
        debug.setAttribute("id", "og-debug");
        htmlElem.appendChild(debug);
        g_DEBUG_ELEM = debug;
    }
    
    parentElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    siblingElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    siblingElem.classList.add("og-hn-container-multiline");
    childElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    childElem.classList.add("og-hn-container-multiline");
    nextDocElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    backLinkElem.classList.add(CONSTANTS.CONTAINER_CLASS_NAME);
    backLinkElem.classList.add("og-hn-container-multiline");
    
    return htmlElem;

    async function generateBreadCrumb() {
        const pathObject = await parseDocPath(docSqlResult);
        debugPush("pathObject", pathObject);
        const breadcrumbElem = await generateBreadCrumbElement(pathObject);
        return breadcrumbElem;
    }
    async function parseDocPath(docDetail) {
        let pathArray = docDetail.path.substring(0, docDetail.path.length - 3).split("/");
        let hpathArray = docDetail.hpath.split("/");
        let resultArray = [];
        let notebooks = getNotebooks();
        let box;
        for (let notebook of notebooks) {
            if (notebook.id == docDetail.box) {
                box = notebook;
                break;
            }
        }
        let temp = {
            "name": box.name,
            "id": box.id,
            "icon": box.icon,
            "box": box.id,
            "path": "/",
            "type": "NOTEBOOK",
            "subFileCount": 999
        }
        resultArray.push(temp);
        let temp_path = "";
        for (let i = 1; i < pathArray.length; i++) {
            let docInfoResult = await getDocInfo(pathArray[i]);
            docInfoResult["box"] = box.id; 
            docInfoResult["path"] = `${temp_path}/${pathArray[i]}.sy`;
            docInfoResult["type"] = "FILE";
            docInfoResult["name"] = docInfoResult["name"] + ".sy";
            // let temp = {
            //     "name": hpathArray[i],
            //     "id": pathArray[i],
            //     "icon": "",
            //     "path": `${temp_path}/${pathArray[i]}.sy`,
            //     "box": box.id,
            //     "type": "FILE",
            // }
            temp_path += "/" + pathArray[i];
            resultArray.push(docInfoResult);
        }
        return resultArray;
    }
    async function generateBreadCrumbElement(pathObjects, docId) {
        const divideArrow = `<span class="og-fake-breadcrumb-arrow-span" data-type="%4%" data-parent-id="%5%"><svg class="${CONSTANTS.ARROW_CLASS_NAME}"
            data-type="%4%" data-parent-id="%5%">
            <use xlink:href="#iconRight"></use></svg></span>`;
        const oneItem = `<span class="protyle-breadcrumb__item fake-breadcrumb-click" data-node-id="%0%" data-type="%3%" data-node-names="%NAMES%">
            <span class="protyle-breadcrumb__text" title="%1%">%2%</span>
        </span>
        `;
        let htmlStr = "";
        for (let i = 0; i < pathObjects.length; i++) {
            let onePathObject = pathObjects[i];
            if ((g_setting.showNotebook && i == 0) || i != 0) {
                htmlStr += docLinkGenerator(pathObjects[i]);
            }
            htmlStr += divideArrow
                .replaceAll("%4%", onePathObject.type)
                .replaceAll("%5%", pathObjects[i].id);
        }
    
        let result = document.createElement("div");
        // let barElement = document.createElement("div");
        // barElement.classList.add("protyle-breadcrumb__bar");
        // barElement.classList.add("protyle-breadcrumb__bar--nowrap");
        result.innerHTML = htmlStr;
        // result.appendChild(barElement);
        result.classList.add("og-hn-parent-area-replace-with-breadcrumb");
        // result.classList.add("protyle-breadcrumb");
        return result;
    }

    function generateInfoLine() {
        let thisDocInfos = null;
        // 检索兄弟文档
        for (const sibling of siblingDoc) {
            if (sibling.id == docId) {
                thisDocInfos = sibling;
                break;
            }
        }
        let firstLineElem = document.createElement("div");
        firstLineElem.classList.add(CONSTANTS.INFO_CONTAINER_CLASS);
        firstLineElem.style.cssText = CONTAINER_STYLE;
        let notebooks = getNotebooks();
        let box;
        for (let notebook of notebooks) {
            if (notebook.id == docSqlResult.box) {
                box = notebook;
                break;
            }
        }
        let infoElemInnerText = `<span class="og-hn-create-at-wrapper">
            <span class="og-hn-create-at-indicator">${language["create_at"]}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hCtime"]}</span>
        </span>
        <span class="og-hn-modify-at-wrapper">
            <span class="og-hn-modify-at-indicator">${language["update_at"]}</span> 
            <span class="og-hn-create-at-content">${thisDocInfos["hMtime"]}</span>
        </span>
        <span class="og-hn-child-doc-count-wrapper">
        ${language["child_count"].replace("%NUM%", `<span class="og-hn-child-doc-count-content">${childDoc.length}</span>`)} 
        </span>
        ${childDoc.length == 0 ? "" : 
        `<span class="og-hn-child-word-count-wrapper">
            <span class="og-hn-child-word-count-indicator">${language["child_word_count"]}</span> 
            <span class="og-hn-child-word-count-content">${totalWords}</span>
        </span>`}
        
        <span class="og-hn-notebook-wrapper">
            ${box.name}
        </span>
        `;
        firstLineElem.innerHTML = infoElemInnerText;
        return firstLineElem;
    }

    function docLinkGenerator(doc) {
        let emojiStr = getEmojiHtmlStr(doc.icon, doc?.subFileCount != 0);
        let docName = isValidStr(doc?.name) ? doc.name.substring(0, doc.name.length - 3) : doc.content;
        // docName = Lute.EscapeHTMLStr(docName);
        let trimDocName = docName;
        if (doc["ogSimpleName"]) {
            trimDocName = doc["ogSimpleName"];
        }
        // 文件名长度限制
        if (docName.length > g_setting.nameMaxLength && g_setting.nameMaxLength != 0) trimDocName = trimDocName.substring(0, g_setting.nameMaxLength) + "...";

        let result = "";
        switch (parseInt(g_setting.popupWindow)) {
            case CONSTANTS.POP_ALL: {
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "": escapeClass(g_setting.docLinkClass)}"
                    data-type='block-ref'
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px;"
                    title="${docName}"
                    data-id="${doc.id}">
                        <span class="og-hn-emoji-and-name">
                        ${emojiStr}<span class="trimDocName">${trimDocName}</span>
                        </span>
                    </span>`
                break;
            }
            case CONSTANTS.POP_LIMIT:{
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "":escapeClass(g_setting.docLinkClass)}"
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px; "
                    title="${docName}"
                    data-id="${doc.id}">
                        <span class="og-hn-emoji-and-name">
                        <span data-type='block-ref'
                        data-subtype="d"
                        data-id="${doc.id}"
                        >${emojiStr}</span><span class="trimDocName">${trimDocName}</span>
                        </span>
                    </span>`
                break;
            }
            case CONSTANTS.POP_NONE: {
                result = `<span class="refLinks docLinksWrapper ${g_setting.docLinkClass == null ? "":escapeClass(g_setting.docLinkClass)}"
                    data-subtype="d"
                    style="font-size: ${g_setting.fontSize}px;"
                    title="${docName}"
                    data-id="${doc.id}">
                    <span class="og-hn-emoji-and-name">
                        ${emojiStr}<span class="trimDocName">${trimDocName}</span>
                    </span>
                    </span>`
                break;
            }
            default: {
                console.warn("WARN数据格式不正常");
                g_setting.icon = g_setting_default.icon;
                g_writeStorage("settings.json", JSON.stringify(g_setting));
            }
        }
        return result;
        function escapeClass(val) {
            if (!val) return "";
            return val.replaceAll(`"`, "");
        }
    }
}

function applyWidget(docId) {
    const htmleText = `
    <div class="og-hn-widget-container ${g_isMobile ? "og-hn-mobile": ""}">
    <iframe src="/widgets/listChildDocs-dev" data-subtype="widget" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; height: ${window.screen.availWidth - 75}px;"></iframe>
    </div>
    `;
    if (g_isMobile) {
        // 移动端需要重写
        window.document.querySelector(`.protyle-background ~ .og-hn-widget-container`)?.remove();
        window.document.querySelector(`.og-hn-heading-docs-container`).insertAdjacentHTML("afterend", htmleText);
        return;
    }
    if (window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .og-hn-widget-container`) != null) {
        debugPush("挂件：已经插入，不再执行");
        return;
    }

    let attrTarget = window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title .protyle-attr`);
    if (!attrTarget) {
        debugPush("焦点未聚焦于标签页，尝试对第一个捕获页面添加");
        attrTarget = window.document.querySelector(`.protyle.fn__flex-1:not(.fn__none) .protyle-title .protyle-attr`);
        if (window.document.querySelector(`.protyle.fn__flex-1:not(.fn__none) .og-hn-widget-container`) != null) {
           debugPush("挂件已存在");
            return;
        }
    }else if (g_setting.timelyUpdate){
        const test = window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .og-hn-widget-container`);
        if (test) {
            debugPush("挂件已存在");
            return;
        }
    }
    if (attrTarget) {
        if (attrTarget.parentElement.dataset.nodeId != docId) {
            debugPush("挂件插入已定位标签页，但不匹配，停止", attrTarget, attrTarget.parentElement.dataset.nodeId, docId);
            return;
        }
        attrTarget.insertAdjacentHTML("beforebegin", htmleText);
        debugPush("插入挂件成功");
    }else{
        debugPush("未找到标签页");
    }
    
}

function setAndApply(htmlElem, docId) {
    if (g_isMobile) {
        window.document.querySelector(`.protyle-background ~ .og-hn-heading-docs-container`)?.remove();
        // if (window.document.querySelector(`.protyle-background[data-node-id="${docId}"] .og-hn-heading-docs-container`) != null) return;
        htmlElem.style.paddingLeft = "24px";
        htmlElem.style.paddingRight = "16px";
        htmlElem.style.paddingTop = "16px";
        window.document.querySelector(`.protyle-background[data-node-id]`).insertAdjacentElement("afterend", htmlElem);
        [].forEach.call(window.document.querySelectorAll(`.og-hn-heading-docs-container span.refLinks`), (elem)=>{
            elem.addEventListener("click", openRefLink);
        });
        if (g_setting.replaceWithBreadcrumb) {
            [].forEach.call(window.document.querySelectorAll(`.og-hn-parent-area-replace-with-breadcrumb .og-fake-breadcrumb-arrow-span[data-type="FILE"], .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"]`), (elem)=>{
                elem.removeEventListener("click", openRelativeMenu);
                elem.addEventListener("click", openRelativeMenu);
            });
        }
        debugPush("安卓端写入完成", docId);
        return;
    }
    if (!g_setting.timelyUpdate &&
        window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .og-hn-heading-docs-container`) != null) {
        debugPush("已经插入，不再执行");
        return;
    }
    // if (window.document.querySelector(`.protyle-title[data-node-id="${docId}"] .og-hn-heading-docs-container`) != null) return;
    let titleTarget = window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-title .protyle-title__input`);
    if (!titleTarget) {
        debugPush("焦点未聚焦于标签页，尝试对第一个捕获页面添加");
        titleTarget = window.document.querySelector(`.protyle.fn__flex-1:not(.fn__none) .protyle-title .protyle-title__input`);
        if (titleTarget.parentElement.dataset.nodeId != docId) {
            debugPush("已定位标签页，但不匹配", titleTarget.parentElement.dataset.nodeId, docId);
            return;
        }
        if (window.document.querySelector(`.protyle.fn__flex-1:not(.fn__none) .og-hn-heading-docs-container`) != null) {
            if (g_setting.timelyUpdate) {
                window.document.querySelector(`.protyle.fn__flex-1:not(.fn__none) .og-hn-heading-docs-container`).remove();
                debugPush("已经移除");
            }else{
                debugPush("已经插入，不再执行");
                return;
            }
        }
    }else if (g_setting.timelyUpdate){
        const test = window.document.querySelector(`.layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .og-hn-heading-docs-container`);
        if (test) {
            test.remove();
            debugPush("已经移除");
        }
    }
    if (titleTarget) {
        // 判断目标是否一致
        if (titleTarget.parentElement.dataset.nodeId != docId) {
            debugPush("已定位标签页，但不匹配", titleTarget.parentElement.dataset.nodeId, docId);
            return;
        }
        debugPush("重写的htmlElem", htmlElem)
        titleTarget.insertAdjacentElement("afterend",htmlElem);
        [].forEach.call(window.document.querySelectorAll(`.og-hn-heading-docs-container  span.refLinks`), (elem)=>{
            elem.addEventListener("click", openRefLink);
        });
        if (g_setting.replaceWithBreadcrumb) {
            [].forEach.call(window.document.querySelectorAll(`.og-hn-parent-area-replace-with-breadcrumb .og-fake-breadcrumb-arrow-span[data-type="FILE"], .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"]`), (elem)=>{
                elem.removeEventListener("click", openRelativeMenu);
                elem.addEventListener("click", openRelativeMenu);
            });
        }
        debugPush("重写成功");
    }else{
        debugPush("未找到标签页");
    }
}

function setStyle() {
    const head = document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.setAttribute("id", CONSTANTS.STYLE_ID);
    let linkWidthRestrict = g_setting.sameWidth == 0 ? "" : `
    .og-hn-heading-docs-container span.docLinksWrapper {
        width: ${g_setting.sameWidth}em;
    }`;
    let noIndicatorStyle = g_setting.hideIndicator ? `
    .og-hn-heading-docs-container .og-hierachy-navigate-doc-indicator {
        display:none;
    }
    `:"";
    let iconAdjustStyle = g_setting.adjustDocIcon ? `
    .protyle-title__icon {
        top: 25px;
    }
    `:"";

    let noneDisplayStyle = g_setting.noneAreaHide ? `
    .${CONSTANTS.NONE_CLASS_NAME} {
        display: none;
    }
    ` : "";
    // 第二行后对齐链接文本，（向内缩进： #21）
    let alignStyle = `
    .og-hn-container-multiline {
        text-indent: -2.28em;
        padding-left: 2.28em;
        overflow-x: hidden;
        /* #30 2.28em与100%导致宽度溢出 */
        padding-right: 0em;
        width: auto;
    }
    .og-hn-container-multiline .og-hierachy-navigate-doc-indicator {
        
    }
    .og-hn-container-multiline .og-hn-emoji-and-name {
        text-indent: 0px;
    }

    .og-hn-container-multiline .og-hn-doc-none-word {
        text-indent: 0px;
    }
    
    `;

    const defaultLinkStyle = `
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper{
        background-color: var(--b3-protyle-code-background);/*var(--b3-protyle-inline-code-background); --b3-protyle-code-background  --b3-theme-surface-light*/
        color: var(--b3-protyle-inline-code-color);
        line-height: ${g_setting.fontSize + 2}px;
        font-weight: 400;
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        padding: 4px 6px;
        border-radius: ${(g_setting.fontSize + 2)}px;
        transition: var(--b3-transition);
        margin-bottom: 3px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper.og-hn-docLinksWrapper-hl {
        background-color: color-mix(in srgb, var(--b3-protyle-code-background) 95%, var(--b3-theme-on-background));
        border: 0.55px dashed color-mix(in srgb, var(--b3-protyle-code-background) 35%, var(--b3-theme-on-background));
    }

    .${CONSTANTS.CONTAINER_CLASS_NAME} span.og-hn-emoji-and-name {
        margin: 0 auto; /*居中显示*/
        text-overflow: ellipsis;
        overflow: hidden;
    }
    .og-hierachy-navigate-sibling-doc-container  span.refLinks, 
    .og-hierachy-navigate-children-doc-container span.refLinks,
    .og-hierachy-navigate-next-doc-container span.refLinks {
        margin-right: 10px;
    }
    `;

    style.innerHTML = `

    .og-hn-doc-none-word {
        background-color: #d23f3155;/*var(--b3-protyle-inline-code-background); --b3-protyle-code-background  --b3-theme-surface-light*/
        width: 2.5em;
        text-align: center;
        display: inline-grid !important;
        color: var(--b3-theme-on-background);
        line-height: ${g_setting.fontSize + 2}px;
        font-weight: 400;
        align-items: center;
        box-sizing: border-box;
        /* #30 调整padding左右，尽量避免换行导致右侧大量留白 */
        padding: 4px 4px;
        border-radius: ${(g_setting.fontSize + 2)}px;
        transition: var(--b3-transition);
        margin-bottom: 3px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .og-hn-heading-docs-container span.docLinksWrapper:hover {
        cursor: pointer;
        box-shadow: 0 0 2px var(--b3-list-hover);
        opacity: .86;
        /*background-color: var(--b3-toolbar-hover);*/
        /*text-decoration: underline;*/
    }

    .og-hn-heading-docs-container .trimDocName {
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .og-hn-heading-docs-container {
        padding: 0px 6px;
    }

    ${iconAdjustStyle}

    ${linkWidthRestrict}

    ${noIndicatorStyle}

    ${noneDisplayStyle}

    ${g_setting.hideIndicator ? "" : alignStyle}

    .og-hierachy-navigate-doc-container {
        max-height: ${g_setting.maxHeightLimit}em;
        overflow-y: auto;
    }

    .og-hierachy-navigate-doc-container + .og-hierachy-navigate-doc-container {
        padding-top: 3px;
    }

    .og-hn-create-at-wrapper, .og-hn-modify-at-wrapper, .og-hn-child-doc-count-wrapper, .og-hn-child-word-count-wrapper {
        margin-right: 8px;
    }

    .og-hn-create-at-indicator, .og-hn-modify-at-indicator, .og-hn-child-word-count-indicator, .og-hn-child-doc-count-wrapper {
        color: var(--b3-theme-on-surface);
    }

    .og-hn-create-at-content, .og-hn-modify-at-content, .og-hn-child-word-count-content, .og-hn-child-doc-count-content {
        font-weight: 600;
        color: var(--b3-theme-on-background);
    }

    .og-hn-notebook-wrapper {
        color: var(--b3-theme-on-background);
    }

    .og-hierachy-navigate-info-container {
        margin-bottom: 7px;
    }

    .${CONSTANTS.CONTAINER_CLASS_NAME} {
        text-align: left;
    }

    /* 面包屑箭头 */
    .og-hn-heading-docs-container .og-fake-breadcrumb-arrow-span .${CONSTANTS.ARROW_CLASS_NAME} {
        height: 10px;
        width: 10px;
        color: var(--b3-theme-on-surface-light);
        margin: 0 4px;
        flex-shrink: 0;
    }

    .og-hn-heading-docs-container .og-fake-breadcrumb-arrow-span {
        display: inline-block;
        cursor: pointer;
    }

    .og-hn-parent-area-replace-with-breadcrumb .docLinksWrapper {
        margin: 0 auto;
    }

    .og-hn-widget-container {
        border-bottom: solid 1px var(--b3-border-color);

    }

    .og-hn-widget-container {
        padding: 0px 6px;
    }

    .og-hn-widget-container.og-hn-mobile {
        padding-top: 16px;
        padding-left: 24px;
        padding-right: 16px;
    } 

    ${g_setting.docLinkCSS == g_setting_default.docLinkCSS && g_setting.docLinkClass == g_setting_default.docLinkClass? defaultLinkStyle:""}
    .${CONSTANTS.PARENT_CONTAINER_ID} {${styleEscape(g_setting.parentBoxCSS)}}

    .${CONSTANTS.CHILD_CONTAINER_ID} {${styleEscape(g_setting.childBoxCSS)}}

    .${CONSTANTS.SIBLING_CONTAINER_ID} {${styleEscape(g_setting.siblingBoxCSS)}}

    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper {${styleEscape(g_setting.docLinkCSS)}}
    `;
    head.appendChild(style);
}

function styleEscape(str) {
    if (!str) return "";
    return str.replace(new RegExp("<[^<]*style[^>]*>", "g"), "");
}

function removeStyle() {
    document.getElementById(CONSTANTS.STYLE_ID)?.remove();
}

function getNotebooks() {
    let notebooks = window.top.siyuan.notebooks;
    return notebooks;
}

/**
 * 完全移植自FakeDocBreadcrumb插件，需要同步更改
 * @param {*} event 
 * @returns 
 */
async function openRelativeMenu(event) {
    let id = event.currentTarget.getAttribute("data-parent-id");
    let rect = event.currentTarget.getBoundingClientRect();
    event.stopPropagation();
    event.preventDefault();
    let sqlResult = await sqlAPI(`SELECT * FROM blocks WHERE id = '${id}'`);
    if (sqlResult.length == 0) {
        sqlResult = [{
            path: "/",
            box: id
        }];
    }
    let siblings = await getChildDocuments(id, sqlResult);
    if (siblings.length <= 0) return;
    const tempMenu = new siyuan.Menu("newMenu");
    for (let i = 0; i < siblings.length; i++) {
        let currSibling = siblings[i];
        currSibling.name = currSibling.name.substring(0, currSibling.name.length - 3);
        let trimedName = currSibling.name.length > g_setting.nameMaxLength ? 
            currSibling.name.substring(0, g_setting.nameMaxLength) + "..."
            : currSibling.name;
        let tempMenuItemObj = {
            label: `<span class="${CONSTANTS.MENU_ITEM_CLASS_NAME}" 
                data-doc-id="${currSibling.id}"
                title="${currSibling.name}">
                ${trimedName}
            </span>`,
            click: (event)=>{
                let docId = event.querySelector("[data-doc-id]")?.getAttribute("data-doc-id")
                openRefLink(undefined, docId, {
                    ctrlKey: event?.ctrlKey,
                    shiftKey: event?.shiftKey,
                    altKey: event?.altKey});
            }
        }
        if (currSibling.icon != "" && currSibling.icon.indexOf(".") == -1) {
            tempMenuItemObj["icon"] = `icon-${currSibling.icon}`;
        }
        tempMenu.addItem(tempMenuItemObj);
    }

    tempMenu.open({x: rect.left, y: rect.bottom, isLeft:false});
    
}

async function goUpShortcutHandler() {
    const docId = await getCurrentDocIdF();
    if (docId == null) {
        logPush("未能读取到打开文档的id");
        return ;
    }
    // 通过正则判断IAL，匹配指定属性是否是禁止显示的文档
    let sqlResult = await sqlAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
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
        pushMsg(language["is_top_document"], 2000)
    }
}

async function goToPreviousDocShortcutHandler(protyle) {
    debugPush("前往上一篇文档", protyle);
    const previousDoc = await getSiblingDocsForNeighborShortcut(protyle, false);
    debugPush("previousDoc", previousDoc);
    if (previousDoc) {
        // 打开
        // openRefLink(undefined, previousDoc.id);
        await siyuan.openTab({
            app: g_app,
            doc: {
                id: previousDoc.id,
            }
        });
    } else {
        // 提示
        pushMsg(language["is_first_document"], 2000);
    }
}

async function goToNextDocShortcutHandler(protyle) {
    const nextDoc = await getSiblingDocsForNeighborShortcut(protyle, true);
    debugPush("nextDoc", nextDoc);
    if (nextDoc) {
        // openRefLink(undefined, nextDoc.id);
        await siyuan.openTab({
            app: g_app,
            doc: {
                id: nextDoc.id,
            }
        });
    } else {
        // 提示
        pushMsg(language["is_last_document"], 2000);
    }
}

async function getSiblingDocsForNeighborShortcut(protyle, isNext) {
    let siblingDocs = null;
    let docId;
    if (protyle) {
        docId = protyle.block.rootID;
        const parentSqlResult = await getParentDocument(protyle.block.rootID, [{box: protyle.notebookId, path: protyle.path}]);
        debugPush("parentSQLRESULT", parentSqlResult);
        siblingDocs = await getSiblingDocuments(protyle.block.rootID, parentSqlResult, [{box: protyle.notebookId, path: protyle.path}], parentSqlResult.length == 0 ? true : false);
    } else {
        docId = await getCurrentDocIdF();
        let sqlResult = await sqlAPI(`SELECT * FROM blocks WHERE id = "${docId}"`);
        if (!sqlResult || sqlResult.length <= 0) {
            // debugPush(`第${retryCount}次获取文档信息失败，该文档可能是刚刚创建，休息一会儿后重新尝试`);
            // await sleep(200);
            // continue;
            debugPush("文档似乎是刚刚创建，无法获取上下文信息，停止处理");
            return;
        }
        const parentSqlResult = await getParentDocument(docId, sqlResult);
        siblingDocs = await getSiblingDocuments(docId, parentSqlResult, sqlResult, parentSqlResult.length == 0 ? true : false);
    }
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

async function addWidgetShortcutHandler(protyle) {
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

function getFocusedBlock() {
    if (document.activeElement.classList.contains('protyle-wysiwyg')) {
        /* 光标在编辑区内 */
        let block = window.getSelection()?.focusNode?.parentElement; // 当前光标
        while (block != null && block?.dataset?.nodeId == null) block = block.parentElement;
        return block;
    }
    else return null;
}

function getFocusedBlockId() {
    const focusedBlock = getFocusedBlock();
    if (focusedBlock == null) {
        return null;
    }
    return focusedBlock.dataset.nodeId;
}

/**
 * 插入块（返回值有删减）
 * @param {string} text 文本
 * @param {string} blockid 指定的块
 * @param {string} textType 插入的文本类型，"markdown" or "dom"
 * @param {string} addType 插入到哪里？默认插入为指定块之后，NEXT 为插入到指定块之前， PARENT 为插入为指定块的子块
 * @return 对象，为response.data[0].doOperations[0]的值，返回码为-1时也返回null
 */
async function insertBlockAPI(text, blockid, addType = "previousID", textType = "markdown", ){
    let url = "/api/block/insertBlock";
    let data = {dataType: textType, data: text};
    switch (addType) {
        case "parentID":
        case "PARENT":
        case "parentId": {
            data["parentID"] = blockid;
            break;
        }
        case "nextID":
        case "NEXT":
        case "nextId": {
            data["nextID"] = blockid;
            break;
        }
        case "previousID":
        case "PREVIOUS":
        case "previousId": 
        default: {
            data["previousID"] = blockid;
            break;
        }
    }
    let response = await request(url, data);
    try{
        if (response.code == 0 && response.data != null && isValidStr(response.data[0].doOperations[0].id)){
            return response.data[0].doOperations[0];
        }
        if (response.code == -1){
            console.warn("插入块失败", response.msg);
            return null;
        }
    }catch(err){
        console.error(err);
        console.warn(response.msg);
    }
    return null;

}

/**
 * 在html中显示文档icon
 * @param {*} iconString files[x].icon
 * @param {*} hasChild 
 * @returns 
 */
function getEmojiHtmlStr(iconString, hasChild) {
    if (g_setting.icon == CONSTANTS.ICON_NONE) return g_setting.linkDivider;
    // 无emoji的处理
    if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_ALL) return hasChild ? "📑" : "📄";//无icon默认值
    if ((iconString == undefined || iconString == null ||iconString == "") && g_setting.icon == CONSTANTS.ICON_CUSTOM_ONLY) return g_setting.linkDivider;
    let result = iconString;
    // emoji地址判断逻辑为出现.，但请注意之后的补全
    if (iconString.indexOf(".") != -1) {
        result = `<img class="iconpic" style="width: ${g_setting.fontSize}px" src="/emojis/${iconString}"/>`;
    } else {
        result = `<span class="emojitext">${emojiIconHandler(iconString, hasChild)}</span>`;
    }
    return result;
}
let emojiIconHandler = function (iconString, hasChild = false) {
    //确定是emojiIcon 再调用，printer自己加判断
    try {
        let result = "";
        iconString.split("-").forEach(element => {
            result += String.fromCodePoint("0x" + element);
        });
        return result;
    } catch (err) {
        console.error("emoji处理时发生错误", iconString, err);
        return hasChild ? "📑" : "📄";
    }
}

async function request(url, data) {
    let resData = null;
    await fetch(url, {
        body: JSON.stringify(data),
        method: 'POST'
    }).then(function (response) {
        resData = response.json();
    });
    return resData;
}

async function parseBody(response) {
    let r = await response;
    return r.code === 0 ? r.data : null;
}

async function pushMsg(msg, timeout = 4500) {
    let url = '/api/notification/pushMsg';
    let data = {
        "msg": msg,
        "timeout": timeout
    }
    return parseBody(request(url, data));
}

async function listDocsByPath({path, notebook = undefined, sort = undefined, maxListLength = undefined}) {
    let data = {
        path: path
    };
    if (notebook) data["notebook"] = notebook;
    if (sort) data["sort"] = sort;
    if (g_setting.docMaxNum != 0) {
        data["maxListCount"] = g_setting.docMaxNum >= 32 ? g_setting.docMaxNum : 32;
    } else {
        data["maxListCount"] = 0;
    }
    let url = '/api/filetree/listDocsByPath';
    return parseBody(request(url, data));
    //文档hepath与Markdown 内容
}

async function getBackLink2(id, sort = "3", msort= "3", k = "", mk = "") {
    let data = {
        "id": id,
        "sort": sort,
        "msort": msort,
        "k": k,
        "mk": mk
    };
    let url = `/api/ref/getBacklink2`;
    return parseBody(request(url, data));
}

async function sqlAPI(stmt) {
    let data = {
        "stmt": stmt
    };
    let url = `/api/query/sql`;
    return parseBody(request(url, data));
}

async function getTreeStat(id) {
    let data = {
        "id": id
    };
    let url = `/api/block/getTreeStat`;
    return parseBody(request(url, data));
}

async function getDocInfo(id) {
    let data = {
        "id": id
    };
    let url = `/api/block/getDocInfo`;
    return parseBody(request(url, data));
}

async function getKramdown(blockid){
    let data = {
        "id": blockid
    };
    let url = "/api/block/getBlockKramdown";
    let response = await parseBody(request(url, data));
    if (response) {
        return response.kramdown;
    }
}

async function isDocHasAv(docId) {
    let sqlResult = await sqlAPI(`
    SELECT count(*) as avcount FROM blocks WHERE root_id = '${docId}'
    AND type = 'av'
    `);
    debugPush("文档 av判断", sqlResult);
    if (sqlResult.length > 0 && sqlResult[0].avcount > 0) {
        return true;
    } else {
        
        return false;
    }
}

async function isDocEmpty(docId, blockCountThreshold = 0) {
    // 检查父文档是否为空
    let treeStat = await getTreeStat(docId);
    if (blockCountThreshold == 0 && treeStat.wordCount != 0 && treeStat.imageCount != 0) {
        debugPush("treeStat判定文档非空，不插入挂件");
        return false;
    }
    if (blockCountThreshold != 0) {
        let blockCountSqlResult = await sqlAPI(`SELECT count(*) as bcount FROM blocks WHERE root_id like '${docId}' AND type in ('p', 'c', 'iframe', 'html', 'video', 'audio', 'widget', 'query_embed', 't')`);
        if (blockCountSqlResult.length > 0) {
            if (blockCountSqlResult[0].bcount > blockCountThreshold) {
                return false;
            } else {
                return true;
            }
        }
    }
    
    let sqlResult = await sqlAPI(`SELECT markdown FROM blocks WHERE 
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
    // 获取父文档内容
    let parentDocContent = await getKramdown(docId);
    // 简化判断，过长的父文档内容必定有文本，不插入 // 作为参考，空文档的kramdown长度约为400
    if (parentDocContent.length > 1000) {
        debugPush("父文档较长，认为非空，不插入挂件", parentDocContent.length);
        return;
    }
    // console.log(parentDocContent);
    // 清理ial和换行、空格
    let parentDocPlainText = parentDocContent;
    // 清理ial中的对象信息（例：文档块中的scrool字段），防止后面匹配ial出现遗漏
    parentDocPlainText = parentDocPlainText.replace(new RegExp('\\"{[^\n]*}\\"', "gm"), "\"\"")
    // console.log("替换内部对象中间结果", parentDocPlainText);
    // 清理ial
    parentDocPlainText = parentDocPlainText.replace(new RegExp('{:[^}]*}', "gm"), "");
    // 清理换行
    parentDocPlainText = parentDocPlainText.replace(new RegExp('\n', "gm"), "");
    // 清理空格
    parentDocPlainText = parentDocPlainText.replace(new RegExp(' +', "gm"), "");
    debugPush(`父文档文本（+标记）为 ${parentDocPlainText}`);
    debugPush(`父文档内容为空？${parentDocPlainText == ""}`);
    if (parentDocPlainText != "") return false;
    return true;
}

async function getCurrentDocIdF() {
    let thisDocId;
    thisDocId = window.top.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
    debugPush("thisDocId by first id", thisDocId);
    if (!thisDocId && g_isMobile) {
        // UNSTABLE: 面包屑样式变动将导致此方案错误！
        try {
            let temp;
            temp = window.top.document.querySelector(".protyle-breadcrumb .protyle-breadcrumb__item .popover__block[data-id]")?.getAttribute("data-id");
            let iconArray = window.top.document.querySelectorAll(".protyle-breadcrumb .protyle-breadcrumb__item .popover__block[data-id]");
            for (let i = 0; i < iconArray.length; i++) {
                let iconOne = iconArray[i];
                if (iconOne.children.length > 0 
                    && iconOne.children[0].getAttribute("xlink:href") == "#iconFile"){
                    temp = iconOne.getAttribute("data-id");
                    break;
                }
            }
            thisDocId = temp;
        }catch(e){
            console.error(e);
            temp = null;
        }
    }
    // retry 重新尝试一下下
    // let retryCount = 20;
    // while(!thisDocId && retryCount >= 0) {
    //     thisDocId = window.top.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
    //     debugPush(window.top.document.querySelector(".layout__wnd--active .protyle.fn__flex-1:not(.fn__none) .protyle-background"));
    //     await sleep(1000);
    //     retryCount--;
    //     debugPush("重新尝试获取");
    // }
    if (!thisDocId) {
        thisDocId = window.top.document.querySelector(".protyle.fn__flex-1:not(.fn__none) .protyle-background")?.getAttribute("data-node-id");
        debugPush("thisDocId by background must match,  id", thisDocId);
    }
    return thisDocId;
}

function sleep(time){
    return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * 在点击<span data-type="block-ref">时打开思源块/文档
 * 为引入本项目，和原代码相比有更改
 * @refer https://github.com/leolee9086/cc-template/blob/6909dac169e720d3354d77685d6cc705b1ae95be/baselib/src/commonFunctionsForSiyuan.js#L118-L141
 * @license 木兰宽松许可证
 * @param {点击事件} event 
 */
let openRefLink = function(event, paramId = ""){
    
    let 主界面= window.parent.document
    let id = event?.currentTarget?.getAttribute("data-id") ?? paramId;
    // 处理笔记本等无法跳转的情况
    if (!isValidStr(id)) {return;}
    event?.preventDefault();
    event?.stopPropagation();
    let 虚拟链接 =  主界面.createElement("span")
    虚拟链接.setAttribute("data-type","block-ref")
    虚拟链接.setAttribute("data-id",id)
    虚拟链接.style.display = "none";//不显示虚拟链接，防止视觉干扰
    let 临时目标 = 主界面.querySelector(".protyle-wysiwyg div[data-node-id] div[contenteditable]")
    临时目标.appendChild(虚拟链接);
    let clickEvent = new MouseEvent("click", {
        ctrlKey: event?.ctrlKey,
        shiftKey: event?.shiftKey,
        altKey: event?.altKey,
        bubbles: true
    });
    虚拟链接.dispatchEvent(clickEvent);
    虚拟链接.remove();
}

function isValidStr(s){
    if (s == undefined || s == null || s === '') {
		return false;
	}
	return true;
}

let zh_CN = {
    "parent_nodes": "父：",
    "child_nodes": "子：",
    "sibling_nodes": "兄：",
    "none": "无",
    "setting_panel_title": "文档层级导航插件设置",
    "setting_fontSize_name": "字号",
    "setting_fontSize_desp": "单位：px",
    "setting_nameMaxLength_name": "文档名最大显示长度",
    "setting_nameMaxLength_desp": "限制文档链接的长度，设置为0则不限制。（单位：em）",
    "setting_docMaxNum_name": "文档最大数量",
    "setting_docMaxNum_desp": "当子文档或同级文档超过该值时，后续文档将不再显示。设置为0则不限制。",
    "setting_icon_name": "文档图标",
    "setting_icon_desp": "控制文档图标显示与否",
    "setting_sibling_name": "文档上级为笔记本时，显示同级文档",
    "setting_docLinkClass_name": "文档链接样式Class",
    "setting_docLinkClass_desp": "文档链接所属的CSS class，用于套用思源已存在的样式类。例：<code>b3-chip b3-chip--middle b3-chip--pointer</code>",
    "setting_popupWindow_name": "浮窗触发范围",
    "setting_docLinkCSS_name": "链接样式CSS",
    "setting_docLinkCSS_desp": "设置后，将同时禁用默认样式。您也可以在代码片段中使用选择器<code>.og-hierachy-navigate-doc-container span.docLinksWrapper</code>部分覆盖样式",
    "setting_childBoxCSS_name": "子文档容器CSS",
    "setting_parentBoxCSS_name": "父文档容器CSS",
    "setting_siblingBoxCSS_name": "同级文档容器CSS",
    "setting_parentBoxCSS_desp": "如果不修改，请留空。",
    "setting_childBoxCSS_desp": "如果不修改，请留空。",
    "setting_siblingBoxCSS_desp": "如果不修改，请留空。",
    "setting_linkDivider_name": "禁用图标时文档名前缀",
    "setting_linkDivider_desp": "在没有图标的文档链接前，加入该前缀。浮窗设置为“仅图标触发”时，前缀也用于触发浮窗。",
    "setting_icon_option_0": "不显示",
    "setting_icon_option_1": "仅自定义",
    "setting_icon_option_2": "显示全部",
    "setting_popupWindow_option_0": "不触发",
    "setting_popupWindow_option_1": "仅图标触发",
    "setting_popupWindow_option_2": "全部触发",
    "setting_maxHeightLimit_name": "最大高度限制",
    "setting_maxHeightLimit_desp": "限制子文档导航容器的最大高度，过多时需要滚动查看",
    "error_initFailed": "文档导航插件初始化失败，如果可以，请向开发者反馈此问题",
}

let en_US = {}
let language = zh_CN;

/**
 * 由需要的设置项生成设置页面
 * @param {*} settingObject 
 */
function generateSettingPanelHTML(settingObjectArray) {
    let resultHTML = "";
    for (let oneSettingProperty of settingObjectArray) {
        let inputElemStr = "";
        oneSettingProperty.desp = oneSettingProperty.desp?.replace(new RegExp("<code>", "g"), "<code class='fn__code'>");
        if (oneSettingProperty.name.includes("🧪")) {
            oneSettingProperty.desp = language["setting_experimental"] + oneSettingProperty.desp;
        }
        let temp = `
        <label class="fn__flex b3-label">
            <div class="fn__flex-1">
                ${oneSettingProperty.name}
                <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
            </div>
            <span class="fn__space"></span>
            *#*##*#*
        </label>
        `;
        switch (oneSettingProperty.type) {
            case "NUMBER": {
                let min = oneSettingProperty.limit[0];
                let max = oneSettingProperty.limit[1];
                inputElemStr = `<input 
                    class="b3-text-field fn__flex-center fn__size200" 
                    id="${oneSettingProperty.id}" 
                    type="number" 
                    name="${oneSettingProperty.simpId}"
                    ${min == null || min == undefined ? "":"min=\"" + min + "\""} 
                    ${max == null || max == undefined ? "":"max=\"" + max + "\""} 
                    value="${oneSettingProperty.value}">`;
                break;
            }
            case "SELECT": {

                let optionStr = "";
                for (let option of oneSettingProperty.limit) {
                    let optionName = option.name;
                    if (!optionName) {
                        optionName = language[`setting_${oneSettingProperty.simpId}_option_${option.value}`];
                    }
                    optionStr += `<option value="${option.value}" 
                    ${option.value == oneSettingProperty.value ? "selected":""}>
                        ${optionName}
                    </option>`;
                }
                inputElemStr = `<select 
                    id="${oneSettingProperty.id}" 
                    name="${oneSettingProperty.simpId}"
                    class="b3-select fn__flex-center fn__size200">
                        ${optionStr}
                    </select>`;
                break;
            }
            case "TEXT": {
                inputElemStr = `<input class="b3-text-field fn__flex-center fn__size200" id="${oneSettingProperty.id}" name="${oneSettingProperty.simpId}" value="${oneSettingProperty.value}"></input>`;
                temp = `
                <label class="fn__flex b3-label config__item">
                    <div class="fn__flex-1">
                        ${oneSettingProperty.name}
                        <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
                    </div>
                    *#*##*#*
                </label>`
                break;
            }
            case "SWITCH": {
                inputElemStr = `<input 
                class="b3-switch fn__flex-center"
                name="${oneSettingProperty.simpId}"
                id="${oneSettingProperty.id}" type="checkbox" 
                ${oneSettingProperty.value?"checked=\"\"":""}></input>
                `;
                break;
            }
            case "TEXTAREA": {
                inputElemStr = `<textarea 
                name="${oneSettingProperty.simpId}"
                class="b3-text-field fn__block" 
                id="${oneSettingProperty.id}">${oneSettingProperty.value}</textarea>`;
                temp = `
                <label class="b3-label fn__flex">
                    <div class="fn__flex-1">
                        ${oneSettingProperty.name}
                        <div class="b3-label__text">${oneSettingProperty.desp??""}</div>
                        <div class="fn__hr"></div>
                        *#*##*#*
                    </div>
                </label>`
                break;
            }
        }
        
        resultHTML += temp.replace("*#*##*#*", inputElemStr);
    }
    // console.log(resultHTML);
    return resultHTML;
}

/**
 * 由配置文件读取配置
 */
function loadCacheSettings() {
    // 检索当前页面所有设置项元素

}

/**
 * 由设置界面读取配置
 */
function loadUISettings(formElement) {
    let data = new FormData(formElement);
    // 扫描标准元素 input[]
    let result = {};
    for(const [key, value] of data.entries()) {
        // console.log(key, value);
        result[key] = value;
        if (value === "on") {
            result[key] = true;
        }else if (value === "null" || value == "false") {
            result[key] = "";
        }
    }
    let checkboxes = formElement.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
        let checkbox = checkboxes[i];
        // console.log(checkbox, checkbox.name, data[checkbox.name], checkbox.name);
        if (result[checkbox.name] == undefined) {
            result[checkbox.name] = false;
        }
    }

    let numbers = formElement.querySelectorAll("input[type='number']");
    // console.log(numbers);
    for (let number of numbers) {
        let minValue = number.getAttribute("min");
        let maxValue = number.getAttribute("max");
        let value = parseFloat(number.value);

        if (minValue !== null && value < parseFloat(minValue)) {
            number.value = minValue;
            result[number.name] = parseFloat(minValue);
        } else if (maxValue !== null && value > parseFloat(maxValue)) {
            number.value = maxValue;
            result[number.name] = parseFloat(maxValue);
        } else {
            result[number.name] = value;
        }
    }

    debugPush("UI SETTING", result);
    return result;
}

function isMobile() {
    return window.top.document.getElementById("sidebar") ? true : false;
};

module.exports = {
    default: HierachyNavigatePlugin,
};