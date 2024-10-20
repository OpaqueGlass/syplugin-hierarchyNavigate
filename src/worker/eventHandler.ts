import { debugPush, errorPush, infoPush, isDebugMode, logPush, warnPush } from "@/logger";
import {type IProtyle, type IEventBusMap, showMessage} from "siyuan";
import { getPluginInstance } from "@/utils/getInstance";
import { getBasicInfo } from "@/worker/commonProvider";
import ContentPrinter from "@/worker/contentPrinter";
import { getProtyleInfo } from "@/utils/onlyThisUtil"
import ContentApplyer from "./contentApplyer";
import Mutex from "@/utils/mutex";
import { getReadOnlyGSettings } from "@/manager/settingManager";
import { sleep } from "@/utils/common";
import { CONSTANTS } from "@/constants";
import { getHPathById, isMobile } from "@/syapi";
export default class EventHandler {
    private handlerBindList: Record<string, (arg1: CustomEvent)=>void> = {
        "loaded-protyle-static": this.loadedProtyleRetryEntry.bind(this), // mutex需要访问EventHandler的属性
        "switch-protyle": this.loadedProtyleRetryEntry.bind(this),
    };
    // 关联的设置项，如果设置项对应为true，则才执行绑定
    private relateGsettingKeyStr: Record<string, string> = {
        "loaded-protyle-static": null, // mutex需要访问EventHandler的属性
        "switch-protyle": null,
        // "ws-main": "immediatelyUpdate",
    };

    private loadAndSwitchMutex: Mutex;
    private simpleMutex: number = 0;
    private docIdMutex: Record<string, number> = {};
    constructor() {
        this.loadAndSwitchMutex = new Mutex();
    }

    bindHandler() {
        const plugin = getPluginInstance();
        const g_setting = getReadOnlyGSettings();
        // const g_setting = getReadOnlyGSettings();
        for (let key in this.handlerBindList) {
            // if (this.relateGsettingKeyStr[key] == null || g_setting[this.relateGsettingKeyStr[key]]) {
                plugin.eventBus.on(key, this.handlerBindList[key]);
            // }
        }
        // 移动端高危操作，试图替换原有的goback，以使得插件响应此动作
        if (isMobile() && g_setting.mobileBackReplace) {
            const originGoBack = window.goBack;
            window["ogGoBackOri"] = originGoBack;
            if (originGoBack) {
                window.goBack = () => {
                    if (window["ogGoBackOri"]) {
                        const result = window["ogGoBackOri"]();
                        plugin.eventBus.emit("mobile-goback", {detail: {protyle: window.siyuan.mobile.editor.protyle}});
                        const event = new CustomEvent<IEventBusMap["loaded-protyle-static"]>("loaded-protyle-static", {
                            detail: { protyle: window.siyuan.mobile.editor.protyle },
                            bubbles: true,
                            cancelable: true
                        });
                        this.loadedProtyleRetryEntry(event);
                        return result;
                    }
                }
            }
        }
    }

    unbindHandler() {
        const plugin = getPluginInstance();
        for (let key in this.handlerBindList) {
            plugin.eventBus.off(key, this.handlerBindList[key]);
        }
    }

    async loadedProtyleHandler(event: CustomEvent<IEventBusMap["loaded-protyle-static"]>) {
        // 多个文档同时触发则串行执行，理论上是要判断文档id是否相同（相同的才可能会在同一个Element上操作）；这里全部串行可能影响性能
        // 我也忘了为什么要绑定load-了（目前主要是其他载入情况使用，例如闪卡）；只是打开文档的话，switch-protyle事件就够了
        // 下面主要是避免两个事件同时触发造成的反复更新
        const originBlockId = event?.detail?.protyle?.block?.id ?? "undefined";
        if (this.docIdMutex[originBlockId] > 0) {
            getHPathById(event.detail.protyle.block.id).then((path) => {
                logPush("由于正在运行，部分刷新被停止", event.detail.protyle.block.id, path);
            }).catch((err)=>{
                logPush("由于正在运行，部分刷新被停止", event.detail.protyle.block.id, "未能显示hpath");
            });
            return true;
        }
        this.docIdMutex[originBlockId]++;
        let doNotRetryFlag = true;
        if (isDebugMode()) {
            console.time(CONSTANTS.PLUGIN_NAME);
        }
        try {
            await this.loadAndSwitchMutex.lock();
            // 颜色状态码可以参考https://blog.csdn.net/weixin_44110772/article/details/105860997
            // x1b是十六进制，和文中的/033八进制没啥不同，同时应用加粗和Cryan就像下面这样;分隔
            logPush("\x1b[1;36m%s\x1b[0m", ">>>>>>>> mutex 新任务开始");
            // 移动端由于闪卡面包屑，需要后面获取envInfo后处理；
            let protyle = event.detail.protyle;
            // 可能还需要套一个重试的壳
            // 另外，和swtich 共同存在时，需要防止并发
            // 获取当前文档id
            logPush("loadedProtyleHandler", protyle);
            logPush("currentDoc", JSON.stringify(protyle?.block));
            const docId:string = protyle.block.rootID;
            // 区分工作环境 也就是区分个移动端、闪卡页面、桌面端（网页端通用）；判断优先顺序闪卡页面>移动端>桌面端；
            // 疯了的话可能加入判断使用什么内容顺序（预设模板）
            if (protyle.element.classList.contains("fn__none")) {
                if (isDebugMode()) {
                    showMessage(`当前文档不可见, ${protyle.id}, ${docId}, ${protyle.element.children.length}——[syplugin-hierarchyNavigate]`);
                }
                debugPush(`当前文档不可见, ${protyle.id}, ${docId}, ${protyle.element.children.length}`);
            }
            const protyleEnvInfo:IProtyleEnvInfo = getProtyleInfo(protyle);
            logPush("protyleInfo", protyleEnvInfo);
            if (protyleEnvInfo.notTraditional && !protyleEnvInfo.flashCard && !protyleEnvInfo.mobile && !getReadOnlyGSettings().enableForOtherCircumstance) {
                debugPush("非常规情况，且设置不允许，跳过");
                return true;
            }
            // 移动端且非闪卡，需要使用全局编辑器对象
            if (!protyleEnvInfo.flashCard && isMobile()) {
                protyle = window.siyuan.mobile.editor.protyle;
                protyleEnvInfo.originProtyle = protyle;
            }
            // if (isMobile()) {
            //     showMessage(`移动端触发 ${docId} ${window.siyuan.mobile.editor.protyle.block.rootID}`);
            // }
            
            // 调用Provider获取必要信息
            const basicInfo = await getBasicInfo(docId, protyle.path, protyle.notebookId);
            logPush("basicInfo", basicInfo);
            if (!basicInfo.success) {
                logPush("获取文档信息失败");
                return false;
            }
            // 区分生成内容；应该不会根据不同的配置使用不同的生成吧，那也太累了，这个部分可能需要使用contentPrinter的对象
            // 如果还需要根据不同的设备走不同的显示内容，就更麻烦了【这里不做区分，如果区分移动端，则使用移动端独有设置项文件mobile-setting.json/{uid}.json】
            const printer = new ContentPrinter(basicInfo, protyleEnvInfo);
            const finalElement = await printer.print();
            logPush("finalElement", finalElement);
            if (finalElement) {
                // 还是需要回到这里setAndApply
                const applyer = new ContentApplyer(basicInfo, protyleEnvInfo, protyle.element);
                applyer.apply(finalElement);
            }
        } catch(error) {
            errorPush("ERROR", error);
            doNotRetryFlag = true;
        } finally {
            logPush("\x1b[1;36m%s\x1b[0m", "<<<<<<<< mutex 任务结束");
            if (isDebugMode()) {
                console.timeEnd(CONSTANTS.PLUGIN_NAME);
            }
            this.loadAndSwitchMutex.unlock();
            this.docIdMutex[originBlockId]--;
        }
        return doNotRetryFlag;
    }

    async loadedProtyleRetryEntry(event: CustomEvent<IEventBusMap["loaded-protyle-static"]>) {
        let doNotRetry = true;
        const g_setting = getReadOnlyGSettings();
        let retryCount = 0;
        do {
            doNotRetry = await this.loadedProtyleHandler(event);
            retryCount++;
            if (doNotRetry == false) {
                logPush("重试过程中遇到问题");
                await sleep(300);
            }
        } while(retryCount < 2 && !doNotRetry);
        if (!doNotRetry) {
            infoPush("多次重试仍然存在异常，请查看Log日志");
        }
    }

    // async wsMainHandler(event: CustomEvent<IEventBusMap["ws-main"]>) {
        
    //     debugPush(detail);
    //     const cmdType = ["moveDoc", "rename", "removeDoc"];
    //     if (cmdType.indexOf(detail.detail.cmd) != -1) {
    //         try {
    //             debugPush("由 立即更新 触发");
    //             this.loadedProtyleRetryEntry();
    //         }catch(err) {
    //             errorPush(err);
    //         }
    //     }
    // }
}