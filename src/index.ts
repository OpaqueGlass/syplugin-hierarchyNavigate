import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    IModel,
    Setting
} from "siyuan";
import * as siyuan from "siyuan";
import "@/index.scss";

import hello from './hello.vue'
import { createApp } from "vue";
import settingVue from "./components/settings/setting.vue";
import { setLanguage } from "./utils/lang";
import { debugPush, logPush } from "./logger";
import { initSettingProperty } from './manager/settingManager';
import { setPluginInstance } from "./utils/getInstance";
import { loadSettings } from "./manager/settingManager";
import EventHandler from "./worker/eventHandler";
import { removeStyle, setStyle } from "./worker/setStyle";

const STORAGE_NAME = "menu-config";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";




export default class OGPluginTemplate extends Plugin {

    private customTab: () => IModel;
    private isMobile: boolean;
    private settingPanel;
    private myEventHandler: EventHandler;

    async onload() {
        this.data[STORAGE_NAME] = {readonlyText: "Readonly"};
        logPush("测试", this.i18n);
        setLanguage(this.i18n);
        setPluginInstance(this);
        initSettingProperty();
        // 载入设置项，此项必须在setPluginInstance之后被调用
        this.myEventHandler = new EventHandler();
        
        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        // 图标的制作参见帮助文档
        this.addIcons(`<symbol id="iconTestStatistics" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
        </symbol>
        `);
        // const topBarElement = this.addTopBar({
        //     icon: "iconTestStatistics",
        //     title: this.i18n.addTopBarIcon,
        //     position: "right",
        //     callback: () => {
        //         this.openStatisticTab();
        //     }
        // });
        
        
        this.customTab = this.addTab({
            type: TAB_TYPE,
            init() {
                // FIXME: 不能把这个拖出，否则在此渲染时会报错：Cannot read properties of null (reading 'nextSibling')
                let tabDiv = document.createElement("div");
                // 移除这部分，改为插入<ifrome>元素，尽量避免引入组件导致的干扰思源本体行为
                tabDiv.innerHTML = "HELLO WORLD";
                this.element.appendChild(tabDiv);
                console.log(this.element);
            },
            beforeDestroy() {
                console.log("before destroy tab:", TAB_TYPE);
            },
            destroy() {
                console.log("destroy tab:", TAB_TYPE);
                
            }
        });


        const textareaElement = document.createElement("textarea");
        // this.setting = new Setting({
        //     confirmCallback: () => {
        //         this.saveData(STORAGE_NAME, {readonlyText: textareaElement.value});
        //     }
        // });
        // this.setting.addItem({
        //     title: "Readonly text",
        //     createActionElement: () => {
        //         textareaElement.className = "b3-text-field fn__block";
        //         textareaElement.placeholder = "Readonly text in the menu";
        //         textareaElement.value = this.data[STORAGE_NAME].readonlyText;
        //         return textareaElement;
        //     },
        // });
        // const btnaElement = document.createElement("button");
        // btnaElement.className = "b3-button b3-button--outline fn__flex-center fn__size200";
        // btnaElement.textContent = "Open";
        // btnaElement.addEventListener("click", () => {
        //     window.open("https://github.com/siyuan-note/plugin-sample-vite-svelte");
        // });
        // this.setting.addItem({
        //     title: "Open plugin url",
        //     description: "Open plugin url in browser",
        //     actionElement: btnaElement,
        // });
        

        //
        // const server = http.createServer();
        // 不大行, socketio 的transport extend的对象不存在或找不到，可能浏览器环境没有
        
        // const server = http.createServer();
        // server.listen(25565, () => {
        //     console.log('yunchu Server listening on port 25565');
        // });
        // server.on("connection", (socket) => {
        //     console.log("yunchu connection", socket.remoteAddress, socket.remotePort);
        //     // socket.setEncoding('utf-8')
        //     socket.write('yunchu')
        //     // 收到客户端数据时
        //     socket.on('connect', (data) => {
        //         console.info('yunchu 接收到客户端消息：【'+ `${data}`+"】");
        //         // 定义接收到消息的事件处理
        //         // 。。。。
        //     });
        // });
        console.debug("syplugin template initiated");
    }

    onLayoutReady(): void {
        loadSettings().then(()=>{
            this.myEventHandler.bindHandler();
            setStyle();
        }).catch(()=>{
            showMessage("文档层级导航插件载入设置项失败。Load plugin settings faild. syplugin-hierarchy-navigate");
        });
    }

    onunload(): void {
        this.myEventHandler.unbindHandler();
        removeStyle();
    }

    openSetting() {
        // 生成Dialog内容
        const uid = crypto.randomUUID();
        // 创建dialog
        const settingDialog = new siyuan.Dialog({
            "title": "setting_panel_title",
            "content": `
            <div id="og_plugintemplate_${uid}" style="overflow: hidden; position: relative"></div>
            `,
            "width": isMobile() ? "92vw":"1040px",
            "height": isMobile() ? "50vw":"80vh",
        });
        const app = createApp(settingVue);
        app.mount(`#og_plugintemplate_${uid}`);
        
    }

    private openStatisticTab() {
        openTab({
            app: this.app,
            custom: {
                icon: "iconTestStatistics",
                title: "Custom Tab",
                
                id: this.name + TAB_TYPE
            },
        });
    }


}

function isMobile() {
    return window.top.document.getElementById("sidebar") ? true : false;
};
