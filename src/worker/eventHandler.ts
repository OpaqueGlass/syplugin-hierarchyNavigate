import { debugPush, errorPush, logPush } from "@/logger";
import type {IProtyle, IEventBusMap} from "siyuan";
import { getPluginInstance } from "@/utils/getInstance";
import { getBasicInfo } from "@/worker/commonProvider";
import ContentPrinter from "@/worker/contentPrinter";
import { getProtyleInfo } from "@/utils/onlyThisUtil"
import ContentApplyer from "./contentApplyer";
import Mutex from "@/utils/mutex";
export default class EventHandler {
    private handlerBindList: Record<string, (arg1: CustomEvent)=>void> = {
        "loaded-protyle-static": this.loadedProtyleHandler.bind(this), // mutex需要访问EventHandler的属性
        "switch-protyle": this.loadedProtyleHandler.bind(this)
    };

    private loadAndSwitchMutex: Mutex;
    constructor() {
        this.loadAndSwitchMutex = new Mutex();
    }

    bindHandler() {
        const plugin = getPluginInstance();
        for (let key in this.handlerBindList) {
            plugin.eventBus.on(key, this.handlerBindList[key]);
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
        // 我也忘了为什么要绑定load-了；只是打开文档的话，switch-protyle事件就够了
        await this.loadAndSwitchMutex.lock();
        // 颜色状态码可以参考https://blog.csdn.net/weixin_44110772/article/details/105860997
        // x1b是十六进制，和文中的/033八进制没啥不同，同时应用加粗和Cryan就像下面这样;分隔
        debugPush("\x1b[1;36m%s\x1b[0m", ">>>>>>>> mutex 新任务开始");
        try {
            const protyle = event.detail.protyle;
            // 可能还需要套一个重试的壳
            // 另外，和swtich 共同存在时，需要防止并发
            // 获取当前文档id
            logPush("loadedProtyleHandler", protyle);
            const docId:string = protyle.block.rootID;
            logPush("docId", docId);
            // 区分工作环境 也就是区分个移动端、闪卡页面、桌面端（网页端通用）；判断优先顺序闪卡页面>移动端>桌面端；
            // 疯了的话可能加入判断使用什么内容顺序（预设模板）
            const protyleEnvInfo:IProtyleEnvInfo = getProtyleInfo(protyle);
            logPush("protyleInfo", protyleEnvInfo);
            // 调用Provider获取必要信息
            const basicInfo = await getBasicInfo(docId);
            // 区分生成内容；应该不会根据不同的配置使用不同的生成吧，那也太累了，这个部分可能需要使用contentPrinter的对象
            // 如果还需要根据不同的设备走不同的显示内容，就更麻烦了【这里不做区分，如果区分移动端，则使用移动端独有设置项文件mobile-setting.json/{uid}.json】
            const printer = new ContentPrinter(basicInfo, protyleEnvInfo);
            const finalElement = await printer.print();
            logPush("finalElement", finalElement);
            // 还是需要回到这里setAndApply
            const applyer = new ContentApplyer(basicInfo, protyleEnvInfo, protyle.element);
            applyer.apply(finalElement);
        } catch(error) {
            errorPush(error);
        } finally {
            debugPush("\x1b[1;36m%s\x1b[0m", "<<<<<<<< mutex 任务结束");
            this.loadAndSwitchMutex.unlock();
        }
    }
}