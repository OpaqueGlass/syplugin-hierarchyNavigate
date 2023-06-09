## Hierarchy Navigate

[请点这里阅读中文说明](README_zh_CN.md)

> Most of this document was translated by Google Translate.

> Current Version：v0.2.2 **Enhancement**: Update document navigation after switching tabs; **Enhancement**: (Optional feature) Check document changes and update document navigation immediately;

Add parent and children documents links under the document title.

### Quick Start

- Just turn on the plugin; (`Marketplace`--`Downloaded`--`Plugin`--`HierarchyNavigate`, click switch icon)
- For more information, please refer to the plugin setting page;  (`Marketplace`--`Downloaded`--`Plugin`--`HierarchyNavigate`-- Click setting icon)
- Documents with the `og-hn-ignore` attribute or attribute value will be ignored and the hierarchical navigation will not be displayed.

#### Other explanation

- Maybe available in siyuan Android App (in testing);

- After inserting the navigation part, the document icon on the left side of the title will have some misalignment, which can be solved by (1) Enable "Adjust the position of document icon" in this plugin settings or (2) "Settings - Appearance - Code Snippet - Add css"

  ```css
  .protyle-title__icon {
      top: 40px;
  }
  ```

  

## Feedback bugs

Please go to [github repository](https://github.com/OpaqueGlass/syplugin-my-plugin-collection) to report problems.

## References & Appreciations

| Developer/Project                                            | Description                                                  | Illustration                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| [UFDXD](https://github.com/UFDXD)/[HBuilderX-Light](https://github.com/UFDXD/HBuilderX-Light) | A borderless eye protection theme                            | This plug-in is implemented by referring to the parent-child document information under its title |
| [leolee9086](https://github.com/leolee9086) / [cc-template](https://github.com/leolee9086/cc-template) | Render template in widget; [Mulan Permissive Software License，Version 2](https://github.com/leolee9086/cc-template/blob/main/LICENSE) | Click to open the doc.                                       |
| [zuoez02](https://github.com/zuoez02)/[siyuan-plugin-system](https://github.com/zuoez02/siyuan-plugin-system) | A 3-rd plugin system for siyuan                              |                                                              |
| [zxhd863943427](https://github.com/zxhd863943427)&[mozhux (赐我一胖)](https://github.com/mozhux) |                                                              | Suggestions or contributions about default style.            |

