import { CONSTANTS, PRINTER_NAME } from "@/constants";
import { debugPush, logPush, warnPush } from "@/logger";
import { getReadOnlyGSettings } from "@/manager/settingManager";
import { isMobile } from "@/syapi";
import { isPluginExist } from "@/utils/common";
import { isCurrentVersionLessThan, isValidStr } from "@/utils/commonCheck";
import { openRefLinkByAPIWithConfig } from "@/utils/onlyThisUtil";
import {
    clampColumnWidth,
    computeRawColumnWidth,
    measureDocNameLengthByCanvas,
    measureDocNameLengthByChars, measureDocNameLengthByScriptWeight,
    measureMultilineDocNameLengths,
} from "./gridColumnWidth";
import { checkTopExistCache } from "./menuHelper";
import { getContentAreaFontSizePx } from "./setStyle";
import { removeToTheTop, turnNavigationToTop } from "./shortcutHandler";

// ContentApplyer是每次初始化的，remove的每次都不一样
const clickEventHandler = (event)=>{
    const g_setting = getReadOnlyGSettings();
    openRefLinkByAPIWithConfig({mouseEvent: event, g_setting: g_setting});
    if (!g_setting.keepTempTop) {
        removeToTheTop();
    }
};
export default class ContentApplyer {
    private basicInfo: IBasicInfo;
    private protyleEnvInfo: IProtyleEnvInfo;
    private protyleElement: HTMLElement;
    private clickEventHandler: (event)=>void;

    private validateAndFixMargin(marginValue: string): string {
        if (!marginValue || marginValue === '') {
            return '0px';
        }
        return marginValue;
    }
    
    constructor(basicInfo, protyleEnvInfo, protyleElement: HTMLElement) {
        this.basicInfo = basicInfo;
        this.protyleEnvInfo = protyleEnvInfo;
        this.protyleElement = protyleElement;
        this.clickEventHandler = clickEventHandler;
    }

    async apply(printerAllResults: IAllPrinterResult) {
        const g_setting = getReadOnlyGSettings();
        // 判断是否存在，提供存在参数（解析类）
        // 这个是新的Element，如果要在旧的基础上替换，需要重新设置dataset
        const finalElement = document.createElement("div");
        finalElement.classList.add("og-hn-heading-docs-container");
        finalElement.classList.add(CONSTANTS.HEADING_CLASS_NAME);
        finalElement.dataset["existContentPart"] = JSON.stringify(printerAllResults.relateContentKeys);
        // 要不这边先构成最终finalElement，再交给各个类型的apply函数写入，其余函数只插入一个元素
        // TODO: 似乎有一些情况会导致多个内容区, selectorAll然后remove掉靠后的吧
        // 看样子是ios快速切换时有残留
        if (isMobile()) {
            // showMessage(`单独处理测试，旧区域个数：${document.querySelectorAll(".og-hn-heading-docs-container")?.length}，backend ${getBackend()}，此编辑区旧区域个数 ${this.protyleElement.querySelectorAll(".og-hn-heading-docs-container")?.length}`);
            if (g_setting.mobileRemoveAllArea) {
                document.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.HEADING_CLASS_NAME}`).forEach((elem) => {
                    elem.remove();
                });
            } else {
                this.protyleElement.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.HEADING_CLASS_NAME}`).forEach((elem) => {
                    elem.remove();
                });
            }
            
        }
        // 兼容预览模式
        const contentElement = this.protyleElement.querySelector(`.protyle-content`);
        const previewElement = this.protyleElement.querySelector(`.protyle-preview`);
        let allExistMainPart = contentElement.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.HEADING_CLASS_NAME}`);
        if (previewElement && !previewElement.classList.contains("fn__none") && g_setting.enableForPreview) {
            allExistMainPart = previewElement.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.HEADING_CLASS_NAME}`);
        }
        const existContentMainPart = allExistMainPart ? allExistMainPart[0] : null;

        if (this._isBlankAllPrinterResult(printerAllResults)) {
            if (existContentMainPart) {
                existContentMainPart.remove();
            }
            logPush("顶部内容区无有效内容");
            return;
        }
        if (!existContentMainPart) {
            debugPush("未找到已经存在的，插入新的区域");
            for (const elem of printerAllResults.elements) {
                finalElement.appendChild(elem);
            }
            if (g_setting.alignToGrid) ContentApplyer.writeColumnWidthToFinal(finalElement, g_setting);
            // 判断当前类型，交给不同的apply
            if (this.protyleEnvInfo.flashCard) {
                this.flashcardApply(finalElement);
            } else if (this.protyleEnvInfo.mobile) {
                this.mobileApply(finalElement);
            } else {
                // 响应点击折叠
                finalElement.addEventListener("pointerdown", (e) => {
                    if (e.button != 2) {
                        return;
                    }
                    const targetElem = e.target as HTMLElement;
                    let actualTarget = targetElem;
                    let maxLoop = 10;
                    while (!actualTarget.classList.contains(CONSTANTS.CONTAINER_CLASS_NAME) && maxLoop > 0 && actualTarget) {
                        actualTarget = actualTarget.parentElement;
                        maxLoop--;
                    }
                    if (actualTarget && actualTarget.classList.contains(CONSTANTS.CONTAINER_CLASS_NAME)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        if (actualTarget.classList.contains(CONSTANTS.AREA_NOT_FOLD_CLASS_NAME)) {
                            actualTarget.classList.remove(CONSTANTS.AREA_NOT_FOLD_CLASS_NAME);
                        } else {
                            actualTarget.classList.add(CONSTANTS.AREA_NOT_FOLD_CLASS_NAME);
                        }
                    } else {
                        debugPush("右键折叠无效，源Ele未找到", e);
                    }
                });
                
                // 响应右键折叠结束
                this.betaApply(finalElement);
                // if (g_setting.doNotAddToTitle) {
                //     this.betaApply(finalElement);
                // } else {
                //     this.defaultApply(finalElement);
                // }
            }
        } else {
            // 已经存在，进入替换模式
            debugPush("已经存在，进入替换模式");
            // 获取已经存在的列表
            const oldKeyList = JSON.parse(existContentMainPart.getAttribute("data-exist-content-part") ?? "[]");
            // 移除不存在的项目
            oldKeyList.forEach((key) => {
                if (!printerAllResults.relateContentKeys.includes(key)) {
                    existContentMainPart.querySelector(`[data-og-content-type=${key}]`)?.remove();
                    debugPush("移除新设置中不存在的项目", key);
                }
            });
            // 遍历新列表，替换已经存在的项目
            for (let index = 0; index < printerAllResults.elements.length; index++) {
                const elem = printerAllResults.elements[index];
                const key = elem.dataset["ogContentType"];
                const oldElem = existContentMainPart.querySelector(`[data-og-content-type=${key}]`);
                let reinsertNeeded = false;
                // if (oldElem && !printerAllResults.onlyOnce[index]) {
                //     debugPush("项目", key, "已经存在，进行直接替换");
                //     // 已经存在的也需要检查位置
                //     // 1已经存在，且需要更新：直接替换
                //     oldElem.replaceWith(elem);
                // } else 
                if (oldElem) {
                    // 3已经存在，且不需要更新
                    // 检查位置是否和key一样，不一样的也需要重写
                    const oldIndex = this.findChildElementIndexByOGType(existContentMainPart, key);
                    debugPush("项目", key, "检查位置", oldIndex, "正确位置", index);
                    if (oldIndex != index) {
                        oldElem.remove();
                        reinsertNeeded = true;
                    } else if (!printerAllResults.onlyOnce[index]) {
                        debugPush("项目", key, "已经存在，在原定位置，需要更新");
                        oldElem.replaceWith(elem);
                    }
                }

                if (!oldElem || reinsertNeeded) {
                    // 2没有原始element，且需要更新；这个需要选定插入位置
                    // 4没有原始element，且不需要更新
                    // 根据Key找上一个项目，插在他后面，如果没有上一个项目，插在最前面
                    debugPush("项目", key, "不存在或需要重新插入");
                    if (index == 0) {
                        debugPush("项目", key, "为首个，直接插入");
                        existContentMainPart.insertAdjacentElement("afterbegin", elem);
                    } else {
                        debugPush("项目", key, "确定位置，插入到上一个项目后面");
                        const prevKey = printerAllResults.relateContentKeys[index - 1];
                        const prevIndex = this.findChildElementIndexByOGType(existContentMainPart, prevKey);
                        if (prevIndex >= 0) {
                            existContentMainPart.children[prevIndex].insertAdjacentElement("afterend", elem);
                        } else {
                            warnPush("似乎不该存在这个情况，在非第一个时，上一个元素应当是存在的");
                            existContentMainPart.insertAdjacentElement("afterbegin", elem);
                        }
                    }
                }
            }
            if (g_setting.alignToGrid) ContentApplyer.syncColumnWidthOnPartialRefresh(existContentMainPart as HTMLElement, g_setting);
            existContentMainPart.setAttribute("data-exist-content-part", JSON.stringify(printerAllResults.relateContentKeys));
        }
        if (checkTopExistCache() && g_setting.keepTempTop) {
            turnNavigationToTop();
        }
        // 重新挂载事件
        if (existContentMainPart) {
            this.bindBasicClickEvent(existContentMainPart);
            return null;
        } else {
            this.bindBasicClickEvent(finalElement);
            return finalElement;
        }
    }

    async applyToEnd(printerAllResults: IAllPrinterResult) {
        const g_setting = getReadOnlyGSettings();
        // 判断是否存在，提供存在参数（解析类）
        // 这个是新的Element，如果要在旧的基础上替换，需要重新设置dataset
        const finalElement = document.createElement("div");
        finalElement.classList.add("og-hn-heading-docs-container");
        finalElement.classList.add(CONSTANTS.FOOTER_CLASS_NAME);
        finalElement.dataset["existContentPart"] = JSON.stringify(printerAllResults.relateContentKeys);
        // 要不这边先构成最终finalElement，再交给各个类型的apply函数写入，其余函数只插入一个元素
        // 后插入的不能执行删除
        if (isMobile()) {
            // showMessage(`单独处理测试，旧区域个数：${document.querySelectorAll(".og-hn-heading-docs-container")?.length}，backend ${getBackend()}，此编辑区旧区域个数 ${this.protyleElement.querySelectorAll(".og-hn-heading-docs-container")?.length}`);
            if (g_setting.mobileRemoveAllArea) {
                document.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.FOOTER_CLASS_NAME}`).forEach((elem) => {
                    elem.remove();
                });
            } else {
                this.protyleElement.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.FOOTER_CLASS_NAME}`).forEach((elem) => {
                    elem.remove();
                });
            }
            
        }
        // 兼容预览模式
        const previewElement = this.protyleElement.querySelector(`.protyle-preview`);
        let allExistMainPart = this.protyleElement.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.FOOTER_CLASS_NAME}`);
        if (previewElement && !previewElement.classList.contains("fn__none") && g_setting.enableForPreview) {
            allExistMainPart = previewElement.querySelectorAll(`.og-hn-heading-docs-container.${CONSTANTS.FOOTER_CLASS_NAME}`);
        }
        const existContentMainPart = allExistMainPart ? allExistMainPart[0] : null;
        if (this._isBlankAllPrinterResult(printerAllResults)) {
            if (existContentMainPart) {
                existContentMainPart.remove();
            }
            logPush("结尾内容区无有效内容");
            return;
        }
        if (!existContentMainPart) {
            debugPush("未找到已经存在的，插入新的区域");
            if (printerAllResults.relateContentKeys == null || printerAllResults.relateContentKeys.length == 0) {
                debugPush("空内容区，区域不再置入");
                return;
            }
            for (const elem of printerAllResults.elements) {
                finalElement.appendChild(elem);
            }
            // 占位符
            const holdEle = document.createElement("div");
            holdEle.style.height = "150px";
            finalElement.appendChild(holdEle);
            if (g_setting.alignToGrid) ContentApplyer.writeColumnWidthToFinal(finalElement, g_setting);
            // 判断当前类型，交给不同的apply
            if (this.protyleEnvInfo.flashCard) {
                this.flashcardApply(finalElement);
            } else if (this.protyleEnvInfo.mobile) {
                this.mobileApply(finalElement);
            } else {
                // 响应点击折叠
                finalElement.addEventListener("pointerdown", (e) => {
                    if (e.button != 2) {
                        return;
                    }
                    const targetElem = e.target as HTMLElement;
                    let actualTarget = targetElem;
                    let maxLoop = 10;
                    while (!actualTarget.classList.contains(CONSTANTS.CONTAINER_CLASS_NAME) && maxLoop > 0 && actualTarget) {
                        actualTarget = actualTarget.parentElement;
                        maxLoop--;
                    }
                    if (actualTarget && actualTarget.classList.contains(CONSTANTS.CONTAINER_CLASS_NAME)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        if (actualTarget.classList.contains(CONSTANTS.AREA_NOT_FOLD_CLASS_NAME)) {
                            actualTarget.classList.remove(CONSTANTS.AREA_NOT_FOLD_CLASS_NAME);
                        } else {
                            actualTarget.classList.add(CONSTANTS.AREA_NOT_FOLD_CLASS_NAME);
                        }
                    } else {
                        debugPush("右键折叠无效，源Ele未找到", e);
                    }
                });
                // 响应右键折叠结束
                this.endApply(finalElement);
            }
        } else {
            // 已经存在，进入替换模式
            debugPush("已经存在，进入替换模式");
            // 获取已经存在的列表
            const oldKeyList = JSON.parse(existContentMainPart.getAttribute("data-exist-content-part") ?? "[]");
            // 移除不存在的项目
            oldKeyList.forEach((key) => {
                if (!printerAllResults.relateContentKeys.includes(key)) {
                    existContentMainPart.querySelector(`[data-og-content-type=${key}]`)?.remove();
                    debugPush("移除新设置中不存在的项目", key);
                }
            });
            // 遍历新列表，替换已经存在的项目
            for (let index = 0; index < printerAllResults.elements.length; index++) {
                const elem = printerAllResults.elements[index];
                const key = elem.dataset["ogContentType"];
                const oldElem = existContentMainPart.querySelector(`[data-og-content-type=${key}]`);
                let reinsertNeeded = false;
                // if (oldElem && !printerAllResults.onlyOnce[index]) {
                //     debugPush("项目", key, "已经存在，进行直接替换");
                //     // 已经存在的也需要检查位置
                //     // 1已经存在，且需要更新：直接替换
                //     oldElem.replaceWith(elem);
                // } else 
                if (oldElem) {
                    // 3已经存在，且不需要更新
                    // 检查位置是否和key一样，不一样的也需要重写
                    const oldIndex = this.findChildElementIndexByOGType(existContentMainPart, key);
                    debugPush("项目", key, "检查位置", oldIndex, "正确位置", index);
                    if (oldIndex != index) {
                        oldElem.remove();
                        reinsertNeeded = true;
                    } else if (!printerAllResults.onlyOnce[index]) {
                        debugPush("项目", key, "已经存在，在原定位置，需要更新");
                        oldElem.replaceWith(elem);
                    }
                }

                if (!oldElem || reinsertNeeded) {
                    // 2没有原始element，且需要更新；这个需要选定插入位置
                    // 4没有原始element，且不需要更新
                    // 根据Key找上一个项目，插在他后面，如果没有上一个项目，插在最前面
                    debugPush("项目", key, "不存在或需要重新插入");
                    if (index == 0) {
                        debugPush("项目", key, "为首个，直接插入");
                        existContentMainPart.insertAdjacentElement("afterbegin", elem);
                    } else {
                        debugPush("项目", key, "确定位置，插入到上一个项目后面");
                        const prevKey = printerAllResults.relateContentKeys[index - 1];
                        const prevIndex = this.findChildElementIndexByOGType(existContentMainPart, prevKey);
                        if (prevIndex >= 0) {
                            existContentMainPart.children[prevIndex].insertAdjacentElement("afterend", elem);
                        } else {
                            warnPush("似乎不该存在这个情况，在非第一个时，上一个元素应当是存在的");
                            existContentMainPart.insertAdjacentElement("afterbegin", elem);
                        }
                    }
                }
            }
            if (g_setting.alignToGrid) ContentApplyer.syncColumnWidthOnPartialRefresh(existContentMainPart as HTMLElement, g_setting);
            existContentMainPart.setAttribute("data-exist-content-part", JSON.stringify(printerAllResults.relateContentKeys));
            // this.adjustWysiwygPaddingBottom();
        }
        // 重新挂载事件
        if (existContentMainPart) {
            this.bindBasicClickEvent(existContentMainPart);
            return null;
        } else {
            this.bindBasicClickEvent(finalElement);
            return finalElement;
        }
    }

    _isBlankAllPrinterResult(printerAllResults: IAllPrinterResult): boolean {
        return printerAllResults.relateContentKeys.length == 0 || (printerAllResults.relateContentKeys.length == 1 && printerAllResults.relateContentKeys[0] == PRINTER_NAME.MOVE_TOP_AREA);
    }

    removeExistElementByOGType(typeKey:string) {
        this.protyleElement.querySelector(`.og-hn-heading-docs-container [data-og-content-type=${typeKey}]`)?.remove();
    }

    findChildElementIndexByOGType(parentFinalElement:Element, typeKey:string) {
        const childElements = Array.from(parentFinalElement.children);
        for (let i = 0; i < childElements.length; i++) {
            const child = childElements[i];
            if (child.getAttribute("data-og-content-type") === typeKey) {
                return i;
            }
        }
        return -1;
    }
    getTransition() {
        const titleElem = window.document.querySelector(".protyle-title");
        const computedStyle = window.getComputedStyle(titleElem);
        if (isValidStr(computedStyle.transition)) {
            return computedStyle.transition;
        }
        return "none";
    }
    async betaApply(finalElement: HTMLElement) {
        this.protyleElement.querySelector(".og-hn-heading-docs-container.og-hn-at-doc-top")?.remove();
        const titleTarget = this.protyleElement.querySelector(`.protyle-title`); //  .protyle-title__input
        const g_setting = getReadOnlyGSettings();
        if (titleTarget && !this.protyleElement.querySelector(`.protyle-content`).classList.contains("fn__none")) {
            const marginRight = window.getComputedStyle(titleTarget).getPropertyValue("margin-right");
            const marginLeft = window.getComputedStyle(titleTarget).getPropertyValue("margin-left");
            logPush("betaApply", marginLeft);
            finalElement.style.marginRight = marginRight;
            finalElement.style.marginLeft = marginLeft;
            finalElement.style.transition = this.getTransition();
            titleTarget.insertAdjacentElement("afterend", finalElement);
        } else if ((this.protyleEnvInfo.originProtyle?.options?.mode == "preview" || !this.protyleElement.querySelector(`.protyle-preview`).classList.contains("fn__none")) && g_setting.enableForPreview) { // 预览模式
            const previewTarget = this.protyleElement.querySelector(`.protyle-preview`) as HTMLElement;
            const containerTarget = previewTarget.querySelector(`.b3-typography`) as HTMLElement;
            if (containerTarget) {
                containerTarget.firstChild?.insertAdjacentElement("afterend", finalElement);
            }
        } else {
            logPush("betaApply - 其他情况，插入到content内");
        }
    }

    weSetObserver(finalElement: HTMLElement) {
        if (finalElement instanceof Promise || finalElement == null) {
            warnPush("不太懂，但这个不对", finalElement);
            return;
        }
        // 响应自适应宽度
        // #65 自适应宽度关闭后，仍然存在宽度调整，因此需要启用observer
        if (window.siyuan?.config?.editor?.fullWidth !== true) {
            debugPush("自适应宽度未开启");
        }
        let targetNode = this.protyleElement.querySelector('.protyle-title');
        if (!targetNode) {
            if (!this.protyleEnvInfo.flashCard) {
                warnPush("无法找到 .protyle-title 元素，observer 未设置");
            }
            return;
        }
        const protyleElement = this.protyleElement;
        debugPush("observer 挂载", targetNode, this.protyleEnvInfo.originProtyle?.id);
        let that = this;
        let observer:any = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            debugPush("observer响应宽度更改，observer设定来源", that.basicInfo.currentDocId, that.protyleEnvInfo.originProtyle?.id);
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                let targetNode = protyleElement.querySelector('.protyle-title') as HTMLElement;
                debugPush("observer", targetNode, targetNode.style, finalElement, finalElement?.style);
                // 获取更改后的样式
                const insertedElement = protyleElement.querySelector(".og-hn-heading-docs-container");
                const computedStyle = window.getComputedStyle(targetNode);
                const getValidMarginValue = (styleInline: string, styleComputed: string): string => {
                    if (styleInline && styleInline !== '') {
                        return styleInline;
                    } else if (styleComputed && styleComputed !== '') {
                        return styleComputed;
                    } else {
                        return '0px';
                    }
                };
                if (insertedElement) {
                    finalElement.style.marginRight = getValidMarginValue(targetNode.style.marginRight, computedStyle.marginRight);
                    finalElement.style.marginLeft = getValidMarginValue(targetNode.style.marginLeft, computedStyle.marginLeft);
                }
            }
        });
        });
        // #67  #117
        if ((window.siyuan?.config?.editor?.fullWidth !== true && isPluginExist("siyuan-center-width")) || !isCurrentVersionLessThan("3.8.3")) {
            logPush("检测到特殊插件，插件将使用兼容模式运行");
            finalElement.style.transition = "";
            let timeout = null;
            observer = new ResizeObserver(function(entries) {
                entries.forEach(function(_entry) {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    // timeout = setTimeout(()=>{
                        debugPush("[兼容模式]observer响应宽度更改，observer设定来源", that.basicInfo.currentDocId, that.protyleEnvInfo.originProtyle?.id);
                        let targetNode = protyleElement.querySelector('.protyle-title') as HTMLElement;
                        // 获取更改后的样式
                        const insertedElement = protyleElement.querySelector(".og-hn-heading-docs-container.og-hn-at-doc-top");
                        const computedStyle = window.getComputedStyle(targetNode);
                        if (insertedElement && computedStyle) {
                            const marginRight = computedStyle.marginRight;
                            const marginLeft = computedStyle.marginLeft;
                            debugPush(`[兼容模式]observer - 检测到margin变化: right=${marginRight}, left=${marginLeft}`);
                            
                            const validatedMarginRight = that.validateAndFixMargin(marginRight);
                            const validatedMarginLeft = that.validateAndFixMargin(marginLeft);
                            
                            finalElement.style.marginRight = validatedMarginRight;
                            finalElement.style.marginLeft = validatedMarginLeft;
                        }
                    // }, 0);
                });
            });
        }
        
        // 防止多个observer，分屏的时候会有多个
        if (!window["og_hn_observe"]) {
            window["og_hn_observe"] = {};
        }
        // 如果protyle已不存在，则断开
        for (const key in window["og_hn_observe"]) {
            if (!window.document.querySelector(`[data-id="${key}"]`)) {
                debugPush("断开先前observer", key);
                window["og_hn_observe"][key]?.disconnect();
                delete window["og_hn_observe"][key];
            }
        }
        let observerId = this.protyleElement.dataset.id;
        if (!isValidStr(observerId)) {
            logPush("设置observer时没有唯一id，将赋予临时id，下个监视器设定时将自动移除", observerId);
            observerId = `temp_id_${Date.now()}`;
        } else {
            debugPush("observer set at ", this.protyleElement.dataset.id);
        }
        window["og_hn_observe"][observerId] = observer;
        let config = { attributes: true, attributeFilter: ['style'] };
        if (observer instanceof ResizeObserver) {
            config = null;
        }
        // #73 ResizeObserver绑定.title的情况下，有时获得了旧margin数据
        // 新版思源应该可以直接不监听了，性能能提升点？
        if (!isCurrentVersionLessThan("3.8.3")) {
            const computedStyle = getComputedStyle(this.protyleElement.querySelector('.protyle-title'));
            const value = computedStyle.getPropertyValue('--b3-protyle-padding-left').trim();
            debugPush("检测到3.8.3以上版本，获取了--b3-protyle-padding-left", value);
            if (isValidStr(value)) {
                debugPush("检测到3.8.3以上版本，且获取了--b3-protyle-padding-left，停用ResizeObserver绑定.protyle-content");
                finalElement.style.marginLeft = "var(--b3-protyle-padding-left)";
                finalElement.style.marginRight = "var(--b3-protyle-padding-right)";
            }
        } else if (observer instanceof ResizeObserver) {
            observer.observe(this.protyleElement);
        } else {
            observer.observe(targetNode, config);
        }
    }

    async defaultApply(finalElement: HTMLElement) {
        // 应用内容
        // 本组目前只支持PC端插入
        // 移除旧的
        this.protyleElement.querySelector(".og-hn-heading-docs-container.og-hn-at-doc-top")?.remove();
        // 插入新的
        const titleTarget = this.protyleElement.querySelector(`.protyle-title .protyle-title__input`);
        if (titleTarget) {
            titleTarget.insertAdjacentElement("afterend", finalElement);
        }
    }

    async endApply(finalElement: HTMLElement) {
        // 考虑到其他插件的插入，目前给出其他判定
        // 番茄工具箱 [bkmaker_add]
        this.protyleElement.querySelector(".og-hn-heading-docs-container.og-hn-at-doc-end")?.remove();
        // 插入新的
        const contentTarget = this.protyleElement.querySelector(`.protyle-content`) as HTMLElement;
        const g_setting = getReadOnlyGSettings();
        if (contentTarget.classList.contains("fn__none") && g_setting.enableForPreview) {
            const previewTarget = this.protyleElement.querySelector(`.protyle-preview`) as HTMLElement;
            const containerTarget = previewTarget.querySelector(`.b3-typography`) as HTMLElement;
            if (containerTarget) {
                containerTarget.insertAdjacentElement("beforeend", finalElement);
            }
        } else {
            // 非预览模式
            // 初始宽度设定
            const titleTarget = this.protyleElement.querySelector(`.protyle-title`); //  .protyle-title__input
            if (titleTarget) {
                const marginRight = window.getComputedStyle(titleTarget).getPropertyValue("margin-right");
                const marginLeft = window.getComputedStyle(titleTarget).getPropertyValue("margin-left");
                finalElement.style.marginRight = marginRight;
                finalElement.style.marginLeft = marginLeft;
                finalElement.style.transition = this.getTransition();
            }
            if (contentTarget) {
                contentTarget.insertAdjacentElement("beforeend", finalElement);
            }
            // this.adjustWysiwygPaddingBottom();
        }
        
    }

    adjustWysiwygPaddingBottom() {
        const wysiwyg = this.protyleElement.querySelector(".protyle-wysiwyg") as HTMLElement;
        debugPush("paddingBottom", wysiwyg, wysiwyg.style.paddingBottom, this.protyleElement.clientHeight / 3);
        if (wysiwyg?.style?.paddingBottom) {
            if (!isMobile()) {
                wysiwyg.style.paddingBottom = this.protyleElement.clientHeight / 5 + "px";
            }
        }
    }

    async mobileApply(finalElement: HTMLElement) {
        // if (window.document.querySelector(`.protyle-background[data-node-id="${docId}"] .og-hn-heading-docs-container`) != null) return;
        // if (window.document.querySelector(`.protyle-background__icon`).classList.contains("fn__none")) {
        //     finalElement.style.paddingTop = "16px";
        // } else {
            
        // }
        finalElement.style.paddingTop = "16px";
        finalElement.style.paddingLeft = "24px";
        finalElement.style.paddingRight = "16px";
        // finalElement.style.paddingTop = "16px";
        window.document.querySelector(`.protyle-background[data-node-id]`).insertAdjacentElement("afterend", finalElement);
        debugPush("安卓端写入完成");
    }

    async flashcardApply(finalElement: HTMLElement) {
        finalElement.style.paddingLeft = "24px";
        finalElement.style.paddingRight = "16px";
        this.protyleElement.querySelector(".protyle-content").insertAdjacentElement("afterbegin", finalElement);
    }

    bindBasicClickEvent(element: Element) {
        const g_settings = getReadOnlyGSettings();
        // 理论上需要包含openRefLink的绑定（统一）其他的交给Printer管
        element.querySelectorAll(".og-hn-heading-docs-container .refLinks").forEach((elem) => {
            // .bind结果应当暂存，否则无法remove先前的
            elem.removeEventListener("click", this.clickEventHandler, g_settings.openDocClickListenerCompatibilityMode);
            elem.addEventListener("click", this.clickEventHandler, g_settings.openDocClickListenerCompatibilityMode);
        });
    }

    /**
     * 统一列宽注入（网格对齐模式）：
     * - 计算得到的基准列宽写入父容器 CSS 变量 `--og-hn-multiline-column-width`（仅作用于 multiline 容器）。
     * - multiline 元素带 `og-hn-container-multiline` 类，此处覆写其内联
     *   `grid-template-columns: repeat(auto-fill, minmax(var(--og-hn-multiline-column-width), 1fr))`
     *   （auto-fill 响应式列数；minmax 的 1fr 将余量均匀拉伸填满，无闪烁）。
     * - next-doc 元素（带 `og-hn-container-next-doc`，不使用 multiline 类）不在此处处理：
     *   其两列布局由 setStyle 中针对该类的 CSS 规则独立驱动，不跟随本列宽变量。
     */
    static applyColumnWidthVar(finalElement: HTMLElement, colWPx: number): void {
        finalElement.style.setProperty("--og-hn-multiline-column-width", `${Math.round(colWPx)}px`);
        (finalElement.querySelectorAll(".og-hn-container-multiline") as NodeListOf<HTMLElement>)
            .forEach(m => (m.style.gridTemplateColumns = "repeat(auto-fill, minmax(var(--og-hn-multiline-column-width), 1fr))"));
    }

    /** 列宽统计重算
     * 应用于首次插入或设置项变更
     **/
    static writeColumnWidthToFinal(finalElement: HTMLElement, g_setting: any): number {
        const w = ContentApplyer.resolveColumnWidthPx(finalElement, g_setting);
        finalElement.dataset.ogHnMultilineColumnWidth = String(Math.round(w));
        ContentApplyer.applyColumnWidthVar(finalElement, w);
        return w;
    }

    /** 部分刷新：复用计算的缓存值 */
    static syncColumnWidthOnPartialRefresh(existContentMainPart: HTMLElement, g_setting: any): void {
        const cached = existContentMainPart.dataset.ogHnMultilineColumnWidth;
        if (cached) {
            ContentApplyer.applyColumnWidthVar(existContentMainPart, parseFloat(cached));
            return;
        }
        // 如果没有缓存，则重新计算并写入
        ContentApplyer.writeColumnWidthToFinal(existContentMainPart, g_setting);
    }

    /** 列宽计算 */
    static resolveColumnWidthPx(finalElement: HTMLElement, g_setting: any): number {
        const fontSizePx = getContentAreaFontSizePx(g_setting);
        // 如果用户设置了相同宽度且最大宽度与相同宽度一致，则直接返回该宽度
        if (g_setting.sameWidth === g_setting.sameMaxWidth && g_setting.sameWidth !== 0) {
            return g_setting.sameWidth * fontSizePx;
        }
        // 三套测量与三种算法本身保留在 gridColumnWidth.ts 供单测，调整时直接改这里即可。
        const DEFAULT_MEASURE_METHOD: "canvas" | "chars" | "scriptWeight" = "scriptWeight";
        const DEFAULT_COLUMN_WIDTH_ALGO: "percentile" | "user" | "trimmedMean" = "percentile";
        const DEFAULT_PERCENTILE = 85;
        const measurer =
            DEFAULT_MEASURE_METHOD === "chars"        ? measureDocNameLengthByChars :
            DEFAULT_MEASURE_METHOD === "scriptWeight" ? measureDocNameLengthByScriptWeight :
                                                        measureDocNameLengthByCanvas;
        const lengths: number[] = [];
        (finalElement.querySelectorAll(".og-hn-container-multiline") as NodeListOf<HTMLElement>)
            .forEach(m => lengths.push(...measureMultilineDocNameLengths(m, measurer, fontSizePx)));
        if (lengths.length === 0) {
            return g_setting.sameWidth > 0 ? g_setting.sameWidth * fontSizePx : 10 * fontSizePx; // 兜底
        }
        const raw = computeRawColumnWidth(lengths, DEFAULT_COLUMN_WIDTH_ALGO,
            { percentile: DEFAULT_PERCENTILE });
        const minPx = g_setting.sameWidth    > 0 ? g_setting.sameWidth    * fontSizePx : 0;
        const maxPx = g_setting.sameMaxWidth > 0 ? g_setting.sameMaxWidth * fontSizePx : Infinity;
        return clampColumnWidth(raw, minPx, maxPx);
    }
}

/**
 * 设置变更后重算多行 doc link 列宽（网格对齐模式）。
 * 遍历当前页面所有已渲染的 .og-hn-heading-docs-container，依据最新设置重新测量文档名、
 * 重新计算列宽并写回内联样式；网格对齐开启时生效，关闭时清理残留内联样式（交由 setStyle 的 flex 规则 + 文档链接最小/最大宽度约束）
 */
export function recalcMultilineColumnWidthOnSettingsChange(): void {
    const g_setting = getReadOnlyGSettings();
    const containers = document.querySelectorAll<HTMLElement>(".og-hn-heading-docs-container");
    if (!g_setting.alignToGrid) {
        // 网格对齐关闭：移除可能在开启状态下残留的内联 grid 相关样式，避免覆盖 setStyle 的 flex 规则
        containers.forEach((c) => {
            c.style.removeProperty("--og-hn-multiline-column-width");
            c.querySelectorAll<HTMLElement>(".og-hn-container-multiline")
                .forEach((m) => (m.style.gridTemplateColumns = ""));
        });
        return;
    }
    containers.forEach((c) => {
        ContentApplyer.writeColumnWidthToFinal(c, g_setting);
    });
}