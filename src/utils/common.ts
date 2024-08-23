import { IProtyle } from "siyuan";
import { isValidStr } from "./commonCheck";
import { debugPush, logPush, warnPush } from "@/logger";

export function getToken(): string {
    return "";
}

/**
 * 在protyle所在的分屏中打开
 * @param event 
 * @param protyleElem 
 */
export function openRefLinkInProtyleWnd(protyleElem: IProtyle, openInFocus: boolean, event: MouseEvent) {
    logPush("debug", event, protyleElem);
    openRefLink(event, null, null, protyleElem, openInFocus);
}

/**
 * 休息一下，等待
 * @param time 单位毫秒
 * @returns 
 */
export function sleep(time:number){
    return new Promise((resolve) => setTimeout(resolve, time));
}

export function getFocusedBlockId() {
    const focusedBlock = getFocusedBlock();
    if (focusedBlock == null) {
        return null;
    }
    return focusedBlock.dataset.nodeId;
}


export function getFocusedBlock() {
    if (document.activeElement.classList.contains('protyle-wysiwyg')) {
        /* 光标在编辑区内 */
        let block = window.getSelection()?.focusNode?.parentElement; // 当前光标
        while (block != null && block?.dataset?.nodeId == null) block = block.parentElement;
        return block;
    }
    else return null;
}

/**
 * 在点击<span data-type="block-ref">时打开思源块/文档
 * 为引入本项目，和原代码相比有更改
 * @refer https://github.com/leolee9086/cc-template/blob/6909dac169e720d3354d77685d6cc705b1ae95be/baselib/src/commonFunctionsForSiyuan.js#L118-L141
 * @license 木兰宽松许可证
 * @param {MouseEvent} event 当给出event时，将寻找event.currentTarget的data-node-id作为打开的文档id
 * @param {string} docId，此项仅在event对应的发起Elem上找不到data node id的情况下使用
 * @param {any} keyParam event的Key，主要是ctrlKey shiftKey等，此项仅在event无效时使用
 * @param {IProtyle} protyleElem 如果不为空打开文档点击事件将在该Elem上发起
 * @param {boolean} openInFocus 在当前聚焦的窗口中打开，给定此项为true，则优于protyle选项生效
 */
export function openRefLink(event: MouseEvent, paramId = "", keyParam = undefined, protyleElem = undefined, openInFocus = false){
    let syMainWndDocument= window.parent.document
    let id;
    if (event && (event.currentTarget as HTMLElement)?.getAttribute("data-node-id")) {
        id = (event.currentTarget as HTMLElement)?.getAttribute("data-node-id");
    } else if ((event?.currentTarget as HTMLElement)?.getAttribute("data-id")) {
        id = (event.currentTarget as HTMLElement)?.getAttribute("data-id");
    } else {
        id = paramId;
    }
    // 处理笔记本等无法跳转的情况
    if (!isValidStr(id)) {return;}
    event?.preventDefault();
    event?.stopPropagation();
    debugPush("openRefLinkEvent", event);
    let simulateLink =  syMainWndDocument.createElement("span")
    simulateLink.setAttribute("data-type","a")
    simulateLink.setAttribute("data-href", "siyuan://blocks/" + id)
    simulateLink.style.display = "none";//不显示虚拟链接，防止视觉干扰
    let tempTarget = null;
    // 如果提供了目标protyle，在其中插入
    if (protyleElem && !openInFocus) {
        tempTarget = protyleElem.querySelector(".protyle-wysiwyg div[data-node-id] div[contenteditable]") ?? protyleElem;
        debugPush("openRefLink使用提供窗口", tempTarget);
    }
    debugPush("openInFocus?", openInFocus);
    if (openInFocus) {
        // 先确定Tab
        const dataId = syMainWndDocument.querySelector(".layout__wnd--active .layout-tab-bar .item--focus")?.getAttribute("data-id");
        debugPush("openRefLink尝试使用聚焦窗口", dataId);
        // 再确定Protyle
        if (isValidStr(dataId)) {
            tempTarget = window.document.querySelector(`.fn__flex-1.protyle[data-id='${dataId}']
            .protyle-wysiwyg div[data-node-id] div[contenteditable]`);
            debugPush("openRefLink使用聚焦窗口", tempTarget);
        }
    }
    if (!isValidStr(tempTarget)) {
        tempTarget = syMainWndDocument.querySelector(".protyle-wysiwyg div[data-node-id] div[contenteditable]");
        debugPush("openRefLink未能找到指定窗口，更改为原状态");
    }
    tempTarget.appendChild(simulateLink);
    let clickEvent = new MouseEvent("click", {
        ctrlKey: event?.ctrlKey ?? keyParam?.ctrlKey,
        shiftKey: event?.shiftKey ?? keyParam?.shiftKey,
        altKey: event?.altKey ?? keyParam?.altKey,
        bubbles: true
    });
    simulateLink.dispatchEvent(clickEvent);
    simulateLink.remove();
}


export function parseDateString(dateString: string): Date | null {
    if (dateString.length !== 14) {
        warnPush("Invalid date string length. Expected format: 'YYYYMMDDHHmmss'");
        return null;
    }

    const year = parseInt(dateString.slice(0, 4), 10);
    const month = parseInt(dateString.slice(4, 6), 10) - 1; // 月份从 0 开始
    const day = parseInt(dateString.slice(6, 8), 10);
    const hours = parseInt(dateString.slice(8, 10), 10);
    const minutes = parseInt(dateString.slice(10, 12), 10);
    const seconds = parseInt(dateString.slice(12, 14), 10);

    const date = new Date(year, month, day, hours, minutes, seconds);

    if (isNaN(date.getTime())) {
        warnPush("Invalid date components.");
        return null;
    }

    return date;
}

export function generateUUID() {
    let uuid = '';
    let i = 0;
    let random = 0;

    for (i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            uuid += '-';
        } else if (i === 14) {
            uuid += '4';
        } else {
            random = Math.random() * 16 | 0;
            if (i === 19) {
                random = (random & 0x3) | 0x8;
            }
            uuid += (random).toString(16);
        }
    }

    return uuid;
}

export function isPluginExist(pluginName: string) {
    const plugins = window.siyuan.ws.app.plugins;
    return plugins?.some((plugin) => plugin.name === pluginName);
}

export function isAnyPluginExist(pluginNames: string[]) {
    return pluginNames.some(isPluginExist);
}
