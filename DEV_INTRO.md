## dev introduction 参与开发 / 自行打包

> 文档更新可能有所落后。

本项目基于[siyuan/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)，整体开发方式相同；

这里摘录如下：

> 1. 安装 [NodeJS](https://nodejs.org/en/download) 和 [pnpm](https://pnpm.io/installation)，然后在开发文件夹下执行 `pnpm i` 安装所需要的依赖；
>    
>    开发者所使用的版本分别为：`v16.20.2`和`v8.7.5`；
> 2. **自动创建符号链接**
>     - 打开思源笔记, 确保思源内核正在运行
>     - 运行 `pnpm run make-link`, 脚本会自动检测所有思源的工作空间, 请在命令行中手动输入序号以选择工作空间
>         ```bash
>         >>> pnpm run make-link
>         > plugin-sample-vite-svelte@0.0.3 make-link H:\SrcCode\开源项目\plugin-sample-vite-svelte
>         > node  --no-warnings ./scripts/make_dev_link.js
> 
>         "targetDir" is empty, try to get SiYuan directory automatically....
>         Got 2 SiYuan workspaces
>         [0] H:\Media\SiYuan
>         [1] H:\临时文件夹\SiYuanDevSpace
>         Please select a workspace[0-1]: 0
>         Got target directory: H:\Media\SiYuan/data/plugins
>         Done! Created symlink H:\Media\SiYuan/data/plugins/plugin-sample-vite-svelte
>         ```
> 3. **手动创建符号链接**
>     - 打开 `./scripts/make_dev_link.js` 文件，更改 `targetDir` 为思源的插件目录 `<siyuan workspace>/data/plugins`
>     - 运行 `pnpm run make-link` 命令, 如果看到类似以下的消息，说明创建成功:
>       ```bash
>       ❯❯❯ pnpm run make-link
>       > plugin-sample-vite-svelte@0.0.1 make-link H:\SrcCode\plugin-sample-vite-svelte
>       > node ./scripts/make_dev_link.js
> 
>       Done! Created symlink H:/SiYuanDevSpace/data/plugins/plugin-sample-vite-svelte
>       ```
> 4. 执行 `pnpm run dev` 进行实时编译
> 5. 在思源中打开集市并在下载选项卡中启用插件
> 6. 打包发布时，可以使用action自动构建，或使用`pnpm build`完成构建；

请注意，此项目基于AGPLv3.0协议开源，如果再分发，需要满足协议要求；如果要提交PR，请优先提交到dev分支；

## 项目结构大致介绍

```
+---.github GitHub使用的相关信息
|   \---workflows
+---asset README使用的附件
+---dev 使用pnpm run dev时创建的编译内容
|   \---i18n
+---scripts pnpm run make-link 使用的脚本
\---src 插件源代码
    +---components vue组件，主要是设置页面组件
    |   \---settings
    |       \---items
    +---i18n 多语言文件
    +---logger 日志管理
    +---manager 设置项管理
    +---printer 【没有使用】
    +---types 类型定义
    +---utils 通用工具
    \---worker 插件的主要功能逻辑
```

```
|   constants.ts        所使用的常量
|   hello.vue           无用，原用作vue测试
|   index.scss          无用
|   index.ts            plugin入口和Plugin类定义
|
+---components
|   \---settings            设置项组件
|       |   block.vue       块类型设置项
|       |   item.vue        单项设置项
|       |   page.vue        设置项单页面
|       |   setting.vue     设置项总页面
|       |
|       \---items               设置项元素组件：
|               button.vue      按钮
|               input.vue       输入
|               nameDivider.vue 目前无效
|               order.vue       拖拽排序
|               select.vue      选择
|               switch.vue      开关（启用/禁用）
|               textarea.vue    文本框输入区
|
+---i18n    文本翻译和多语言
|       en_US.json
|       zh_CN.json
|
+---logger  日志
|       index.ts
|
+---manager
|       settingManager.ts   设置项管理，包括一个新设置项的声明和保存逻辑
|
+---syapi
|       custom.ts       思源笔记API（仅本插件使用，有修改）
|       index.ts        思源笔记API（常用）
|       interface.d.ts  思源笔记API接口
|
+---types
|       index.d.ts      通用类型声明
|       onlyThis.d.ts   仅本插件使用的类型声明
|       settings.d.ts   设置项所使用的类型声明
|
+---utils
|       common.ts       通用工具
|       commonCheck.ts  通用检查工具
|       getInstance.ts  获得类示例
|       lang.ts         获得i18n语言信息
|       mutex.ts        互斥量
|       onlyThisUtil.ts 仅在本插件中使用的工具类
|       settings.ts     设置项工具
|
\---worker
        commonProvider.ts   通用内容提供
        contentApplyer.ts   内容区DOM写入/更新操作
        contentPrinter.ts   内容区HTMLElement生成
        eventHandler.ts     思源事件处理
        pluginHelper.ts     目前无用
        setStyle.ts         设置样式
        shortcutHandler.ts  快捷键绑定处理
```