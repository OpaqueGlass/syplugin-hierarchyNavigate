export const CONSTANTS = {
    RANDOM_DELAY: 300, // 插入挂件的延迟最大值，300（之后会乘以10）对应最大延迟3秒
    OBSERVER_RANDOM_DELAY: 500, // 插入链接、引用块和自定义时，在OBSERVER_RANDOM_DELAY_ADD的基础上增加延时，单位毫秒
    OBSERVER_RANDOM_DELAY_ADD: 100, // 插入链接、引用块和自定义时，延时最小值，单位毫秒
    OBSERVER_RETRY_INTERVAL: 1000, // 找不到页签时，重试间隔
    STYLE_ID: "hierarchy-navigate-plugin-style",
    ICON_ALL: 2,
    ICON_NONE: 0,
    ICON_CUSTOM_ONLY: 1,
    PLUGIN_NAME: "og_hierachy_navigate",
    SAVE_TIMEOUT: 900,
    CONTAINER_CLASS_NAME: "og-hierachy-navigate-doc-container", 
    ARROW_CLASS_NAME: "og-hierachy-navigate-breadcrumb-arrow",
    INFO_CONTAINER_CLASS: "og-hierachy-navigate-info-container",
    PARENT_CONTAINER_ID: "og-hierachy-navigate-parent-doc-container",
    CHILD_CONTAINER_ID: "og-hierachy-navigate-children-doc-container",
    SIBLING_CONTAINER_ID: "og-hierachy-navigate-sibling-doc-container",
    INDICATOR_CLASS_NAME: "og-hierachy-navigate-doc-indicator",
    NONE_CLASS_NAME: "og-hierachy-navigate-doc-not-exist",
    NEXT_CONTAINER_CLASS_NAME: "og-hierachy-navigate-next-doc-container",
    BACKLINK_CONTAINER_CLASS_NAME: "og-hierachy-navigate-backlink-doc-container",
    POP_NONE: 0,
    POP_LIMIT: 1,
    POP_ALL: 2,
    BACKLINK_NONE: 0,
    BACKLINK_NORMAL: 1,
    BACKLINK_DOC_ONLY: 2,
}