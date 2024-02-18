import { IProtyle } from "siyuan";
import { isValidStr } from "./commonCheck";
import { debugPush, logPush } from "@/logger";

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