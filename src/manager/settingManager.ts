import { TabProperty, ConfigProperty, loadAllConfigPropertyFromTabProperty } from "../utils/settings";
import { createApp, ref, watch } from "vue";
import settingVue from "../components/settings/setting.vue";
import { getPluginInstance } from "@/utils/getInstance";
import { debugPush, logPush } from "@/logger";
import { CONSTANTS, PRINTER_NAME } from "@/constants";
import { setStyle } from "@/worker/setStyle";
import { DOC_SORT_TYPES, getJSONFile } from "@/syapi";
import { isValidStr } from "@/utils/commonCheck";

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
    adjustDocIcon: boolean,
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
    enableForOtherCircumstance: boolean,
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
    adjustDocIcon: true,
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
    flashcardContentGroup: [PRINTER_NAME.BREADCRUMB],
    enableForOtherCircumstance: false,
    childOrder: "FOLLOW_DOC_TREE", // 子文档部分排序方式
}


let tabProperties: Array<TabProperty> = [
    
];
let updateTimeout: any = null;
watch(setting, (newVal) => {
    // 延迟更新
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    logPush("检查到变化");
    updateTimeout = setTimeout(() => {
        // updateSingleSetting(key, newVal);
        saveSettings(newVal);
        logPush("保存设置项");
        setStyle();
        updateTimeout = null;
    }, 1000);
}, {deep: true, immediate: true});

/**
 * 设置项初始化
 * 应该在语言文件载入完成后调用执行
 */
export function initSettingProperty() {
    tabProperties.push(
        new TabProperty({key: "content", props:[
            new ConfigProperty({"key": "contentOrderTip", "type": "TIPS"}),
            new ConfigProperty({"key": "openDocContentGroup", "type": "ORDER", "options": Object.values(PRINTER_NAME)}),
            new ConfigProperty({"key": "mobileContentGroup", "type": "ORDER", "options": Object.values(PRINTER_NAME)}),
            new ConfigProperty({"key": "flashcardContentGroup", "type": "ORDER", "options": Object.values(PRINTER_NAME)}),
            
        ]}),
        new TabProperty({key: "showType", props:[
            new ConfigProperty({"key": "noChildIfHasAv", "type": "SWITCH"}),
            new ConfigProperty({"key": "lcdEmptyDocThreshold", "type": "NUMBER", "min": -1}),
            new ConfigProperty({"key": "showBackLinksType", "type": "SELECT", "options": [CONSTANTS.BACKLINK_NORMAL, CONSTANTS.BACKLINK_DOC_ONLY]}),
            new ConfigProperty({"key": "hideIndicator", "type": "SWITCH"}),
            new ConfigProperty({"key": "noneAreaHide", "type": "SWITCH"}),
            new ConfigProperty({"key": "sibling", "type": "SWITCH"}),
            new ConfigProperty({"key": "childOrder", "type": "SELECT", "options": Object.keys(DOC_SORT_TYPES)}),
        ]}),
        new TabProperty({key: "general", props: [
            new ConfigProperty({"key": "fontSize", "type": "NUMBER"}),
            new ConfigProperty({"key": "popupWindow", "type": "SELECT", options: [CONSTANTS.POP_NONE, CONSTANTS.POP_LIMIT, CONSTANTS.POP_ALL]}),
            new ConfigProperty({"key": "docMaxNum", "type": "NUMBER"}),
            new ConfigProperty({"key": "nameMaxLength", "type": "NUMBER"}),
            new ConfigProperty({"key": "icon", "type": "SELECT", options: [CONSTANTS.ICON_NONE, CONSTANTS.ICON_CUSTOM_ONLY, CONSTANTS.ICON_ALL]}),
            new ConfigProperty({"key": "linkDivider", "type": "TEXT"}),
            new ConfigProperty({"key": "mainRetry", "type": "NUMBER"}),
        ]}),
        new TabProperty({"key": "appearance", props: [
            new ConfigProperty({"key": "maxHeightLimit", "type": "NUMBER"}),

            new ConfigProperty({"key": "sameWidth", "type": "NUMBER"}),
            new ConfigProperty({"key": "adjustDocIcon", "type": "SWITCH"}),
            new ConfigProperty({"key": "docLinkClass", "type": "TEXT"}),
            new ConfigProperty({"key": "parentBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "siblingBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "childBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "docLinkCSS", "type": "TEXTAREA"}),
        ]}),
        new TabProperty({"key": "lab", props: [
            new ConfigProperty({"key": "enableForOtherCircumstance", "type": "SWITCH"}),
        ]}),
        new TabProperty({"key": "about", props: [
            new ConfigProperty({"key": "aboutAuthor", "type": "TIPS"}),
            new ConfigProperty({"key": "feedback", "type": "TIPS"}),
        ]}),
    );
}

export function getTabProperties() {
    return tabProperties;
}

// 发生变动之后，由界面调用这里
export function saveSettings(newSettings: any) {
    // 如果有必要，需要判断当前设备，然后选择保存位置
    debugPush("保存设置项", setting);
    getPluginInstance().saveData("settings_main.json", JSON.stringify(newSettings, null, 4));
}


/**
 * 仅用于初始化时载入设置项
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
                input[prop.key] = false;
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

