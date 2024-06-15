export class CONSTANTS {
    public static readonly RANDOM_DELAY: number = 300;
    public static readonly STYLE_ID: string = "hierarchy-navigate-plugin-style";
    public static readonly ICON_ALL: string = "all"; // 2
    public static readonly ICON_NONE: string = "none"; // 0
    public static readonly ICON_CUSTOM_ONLY: string = "custom"; // 1
    public static readonly PLUGIN_NAME: string = "og_hierachy_navigate";
    public static readonly SAVE_TIMEOUT: number = 900;
    public static readonly TOP_CONTAINER_CLASS_NAME: string = "og-hn-heading-docs-container"; // 最上层的
    public static readonly CONTAINER_CLASS_NAME: string = "og-hierachy-navigate-doc-container"; // 包括链接的子容器
    public static readonly ARROW_CLASS_NAME: string = "og-hierachy-navigate-breadcrumb-arrow";
    public static readonly INFO_CONTAINER_CLASS: string = "og-hierachy-navigate-info-container";
    public static readonly PARENT_CONTAINER_ID: string = "og-hierachy-navigate-parent-doc-container";
    public static readonly CHILD_CONTAINER_ID: string = "og-hierachy-navigate-children-doc-container";
    public static readonly SIBLING_CONTAINER_ID: string = "og-hierachy-navigate-sibling-doc-container";
    public static readonly ON_THIS_DAY_CONTAINER_CLASS_NAME: string = "og-hierachy-navigate-onthisday-doc-container";
    public static readonly INDICATOR_CLASS_NAME: string = "og-hierachy-navigate-doc-indicator";
    public static readonly BREADCRUMB_CONTAINER_CLASS_NAME: string = "og-hierachy-navigate-breadcrumb-container";
    public static readonly CONTAINER_MULTILINE_STYLE_CLASS_NAME: string = "og-hn-container-multiline";

    public static readonly AREA_NOT_FOLD_CLASS_NAME: string = "og-hn-not-fold";
    
    public static readonly MENU_ITEM_CLASS_NAME: string = "og-hn-breadcrumb-menu-item-container";

    public static readonly NONE_CLASS_NAME: string = "og-hierachy-navigate-doc-not-exist";
    public static readonly NEXT_CONTAINER_CLASS_NAME: string = "og-hierachy-navigate-next-doc-container";
    public static readonly BACKLINK_CONTAINER_CLASS_NAME: string = "og-hierachy-navigate-backlink-doc-container";
    public static readonly FOWARDLINK_CONTAINER_CLASS_NAME: string = "og-hierachy-navigate-forwardlink-doc-container";
    public static readonly POP_NONE: string = "disable"; // 0
    public static readonly POP_LIMIT: string = "icon_only"; // 1
    public static readonly POP_ALL: string = "all"; // 2
    public static readonly BACKLINK_NONE: string = "disable";
    public static readonly BACKLINK_NORMAL: string = "show_all_as_doc";
    public static readonly BACKLINK_DOC_ONLY: string = "doc_only";
}

export class PRINTER_NAME {
    public static readonly PARENT: string = "parent";
    public static readonly CHILD: string = "child";
    public static readonly SIBLING: string = "sibling";
    public static readonly PREV_NEXT: string = "previousAndNext";
    public static readonly BACKLINK: string = "backlinks";
    public static readonly BREADCRUMB: string = "breadcrumb";
    public static readonly INFO: string = "info";
    public static readonly WIDGET: string = "widget";
    public static readonly BLOCK_BREADCRUMB: string = "blockBreadcrumb";
    public static readonly ON_THIS_DAY: string = "onThisDay";
    public static readonly FORWARDLINK: string = "forwardlinks";
}
  