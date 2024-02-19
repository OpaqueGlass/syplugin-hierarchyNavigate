import { TabProperty, ConfigProperty } from "../utils/settings";
import { createApp, ref, watch } from "vue";
import settingVue from "../components/settings/setting.vue";
import { getPluginInstance } from "@/utils/getInstance";
import { debugPush, logPush } from "@/logger";
import { CONSTANTS, PRINTER_NAME } from "@/constants";
import { setStyle } from "@/worker/setStyle";

// const pluginInstance = getPluginInstance();

const settingDefinition = new Array<IConfigProperty>;

let setting: any = ref({});

interface IPluginSettings {
    test1: string,
    test2: string,
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
    showBackLinksArea: CONSTANTS.BACKLINK_NONE, // 显示反链区域
    openDocContentGroup: [PRINTER_NAME.BREADCRUMB, PRINTER_NAME.CHILD],
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
            new ConfigProperty({"key": "openDocContentGroup", type: "ORDER", "options": Object.values(PRINTER_NAME)}),
            new ConfigProperty({"key": "showDocInfo", "type": "SWITCH"}),
            new ConfigProperty({"key": "enableParentArea", "type": "SWITCH"}),
            new ConfigProperty({"key": "enableSiblingArea", "type": "SELECT", "options": ["none", "auto", "always"]}),
            new ConfigProperty({"key": "enableChildArea", "type": "SWITCH"}),
            new ConfigProperty({"key": "previousAndNext", "type": "SWITCH"}),
            new ConfigProperty({"key": "listChildDocs", "type": "SWITCH"}),
            new ConfigProperty({"key": "lcdEmptyDocThreshold", "type": "NUMBER", "min": -1}),
            new ConfigProperty({"key": "showBackLinksArea", "type": "SELECT", "options": ["disable", "all", "only_doc"]}),
        ]}),
        new TabProperty({key: "general", props: [
            new ConfigProperty({"key": "fontSize", "type": "NUMBER"}),
            new ConfigProperty({"key": "popupWindow", "type": "SELECT", options: ["disable", "icon_only", "all"]}),
            new ConfigProperty({"key": "docMaxNum", "type": "NUMBER"}),
            new ConfigProperty({"key": "nameMaxLength", "type": "NUMBER"}),
            new ConfigProperty({"key": "adjustDocIcon", "type": "SWITCH"}),
            new ConfigProperty({"key": "immediatelyUpdate", "type": "SWITCH"}),
            new ConfigProperty({"key": "icon", "type": "SELECT", options: [CONSTANTS.ICON_NONE, CONSTANTS.ICON_CUSTOM_ONLY, CONSTANTS.ICON_ALL]}),
            new ConfigProperty({"key": "linkDivider", "type": "NUMBER"}),
        ]}),
        new TabProperty({"key": "appearance", props: [
            new ConfigProperty({"key": "maxHeightLimit", "type": "NUMBER"}),
            new ConfigProperty({"key": "hideIndicator", "type": "SWITCH"}),
            new ConfigProperty({"key": "noneAreaHide", "type": "SWITCH"}),
            new ConfigProperty({"key": "sameWidth", "type": "NUMBER"}),
            new ConfigProperty({"key": "docLinkClass", "type": "TEXT"}),
            new ConfigProperty({"key": "parentBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "siblingBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "childBoxCSS", "type": "TEXTAREA"}),
            new ConfigProperty({"key": "docLinkCSS", "type": "TEXTAREA"}),
            
            
            new ConfigProperty({"key": "replaceWithBreadcrumb", "type": "SWITCH"}),
            new ConfigProperty({"key": "alwaysShowSibling", "type": "SWITCH"}),
            new ConfigProperty({"key": "noChildIfHasAv", "type": "SWITCH"}),
        ]})
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

function checkTypeAndMinMax(settings: any) {
    for (let key in settings) {
        if (key in defaultSetting) {
            if (typeof settings[key] != typeof defaultSetting[key]) {
                settings[key] = defaultSetting[key];
            }
            if (typeof settings[key] == "number") {
                if (settings[key] < 0) {
                    settings[key] = 0;
                }
            }
        }
    }
    return settings;
}

/**
 * 仅用于初始化时载入设置项
 * @returns 
 */
export async function loadSettings() {
    let loadResult = null;
    // 这里从文件载入
    loadResult = await getPluginInstance().loadData("settings_main.json");
    if (loadResult == undefined) {
        loadResult = defaultSetting;
    }
    // 如果有必要，判断设置项是否对当前设备生效
    // TODO: 对于Order，switch需要进行检查，防止版本问题导致选项不存在，不存在的用默认值
    // TODO: switch旧版需要迁移，另外引出迁移逻辑
    setting.value = Object.assign(defaultSetting, loadResult);
    logPush("载入设置项", setting.value);
    // return loadResult;
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

