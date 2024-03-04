## dev introduction 参与开发 / 自行打包

本项目基于[siyuan/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)，整体开发方式相同；

这里摘录如下：

> 1. 安装 [NodeJS](https://nodejs.org/en/download) 和 [pnpm](https://pnpm.io/installation)，然后在开发文件夹下执行 `pnpm i` 安装所需要的依赖
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

请注意，此项目基于AGPLv3.0协议开源，如果再分发，需要满足协议要求；



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