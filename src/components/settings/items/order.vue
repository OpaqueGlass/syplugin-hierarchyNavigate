<template>
    <div :id="CONSTANTS.PLUGIN_NAME + '-' + settingKey+'-enable'" class="og-hn-setting-order-enable-container" ref="enableArea">
        {{ lang("order_panel_enable") }}
        <div v-for="(item, index) in model" :key="item" class="og-hn-setting-order-option-container">
            <div class="og-hn-setting-order-option-name-container">
                <span class="og-hn-order-drag-handle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </span>
                <span class="og-hn-order-option-name-text">
                    {{ optionNames[optionKeys.indexOf(item)] }}
                </span>
            </div>
            <div class="og-hn-setting-order-option-desp" v-show="isValidStr(optionDesps[optionKeys.indexOf(item)])" v-html="optionDesps[optionKeys.indexOf(item)]">
            </div>
        </div>
    </div>
    <div :id="CONSTANTS.PLUGIN_NAME + '-' + settingKey+'-disable'" class="og-hn-setting-order-disable-container" ref="disableArea">
        {{ lang("order_panel_disable") }}
        <div v-for="(item, index) in disableList" :key="item" class="og-hn-setting-order-option-container">
            <div class="og-hn-setting-order-option-name-container">
                <span class="og-hn-order-drag-handle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </span>
                <span class="og-hn-order-option-name-text">
                    {{ optionNames[optionKeys.indexOf(item)] }}
                </span>
            </div>
            <div class="og-hn-setting-order-option-desp" v-show="isValidStr(optionDesps[optionKeys.indexOf(item)])" v-html="optionDesps[optionKeys.indexOf(item)]">
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { CONSTANTS } from '@/constants';
import { onMounted, onUpdated, ref } from 'vue';
import Sortable from "sortablejs";
import { debugPush, logPush, errorPush } from '@/logger';
import { lang } from '@/utils/lang';
import { isValidStr } from '@/utils/commonCheck';

// import { ref } from 'vue';
// import { updateSingleSetting } from '@/manager/settingManager'
const props = defineProps<{
    optionNames: Array<string>,
    optionKeys: Array<string>,
    optionDesps: Array<string>,
    settingKey: string,
}>();
// 获取optionNames
const model = defineModel({ type: Array<string>});
let disableList = ref(props.optionKeys.filter(element => !model.value?.includes(element)));

let sortable1, sortable2;

const enableArea = ref(null);
const disableArea = ref(null);
// 关联排序内容
onMounted(() => {
    logPush("绑定");
    try {
 // 这里需要为每一个option下的分别绑定，防止互相共享
 // 首次载入，如果使用document.getElementById定位会出现null错误，改为https://cn.vuejs.org/api/built-in-special-attributes.html#ref
 sortable1 = new Sortable(enableArea.value, {
        group: "og-hn-shared-option-" + props.settingKey,
        animation: 150,
        handle: ".og-hn-order-drag-handle",
        scroll: true,
        onEnd: function (evt) {
            debugPush("移动1", evt);
            if (evt.to.id === CONSTANTS.PLUGIN_NAME + '-' + props.settingKey+'-enable') {
                let item = model.value[evt.oldIndex];
                model.value.splice(evt.oldIndex, 1);
                model.value.splice(evt.newIndex, 0, item);
            } else {
                let item = model.value[evt.oldIndex];
                model.value.splice(evt.oldIndex, 1);
                disableList.value.splice(evt.newIndex, 0, item);
            }
            for (let i = 0; i < model.value.length; i++) {
                debugPush("model.value[i]", model.value[i]);
                if (!isValidStr(model.value[i])) {
                    model.value.splice(i, 1);
                    i--;
                }
            }
            for (let i = 0; i < disableList.value.length; i++) {
                debugPush("disableList.value[i]", disableList.value[i]);
                if (!isValidStr(disableList.value[i])) {
                    disableList.value.splice(i, 1);
                    i--;
                }
            }
            debugPush("移动结果", model.value);
            debugPush("disable", disableList);
            // model.value.pop();
            // 需要判断列表（目标列表什么的）
            // let item = model.value[evt.oldIndex];
            // model.value.splice(evt.oldIndex, 1);
            // model.value.splice(evt.newIndex, 0, item);
        }
    });
    sortable2 =new Sortable(disableArea.value, {
        group: "og-hn-shared-option-" + props.settingKey,
        animation: 150,
        handle: ".og-hn-order-drag-handle",
        scroll: true,
        onEnd: function (evt) {
            debugPush("移动2", evt);
            // 移动到启用列表
            if (evt.to.id === CONSTANTS.PLUGIN_NAME + '-' + props.settingKey+'-enable') {
                let item = disableList.value[evt.oldIndex];
                // 删除旧元素
                disableList.value.splice(evt.oldIndex, 1);
                // 向启用列表插入新元素
                model.value.splice(evt.newIndex, 0, item);
            } else {
                // 移动到禁用列表
                let item = disableList.value[evt.oldIndex];
                disableList.value.splice(evt.oldIndex, 1);
                disableList.value.splice(evt.newIndex, 0, item);
            }
            for (let i = 0; i < model.value.length; i++) {
                debugPush("model.value[i]", model.value[i]);
                if (!isValidStr(model.value[i])) {
                    model.value.splice(i, 1);
                    i--;
                }
            }
            for (let i = 0; i < disableList.value.length; i++) {
                debugPush("disableList.value[i]", disableList.value[i]);
                if (!isValidStr(disableList.value[i])) {
                    disableList.value.splice(i, 1);
                    i--;
                }
            }
            debugPush("移动结果", model.value);
            debugPush("disable", disableList);
            // let item = disableList[evt.oldIndex];
            // disableList.splice(evt.oldIndex, 1);
            // disableList.splice(evt.newIndex, 0, item);
        }
    });
    } catch(err) {
        errorPush("排序绑定失败", err);
    }

});
   

</script>
<style>
.og-hn-setting-order-option-desp {
    color: var(--b3-theme-on-surface);

}
.og-hn-order-drag-handle {
    cursor: grab;
    padding-right: 8px;
}
.og-hn-setting-order-option-container {
    display: flex;
    flex-direction: column; /* Display items in a column instead of a row */
    align-items: flex-start; /* Align items to the start (left) */
    padding: 8px;
    margin: 4px 0;
    background-color: var(--b3-theme-background); /* Adjust background color as needed */
    border: 1px solid var(--b3-border-color);
    border-radius: 4px;
}

.og-hn-setting-order-option-name-container {
    display: flex;
    align-items: flex-start;
}

.og-hn-order-option-name-text {
    height: 24px;
    line-height: 24px;
}


/* .og-hn-setting-order-option-container:hover {
    background-color: var(--b3-list-hover);
} */

.og-hn-setting-order-option-desp {
    margin-top: 8px; /* Add margin between name and description */
}

.og-hn-setting-order-enable-container, .og-hn-setting-order-disable-container {
    border: 1px solid var(--b3-border-color);
    border-radius: 4px;
    padding: 8px;
    margin: 4px 0;
}

.og-hn-setting-order-ul {
    list-style: none;
}

.og-hn-setting-order-disable-container > * {
    opacity: 0.7;
}
</style>