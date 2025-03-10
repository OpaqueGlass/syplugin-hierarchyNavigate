/**
 * 判定字符串是否有效
 * @param s 需要检查的字符串（或其他类型的内容）
 * @returns true / false 是否为有效的字符串
 */
export function isValidStr(s: any): boolean {
    if (s == undefined || s == null || s === '') {
		return false;
	}
	return true;
}

/**
 * 判断字符串是否为空白
 * @param s 字符串
 * @returns true 字符串为空或无效或只包含空白字符
 */
export function isBlankStr(s: any): boolean {
	if (!isValidStr(s)) return true;
	const clearBlankStr = s.replace(/\s+/g, '');
	if (clearBlankStr === '') {
		return true;
	}
	return false;
}

let cacheIsMacOs = undefined;
export function isMacOs() {
	let platform = window.top.siyuan.config.system.os ?? navigator.platform ?? "ERROR";
    platform = platform.toUpperCase();
    let isMacOSFlag = cacheIsMacOs;
    if (cacheIsMacOs == undefined) {
        for (let platformName of ["DARWIN", "MAC", "IPAD", "IPHONE", "IOS"]) {
            if (platform.includes(platformName)) {
                isMacOSFlag = true;
                break;
            }
        }
        cacheIsMacOs = isMacOSFlag;
    }
	if (isMacOSFlag == undefined) {
		isMacOSFlag = false;
	}
	return isMacOSFlag;
}

export function isEventCtrlKey(event) {
    if (isMacOs()) {
        return event.metaKey;
    }
    return event.ctrlKey;
}

/**
 * 是否小于输入的版本号
 * @param version 输入的版本号，形如"3.1.23"
 * @returns boolean 表示是否小于，等于也false
 */
export function isCurrentVersionLessThan(version:string) {
    const parsedInputVersion = parseVersion(version);
    const parsedCurrentVersion = parseVersion(window.siyuan.config.system.kernelVersion);

    // 比较每个部分
    for (let i = 0; i < 3; i++) {
        if ((parsedCurrentVersion[i] || 0) < (parsedInputVersion[i] || 0)) {
            return true;
        } else if ((parsedCurrentVersion[i] || 0) > (parsedInputVersion[i] || 0)) {
            return false;
        }
    }
    // 版本号相同
    return false;
}

/**
 * 是否大于输入的版本号
 * @param version 输入的版本号，形如"3.1.23"
 * @returns boolean 表示是否大于，等于也false
 */
export function isCurrentVersionGreaterThan(version:string) {
    const currentVersion = window.siyuan.config.system.kernelVersion;

    const parsedInputVersion = parseVersion(version);
    const parsedCurrentVersion = parseVersion(currentVersion);

    for (let i = 0; i < 3; i++) {
        if ((parsedCurrentVersion[i] || 0) > (parsedInputVersion[i] || 0)) {
            return true;
        } else if ((parsedCurrentVersion[i] || 0) < (parsedInputVersion[i] || 0)) {
            return false;
        }
    }
    return false;
}

// 移除除了.数字的部分，分组
const parseVersion = (version: string) => {
    return version.replace(/[^0-9.]/g, '').split('.').map(Number);
};