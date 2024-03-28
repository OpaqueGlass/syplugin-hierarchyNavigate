import { debugPush, logPush, warnPush } from "@/logger";
import { isMobile } from "@/syapi";
import { openRefLinkInProtyleWnd } from "@/utils/common";
import { getPluginInstance } from "@/utils/getInstance";
import { getBackend, getFrontend, showMessage } from "siyuan";

export default class ContentApplyer {
    private basicInfo: IBasicInfo;
    private protyleEnvInfo: IProtyleEnvInfo;
    private protyleElement: HTMLElement;
    constructor(basicInfo, protyleEnvInfo, protyleElement: HTMLElement) {
        this.basicInfo = basicInfo;
        this.protyleEnvInfo = protyleEnvInfo;
        this.protyleElement = protyleElement;
    }
    // TODO: 各个部分依次替换，并能获取哪个部分不替换的信息
    async apply(printerAllResults: IAllPrinterResult) {
        
        // 判断是否存在，提供存在参数（解析类）
        // 这个是新的Element，如果要在旧的基础上替换，需要重新设置dataset
        const finalElement = document.createElement("div");
        finalElement.classList.add("og-hn-heading-docs-container");
        finalElement.dataset["existContentPart"] = JSON.stringify(printerAllResults.relateContentKeys);
        // 要不这边先构成最终finalElement，再交给各个类型的apply函数写入，其余函数只插入一个元素
        // TODO: 似乎有一些情况会导致多个内容区, selectorAll然后remove掉靠后的吧
        // 看样子是ios快速切换时有残留
        if (isMobile()) {
            // showMessage(`单独处理测试，旧区域个数：${document.querySelectorAll(".og-hn-heading-docs-container")?.length}，backend ${getBackend()}，此编辑区旧区域个数 ${this.protyleElement.querySelectorAll(".og-hn-heading-docs-container")?.length}`);
            document.querySelectorAll(".og-hn-heading-docs-container").forEach((elem) => {
                elem.remove();
            });
        }
        const allExistMainPart = this.protyleElement.querySelectorAll(".og-hn-heading-docs-container");
        const existContentMainPart = allExistMainPart ? allExistMainPart[0] : null;

        if (!existContentMainPart) {
            debugPush("未找到已经存在的，插入新的区域");
            for (const elem of printerAllResults.elements) {
                finalElement.appendChild(elem);
            }
            // 判断当前类型，交给不同的apply
            if (this.protyleEnvInfo.flashCard) {
                this.flashcardApply(finalElement);
            } else if (this.protyleEnvInfo.mobile) {
                this.mobileApply(finalElement);
            } else {
                this.defaultApply(finalElement);
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
            existContentMainPart.setAttribute("data-exist-content-part", JSON.stringify(printerAllResults.relateContentKeys));
        }
        // 重新挂载事件
        if (existContentMainPart) {
            this.bindBasicClickEvent(existContentMainPart);
        } else {
            this.bindBasicClickEvent(finalElement);
        }
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

    async defaultApply(finalElement: HTMLElement) {
        // 应用内容
        // 本组目前只支持PC端插入
        // 移除旧的
        this.protyleElement.querySelector(".og-hn-heading-docs-container")?.remove();
        // 插入新的
        const titleTarget = this.protyleElement.querySelector(`.protyle-title .protyle-title__input`);
        if (titleTarget) {
            titleTarget.insertAdjacentElement("afterend", finalElement);
        }
    }

    async mobileApply(finalElement: HTMLElement) {
        // if (window.document.querySelector(`.protyle-background[data-node-id="${docId}"] .og-hn-heading-docs-container`) != null) return;
        finalElement.style.paddingLeft = "24px";
        finalElement.style.paddingRight = "16px";
        finalElement.style.paddingTop = "16px";
        window.document.querySelector(`.protyle-background[data-node-id]`).insertAdjacentElement("afterend", finalElement);
        debugPush("安卓端写入完成");
    }

    async flashcardApply(finalElement: HTMLElement) {
        finalElement.style.paddingLeft = "24px";
        finalElement.style.paddingRight = "16px";
        this.protyleElement.querySelector(".protyle-content").insertAdjacentElement("afterbegin", finalElement);
    }

    bindBasicClickEvent(element: Element) {
        // 理论上需要包含openRefLink的绑定（统一）其他的交给Printer管
        element.querySelectorAll(".og-hn-heading-docs-container span.refLinks").forEach((elem) => {
            // TODO: 这里设置为 openInFocus Flase，不在聚焦位置打开
            elem.removeEventListener("click", openRefLinkInProtyleWnd.bind(null, this.protyleElement, false));
            elem.addEventListener("click", openRefLinkInProtyleWnd.bind(null, this.protyleElement, false));
        });
    }
}