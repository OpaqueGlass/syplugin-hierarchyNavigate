import { logPush } from "@/logger";
import { openRefLinkInProtyleWnd } from "@/utils/common";

export default class ContentApplyer {
    private basicInfo: IBasicInfo;
    private protyleEnvInfo: IProtyleEnvInfo;
    private protyleElement: HTMLElement;
    constructor(basicInfo, protyleEnvInfo, protyleElement: HTMLElement) {
        this.basicInfo = basicInfo;
        this.protyleEnvInfo = protyleEnvInfo;
        this.protyleElement = protyleElement;
    }
    async apply(finalElement: HTMLElement) {
        // 应用内容
        // 本组目前只支持PC端插入
        // 移除旧的
        this.protyleElement.querySelector(".og-hn-heading-docs-container")?.remove();
        // 插入新的
        const titleTarget = this.protyleElement.querySelector(`.protyle-title .protyle-title__input`);
        if (titleTarget) {
            titleTarget.insertAdjacentElement("afterend", finalElement);
        }

        // 理论上需要包含openRefLink的绑定（统一）其他的交给Printer管
        finalElement.querySelectorAll(".og-hn-heading-docs-container span.refLinks").forEach((elem) => {
            // TODO: 这里设置为 openInFocus Flase，不在聚焦位置打开
            elem.addEventListener("click", openRefLinkInProtyleWnd.bind(null, this.protyleElement, false));
        });
    }
}