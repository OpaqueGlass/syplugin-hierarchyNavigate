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