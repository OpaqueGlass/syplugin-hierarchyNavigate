<template>
    <div>
        {{ lang("order_panel_enable") }}
    </div>
    
    <ul :id="CONSTANTS.PLUGIN_NAME + settingKey+'-enable'" class="og-hn-setting-order-ul">
        <li v-for="(item, index) in model" :key="item">
            <div class="og-hn-setting-order-desp-container">
                <div class="">
                    ●{{ optionNames[optionKeys.indexOf(item)] }}
                </div>
                <div class="">
                    desp
                </div>
            </div>
        </li>
    </ul>
    <div>
    {{ lang("order_panel_disable") }}
    </div>
    <ul :id="CONSTANTS.PLUGIN_NAME + settingKey+'-disable'" class="og-hn-setting-order-ul">
        <li v-for="(item, index) in disableList" :key="item">
            {{ optionNames[optionKeys.indexOf(item)] }}
        </li>
    </ul>
</template>
<script lang="ts" setup>
import { CONSTANTS } from '@/constants';
import { onMounted, onUpdated, ref } from 'vue';
import Sortable from "sortablejs";
import { debugPush, logPush } from '@/logger';
import { lang } from '@/utils/lang';

// import { ref } from 'vue';
// import { updateSingleSetting } from '@/manager/settingManager'
const props = defineProps<{
    optionNames: Array<string>,
    optionKeys: Array<string>,
    settingKey: string,
}>();
// 获取optionNames
const model = defineModel({ type: Array<string>});

debugPush("props", props);
debugPush("model", model);
let disableList = ref(props.optionKeys.filter(element => !model.value?.includes(element)));

let sortable1, sortable2;


// 关联排序内容
onMounted(() => {
    logPush("绑定");
    sortable1 = new Sortable(document.getElementById(CONSTANTS.PLUGIN_NAME + props.settingKey+'-enable'), {
        group: "shared",
        animation: 150,
        onEnd: function (evt) {
            debugPush("移动1", evt);
            if (evt.to.id === CONSTANTS.PLUGIN_NAME + props.settingKey+'-enable') {
                let item = model.value[evt.oldIndex];
                model.value.splice(evt.oldIndex, 1);
                model.value.splice(evt.newIndex, 0, item);
            } else {
                let item = model.value[evt.oldIndex];
                model.value.splice(evt.oldIndex, 1);
                disableList.value.splice(evt.newIndex, 0, item);
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
    sortable2 =new Sortable(document.getElementById(CONSTANTS.PLUGIN_NAME + props.settingKey+'-disable'), {
        group: "shared",
        animation: 150,
        onEnd: function (evt) {
            debugPush("移动2", evt);
            // 移动到启用列表
            if (evt.to.id === CONSTANTS.PLUGIN_NAME + props.settingKey+'-enable') {
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
            
            debugPush("移动结果", model.value);
            debugPush("disable", disableList);
            // let item = disableList[evt.oldIndex];
            // disableList.splice(evt.oldIndex, 1);
            // disableList.splice(evt.newIndex, 0, item);
        }
    });

});


</script>
<style>
.og-hn-setting-order-desp-container {
}

.og-hn-setting-order-ul {
    list-style: none;
}
</style>