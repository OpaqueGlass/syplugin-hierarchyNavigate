type IConfigProperty = {
    key: string,
    type: IConfigPropertyType, // 设置项类型
    min?: number, // 设置项最小值
    max?: number, // 设置项最大值
    btndo?: Function,  // 按钮设置项的调用函数(callback)
    // defaultValue?: any, //默认值
    options?: number, // 选项数量，选项名称由语言文件中_option_i决定
};

type IConfigPropertyType = 
    "SELECT" |
    "TEXT" |
    "NUMBER" |
    "BUTTON" |
    "TEXTAREA" |
    "SWITCH" |
    "ORDER" |
    "TIPS";

type ITabProperty = {
    nameKey: string, // 标签页名称对应的语言文件关键字
    iconKey: string, // 设置项描述对应的语言关键字
    properties: Array<ConfigProperty> // 设置项列表
};
