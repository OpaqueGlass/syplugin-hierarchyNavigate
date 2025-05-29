import { getDefaultSettings, getReadOnlyGSettings } from "@/manager/settingManager";
import { CONSTANTS } from "@/constants";
import { logPush } from "@/logger";
import { isMobile } from "@/syapi";
import { lang } from "@/utils/lang";

export function setStyle() {
    removeStyle();
    const g_setting = getReadOnlyGSettings();
    logPush("set styleg_setting", g_setting);
    const g_setting_default = getDefaultSettings();
    const head = document.getElementsByTagName('head')[0];
    const style = document.createElement('style');
    style.setAttribute("id", CONSTANTS.STYLE_ID);
    let linkWidthRestrict = g_setting.sameWidth == 0 ? "" : `
    .og-hn-heading-docs-container span.docLinksWrapper {
        min-width: ${g_setting.sameWidth}em;
    }`;
    let noIndicatorStyle = g_setting.hideIndicator ? `
    .og-hn-heading-docs-container .og-hierachy-navigate-doc-indicator {
        display:none;
    }
    `:"";

    let borderDisplayStyle = g_setting.areaBorder ? 
    `
    .og-hierachy-navigate-doc-container {
        border: 1px solid rgba(0, 0, 0, 0);
    }
    
    .og-hierachy-navigate-doc-container:hover {
        border: 1px solid var(--b3-theme-surface-lighter);
    }
    `: "";

    let noneDisplayStyle = g_setting.noneAreaHide ? `
    .${CONSTANTS.NONE_CLASS_NAME} {
        display: none;
    }
    ` : "";
    // 第二行后对齐链接文本，（向内缩进： #21）
    let alignStyle = `
    .og-hn-container-multiline {
        text-indent: -2em; /*2.28略微多了*/
        padding-left: 2em;
        overflow-x: hidden;
        /* #30 2.28em与100%导致宽度溢出 */
        padding-right: 0em;
        width: auto;
    }
    .og-hn-container-multiline .og-hierachy-navigate-doc-indicator {
        
    }
    .og-hn-container-multiline .og-hn-emoji-and-name {
        text-indent: 0px;
    }

    .og-hn-container-multiline .og-hn-doc-none-word {
        text-indent: 0px;
    }
    
    `;

    let toTheTop = `
.${CONSTANTS.TO_THE_TOP_CLASS_NAME} {
    z-index: 9;
    position: fixed;
    top: 10px;
    left: 10px;
    background: var(--b3-toolbar-background);
    border: 1px solid var(--b3-toolbar-blur-background);
}
    `;

    let calColumnCount = g_setting.sameWidthColumn;
    if (isMobile()) {
        calColumnCount = g_setting.sameWidthColumnMobile;
    }
    let docNameCenteringCSS = g_setting.docNameCentering ? "margin: 0 auto; /*居中显示*/": "";
    const linkColumnStyle = calColumnCount > 0 ? 
    `
    .og-hierachy-navigate-doc-container.og-hierachy-navigate-children-doc-container span.docLinksWrapper,
    .og-hierachy-navigate-doc-container.og-hierachy-navigate-sibling-doc-container span.docLinksWrapper,
    .og-hierachy-navigate-doc-container.og-hierachy-navigate-onthisday-doc-container span.docLinksWrapper,
    .og-hierachy-navigate-doc-container.og-hierachy-navigate-backlink-doc-container span.docLinksWrapper {
        width: calc( (100% - ${calColumnCount} * ${calColumnCount == 1 ? "0px" : "10px"}) / ${calColumnCount});
        ${calColumnCount == 1 ? "margin-right: 0px;" : ""}/*仅一列时忽略margin-right*/
    }
    `: ``;

    const defaultLinkStyle = `
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper{
        background-color: var(--b3-protyle-code-background);/*var(--b3-protyle-inline-code-background); --b3-protyle-code-background  --b3-theme-surface-light*/
        color: var(--b3-protyle-inline-code-color);
        /*line-height: calc(${g_setting.fontSize}px + 0.2em);*/ /*此项导致连接上下可滚动*/
        font-weight: 400;
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        padding: 4px 6px;
        border-radius: ${(g_setting.fontSize + 2)}px;
        transition: var(--b3-transition);
        margin-bottom: 3px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        max-width: calc(100% - 10px); /*需要排除margin-right: 10px的影响*/
    }
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper.og-hn-docLinksWrapper-hl {
        background-color: color-mix(in srgb, var(--b3-protyle-code-background) 95%, var(--b3-theme-on-background));
        border: 0.55px dashed color-mix(in srgb, var(--b3-protyle-code-background) 35%, var(--b3-theme-on-background));
    }
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper.og-none-click {
        color: var(--b3-theme-on-background);
    }


    .${CONSTANTS.CONTAINER_CLASS_NAME} span.og-hn-emoji-and-name {
        ${docNameCenteringCSS} /*居中显示*/
        text-overflow: ellipsis;
        overflow-x: hidden; /* 修复文字下侧被截断的问题 */
    }

    /* 语义调整 refLinks 的可点击，其他仅样式 https://github.com/OpaqueGlass/syplugin-hierarchyNavigate/issues/61 */
    .og-hierachy-navigate-sibling-doc-container  span.docLinksWrapper, 
    .og-hierachy-navigate-children-doc-container span.docLinksWrapper,
    .og-hierachy-navigate-next-doc-container span.docLinksWrapper,
    .og-hierachy-navigate-backlink-doc-container span.docLinksWrapper {
        margin-right: 10px;
    }
    /* 这里，由于提示词单独占位，导致提示词-链接之间gap一样也有10px，或许可以考虑全都加入gap就不显得突兀了 */
    .og-hierachy-navigate-sibling-doc-container, 
    .og-hierachy-navigate-children-doc-container,
    .og-hierachy-navigate-next-doc-container,
    .og-hierachy-navigate-backlink-doc-container {
        /*display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: flex-start;*/
    }
    `;

    const previewNext = `
.og-hierachy-navigate-next-preview-doc-container {
    max-height: 230px;
    overflow: hidden;
}
.og-hn-np-inner-flex {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    gap: 20px;
    height: 100%;
}

.og-hn-np-nav-preview {
    flex: 1;
    min-width: 0;
    cursor: pointer;
    display: flex;
}

.og-hn-np-nav-preview-inner {
    border: 1px solid var(--b3-table-border-color);
    border-radius: 8px;
    padding: 15px;
    height: 100%;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 0;
    box-sizing: border-box;
}

.og-hn-np-nav-preview-inner:hover {
    border-color: #888;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    /*background-color: #00000011;*/
}

.og-hn-np-prev .og-hn-np-nav-direction,
.og-hn-np-prev .og-hn-np-nav-post-title,
.og-hn-np-prev .og-hn-np-nav-excerpt {
    text-align: left;
}

.og-hn-np-next .og-hn-np-nav-direction,
.og-hn-np-next .og-hn-np-nav-post-title{
    text-align: right;
}

.og-hn-np-nav-direction {
    font-weight: bold;
    color: var(--custom-h2-color);
    margin-bottom: 5px;
}

.og-hn-np-nav-post-title {
    font-size: 1.1em;
    font-weight: bold;
    color: var(--custom-h2-color);
    margin-bottom: 10px;
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.og-hn-np-nav-excerpt {
    color: var(--b3-theme-on-surface);
    font-size: 1em;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    flex-grow: 1;
}

.og-hn-np-placeholder {
    background-color: #00000001;
    color: transparent;
    user-select: none;
}

.og-hn-np-placeholder .og-hn-np-nav-excerpt {
    background-color: #eee;
    color: transparent;
    border-radius: 4px;
}

.og-hn-np-placeholder .og-hn-np-nav-direction::after {
    content: "${lang("no_doc")}";
    color: #999;
    display: block;
}

.og-hn-np-placeholder .og-hn-np-nav-post-title,
.og-hn-np-placeholder .og-hn-np-nav-excerpt {
    visibility: hidden;
}

.og-hn-np-nav-preview.og-hn-np-non-clickable {
    cursor: not-allowed;
}
.og-hn-heading-docs-container.og-hn-at-doc-end {
    padding-bottom: 20px;
}
    `;

    const previewBox = `
    /* 主容器 */
.og-hn-pb-container {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    overflow: auto;
}

/* 单个文档方块 */
.og-hn-pb-doc-box {
    border: 1px solid var(--b3-table-border-color);
    flex: 1 0 250px;
    max-height: 200px;
    overflow: auto;
    border-radius: 10px;
    padding: 10px 15px 15px 8px;
    margin: 5px;
    display: flex;
    flex-direction: column;
}

/* 文档标题 */
.og-hn-pb-title {
    margin: 10px 0;
    font-size: 1.1em;
    font-weight: bold;
    color: var(--custom-h2-color);
    cursor: pointer;
}

/* 文档内容预览 */
.og-hn-pb-content {
    margin: 0 0 0 7px;
    width: 95%;
    white-space: normal;
    overflow: hidden;
    font-size: 1em;
}

/* 子文档容器 */
.og-hn-pb-child-container {
    margin-left: 7px;
    width: 95%;
}

/* 子文档项 */
.og-hn-pb-child-item {
    margin: 5px 0;
    font-size: 0.9em;
    white-space: normal;
}

/* 子文档链接 */
.og-hn-pb-child-item {
    cursor: pointer;
    color: var(--b3-protyle-inline-link-color);
}
.og-hn-pb-child-item:hover {
    background-color: #00000010;
}

/* emoji图标 */
.og-hn-pb-emoji {
    margin-right: 5px;
}

/* 深色模式适配 */
.dark-mode .og-hn-pb-doc-box {
    background-color: #efefef15;
    color: #C9D1D9;
}

.dark-mode .og-hn-pb-doc-box:hover {
    background-color: #efefef25;
}

.dark-mode .og-hn-pb-content a {
    color: #7aa7d4 !important;
}

/* 悬停效果 */
.og-hn-pb-doc-box:hover {
    border-color: #888;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 任务列表样式调整 */
.og-hn-pb-content ul:has(> .protyle-task) {
    list-style-type: none;
    padding-left: 16px;
}

.og-hn-pb-content > ul:has(> .protyle-task) {
    padding-left: 0px;
}

.og-hn-pb-content .protyle-task input ~ p {
    display: inline-block;
}

/* 图片显示 */
.og-hn-pb-content .img img {
    max-width: 100%;
    display: inline-block;
}
.og-hn-pb-content .code-block {
    background-color: unset;
}
.og-hn-pb-content .code-block .hljs {
    overflow: hidden;
}

    `;

    style.innerHTML = `

    .og-hn-doc-none-word {
        background-color: #d23f3155;/*var(--b3-protyle-inline-code-background); --b3-protyle-code-background  --b3-theme-surface-light*/
        width: 2.5em;
        text-align: center;
        display: inline-grid !important;
        color: var(--b3-theme-on-background);
        line-height: ${g_setting.fontSize + 2}px;
        font-weight: 400;
        align-items: center;
        box-sizing: border-box;
        /* #30 调整padding左右，尽量避免换行导致右侧大量留白 */
        padding: 4px 4px;
        border-radius: ${(g_setting.fontSize + 2)}px;
        transition: var(--b3-transition);
        margin-bottom: 3px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .og-hn-menu-emojitext, .og-hn-menu-emojipic {
        align-self: center;
        height: 14px;
        width: 14px;
        line-height: 14px;
        margin-right: 8px;
        flex-shrink: 0;
    }

    img.og-hn-menu-emojipic {
        width: 16px;
        height: 16px;
    }
    /* 语义调整 refLink的可点击，其他仅样式 https://github.com/OpaqueGlass/syplugin-hierarchyNavigate/issues/61 */
    .og-hn-heading-docs-container span.docLinksWrapper.refLinks:hover {
        cursor: pointer;
        box-shadow: 0 0 2px var(--b3-list-hover);
        opacity: .86;
        /*background-color: var(--b3-toolbar-hover);*/
        /*text-decoration: underline;*/
    }

    .og-hn-heading-docs-container .trimDocName {
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .og-hn-heading-docs-container {
        padding: 0px 6px;
        font-size: ${g_setting.fontSize}px;
    }

    ${linkWidthRestrict}

    ${noIndicatorStyle}

    ${noneDisplayStyle}

    ${g_setting.hideIndicator ? "" : alignStyle}

    ${linkColumnStyle}

    ${borderDisplayStyle}

    ${toTheTop}

    ${previewNext}

    ${previewBox}

    /* 限制相邻文档区域 链接宽度*/
    .og-hierachy-navigate-doc-container.og-hierachy-navigate-next-doc-container span.docLinksWrapper {
        max-width: calc( (100% - 2em - 1 * 10px) / 2);
    }

    .og-hierachy-navigate-doc-container {
        max-height: ${g_setting.maxHeightLimit}em;
        overflow-y: scroll;
    }

    .og-hierachy-navigate-doc-container.og-hn-not-fold {
        max-height: 50vh;
    }

    .og-hierachy-navigate-doc-container + .og-hierachy-navigate-doc-container {
        padding-top: 6px;
    }

    .og-hn-create-at-wrapper, .og-hn-modify-at-wrapper, .og-hn-child-doc-count-wrapper, .og-hn-child-word-count-wrapper {
        margin-right: 8px;
    }

    .og-hn-create-at-indicator, .og-hn-modify-at-indicator, .og-hn-child-word-count-indicator, .og-hn-child-doc-count-wrapper {
        color: var(--b3-theme-on-surface);
    }

    .og-hn-create-at-content, .og-hn-modify-at-content, .og-hn-child-word-count-content, .og-hn-child-doc-count-content {
        font-weight: 600;
        color: var(--b3-theme-on-background);
    }

    .og-hn-notebook-wrapper {
        color: var(--b3-theme-on-background);
    }

    .og-hierachy-navigate-info-container {
        margin-bottom: 7px;
    }

    .${CONSTANTS.CONTAINER_CLASS_NAME} {
        text-align: left;
    }

    /* 面包屑箭头 */
    .og-hn-heading-docs-container .og-fake-breadcrumb-arrow-span .${CONSTANTS.ARROW_CLASS_NAME} {
        height: 10px;
        width: 10px;
        color: var(--b3-theme-on-surface-light);
        margin: 0 4px;
        flex-shrink: 0;
    }

    /* 块没有>功能，屏蔽 */
    .og-hn-heading-docs-container .og-fake-breadcrumb-arrow-span[data-type="FILE"],
    .og-hn-heading-docs-container .og-fake-breadcrumb-arrow-span[data-type="NOTEBOOK"] {
        display: inline-block;
        cursor: pointer;
    }

    .og-hn-parent-area-replace-with-breadcrumb .docLinksWrapper {
        margin: 0 auto;
    }

    .og-hn-widget-container {
        border-bottom: solid 1px var(--b3-border-color);

    }

    .og-hn-widget-container {
        padding: 0px 6px;
    }

    .og-hn-widget-container.og-hn-mobile {
        padding-top: 16px;
        padding-left: 24px;
        padding-right: 16px;
    } 

    .og-hn-more-less {
        color: var(--b3-protyle-inline-link-color);
        cursor: pointer;
    }
    .og-hn-more-less:hover {
        text-decoration: underline;
    }

    ${g_setting.docLinkCSS == g_setting_default.docLinkCSS && g_setting.docLinkClass == g_setting_default.docLinkClass ? defaultLinkStyle:""}
    .${CONSTANTS.PARENT_CONTAINER_ID} {${styleEscape(g_setting.parentBoxCSS)}}

    .${CONSTANTS.CHILD_CONTAINER_ID} {${styleEscape(g_setting.childBoxCSS)}}

    .${CONSTANTS.SIBLING_CONTAINER_ID} {${styleEscape(g_setting.siblingBoxCSS)}}

    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper {${styleEscape(g_setting.docLinkCSS)}}

    /* 置顶后占位 */
    .${CONSTANTS.PLACEHOLDER_FOR_POP_OUT_CLASS_NAME} {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    /* 折叠隐藏 */
    .og-hn-heading-docs-container .${CONSTANTS.IS_FOLDING_CLASS_NAME} {
        display: none !important;
    }
    `;
    head.appendChild(style);
}

function styleEscape(str) {
    if (!str) return "";
    return str.replace(new RegExp("<[^<]*style[^>]*>", "g"), "");
}


export function removeStyle() {
    document.getElementById(CONSTANTS.STYLE_ID)?.remove();
}

export function setCouldHideStyle() {
    const style = document.createElement("style");
    style.id = CONSTANTS.HIDE_COULD_FOLD_STYLE_ID;
    style.innerHTML = `.${CONSTANTS.COULD_FOLD_CLASS_NAME} {display: none !important;}`;
    document.head.appendChild(style);
}

export function removeCouldHideStyle() {
    document.getElementById(CONSTANTS.HIDE_COULD_FOLD_STYLE_ID)?.remove();
}