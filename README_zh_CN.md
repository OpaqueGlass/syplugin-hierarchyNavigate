## hierarchyNavigate 文档层级导航（文档标题下添加上下层文档导航）

[English](README.md)

> 当前版本：v1.0.1（此版本为测试版） **修复**：一些情况下设置被默认设置覆盖的问题；**新增**：“间隔复习”时块面包屑内容区；**改进**：提升部分情况下的响应速度；
>
> 详见 [更新日志](CHANGELOG.md)。

### 快速开始

- 从集市下载 或 1、解压Release中的`package.zip`，2、将文件夹移动到`工作空间/data/plugins/`，3、并将文件夹重命名为`syplugin-hierarchyNavigate`;
- 开启插件即可；
- 其他请浏览插件设置页面（`设置`→`集市`→`已下载`→`插件`→`文档层级导航`→“设置图标”），**提示：设置页可以上下滑动哦**；
- 带有`og-hn-ignore`或`og文档导航忽略`属性或属性值的文档将被忽略，不显示层级导航；
  - 通过文档上的`og-hn-content`属性，可自定义当前文档的内容显示顺序，属性值为字符串数组，例`["info","breadcrumb","parent","sibling","previousAndNext","backlinks","child","widget"]`;

#### 快捷键说明

> 插件注册的快捷键可以到 思源设置-快捷键 处更改；

| 功能 | 默认快捷键 | 快捷键设置参考| 备注 |
| --- | --- | --- | --- |
| 跳转到父文档（向上） | `⌥⌘←` 或 `Ctrl + Alt + ←` | | |
| 跳转到首个子文档（向下） | `⌥⌘→` 或 `Ctrl + Alt + →` | | |
| 跳转到上一篇文档（同层级） | `⌥⌘↑` 或 `Ctrl + Alt + ↑` |  |  |
| 跳转到下一篇文档（同层级） | `⌥⌘↓` 或 `Ctrl + Alt + ↓`  |  | |
| 当前块下方插入listChildDocs挂件 | 无 | `⌥⇧L` 或 `Shift + Alt + L` | 需事先下载挂件 |

#### 说明

- 对于刚创建的文档，由于数据库更新延迟，可能不会显示导航区，切换页签之后将正常显示；

- 插入导航部分后，标题左侧的文档图标将有一些错位，可（1）插件设置打开“调整文档图标位置”，或（2）通过“设置--外观--代码片段--添加css”解决：

```css
.protyle-title__icon {
    top: 34px;
}
```



### 反馈bug

（推荐）请前往[github仓库](https://github.com/OpaqueGlass/syplugin-my-plugin-collection)反馈问题。

如果您无法访问github，请[在此反馈](https://wj.qq.com/s2/12395364/b69f/)。

### 参考&感谢

代码贡献者（开发者）详见[贡献者列表](https://github.com/OpaqueGlass/syplugin-my-plugin-collection/graphs/contributors)。

依赖项详见[package.json](./package.json)。

| 开发者/项目                                                  | 描述                                                         | 说明                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------- |
| [UFDXD](https://github.com/UFDXD)/[HBuilderX-Light](https://github.com/UFDXD/HBuilderX-Light) | 一个无边距的护眼主题                                         | 参考其标题下父子文档信息实现 |
| [leolee9086](https://github.com/leolee9086) / [cc-template](https://github.com/leolee9086/cc-template) | 使用挂件渲染模板；[木兰宽松许可证， 第2版](https://github.com/leolee9086/cc-template/blob/main/LICENSE) | 点击打开文档                 |
| [zuoez02](https://github.com/zuoez02)/[siyuan-plugin-system](https://github.com/zuoez02/siyuan-plugin-system) | 插件系统                                                     |                              |
| [zxhd863943427](https://github.com/zxhd863943427)&[mozhux (赐我一胖) (github.com)](https://github.com/mozhux) |                                                              | 样式建议等                   |
|[wetoria](https://github.com/Wetoria)/[DailyNotesWalker](https://github.com/Wetoria/siyuan-plugin-DailyNotesWalker)|快捷键快速查看上下一篇日记|参考其idea和快捷键绑定方式|