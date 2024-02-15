import { logPush } from "@/logger";
import type {IProtyle, IEventBusMap} from "siyuan";
import { getPluginInstance } from "@/utils/getInstance";
export default class EventHandler {
    private handlerBindList: Record<string, (arg1: CustomEvent)=>void> = {
        "loaded-protyle-static": this.loadedProtyleHandler,
        "switch-protyle": this.loadedProtyleHandler
    };

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

    loadedProtyleHandler(event: CustomEvent<IEventBusMap["loaded-protyle-static"]>) {
        const protyle = event.detail.protyle;
        // 可能还需要套一个重试的壳
        // 另外，和swtich 共同存在时，需要防止并发
        // 获取当前文档id
        logPush("loadedProtyleHandler", protyle);
        const docId:string = protyle.block.rootID;
        logPush("docId", docId);
        // 区分工作环境 也就是区分个移动端、闪卡页面、桌面端（网页端通用）；判断优先顺序闪卡页面>移动端>桌面端；
        // 疯了的话可能加入判断使用什么内容顺序（预设模板）

        // 调用Provider获取必要信息

        // 区分生成内容；应该不会根据不同的配置使用不同的生成吧，那也太累了，这个部分可能需要使用contentPrinter的对象
        // 如果还需要根据不同的设备走不同的显示内容，就更麻烦了【这里不做区分，如果区分移动端，则使用移动端独有设置项文件mobile-setting.json/{uid}.json】
        

        // 还是需要回到这里setAndApply

    }
}