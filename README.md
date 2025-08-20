## Hierarchy Navigate

[中文](README_zh_CN.md)

> Most of this document was translated by Google Translate.

> A [Siyuan-note](https://github.com/siyuan-note/siyuan) plugin that adds parent and children document links under the document title.

### Quick Start

- Download from marketplace OR 1: Unzip the `package.zip` file in Release, 2: Move the folder to `{workplace}/data/plugins/`, 3: Rename the folder to `syplugin-hierarchyNavigate`;
- Just turn on the plugin; (`Marketplace`--`Downloaded`--`Plugin`--Find this plugin, click switch icon)
- For more information, please refer to the plugin setting page;  (`Marketplace`--`Downloaded`--`Plugin`--`HierarchyNavigate`-- Click setting icon)
- Documents with the `og-hn-ignore` attribute or attribute value will be ignored and the hierarchical navigation will not be displayed.
  - By using the `og-hn-content` attribute in the document, you can customize the display order of the current document's content. The attribute value is an array of strings, for example: `["info", "breadcrumb", "parent", "sibling", "previousAndNext", "backlinks", "child", "widget"]`.

#### Shortcut

| Func | Default Shortcut | Recommended Shortcut | Note |
| --- | --- | --- | --- |
| Open upper doc | `⌥⌘←` or `Ctrl + Alt + ←` | | |
| Open first subdocument | `⌥⌘→` or `Ctrl + Alt + →` | | |
| Open previous doc | `⌥⌘↑` or `Ctrl + Alt + ↑` |  |  |
| Open next doc | `⌥⌘↓` or `Ctrl + Alt + ↓`  |  | |
| Insert the `listChildDocs` widget | / | `⌥⇧L` or `Shift + Alt + L` | Need download `listChildDocs` first |
| Display navigation related to the current document | `⌥⌘E` or `Ctrl + Alt + E` | | |

#### Other explanation

- Maybe available in siyuan Android App (in testing);

- If there is lag when inputting large amounts of text after enabling the plugin, please check the `Immediate Update` setting item; if there is a display delay, please check setting items such as `Display Document Icons Whenever Possible` and "Backlinks: Pin document names that match the regular expression".

  

### Feedback bugs

Please go to [github repository](https://github.com/OpaqueGlass/syplugin-my-plugin-collection) to report problems.

### References & Appreciations

For dependencies, please refer[package.json](./package.json).

| Developer/Project                                            | Description                                                  | Illustration                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| [UFDXD](https://github.com/UFDXD)/[HBuilderX-Light](https://github.com/UFDXD/HBuilderX-Light) | A borderless eye protection theme                            | This plug-in is implemented by referring to the parent-child document information under its title |
| [leolee9086](https://github.com/leolee9086) / [cc-template](https://github.com/leolee9086/cc-template) | Render template in widget; [Mulan Permissive Software License，Version 2](https://github.com/leolee9086/cc-template/blob/main/LICENSE) | Click to open the doc.                                       |
| [zuoez02](https://github.com/zuoez02)/[siyuan-plugin-system](https://github.com/zuoez02/siyuan-plugin-system) | A 3-rd plugin system for siyuan                              |                                                              |
| [zxhd863943427](https://github.com/zxhd863943427)&[mozhux (赐我一胖)](https://github.com/mozhux) |                                                              | Suggestions or contributions about default style.            |
|[wetoria](https://github.com/Wetoria)/[DailyNotesWalker](https://github.com/Wetoria/siyuan-plugin-DailyNotesWalker)|Shortcuts Quick View Previous Next Diary|Refer to its idea and shortcut binding method|
| (qq) 八面风, 与路同飞, (Github) [QQQOrange](https://github.com/QQQOrange),[zhoutaosheng](https://github.com/zhoutaosheng) |  | Assist in locating the issue |
| [Trilium](https://github.com/zadam/trilium) / note-list-widget | | Preview box content area css style, and functional design |