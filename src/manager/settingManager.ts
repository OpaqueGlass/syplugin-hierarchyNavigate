import { CONSTANTS, LINK_SORT_TYPES, PRINTER_NAME } from "@/constants";
import Notebookorder from "@/components/settings/notebookorder.vue";
import { recalcMultilineColumnWidthOnSettingsChange } from "@/worker/contentApplyer";
import { fixListChildDocsSrc, isWrongListChildDocsSrcExist } from "@/worker/fixListChildDocsSrc";
import { setStyle } from "@/worker/setStyle";
import { DOC_SORT_TYPES } from "siyuan-plugin-uni-helper/api";
import { debugPush, getPluginInstance, lang, showPluginMessage } from "siyuan-plugin-uni-helper/core";
import {
    ConfigProperty,
    TabProperty,
    createSettingManager,
    loadAllConfigPropertyFromTabProperty,
} from "siyuan-plugin-uni-helper/settings";

interface IPluginSettings {
    fontSize: number,
    relativeFontSize: number,
    parentBoxCSS: string,
    siblingBoxCSS: string,
    childBoxCSS: string,
    docLinkCSS: string,
    docLinkClass: string,
    icon: string, // 0禁用 1只显示设置图标的 2显示所有
    sibling: boolean, // 为true则在父文档不存在时清除
    nameMaxLength: number,// 文档名称最大长度 0不限制
    docMaxNum: number, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    linkDivider: string, // 前缀
    popupWindow: string,
    maxHeightLimit: number,
    hideIndicator: boolean,
    sameWidth: number,
    sameMaxWidth: number,
    immediatelyUpdate: boolean,
    noneAreaHide: boolean,
    showDocInfo: boolean,
    replaceWithBreadcrumb: boolean,
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
    normalEndContentGroup: string[],
    enableForPopOverCircumstance: boolean, // 在其他情况也显示导航 v1.4.0+弃用
    previousAndNextFollowDailynote: boolean,
    mobileBackReplace: boolean,
    mobileRemoveAllArea: boolean,
    areaBorder: boolean,
    debugMode: boolean,
    showNotebookInBreadcrumb: boolean,
    areaHideFrom: number,
    removeRegStrListForLinks: string,
    pinRegStrListForLinks: string,
    orderByForBackLink: string,
    openDocClickListenerCompatibilityMode: boolean,
    autoRemoveOldTabJudgeMiliseconds: number,
    openDocRemoveCurrentTab: string,
    requestAllDocIcon: boolean,
    asapRefresh: boolean,
    performanceMode: boolean,
    docNameCentering: boolean,
    endDocAreaPaddingTop: boolean,
};
const defaultSetting: any = {
    fontSize: 12,
    relativeFontSize: 0,
    parentBoxCSS: "",
    siblingBoxCSS: "",
    childBoxCSS: "",
    docLinkCSS: "",
    docLinkClass: "",
    icon: CONSTANTS.ICON_ALL, // 0禁用 1只显示设置图标的 2显示所有
    sibling: false, // 为true则在父文档不存在时清除
    nameMaxLength: 20,// 文档名称最大长度 0不限制
    docMaxNum: 128, // API最大文档显示数量 0不限制（请求获取全部子文档），建议设置数量大于32
    linkDivider: "● ", // 前缀
    popupWindow: CONSTANTS.POP_LIMIT,
    maxHeightLimit: 10,
    hideIndicator: false,
    sameWidth: 0,
    sameMaxWidth: 20,
    immediatelyUpdate: true, // 文档移动、删除、重命名等变更后立即执行
    noneAreaHide: false,
    lcdEmptyDocThreshold: 0, // 插入列出子文档挂件的空文档判定阈值（段落块）,-1为不限制、对所有父文档插入
    mainRetry: 5, // 主函数重试次数
    noChildIfHasAv: false, // 检查文档是否包含数据库，如果有，则不显示子文档区域
    showBackLinksType: CONSTANTS.BACKLINK_NORMAL, // 显示反链区域
    openDocContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.CHILD],
    mobileContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.CHILD],
    flashcardContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.BLOCK_BREADCRUMB],
    normalEndContentGroup: [],
    enableForPopOverCircumstance: true, // 在其他情况也显示导航
    enableForPreview: false, // 在预览时也显示导航
    childOrder: "FOLLOW_DOC_TREE", // 子文档部分排序方式
    showHiddenDoc: false,
    hideBlockBreadcrumbInDesktop: true,
    previousAndNextFollowDailynote: false,
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
    autoRemoveOldTabJudgeMiliseconds: 0,
    openDocRemoveCurrentTab: CONSTANTS.REMOVE_CURRENT_TAB_DEFAULT,
    requestAllDocIcon: false,
    performanceMode: false,
    docNameCentering: true,
    endDocAreaPaddingTop: true,
    keepTempTop: false,
    alignToGrid: true,
}

let tabProperties: Array<TabProperty> = [

];

/**
 * 设置项初始化
 * 应该在语言文件载入完成后调用执行
 */
export function initSettingProperty() {
    const allOptions = Object.values(PRINTER_NAME);
    const generalOptions = [PRINTER_NAME.PARENT, PRINTER_NAME.CHILD, PRINTER_NAME.SIBLING, PRINTER_NAME.PARENT_SIBLING, PRINTER_NAME.PREV_NEXT, PRINTER_NAME.BACKLINK, PRINTER_NAME.BREADCRUMB, PRINTER_NAME.INFO, PRINTER_NAME.WIDGET, PRINTER_NAME.ON_THIS_DAY, PRINTER_NAME.FORWARDLINK, PRINTER_NAME.PREV_NEXT_PREVIEW, PRINTER_NAME.PREVIEW_BOX];

    const flashCardOptions = [PRINTER_NAME.PARENT, PRINTER_NAME.CHILD, PRINTER_NAME.SIBLING, PRINTER_NAME.PARENT_SIBLING, PRINTER_NAME.PREV_NEXT, PRINTER_NAME.BACKLINK, PRINTER_NAME.BREADCRUMB, PRINTER_NAME.INFO, PRINTER_NAME.WIDGET, PRINTER_NAME.BLOCK_BREADCRUMB];
    tabProperties.push(
        new TabProperty({key: "content", "iconKey": "iconOrderedList", props: {
            "basic":
            [
                new ConfigProperty({"key": "contentOrderTip", "type": "TIPS"}),
                new ConfigProperty({"key": "openDocContentGroup", "type": "ORDER", "options": generalOptions}),
                new ConfigProperty({"key": "mobileContentGroup", "type": "ORDER", "options": generalOptions}),
                new ConfigProperty({"key": "flashcardContentGroup", "type": "ORDER", "options": flashCardOptions}),
                new ConfigProperty({"key": "normalEndContentGroup", "type": "ORDER", "options": generalOptions}),

            ],
            "notebook": [
                new ConfigProperty({"key": "notebookOpenDocContentGroup", "type": "CUSTOM_NOTEBOOK", "component": Notebookorder})
            ]
        }
        }),
        new TabProperty({key: "showType", "iconKey": "iconTags", showColumnAsGroup: true, props: {
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
                new ConfigProperty({"key": "relativeFontSize", "type": "NUMBER", min: 0, max: 4}),
                new ConfigProperty({"key": "popupWindow", "type": "SELECT", options: [CONSTANTS.POP_NONE, CONSTANTS.POP_LIMIT, CONSTANTS.POP_ALL]}),
                new ConfigProperty({"key": "docMaxNum", "type": "NUMBER", min: 1, max: 1024}),
                new ConfigProperty({"key": "nameMaxLength", "type": "NUMBER"}),
                new ConfigProperty({"key": "icon", "type": "SELECT", options: [CONSTANTS.ICON_NONE, CONSTANTS.ICON_CUSTOM_ONLY, CONSTANTS.ICON_ALL]}),
                new ConfigProperty({"key": "linkDivider", "type": "TEXT"}),
                new ConfigProperty({"key": "areaHideFrom", "type": "NUMBER", min: 0, max: 15}),

                new ConfigProperty({"key": "mobileRemoveAllArea", "type": "SWITCH"}),
                new ConfigProperty({"key": "enableForPopOverCircumstance", "type": "SWITCH"}),
                new ConfigProperty({"key": "enableForPreview", "type": "SWITCH"}),
            ],
        }),
        new TabProperty({"key": "appearance", "iconKey": "iconTheme", showColumnAsGroup: true, props: {
            "docLink": [
                new ConfigProperty({"key": "alignToGrid", "type": "SWITCH"}),
                new ConfigProperty({"key": "sameWidth", "type": "NUMBER", min: 0, max: 40}),
                new ConfigProperty({"key": "sameMaxWidth", "type": "NUMBER", min: 0, max: 40}),
                new ConfigProperty({"key": "docNameCentering", "type": "SWITCH"}),
            ],
            "contentArea": [
                new ConfigProperty({"key": "maxHeightLimit", "type": "NUMBER"}),
                new ConfigProperty({"key": "areaBorder", "type": "SWITCH"}),
                new ConfigProperty({"key": "endDocAreaPaddingTop", "type": "SWITCH"}),
            ],
            "css": [
                new ConfigProperty({"key": "docLinkClass", "type": "TEXT"}),
                new ConfigProperty({"key": "parentBoxCSS", "type": "TEXTAREA"}),
                new ConfigProperty({"key": "siblingBoxCSS", "type": "TEXTAREA"}),
                new ConfigProperty({"key": "childBoxCSS", "type": "TEXTAREA"}),
                new ConfigProperty({"key": "docLinkCSS", "type": "TEXTAREA"}),
            ]
        }}),
        new TabProperty({"key": "lab", "iconKey": "iconHelp", props: {
            "ing": [
                new ConfigProperty({"key": "openDocRemoveCurrentTab", "type": "SELECT", options: [CONSTANTS.REMOVE_CURRENT_TAB_DEFAULT, CONSTANTS.REMOVE_CURRENT_TAB_TRUE, CONSTANTS.REMOVE_CURRENT_TAB_FALSE]}),
                new ConfigProperty({"key": "autoRemoveOldTabJudgeMiliseconds", "type": "NUMBER", min: 0, max: 5000}),
                new ConfigProperty({"key": "previousAndNextFollowDailynote", "type": "SWITCH"}),
                new ConfigProperty({"key": "requestAllDocIcon", "type": "SWITCH"}),
                new ConfigProperty({"key": "immediatelyUpdate", "type": "SWITCH"}),
                new ConfigProperty({"key": "performanceMode", "type": "SWITCH"}),
                new ConfigProperty({"key": "keepTempTop", "type": "SWITCH"}),
                new ConfigProperty({"key": "enableForPreview", "type": "SWITCH"}),
                new ConfigProperty({"key": "fixListChildDocsSrc", "type": "BUTTON", "btndo": fixListChildDocsSrc}),
            ],
            "stop": [
                new ConfigProperty({"key": "mobileBackReplace", "type": "SWITCH"}),
            ]},
        }),
        new TabProperty({"key": "about", "iconKey": "iconInfo", props: [
            new ConfigProperty({"key": "aboutAuthor", "type": "TIPS"}),
            new ConfigProperty({"key": "settingIconTips", "type": "TIPS"}),
            new ConfigProperty({"key": "debugMode", "type": "SWITCH"}),
        ]}),
    );
}

async function transferOldSetting() {
    const oldSettings = await getPluginInstance().loadData("settings.json");
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
    newSetting = Object.assign(Object.assign({}, defaultSetting), newSetting);

    return newSetting;
}

/**
 * 插件专属校验：排序项白名单过滤 + 宽度区间钳制
 * 通用的类型校正由设置引擎完成
 */
function checkBusinessRule(input: any, defaults: any) {
    const propertyMap = loadAllConfigPropertyFromTabProperty(tabProperties);

    for (const prop of Object.values(propertyMap)) {
        if (prop.type !== "ORDER") {
            continue;
        }
        const currentValue = input[prop.key];
        if (!Array.isArray(currentValue)) {
            continue;
        }
        const filteredOrder = currentValue.filter(item => Object.values(PRINTER_NAME).includes(item));
        if (JSON.stringify(filteredOrder) !== JSON.stringify(currentValue)) {
            input[prop.key] = filteredOrder;
        }
    }

    if (input["sameWidth"] > input["sameMaxWidth"]) {
        input["sameWidth"] = input["sameMaxWidth"];
        showPluginMessage(lang("setting_same_width_max_warn"), 4000);
    }

    return input;
}

async function migrateToCurrentVersion() {
    if (await isWrongListChildDocsSrcExist()) {
        showPluginMessage(lang("fix_lcd_src_warn"), 0, "error");
    }
}

function applySettings() {
    setStyle();
    recalcMultilineColumnWidthOnSettingsChange();
}

const settingManager = createSettingManager({
    defaultSetting,
    currentVersion: 20260808,
    tabs: () => tabProperties,
    transferOld: transferOldSetting,
    onVersionUpgrade: migrateToCurrentVersion,
    customValidate: checkBusinessRule,
    onChanged: applySettings,
    debugSwitchKey: "debugMode",
});

export const {
    loadSettings,
    saveSettings,
    getGSettings,
    getReadOnlyGSettings,
    getDefaultSettings,
    getTabProperties,
} = settingManager;
