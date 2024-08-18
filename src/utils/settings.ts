/**
 * 设置、设置标签页定义
 * 请注意，设置项的初始化应该在语言文件加载后进行
 */
import { debugPush } from "@/logger";
import { isValidStr } from "./commonCheck";
import { lang } from "./lang";

interface IConfigProperty {
    key: string,
    type: IConfigPropertyType, // 设置项类型
    min?: number, // 设置项最小值
    max?: number, // 设置项最大值
    btndo?: () => void,  // 按钮设置项的调用函数(callback)
    options?: Array<string>, // 选项key数组，元素顺序决定排序顺序，请勿使用非法字符串
    optionSameAsSettingKey?: string, // 如果选项的描述文本和其他某个设置项相同，在此指定；请注意，仍需要指定options
}

export class ConfigProperty {
    key: string;
    type: IConfigPropertyType;
    min?: number;
    max?: number;
    btndo?: () => void;
    options?: Array<string>;

    configName: string;
    description: string;
    tips: string;

    optionNames: Array<string>;
    optionDesps: Array<string>;

    constructor({key, type, min, max, btndo, options, optionSameAsSettingKey}: IConfigProperty){
        this.key = key;
        this.type = type;
        this.min = min;
        this.max = max;
        this.btndo = btndo;
        this.options = options ?? new Array<string>();

        this.configName = lang(`setting_${key}_name`);
        this.description = lang(`setting_${key}_desp`);
        if (this.configName.startsWith("🧪")) {
            this.description = lang("setting_experimental") + this.description;
        } else if (this.configName.startsWith("✈")) {
            this.description = lang("setting_testing") + this.description;
        } else if (this.configName.startsWith("❌")) {
            this.description = lang("setting_deprecated") + this.description;
        }
        // this.tips = lang(`setting_${key}_tips`);
        
        this.optionNames = new Array<string>();
        this.optionDesps = new Array<string>();
        for(let optionKey of this.options){
            this.optionNames.push(lang(`setting_${optionSameAsSettingKey ?? key}_option_${optionKey}`));
            this.optionDesps.push(lang(`setting_${optionSameAsSettingKey ?? key}_option_${optionKey}_desp`));
        }
    }

}

interface ITabProperty {
    key: string,
    props: Array<ConfigProperty>|Record<string, Array<ConfigProperty>>,
    iconKey?: string
}

export class TabProperty {
    key: string;
    iconKey: string;
    props: {[name:string]:Array<ConfigProperty>};
    isColumn: boolean = false;
    columnNames: Array<string> = new Array<string>();
    columnKeys: Array<string> = new Array<string>();

    constructor({key, props, iconKey}: ITabProperty){
        this.key = key;
        if (isValidStr(iconKey)) {
            this.iconKey = iconKey;
        } else {
            this.iconKey = "setting";
        }
        if (!Array.isArray(props)) {
            this.isColumn = true;
            Object.keys(props).forEach((columnKey) => {
                this.columnNames.push(lang(`setting_column_${columnKey}_name`));
                this.columnKeys.push(columnKey);
            });
            this.props = props;
        } else {
            this.props = {"none": props};
            this.columnNames.push(lang(`setting_column_none_name`));
            this.columnKeys.push("none");
        }
    }

}


/**
 * 设置标签页
 * @param tabDefinitions 设置标签页定义
 * @returns 
 */
// export function loadDefinitionFromTabProperty(tabDefinitions: Array<ITabProperty>):Array<ConfigProperty> {
//     let result: Array<ConfigProperty> = [];
//     tabDefinitions.forEach((tabDefinition) => {
//         tabDefinition.props.forEach((property) => {
//             result.push(property);
//         });
//     });
    
//     return result;
// }

/**
 * 获得ConfigMap对象
 * @param tabDefinitions 
 * @returns 
 */
export function loadAllConfigPropertyFromTabProperty(tabDefinitions: Array<ITabProperty>):Record<string, ConfigProperty> {
    let result: Record<string, ConfigProperty> = {};
    tabDefinitions.forEach((tabDefinition) => {
        Object.values(tabDefinition.props).forEach((properties) => {
            properties.forEach((property) => {
                result[property.key] = property;
            });
        });
    });
    return result;
}