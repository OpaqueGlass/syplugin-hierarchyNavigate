/**
 * 设置、设置标签页定义
 * 请注意，设置项的初始化应该在语言文件加载后进行
 */
import { isValidStr } from "./commonCheck";
import { lang } from "./lang";

interface IConfigProperty {
    key: string,
    type: IConfigPropertyType, // 设置项类型
    min?: number, // 设置项最小值
    max?: number, // 设置项最大值
    btndo?: () => void,  // 按钮设置项的调用函数(callback)
    options?: number, // 选项数量，选项名称由语言文件中_option_i决定，建议整一个CONST对应每个选项取得数字值
}

export class ConfigProperty {
    key: string;
    type: IConfigPropertyType;
    min?: number;
    max?: number;
    btndo?: () => void;
    options?: number;

    configName: string;
    description: string;
    tips: string;

    optionNames: Array<string>;

    constructor({key, type, min, max, btndo, options}: IConfigProperty){
        this.key = key;
        this.type = type;
        this.min = min;
        this.max = max;
        this.btndo = btndo;
        this.options = options;

        this.configName = lang(`setting_${key}_name`);
        this.description = lang(`setting_${key}_desp`);
        // this.tips = lang(`setting_${key}_tips`);

        this.optionNames = new Array<string>();
        for(let i = 0; i < options; i++){
            this.optionNames.push(lang(`setting_${key}_option_${i}`));
        }
    }

}

interface ITabProperty {
    key: string,
    props: Array<ConfigProperty>,
    iconKey?: string
}

export class TabProperty {
    key: string;
    iconKey: string;
    props: Array<ConfigProperty>;

    constructor({key, props, iconKey}: ITabProperty){
        this.key = key;
        if (isValidStr(iconKey)) {
            this.iconKey = iconKey;
        } else {
            this.iconKey = "setting";
        }
        this.props = props;
    }

}

/**
 * 设置标签页
 * @param tabDefinitions 设置标签页定义
 * @returns 
 */
export function loadDefinitionFromTabProperty(tabDefinitions: Array<ITabProperty>):Array<ConfigProperty> {
    let result: Array<ConfigProperty> = [];
    tabDefinitions.forEach((tabDefinition) => {
        tabDefinition.props.forEach((property) => {
            result.push(property);
        });
    });
    
    return result;
}