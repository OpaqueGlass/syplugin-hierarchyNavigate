import { TabProperty, ConfigProperty, loadAllConfigPropertyFromTabProperty } from "../utils/settings";
import { createApp, ref, watch } from "vue";
import settingVue from "../components/settings/setting.vue";
import { getPluginInstance } from "@/utils/getInstance";
import { debugPush, logPush, warnPush } from "@/logger";
import { CONSTANTS, LINK_SORT_TYPES, PRINTER_NAME } from "@/constants";
import { setStyle } from "@/worker/setStyle";
import { DOC_SORT_TYPES, getJSONFile, isMobile } from "@/syapi";
import { isValidStr } from "@/utils/commonCheck";
import * as siyuan from "siyuan";
import outdatedSettingVue from "@/components/dialog/outdatedSetting.vue";
import { generateUUID } from "@/utils/common";
import { lang } from "@/utils/lang";

// const pluginInstance = getPluginInstance();

const settingDefinition = new Array<IConfigProperty>;

let setting: any = ref({});

interface IPluginSettings {
    fontSize: number,
    parentBoxCSS: string,
    siblingBoxCSS: string,
    childBoxCSS: string,
    docLinkCSS: string,
    docLinkClass: string,
    icon: string, // 0禁用 1只显示设置图标的 2显示所有
    sibling: boolean, // 为true则在父文档不存在时清除
    nameMaxLength: number,// 文档名称最大长度 0不限制
    docMaxNum: number, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    // limitPopUpScope: false,// 限制浮窗触发范围
    linkDivider: string, // 前缀
    popupWindow: string,
    maxHeightLimit: number,
    hideIndicator: boolean,
    sameWidth: number,
    // adjustDocIcon: boolean, // v1.4.0+弃用
    // timelyUpdate: true,// 在页签切换后立刻刷新，该选项已废弃，默认启用
    immediatelyUpdate: boolean,
    noneAreaHide: boolean,
    showDocInfo: boolean,
    replaceWithBreadcrumb: boolean,
    // retryForNewDoc: null,
    listChildDocs: boolean, // 对于空白文档，使用列出子文档挂件替代
    lcdEmptyDocThreshold: number, // 插入列出子文档挂件的空文档判定阈值（段落块）,-1为不限制、对所有父文档插入
    previousAndNext: boolean, // 上一篇、下一篇
    alwaysShowSibling: boolean, // 始终显示同级文档
    mainRetry: number, // 主函数重试次数
    noChildIfHasAv: boolean, // 检查文档是否包含数据库，如果有，则不显示子文档区域
    showBackLinksType: string, // 显示反链区域
    openDocContentGroup: string[],
    mobileContentGroup: string[],
    flashcardContentGroup: string[],
    enableForOtherCircumstance: boolean, // 在其他情况也显示导航 v1.4.0+弃用
    sameWidthColumn: number, // 等宽列
    sameWidthColumnMobile: number,
    previousAndNextFollowDailynote: boolean,
    mobileBackReplace: boolean,
    mobileRemoveAllArea: boolean,
    doNotAddToTitle: boolean,
    areaBorder: boolean,
    debugMode: boolean,
    showNotebookInBreadcrumb: boolean,
    areaHideFrom: number,
    removeRegStrListForLinks: string,
    pinRegStrListForLinks: string,
    orderByForBackLink: string,
    openDocClickListenerCompatibilityMode: boolean,
};
let defaultSetting: any = {
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
    // limitPopUpScope: false,// 限制浮窗触发范围
    linkDivider: "", // 前缀
    popupWindow: CONSTANTS.POP_LIMIT,
    maxHeightLimit: 10,
    hideIndicator: false,
    sameWidth: 0,
    // adjustDocIcon: false, // v1.4.0+弃用
    // timelyUpdate: true,// 在页签切换后立刻刷新，该选项已废弃，默认启用
    // immediatelyUpdate: false, // 数据库更新后立即执行，重构后无法实现，已弃用
    noneAreaHide: false,
    // showDocInfo: false, // 弃用，换为排序方式
    // replaceWithBreadcrumb: true, // 弃用，换为排序方式
    // retryForNewDoc: null,
    // listChildDocs: false, // 对于空白文档，使用列出子文档挂件替代 // 弃用，换为排序方式
    lcdEmptyDocThreshold: 0, // 插入列出子文档挂件的空文档判定阈值（段落块）,-1为不限制、对所有父文档插入
    // previousAndNext: false, // 上一篇、下一篇 // 弃用，换为排序方式
    // alwaysShowSibling: false, // 始终显示同级文档 // 弃用，换为排序方式
    mainRetry: 5, // 主函数重试次数
    noChildIfHasAv: false, // 检查文档是否包含数据库，如果有，则不显示子文档区域
    showBackLinksType: CONSTANTS.BACKLINK_NORMAL, // 显示反链区域
    openDocContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.CHILD],
    mobileContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.CHILD],
    flashcardContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.BLOCK_BREADCRUMB],
    // enableForOtherCircumstance: false, // 在其他情况也显示导航 v1.4.0+弃用
    childOrder: "FOLLOW_DOC_TREE", // 子文档部分排序方式
    showHiddenDoc: false,
    // previousAndNextHiddenDoc: true, // 同级文档显示隐藏文档 v1.4.0+弃用
    hideBlockBreadcrumbInDesktop: true,
    sameWidthColumn: 6,
    sameWidthColumnMobile: 3,
    previousAndNextFollowDailynote: true,
    mobileBackReplace: false,
    mobileRemoveAllArea: false,
    doNotAddToTitle: true,
    areaBorder: false,
    debugMode: false,
    showNotebookInBreadcrumb: false,
    areaHideFrom: 0,
    removeRegStrListForLinks: "",
    pinRegStrListForLinks: "",
    sortForBackLink: LINK_SORT_TYPES.NAME_NATURAL_ASC,
    sortForForwardLink: LINK_SORT_TYPES.NAME_NATURAL_ASC,
    openDocClickListenerCompatibilityMode: false,
}


let tabProperties: Array<TabProperty> = [
    
];
let updateTimeout: any = null;


/**
 * 设置项初始化
 * 应该在语言文件载入完成后调用执行
 */
export function initSettingProperty() {
    const allOptions = Object.values(PRINTER_NAME);
    const generalOptions = [PRINTER_NAME.PARENT, PRINTER_NAME.CHILD, PRINTER_NAME.SIBLING, PRINTER_NAME.PREV_NEXT, PRINTER_NAME.BACKLINK, PRINTER_NAME.BREADCRUMB, PRINTER_NAME.INFO, PRINTER_NAME.WIDGET, PRINTER_NAME.ON_THIS_DAY, PRINTER_NAME.FORWARDLINK];
    
    const flashCardOptions = [PRINTER_NAME.PARENT, PRINTER_NAME.CHILD, PRINTER_NAME.SIBLING, PRINTER_NAME.PREV_NEXT, PRINTER_NAME.BACKLINK, PRINTER_NAME.BREADCRUMB, PRINTER_NAME.INFO, PRINTER_NAME.WIDGET, PRINTER_NAME.BLOCK_BREADCRUMB];
    tabProperties.push(
        new TabProperty({key: "content", "iconKey": "iconOrderedList", props:[
            new ConfigProperty({"key": "contentOrderTip", "type": "TIPS"}),
            new ConfigProperty({"key": "openDocContentGroup", "type": "ORDER", "options": generalOptions}),
            new ConfigProperty({"key": "mobileContentGroup", "type": "ORDER", "options": generalOptions}),
            new ConfigProperty({"key": "flashcardContentGroup", "type": "ORDER", "options": flashCardOptions}),
            
        ]}),
        new TabProperty({key: "showType", "iconKey": "iconTags", props: {
            "showOrNot": [
                new ConfigProperty({"key": "noChildIfHasAv", "type": "SWITCH"}),
                new ConfigProperty({"key": "sibling", "type": "SWITCH"}),
                new ConfigProperty({"key": "hideBlockBreadcrumbInDesktop", "type": "SWITCH"}),
                new ConfigProperty({"key": "showNotebookInBreadcrumb", "type": "SWITCH"}),
                new ConfigProperty({"key": "hideIndicator", "type": "SWITCH"}),
                new ConfigProperty({"key": "noneAreaHide", "type": "SWITCH"}),
            ],
            "order": [
                new ConfigProperty({"key": "childOrder", "type": "SELECT", "options": Object.keys(DOC_SORT_TYPES)}),
                new ConfigProperty({"key": "sortForBackLink", "type": "SELECT", "options": Object.values(LINK_SORT_TYPES)}),
            ],
            "extend": [
                new ConfigProperty({"key": "showHiddenDoc", "type": "SWITCH"}),
                new ConfigProperty({"key": "lcdEmptyDocThreshold", "type": "NUMBER", "min": -1}),
                new ConfigProperty({"key": "showBackLinksType", "type": "SELECT", "options": [CONSTANTS.BACKLINK_NORMAL, CONSTANTS.BACKLINK_DOC_ONLY]}),
                new ConfigProperty({"key": "pinRegStrListForLinks", "type": "TEXTAREA"}), 
                new ConfigProperty({"key": "removeRegStrListForLinks", "type": "TEXTAREA"}), 
            ],
            }
        }),
        new TabProperty({key: "general", "iconKey": "iconSettings", props: 
            [
                new ConfigProperty({"key": "fontSize", "type": "NUMBER"}),
                new ConfigProperty({"key": "popupWindow", "type": "SELECT", options: [CONSTANTS.POP_NONE, CONSTANTS.POP_LIMIT, CONSTANTS.POP_ALL]}),
                new ConfigProperty({"key": "docMaxNum", "type": "NUMBER"}),
                new ConfigProperty({"key": "nameMaxLength", "type": "NUMBER"}),
                new ConfigProperty({"key": "icon", "type": "SELECT", options: [CONSTANTS.ICON_NONE, CONSTANTS.ICON_CUSTOM_ONLY, CONSTANTS.ICON_ALL]}),
                new ConfigProperty({"key": "linkDivider", "type": "TEXT"}),
                new ConfigProperty({"key": "areaHideFrom", "type": "NUMBER", min: 0, max: 15}),
                
                // new ConfigProperty({"key": "mainRetry", "type": "NUMBER", "max": 3}),
                new ConfigProperty({"key": "mobileBackReplace", "type": "SWITCH"}),
                new ConfigProperty({"key": "mobileRemoveAllArea", "type": "SWITCH"}),
            ],
            // "extend": [
            //     new ConfigProperty({"key": "mobileBackReplace", "type": "SWITCH"}),
            //     new ConfigProperty({"key": "mobileRemoveAllArea", "type": "SWITCH"}),
            // ]
        }),
        new TabProperty({"key": "appearance", "iconKey": "iconTheme", props: [
            new ConfigProperty({"key": "maxHeightLimit", "type": "NUMBER"}),
            new ConfigProperty({"key": "sameWidthColumn", "type": "NUMBER", min: 0, max: 15}),
            new ConfigProperty({"key": "sameWidthColumnMobile", "type": "NUMBER", min: 0, max: 15}),
            new ConfigProperty({"key": "sameWidth", "type": "NUMBER"}),
            new ConfigProperty({"key": "areaBorder", "type": "SWITCH"}),
            new ConfigProperty({"key": "docLinkClass", "type": "TEXT"}),
            new ConfigProperty({"key": "parentBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "siblingBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "childBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "docLinkCSS", "type": "TEXTAREA"}),
        ]}),
        new TabProperty({"key": "lab", "iconKey": "iconHelp", props: {
            "ing": [
                
                new ConfigProperty({"key": "removeRegStrListForLinks", "type": "TEXTAREA"}), 
                new ConfigProperty({"key": "pinRegStrListForLinks", "type": "TEXTAREA"}), 
                new ConfigProperty({"key": "sortForBackLink", "type": "SELECT", "options": Object.values(LINK_SORT_TYPES)}),
                new ConfigProperty({"key": "openDocClickListenerCompatibilityMode", "type": "SWITCH"}), 
            ],
            "stop": [
                new ConfigProperty({"key": "doNotAddToTitle", "type": "SWITCH"}), // 移除此项时注意appler判断了此项开启时允许右键行为
                new ConfigProperty({"key": "previousAndNextFollowDailynote", "type": "SWITCH"}),
            ]},
        }),
        new TabProperty({"key": "about", "iconKey": "iconInfo", props: [
            new ConfigProperty({"key": "aboutAuthor", "type": "TIPS"}),
            new ConfigProperty({"key": "settingIconTips", "type": "TIPS"}),
            new ConfigProperty({"key": "debugMode", "type": "SWITCH"}),
        ]}),
    );
}

export function getTabProperties() {
    return tabProperties;
}

// 发生变动之后，由界面调用这里
export function saveSettings(newSettings: any) {
    // 如果有必要，需要判断当前设备，然后选择保存位置
    debugPush("界面调起保存设置项", newSettings);
    getPluginInstance().saveData("settings_main.json", JSON.stringify(newSettings, null, 4));
}


/**
 * 仅用于初始化时载入设置项
 * 请不要重复使用
 * @returns 
 */
export async function loadSettings() {
    let loadResult = null;
    // 这里从文件载入
    loadResult = await getPluginInstance().loadData("settings_main.json");
    debugPush("文件载入设置", loadResult);
    if (loadResult == undefined || loadResult == "") {
        let oldSettings = await transferOldSetting();
        debugPush("oldSettings", oldSettings);
        if (oldSettings != null) {
            debugPush("使用转换后的旧设置", oldSettings);
            loadResult = oldSettings;
        } else {
            loadResult = defaultSetting;
        }
    }
    const currentVersion = 20240818;
    if (!loadResult["@version"] || loadResult["@version"] < currentVersion) {
        // 旧版本
        loadResult["@version"] = currentVersion;
        // loadResult["doNotAddToTitle"] = true;
        // loadResult["adjustDocIcon"] = false;
        // 检查数组中指定设置和defaultSetting是否一致
        showOutdatedSettingWarnDialog(checkOutdatedSettings(loadResult), defaultSetting);
    }
    // showOutdatedSettingWarnDialog(checkOutdatedSettings(loadResult), defaultSetting);
    // 检查选项类设置项，如果发现不在列表中的，重置为默认
    try {
        loadResult = checkSettingType(loadResult);
    } catch(err) {
        logPush("设置项类型检查时发生错误", err);
    }
    
    // 如果有必要，判断设置项是否对当前设备生效
    // TODO: 对于Order，switch需要进行检查，防止版本问题导致选项不存在，不存在的用默认值
    // TODO: switch旧版需要迁移，另外引出迁移逻辑
    setting.value = Object.assign(defaultSetting, loadResult);
    logPush("载入设置项", setting.value);
    // return loadResult;
    watch(setting, (newVal) => {
        // 延迟更新
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        logPush("检查到变化");
        updateTimeout = setTimeout(() => {
            // updateSingleSetting(key, newVal);
            saveSettings(newVal);
            // logPush("保存设置项", newVal);
            setStyle();
            changeDebug(newVal);
            updateTimeout = null;
        }, 1000);
    }, {deep: true, immediate: false});
}

function checkOutdatedSettings(loadSetting) {
    const CHECK_SETTING_KEYS = ["previousAndNextFollowDailynote",
        "doNotAddToTitle",
    ];
    let result = [];
    for (let key of CHECK_SETTING_KEYS) {
        if (loadSetting[key] != defaultSetting[key]) {
            result.push(key);
        }
    }
    return result;
}

function showOutdatedSettingWarnDialog(outdatedSettingKeys, defaultSettings) {
    if (outdatedSettingKeys.length == 0) {
        return;
    }
    const app = createApp(outdatedSettingVue, {"outdatedKeys": outdatedSettingKeys, "defaultSettings": defaultSettings});
    const uid = generateUUID();
    const settingDialog = new siyuan.Dialog({
            "title": lang("dialog_panel_plugin_name") + lang("dialog_panel_outdate"),
            "content": `
            <div id="og_plugintemplate_${uid}" class="b3-dialog__content" style="overflow: hidden; position: relative;height: 100%;"></div>
            `,
            "width": isMobile() ? "42vw":"520px",
            "height": isMobile() ? "auto":"auto",
            "destroyCallback": ()=>{app.unmount();},
        });
    app.mount(`#og_plugintemplate_${uid}`);
    return;
}

function changeDebug(newVal) {
    if (newVal.debugMode) {
        debugPush("调试模式已开启");
        window.top["OpaqueGlassDebug"] = true;
        if (window.top["OpaqueGlassDebugV2"]["hn"]) {
            window.top["OpaqueGlassDebugV2"]["hn"] = 5;
        } else {
            window.top["OpaqueGlassDebugV2"] = {
                "hn": 5
            }
        }
        
    } else {
        debugPush("调试模式已关闭");
        if (window.top["OpaqueGlassDebugV2"]["hn"]) {
            delete window.top["OpaqueGlassDebugV2"]["hn"];
        }
    }
}

function checkSettingType(input:any) {
    const propertyMap = loadAllConfigPropertyFromTabProperty(tabProperties)
    for (const prop of Object.values(propertyMap)) {
        if (prop.type == "SELECT") {
            if (!prop.options.includes(input[prop.key])) {
                input[prop.key] = defaultSetting[prop.key];
            }
            // input[prop.key] = String(input[prop.key]);
        } else if (prop.type == "ORDER") {
            const newOrder = [];
            for (const item of input[prop.key]) {
                if (Object.values(PRINTER_NAME).includes(item)) {
                    newOrder.push(item);
                }
            }
            input[prop.key] = newOrder;
        } else if (prop.type == "SWITCH") {
            if (input[prop.key] == undefined) {
                input[prop.key] = defaultSetting[prop.key];
            }
        } else if (prop.type == "NUMBER") {
            if (isValidStr(input[prop.key])) {
                input[prop.key] = parseFloat(input[prop.key]);
            }
        }
    }
    return input;
}

async function transferOldSetting() {
    const oldSettings = await getPluginInstance().loadData("settings.json");
    // TODO: 判断并迁移设置项
    let newSetting = Object.assign({}, oldSettings);
    if (oldSettings == null || oldSettings == "") {
        return null;
    }
    /* 获取用户原始的排序信息 */
    let openDocGroupArray = [];
    if (oldSettings.showDocInfo) {
        debugPush("旧设置展示了文档信息");
        openDocGroupArray.push(PRINTER_NAME.INFO);
    }
    if (oldSettings.replaceWithBreadcrumb) {
        debugPush("旧设置显示了面包屑");
        openDocGroupArray.push(PRINTER_NAME.BREADCRUMB);
    } else {
        openDocGroupArray.push(PRINTER_NAME.PARENT);
    }
    if (oldSettings.alwaysShowSibling) {
        debugPush("旧设置：总是同级");
        openDocGroupArray.push(PRINTER_NAME.SIBLING);
        newSetting.sibling = false;
    }
    if (oldSettings.previousAndNext) {
        debugPush("旧设置：上下");
        openDocGroupArray.push(PRINTER_NAME.PREV_NEXT);
    }
    if (oldSettings.showBackLinksArea != undefined && oldSettings.showBackLinksArea != 0) {
        debugPush("旧设置：反链");
        openDocGroupArray.push(PRINTER_NAME.BACKLINK);
        const newType = [CONSTANTS.BACKLINK_NONE, CONSTANTS.BACKLINK_NORMAL, CONSTANTS.BACKLINK_DOC_ONLY];
        newSetting.showBackLinksType = newType[oldSettings.showBackLinksArea];
    }
    if (oldSettings.listChildDocs) {
        openDocGroupArray.push(PRINTER_NAME.WIDGET);
    } else {
        openDocGroupArray.push(PRINTER_NAME.CHILD)
    }
    newSetting.openDocContentGroup = openDocGroupArray;
    newSetting.mobileContentGroup = openDocGroupArray;
    /* 转换类型发生变化的select */
    const newIcon = [CONSTANTS.ICON_NONE, CONSTANTS.ICON_CUSTOM_ONLY, CONSTANTS.ICON_ALL];
    const newPopup = [CONSTANTS.POP_NONE, CONSTANTS.POP_LIMIT, CONSTANTS.POP_ALL];
    if (oldSettings.icon != undefined) {
        newSetting.icon = newIcon[oldSettings.icon];
    }
    if (oldSettings.popupWindow != undefined) {
        newSetting.popupWindow = newPopup[oldSettings.popupWindow];
    }

    // 移除过时的设置项
    for (let key of Object.keys(newSetting)) {
        if (!(key in defaultSetting)) {
            delete newSetting[key];
        }
    }
    newSetting = Object.assign(defaultSetting, newSetting);
    
    return newSetting;
}

export function getGSettings() {
    // logPush("getConfig", setting.value, setting);
    // 改成 setting._rawValue不行
    return setting;
}

export function getReadOnlyGSettings() {
    return setting._rawValue;
}

export function getDefaultSettings() {
    return defaultSetting;
}

export function getSettingPanelApp() {
    
}

export function updateSingleSetting(key: string, value: any) {
    // 对照检查setting的类型
    // 直接绑定@change的话，value部分可能传回event
    // 如果700毫秒内没用重复调用，则执行保存
    
}

