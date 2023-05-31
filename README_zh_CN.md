## hierarchyNavigate 文档层级导航（文档标题下添加上下层文档导航）

[English](README.md)

> 当前版本：v0.2.1 **修复**：在v2.8.10-dev5不显示的问题；**改进**：默认调整标题左侧图标位置；

### 快速开始

- 开启插件即可；
- 其他请浏览插件设置页面（`设置`→`集市`→`已下载`→`插件`→`文档层级导航`→“设置图标”）；
- 带有`og-hn-ignore`或`og文档导航忽略`属性或属性值的文档将被忽略，不显示层级导航；

#### 说明

- 已尽力保证在安卓App上可用，如果仍有问题，麻烦反馈，谢谢；

- 插入导航部分后，标题左侧的文档图标将有一些错位，可（1）插件设置打开“调整文档图标位置”，或（2）通过“设置--外观--代码片段--添加css”解决：

```css
.protyle-title__icon {
    top: 34px;
}
```



## 反馈bug

（推荐）请前往[github仓库](https://github.com/OpaqueGlass/syplugin-my-plugin-collection)反馈问题。

如果您无法访问github，请[在此反馈](https://wj.qq.com/s2/12395364/b69f/)。

## 参考&感谢

代码贡献者（开发者）详见[贡献者列表](https://github.com/OpaqueGlass/syplugin-my-plugin-collection/graphs/contributors)。

| 开发者/项目                                                  | 描述                                                         | 说明                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------- |
| [UFDXD](https://github.com/UFDXD)/[HBuilderX-Light](https://github.com/UFDXD/HBuilderX-Light) | 一个无边距的护眼主题                                         | 参考其标题下父子文档信息实现 |
| [leolee9086](https://github.com/leolee9086) / [cc-template](https://github.com/leolee9086/cc-template) | 使用挂件渲染模板；[木兰宽松许可证， 第2版](https://github.com/leolee9086/cc-template/blob/main/LICENSE) | 点击打开文档                 |
| [zuoez02](https://github.com/zuoez02)/[siyuan-plugin-system](https://github.com/zuoez02/siyuan-plugin-system) | 插件系统                                                     |                              |
| [zxhd863943427](https://github.com/zxhd863943427)&[mozhux (赐我一胖) (github.com)](https://github.com/mozhux) |                                                              | 样式建议等                   |
