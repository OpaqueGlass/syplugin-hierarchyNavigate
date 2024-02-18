import { getDefaultSettings, getReadOnlyGSettings } from "@/manager/settingManager";
import { CONSTANTS } from "@/constants";
import { logPush } from "@/logger";

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
        width: ${g_setting.sameWidth}em;
    }`;
    let noIndicatorStyle = g_setting.hideIndicator ? `
    .og-hn-heading-docs-container .og-hierachy-navigate-doc-indicator {
        display:none;
    }
    `:"";
    let iconAdjustStyle = g_setting.adjustDocIcon ? `
    .protyle-title__icon {
        top: 25px;
    }
    `:"";

    let noneDisplayStyle = g_setting.noneAreaHide ? `
    .${CONSTANTS.NONE_CLASS_NAME} {
        display: none;
    }
    ` : "";
    // 第二行后对齐链接文本，（向内缩进： #21）
    let alignStyle = `
    .og-hn-container-multiline {
        text-indent: -2.28em;
        padding-left: 2.28em;
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

    const defaultLinkStyle = `
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper{
        background-color: var(--b3-protyle-code-background);/*var(--b3-protyle-inline-code-background); --b3-protyle-code-background  --b3-theme-surface-light*/
        color: var(--b3-protyle-inline-code-color);
        line-height: ${g_setting.fontSize + 2}px;
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
    }
    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper.og-hn-docLinksWrapper-hl {
        background-color: color-mix(in srgb, var(--b3-protyle-code-background) 95%, var(--b3-theme-on-background));
        border: 0.55px dashed color-mix(in srgb, var(--b3-protyle-code-background) 35%, var(--b3-theme-on-background));
    }

    .${CONSTANTS.CONTAINER_CLASS_NAME} span.og-hn-emoji-and-name {
        margin: 0 auto; /*居中显示*/
        text-overflow: ellipsis;
        overflow: hidden;
    }
    .og-hierachy-navigate-sibling-doc-container  span.refLinks, 
    .og-hierachy-navigate-children-doc-container span.refLinks,
    .og-hierachy-navigate-next-doc-container span.refLinks,
    .og-hierachy-navigate-backlink-doc-container span.refLinks {
        margin-right: 10px;
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

    .og-hn-heading-docs-container span.docLinksWrapper:hover {
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

    ${iconAdjustStyle}

    ${linkWidthRestrict}

    ${noIndicatorStyle}

    ${noneDisplayStyle}

    ${g_setting.hideIndicator ? "" : alignStyle}

    .og-hierachy-navigate-doc-container {
        max-height: ${g_setting.maxHeightLimit}em;
        overflow-y: auto;
    }

    .og-hierachy-navigate-doc-container + .og-hierachy-navigate-doc-container {
        padding-top: 3px;
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

    .og-hn-heading-docs-container .og-fake-breadcrumb-arrow-span {
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

    ${g_setting.docLinkCSS == g_setting_default.docLinkCSS && g_setting.docLinkClass == g_setting_default.docLinkClass ? defaultLinkStyle:""}
    .${CONSTANTS.PARENT_CONTAINER_ID} {${styleEscape(g_setting.parentBoxCSS)}}

    .${CONSTANTS.CHILD_CONTAINER_ID} {${styleEscape(g_setting.childBoxCSS)}}

    .${CONSTANTS.SIBLING_CONTAINER_ID} {${styleEscape(g_setting.siblingBoxCSS)}}

    .${CONSTANTS.CONTAINER_CLASS_NAME} span.docLinksWrapper {${styleEscape(g_setting.docLinkCSS)}}
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