let language = null;
let emptyLanguageKey: Array<string> = [];

export function setLanguage(lang:any) {
    language = lang;
}

export function lang(key: string) {
    if (language != null && language[key] != null) {
        return language[key];
    }
    if (language == null) {
        emptyLanguageKey.push(key);
        console.error("语言文件未定义该Key", JSON.stringify(emptyLanguageKey));
    }
    return key;
}

/**
 * 
 * @param key key
 * @returns [设置项名称，设置项描述，设置项按钮名称（如果有）]
 */
export function settingLang(key: string) {
    let settingName: string = lang(`settings_${key}_name`);
    let settingDesc: string = lang(`settings_${key}_desp`);
    let settingBtnName: string = lang(`settings_${key}_btn`)
    if (settingName == "Undefined" || settingDesc == "Undefined") {
        throw new Error(`设置文本${key}未定义`);
    }
    return [settingName, settingDesc, settingBtnName];
}

export function settingPageLang(key: string) {
    let pageSettingName: string = lang(`settingpage_${key}_name`);
    return [pageSettingName];
}

export function getSelectOptions(key: string, optionCount: number) {
    let options = new Array<string>();
    for (let i = 0; i < optionCount; i++) {
        options.push(lang(`settings_${key}_option_${i}`));
    }
    return options;
}